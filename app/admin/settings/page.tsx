import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminForbidden, AdminShell } from "@/components/admin/admin-shell";
import { getSessionUser } from "@/server/auth/session";

type AdminUser = {
  id: string;
  role?: string | null;
};

export default async function AdminSettingsPage() {
  const user = (await getSessionUser(await headers())) as AdminUser | null;

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role !== "admin") {
    return <AdminForbidden />;
  }

  return (
    <AdminShell title="站点设置" description="管理全站级开关与安全能力。" active="home">
      <div className="grid gap-4 rounded-lg border border-[#ded2c5] bg-[#fffaf5] p-5">
        <div>
          <h2 className="text-lg font-semibold">基准照片参考</h2>
          <p className="mt-2 text-sm leading-6 text-[#6f625b]">
            全站总开关控制是否允许图片生成流程参考基准照片。若关闭，所有角色都不会携带基准图。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" />
            启用全站基准照片参考
          </label>
          <p className="text-xs text-[#8b7a70]">当前版本先提供页面入口，实际保存会在下一步连上 API。</p>
        </div>
      </div>
    </AdminShell>
  );
}
