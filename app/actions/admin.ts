"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { addYears, differenceInYears } from "date-fns";
import { MEMBERSHIP_PROMO_EXPIRY, calculatePlayerFee, generateMemberNumber, BANK_INFO } from "@/lib/utils";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    throw new Error("無權限");
  }
  return session;
}

// 確認會員付款
export async function confirmMemberPayment(memberId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return { success: false, error: "找不到會員" };

    const now = new Date();

    await prisma.member.update({
      where: { id: memberId },
      data: {
        isActive: true,
        paymentStatus: "PAID",
        expiresAt: MEMBERSHIP_PROMO_EXPIRY,
        confirmedAt: now,
      },
    });

    await prisma.payment.updateMany({
      where: { memberId, status: "CONFIRMING" },
      data: { status: "PAID", confirmedAt: now },
    });

    revalidatePath("/admin/members");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// 確認報名付款
export async function confirmRegistrationPayment(registrationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    const now = new Date();

    // 取得報名資料與選手（確認是否有新入會選手）
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { players: { select: { nationalId: true, memberStatus: true } } },
    });
    if (!registration) return { success: false, error: "找不到報名資料" };

    await prisma.registration.update({
      where: { id: registrationId },
      data: { paymentStatus: "PAID", confirmedAt: now },
    });

    await prisma.payment.updateMany({
      where: { registrationId, status: "CONFIRMING" },
      data: { status: "PAID", confirmedAt: now },
    });

    // 同步啟用新入會選手的 Member 記錄
    const newMemberIds = registration.players
      .filter((p) => p.memberStatus === "NEW_MEMBER")
      .map((p) => p.nationalId);

    for (const nationalId of newMemberIds) {
      const member = await prisma.member.findUnique({ where: { nationalId } });
      if (member && !member.isActive) {
        await prisma.member.update({
          where: { id: member.id },
          data: {
            isActive: true,
            paymentStatus: "PAID",
            expiresAt: MEMBERSHIP_PROMO_EXPIRY,
            confirmedAt: now,
          },
        });
      }
    }

    revalidatePath("/admin/registrations");
    revalidatePath("/admin/members");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// 取消報名
export async function cancelRegistration(registrationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    // 先取得選手名單，處理新入會選手的會員資格
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { players: { select: { nationalId: true, memberStatus: true } } },
    });
    if (!registration) return { success: false, error: "找不到報名資料" };

    await prisma.registration.update({
      where: { id: registrationId },
      data: { paymentStatus: "CANCELLED" },
    });

    await prisma.payment.updateMany({
      where: { registrationId, status: "PAID" },
      data: { status: "CANCELLED" },
    });

    // 對每個新入會選手，確認沒有其他有效報名後停用其 Member 記錄
    const newMemberPlayers = registration.players.filter((p) => p.memberStatus === "NEW_MEMBER");
    for (const player of newMemberPlayers) {
      // 檢查是否還有其他非取消的報名（同一賽事或其他賽事）包含此選手作為 NEW_MEMBER
      // 只有 itemCount=1（真正繳了700含入會費）的報名才算數
      const otherActiveReg = await prisma.registrationPlayer.findFirst({
        where: {
          nationalId: player.nationalId,
          memberStatus: "NEW_MEMBER",
          itemCount: 1,
          registration: {
            id: { not: registrationId },
            paymentStatus: { in: ["CONFIRMING", "PAID"] },
          },
        },
      });
      if (otherActiveReg) continue; // 還有其他有效的入會來源，不動

      const member = await prisma.member.findUnique({ where: { nationalId: player.nationalId } });
      if (!member) continue;

      // 停用此 Member（不論目前狀態，一律收回）
      await prisma.member.update({
        where: { id: member.id },
        data: {
          isActive: false,
          paymentStatus: "CANCELLED",
        },
      });
    }

    revalidatePath("/admin/registrations");
    revalidatePath("/admin/members");
    revalidatePath("/admin");
    revalidatePath("/member");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// 取消已付款會員的會籍
