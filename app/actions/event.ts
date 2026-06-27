"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

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
  maxTeamsPerGroup: z.number().int().min(1).max(100).default(16),
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

  const dateFields: Partial<{ date: Date; registrationStart: Date; registrationEnd: Date }> = {};
  if (data.date) dateFields.date = new Date(data.date + "T00:00:00.000Z");
  if (data.registrationStart) dateFields.registrationStart = new Date(
    data.registrationStart.includes("T") ? data.registrationStart : data.registrationStart + "T00:00:00.000Z"
  );
  if (data.registrationEnd) dateFields.registrationEnd = new Date(
    data.registrationEnd.includes("T") ? data.registrationEnd : data.registrationEnd + "T15:59:59.999Z"
  );
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
  maxTeams: z.number().int().min(1).default(16),
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

export async function deleteEventGroup(groupId: string) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return { error: "無權限" };
  }

  const group = await prisma.eventGroup.findUnique({
    where: { id: groupId },
    include: { _count: { select: { registrations: true } } },
  });
  if (!group) return { error: "組別不存在" };
  if (group._count.registrations > 0) return { error: "此組別已有報名資料，無法刪除" };

  await prisma.eventGroup.delete({ where: { id: groupId } });
  revalidatePath("/admin/events");
  return { success: true };
}

export async function getPublicEvents() {
  return prisma.event.findMany({
    where: { isOpen: true },
    include: {
      groups: {
        include: { _count: { select: { registrations: true } } },
      },
    },
    orderBy: { date: "asc" },
  });
}

export async function getEventBySlug(slug: string) {
  return prisma.event.findUnique({
    where: { slug },
    include: {
      groups: {
        include: {
          _count: { select: { registrations: true } },
          registrations: {
            include: { players: true },
          },
        },
      },
    },
  });
}
