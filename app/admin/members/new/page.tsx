import AdminMemberForm from "../AdminMemberForm";

export const metadata = { title: "新增會員 | 後台" };

export default function AdminNewMemberPage() {
  return (
    <div>
      <div className="mb-6">
        <a href="/admin/members" className="text-blue-600 hover:underline text-sm">
          ← 返回會員管理
        </a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">手動新增會員</h1>
        <p className="text-gray-500 text-sm mt-1">供現場收費或補建資料使用，身分證字號不可重複</p>
      </div>
      <div className="max-w-2xl">
        <AdminMemberForm mode="create" />
      </div>
    </div>
  );
}
