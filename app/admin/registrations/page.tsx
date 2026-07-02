import { getAllRegistrations, getRegistrationsForExport } from "@/app/actions/admin";
import { prisma } from "@/lib/prisma";
import RegistrationsTable from "./RegistrationsTable";

interface Props {
  searchParams: Promise<{ event?: string; group?: string; gender?: string }>;
}

export const metadata = { title: "報名管理 | 後台" };

export default async function AdminRegistrationsPage({ searchParams }: Props) {
  const { event: eventId, group: groupId, gender } = await searchParams;
  const genderType =
    gender === "MALE_TRIPLE" || gender === "FEMALE_TRIPLE" || gender === "MIXED" ? gender : undefined;

  const [registrations, events, groups] = await Promise.all([
    getAllRegistrations(eventId, groupId, genderType),
    prisma.event.findMany({ select: { id: true, name: true }, orderBy: { date: "desc" } }),
    eventId
      ? prisma.eventGroup.findMany({
          where: { eventId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">報名管理</h1>
      <RegistrationsTable
        registrations={registrations}
        events={events}
        groups={groups}
        selectedEventId={eventId}
        selectedGroupId={groupId}
        selectedGender={genderType}
      />
    </div>
  );
}
