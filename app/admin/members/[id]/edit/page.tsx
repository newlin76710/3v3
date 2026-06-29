import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminMemberForm from "../../AdminMemberForm";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "編輯會員 | 後台" };

export default async function AdminEditMemberPage({ params }: Props) {
  const { id } = await params;

  const member = await prisma.member.findUnique({
    where: { id },
    include: { user: { select: { id: true } } },
  });
  if (!member) notFound();

  return (
    <div>
      <div className="mb-6">
        <a href="/admin/members" className="text-blue-600 hover:underline text-sm">
          ← 返回會員管理
        </a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">編輯會員資料</h1>
        <p className="text-gray-500 text-sm mt-1">{member.memberNumber} — {member.realName}</p>
      </div>
      <div className="max-w-2xl">
        <AdminMemberForm
          mode="edit"
          memberId={id}
          defaultRealName={member.realName}
          defaultNationalId={member.nationalId}
          defaultBirthday={member.birthday.toISOString().split("T")[0]}
          defaultGender={member.gender}
          defaultPhone={member.phone}
          defaultEmail={member.email ?? ""}
          defaultExpiresAt={member.expiresAt.toISOString().split("T")[0]}
          defaultPaymentStatus={member.paymentStatus}
          hasLinkedUser={!!member.user}
        />
      </div>
    </div>
  );
}
