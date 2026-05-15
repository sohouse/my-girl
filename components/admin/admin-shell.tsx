import Link from "next/link";
import { Home, UserRoundCog, UsersRound } from "lucide-react";
import { HomeLogo } from "@/components/brand/home-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  title: string;
  description?: string;
  active: "users" | "characters" | "home";
  children: React.ReactNode;
};

const navItems = [
  {
    key: "users",
    href: "/admin/users",
    label: "用户维护",
    icon: UsersRound
  },
  {
    key: "characters",
    href: "/admin/characters",
    label: "预设角色管理",
    icon: UserRoundCog
  }
] as const;

export function getAdminShellLayoutClassNames() {
  return {
    workspace: "grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start",
    sidebar:
      "rounded-lg border border-[#ded2c5] bg-[#fffaf5] p-3 lg:sticky lg:top-5",
    operationArea: "min-w-0"
  };
}

export function AdminShell({ title, description, active, children }: AdminShellProps) {
  const layout = getAdminShellLayoutClassNames();

  return (
    <main className="min-h-screen bg-[#f8f3eb] px-4 py-5 text-[#201b18] sm:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#ded2c5] pb-5">
          <HomeLogo className="text-[#201b18]" />
          <Button
            asChild
            className="border-[#d8cec2] bg-transparent text-[#201b18] hover:bg-[#eee5da]"
            variant="outline"
          >
            <Link href="/">
              <Home className="h-4 w-4" aria-hidden="true" />
              返回首页
            </Link>
          </Button>
        </header>

        <div className={layout.workspace}>
          <aside className={layout.sidebar} aria-label="后台功能入口">
            <p className="px-2 pb-2 text-xs font-semibold uppercase text-[#8b7a70]">管理菜单</p>
            <nav className="grid gap-2" aria-label="后台导航">
            {navItems.map((item) => {
              const Icon = item.icon;
              const selected = active === item.key;

              return (
                <Link
                  aria-current={selected ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    selected
                      ? "border-[#1d1917] bg-[#1d1917] text-[#fff7ec]"
                      : "border-[#d8cec2] bg-[#fffaf5] text-[#201b18] hover:bg-[#eee5da]"
                  )}
                  href={item.href}
                  key={item.key}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
            </nav>
          </aside>

          <section className={layout.operationArea} aria-label={title}>
            <div className="mb-5">
              <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
              {description ? <p className="mt-2 text-sm leading-6 text-[#6f625b]">{description}</p> : null}
            </div>
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}

export function AdminForbidden() {
  return (
    <main className="min-h-screen bg-[#f8f3eb] px-5 py-6 text-[#201b18]">
      <div className="mx-auto max-w-3xl rounded-lg border border-[#ded2c5] bg-[#fffaf5] p-6">
        <HomeLogo className="text-[#201b18]" />
        <h1 className="mt-8 text-2xl font-semibold">无后台访问权限</h1>
        <p className="mt-3 text-sm leading-6 text-[#6f625b]">当前账号不是管理员，不能访问后台管理。</p>
        <Button asChild className="mt-6 bg-[#1d1917] text-[#fff7ec] hover:bg-[#9b3933]">
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    </main>
  );
}
