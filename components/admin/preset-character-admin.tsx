"use client";

import { CheckCircle2, Plus, Save, X, XCircle } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type AdminPresetCharacter = {
  id: string;
  slug: string;
  name: string;
  title: string;
  persona: string;
  background: string;
  speakingStyle: string;
  catchphrases: string;
  motivation: string;
  baseImageUrl: string;
  baseImageStorageKey: string | null;
  baseImageStorageProvider: string;
  allowBaseImageReference: boolean;
  sortOrder: number;
  enabled: boolean;
  updatedAt: Date | string;
};

type PresetForm = Omit<AdminPresetCharacter, "id" | "updatedAt">;

const emptyForm: PresetForm = {
  slug: "",
  name: "",
  title: "",
  persona: "",
  background: "",
  speakingStyle: "",
  catchphrases: "",
  motivation: "",
  baseImageUrl: "",
  baseImageStorageKey: null,
  baseImageStorageProvider: "local-public",
  allowBaseImageReference: true,
  sortOrder: 100,
  enabled: true
};

export function getPresetCharacterAdminLayoutClassNames() {
  return {
    root: "grid gap-5",
    modal: "fixed inset-0 z-50 flex items-center justify-center bg-[#201b18]/45 p-4",
    dialog:
      "max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#ded2c5] bg-[#fffaf5] p-4 shadow-2xl"
  };
}

