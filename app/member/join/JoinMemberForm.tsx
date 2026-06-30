"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { registerMember } from "@/app/actions/member";
import DateSelectPicker from "@/components/ui/date-select";
import { Loader2 } from "lucide-react";

const schema = z.object({
  realName: z.string().min(2, "姓名至少2個字"),
  nationalId: z.string().regex(/^[A-Z][12]\d{8}$/, "請輸入有效的身分證字號（如：A123456789）"),
  birthday: z.string().refine((d) => !isNaN(Date.parse(d)), "請選擇生日"),
  gender: z.enum(["MALE", "FEMALE"]),
  phone: z.string().regex(/^09\d{8}$/, "請輸入有效的手機號碼（如：0912345678）"),
  address: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<FormData>;
}

export default function JoinMemberForm({ defaultValues }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues });

  const birthday = watch("birthday");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const result = await registerMember(data);
      if (result.error) {
        toast.error(result.error);
      } else if (result.linked && result.paymentStatus && ["PAID", "CONFIRMING"].includes(result.paymentStatus)) {
        toast.success(`帳號已連結！會員編號：${result.memberNumber}`);
        router.push("/member");
      } else {
        toast.success(`申請成功！會員編號：${result.memberNumber}`);
        router.push("/member/payment?type=membership");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="realName">真實姓名 *</Label>
          <Input id="realName" {...register("realName")} placeholder="請輸入真實姓名" className="mt-1" />
          {errors.realName && <p className="text-red-500 text-xs mt-1">{errors.realName.message}</p>}
        </div>

        <div>
          <Label htmlFor="gender">性別 *</Label>
          <Select onValueChange={(v) => setValue("gender", v as "MALE" | "FEMALE")}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="請選擇性別" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">男</SelectItem>
              <SelectItem value="FEMALE">女</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="nationalId">身分證字號 *</Label>
        <Input
          id="nationalId"
          {...register("nationalId")}
          placeholder="例：A123456789"
          className="mt-1 uppercase"
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase();
            register("nationalId").onChange(e);
          }}
        />
        {errors.nationalId && <p className="text-red-500 text-xs mt-1">{errors.nationalId.message}</p>}
      </div>

      <div>
        <Label>出生日期 *</Label>
        <DateSelectPicker
          native
          value={birthday ?? ""}
          onChange={(v) => setValue("birthday", v, { shouldValidate: true })}
          maxYear={new Date().getFullYear()}
          className="mt-1"
        />
        {errors.birthday && <p className="text-red-500 text-xs mt-1">{errors.birthday.message}</p>}
      </div>

      <div>
        <Label htmlFor="phone">手機號碼 *</Label>
        <Input id="phone" {...register("phone")} placeholder="例：0912345678" className="mt-1" />
        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
      </div>

      <div>
        <Label htmlFor="address">通訊地址（選填）</Label>
        <Input id="address" {...register("address")} placeholder="請輸入地址" className="mt-1" />
      </div>

      <Button type="submit" disabled={loading} className="w-full h-12 text-base">
        {loading ? <Loader2 className="animate-spin mr-2" /> : null}
        {loading ? "提交中..." : "提交申請並進行匯款"}
      </Button>
    </form>
  );
}
