import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMemberData } from "@/app/actions/member";
import { prisma } from "@/lib/prisma";
import { BANK_INFO, formatCurrency } from "@/lib/utils";
import PaymentForm from "./PaymentForm";

export const metadata = { title: "填寫匯款資料 | 中華台北羽球3對3發展協會" };

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; id?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const memberData = await getMemberData();

  let amount = 500;
  let registrationLabel: string | null = null;

  if (params.type === "registration" && params.id) {
    const reg = await prisma.registration.findUnique({
      where: { id: params.id },
      select: { totalAmount: true, teamName: true, event: { select: { name: true } } },
    });
    if (reg) {
      amount = reg.totalAmount;
      registrationLabel = `${reg.event.name}｜${reg.teamName}`;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <a href="/member" className="text-blue-600 hover:underline text-sm">← 返回會員中心</a>

        <div className="bg-white rounded-2xl shadow-sm border p-8 mt-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">填寫匯款資料</h1>
          <p className="text-gray-500 mb-6">請在匯款後填寫以下資料，管理員確認後將完成付款。</p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
            <h3 className="font-semibold text-gray-700 mb-3">匯款資訊</h3>
            <div className="space-y-1 text-gray-600">
              <div className="flex justify-between">
                <span>銀行</span>
                <span className="font-medium">{BANK_INFO.bankName}（{BANK_INFO.bankCode}）</span>
              </div>
              <div className="flex justify-between">
                <span>帳號</span>
                <span className="font-medium">{BANK_INFO.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>戶名</span>
                <span className="font-medium">{BANK_INFO.accountName}</span>
              </div>
              {registrationLabel && (
                <div className="flex justify-between">
                  <span>項目</span>
                  <span className="font-medium text-right">{registrationLabel}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-semibold">應繳總金額</span>
                <span className="font-bold text-blue-600 text-base">{formatCurrency(amount)}</span>
              </div>
            </div>
          </div>

          <PaymentForm
            type={params.type ?? "membership"}
            registrationId={params.id}
            memberId={memberData?.id}
          />
        </div>
      </div>
    </div>
  );
}
