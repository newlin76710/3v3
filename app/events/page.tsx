import Link from "next/link";
import { getPublicEvents } from "@/app/actions/event";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { CalendarDays, MapPin, Users, Trophy } from "lucide-react";

export const metadata = { title: "賽事列表 | 中華台北羽球3對3發展協會" };

export default async function EventsPage() {
  const [events, session] = await Promise.all([
    getPublicEvents(),
    auth(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/3v3.jpg" alt="Logo" className="w-10 h-10 rounded-full object-cover" />
            <span className="font-bold text-gray-900 hidden sm:block">中華台北羽球3對3發展協會</span>
          </Link>
          <div className="flex gap-2">
            {session ? (
              <Link href="/member">
                <Button variant="outline" size="sm">會員中心</Button>
              </Link>
            ) : (
              <Link href="/login?callbackUrl=/events">
                <Button size="sm">登入 / 加入會員</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">賽事活動</h1>
          <p className="text-gray-500">查看所有開放報名的賽事，立即組隊參加</p>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg">目前沒有開放的賽事</p>
            <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
              返回首頁
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {events.map((event) => {
              const now = new Date();
              const isRegistrationOpen =
                now >= new Date(event.registrationStart) &&
                now <= new Date(event.registrationEnd);

              const totalTeams = event.groups.reduce(
                (sum, g) => sum + g._count.registrations,
                0
              );
              const totalCapacity = event.groups.reduce(
                (sum, g) => sum + g.maxTeams * g.allowedGenders.length,
                0
              );

              return (
                <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  {event.poster && (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={event.poster}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h2 className="font-bold text-lg text-gray-900 leading-tight">{event.name}</h2>
                      <Badge variant={isRegistrationOpen ? "success" : "secondary"}>
                        {isRegistrationOpen ? "報名中" : "報名未開放"}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-gray-400" />
                        <span>比賽日期：{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>已報名 {totalTeams} / {totalCapacity} 隊</span>
                      </div>
                    </div>

                    {/* 組別列表 */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {event.groups.map((group) => (
                        <Badge key={group.id} variant="outline" className="text-xs">
                          {group.name}（{group._count.registrations}/{group.maxTeams * group.allowedGenders.length}隊）
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                      <span>報名截止：{formatDate(event.registrationEnd)}</span>
                    </div>

                    <Link
                      href={
                        !session
                          ? `/login?callbackUrl=/events`
                          : `/events/${event.slug}`
                      }
                      className="block"
                    >
                      <Button className="w-full" variant={isRegistrationOpen ? "default" : "outline"}>
                        {isRegistrationOpen ? "立即報名" : "查看詳情"}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
