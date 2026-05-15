import Link from "next/link";
import { HomeLogo } from "@/components/brand/home-logo";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-6">
      <HomeLogo className="text-[#2b201f]" />
      <section className="grid w-full flex-1 items-center gap-8 py-10 lg:grid-cols-[1fr_420px]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Phase 2 Auth
          </p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            创建你的 My Girl 账户
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            使用邮箱和用户名完成注册。邮箱验证与 Turnstile 将在后续阶段接入。
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <SignUpForm />
          <p className="mt-5 text-center text-sm text-muted-foreground">
            已有账户？{" "}
            <Link className="font-medium text-primary hover:underline" href="/sign-in">
              去登录
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
