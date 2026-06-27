import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import EventAdminManager from "./EventAdminManager";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EventAdminPage({ params }: Props) {
  const session = await auth();
  if (!session || !["ADMIN", "STAFF"].includes(session.user.role)) redirect("/login");

  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      groups: {
        include: { _count: { select: { registrations: true } } },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!event) notFound();

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <a href="/admin/events" className="text-gray-400 hover:text-gray-600">← 賽事列表</a>
        <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
      </div>
      <EventAdminManager event={event} />
    </div>
  );
}
