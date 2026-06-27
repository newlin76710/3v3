"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, UserCircle, Trophy, ClipboardList, CreditCard,
  Megaphone, Settings, LogOut, ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "網站用戶", icon: UserCircle },
  { href: "/admin/members", label: "入會申請", icon: Users },
  { href: "/admin/events", label: "賽事管理", icon: Trophy },
  { href: "/admin/registrations", label: "報名管理", icon: ClipboardList },
  { href: "/admin/payments", label: "付款確認", icon: CreditCard },
  { href: "/admin/announcements", label: "公告管理", icon: Megaphone },
];

interface Props {
  user: { name?: string | null; email?: string | null; role: string };
}

export default function AdminSidebar({ user }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-5 border-b border-gray-700">
        <Link href="/admin" className="flex items-center gap-3">
          <img src="/images/3v3.jpg" alt="Logo" className="w-10 h-10 rounded-full object-cover" />
          <div>
            <p className="font-bold text-sm leading-tight">後台管理系統</p>
            <p className="text-gray-400 text-xs">3V3 羽球協會</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
            {user.name?.[0] ?? "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-gray-400">{user.role}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="flex-1 text-center text-xs text-gray-400 hover:text-white py-1"
          >
            前台
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex-1 text-center text-xs text-gray-400 hover:text-red-400 py-1 flex items-center justify-center gap-1"
          >
            <LogOut className="w-3 h-3" />
            登出
          </button>
        </div>
      </div>
    </aside>
  );
}
