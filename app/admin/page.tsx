import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminForbidden, AdminShell } from "@/components/admin/admin-shell";
import { getSessionUser } from "@/server/auth/session";

type AdminUser = {
  id: string;
  role?: string | null;
};

export default async function AdminPage() {
  const user = (await getSessionUser(await headers())) as AdminUser | null;

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role !== "admin") {
    return <AdminForbidden />;
  }

  return (
    <AdminShell title="后台管理" description="选择要维护的后台模块。" active="home">
      <div className="grid gap-4 sm:grid-cols-2">
        <a className="rounded-lg border border-[#ded2c5] bg-[#fffaf5] p-5 transition hover:bg-[#f4eadf]" href="/admin/users">
          <h2 className="text-lg font-semibold">用户维护</h2>
          <p className="mt-2 text-sm leading-6 text-[#6f625b]">查看用户列表，维护昵称、用户名、角色和邮箱验证状态。</p>
        </a>
        <a className="rounded-lg border border-[#ded2c5] bg-[#fffaf5] p-5 transition hover:bg-[#f4eadf]" href="/admin/characters">
          <h2 className="text-lg font-semibold">预设角色管理</h2>
          <p className="mt-2 text-sm leading-6 text-[#6f625b]">继续维护系统预设角色，用户自定义角色不在这里编辑。</p>
        </a>
        <a className="rounded-lg border border-[#ded2c5] bg-[#fffaf5] p-5 transition hover:bg-[#f4eadf]" href="/admin/settings">
          <h2 className="text-lg font-semibold">站点设置</h2>
          <p className="mt-2 text-sm leading-6 text-[#6f625b]">管理全站级开关，例如基准照片参考能力。</p>
        </a>
      </div>
    </AdminShell>
  );
}
