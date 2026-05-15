import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminForbidden, AdminShell } from "@/components/admin/admin-shell";
import { PresetCharacterAdmin } from "@/components/admin/preset-character-admin";
import { getSessionUser } from "@/server/auth/session";
import { listAdminPresetCharacters } from "@/server/characters/service";

type AdminUser = {
  id: string;
  role?: string | null;
};

export default async function AdminCharactersPage() {
  const user = (await getSessionUser(await headers())) as AdminUser | null;

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role !== "admin") {
    return <AdminForbidden />;
  }

  const characters = await listAdminPresetCharacters();

  return (
    <AdminShell
      title="后台预设角色管理"
      description="只管理系统预设角色，不影响用户自定义角色。"
      active="characters"
    >
      <PresetCharacterAdmin initialCharacters={characters} />
    </AdminShell>
  );
}
