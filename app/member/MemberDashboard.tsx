"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  User, CreditCard, Trophy, LogOut, Plus, AlertCircle, CheckCircle, Clock,
} from "lucide-react";

type Member = {
  id: string;
  memberNumber: string;
  realName: string;
  nationalId: string;
  expiresAt: Date;
  isActive: boolean;
  paymentStatus: string;
  payments: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    createdAt: Date;
  }>;
};

type Registration = {
  id: string;
  teamName: string;
  genderType: string;
  paymentStatus: string;
  totalAmount: number;
  event: { name: string; date: Date; location: string; slug: string };
  group: { name: string };
  players: Array<{ name: string; nationalId: string }>;
};

interface Props {
  user: { name?: string | null; email?: string | null; image?: string | null };
  member: Member | null;
  registrations: Registration[];
}

const statusMap = {
  PENDING: { label: "未付款", color: "secondary" as const },
  CONFIRMING: { label: "待確認", color: "warning" as const },
  PAID: { label: "已付款", color: "success" as const },
  CANCELLED: { label: "取消", color: "destructive" as const },
};

const paymentTypeMap: Record<string, string> = {
  MEMBERSHIP_FEE: "入會費",
  REGISTRATION_FEE: "報名費",
  RENEWAL_FEE: "續會費",
};

export default function MemberDashboard({ user, member, registrations }: Props) {
  const isExpired = member?.expiresAt ? new Date(member.expiresAt) < new Date() : true;
  const isActiveMember = member?.isActive && !isExpired;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/3v3.jpg" alt="Logo" className="w-10 h-10 rounded-full object-cover" />
            <span className="font-bold text-gray-900 hidden sm:block">中華台北羽球3對3發展協會</span>
          </Link>
          <div className="flex items-center gap-3">
            {user.image && (
              <img src={user.image} alt={user.name ?? ""} className="w-8 h-8 rounded-full" />
            )}
            <span className="text-sm text-gray-600 hidden sm:block">{user.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-gray-500"
            >
              <LogOut className="w-4 h-4 mr-1" />
              登出
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">會員中心</h1>

        {/* 會員卡 */}
        {member ? (
          <div className="mb-8">
            <div
              className={`relative rounded-2xl p-6 text-white overflow-hidden ${
                isActiveMember
                  ? "bg-gradient-to-br from-blue-600 to-indigo-700"
                  : "bg-gradient-to-br from-gray-500 to-gray-700"
              }`}
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-white/70 text-sm">中華台北羽球3對3發展協會</p>
                    <p className="text-white/70 text-xs">CHINESE TAIPEI 3V3 BADMINTON ASSOCIATION</p>
                  </div>
                  <Badge
                    variant={isActiveMember ? "success" : "destructive"}
                    className="text-xs"
                  >
                    {isActiveMember ? "有效會員" : isExpired ? "已過期" : member.paymentStatus === "CONFIRMING" ? "審核中" : "未繳費"}
                  </Badge>
                </div>

                <div className="mb-4">
                  <p className="text-3xl font-bold">{member.realName}</p>
                  <p className="text-white/80 text-sm mt-1">會員編號：{member.memberNumber}</p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-white/60">會員到期日</p>
                    <p className="font-semibold">{formatDate(member.expiresAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/60">身分證後4碼</p>
                    <p className="font-semibold">****{member.nationalId.slice(-4)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 付款提示 */}
            {member.paymentStatus === "PENDING" && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">請完成入會費付款</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    請將 NT$ 500 匯款至協會帳號，完成後請至
                    <Link href="/member/payment" className="underline font-medium">填寫匯款末5碼</Link>
                    等待審核。
                  </p>
                </div>
              </div>
            )}

            {member.paymentStatus === "CONFIRMING" && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
                <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">付款審核中</p>
                  <p className="text-sm text-blue-700 mt-1">您的匯款資料已提交，管理員審核後將自動啟用會員資格。</p>
                </div>
              </div>
            )}

            {isExpired && member.isActive && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="flex items-center justify-between w-full">
                  <div>
                    <p className="font-medium text-orange-800">會員資格已過期</p>
                    <p className="text-sm text-orange-700 mt-1">請續繳年費 NT$ 500 以繼續享有會員權益。</p>
                  </div>
                  <Link href="/member/renew">
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                      立即續會
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 尚未申請會員 */
          <Card className="mb-8 border-dashed border-2">
            <CardContent className="py-12 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">尚未申請協會會員</h2>
              <p className="text-gray-500 mb-6">
                繳交年費 NT$ 500 成為協會會員，享有報名優惠及更多會員專屬服務。
              </p>
              <Link href="/member/join">
                <Button size="lg" className="gap-2">
                  <Plus className="w-4 h-4" />
                  立即申請入會
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="registrations">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="registrations">
              <Trophy className="w-4 h-4 mr-1" />
              我的報名
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="w-4 h-4 mr-1" />
              付款紀錄
            </TabsTrigger>
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-1" />
              個人資料
            </TabsTrigger>
          </TabsList>

          {/* 報名紀錄 */}
          <TabsContent value="registrations" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">我的報名紀錄</h2>
              <Link href="/events">
                <Button size="sm" variant="outline" className="gap-1">
                  <Plus className="w-4 h-4" />
                  報名新賽事
                </Button>
              </Link>
            </div>

            {registrations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>尚無報名紀錄</p>
                  <Link href="/events" className="mt-3 inline-block">
                    <Button variant="link">查看開放賽事</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {registrations.map((reg) => {
                  const status = statusMap[reg.paymentStatus as keyof typeof statusMap];
                  return (
                    <Card key={reg.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-900">{reg.event.name}</h3>
                              <Badge variant={status.color}>{status.label}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {reg.group.name} ｜ {reg.teamName} ｜{" "}
                              {{ MALE_TRIPLE: "男3P", FEMALE_TRIPLE: "女3P", MIXED: "混3P" }[reg.genderType]}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(reg.event.date)} ｜ {reg.event.location}
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                              選手：{reg.players.map((p) => p.name).join("、")}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-lg text-gray-900">
                              {formatCurrency(reg.totalAmount)}
                            </p>
                            {reg.paymentStatus === "PENDING" && (
                              <Link href={`/member/payment?id=${reg.id}`}>
                                <Button size="sm" className="mt-2">
                                  填寫匯款資料
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* 付款紀錄 */}
          <TabsContent value="payments" className="mt-4">
            <h2 className="text-lg font-semibold mb-4">付款紀錄</h2>
            {!member || member.payments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>尚無付款紀錄</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {member.payments.map((payment) => {
                  const status = statusMap[payment.status as keyof typeof statusMap];
                  return (
                    <Card key={payment.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{paymentTypeMap[payment.type] ?? payment.type}</p>
                          <p className="text-xs text-gray-400">{formatDate(payment.createdAt)}</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <Badge variant={status.color}>{status.label}</Badge>
                          <p className="font-bold">{formatCurrency(payment.amount)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* 個人資料 */}
          <TabsContent value="profile" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>個人資料</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  {user.image && (
                    <img src={user.image} alt="" className="w-16 h-16 rounded-full" />
                  )}
                  <div>
                    <p className="font-semibold text-lg">{user.name}</p>
                    <p className="text-gray-500 text-sm">{user.email}</p>
                  </div>
                </div>
                {member && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-gray-400">真實姓名</p>
                      <p className="font-medium">{member.realName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">會員編號</p>
                      <p className="font-medium">{member.memberNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">身分證字號</p>
                      <p className="font-medium">
                        {member.nationalId.slice(0, 3)}****{member.nationalId.slice(-2)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
