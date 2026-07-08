"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatCurrency } from "@/lib/utils";
import DateSelectPicker from "@/components/ui/date-select";
import { updateMemberProfile, updateUserInfo } from "@/app/actions/member";
import type { UpdateProfileData } from "@/app/actions/member";
import {
  User, CreditCard, Trophy, LogOut, Plus, AlertCircle, Clock, Settings, Pencil, X, Info,
} from "lucide-react";

type MemberPayment = {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: Date;
  transferDate?: Date | null;
  transferLastFive?: string | null;
};

type Member = {
  id: string;
  memberNumber: string;
  realName: string;
  nationalId: string;
  birthday: Date;
  gender: string;
  phone: string;
  address: string | null;
  email: string | null;
  expiresAt: Date;
  isActive: boolean;
  paymentStatus: string;
  nationalIdChangedAt: Date | null;
  payments: MemberPayment[];
};

type RegistrationPayment = {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: Date;
};

type Registration = {
  id: string;
  teamName: string;
  genderType: string;
  paymentStatus: string;
  totalAmount: number;
  event: { name: string; date: Date; location: string; slug: string };
  group: { name: string };
  players: Array<{ name: string; nationalId: string; memberStatus: string; itemCount: number }>;
  payments: RegistrationPayment[];
};

interface Props {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    phone?: string | null;
    realName?: string | null;
    nationalId?: string | null;
    birthday?: Date | null;
    gender?: string | null;
    address?: string | null;
    nationalIdLockedAt?: Date | null;
  };
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

