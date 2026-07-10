"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { buildBroadcastEmailHtml } from "@/lib/email-template";
import { revalidatePath } from "next/cache";
import type { EmailAudienceScope, EmailAudienceSegment } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    throw new Error("無權限");
  }
  return session;
}

type Recipient = { email: string; name: string | null };

function userWhereForSegment(segment: EmailAudienceSegment) {
  switch (segment) {
    case "ASSOCIATION_MEMBER":
      return { member: { isNot: null } };
    case "PAID":
      return { member: { is: { paymentStatus: "PAID" as const } } };
    case "UNPAID":
      return { member: { is: { paymentStatus: { not: "PAID" as const } } } };
    case "REGISTERED":
      return { registrations: { some: {} } };
    case "NOT_REGISTERED":
      return { registrations: { none: {} } };
    case "EVERYONE":
    default:
      return {};
  }
}

// 未認領帳號的會員資料無法判斷報名狀態，遇到報名相關篩選時不納入此類資料
function memberWhereForSegment(segment: EmailAudienceSegment) {
  switch (segment) {
    case "REGISTERED":
    case "NOT_REGISTERED":
      return null;
    case "PAID":
      return { paymentStatus: "PAID" as const };
    case "UNPAID":
      return { paymentStatus: { not: "PAID" as const } };
    default:
      return {};
  }
}

async function resolveRecipients(
  scope: EmailAudienceScope,
  segment: EmailAudienceSegment
): Promise<Recipient[]> {
  const users = await prisma.user.findMany({
    where: { email: { not: null }, ...userWhereForSegment(segment) },
    select: { email: true, name: true },
  });

  const recipients: Recipient[] = users.map((u) => ({ email: u.email as string, name: u.name }));

  if (scope === "ALL") {
    const memberWhere = memberWhereForSegment(segment);
    if (memberWhere) {
      const members = await prisma.member.findMany({
        where: { userId: null, email: { not: null }, ...memberWhere },
        select: { email: true, realName: true },
      });
      for (const m of members) {
        recipients.push({ email: m.email as string, name: m.realName });
      }
    }
  }

  const seen = new Set<string>();
  return recipients.filter((r) => {
    const key = r.email.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// 預覽符合篩選條件的收件人數
export async function previewBroadcastRecipients(
  scope: EmailAudienceScope,
  segment: EmailAudienceSegment
): Promise<{ count: number; error?: undefined } | { error: string; count?: undefined }> {
  try {
    await requireAdmin();
    const recipients = await resolveRecipients(scope, segment);
    return { count: recipients.length };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// 發送群發信件
export async function sendBroadcastEmail(data: {
  subject: string;
  content: string;
  scope: EmailAudienceScope;
  segment: EmailAudienceSegment;
}): Promise<{ success?: boolean; recipientCount?: number; error?: string }> {
  try {
    const session = await requireAdmin();
    const subject = data.subject.trim();
    const content = data.content.trim();
    if (!subject || !content) return { error: "請填寫主旨與內容" };

    const recipients = await resolveRecipients(data.scope, data.segment);
    if (recipients.length === 0) return { error: "找不到符合條件的收件人" };

    const fromEmail = process.env.FROM_EMAIL;
    if (!fromEmail) return { error: "尚未設定 FROM_EMAIL 環境變數" };

    const html = buildBroadcastEmailHtml(subject, content);

    // Resend batch API 單次最多 100 封，超過則分批寄送
    const BATCH_SIZE = 100;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      await resend.batch.send(
        batch.map((r) => ({
          from: fromEmail,
          to: r.email,
          subject,
          html,
        }))
      );
    }

    await prisma.emailBroadcast.create({
      data: {
        subject,
        content,
        scope: data.scope,
        segment: data.segment,
        recipientCount: recipients.length,
        sentById: session.user.id,
      },
    });

    revalidatePath("/admin/emails");
    return { success: true, recipientCount: recipients.length };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// 取得群發歷史紀錄
export async function getBroadcastHistory() {
  await requireAdmin();
  return prisma.emailBroadcast.findMany({
    include: { sentBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
