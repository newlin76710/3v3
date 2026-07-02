import { prisma } from "@/lib/prisma";
import { computeGenderCounts } from "@/lib/utils";
import AdminRegistrationForm from "../AdminRegistrationForm";

export const metadata = { title: "新增報名 | 後台" };

export default async function AdminNewRegistrationPage() {
  const rawEvents = await prisma.event.findMany({
    where: { isOpen: true },
    include: {
      groups: {
        include: {
          registrations: {
            where: { paymentStatus: { not: "CANCELLED" } },
            select: { genderType: true },
          },
        },
      },
    },
    orderBy: { date: "desc" },
  });

  const events = rawEvents.map((e) => ({
    ...e,
    groups: e.groups.map(({ registrations, ...g }) => ({
      ...g,
      genderCounts: computeGenderCounts(registrations),
    })),
  }));

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
