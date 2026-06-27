"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { addYears } from "date-fns";
import { generateMemberNumber, MEMBERSHIP_DURATION_YEARS, BANK_INFO } from "@/lib/utils";

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

  // 檢查身分證是否已存在
  const existing = await prisma.member.findUnique({ where: { nationalId } });
  if (existing) return { error: "此身分證字號已註冊為會員" };

  // 檢查此用戶是否已有會員資料
  const existingUser = await prisma.member.findUnique({ where: { userId: session.user.id } });
  if (existingUser) return { error: "您已有會員申請紀錄" };

  const memberNumber = generateMemberNumber();
  const expiresAt = addYears(new Date(), MEMBERSHIP_DURATION_YEARS);

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

  return prisma.member.findUnique({
    where: { userId: session.user.id },
    include: {
      payments: { orderBy: { createdAt: "desc" } },
      user: { select: { name: true, email: true, image: true } },
    },
  });
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