export async function cancelMembership(memberId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return { success: false, error: "找不到會員" };
    if (member.paymentStatus !== "PAID") return { success: false, error: "只能取消已付款的會員" };

    await prisma.member.update({
      where: { id: memberId },
      data: { isActive: false, paymentStatus: "CANCELLED" },
    });

    await prisma.payment.updateMany({
      where: { memberId, status: "PAID" },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/admin/members");
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// 延長已付款會員的會籍（+1年）
export async function extendMembership(memberId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return { success: false, error: "找不到會員" };
    if (member.paymentStatus !== "PAID") return { success: false, error: "只能延長已付款的會員" };

    const now = new Date();
    const base = member.expiresAt < now ? now : member.expiresAt;
    const newExpiry = addYears(base, 1);

    await prisma.member.update({
      where: { id: memberId },
      data: { expiresAt: newExpiry, isActive: true },
    });

    revalidatePath("/admin/members");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// 更新用戶角色
export async function updateUserRole(userId: string, role: "ADMIN" | "STAFF" | "MEMBER") {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
  return { success: true };
}

// 取得所有網站用戶
export async function getAllUsers(page = 1, pageSize = 30, search = "") {
  await requireAdmin();

  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { member: { select: { id: true, memberNumber: true, isActive: true, expiresAt: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, pages: Math.ceil(total / pageSize) };
}

// 後台 Dashboard 統計
export async function getDashboardStats() {
  await requireAdmin();

  const [
    totalMembers,
    activeMembers,
    todayRegistrations,
    pendingPayments,
    paidRegistrations,
    totalRevenue,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { isActive: true, expiresAt: { gt: new Date() } } }),
    prisma.registration.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.payment.count({ where: { status: "CONFIRMING" } }),
    prisma.registration.count({ where: { paymentStatus: "PAID" } }),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
  ]);

  return {
    totalMembers,
    activeMembers,
    todayRegistrations,
    pendingPayments,
    paidRegistrations,
    totalRevenue: totalRevenue._sum.amount ?? 0,
  };
}

// 取得所有會員列表
export async function getAllMembers(page = 1, pageSize = 20, search = "") {
  await requireAdmin();

  const where = search
    ? {
        OR: [
          { realName: { contains: search } },
          { nationalId: { contains: search } },
          { memberNumber: { contains: search } },
          { phone: { contains: search } },
        ],
      }
    : {};

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      include: { user: { select: { email: true, name: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.member.count({ where }),
  ]);

  return { members, total, pages: Math.ceil(total / pageSize) };
}

// 後台手動建立報名
export async function adminCreateRegistration(data: {
  eventId: string;
  groupId: string;
  teamName: string;
  genderType: "MALE_TRIPLE" | "FEMALE_TRIPLE" | "MIXED";
  players: Array<{
    name: string;
    nationalId: string;
    birthday: string;
    phone: string;
    email?: string;
    gender: "MALE" | "FEMALE";
    emergencyContact?: string;
    emergencyPhone?: string;
    memberStatus: "ACTIVE_MEMBER" | "NEW_MEMBER" | "NON_MEMBER";
  }>;
  paymentStatus: "PENDING" | "PAID";
  notes?: string;
}): Promise<{ success?: boolean; error?: string; registrationId?: string }> {
  try {
    const session = await requireAdmin();
    const { eventId, groupId, teamName, genderType, players, paymentStatus, notes } = data;

    const group = await prisma.eventGroup.findUnique({
      where: { id: groupId },
      include: { event: true },
    });
    if (!group) return { error: "找不到組別" };

    const maleCount = players.filter((p) => p.gender === "MALE").length;
    const femaleCount = players.filter((p) => p.gender === "FEMALE").length;
    if (genderType === "MALE_TRIPLE" && maleCount !== 3) return { error: "男3P必須3位男性選手" };
    if (genderType === "FEMALE_TRIPLE" && femaleCount !== 3) return { error: "女3P必須3位女性選手" };
    if (genderType === "MIXED" && !((maleCount === 2 && femaleCount === 1) || (maleCount === 1 && femaleCount === 2)))
      return { error: "混3P必須2男1女或1男2女" };

    const ages = players.map((p) => differenceInYears(group.event.date, new Date(p.birthday)));
    const totalAge = ages.reduce((a, b) => a + b, 0);
    const minAge = Math.min(...ages);
    if (group.minTotalAge > 0 && totalAge < group.minTotalAge)
      return { error: `總年齡不足 ${group.minTotalAge} 歲（目前 ${totalAge} 歲）` };
    if (group.minIndividualAge > 0 && minAge < group.minIndividualAge)
      return { error: `有選手年齡不足 ${group.minIndividualAge} 歲（最小 ${minAge} 歲）` };

    const nationalIds = players.map((p) => p.nationalId);
    if (new Set(nationalIds).size !== nationalIds.length) return { error: "同一隊伍中身分證字號不能重複" };

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
      if ((existingCounts.get(id) ?? 0) >= 2)
        return { error: `身分證 ${id.slice(0, 3)}****${id.slice(-2)} 已達報名上限（2個組別）` };
    }

    const isSecondItem = (id: string) => (existingCounts.get(id) ?? 0) >= 1;
    const playersWithFee = players.map((p) => ({
      ...p,
      fee: calculatePlayerFee(p.memberStatus, isSecondItem(p.nationalId)),
    }));
    const totalAmount = playersWithFee.reduce((sum, p) => sum + p.fee, 0);
    const now = new Date();

    const registration = await prisma.registration.create({
      data: {
        eventId,
        groupId,
        teamName,
        createdById: session.user.id,
        genderType,
        totalAmount,
        paymentStatus: paymentStatus === "PAID" ? "PAID" : "PENDING",
        confirmedAt: paymentStatus === "PAID" ? now : null,
        notes: notes || null,
        players: {
          create: playersWithFee.map((p) => ({
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
        },
      },
    });

    await prisma.payment.create({
      data: {
        registrationId: registration.id,
        type: "REGISTRATION_FEE",
        amount: totalAmount,
        status: paymentStatus === "PAID" ? "PAID" : "PENDING",
        bankCode: BANK_INFO.bankCode,
        bankAccount: BANK_INFO.accountNumber,
        confirmedAt: paymentStatus === "PAID" ? now : null,
        notes: notes || null,
      },
    });

    revalidatePath("/admin/registrations");
    revalidatePath("/admin");
    return { success: true, registrationId: registration.id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// 後台手動新增會員
export async function adminCreateMember(data: {
  realName: string;
  nationalId: string;
  birthday: string;
  gender: "MALE" | "FEMALE";
  phone: string;
  email?: string;
  expiresAt: string;
  paymentStatus: "PENDING" | "PAID";
  notes?: string;
}): Promise<{ success?: boolean; error?: string; memberId?: string }> {
  try {
    await requireAdmin();

    const existing = await prisma.member.findUnique({ where: { nationalId: data.nationalId } });
    if (existing) return { error: "此身分證已有會員資料" };

    const now = new Date();
    const isPaid = data.paymentStatus === "PAID";

    const member = await prisma.member.create({
      data: {
        memberNumber: generateMemberNumber(),
        nationalId: data.nationalId,
        realName: data.realName,
        birthday: new Date(data.birthday),
        gender: data.gender,
        phone: data.phone,
        email: data.email || null,
        expiresAt: new Date(data.expiresAt),
        isActive: isPaid,
        paymentStatus: isPaid ? "PAID" : "PENDING",
        confirmedAt: isPaid ? now : null,
      },
    });

    if (isPaid) {
      await prisma.payment.create({
        data: {
          memberId: member.id,
          type: "MEMBERSHIP_FEE",
          amount: 500,
          status: "PAID",
          confirmedAt: now,
          notes: data.notes || null,
        },
      });
    }

    revalidatePath("/admin/members");
    revalidatePath("/admin");
    return { success: true, memberId: member.id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// 後台編輯報名資料
export async function adminUpdateRegistration(
  registrationId: string,
  data: {
    teamName: string;
    genderType: "MALE_TRIPLE" | "FEMALE_TRIPLE" | "MIXED";
    paymentStatus: "PENDING" | "CONFIRMING" | "PAID" | "CANCELLED";
    notes?: string;
    transferLastFive?: string;
    transferDate?: string;
    players: Array<{
      id?: string;
      name: string;
      nationalId: string;
      birthday: string;
      phone: string;
      email?: string;
      gender: "MALE" | "FEMALE";
      emergencyContact?: string;
      emergencyPhone?: string;
      memberStatus: "ACTIVE_MEMBER" | "NEW_MEMBER" | "NON_MEMBER";
    }>;
  }
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAdmin();

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { group: { include: { event: true } } },
    });
    if (!registration) return { error: "找不到報名資料" };

    const { teamName, genderType, paymentStatus, notes, transferLastFive, transferDate, players } = data;
    const maleCount = players.filter((p) => p.gender === "MALE").length;
    const femaleCount = players.filter((p) => p.gender === "FEMALE").length;
    if (genderType === "MALE_TRIPLE" && maleCount !== 3) return { error: "男3P必須3位男性選手" };
    if (genderType === "FEMALE_TRIPLE" && femaleCount !== 3) return { error: "女3P必須3位女性選手" };
    if (genderType === "MIXED" && !((maleCount === 2 && femaleCount === 1) || (maleCount === 1 && femaleCount === 2)))
      return { error: "混3P必須2男1女或1男2女" };
    if (transferLastFive && !/^\d{5}$/.test(transferLastFive)) return { error: "匯款末五碼必須是5位數字" };

    const nationalIds = players.map((p) => p.nationalId);
    if (new Set(nationalIds).size !== nationalIds.length) return { error: "同一隊伍中身分證字號不能重複" };

    const group = registration.group;
    const eventDate = group.event.date;
    const ages = players.map((p) => differenceInYears(eventDate, new Date(p.birthday)));
    const totalAge = ages.reduce((a, b) => a + b, 0);
    const minAge = Math.min(...ages);
    if (group.minTotalAge > 0 && totalAge < group.minTotalAge)
      return { error: `總年齡不足 ${group.minTotalAge} 歲（目前 ${totalAge} 歲）` };
    if (group.minIndividualAge > 0 && minAge < group.minIndividualAge)
      return { error: `有選手年齡不足 ${group.minIndividualAge} 歲` };

    // Recalculate fees using current second-item status (excluding this registration)
    const otherPlayerRecords = await prisma.registrationPlayer.findMany({
      where: {
        nationalId: { in: nationalIds },
        registration: {
          id: { not: registrationId },
          eventId: registration.eventId,
          paymentStatus: { not: "CANCELLED" },
        },
      },
      select: { nationalId: true },
    });
    const existingCounts = new Map<string, number>();
    for (const p of otherPlayerRecords) {
      existingCounts.set(p.nationalId, (existingCounts.get(p.nationalId) ?? 0) + 1);
    }
    const isSecondItem = (id: string) => (existingCounts.get(id) ?? 0) >= 1;
    const playersWithFee = players.map((p) => ({
      ...p,
      fee: calculatePlayerFee(p.memberStatus, isSecondItem(p.nationalId)),
    }));
    const totalAmount = playersWithFee.reduce((sum, p) => sum + p.fee, 0);

    const now = new Date();
    const wasAlreadyPaid = registration.paymentStatus === "PAID";
    const becomingPaid = paymentStatus === "PAID" && !wasAlreadyPaid;

    await prisma.$transaction([
      prisma.registration.update({
        where: { id: registrationId },
        data: {
          teamName,
          genderType,
          paymentStatus,
          totalAmount,
          notes: notes || null,
          transferLastFive: transferLastFive || null,
          transferDate: transferDate ? new Date(transferDate) : null,
          confirmedAt: becomingPaid ? now : registration.confirmedAt,
        },
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
        where: { registrationId, status: { not: "CANCELLED" } },
        data: {
          amount: totalAmount,
          status: paymentStatus === "PAID" ? "PAID" : paymentStatus === "CANCELLED" ? "CANCELLED" : paymentStatus === "CONFIRMING" ? "CONFIRMING" : "PENDING",
          transferLastFive: transferLastFive || null,
          transferDate: transferDate ? new Date(transferDate) : null,
          confirmedAt: becomingPaid ? now : undefined,
          notes: notes || null,
        },
      }),
    ]);

    revalidatePath("/admin/registrations");
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// 後台刪除報名（硬刪除）
export async function adminDeleteRegistration(
  registrationId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAdmin();
    await prisma.payment.deleteMany({ where: { registrationId } });
    await prisma.registration.delete({ where: { id: registrationId } });
    revalidatePath("/admin/registrations");
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// 後台編輯會員資料
export async function adminUpdateMember(
  memberId: string,
  data: {
    realName: string;
    phone: string;
    email?: string;
    expiresAt: string;
    paymentStatus: "PENDING" | "PAID" | "CANCELLED";
    birthday?: string;
    gender?: "MALE" | "FEMALE";
  }
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAdmin();

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return { error: "找不到會員" };

    const now = new Date();
    const isPaid = data.paymentStatus === "PAID";
    const wasActive = member.isActive;

    await prisma.member.update({
      where: { id: memberId },
      data: {
        realName: data.realName,
        phone: data.phone,
        email: data.email || null,
        expiresAt: new Date(data.expiresAt),
        paymentStatus: data.paymentStatus,
        isActive: isPaid,
        confirmedAt: isPaid && !wasActive ? now : member.confirmedAt,
        ...(data.birthday && { birthday: new Date(data.birthday) }),
        ...(data.gender && { gender: data.gender }),
      },
    });

    revalidatePath("/admin/members");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// 後台刪除會員（硬刪除）
export async function adminDeleteMember(
  memberId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAdmin();
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return { error: "找不到會員" };
    if (member.userId) return { error: "此會員已綁定帳號，請先解除綁定" };
    await prisma.payment.deleteMany({ where: { memberId } });
    await prisma.member.delete({ where: { id: memberId } });
    revalidatePath("/admin/members");
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// 取得單筆報名資料（供後台編輯用）
export async function getRegistrationForAdmin(registrationId: string) {
  await requireAdmin();
  return prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      event: { select: { id: true, name: true, date: true } },
      group: {
        include: {
          _count: { select: { registrations: { where: { paymentStatus: { not: "CANCELLED" } } } } },
        },
      },
      players: true,
    },
  });
}

// 取得所有報名列表
export async function getAllRegistrations(eventId?: string) {
  await requireAdmin();

  return prisma.registration.findMany({
    where: eventId ? { eventId } : {},
    include: {
      event: { select: { name: true } },
      group: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
      players: true,
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// 新增公告
export async function createAnnouncement(title: string, content: string, isPublished = false) {
  const session = await requireAdmin();

  const announcement = await prisma.announcement.create({
    data: { title, content, isPublished, authorId: session.user.id },
  });

  revalidatePath("/");
  revalidatePath("/admin/announcements");
  return { success: true, id: announcement.id };
}

// 匯出 Excel 資料 (以 JSON 形式回傳，前端處理)
export async function getRegistrationsForExport(eventId: string) {
  await requireAdmin();

  const registrations = await prisma.registration.findMany({
    where: { eventId },
    include: {
      event: { select: { name: true } },
      group: { select: { name: true } },
      players: true,
    },
  });

  return registrations.flatMap((reg) =>
    reg.players.map((p) => ({
      隊名: reg.teamName,
      組別: reg.group.name,
      姓名: p.name,
      身分證: p.nationalId,
      生日: p.birthday.toISOString().split("T")[0],
      性別: p.gender === "MALE" ? "男" : "女",
      手機: p.phone,
      緊急聯絡人: p.emergencyContact,
      緊急電話: p.emergencyPhone,
      會員資格: { ACTIVE_MEMBER: "有效會員", NEW_MEMBER: "新加入", NON_MEMBER: "非會員" }[p.memberStatus],
      報名項數: p.itemCount,
      費用: p.fee,
      付款狀態: { PENDING: "未付款", CONFIRMING: "待確認", PAID: "已付款", CANCELLED: "取消" }[reg.paymentStatus],
      末五碼: reg.transferLastFive ?? "",
    }))
  );
}