function toDateStr(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export default function MemberDashboard({ user, member, registrations }: Props) {
  const isExpired = member?.expiresAt ? new Date(member.expiresAt) < new Date() : true;
  const isActiveMember = member?.isActive && !isExpired;
  const isAdmin = user.role === "ADMIN" || user.role === "STAFF";

  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userEditForm, setUserEditForm] = useState({
    name:       user.name       ?? "",
    phone:      user.phone      ?? "",
    realName:   user.realName   ?? "",
    nationalId: user.nationalId ?? "",
    birthday:   toDateStr(user.birthday),
    gender:     (user.gender as "MALE" | "FEMALE") ?? "MALE",
    address:    user.address    ?? "",
    email:      user.email      ?? "",
  });
  const [editForm, setEditForm] = useState<UpdateProfileData>({
    realName: member?.realName ?? "",
    birthday: toDateStr(member?.birthday),
    gender: (member?.gender as "MALE" | "FEMALE") ?? "MALE",
    phone: member?.phone ?? "",
    address: member?.address ?? "",
    email: member?.email ?? "",
    nationalId: member?.nationalId ?? "",
  });

  const handleSaveProfile = async () => {
    setSaving(true);
    const result = await updateMemberProfile(editForm);
    setSaving(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success("資料已更新");
    setEditing(false);
  };

  const handleSaveUserInfo = async () => {
    setSaving(true);
    const result = await updateUserInfo(userEditForm);
    setSaving(false);
    if (result.error) { toast.error(result.error); return; }
    if (result.autoLinked) toast.success("已自動連結現有會籍！");
    else toast.success("資料已更新");
    setEditing(false);
    router.refresh();
  };

  // 若某筆報名裡本人是 NEW_MEMBER 第一項（700含入會費），則不重複顯示 MEMBERSHIP_FEE，
  // 也不應再另外提示繳交 500 入會費（避免重複收費的困惑）
  const coveringRegistration = member
    ? registrations.find(
        (r) =>
          r.paymentStatus !== "CANCELLED" &&
          r.players.some(
            (p) =>
              p.nationalId === member.nationalId &&
              p.memberStatus === "NEW_MEMBER" &&
              p.itemCount === 1
          )
      )
    : undefined;
  const membershipCoveredByRegistration = !!coveringRegistration;

  type AnyPayment = MemberPayment & { eventName?: string; teamName?: string };
  const allPayments: AnyPayment[] = [
    ...(member?.payments ?? []).filter(
      (p) => !(p.type === "MEMBERSHIP_FEE" && membershipCoveredByRegistration)
    ),
    ...registrations.flatMap((r) =>
      r.payments.map((p) => ({ ...p, eventName: r.event.name, teamName: r.teamName }))
    ),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/3v3.jpg" alt="Logo" className="w-10 h-10 rounded-full object-cover" />
            <span className="font-bold text-gray-900 hidden sm:block">中華台北羽球3對3發展協會</span>
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50">
                  <Settings className="w-3.5 h-3.5" />
                  後台管理
                </Button>
              </Link>
            )}
            {user.image && (
              <img src={user.image} alt={user.name ?? ""} className="w-8 h-8 rounded-full" />
            )}
            <span className="text-sm text-gray-600 hidden sm:block">{user.name}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })} className="text-gray-500">
              <LogOut className="w-4 h-4 mr-1" />
              登出
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">會員中心</h1>

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
                  <Badge variant={isActiveMember ? "success" : "destructive"} className="text-xs">
                    {isActiveMember ? "有效會員"
                      : member.paymentStatus === "CANCELLED" ? "已取消"
                      : isExpired ? "已過期"
                      : member.paymentStatus === "CONFIRMING" ? "審核中"
                      : "未繳費"}
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

            {member.paymentStatus === "PENDING" && !membershipCoveredByRegistration && (
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

            {member.paymentStatus === "PENDING" && membershipCoveredByRegistration && coveringRegistration && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">入會費已包含在報名費用中，請勿重複繳費</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    您的入會費已包含在「{coveringRegistration.event.name}」報名費用（{formatCurrency(coveringRegistration.totalAmount)}）中，只需完成該筆報名的匯款即可，無需另外繳交 NT$ 500 入會費。
                    <Link href={`/member/payment?type=registration&id=${coveringRegistration.id}`} className="underline font-medium ml-1">
                      前往繳交報名費
                    </Link>
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

            {member.paymentStatus === "CANCELLED" && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">入會申請已取消</p>
                  <p className="text-sm text-red-700 mt-1">
                    您的入會申請因報名取消而撤銷。如需重新申請，請前往
                    <Link href="/member/join" className="underline font-medium">重新申請入會</Link>。
                  </p>
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
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">立即續會</Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card className="mb-8 border-dashed border-2">
            <CardContent className="py-12 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">尚未連結協會會員資料</h2>
              <p className="text-gray-500 mb-6">繳交年費 NT$ 500 成為協會會員，享有報名優惠及更多會員專屬服務。</p>
              <Link href="/member/join">
                <Button size="lg" className="gap-2">
                  <Plus className="w-4 h-4" />
                  申請入會 / 連結現有會籍
                </Button>
              </Link>
              <p className="text-xs text-gray-400 mt-4">
                曾透過賽事報名加入的會員，請點上方按鈕並填寫身分證字號即可連結帳號
              </p>
            </CardContent>
          </Card>
        )}

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
                    <Card key={reg.id} className={reg.paymentStatus === "CANCELLED" ? "opacity-60" : ""}>
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
                            <p className="font-bold text-lg text-gray-900">{formatCurrency(reg.totalAmount)}</p>
                            {reg.paymentStatus === "PENDING" && (
                              <div className="flex flex-col gap-1.5 mt-2 items-end">
                                <Link href={`/member/payment?type=registration&id=${reg.id}`}>
                                  <Button size="sm">填寫匯款資料</Button>
                                </Link>
                                <Link href={`/member/registrations/${reg.id}/edit`}>
                                  <Button size="sm" variant="outline" className="gap-1">
                                    <Pencil className="w-3.5 h-3.5" />
                                    修改資料
                                  </Button>
                                </Link>
                              </div>
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

          <TabsContent value="payments" className="mt-4">
            <h2 className="text-lg font-semibold mb-4">付款紀錄</h2>
            {allPayments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>尚無付款紀錄</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {allPayments.map((payment) => {
                  const status = statusMap[payment.status as keyof typeof statusMap];
                  const p = payment as AnyPayment;
                  return (
                    <Card key={payment.id}>
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{paymentTypeMap[payment.type] ?? payment.type}</p>
                          {p.eventName && (
                            <p className="text-xs text-gray-500 truncate">{p.eventName}｜{p.teamName}</p>
                          )}
                          <p className="text-xs text-gray-400">{formatDate(payment.createdAt)}</p>
                        </div>
                        <div className="text-right flex items-center gap-3 shrink-0">
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

          <TabsContent value="profile" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>個人資料</CardTitle>
                  {!editing && (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1">
                      <Pencil className="w-3.5 h-3.5" />
                      編輯
                    </Button>
                  )}
                  {editing && (
                    <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="gap-1 text-gray-500">
                      <X className="w-3.5 h-3.5" />
                      取消
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  {user.image && <img src={user.image} alt="" className="w-16 h-16 rounded-full" />}
                  <div>
                    <p className="font-semibold text-lg">{user.name}</p>
                    <p className="text-gray-500 text-sm">{user.email}</p>
                  </div>
                </div>

                {!member && !editing && (user.realName || user.nationalId || user.phone || user.birthday) && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    {user.realName && (
                      <div><p className="text-xs text-gray-400">真實姓名</p><p className="font-medium">{user.realName}</p></div>
                    )}
                    {user.nationalId && (
                      <div><p className="text-xs text-gray-400">身分證字號</p><p className="font-medium">{user.nationalId.slice(0, 3)}****{user.nationalId.slice(-2)}</p></div>
                    )}
                    {user.gender && (
                      <div><p className="text-xs text-gray-400">性別</p><p className="font-medium">{user.gender === "MALE" ? "男" : "女"}</p></div>
                    )}
                    {user.birthday && (
                      <div><p className="text-xs text-gray-400">出生日期</p><p className="font-medium">{formatDate(user.birthday)}</p></div>
                    )}
                    {user.phone && (
                      <div><p className="text-xs text-gray-400">手機號碼</p><p className="font-medium">{user.phone}</p></div>
                    )}
                    {user.address && (
                      <div className="col-span-2"><p className="text-xs text-gray-400">地址</p><p className="font-medium">{user.address}</p></div>
                    )}
                  </div>
                )}

                {!member && editing && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>顯示名稱</Label>
                        <Input value={userEditForm.name} onChange={(e) => setUserEditForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" />
                      </div>
                      <div>
                        <Label>真實姓名</Label>
                        <Input value={userEditForm.realName} onChange={(e) => setUserEditForm((f) => ({ ...f, realName: e.target.value }))} className="mt-1" />
                      </div>
                      <div>
                        <Label>性別</Label>
                        <Select value={userEditForm.gender} onValueChange={(v) => setUserEditForm((f) => ({ ...f, gender: v as "MALE" | "FEMALE" }))}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MALE">男</SelectItem>
                            <SelectItem value="FEMALE">女</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>手機號碼</Label>
                        <Input value={userEditForm.phone} onChange={(e) => setUserEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="09xxxxxxxx" className="mt-1" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>出生日期</Label>
                        <DateSelectPicker value={userEditForm.birthday} onChange={(v) => setUserEditForm((f) => ({ ...f, birthday: v }))} maxYear={new Date().getFullYear()} className="mt-1" />
                      </div>
                      <div>
                        <Label>聯絡信箱（選填）</Label>
                        <Input type="email" value={userEditForm.email} onChange={(e) => setUserEditForm((f) => ({ ...f, email: e.target.value }))} placeholder="your@email.com" className="mt-1" />
                      </div>
                      <div>
                        <Label>地址（選填）</Label>
                        <Input value={userEditForm.address} onChange={(e) => setUserEditForm((f) => ({ ...f, address: e.target.value }))} className="mt-1" />
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-gray-50">
                      <Label className="flex items-center gap-1.5 mb-2">
                        身分證字號
                        {user.nationalIdLockedAt
                          ? <Badge variant="secondary" className="text-xs">已鎖定</Badge>
                          : user.nationalId
                            ? <Badge variant="warning" className="text-xs">只能改一次</Badge>
                            : null}
                      </Label>
                      {user.nationalIdLockedAt ? (
                        <div>
                          <p className="text-sm font-medium">{userEditForm.nationalId}</p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Info className="w-3 h-3" />如需修改，請寄信至 {process.env.NEXT_PUBLIC_FROM_EMAIL ?? "info@weekielife.com"} 聯絡官方
                          </p>
                        </div>
                      ) : (
                        <div>
                          <Input
                            value={userEditForm.nationalId}
                            onChange={(e) => setUserEditForm((f) => ({ ...f, nationalId: e.target.value.toUpperCase() }))}
                            placeholder="例：A123456789"
                            maxLength={10}
                            className="mt-1"
                          />
                          {user.nationalId && <p className="text-xs text-amber-600 mt-1">⚠ 修改後無法再次更改</p>}
                          <p className="text-xs text-blue-600 mt-1">若身分證字號與現有會籍相符，將自動連結帳號</p>
                        </div>
                      )}
                    </div>

                    <Button onClick={handleSaveUserInfo} disabled={saving} className="w-full">
                      {saving ? "儲存中..." : "儲存變更"}
                    </Button>
                  </div>
                )}

                {member && !editing && (
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
                      <p className="font-medium">{member.nationalId.slice(0, 3)}****{member.nationalId.slice(-2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">性別</p>
                      <p className="font-medium">{member.gender === "MALE" ? "男" : "女"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">手機號碼</p>
                      <p className="font-medium">{member.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">出生日期</p>
                      <p className="font-medium">{formatDate(member.birthday)}</p>
                    </div>
                    {member.address && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-400">地址</p>
                        <p className="font-medium">{member.address}</p>
                      </div>
                    )}
                    {member.email && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-400">聯絡信箱</p>
                        <p className="font-medium">{member.email}</p>
                      </div>
                    )}
                  </div>
                )}

                {member && editing && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>真實姓名 *</Label>
                        <Input
                          value={editForm.realName}
                          onChange={(e) => setEditForm((f) => ({ ...f, realName: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>性別 *</Label>
                        <Select
                          value={editForm.gender}
                          onValueChange={(v) => setEditForm((f) => ({ ...f, gender: v as "MALE" | "FEMALE" }))}
                        >
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MALE">男</SelectItem>
                            <SelectItem value="FEMALE">女</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <Label>出生日期 *</Label>
                        <DateSelectPicker
                          value={editForm.birthday ?? ""}
                          onChange={(v) => setEditForm((f) => ({ ...f, birthday: v }))}
                          maxYear={new Date().getFullYear()}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>手機號碼 *</Label>
                        <Input
                          value={editForm.phone}
                          onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                          placeholder="09xxxxxxxx"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>聯絡信箱（選填）</Label>
                        <Input
                          value={editForm.email ?? ""}
                          onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                          placeholder="your@email.com"
                          type="email"
                          className="mt-1"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>地址（選填）</Label>
                        <Input
                          value={editForm.address ?? ""}
                          onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-gray-50">
                      <Label className="flex items-center gap-1.5 mb-2">
                        身分證字號
                        {member.nationalIdChangedAt ? (
                          <Badge variant="secondary" className="text-xs">已鎖定</Badge>
                        ) : (
                          <Badge variant="warning" className="text-xs">只能改一次</Badge>
                        )}
                      </Label>
                      {member.nationalIdChangedAt ? (
                        <div>
                          <p className="text-sm font-medium">{editForm.nationalId}</p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            如需修改，請寄信至 {process.env.NEXT_PUBLIC_FROM_EMAIL ?? "info@weekielife.com"} 聯絡官方
                          </p>
                        </div>
                      ) : (
                        <div>
                          <Input
                            value={editForm.nationalId ?? ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, nationalId: e.target.value.toUpperCase() }))}
                            maxLength={10}
                            className="mt-1"
                          />
                          <p className="text-xs text-amber-600 mt-1">⚠ 修改後無法再次更改，請確認正確</p>
                        </div>
                      )}
                    </div>

                    <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                      {saving ? "儲存中..." : "儲存變更"}
                    </Button>
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
