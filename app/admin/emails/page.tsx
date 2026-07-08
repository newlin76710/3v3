import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getBroadcastHistory } from "@/app/actions/emailBroadcast";
import EmailBroadcastManager from "./EmailBroadcastManager";

export const metadata = { title: "群發 Email | 後台" };

export default async function EmailBroadcastPage() {
  const session = await auth();
  if (!session || !["ADMIN", "STAFF"].includes(session.user.role)) redirect("/login");

  const history = await getBroadcastHistory();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">群發 Email</h1>
      <EmailBroadcastManager history={history} />
    </div>
  );
}
