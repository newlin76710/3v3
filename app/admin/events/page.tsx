import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Plus, CalendarDays, MapPin, Users, Settings } from "lucide-react";

export const metadata = { title: "賽事管理 | 後台" };

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({
    include: {
      groups: { include: { _count: { select: { registrations: { where: { paymentStatus: { not: "CANCELLED" } } } } } } },
    },
    orderBy: { date: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">賽事管理</h1>
        <Link href="/admin/events/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            新增賽事
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>尚無賽事，請新增</p>
          </div>
        ) : (
          events.map((event) => {
            const totalReg = event.groups.reduce((s, g) => s + g._count.registrations, 0);
            const now = new Date();
            const isOpen =
              event.isOpen &&
              now >= new Date(event.registrationStart) &&
              now <= new Date(event.registrationEnd);

            return (
              <Card key={event.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h2 className="font-bold text-gray-900">{event.name}</h2>
                        <Badge variant={isOpen ? "success" : event.isOpen ? "secondary" : "destructive"}>
                          {isOpen ? "報名中" : event.isOpen ? "未開放" : "已關閉"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" /> {formatDate(event.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {event.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> 報名 {totalReg} 隊
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {event.groups.map((g) => (
                          <Badge key={g.id} variant="outline" className="text-xs">
                            {g.name}（{g._count.registrations}/{g.maxTeams}）
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Link href={`/admin/events/${event.id}`}>
                        <Button size="sm" variant="outline" className="gap-1">
                          <Settings className="w-3.5 h-3.5" />
                          管理
                        </Button>
                      </Link>
                      <Link href={`/admin/registrations?event=${event.id}`}>
                        <Button size="sm" variant="outline">
                          報名列表
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
