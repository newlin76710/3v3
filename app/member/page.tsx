import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMemberData } from "@/app/actions/member";
import { getMyRegistrations } from "@/app/actions/registration";
import MemberDashboard from "./MemberDashboard";

export const metadata = { title: "會員中心 | 中華台北羽球3對3發展協會" };

export default async function MemberPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/member");

  const [memberData, registrations] = await Promise.all([
    getMemberData(),
    getMyRegistrations(),
  ]);

  return (
    <MemberDashboard
      user={{ ...session.user, role: session.user.role }}
      member={memberData}
      registrations={registrations}
    />
  );
}
