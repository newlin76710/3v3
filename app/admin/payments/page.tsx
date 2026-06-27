import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import PaymentsManager from "./PaymentsManager";

export const metadata = { title: "付款確認 | 後台" };

export default async function AdminPaymentsPage() {
  const session = await auth();
  if (!session || !["ADMIN", "STAFF"].includes(session.user.role)) redirect("/login");

  const [pendingMembers, pendingRegistrations] = await Promise.all([
    prisma.member.findMany({
      where: { paymentStatus: "CONFIRMING" },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { transferDate: "asc" },
    }),
    prisma.registration.findMany({
      where: { paymentStatus: "CONFIRMING" },
      include: {
        createdBy: { select: { name: true, email: true } },
        event: { select: { name: true } },
        group: { select: { name: true } },
        players: true,
      },
      orderBy: { transferDate: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">付款確認</h1>
      <PaymentsManager
        pendingMembers={pendingMembers}
        pendingRegistrations={pendingRegistrations}
      />
    </div>
  );
}
