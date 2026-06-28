"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { addYears } from "date-fns";
import { generateMemberNumber, MEMBERSHIP_PROMO_EXPIRY, BANK_INFO } from "@/lib/utils";

export async function updateUserInfo(data: {
  name?: string;
  phone?: string;
  realName?: string;
  nationalId?: string;
  birthday?: string;
  gender?: string;
  address?: string;
  email?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "請先登入" };

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nationalId: true, nationalIdLockedAt: true },
  });
  if (!currentUser) return { error: "找不到用戶" };

  // 身分證驗證
  if (data.nationalId && !/^[A-Z][12]\d{8}$/.test(data.nationalId)) {
    return { error: "請輸入有效的身分證字號（如：A123456789）" };
  }

  // 身分證鎖定檢查：從現有值改為不同值才算「改過」
  const isChangingNationalId =
    !!data.nationalId &&
    !!currentUser.nationalId &&
    data.nationalId !== currentUser.nationalId;

  if (isChangingNationalId) {
    if (currentUser.nationalIdLockedAt) {
      return { error: `身分證字號只能修改一次，如需修改請寄信至 ${process.env.NEXT_PUBLIC_FROM_EMAIL ?? "官方信箱"} 聯絡官方` };
    }
    // 也檢查已連結的 Member 是否曾修改過身分證
    const linkedMemberRecord = await prisma.member.findUnique({
      where: { userId: session.user.id },
      select: { nationalIdChangedAt: true },
    });
    if (linkedMemberRecord?.nationalIdChangedAt) {
      return { error: `身分證字號只能修改一次，如需修改請寄信至 ${process.env.NEXT_PUBLIC_FROM_EMAIL ?? "官方信箱"} 聯絡官方` };
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined)     updateData.name     = data.name || null;
  if (data.phone !== undefined)    updateData.phone    = data.phone || null;
  if (data.realName !== undefined) updateData.realName = data.realName || null;
  if (data.gender !== undefined)   updateData.gender   = data.gender || null;
  if (data.address !== undefined)  updateData.address  = data.address || null;
  if (data.birthday !== undefined) updateData.birthday = data.birthday ? new Date(data.birthday) : null;

  if (data.email !== undefined) {
    const emailVal = data.email || null;
    if (emailVal) {
      const taken = await prisma.user.findFirst({
        where: { email: emailVal, NOT: { id: session.user.id } },
      });
      if (taken) return { error: "此電子信箱已被其他帳號使用" };
    }
    updateData.email = emailVal;
  }

  let autoLinked = false;
  if (data.nationalId) {
    updateData.nationalId = data.nationalId;
    if (isChangingNationalId) updateData.nationalIdLockedAt = new Date();

    // 身分證字號與孤立 Member 相符 → 自動連結
    const orphaned = await prisma.member.findUnique({ where: { nationalId: data.nationalId } });
    if (orphaned && !orphaned.userId) {
      await prisma.member.update({
        where: { id: orphaned.id },
        data: { userId: session.user.id },
      });
      autoLinked = true;
    }
  }

  try {
    await prisma.user.update({ where: { id: session.user.id }, data: updateData });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "此身分證字號已被其他帳號使用" };
    return { error: (e as Error).message };
  }

  revalidatePath("/member");
  return { success: true, autoLinked };
}

const memberSchema = z.object({
  realName: z.string().min(2, "姓名至少2個字"),
  nationalId: z
    .string()
    .regex(/^[A-Z][12]\d{8}$/, "請輸入有效的身分證字號"),
  birthday: z.string().refine((d) => !isNaN(Date.parse(d)), "請輸入有效日期"),
  gender: z.enum(["MALE", "FEMALE"]),
  phone: z.string().regex(/^09\d{8}$/, "請輸入有效的手機號碼"),
  address: z.string().optional(),
});

export type MemberFormData = z.infer<typeof memberSchema>;

