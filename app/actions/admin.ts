"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { addYears } from "date-fns";

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
    // 如果已過期，從今天起算一年；否則從原到期日起算
    const currentExpiry = member.expiresAt < now ? now : member.expiresAt;
    const newExpiry = addYears(currentExpiry, 1);

    await prisma.member.update({
      where: { id: memberId },
      data: {
        isActive: true,
        paymentStatus: "PAID",
        expiresAt: newExpiry,
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

    await prisma.registration.update({
      where: { id: registrationId },
      data: { paymentStatus: "PAID", confirmedAt: new Date() },
    });

    await prisma.payment.updateMany({
      where: { registrationId, status: "CONFIRMING" },
      data: { status: "PAID", confirmedAt: new Date() },
    });

    revalidatePath("/admin/registrations");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// 取消報名
export async function cancelRegistration(registrationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    await prisma.registration.update({
      where: { id: registrationId },
      data: { paymentStatus: "CANCELLED" },
    });

    revalidatePath("/admin/registrations");
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
