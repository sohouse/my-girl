"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { getSignInMethod, signInSchema } from "@/lib/auth-validation";

export function SignInForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const parsed = signInSchema.safeParse({
      identifier: formData.get("identifier"),
      password: formData.get("password")
    });

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "请检查登录信息");
      return;
    }

    if (!turnstileToken) {
      setMessage("请先完成人机验证");
      return;
    }

    setIsPending(true);
    const { identifier, password } = parsed.data;
    const result =
      getSignInMethod(identifier) === "email"
        ? await authClient.signIn.email(
            { email: identifier, password },
            {
              headers: {
                "x-captcha-response": turnstileToken
              }
            }
          )
        : await authClient.signIn.username(
            { username: identifier, password },
            {
              headers: {
                "x-captcha-response": turnstileToken
              }
            }
          );
    setIsPending(false);

    if (result.error) {
      setMessage(result.error.message ?? "登录失败，请检查账户和密码");
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setMessage(null);
    setIsGooglePending(true);

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/"
    });

    setIsGooglePending(false);

    if (result.error) {
      setMessage(result.error.message ?? "Google 登录失败，请稍后再试");
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-medium">
        邮箱或用户名
        <input
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          name="identifier"
          required
          type="text"
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
        {isPending ? "正在登录" : "登录"}
      </Button>
      <Button
        className="border-[#dad2c7] bg-[#f7f2ea] text-[#2b201f] hover:bg-[#efe7dc]"
        disabled={isGooglePending}
        onClick={handleGoogleSignIn}
        type="button"
        variant="outline"
      >
        {isGooglePending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        {isGooglePending ? "正在跳转到 Google" : "使用 Google 登录"}
      </Button>
    </form>
  );
}
