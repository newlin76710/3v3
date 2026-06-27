import { getAllUsers } from "@/app/actions/admin";
import UsersTable from "./UsersTable";

export const metadata = { title: "網站用戶 | 後台" };

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const search = params.search ?? "";

  const { users, total, pages } = await getAllUsers(page, 30, search);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">網站用戶</h1>
        <p className="text-gray-500 text-sm mt-1">共 {total} 位已登入用戶</p>
      </div>
      <UsersTable users={users} pages={pages} currentPage={page} />
    </div>
  );
}
