"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminCreateMember, adminUpdateMember } from "@/app/actions/admin";
import DateSelectPicker from "@/components/ui/date-select";
import { Loader2 } from "lucide-react";
import { MEMBERSHIP_PROMO_EXPIRY } from "@/lib/utils";

const NATIONAL_ID_RE = /^[A-Z][12]\d{8}$/;
const DEFAULT_EXPIRY = MEMBERSHIP_PROMO_EXPIRY.toISOString().split("T")[0];

interface CreateProps {
  mode: "create";
}

interface EditProps {
  mode: "edit";
  memberId: string;
  defaultRealName: string;
  defaultNationalId: string;
  defaultBirthday: string;
  defaultGender: "MALE" | "FEMALE";
  defaultPhone: string;
  defaultEmail: string;
  defaultExpiresAt: string;
  defaultPaymentStatus: string;
  hasLinkedUser: boolean;
}

export default function AdminMemberForm(props: CreateProps | EditProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [realName, setRealName] = useState(props.mode === "edit" ? props.defaultRealName : "");
  const [nationalId, setNationalId] = useState(props.mode === "edit" ? props.defaultNationalId : "");
  const [birthday, setBirthday] = useState(props.mode === "edit" ? props.defaultBirthday : "");
  const [gender, setGender] = useState(props.mode === "edit" ? props.defaultGender : "");
  const [phone, setPhone] = useState(props.mode === "edit" ? props.defaultPhone : "");
  const [email, setEmail] = useState(props.mode === "edit" ? props.defaultEmail : "");
  const [expiresAt, setExpiresAt] = useState(
    props.mode === "edit" ? props.defaultExpiresAt : DEFAULT_EXPIRY
  );
  const [paymentStatus, setPaymentStatus] = useState(
    props.mode === "edit" ? props.defaultPaymentStatus : "PAID"
  );
  const [notes, setNotes] = useState("");

  const validate = (): string | null => {
    if (!realName || realName.length < 2) return "姓名至少2個字";
    if (props.mode === "create" && !NATIONAL_ID_RE.test(nationalId)) return "請輸入有效的身分證字號";
    if (!birthday) return "請選擇生日";
    if (!gender) return "請選擇性別";
    if (!phone) return "請填寫手機號碼";
    if (!expiresAt) return "請選擇會籍到期日";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setLoading(true);
    try {
      let result;
      if (props.mode === "edit") {
        result = await adminUpdateMember(props.memberId, {
          realName,
          phone,
          email,
          expiresAt,
          paymentStatus: paymentStatus as "PENDING" | "PAID" | "CANCELLED",
        });
      } else {
        result = await adminCreateMember({
          realName,
          nationalId,
          birthday,
          gender: gender as "MALE" | "FEMALE",
          phone,
          email,
          expiresAt,
          paymentStatus: paymentStatus as "PENDING" | "PAID",
          notes,
        });
      }

      if (result.error) toast.error(result.error);
      else {
        toast.success(props.mode === "edit" ? "會員資料已更新" : "會員已新增");
        router.push("/admin/members");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.mode === "edit" ? "編輯會員資料" : "新增會員"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>姓名 *</Label>
            <Input
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              placeholder="真實姓名"
              className="mt-1"
            />
          </div>

          <div>
            <Label>身分證字號 *</Label>
            <Input
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value.toUpperCase())}
              placeholder="A123456789"
              maxLength={10}
              disabled={props.mode === "edit"}
              className={`mt-1 ${props.mode === "edit" ? "bg-gray-50 font-mono" : ""}`}
            />
            {props.mode === "edit" && (
              <p className="text-xs text-gray-400 mt-1">身分證字號不可修改</p>
            )}
          </div>

          <div>
            <Label>出生日期 *</Label>
            {props.mode === "edit" ? (
              <Input
                value={birthday}
                disabled
                className="mt-1 bg-gray-50"
              />
            ) : (
              <DateSelectPicker
                value={birthday}
                onChange={setBirthday}
                maxYear={new Date().getFullYear()}
                className="mt-1"
              />
            )}
            {props.mode === "edit" && (
              <p className="text-xs text-gray-400 mt-1">生日不可修改</p>
            )}
          </div>

          <div>
            <Label>性別 *</Label>
            <Select
              value={gender}
              onValueChange={setGender}
              disabled={props.mode === "edit"}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="請選擇" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">男</SelectItem>
                <SelectItem value="FEMALE">女</SelectItem>
              </SelectContent>
            </Select>
            {props.mode === "edit" && (
              <p className="text-xs text-gray-400 mt-1">性別不可修改</p>
            )}
          </div>

          <div>
            <Label>手機號碼 *</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xxxxxxxx"
              className="mt-1"
            />
          </div>

          <div>
            <Label>電子信箱（選填）</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              type="email"
              className="mt-1"
            />
          </div>

          <div>
            <Label>會籍到期日 *</Label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>付款狀態 *</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PAID">已付款（立即啟用）</SelectItem>
                <SelectItem value="PENDING">未付款</SelectItem>
                {props.mode === "edit" && (
                  <SelectItem value="CANCELLED">已取消</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {props.mode === "create" && (
            <div className="sm:col-span-2">
              <Label>備註（選填）</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="後台備註，例如：現場繳費、轉帳末5碼等"
                rows={2}
                className="mt-1"
              />
            </div>
          )}
        </div>

        {props.mode === "edit" && (props as EditProps).hasLinkedUser && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            此會員已綁定網站帳號。身分證、生日、性別由帳號控管，無法在此修改。
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => router.back()} className="flex-1">取消</Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : null}
            {loading ? "送出中..." : props.mode === "edit" ? "儲存變更" : "新增會員"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