export async function registerMember(data: MemberFormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "請先登入" };

  const parsed = memberSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { realName, nationalId, birthday, gender, phone, address } = parsed.data;

  // 檢查此用戶是否已有會員資料
  const existingUser = await prisma.member.findUnique({ where: { userId: session.user.id } });
  if (existingUser) return { error: "您已有會員申請紀錄" };

  // 若孤立 Member 已存在（由報名流程建立），直接關聯
  const orphaned = await prisma.member.findUnique({ where: { nationalId } });
  if (orphaned) {
    if (orphaned.userId) {
      if (orphaned.userId === session.user.id) {
        // 已連結到自己，不需再操作
        return { success: true, memberNumber: orphaned.memberNumber, linked: true, paymentStatus: orphaned.paymentStatus };
      }
      return { error: "此身分證字號已被其他帳號使用" };
    }
    await prisma.member.update({
      where: { id: orphaned.id },
      data: { userId: session.user.id },
    });
    revalidatePath("/member");
    return { success: true, memberNumber: orphaned.memberNumber, linked: true, paymentStatus: orphaned.paymentStatus };
  }

  const memberNumber = generateMemberNumber();
  const expiresAt = MEMBERSHIP_PROMO_EXPIRY;

  const member = await prisma.member.create({
    data: {
      userId: session.user.id,
      memberNumber,
      nationalId,
      realName,
      birthday: new Date(birthday),
      gender,
      phone,
      address,
      expiresAt,
      isActive: false,
      paymentStatus: "PENDING",
    },
  });

  // 建立付款記錄
  await prisma.payment.create({
    data: {
      memberId: member.id,
      type: "MEMBERSHIP_FEE",
      amount: 500,
      status: "PENDING",
      bankCode: BANK_INFO.bankCode,
      bankAccount: BANK_INFO.accountNumber,
    },
  });

  revalidatePath("/member");
  return { success: true, memberNumber };
}

const paymentSchema = z.object({
  transferLastFive: z.string().length(5, "請輸入匯款末5碼").regex(/^\d{5}$/, "必須是5位數字"),
  transferDate: z.string().refine((d) => !isNaN(Date.parse(d)), "請輸入有效日期"),
});

export async function submitMemberPayment(data: z.infer<typeof paymentSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: "請先登入" };

  const parsed = paymentSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const member = await prisma.member.findUnique({ where: { userId: session.user.id } });
  if (!member) return { error: "找不到會員資料" };
  if (member.paymentStatus === "PAID") return { error: "已完成付款" };

  await prisma.member.update({
    where: { id: member.id },
    data: {
      transferLastFive: parsed.data.transferLastFive,
      transferDate: new Date(parsed.data.transferDate),
      paymentStatus: "CONFIRMING",
    },
  });

  await prisma.payment.updateMany({
    where: { memberId: member.id, type: "MEMBERSHIP_FEE", status: "PENDING" },
    data: {
      transferLastFive: parsed.data.transferLastFive,
      transferDate: new Date(parsed.data.transferDate),
      status: "CONFIRMING",
    },
  });

  revalidatePath("/member");
  return { success: true };
}

export async function getMemberData() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const include = {
    payments: { orderBy: { createdAt: "desc" } as const },
    user: { select: { name: true, email: true, image: true } },
  };

  let member = await prisma.member.findUnique({
    where: { userId: session.user.id },
    include,
  });

  // 孤立 Member 只能透過身分證字號認領（在入會申請或個人資料頁）

  return member;
}

export async function renewMembership(data: z.infer<typeof paymentSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { error: "請先登入" };

  const member = await prisma.member.findUnique({ where: { userId: session.user.id } });
  if (!member) return { error: "找不到會員資料" };

  const parsed = paymentSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.payment.create({
    data: {
      memberId: member.id,
      type: "RENEWAL_FEE",
      amount: 500,
      status: "CONFIRMING",
      transferLastFive: parsed.data.transferLastFive,
      transferDate: new Date(parsed.data.transferDate),
      bankCode: BANK_INFO.bankCode,
      bankAccount: BANK_INFO.accountNumber,
    },
  });

  revalidatePath("/member");
  return { success: true };
}

