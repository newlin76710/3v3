"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { confirmMemberPayment } from "@/app/actions/admin";
import { formatDate } from "@/lib/utils";
import { Search, CheckCircle, Clock, XCircle } from "lucide-react";

type Member = {
  id: string;
  memberNumber: string;
  realName: string;
  nationalId: string;
  phone: string;
  gender: string;
  isActive: boolean;
  expiresAt: Date;
  paymentStatus: string;
  createdAt: Date;
  user: { email: string | null; name: string | null };
};

interface Props {
  members: Member[];
  pages: number;
  currentPage: number;
}

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "destructive" }> = {
    PAID: { label: "已付款", variant: "success" },
    CONFIRMING: { label: "待確認", variant: "warning" },
    PENDING: { label: "未付款", variant: "secondary" },
    CANCELLED: { label: "取消", variant: "destructive" },
  };
  const s = map[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
};

export default function MembersTable({ members, pages, currentPage }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/admin/members?search=${encodeURIComponent(search)}`);
  };

  const handleConfirm = async (memberId: string, memberName: string) => {
    if (!confirm(`確認啟用 ${memberName} 的會員資格？`)) return;
    setConfirming(memberId);
    try {
      const result = await confirmMemberPayment(memberId);
      if (result.error) toast.error(result.error);
      else {
        toast.success("會員已啟用！");
        router.refresh();
      }
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Search */}
      <div className="p-4 border-b">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋姓名、身分證、會員編號..."
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">搜尋</Button>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>會員編號</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>身分證</TableHead>
              <TableHead>電話</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>到期日</TableHead>
              <TableHead>申請日期</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                  無資料
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => {
                const isExpired = new Date(member.expiresAt) < new Date();
                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono text-sm">{member.memberNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.realName}</p>
                        <p className="text-xs text-gray-400">{member.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{member.nationalId}</TableCell>
                    <TableCell className="text-sm">{member.phone}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {statusBadge(member.paymentStatus)}
                        {member.isActive && !isExpired && (
                          <Badge variant="success" className="text-xs">有效</Badge>
                        )}
                        {isExpired && member.isActive && (
                          <Badge variant="destructive" className="text-xs">已過期</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(member.expiresAt)}</TableCell>
                    <TableCell className="text-sm">{formatDate(member.createdAt)}</TableCell>
                    <TableCell>
                      {member.paymentStatus === "CONFIRMING" && (
                        <Button
                          size="sm"
                          onClick={() => handleConfirm(member.id, member.realName)}
                          disabled={confirming === member.id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {confirming === member.id ? "處理中..." : "確認付款"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="p-4 border-t flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={p === currentPage ? "default" : "outline"}
              onClick={() => router.push(`/admin/members?page=${p}`)}
            >
              {p}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
