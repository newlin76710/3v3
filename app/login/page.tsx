import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginButtons from "./LoginButtons";

export const metadata = { title: "登入 | 中華台北羽球3對3發展協會" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/member");

  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/images/3v3.jpg"
            alt="協會Logo"
            className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
          />
          <h1 className="text-2xl font-bold text-gray-900">會員登入</h1>
          <p className="text-sm text-gray-500 mt-1">中華台北羽球3對3發展協會</p>
        </div>

        {params.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
            {params.error === "OAuthAccountNotLinked"
              ? "此電子郵件已用其他方式登入，請使用相同的登入方式"
              : "登入失敗，請重試"}
          </div>
        )}

        <LoginButtons callbackUrl={params.callbackUrl ?? "/member"} />

        <p className="text-xs text-center text-gray-400 mt-6">
          登入即代表同意本協會的服務條款與隱私政策
        </p>
      </div>
    </div>
  );
}
