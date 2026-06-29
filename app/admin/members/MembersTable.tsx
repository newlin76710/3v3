"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { confirmMemberPayment, cancelMembership, extendMembership, adminDeleteMember } from "@/app/actions/admin";
import { formatDate } from "@/lib/utils";
import { Search, CheckCircle, CalendarPlus, Ban, Pencil, Trash2, PlusCircle } from "lucide-react";

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
  user: { email: string | null; name: string | null } | null;
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
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [extending, setExtending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (memberId: string, memberName: string) => {
    if (!confirm(`確定永久刪除「${memberName}」的會員資料？此操作無法復原。`)) return;
    setDeleting(memberId);
    try {
      const result = await adminDeleteMember(memberId);
      if (result.error) toast.error(result.error);
      else { toast.success("已刪除"); router.refresh(); }
    } finally {
      setDeleting(null);
    }
  };

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

  const handleCancel = async (memberId: string, memberName: string) => {
    if (!confirm(`確認取消 ${memberName} 的會籍？此操作將停用其會員資格。`)) return;
    setCancelling(memberId);
    try {
      const result = await cancelMembership(memberId);
      if (result.error) toast.error(result.error);
      else {
        toast.success("會籍已取消");
        router.refresh();
      }
    } finally {
      setCancelling(null);
    }
  };

  const handleExtend = async (memberId: string, memberName: string) => {
    if (!confirm(`確認延長 ${memberName} 的會籍一年？`)) return;
    setExtending(memberId);
    try {
      const result = await extendMembership(memberId);
      if (result.error) toast.error(result.error);
      else {
        toast.success("會籍已延長一年！");
        router.refresh();
      }
    } finally {
      setExtending(null);
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Search */}
      <div className="p-4 border-b flex gap-3 flex-wrap items-center">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
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
        <Button size="sm" onClick={() => router.push("/admin/members/new")} className="gap-2 shrink-0">
          <PlusCircle className="w-4 h-4" />
          新增會員
        </Button>
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
                        <p className="text-xs text-gray-400">{member.user?.email}</p>
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
                      <div className="flex flex-col gap-1.5">
                        {member.paymentStatus === "CONFIRMING" && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirm(member.id, member.realName)}
                            disabled={confirming === member.id}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            {confirming === member.id ? "處理中..." : "確認付款"}
                          </Button>
                        )}
                        {member.paymentStatus === "PAID" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleExtend(member.id, member.realName)}
                              disabled={extending === member.id}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                              {extending === member.id ? "處理中..." : "延長一年"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancel(member.id, member.realName)}
                              disabled={cancelling === member.id}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <Ban className="w-3.5 h-3.5 mr-1" />
                              {cancelling === member.id ? "處理中..." : "取消會籍"}
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/admin/members/${member.id}/edit`)}
                          className="text-gray-700 border-gray-200 hover:bg-gray-50"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          編輯
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(member.id, member.realName)}
                          disabled={deleting === member.id}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          {deleting === member.id ? "處理中..." : "刪除"}
                        </Button>
                      </div>
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
