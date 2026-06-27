import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getEventBySlug } from "@/app/actions/event";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { CalendarDays, MapPin, Users, Clock, ChevronRight } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};
  return { title: `${event.name} | 中華台北羽球3對3發展協會` };
}

const genderLabel: Record<string, string> = {
  MALE_TRIPLE: "男3P",
  FEMALE_TRIPLE: "女3P",
  MIXED: "混3P",
};

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const [event, session] = await Promise.all([
    getEventBySlug(slug),
    auth(),
  ]);

  if (!event) notFound();

  const now = new Date();
  const isRegistrationOpen =
    now >= new Date(event.registrationStart) && now <= new Date(event.registrationEnd);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/events" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>賽事列表</span>
          </Link>
          {session ? (
            <Link href="/member"><Button variant="outline" size="sm">會員中心</Button></Link>
          ) : (
            <Link href={`/login?callbackUrl=/events/${slug}`}>
              <Button size="sm">登入 / 加入會員</Button>
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Event Header */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6">
          {event.poster && (
            <div className="h-64 overflow-hidden">
              <img src={event.poster} alt={event.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 flex-wrap">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-4 h-4" /> {formatDate(event.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {event.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> 截止：{formatDate(event.registrationEnd)}
                  </span>
                </div>
              </div>
              <Badge variant={isRegistrationOpen ? "success" : "secondary"} className="text-sm px-3 py-1">
                {isRegistrationOpen ? "報名開放中" : "報名未開放"}
              </Badge>
            </div>

            {event.description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-gray-600 whitespace-pre-line">{event.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* 報名規則說明 */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <h2 className="font-bold text-gray-900 mb-3">報名費用規則</h2>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-semibold text-blue-700 mb-1">有效協會會員</p>
                <p className="text-blue-600">固定 NT$ 200（不限項數）</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="font-semibold text-green-700 mb-1">新加入會員</p>
                <p className="text-green-600">NT$ 700（年費500 + 報名費200）</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="font-semibold text-orange-700 mb-1">非會員</p>
                <p className="text-orange-600">1項 NT$ 450 ／ 2項 NT$ 900</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 組別列表 */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">參賽組別</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {event.groups.map((group) => {
            const isFull = group._count.registrations >= group.maxTeams;

            return (
              <Card key={group.id} className={isFull ? "opacity-75" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{group.name}</h3>
                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                        <Users className="w-3.5 h-3.5" />
                        <span>{group._count.registrations} / {group.maxTeams} 隊</span>
                        {isFull && <Badge variant="destructive" className="ml-2 text-xs">額滿</Badge>}
                      </div>
                    </div>
                    {!isFull && isRegistrationOpen && (
                      <Link href={`/events/${event.slug}/register?group=${group.id}`}>
                        <Button size="sm">報名此組</Button>
                      </Link>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-20 shrink-0">總年齡</span>
                      <span className="font-medium">{group.minTotalAge}+ 歲</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-20 shrink-0">最低年齡</span>
                      <span className="font-medium">{group.minIndividualAge}+ 歲</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-20 shrink-0">可選組別</span>
                      <div className="flex flex-wrap gap-1">
                        {group.allowedGenders.map((g) => (
                          <Badge key={g} variant="outline" className="text-xs">
                            {genderLabel[g]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 進度條 */}
                  <div className="mt-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isFull ? "bg-red-500" : "bg-blue-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (group._count.registrations / group.maxTeams) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!isRegistrationOpen && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center text-yellow-700">
            {now < new Date(event.registrationStart)
              ? `報名將於 ${formatDate(event.registrationStart)} 開始`
              : "報名已截止"}
          </div>
        )}

        {isRegistrationOpen && !session && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-blue-700 mb-3">請先登入才能報名</p>
            <Link href={`/login?callbackUrl=/events/${slug}`}>
              <Button>登入後報名</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