export function PresetCharacterAdmin({ initialCharacters }: { initialCharacters: AdminPresetCharacter[] }) {
  const [characters, setCharacters] = useState(initialCharacters);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const selected = useMemo(
    () => characters.find((character) => character.id === selectedId) ?? null,
    [characters, selectedId]
  );
  const [form, setForm] = useState<PresetForm>(emptyForm);
  const [status, setStatus] = useState<string | null>(null);
  const [siteSetting, setSiteSetting] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const layout = getPresetCharacterAdminLayoutClassNames();

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/admin/settings/base-image-reference");
      if (response.ok) {
        const body = (await response.json()) as { enabled?: boolean };
        setSiteSetting(!!body.enabled);
      }
    })();
  }, []);

  function selectCharacter(character: AdminPresetCharacter) {
    setSelectedId(character.id);
    setForm(toForm(character));
    setStatus(null);
  }

  function createNew() {
    setSelectedId("new");
    setForm(emptyForm);
    setStatus(null);
  }

  function closeModal() {
    setSelectedId(null);
    setForm(emptyForm);
    setStatus(null);
  }

  function updateField<K extends keyof PresetForm>(key: K, value: PresetForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function saveForm() {
    setSaving(true);
    setStatus(null);

    const response = await fetch(
      selectedId === "new" ? "/api/admin/characters/presets" : `/api/admin/characters/presets/${selectedId}`,
      {
        method: selectedId === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      }
    );
    const body = await response.json();
    setSaving(false);

    if (!response.ok) {
      setStatus(body.error ?? "保存失败");
      return;
    }

    const saved = body.character as AdminPresetCharacter;
    setCharacters((current) =>
      selectedId === "new"
        ? [...current, saved].sort((a, b) => a.sortOrder - b.sortOrder)
        : current.map((character) => (character.id === saved.id ? saved : character)).sort((a, b) => a.sortOrder - b.sortOrder)
    );
    setSelectedId(saved.id);
    setForm(toForm(saved));
    setStatus("已保存");
    closeModal();
  }

  async function updateSiteSetting(enabled: boolean) {
    setSaving(true);
    setStatus(null);

    const response = await fetch("/api/admin/settings/base-image-reference", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled })
    });
    const body = await response.json();
    setSaving(false);

    if (!response.ok) {
      setStatus(body.error ?? "站点设置更新失败");
      return;
    }

    setSiteSetting(!!body.setting?.value);
    setStatus("站点总开关已保存");
  }

  async function toggleEnabled(character: AdminPresetCharacter) {
    setStatus(null);
    const response = await fetch(`/api/admin/characters/presets/${character.id}/enabled`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !character.enabled })
    });
    const body = await response.json();

    if (!response.ok) {
      setStatus(body.error ?? "状态更新失败");
      return;
    }

    const updated = body.character as AdminPresetCharacter;
    setCharacters((current) => current.map((item) => (item.id === updated.id ? updated : item)));

    if (selectedId === updated.id) {
      setForm(toForm(updated));
    }
  }

  return (
    <div className={layout.root}>
      <section className="overflow-hidden rounded-lg border border-[#ded2c5] bg-[#fffaf5]">
        <div className="flex items-center justify-between gap-3 border-b border-[#ded2c5] px-4 py-3">
          <h2 className="text-lg font-semibold">预设角色</h2>
          <Button className="bg-[#1d1917] text-[#fff7ec] hover:bg-[#9b3933]" onClick={createNew} size="sm" type="button">
            <Plus className="h-4 w-4" aria-hidden="true" />
            新增
          </Button>
        </div>
        <div className="divide-y divide-[#eadfd3]">
          {characters.map((character) => (
            <div
              className="grid w-full grid-cols-[64px_1fr_auto] items-center gap-4 px-4 py-3 text-left transition hover:bg-[#f4eadf]"
              key={character.id}
              role="button"
              tabIndex={0}
              onClick={() => selectCharacter(character)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectCharacter(character);
                }
              }}
            >
              <Image
                alt={character.name}
                className="h-16 w-16 rounded-md border border-[#ded2c5] bg-[#ece1d4] object-cover"
                height={64}
                src={character.baseImageUrl}
                width={64}
              />
              <span className="min-w-0">
                <span className="block font-medium">{character.name}</span>
                <span className="mt-1 block truncate text-sm text-[#6f625b]">{character.title}</span>
                <span className="mt-1 block font-mono text-xs text-[#8b7a70]">
                  {character.slug} · sort {character.sortOrder}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className={character.enabled ? "text-sm text-[#2d6a4f]" : "text-sm text-[#9b3933]"}>
                  {character.enabled ? "启用" : "停用"}
                </span>
                <Button
                  className="border-[#d8cec2] bg-transparent text-[#201b18] hover:bg-[#eee5da]"
                  onClick={(event) => {
                    event.stopPropagation();
                    void toggleEnabled(character);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {character.enabled ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {character.enabled ? "停用" : "启用"}
                </Button>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-[#ded2c5] bg-[#fffaf5] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">基准照片参考开关</h2>
            <p className="mt-1 text-sm leading-6 text-[#6f625b]">站点总开关控制是否允许参考基准照片；角色开关再做单角色放行。</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input checked={siteSetting} onChange={(event) => void updateSiteSetting(event.target.checked)} type="checkbox" />
            启用全站基准照片参考
          </label>
        </div>
      </section>

      {selectedId ? (
        <div className={layout.modal} role="dialog" aria-modal="true" aria-labelledby="admin-character-dialog-title">
          <section className={layout.dialog}>
            <div className="flex items-center justify-between gap-3 border-b border-[#ded2c5] pb-3">
              <h2 className="text-lg font-semibold" id="admin-character-dialog-title">
                {selectedId === "new" ? "新增角色" : "编辑角色"}
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
              <Button className="bg-[#1d1917] text-[#fff7ec] hover:bg-[#9b3933]" disabled={saving} onClick={saveForm} type="button">
                <Save className="h-4 w-4" aria-hidden="true" />
                {saving ? "保存中" : "保存"}
              </Button>
            </div>

            <div className="mt-4 grid gap-3">
              <Field label="slug" value={form.slug} onChange={(value) => updateField("slug", value)} />
              <Field label="姓名" value={form.name} onChange={(value) => updateField("name", value)} />
              <Field label="标题" value={form.title} onChange={(value) => updateField("title", value)} />
              <Field label="基准图 URL" value={form.baseImageUrl} onChange={(value) => updateField("baseImageUrl", value)} />
              <Field
                label="Storage Key"
                value={form.baseImageStorageKey ?? ""}
                onChange={(value) => updateField("baseImageStorageKey", value || null)}
              />
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Storage Provider</span>
                <select
                  className="h-10 rounded-md border border-[#d8cec2] bg-white px-3"
                  onChange={(event) => updateField("baseImageStorageProvider", event.target.value)}
                  value={form.baseImageStorageProvider}
                >
                  <option value="local-public">local-public</option>
                  <option value="r2">r2</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">排序</span>
                <input
                  className="h-10 rounded-md border border-[#d8cec2] bg-white px-3"
                  onChange={(event) => updateField("sortOrder", Number(event.target.value))}
                  type="number"
                  value={form.sortOrder}
                />
              </label>
              <Textarea label="人设" value={form.persona} onChange={(value) => updateField("persona", value)} />
              <Textarea label="成长背景" value={form.background} onChange={(value) => updateField("background", value)} />
              <Textarea label="说话风格" value={form.speakingStyle} onChange={(value) => updateField("speakingStyle", value)} />
              <Textarea label="口头禅" value={form.catchphrases} onChange={(value) => updateField("catchphrases", value)} />
              <Textarea label="行为动机" value={form.motivation} onChange={(value) => updateField("motivation", value)} />
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={form.allowBaseImageReference}
                  onChange={(event) => updateField("allowBaseImageReference", event.target.checked)}
                  type="checkbox"
                />
                允许参考基准照片生成
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={form.enabled}
                  onChange={(event) => updateField("enabled", event.target.checked)}
                  type="checkbox"
                />
                启用
              </label>
              {status ? <p className="text-sm text-[#9b3933]">{status}</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

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

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <textarea
        className="min-h-24 rounded-md border border-[#d8cec2] bg-white px-3 py-2 leading-6"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function toForm(character: AdminPresetCharacter): PresetForm {
  return {
    slug: character.slug,
    name: character.name,
    title: character.title,
    persona: character.persona,
    background: character.background,
    speakingStyle: character.speakingStyle,
    catchphrases: character.catchphrases,
    motivation: character.motivation,
    baseImageUrl: character.baseImageUrl,
    baseImageStorageKey: character.baseImageStorageKey,
    baseImageStorageProvider: character.baseImageStorageProvider,
    allowBaseImageReference: character.allowBaseImageReference,
    sortOrder: character.sortOrder,
    enabled: character.enabled
  };
}
