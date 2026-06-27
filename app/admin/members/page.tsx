import { getAllMembers } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import MembersTable from "./MembersTable";

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export const metadata = { title: "會員管理 | 後台" };

export default async function AdminMembersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const search = params.search ?? "";

  const { members, total, pages } = await getAllMembers(page, 20, search);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">會員管理</h1>
          <p className="text-gray-500 text-sm mt-1">共 {total} 位會員</p>
        </div>
      </div>

      <MembersTable members={members} pages={pages} currentPage={page} />
    </div>
  );
}
