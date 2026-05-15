"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { signUpSchema } from "@/lib/auth-validation";

export function SignUpForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const parsed = signUpSchema.safeParse({
      name: formData.get("name"),
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password")
    });

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "请检查注册信息");
      return;
    }

    if (!turnstileToken) {
      setMessage("请先完成人机验证");
      return;
    }

    setIsPending(true);
    const { name, username, email, password } = parsed.data;
    const result = await authClient.signUp.email(
      {
        name,
        email,
        password,
        username,
        displayUsername: username
      },
      {
        headers: {
          "x-captcha-response": turnstileToken
        }
      }
    );
    setIsPending(false);

    if (result.error) {
      setMessage(result.error.message ?? "注册失败，请稍后再试");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-medium">
        昵称
        <input
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          name="name"
          required
          type="text"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        用户名
        <input
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          name="username"
          pattern="[a-zA-Z0-9_]{3,30}"
          required
          type="text"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        邮箱
        <input
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        密码
        <input
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>
      <TurnstileWidget onTokenChange={setTurnstileToken} />
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button className="mt-2" disabled={isPending} type="submit">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {isPending ? "正在注册" : "注册"}
      </Button>
    </form>
  );
}
