import { getDashboardStats } from "@/app/actions/admin";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, CreditCard, Clock, TrendingUp, CheckCircle } from "lucide-react";

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  const statCards = [
    {
      title: "總會員數",
      value: stats.totalMembers,
      sub: `有效會員 ${stats.activeMembers} 人`,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "今日新增報名",
      value: stats.todayRegistrations,
      sub: "今日報名隊數",
      icon: Trophy,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "已完成付款",
      value: stats.paidRegistrations,
      sub: "報名確認完成",
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "待確認付款",
      value: stats.pendingPayments,
      sub: "等待人工確認",
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      title: "總收入",
      value: formatCurrency(stats.totalRevenue),
      sub: "已確認付款金額",
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{card.title}</p>
                    <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                    <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                  </div>
                  <div className={`${card.bg} p-2 rounded-lg`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 快速操作 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">待確認事項</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.pendingPayments > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-700">有 {stats.pendingPayments} 筆付款等待確認</span>
                  </div>
                  <a
                    href="/admin/payments"
                    className="text-xs text-yellow-600 hover:underline font-medium"
                  >
                    前往確認 →
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">目前沒有待處理事項</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">快速操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/admin/events/new", label: "新增賽事", icon: Trophy },
                { href: "/admin/members", label: "會員列表", icon: Users },
                { href: "/admin/payments", label: "確認付款", icon: CreditCard },
                { href: "/admin/registrations", label: "報名列表", icon: CheckCircle },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700"
                  >
                    <Icon className="w-4 h-4 text-gray-500" />
                    {item.label}
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
