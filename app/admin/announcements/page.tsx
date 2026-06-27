import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AnnouncementsManager from "./AnnouncementsManager";

export const metadata = { title: "公告管理 | 後台" };

export default async function AnnouncementsPage() {
  const session = await auth();
  if (!session || !["ADMIN", "STAFF"].includes(session.user.role)) redirect("/login");

  const announcements = await prisma.announcement.findMany({
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">公告管理</h1>
      <AnnouncementsManager announcements={announcements} />
    </div>
  );
}
