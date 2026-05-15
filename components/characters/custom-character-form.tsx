"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { Button } from "@/components/ui/button";

export function CustomCharacterForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage(null);

    if (!turnstileToken) {
      setMessage("请先完成人机验证。");
      return;
    }

    setIsPending(true);

    const formData = new FormData(form);
    formData.set("turnstileToken", turnstileToken);
    const response = await fetch("/api/characters/custom", {
      method: "POST",
      body: formData
    });

    setIsPending(false);

    if (!response.ok) {
      setMessage("创建失败，请确认姓名和基准照片已填写。");
      return;
    }

    form.reset();
    setMessage("已创建，她会出现在你的自定义角色中。");
    router.refresh();
    onCreated?.();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div>
        <p className="text-sm font-semibold text-[#f8f0df]">创建自定义角色</p>
        <p className="mt-1 text-sm leading-6 text-[#a69f91]">
          姓名必填，基准照片可选，其余设定可逐步补充。
        </p>
      </div>

      <label className="grid gap-2 text-sm font-medium text-[#f8f0df]">
        姓名
        <input
          className="h-10 rounded-md border border-[#f8f0df]/20 bg-[#211d16] px-3 text-sm text-[#f8f0df] outline-none focus-visible:ring-2 focus-visible:ring-[#c86f4a]"
          maxLength={40}
          name="name"
          required
          type="text"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-[#f8f0df]">
        基准照片
        <input
          accept="image/png,image/jpeg,image/webp"
          className="rounded-md border border-[#f8f0df]/20 bg-[#211d16] px-3 py-2 text-sm text-[#a69f91] file:mr-3 file:rounded-md file:border-0 file:bg-[#f8f0df] file:px-3 file:py-1.5 file:text-sm file:text-[#11100d]"
          name="baseImage"
          type="file"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-[#f8f0df]">
        人设
        <textarea className="min-h-20 rounded-md border border-[#f8f0df]/20 bg-[#211d16] px-3 py-2 text-sm text-[#f8f0df] outline-none focus-visible:ring-2 focus-visible:ring-[#c86f4a]" name="persona" />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-[#f8f0df]">
          成长背景
          <textarea className="min-h-20 rounded-md border border-[#f8f0df]/20 bg-[#211d16] px-3 py-2 text-sm text-[#f8f0df] outline-none focus-visible:ring-2 focus-visible:ring-[#c86f4a]" name="background" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#f8f0df]">
          说话语气
          <textarea className="min-h-20 rounded-md border border-[#f8f0df]/20 bg-[#211d16] px-3 py-2 text-sm text-[#f8f0df] outline-none focus-visible:ring-2 focus-visible:ring-[#c86f4a]" name="speakingStyle" />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-[#f8f0df]">
          口头禅
          <textarea className="min-h-20 rounded-md border border-[#f8f0df]/20 bg-[#211d16] px-3 py-2 text-sm text-[#f8f0df] outline-none focus-visible:ring-2 focus-visible:ring-[#c86f4a]" name="catchphrases" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#f8f0df]">
          行为动机
          <textarea className="min-h-20 rounded-md border border-[#f8f0df]/20 bg-[#211d16] px-3 py-2 text-sm text-[#f8f0df] outline-none focus-visible:ring-2 focus-visible:ring-[#c86f4a]" name="motivation" />
        </label>
      </div>

      <TurnstileWidget onTokenChange={setTurnstileToken} />

      {message ? <p className="text-sm text-[#a69f91]">{message}</p> : null}

      <Button className="bg-[#c86f4a] text-[#130f0c] hover:bg-[#e0875f]" disabled={isPending} type="submit">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
        {isPending ? "正在创建" : "创建角色"}
      </Button>
    </form>
  );
}
