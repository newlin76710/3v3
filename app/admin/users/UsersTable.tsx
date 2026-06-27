"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { updateUserRole } from "@/app/actions/admin";
import { Search } from "lucide-react";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  createdAt: Date;
  member: {
    id: string;
    memberNumber: string;
    isActive: boolean;
    expiresAt: Date;
  } | null;
};

interface Props {
  users: User[];
  pages: number;
  currentPage: number;
}

const roleLabel: Record<string, string> = {
  ADMIN: "管理員",
  STAFF: "工作人員",
  MEMBER: "一般用戶",
};

const roleBadgeVariant: Record<string, "destructive" | "warning" | "secondary"> = {
  ADMIN: "destructive",
  STAFF: "warning",
  MEMBER: "secondary",
};

export default function UsersTable({ users, pages, currentPage }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/admin/users?search=${encodeURIComponent(search)}`);
  };

  const handleRoleChange = async (userId: string, role: "ADMIN" | "STAFF" | "MEMBER") => {
    setUpdatingId(userId);
    try {
      const result = await updateUserRole(userId, role);
      if (result.success) {
        toast.success("角色已更新");
        router.refresh();
      }
    } catch {
      toast.error("更新失敗");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋姓名或 Email..."
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">搜尋</Button>
        </form>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用戶</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>會員狀態</TableHead>
              <TableHead>加入日期</TableHead>
              <TableHead>變更角色</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                  無資料
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const memberExpired = user.member
                  ? new Date(user.member.expiresAt) < new Date()
                  : false;
                const isActiveMember = user.member?.isActive && !memberExpired;

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.image ? (
                          <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                            {user.name?.[0] ?? "?"}
                          </div>
                        )}
                        <span className="font-medium text-sm">{user.name ?? "（未設定）"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{user.email ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant[user.role] ?? "secondary"}>
                        {roleLabel[user.role] ?? user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.member ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-gray-500">{user.member.memberNumber}</span>
                          <Badge variant={isActiveMember ? "success" : "secondary"} className="text-xs w-fit">
                            {isActiveMember ? "有效" : memberExpired ? "已過期" : "未啟用"}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">非協會會員</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString("zh-TW")}
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={user.role}
                        onValueChange={(v) => handleRoleChange(user.id, v as "ADMIN" | "STAFF" | "MEMBER")}
                        disabled={updatingId === user.id}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">一般用戶</SelectItem>
                          <SelectItem value="STAFF">工作人員</SelectItem>
                          <SelectItem value="ADMIN">管理員</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pages > 1 && (
        <div className="p-4 border-t flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={p === currentPage ? "default" : "outline"}
              onClick={() => router.push(`/admin/users?page=${p}`)}
            >
              {p}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
