"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { differenceInYears, addYears } from "date-fns";
import { calculatePlayerFee, generateMemberNumber, BANK_INFO } from "@/lib/utils";

const playerSchema = z.object({
  name: z.string().min(2, "姓名至少2個字"),
  nationalId: z.string().regex(/^[A-Z][12]\d{8}$/, "請輸入有效的身分證字號"),
  birthday: z.string().refine((d) => !isNaN(Date.parse(d)), "請輸入有效生日"),
  phone: z.string().regex(/^09\d{8}$/, "請輸入有效手機號碼"),
  gender: z.enum(["MALE", "FEMALE"]),
  emergencyContact: z.string().optional().default(""),
  emergencyPhone: z.string().optional().default(""),
  memberStatus: z.enum(["ACTIVE_MEMBER", "NEW_MEMBER", "NON_MEMBER"]),
  email: z.string().email("請輸入有效的電子信箱").optional().or(z.literal("")).default(""),
  itemCount: z.number().int().min(1).max(2).default(1),
});

const registrationSchema = z.object({
  eventId: z.string(),
  groupId: z.string(),
  teamName: z.string().min(1, "請輸入隊名").max(6, "隊名最多6個字"),
  genderType: z.enum(["MALE_TRIPLE", "FEMALE_TRIPLE", "MIXED"]),
  players: z.array(playerSchema).length(3, "必須恰好3位選手"),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;

export async function createRegistration(data: RegistrationFormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "請先登入" };

  const parsed = registrationSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { eventId, groupId, teamName, genderType, players } = parsed.data;

  // 取得組別資料
  const group = await prisma.eventGroup.findUnique({
    where: { id: groupId },
    include: { event: true },
  });
  if (!group) return { error: "找不到組別" };

  const event = group.event;
  const now = new Date();
  if (now < event.registrationStart) return { error: "報名尚未開始" };
  if (now > event.registrationEnd) return { error: "報名已截止" };

  // 驗證名額
  const registrationCount = await prisma.registration.count({
    where: { groupId, paymentStatus: { not: "CANCELLED" } },
  });
  if (registrationCount >= group.maxTeams) return { error: "此組別名額已滿" };

  // 驗證組別允許的性別組合
  if (!group.allowedGenders.includes(genderType)) {
    return { error: `此組別不開放 ${genderType} 組合` };
  }

  // 驗證性別組合
  const maleCount = players.filter((p) => p.gender === "MALE").length;
  const femaleCount = players.filter((p) => p.gender === "FEMALE").length;

  if (genderType === "MALE_TRIPLE" && maleCount !== 3) {
    return { error: "男3P必須3位男性選手" };
  }
  if (genderType === "FEMALE_TRIPLE" && femaleCount !== 3) {
    return { error: "女3P必須3位女性選手" };
  }
  if (genderType === "MIXED" && !(
    (maleCount === 2 && femaleCount === 1) ||
    (maleCount === 1 && femaleCount === 2)
  )) {
    return { error: "混3P必須2男1女或1男2女" };
  }

  // 計算年齡並驗證
  const ages = players.map((p) => differenceInYears(new Date(), new Date(p.birthday)));
  const totalAge = ages.reduce((a, b) => a + b, 0);
  const minAge = Math.min(...ages);

  if (group.minTotalAge > 0 && totalAge < group.minTotalAge) {
    return { error: `總年齡不足 ${group.minTotalAge} 歲（目前 ${totalAge} 歲）` };
  }
  if (group.minIndividualAge > 0 && minAge < group.minIndividualAge) {
    return {
      error: `有選手年齡不足 ${group.minIndividualAge} 歲（最小年齡 ${minAge} 歲）`,
    };
  }

  // 驗證身分證不重複（同隊）
  const nationalIds = players.map((p) => p.nationalId);
  if (new Set(nationalIds).size !== nationalIds.length) {
    return { error: "同一隊伍中身分證字號不能重複" };
  }

  // 驗證身分證重複上限（同賽事最多2筆）
  const existingPlayerRecords = await prisma.registrationPlayer.findMany({
    where: {
      nationalId: { in: nationalIds },
      registration: { eventId, paymentStatus: { not: "CANCELLED" } },
    },
    select: { nationalId: true },
  });

  const existingCounts = new Map<string, number>();
  for (const p of existingPlayerRecords) {
    existingCounts.set(p.nationalId, (existingCounts.get(p.nationalId) ?? 0) + 1);
  }
  for (const id of nationalIds) {
    if ((existingCounts.get(id) ?? 0) >= 2) {
      return { error: `身分證 ${id.slice(0, 3)}****${id.slice(-2)} 已達報名上限（2個組別）` };
    }
  }

  const isSecondItem = (id: string) => (existingCounts.get(id) ?? 0) >= 1;

  // 計算費用
  const playersWithFee = players.map((p) => ({
    ...p,
    fee: calculatePlayerFee(p.memberStatus, isSecondItem(p.nationalId)),
  }));
  const totalAmount = playersWithFee.reduce((sum, p) => sum + p.fee, 0);

  // 建立報名
  const registration = await prisma.registration.create({
    data: {
      eventId,
      groupId,
      teamName,
      createdById: session.user.id,
      genderType,
      totalAmount,
      paymentStatus: "PENDING",
      players: {
        create: playersWithFee.map((p) => ({
          name: p.name,
          nationalId: p.nationalId,
          birthday: new Date(p.birthday),
          phone: p.phone,
          email: p.email || null,
          gender: p.gender,
          emergencyContact: p.emergencyContact,
          emergencyPhone: p.emergencyPhone,
          memberStatus: p.memberStatus,
          itemCount: isSecondItem(p.nationalId) ? 2 : 1,
          fee: p.fee,
        })),
      },
    },
    include: { players: true },
  });

  // 建立付款記錄
  await prisma.payment.create({
    data: {
      registrationId: registration.id,
      type: "REGISTRATION_FEE",
      amount: totalAmount,
      status: "PENDING",
      bankCode: BANK_INFO.bankCode,
      bankAccount: BANK_INFO.accountNumber,
    },
  });

  // 為「新加入會員」選手建立孤立 Member，日後由本人以身分證字號認領
  for (const player of playersWithFee) {
    if (player.memberStatus !== "NEW_MEMBER") continue;

    // 若該身分證已有 Member 記錄則跳過（無論是否已關聯帳號）
    const existingMember = await prisma.member.findUnique({
      where: { nationalId: player.nationalId },
    });
    if (existingMember) continue;

    try {
      await prisma.member.create({
        data: {
          userId: null,
          memberNumber: generateMemberNumber(),
          nationalId: player.nationalId,
          realName: player.name,
          birthday: new Date(player.birthday),
          gender: player.gender,
          phone: player.phone,
          email: player.email || null,
          expiresAt: addYears(new Date(), 1),
          isActive: false,
          paymentStatus: "PENDING",
        },
      });
    } catch {
      // Member 建立失敗（如會員編號碰撞），不影響報名本身
    }
  }

  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/member");
  return { success: true, registrationId: registration.id, totalAmount };
}

const paymentConfirmSchema = z.object({
  registrationId: z.string(),
  transferLastFive: z.string().length(5, "請輸入匯款末5碼").regex(/^\d{5}$/, "必須是5位數字"),
  transferDate: z.string().refine((d) => !isNaN(Date.parse(d)), "請輸入有效日期"),
});

export async function submitRegistrationPayment(data: z.infer<typeof paymentConfirmSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: "請先登入" };

  const parsed = paymentConfirmSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const registration = await prisma.registration.findUnique({
    where: { id: parsed.data.registrationId },
    include: { players: { select: { nationalId: true, memberStatus: true } } },
  });
  if (!registration) return { error: "找不到報名資料" };
  if (registration.createdById !== session.user.id) return { error: "無權限" };

  await prisma.registration.update({
    where: { id: registration.id },
    data: {
      transferLastFive: parsed.data.transferLastFive,
      transferDate: new Date(parsed.data.transferDate),
      paymentStatus: "CONFIRMING",
    },
  });

  await prisma.payment.updateMany({
    where: { registrationId: registration.id, status: "PENDING" },
    data: {
      transferLastFive: parsed.data.transferLastFive,
      transferDate: new Date(parsed.data.transferDate),
      status: "CONFIRMING",
    },
  });

  // 同步更新新入會選手的 Member 繳費狀態為「待確認」
  const newMemberIds = registration.players
    .filter((p) => p.memberStatus === "NEW_MEMBER")
    .map((p) => p.nationalId);
  if (newMemberIds.length > 0) {
    await prisma.member.updateMany({
      where: { nationalId: { in: newMemberIds }, paymentStatus: "PENDING" },
      data: {
        transferLastFive: parsed.data.transferLastFive,
        transferDate: new Date(parsed.data.transferDate),
        paymentStatus: "CONFIRMING",
      },
    });
  }

  revalidatePath("/member");
  return { success: true };
}

