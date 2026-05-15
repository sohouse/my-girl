import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminForbidden, AdminShell } from "@/components/admin/admin-shell";
import { UserAdmin } from "@/components/admin/user-admin";
import { getSessionUser } from "@/server/auth/session";
import { listAdminUsers } from "@/server/users/admin";

type AdminUser = {
  id: string;
  role?: string | null;
};

export default async function AdminUsersPage() {
  const user = (await getSessionUser(await headers())) as AdminUser | null;

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role !== "admin") {
    return <AdminForbidden />;
  }

  const users = await listAdminUsers();

  return (
    <AdminShell
      title="后台用户维护"
      description="查看用户列表，维护基础展示信息、角色和邮箱验证状态。"
      active="users"
    >
      <UserAdmin initialUsers={users} currentUserId={user.id} />
    </AdminShell>
  );
}
