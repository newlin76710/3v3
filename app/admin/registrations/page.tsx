import { getAllRegistrations, getRegistrationsForExport } from "@/app/actions/admin";
import { prisma } from "@/lib/prisma";
import RegistrationsTable from "./RegistrationsTable";

interface Props {
  searchParams: Promise<{ event?: string }>;
}

export const metadata = { title: "報名管理 | 後台" };

export default async function AdminRegistrationsPage({ searchParams }: Props) {
  const { event: eventId } = await searchParams;
  const [registrations, events] = await Promise.all([
    getAllRegistrations(eventId),
    prisma.event.findMany({ select: { id: true, name: true }, orderBy: { date: "desc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">報名管理</h1>
      <RegistrationsTable
        registrations={registrations}
        events={events}
        selectedEventId={eventId}
      />
    </div>
  );
}
