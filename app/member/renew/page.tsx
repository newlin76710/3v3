import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMemberData } from "@/app/actions/member";
import PaymentForm from "@/app/member/payment/PaymentForm";

export const metadata = { title: "會員續費 | 中華台北羽球3對3發展協會" };

export default async function RenewPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const memberData = await getMemberData();
  if (!memberData) redirect("/member/join");

  const isExpired = new Date(memberData.expiresAt) < new Date();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <a href="/member" className="text-blue-600 hover:underline text-sm">← 返回會員中心</a>

        <div className="bg-white rounded-2xl shadow-sm border p-8 mt-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isExpired ? "會員續費" : "提前續費"}
          </h1>
          <p className="text-gray-500 mb-2">
            {isExpired
              ? "您的會員資格已過期，請繳費續會以繼續享有會員權益。"
              : "您可以提前續費，新的有效期將從目前到期日起算一年。"}
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">匯款資訊</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>銀行：臺灣銀行（004）</p>
              <p>帳號：035-001-000000-1</p>
              <p>戶名：中華台北羽球3對3發展協會</p>
              <p className="font-semibold">金額：NT$ 500（年費）</p>
            </div>
          </div>

          <PaymentForm
            type="renewal"
            memberId={memberData.id}
          />
        </div>
      </div>
    </div>
  );
}
