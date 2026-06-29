"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { confirmRegistrationPayment, cancelRegistration, adminDeleteRegistration, getRegistrationsForExport } from "@/app/actions/admin";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Download, CheckCircle, XCircle, Pencil, Trash2, PlusCircle } from "lucide-react";
import * as XLSX from "xlsx";

type Registration = {
  id: string;
  teamName: string;
  genderType: string;
  paymentStatus: string;
  totalAmount: number;
  transferLastFive: string | null;
  transferDate: Date | null;
  createdAt: Date;
  createdBy: { name: string | null; email: string | null };
  event: { name: string };
  group: { name: string };
  players: Array<{ name: string; nationalId: string; memberStatus: string }>;
};

const genderLabel: Record<string, string> = {
  MALE_TRIPLE: "男3P",
  FEMALE_TRIPLE: "女3P",
  MIXED: "混3P",
};

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

interface Props {
  registrations: Registration[];
  events: Array<{ id: string; name: string }>;
  selectedEventId?: string;
}

export default function RegistrationsTable({ registrations, events, selectedEventId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleConfirm = async (id: string, name: string) => {
    if (!confirm(`確認 ${name} 的報名付款？`)) return;
    setLoading(id);
    const result = await confirmRegistrationPayment(id);
    if (result.error) toast.error(result.error);
    else { toast.success("已確認！"); router.refresh(); }
    setLoading(null);
  };

  const handleCancel = async (id: string) => {
    if (!confirm("確定取消此報名？")) return;
    setLoading(id);
    const result = await cancelRegistration(id);
    if (result.error) toast.error(result.error);
    else { toast.success("已取消"); router.refresh(); }
    setLoading(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`確定永久刪除「${name}」的報名資料？此操作無法復原。`)) return;
    setDeleting(id);
    const result = await adminDeleteRegistration(id);
    if (result.error) toast.error(result.error);
    else { toast.success("已刪除"); router.refresh(); }
    setDeleting(null);
  };

  const handleExport = async () => {
    if (!selectedEventId) { toast.error("請先選擇賽事"); return; }
    try {
      const data = await getRegistrationsForExport(selectedEventId);
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "報名名單");
      XLSX.writeFile(wb, `報名名單_${new Date().toLocaleDateString("zh-TW")}.xlsx`);
      toast.success("匯出成功！");
    } catch {
      toast.error("匯出失敗");
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b flex items-center gap-3 flex-wrap">
        <Select
          value={selectedEventId ?? ""}
          onValueChange={(v) => router.push(v ? `/admin/registrations?event=${v}` : "/admin/registrations")}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="選擇賽事篩選" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部賽事</SelectItem>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          匯出 Excel
        </Button>

        <Button size="sm" onClick={() => router.push("/admin/registrations/new")} className="gap-2 ml-auto">
          <PlusCircle className="w-4 h-4" />
          新增報名
        </Button>

        <span className="text-sm text-gray-500">共 {registrations.length} 筆</span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>賽事</TableHead>
              <TableHead>組別</TableHead>
              <TableHead>隊名</TableHead>
              <TableHead>性別組</TableHead>
              <TableHead>選手</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>末5碼</TableHead>
              <TableHead>報名時間</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-gray-400">無資料</TableCell>
              </TableRow>
            ) : (
              registrations.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell className="text-xs max-w-32 truncate">{reg.event.name}</TableCell>
                  <TableCell><Badge variant="outline">{reg.group.name}</Badge></TableCell>
                  <TableCell className="font-medium">{reg.teamName}</TableCell>
                  <TableCell>{genderLabel[reg.genderType]}</TableCell>
                  <TableCell className="text-xs">
                    {reg.players.map((p) => p.name).join("、")}
                  </TableCell>
                  <TableCell className="font-medium text-blue-600">
                    {formatCurrency(reg.totalAmount)}
                  </TableCell>
                  <TableCell>{statusBadge(reg.paymentStatus)}</TableCell>
                  <TableCell className="font-mono">{reg.transferLastFive ?? "-"}</TableCell>
                  <TableCell className="text-xs">{formatDate(reg.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {reg.paymentStatus === "CONFIRMING" && (
                        <Button
                          size="sm"
                          onClick={() => handleConfirm(reg.id, reg.teamName)}
                          disabled={loading === reg.id}
                          className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
                          title="確認付款"
                        >
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/registrations/${reg.id}/edit`)}
                        className="h-7 px-2 text-xs"
                        title="編輯"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      {reg.paymentStatus !== "CANCELLED" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancel(reg.id)}
                          disabled={loading === reg.id}
                          className="h-7 px-2 text-xs bg-orange-500 hover:bg-orange-600"
                          title="取消報名"
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(reg.id, reg.teamName)}
                        disabled={deleting === reg.id}
                        className="h-7 px-2 text-xs"
                        title="永久刪除"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
