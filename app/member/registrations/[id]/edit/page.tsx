import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getMyRegistrationForEdit } from "@/app/actions/registration";
import MemberRegistrationEditForm from "./MemberRegistrationEditForm";

export const metadata = { title: "修改報名資料 | 會員中心" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MemberRegistrationEditPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/member");

  const { id } = await params;
  const registration = await getMyRegistrationForEdit(id);
  if (!registration) notFound();

  if (registration.paymentStatus !== "PENDING") {
    redirect("/member");
  }

  const defaultPlayers = registration.players.map((p) => ({
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
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <a href="/member" className="text-blue-600 hover:underline text-sm">
          ← 返回會員中心
        </a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-1">修改報名資料</h1>
        <p className="text-gray-500 text-sm mb-6">
          {registration.event.name} — 尚未繳費，可自由修改資料後重新提交付款
        </p>

        <MemberRegistrationEditForm
          registrationId={id}
          event={{
            id: registration.event.id,
            name: registration.event.name,
            slug: registration.event.slug,
            date: registration.event.date,
          }}
          group={{
            id: registration.group.id,
            name: registration.group.name,
            minTotalAge: registration.group.minTotalAge,
            minIndividualAge: registration.group.minIndividualAge,
            allowedGenders: registration.group.allowedGenders,
            maxTeams: registration.group.maxTeams,
            genderCounts: registration.genderCounts,
          }}
          defaultTeamName={registration.teamName}
          defaultGenderType={registration.genderType}
          defaultPlayers={defaultPlayers}
        />
      </main>
    </div>
  );
}
