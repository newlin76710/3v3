import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "./AdminSidebar";

export const metadata = { title: "後台管理 | 中華台北羽球3對3發展協會" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || !["ADMIN", "STAFF"].includes(session.user.role)) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <AdminSidebar user={session.user} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