const updateProfileSchema = z.object({
  realName: z.string().min(2, "姓名至少2個字"),
  birthday: z.string().refine((d) => !isNaN(Date.parse(d)), "請輸入有效日期"),
  gender: z.enum(["MALE", "FEMALE"]),
  phone: z.string().regex(/^09\d{8}$/, "請輸入有效的手機號碼"),
  address: z.string().optional(),
  email: z.string().email("請輸入有效的電子信箱").optional().or(z.literal("")),
  nationalId: z.string().regex(/^[A-Z][12]\d{8}$/, "請輸入有效的身分證字號").optional(),
});

export type UpdateProfileData = z.infer<typeof updateProfileSchema>;

export async function updateMemberProfile(data: UpdateProfileData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "請先登入" };

  const parsed = updateProfileSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const member = await prisma.member.findUnique({ where: { userId: session.user.id } });
  if (!member) return { error: "找不到會員資料" };

  const updateData: Record<string, unknown> = {
    realName: parsed.data.realName,
    birthday: new Date(parsed.data.birthday),
    gender: parsed.data.gender,
    phone: parsed.data.phone,
    address: parsed.data.address || null,
    email: parsed.data.email || null,
  };

  // 身分證字號：只能改一次
  const newNationalId = parsed.data.nationalId && parsed.data.nationalId !== member.nationalId
    ? parsed.data.nationalId : null;

  if (newNationalId) {
    if (member.nationalIdChangedAt) {
      return { error: `身分證字號只能修改一次，如需修改請寄信至 ${process.env.NEXT_PUBLIC_FROM_EMAIL ?? "官方信箱"} 聯絡官方` };
    }
    // 也檢查 User 層級的身分證鎖定（在個人資料頁改過）
    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { nationalIdLockedAt: true },
    });
    if (userRecord?.nationalIdLockedAt) {
      return { error: `身分證字號只能修改一次，如需修改請寄信至 ${process.env.NEXT_PUBLIC_FROM_EMAIL ?? "官方信箱"} 聯絡官方` };
    }
    const taken = await prisma.member.findUnique({ where: { nationalId: newNationalId } });
    if (taken) {
      if (taken.userId) return { error: "此身分證字號已被其他會員使用" };
      // 孤立 Member（由報名流程建立）→ 合併付款記錄後刪除
      await prisma.payment.updateMany({
        where: { memberId: taken.id },
        data: { memberId: member.id },
      });
      await prisma.member.delete({ where: { id: taken.id } });
    }
    updateData.nationalId = newNationalId;
    updateData.nationalIdChangedAt = new Date();
  }

  await prisma.member.update({ where: { id: member.id }, data: updateData });

  // 比對報名記錄，看是否已透過報名費付過入會費（NEW_MEMBER）
  const effectiveNationalId = newNationalId ?? member.nationalId;
  const effectivePhone = parsed.data.phone;
  const nationalIdChanged = !!newNationalId;
  const phoneChanged = parsed.data.phone !== member.phone;

  if (nationalIdChanged || phoneChanged) {
    const regPlayers = await prisma.registrationPlayer.findMany({
      where: {
        OR: [
          { nationalId: effectiveNationalId },
          { phone: effectivePhone },
        ],
        memberStatus: "NEW_MEMBER",
      },
      include: {
        registration: { select: { paymentStatus: true } },
      },
    });

    if (regPlayers.length > 0) {
      const statuses = regPlayers.map((p) => p.registration.paymentStatus);
      const refreshed = await prisma.member.findUnique({ where: { id: member.id } });
      if (refreshed && refreshed.paymentStatus === "PENDING") {
        if (statuses.includes("PAID")) {
          await prisma.member.update({
            where: { id: member.id },
            data: {
              paymentStatus: "PAID",
              isActive: true,
              confirmedAt: new Date(),
              expiresAt: MEMBERSHIP_PROMO_EXPIRY,
            },
          });
        } else if (statuses.includes("CONFIRMING")) {
          await prisma.member.update({
            where: { id: member.id },
            data: { paymentStatus: "CONFIRMING" },
          });
        }
      }
    }
  }

  revalidatePath("/member");
  return { success: true };
}
