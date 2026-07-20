"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { computeGenderCounts } from "@/lib/utils";

const eventSchema = z.object({
  name: z.string().min(2, "賽事名稱至少2個字"),
  slug: z.string().min(2, "slug至少2個字").regex(/^[a-z0-9-]+$/, "slug只能包含小寫字母、數字和連字號"),
  date: z.string().refine((d) => !isNaN(Date.parse(d)), "請輸入有效日期"),
  location: z.string().min(2, "地點至少2個字"),
  registrationStart: z.string().refine((d) => !isNaN(Date.parse(d)), "請輸入有效日期"),
  registrationEnd: z.string().refine((d) => !isNaN(Date.parse(d)), "請輸入有效日期"),
  poster: z.string().optional(),
  description: z.string().optional(),
  isOpen: z.boolean().default(false),
  maxTeamsPerGroup: z.number().int().min(1).max(100).default(12),
  memberUpgradeDeadline: z.string().optional(),
});

export async function createEvent(data: z.infer<typeof eventSchema>) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return { error: "無權限" };
    }

    const parsed = eventSchema.safeParse(data);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const existing = await prisma.event.findUnique({ where: { slug: parsed.data.slug } });
    if (existing) return { error: "此 slug 已存在" };

    const event = await prisma.event.create({
      data: {
        ...parsed.data,
        date: new Date(parsed.data.date + "T00:00:00.000Z"),
        registrationStart: new Date(parsed.data.registrationStart.includes("T")
          ? parsed.data.registrationStart
          : parsed.data.registrationStart + "T00:00:00.000Z"),
        registrationEnd: new Date(parsed.data.registrationEnd.includes("T")
          ? parsed.data.registrationEnd
          : parsed.data.registrationEnd + "T15:59:59.999Z"),
        memberUpgradeDeadline: parsed.data.memberUpgradeDeadline
          ? new Date(parsed.data.memberUpgradeDeadline.includes("T")
              ? parsed.data.memberUpgradeDeadline
              : parsed.data.memberUpgradeDeadline + "T15:59:59.999Z")
          : null,
      },
    });
    revalidatePath("/events");
    revalidatePath("/admin/events");
    return { success: true, id: event.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[createEvent]", message);
    return { error: `伺服器錯誤：${message}` };
  }
}

export async function updateEvent(id: string, data: Partial<z.infer<typeof eventSchema>>) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return { error: "無權限" };
  }

  const dateFields: Partial<{ date: Date; registrationStart: Date; registrationEnd: Date; memberUpgradeDeadline: Date | null }> = {};
  if (data.date) dateFields.date = new Date(data.date + "T00:00:00.000Z");
  if (data.registrationStart) dateFields.registrationStart = new Date(
    data.registrationStart.includes("T") ? data.registrationStart : data.registrationStart + "T00:00:00.000Z"
  );
  if (data.registrationEnd) dateFields.registrationEnd = new Date(
    data.registrationEnd.includes("T") ? data.registrationEnd : data.registrationEnd + "T15:59:59.999Z"
  );
  if (data.memberUpgradeDeadline !== undefined) {
    dateFields.memberUpgradeDeadline = data.memberUpgradeDeadline
      ? new Date(data.memberUpgradeDeadline.includes("T")
          ? data.memberUpgradeDeadline
          : data.memberUpgradeDeadline + "T15:59:59.999Z")
      : null;
  }
  await prisma.event.update({ where: { id }, data: { ...data, ...dateFields } });
  revalidatePath("/events");
  revalidatePath("/admin/events");
  return { success: true };
}

const groupSchema = z.object({
  eventId: z.string(),
  name: z.string().min(1, "請輸入組別名稱"),
  minTotalAge: z.number().int().min(0),
  minIndividualAge: z.number().int().min(0),
  allowedGenders: z.array(z.enum(["MALE_TRIPLE", "FEMALE_TRIPLE", "MIXED"])).min(1, "至少選擇一種組別"),
  maxTeams: z.number().int().min(1).default(12),
});

export async function createEventGroup(data: z.infer<typeof groupSchema>) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return { error: "無權限" };
  }

  const parsed = groupSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const group = await prisma.eventGroup.create({ data: parsed.data });
  revalidatePath("/admin/events");
  return { success: true, id: group.id };
}

const updateGroupSchema = groupSchema.omit({ eventId: true });

export async function updateEventGroup(groupId: string, data: z.infer<typeof updateGroupSchema>) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return { error: "無權限" };
  }

  const parsed = updateGroupSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await prisma.eventGroup.findUnique({
    where: { id: groupId },
    include: {
      registrations: {
        where: { paymentStatus: { not: "CANCELLED" } },
        select: { genderType: true },
      },
    },
  });
  if (!existing) return { error: "組別不存在" };

  // 上限不能低於目前任一性別分組已報名的隊數
  const genderCounts = computeGenderCounts(existing.registrations);
  for (const g of existing.allowedGenders) {
    const count = genderCounts[g] ?? 0;
    if (count > parsed.data.maxTeams) {
      return { error: `此組別「${g}」已有 ${count} 隊報名，上限不能低於 ${count}` };
    }
  }
  // 移除已有報名的性別組合
  const removedGenders = existing.allowedGenders.filter((g) => !parsed.data.allowedGenders.includes(g));
  for (const g of removedGenders) {
    if ((genderCounts[g] ?? 0) > 0) {
      return { error: `「${g}」已有隊伍報名，無法從可選性別組移除` };
    }
  }

  await prisma.eventGroup.update({ where: { id: groupId }, data: parsed.data });
  revalidatePath("/admin/events");
  return { success: true };
}

export async function deleteEventGroup(groupId: string) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return { error: "無權限" };
  }

  const group = await prisma.eventGroup.findUnique({
    where: { id: groupId },
    include: {
      _count: { select: { registrations: { where: { paymentStatus: { not: "CANCELLED" } } } } },
    },
  });
  if (!group) return { error: "組別不存在" };
  if (group._count.registrations > 0) return { error: "此組別已有報名資料，無法刪除" };

  await prisma.eventGroup.delete({ where: { id: groupId } });
  revalidatePath("/admin/events");
  return { success: true };
}

const activeRegistrationWhere = { paymentStatus: { not: "CANCELLED" as const } };

export async function getPublicEvents() {
  return prisma.event.findMany({
    where: { isOpen: true },
    include: {
      groups: {
        include: {
          _count: { select: { registrations: { where: activeRegistrationWhere } } },
        },
      },
    },
    orderBy: { date: "asc" },
  });
}

export async function getEventBySlug(slug: string) {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      groups: {
        include: {
          registrations: {
            where: activeRegistrationWhere,
            select: { genderType: true },
          },
        },
      },
    },
  });
  if (!event) return null;

  return {
    ...event,
    // 每個組別下的男3P/女3P/混3P名額各自獨立計算，取代整組加總的計數
    groups: event.groups.map(({ registrations, ...group }) => ({
      ...group,
      genderCounts: computeGenderCounts(registrations),
    })),
  };
}
