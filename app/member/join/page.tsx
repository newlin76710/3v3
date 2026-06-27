import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMemberData } from "@/app/actions/member";
import { BANK_INFO } from "@/lib/utils";
import JoinMemberForm from "./JoinMemberForm";

export const metadata = { title: "申請入會 | 中華台北羽球3對3發展協會" };

export default async function JoinPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/member/join");

  const existing = await getMemberData();
  if (existing) redirect("/member");

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <a href="/member" className="text-blue-600 hover:underline text-sm">← 返回會員中心</a>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">申請協會會員</h1>
          <p className="text-gray-500 mb-6">
            年費 NT$ 500，有效期限一年。完成填寫後請匯款，並填寫匯款末5碼等待審核。
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">匯款資訊</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>銀行：{BANK_INFO.bankName}（{BANK_INFO.bankCode}）</p>
              <p>帳號：{BANK_INFO.accountNumber}</p>
              <p>戶名：{BANK_INFO.accountName}</p>
              <p className="font-semibold">金額：NT$ 500</p>
            </div>
          </div>

          <JoinMemberForm />
        </div>
      </div>
    </div>
  );
}
