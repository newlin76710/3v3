import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getEventBySlug } from "@/app/actions/event";
import { getMemberData } from "@/app/actions/member";
import RegistrationForm from "./RegistrationForm";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ group?: string }>;
}

export const metadata = { title: "報名賽事 | 中華台北羽球3對3發展協會" };

export default async function RegisterPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=/events/${(await params).slug}/register`);

  const { slug } = await params;
  const { group: groupId } = await searchParams;

  const [event, memberData] = await Promise.all([
    getEventBySlug(slug),
    getMemberData(),
  ]);

  if (!event) notFound();

  const now = new Date();
  if (now < new Date(event.registrationStart) || now > new Date(event.registrationEnd)) {
    redirect(`/events/${slug}`);
  }

  const selectedGroup = groupId
    ? event.groups.find((g) => g.id === groupId)
    : event.groups[0];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <a href={`/events/${slug}`} className="text-blue-600 hover:underline text-sm">
          ← 返回賽事詳情
        </a>

        <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">報名：{event.name}</h1>
        <p className="text-gray-500 mb-6">請填寫三位選手資料，系統將自動驗證年齡與費用</p>

        <RegistrationForm
          event={event}
          groups={event.groups}
          defaultGroupId={selectedGroup?.id ?? event.groups[0]?.id}
          memberData={memberData}
          userId={session.user.id}
        />
      </div>
    </div>
  );
}
