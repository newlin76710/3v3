import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getRegistrationForAdmin } from "@/app/actions/admin";
import { computeGenderCounts } from "@/lib/utils";
import AdminRegistrationForm from "../../AdminRegistrationForm";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "編輯報名 | 後台" };

export default async function AdminEditRegistrationPage({ params }: Props) {
  const { id } = await params;
  const registration = await getRegistrationForAdmin(id);
  if (!registration) notFound();

  const rawEvents = await prisma.event.findMany({
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

  const defaultPlayers = registration.players.map((p) => ({
    id: p.id,
    name: p.name,
    nationalId: p.nationalId,
    birthday: p.birthday.toISOString().split("T")[0],
    phone: p.phone,
    email: p.email ?? "",
    gender: p.gender as "MALE" | "FEMALE",
    emergencyContact: p.emergencyContact,
    emergencyPhone: p.emergencyPhone,
    memberStatus: p.memberStatus as "ACTIVE_MEMBER" | "NEW_MEMBER" | "NON_MEMBER",
  }));

  return (
    <div>
      <div className="mb-6">
        <a href="/admin/registrations" className="text-blue-600 hover:underline text-sm">
          ← 返回報名管理
        </a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">編輯報名</h1>
        <p className="text-gray-500 text-sm mt-1">{registration.event.name} — {registration.teamName}</p>
      </div>

      <AdminRegistrationForm
        events={events}
        mode="edit"
        registrationId={id}
        defaultEventId={registration.event.id}
        defaultGroupId={registration.group.id}
        defaultTeamName={registration.teamName}
        defaultGenderType={registration.genderType}
        defaultPaymentStatus={registration.paymentStatus}
        defaultNotes={registration.notes ?? ""}
        defaultTransferLastFive={registration.transferLastFive ?? ""}
        defaultTransferDate={registration.transferDate ? registration.transferDate.toISOString().split("T")[0] : ""}
        defaultPlayers={defaultPlayers}
      />
    </div>
  );
}
