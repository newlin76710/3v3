"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitMemberPayment } from "@/app/actions/member";
import { submitRegistrationPayment } from "@/app/actions/registration";
import DateSelectPicker from "@/components/ui/date-select";
import { Loader2 } from "lucide-react";

interface Props {
  type: string;
  registrationId?: string;
  memberId?: string;
}

export default function PaymentForm({ type, registrationId, memberId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [lastFive, setLastFive] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [errors, setErrors] = useState<{ lastFive?: string; date?: string }>({});

  const validate = () => {
    const e: { lastFive?: string; date?: string } = {};
    if (!/^\d{5}$/.test(lastFive)) e.lastFive = "請輸入5位數字";
    if (!transferDate) e.date = "請選擇匯款日期";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      let result;
      if (type === "registration" && registrationId) {
        result = await submitRegistrationPayment({
          registrationId,
          transferLastFive: lastFive,
          transferDate,
        });
      } else {
        result = await submitMemberPayment({
          transferLastFive: lastFive,
          transferDate,
        });
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("匯款資料已提交，等待管理員確認！");
        router.push("/member");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label>匯款日期 *</Label>
        <DateSelectPicker
          native
          value={transferDate}
          onChange={(v) => setTransferDate(v)}
          minYear={new Date().getFullYear() - 2}
          maxYear={new Date().getFullYear()}
          className="mt-1"
        />
        {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
      </div>

      <div>
        <Label htmlFor="lastFive">匯款末5碼 *</Label>
        <Input
          id="lastFive"
          type="text"
          inputMode="numeric"
          maxLength={5}
          value={lastFive}
          onChange={(e) => setLastFive(e.target.value.replace(/\D/g, ""))}
          placeholder="請輸入ATM匯款末5碼"
          className="mt-1 text-lg tracking-widest"
        />
        {errors.lastFive && <p className="text-red-500 text-xs mt-1">{errors.lastFive}</p>}
        <p className="text-xs text-gray-400 mt-1">
          即ATM轉帳收據上「轉出帳號後五碼」或「交易序號後五碼」
        </p>
      </div>

      <Button type="submit" disabled={loading} className="w-full h-12 text-base">
        {loading ? <Loader2 className="animate-spin mr-2" /> : null}
        {loading ? "提交中..." : "確認提交"}
      </Button>
    </form>
  );
}
