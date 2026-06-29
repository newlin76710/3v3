import { prisma } from "@/lib/prisma";
import AdminRegistrationForm from "../AdminRegistrationForm";

export const metadata = { title: "新增報名 | 後台" };

export default async function AdminNewRegistrationPage() {
  const events = await prisma.event.findMany({
    where: { isOpen: true },
    include: {
      groups: {
        include: {
          _count: {
            select: { registrations: { where: { paymentStatus: { not: "CANCELLED" } } } },
          },
        },
      },
    },
    orderBy: { date: "desc" },
  });

  return (
    <div>
      <div className="mb-6">
        <a href="/admin/registrations" className="text-blue-600 hover:underline text-sm">
          ← 返回報名管理
        </a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">新增報名</h1>
        <p className="text-gray-500 text-sm mt-1">供現場或電話報名使用，可直接設定付款狀態</p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 text-gray-400">目前沒有開放中的賽事</div>
      ) : (
        <AdminRegistrationForm events={events} mode="create" />
      )}
    </div>
  );
}
