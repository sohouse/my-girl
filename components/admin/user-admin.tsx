"use client";

import { Save, ShieldCheck, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  username: string | null;
  displayUsername: string | null;
  role: "user" | "admin";
  createdAt: Date | string;
  updatedAt: Date | string;
};

type UserForm = Pick<AdminUser, "name" | "username" | "displayUsername" | "role" | "emailVerified">;

export function getUserAdminLayoutClassNames() {
  return {
    root: "grid gap-5",
    modal: "fixed inset-0 z-50 flex items-center justify-center bg-[#201b18]/45 p-4",
    dialog:
      "max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-[#ded2c5] bg-[#fffaf5] p-4 shadow-2xl"
  };
}

export function UserAdmin({ initialUsers, currentUserId }: { initialUsers: AdminUser[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [selectedId, setSelectedId] = useState("");
  const selected = useMemo(() => users.find((item) => item.id === selectedId) ?? null, [selectedId, users]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const layout = getUserAdminLayoutClassNames();

  function selectUser(user: AdminUser) {
    setSelectedId(user.id);
    setForm(toForm(user));
    setStatus(null);
  }

  function closeModal() {
    setSelectedId("");
    setForm(emptyForm);
    setStatus(null);
  }

  function updateField<K extends keyof UserForm>(key: K, value: UserForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function saveForm() {
    if (!selectedId) {
      return;
    }

    setSaving(true);
    setStatus(null);

    const response = await fetch(`/api/admin/users/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const body = await response.json();
    setSaving(false);

    if (!response.ok) {
      setStatus(body.error ?? "保存失败");
      return;
    }

    const updated = body.user as AdminUser;
    setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setForm(toForm(updated));
    setStatus("已保存");
    closeModal();
  }

  return (
    <div className={layout.root}>
      <section className="overflow-hidden rounded-lg border border-[#ded2c5] bg-[#fffaf5]">
        <div className="grid min-w-[760px] grid-cols-[1.2fr_1.5fr_0.8fr_0.8fr_1fr_1fr] gap-3 border-b border-[#ded2c5] px-4 py-3 text-xs font-semibold uppercase text-[#6f625b]">
          <span>用户</span>
          <span>邮箱</span>
          <span>角色</span>
          <span>验证</span>
          <span>创建时间</span>
          <span>更新时间</span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[760px] divide-y divide-[#eadfd3]">
            {users.map((user) => (
              <button
                className="grid w-full grid-cols-[1.2fr_1.5fr_0.8fr_0.8fr_1fr_1fr] gap-3 px-4 py-3 text-left text-sm transition hover:bg-[#f4eadf]"
                key={user.id}
                onClick={() => selectUser(user)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-medium">
                    {user.role === "admin" ? <ShieldCheck className="h-4 w-4 text-[#2d6a4f]" /> : <UserRound className="h-4 w-4" />}
                    <span className="truncate">{user.displayUsername || user.username || user.name}</span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-[#8b7a70]">{user.username ?? "未设置用户名"}</span>
                </span>
                <span className="truncate">{user.email}</span>
                <span>{user.role}</span>
                <span className={user.emailVerified ? "text-[#2d6a4f]" : "text-[#9b3933]"}>
                  {user.emailVerified ? "已验证" : "未验证"}
                </span>
                <span>{formatDate(user.createdAt)}</span>
                <span>{formatDate(user.updatedAt)}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {selected ? (
        <div className={layout.modal} role="dialog" aria-modal="true" aria-labelledby="admin-user-dialog-title">
          <section className={layout.dialog}>
            <div className="flex items-center justify-between gap-3 border-b border-[#ded2c5] pb-3">
              <h2 className="text-lg font-semibold" id="admin-user-dialog-title">
                编辑用户
              </h2>
              <Button
                className="border-[#d8cec2] bg-transparent text-[#201b18] hover:bg-[#eee5da]"
                onClick={closeModal}
                size="icon"
                type="button"
                variant="outline"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">关闭</span>
              </Button>
            </div>

            <div className="mt-4 flex justify-end">
              <Button className="bg-[#1d1917] text-[#fff7ec] hover:bg-[#9b3933]" disabled={saving || !selectedId} onClick={saveForm} type="button">
                <Save className="h-4 w-4" aria-hidden="true" />
                {saving ? "保存中" : "保存"}
              </Button>
            </div>

            <div className="mt-4 grid gap-3">
              <Field label="昵称 name" value={form.name} onChange={(value) => updateField("name", value)} />
              <Field label="用户名 username" value={form.username ?? ""} onChange={(value) => updateField("username", value || null)} />
              <Field
                label="展示名 displayUsername"
                value={form.displayUsername ?? ""}
                onChange={(value) => updateField("displayUsername", value || null)}
              />
              <label className="grid gap-1 text-sm">
                <span className="font-medium">角色</span>
                <select
                  className="h-10 rounded-md border border-[#d8cec2] bg-white px-3"
                  onChange={(event) => updateField("role", event.target.value as AdminUser["role"])}
                  value={form.role}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={form.emailVerified}
                  onChange={(event) => updateField("emailVerified", event.target.checked)}
                  type="checkbox"
                />
                邮箱已验证
              </label>
              {selectedId === currentUserId ? (
                <p className="rounded-md border border-[#ded2c5] bg-[#f8f3eb] px-3 py-2 text-xs leading-5 text-[#6f625b]">
                  当前登录管理员不能把自己的角色降级为 user。
                </p>
              ) : null}
              {status ? <p className="text-sm text-[#9b3933]">{status}</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

const emptyForm: UserForm = {
  name: "",
  username: null,
  displayUsername: null,
  role: "user",
  emailVerified: false
};

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        className="h-10 rounded-md border border-[#d8cec2] bg-white px-3"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function toForm(user: AdminUser): UserForm {
  return {
    name: user.name,
    username: user.username,
    displayUsername: user.displayUsername,
    role: user.role,
    emailVerified: user.emailVerified
  };
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