// 查詢身分證是否為協會有效會員
export async function checkMemberships(
  nationalIds: string[]
): Promise<{ nationalId: string; isActiveMember: boolean }[]> {
  const valid = nationalIds.filter((id) => /^[A-Z][12]\d{8}$/.test(id));
  if (valid.length === 0) return [];

  const now = new Date();
  const members = await prisma.member.findMany({
    where: { nationalId: { in: valid }, isActive: true, expiresAt: { gt: now } },
    select: { nationalId: true },
  });

  return valid.map((id) => ({
    nationalId: id,
    isActiveMember: members.some((m) => m.nationalId === id),
  }));
}

// 提交前預查：哪些身分證在本賽事已有報名（回傳第2項資訊）
export async function checkPlayerDuplicates(
  nationalIds: string[],
  eventId: string
): Promise<{ nationalId: string; isSecondItem: boolean; groupName: string | null }[]> {
  const session = await auth();
  if (!session?.user?.id) return nationalIds.map((id) => ({ nationalId: id, isSecondItem: false, groupName: null }));

  const valid = nationalIds.filter((id) => /^[A-Z][12]\d{8}$/.test(id));
  if (valid.length === 0) return nationalIds.map((id) => ({ nationalId: id, isSecondItem: false, groupName: null }));

  const existing = await prisma.registrationPlayer.findMany({
    where: {
      nationalId: { in: valid },
      registration: { eventId, paymentStatus: { not: "CANCELLED" } },
    },
    select: {
      nationalId: true,
      registration: { select: { group: { select: { name: true } } } },
    },
  });

  return nationalIds.map((id) => {
    const records = existing.filter((p) => p.nationalId === id);
    return {
      nationalId: id,
      isSecondItem: records.length > 0,
      groupName: records[0]?.registration.group.name ?? null,
    };
  });
}

export async function getMyRegistrations() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.registration.findMany({
    where: { createdById: session.user.id },
    include: {
      event: { select: { name: true, date: true, location: true, slug: true } },
      group: { select: { name: true } },
      players: true,
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
