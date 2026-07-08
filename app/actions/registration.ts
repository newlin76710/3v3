"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { differenceInYears, addYears } from "date-fns";
import { MEMBERSHIP_PROMO_EXPIRY } from "@/lib/utils";
import { calculatePlayerFee, generateMemberNumber, BANK_INFO, GENDER_TYPE_LABELS, computeGenderCounts } from "@/lib/utils";

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

  // 驗證組別允許的性別組合
  if (!group.allowedGenders.includes(genderType)) {
    return { error: `此組別不開放 ${genderType} 組合` };
  }

  // 驗證名額（每個組別下的男3P/女3P/混3P名額各自獨立計算）
  const registrationCount = await prisma.registration.count({
    where: { groupId, genderType, paymentStatus: { not: "CANCELLED" } },
  });
  if (registrationCount >= group.maxTeams) {
    return { error: `此組別（${GENDER_TYPE_LABELS[genderType]}）名額已滿` };
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

  // 計算年齡並驗證（以比賽日期為準）
  const ages = players.map((p) => differenceInYears(event.date, new Date(p.birthday)));
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
          expiresAt: MEMBERSHIP_PROMO_EXPIRY,
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

const updateRegistrationSchema = z.object({
  registrationId: z.string(),
  teamName: z.string().min(1, "請輸入隊名").max(6, "隊名最多6個字"),
  genderType: z.enum(["MALE_TRIPLE", "FEMALE_TRIPLE", "MIXED"]),
  players: z.array(playerSchema).length(3, "必須恰好3位選手"),
});

export type UpdateRegistrationFormData = z.infer<typeof updateRegistrationSchema>;

// 本人修改尚未繳費（PENDING）的報名資料
export async function updateMyRegistration(data: UpdateRegistrationFormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "請先登入" };

  const parsed = updateRegistrationSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { registrationId, teamName, genderType, players } = parsed.data;

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      group: { include: { event: true } },
      players: { select: { id: true, nationalId: true, memberStatus: true, itemCount: true } },
    },
  });
  if (!registration) return { error: "找不到報名資料" };
  if (registration.createdById !== session.user.id) return { error: "無權限" };
  if (registration.paymentStatus !== "PENDING") {
    return { error: "此報名已送出匯款資料或已完成確認，無法修改，如需調整請聯繫協會" };
  }

  const { group } = registration;
  const event = group.event;
  const now = new Date();
  if (now > event.registrationEnd) return { error: "報名已截止，無法修改" };

  if (!group.allowedGenders.includes(genderType)) {
    return { error: `此組別不開放 ${GENDER_TYPE_LABELS[genderType]} 組合` };
  }

  // 驗證名額（排除自己這筆）
  const registrationCount = await prisma.registration.count({
    where: {
      groupId: group.id,
      genderType,
      paymentStatus: { not: "CANCELLED" },
      id: { not: registrationId },
    },
  });
  if (registrationCount >= group.maxTeams) {
    return { error: `此組別（${GENDER_TYPE_LABELS[genderType]}）名額已滿` };
  }

  const maleCount = players.filter((p) => p.gender === "MALE").length;
  const femaleCount = players.filter((p) => p.gender === "FEMALE").length;
  if (genderType === "MALE_TRIPLE" && maleCount !== 3) return { error: "男3P必須3位男性選手" };
  if (genderType === "FEMALE_TRIPLE" && femaleCount !== 3) return { error: "女3P必須3位女性選手" };
  if (genderType === "MIXED" && !(
    (maleCount === 2 && femaleCount === 1) || (maleCount === 1 && femaleCount === 2)
  )) {
    return { error: "混3P必須2男1女或1男2女" };
  }

  const ages = players.map((p) => differenceInYears(event.date, new Date(p.birthday)));
  const totalAge = ages.reduce((a, b) => a + b, 0);
  const minAge = Math.min(...ages);
  if (group.minTotalAge > 0 && totalAge < group.minTotalAge) {
    return { error: `總年齡不足 ${group.minTotalAge} 歲（目前 ${totalAge} 歲）` };
  }
  if (group.minIndividualAge > 0 && minAge < group.minIndividualAge) {
    return { error: `有選手年齡不足 ${group.minIndividualAge} 歲（最小年齡 ${minAge} 歲）` };
  }

  const nationalIds = players.map((p) => p.nationalId);
  if (new Set(nationalIds).size !== nationalIds.length) {
    return { error: "同一隊伍中身分證字號不能重複" };
  }

  // 驗證身分證重複上限（排除自己這筆報名，同賽事最多2筆）
  const existingPlayerRecords = await prisma.registrationPlayer.findMany({
    where: {
      nationalId: { in: nationalIds },
      registration: { eventId: event.id, id: { not: registrationId }, paymentStatus: { not: "CANCELLED" } },
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
  const playersWithFee = players.map((p) => ({
    ...p,
    fee: calculatePlayerFee(p.memberStatus, isSecondItem(p.nationalId)),
  }));
  const totalAmount = playersWithFee.reduce((sum, p) => sum + p.fee, 0);

  await prisma.$transaction([
    prisma.registration.update({
      where: { id: registrationId },
      data: { teamName, genderType, totalAmount },
    }),
    prisma.registrationPlayer.deleteMany({ where: { registrationId } }),
    prisma.registrationPlayer.createMany({
      data: playersWithFee.map((p) => ({
        registrationId,
        name: p.name,
        nationalId: p.nationalId,
        birthday: new Date(p.birthday),
        phone: p.phone,
        email: p.email || null,
        gender: p.gender,
        emergencyContact: p.emergencyContact || "",
        emergencyPhone: p.emergencyPhone || "",
        memberStatus: p.memberStatus,
        itemCount: isSecondItem(p.nationalId) ? 2 : 1,
        fee: p.fee,
      })),
    }),
    prisma.payment.updateMany({
      where: { registrationId, status: "PENDING" },
      data: { amount: totalAmount },
    }),
  ]);

  // 同步「新加入會員」選手對應的孤立 Member 資料（僅同步尚未被本人認領、未繳費完成的資料）
  for (const p of playersWithFee) {
    const isPrimaryNewMember = p.memberStatus === "NEW_MEMBER" && !isSecondItem(p.nationalId);
    if (!isPrimaryNewMember) continue;

    try {
      const existingMember = await prisma.member.findUnique({ where: { nationalId: p.nationalId } });
      if (existingMember) {
        if (!existingMember.userId && existingMember.paymentStatus !== "PAID") {
          await prisma.member.update({
            where: { id: existingMember.id },
            data: {
              realName: p.name,
              birthday: new Date(p.birthday),
              gender: p.gender,
              phone: p.phone,
              email: p.email || null,
            },
          });
        }
      } else {
        await prisma.member.create({
          data: {
            userId: null,
            memberNumber: generateMemberNumber(),
            nationalId: p.nationalId,
            realName: p.name,
            birthday: new Date(p.birthday),
            gender: p.gender,
            phone: p.phone,
            email: p.email || null,
            expiresAt: MEMBERSHIP_PROMO_EXPIRY,
            isActive: false,
            paymentStatus: "PENDING",
          },
        });
      }
    } catch {
      // Member 建立/更新失敗（如身分證與其他帳號衝突），不影響報名本身
    }
  }

  // 選手若不再是本次入會來源，且無其他有效報名可作為來源，清除尚未繳費完成的孤立 Member
  for (const old of registration.players) {
    const wasPrimaryNewMember = old.memberStatus === "NEW_MEMBER" && old.itemCount === 1;
    if (!wasPrimaryNewMember) continue;

    const stillPrimaryNewMember = playersWithFee.some(
      (p) => p.nationalId === old.nationalId && p.memberStatus === "NEW_MEMBER" && !isSecondItem(p.nationalId)
    );
    if (stillPrimaryNewMember) continue;

    const otherActiveSource = await prisma.registrationPlayer.findFirst({
      where: {
        nationalId: old.nationalId,
        memberStatus: "NEW_MEMBER",
        itemCount: 1,
        registration: { id: { not: registrationId }, paymentStatus: { in: ["CONFIRMING", "PAID"] } },
      },
    });
    if (otherActiveSource) continue;

    const member = await prisma.member.findUnique({ where: { nationalId: old.nationalId } });
    if (member && !member.userId && member.paymentStatus !== "PAID") {
      await prisma.member.delete({ where: { id: member.id } });
    }
  }

  revalidatePath("/member");
  return { success: true, totalAmount };
}

// 取得本人尚未繳費的報名資料（供修改用）
export async function getMyRegistrationForEdit(registrationId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      event: { select: { id: true, name: true, slug: true, date: true, registrationEnd: true } },
      group: true,
      players: true,
    },
  });
  if (!registration) return null;
  if (registration.createdById !== session.user.id) return null;

  const otherRegistrations = await prisma.registration.findMany({
    where: {
      groupId: registration.groupId,
      paymentStatus: { not: "CANCELLED" },
      id: { not: registrationId },
    },
    select: { genderType: true },
  });

  return { ...registration, genderCounts: computeGenderCounts(otherRegistrations) };
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
  eventId: string,
  excludeRegistrationId?: string
): Promise<{ nationalId: string; isSecondItem: boolean; groupName: string | null }[]> {
  const session = await auth();
  if (!session?.user?.id) return nationalIds.map((id) => ({ nationalId: id, isSecondItem: false, groupName: null }));

  const valid = nationalIds.filter((id) => /^[A-Z][12]\d{8}$/.test(id));
  if (valid.length === 0) return nationalIds.map((id) => ({ nationalId: id, isSecondItem: false, groupName: null }));

  const existing = await prisma.registrationPlayer.findMany({
    where: {
      nationalId: { in: valid },
      registration: {
        eventId,
        paymentStatus: { not: "CANCELLED" },
        ...(excludeRegistrationId ? { id: { not: excludeRegistrationId } } : {}),
      },
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
