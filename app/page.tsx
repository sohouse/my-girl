import { ArrowRight, BadgeDollarSign, Check, LogIn, Sparkles, UserPlus } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { HomeLogo } from "@/components/brand/home-logo";
import { CharacterGrid } from "@/components/characters/character-grid";
import { CustomCharacterModal } from "@/components/characters/custom-character-modal";
import { Button } from "@/components/ui/button";
import { getUserDisplayIdentity } from "@/lib/auth-display";
import { listCharactersForHome } from "@/server/characters/service";
import { getSessionUser } from "@/server/auth/session";

type HomeUser = {
  id: string;
  displayUsername?: string | null;
  username?: string | null;
  email?: string | null;
  name?: string | null;
};

export default async function Home() {
  const user = (await getSessionUser(await headers())) as HomeUser | null;
  const identity = user ? getUserDisplayIdentity(user) : null;
  const { preset, custom } = await listCharactersForHome(undefined, user?.id ?? null);

  return (
    <main className="min-h-screen bg-[#f8f3eb] text-[#201b18]">
      <header className="mx-auto flex h-[68px] w-full max-w-[1440px] items-center justify-between gap-4 border-b border-[#e4d8ca] px-5 sm:px-8">
        <HomeLogo className="text-[#201b18]" />

        <nav className="hidden items-center gap-1 lg:flex">
          <Link
            className="rounded-full px-4 py-2 text-sm text-[#6f625b] transition-colors hover:bg-[#eee5da] hover:text-[#201b18]"
            href="#pricing"
          >
            Pricing
          </Link>
        </nav>

        {identity ? (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-[#201b18]">{identity.primary}</p>
              {identity.secondary ? <p className="text-xs text-[#7d7067]">{identity.secondary}</p> : null}
            </div>
            <SignOutButton />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild className="text-[#201b18] hover:bg-[#eee5da] hover:text-[#201b18]" size="sm" variant="ghost">
              <Link href="/sign-in">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                登录
              </Link>
            </Button>
            <Button asChild className="bg-[#1d1917] text-[#fff7ec] hover:bg-[#9b3933]" size="sm">
              <Link href="/sign-up">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                注册
              </Link>
            </Button>
          </div>
        )}
      </header>

      <section
        className="mx-auto grid min-h-[calc(100svh-68px)] w-full max-w-[1440px] px-5 py-5 sm:px-8 lg:py-7"
        id="preset-characters"
      >
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[390px_minmax(0,1fr)]">
          <div className="flex min-h-[560px] flex-col justify-between py-1 lg:min-h-0">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#9b3933]">Private companion studio</p>
              <h1 className="mt-6 max-w-sm text-5xl font-semibold leading-[0.98] tracking-normal text-[#201b18] sm:text-6xl lg:text-[4.1rem]">
                选择一个
                <br />
                会记得你的
                <br />
                陪伴角色
              </h1>
              <p className="mt-6 max-w-sm text-base leading-8 text-[#6f625b]">
                从四个预设人格开始。对话、声音、图片与记忆围绕同一个人设沉淀，像一段关系被慢慢点亮。
              </p>
            </div>

            {/* <div className="mt-8">
              <div className="flex flex-wrap gap-3">
                {identity ? (
                  <CustomCharacterModal />
                ) : (
                  <Button asChild className="bg-[#1d1917] text-[#fff7ec] hover:bg-[#9b3933]">
                    <Link href="/sign-in">登录后开始</Link>
                  </Button>
                )}
                <Button
                  asChild
                  className="border-[#d8cec2] bg-transparent text-[#201b18] hover:bg-[#eee5da] hover:text-[#201b18]"
                  variant="outline"
                >
                  <Link href="#characters">浏览角色</Link>
                </Button>
              </div>

            </div> */}
          </div>

          <div className="grid min-w-0 content-start gap-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#9b3933]">System presets</p>
                <h2 className="mt-2 text-2xl font-semibold">系统预设角色</h2>
              </div>
              <p className="hidden max-w-xs text-right text-xs leading-5 text-[#6f625b] sm:block">
                四个角色完整首屏展示，先看见她，再选择是否进入对话。
              </p>
            </div>
            <CharacterGrid characters={preset} isSignedIn={!!identity} />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-5 py-5 sm:px-8 lg:py-8" id="pricing">
        <div className="grid gap-6 rounded-[32px] border border-[#ded2c5] bg-[#fffaf3] p-6 shadow-[0_16px_40px_rgba(61,43,28,0.05)] lg:grid-cols-[1fr_420px] lg:p-8">
          <div className="space-y-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#9b3933]">Pricing</p>
            <div className="max-w-xl space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight text-[#201b18] sm:text-4xl">
                单一方案，简单透明
              </h2>
              <p className="text-base leading-8 text-[#6f625b]">
                先用最轻的方式开始体验。这里目前只展示一个价格层级，支付和接口接入会放在后续阶段处理。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "完整访问当前站点功能",
                "首屏角色与自定义角色体验",
                "后续功能迭代优先接入",
                "先不绑定任何支付流程"
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-[#e8ddd0] bg-white/80 px-4 py-3 text-sm text-[#5f554d]"
                >
                  <Check className="h-4 w-4 shrink-0 text-[#9b3933]" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[28px] border border-[#e8ddd0] bg-[#1d1917] p-6 text-[#fff7ec] shadow-[0_18px_50px_rgba(29,25,23,0.2)]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#f6d8c8]">
                <BadgeDollarSign className="h-4 w-4" aria-hidden="true" />
                One price
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-[#cfb8ad]">Starter access</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-6xl font-semibold tracking-tight">$1</span>
                  <span className="pb-2 text-sm text-[#cfb8ad]">/ 目前仅展示价格</span>
                </div>
              </div>
              <p className="max-w-sm text-sm leading-7 text-[#d7c5bb]">
                这是一个展示型定价区块，方便你在落地页里直接表达价格锚点。后续若接入支付，我再帮你补完整购买流程。
              </p>
            </div>

            <Link
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#fff7ec] px-5 py-3 text-sm font-medium text-[#1d1917] transition-colors hover:bg-[#f2dcc5]"
              href="#preset-characters"
            >
              先看看角色
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1440px] gap-14 px-5 pb-16 sm:px-8">
        {identity ? (
          <section className="grid gap-5">
            <div className="flex items-end justify-between gap-4 border-t border-[#ded2c5] pt-5">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#9b3933]">Private archive</p>
                <h2 className="mt-2 text-2xl font-semibold">我的自定义角色</h2>
              </div>
              <CustomCharacterModal />
            </div>
            <CharacterGrid
              characters={custom}
              emptyText="你还没有自定义角色。创建后会显示在这里。"
              isSignedIn={!!identity}
              variant="compact"
            />
          </section>
        ) : null}

        <footer className="border-t border-[#ded2c5] pt-7">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr_0.9fr] lg:items-start">
            <div className="space-y-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#9b3933]">Site footer</p>
              <div>
                <h3 className="text-xl font-semibold text-[#201b18]">My Girl</h3>
                <p className="mt-3 max-w-sm text-sm leading-7 text-[#6f625b]">
                  一个温柔、私密、会记得你的陪伴空间。我们把体验、规则和联系入口放在同一处，方便你随时查看。
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#9b3933]">Legal</p>
              <div className="grid gap-3 text-sm">
                <Link className="transition-colors hover:text-[#9b3933]" href="/privacy-policy">
                  隐私政策
                </Link>
                <Link className="transition-colors hover:text-[#9b3933]" href="/terms">
                  服务条款
                </Link>
                <Link className="transition-colors hover:text-[#9b3933]" href="/disclaimer">
                  免责声明
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#9b3933]">Contact</p>
              <div className="grid gap-3 text-sm">
                <Link className="transition-colors hover:text-[#9b3933]" href="/contact">
                  联系我们
                </Link>
                <a
                  className="transition-colors hover:text-[#9b3933]"
                  href="mailto:miss@will-zp.com"
                >
                  miss@will-zp.com
                </a>
                <p className="max-w-xs text-[#6f625b]">如需反馈问题、申请帮助或讨论合作，欢迎发送邮件。</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-[#e4d8ca] pt-5 text-xs text-[#8a7f76] sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 My Girl</p>
            <p>使用站点即表示你已阅读并理解相关政策与条款。</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
