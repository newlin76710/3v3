"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { confirmMemberPayment, confirmRegistrationPayment, cancelRegistration } from "@/app/actions/admin";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CheckCircle, XCircle, User, Trophy } from "lucide-react";

type PendingMember = {
  id: string;
  memberNumber: string;
  realName: string;
  nationalId: string;
  phone: string;
  transferLastFive: string | null;
  transferDate: Date | null;
  createdAt: Date;
  user: { email: string | null; name: string | null } | null;
  payments: Array<{ amount: number; notes: string | null }>;
};

type PendingRegistration = {
  id: string;
  teamName: string;
  totalAmount: number;
  genderType: string;
  transferLastFive: string | null;
  transferDate: Date | null;
  createdAt: Date;
  createdBy: { name: string | null; email: string | null };
  event: { name: string };
  group: { name: string };
  players: Array<{ name: string; nationalId: string }>;
};

interface Props {
  pendingMembers: PendingMember[];
  pendingRegistrations: PendingRegistration[];
}

const genderLabel: Record<string, string> = {
  MALE_TRIPLE: "男3P",
  FEMALE_TRIPLE: "女3P",
  MIXED: "混3P",
};

export default function PaymentsManager({ pendingMembers, pendingRegistrations }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleConfirmMember = async (id: string, name: string) => {
    if (!confirm(`確認 ${name} 的入會付款？\n將自動啟用一年會員資格`)) return;
    setLoading(id);
    try {
      const result = await confirmMemberPayment(id);
      if (result.error) toast.error(result.error);
      else { toast.success("已確認！會員資格已啟用"); router.refresh(); }
    } finally { setLoading(null); }
  };

  const handleConfirmRegistration = async (id: string, name: string) => {
    if (!confirm(`確認 ${name} 的報名付款？`)) return;
    setLoading(id);
    try {
      const result = await confirmRegistrationPayment(id);
      if (result.error) toast.error(result.error);
      else { toast.success("報名付款已確認！"); router.refresh(); }
    } finally { setLoading(null); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("確定要取消此報名？")) return;
    setLoading(id);
    try {
      const result = await cancelRegistration(id);
      if (result.error) toast.error(result.error);
      else { toast.success("已取消報名"); router.refresh(); }
    } finally { setLoading(null); }
  };

  return (
    <Tabs defaultValue="members">
      <TabsList className="mb-6">
        <TabsTrigger value="members" className="gap-2">
          <User className="w-4 h-4" />
          入會費（{pendingMembers.length}）
        </TabsTrigger>
        <TabsTrigger value="registrations" className="gap-2">
          <Trophy className="w-4 h-4" />
          報名費（{pendingRegistrations.length}）
        </TabsTrigger>
      </TabsList>

      {/* 入會費確認 */}
      <TabsContent value="members">
        {pendingMembers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
            <p>目前沒有待確認的入會費</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingMembers.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{member.realName}</h3>
                        <Badge variant="warning">待確認</Badge>
                        <span className="text-sm font-bold text-blue-600">
                          {formatCurrency(member.payments[0]?.amount ?? 500)}
                        </span>
                        {member.payments[0]?.notes && (
                          <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
                            {member.payments[0].notes}
                          </Badge>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                        <span>會員編號：{member.memberNumber}</span>
                        <span>身分證：{member.nationalId}</span>
                        <span>手機：{member.phone}</span>
                        <span>Email：{member.user?.email}</span>
                        <span>匯款末5碼：<strong className="text-gray-900 font-mono">{member.transferLastFive ?? "未填"}</strong></span>
                        <span>匯款日期：{member.transferDate ? formatDate(member.transferDate) : "未填"}</span>
                        <span className="text-gray-400">申請時間：{formatDate(member.createdAt)}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleConfirmMember(member.id, member.realName)}
                      disabled={loading === member.id}
                      className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {loading === member.id ? "確認中..." : "確認付款"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* 報名費確認 */}
      <TabsContent value="registrations">
        {pendingRegistrations.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
            <p>目前沒有待確認的報名費</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRegistrations.map((reg) => (
              <Card key={reg.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{reg.teamName}</h3>
                        <Badge variant="warning">待確認</Badge>
                        <Badge variant="outline">{reg.event.name}</Badge>
                        <Badge variant="secondary">{reg.group.name} {genderLabel[reg.genderType]}</Badge>
                        <span className="text-sm font-bold text-blue-600">{formatCurrency(reg.totalAmount)}</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600 mb-2">
                        <span>報名人：{reg.createdBy.name}（{reg.createdBy.email}）</span>
                        <span>匯款末5碼：<strong className="text-gray-900 font-mono">{reg.transferLastFive ?? "未填"}</strong></span>
                        <span>匯款日期：{reg.transferDate ? formatDate(reg.transferDate) : "未填"}</span>
                        <span className="text-gray-400">報名時間：{formatDate(reg.createdAt)}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        選手：{reg.players.map((p) => p.name).join("、")}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        onClick={() => handleConfirmRegistration(reg.id, reg.teamName)}
                        disabled={!!loading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        確認
                      </Button>
                      <Button
                        onClick={() => handleCancel(reg.id)}
                        disabled={!!loading}
                        variant="destructive"
                        size="sm"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        取消
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
