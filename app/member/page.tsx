import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMemberData, getMembershipUpgradeOffer } from "@/app/actions/member";
import { getMyRegistrations } from "@/app/actions/registration";
import { prisma } from "@/lib/prisma";
import MemberDashboard from "./MemberDashboard";

export const metadata = { title: "會員中心 | 中華台北羽球3對3發展協會" };

export default async function MemberPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/member");

  const [memberData, registrations, fullUser, upgradeOffer] = await Promise.all([
    getMemberData(),
    getMyRegistrations(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true, email: true, image: true, phone: true,
        realName: true, nationalId: true, birthday: true,
        gender: true, address: true, nationalIdLockedAt: true,
      },
    }),
    getMembershipUpgradeOffer(),
  ]);

  return (
    <MemberDashboard
      user={{ role: session.user.role, ...fullUser }}
      member={memberData}
      registrations={registrations}
      upgradeOffer={upgradeOffer}
    />
  );
}
