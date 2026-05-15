import type { ReactNode } from "react";
import { ArrowLeft, ShieldCheck, Scale } from "lucide-react";
import Link from "next/link";
import { HomeLogo } from "@/components/brand/home-logo";

type LegalSection = {
  title: string;
  content: ReactNode;
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
};

export function LegalPage({ eyebrow, title, description, updatedAt, sections }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-[#f8f3eb] text-[#201b18]">
      <header className="mx-auto flex h-[68px] w-full max-w-[1440px] items-center justify-between gap-4 border-b border-[#e4d8ca] px-5 sm:px-8">
        <HomeLogo className="text-[#201b18]" />
        <Link
          className="inline-flex items-center gap-2 rounded-full border border-[#d8cec2] bg-[#fff9f1] px-4 py-2 text-sm text-[#201b18] transition-colors hover:bg-[#eee5da]"
          href="/"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回首页
        </Link>
      </header>

      <section className="mx-auto w-full max-w-[1440px] px-5 py-6 sm:px-8 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-[#ded2c5] bg-[#fffaf3] p-6 shadow-[0_16px_40px_rgba(61,43,28,0.05)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#9b3933]">{eyebrow}</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-tight text-[#201b18]">{title}</h1>
            <p className="mt-4 text-sm leading-7 text-[#6f625b]">{description}</p>
            <div className="mt-6 rounded-2xl border border-[#e8ddd0] bg-white/80 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[#201b18]">
                <ShieldCheck className="h-4 w-4 text-[#9b3933]" aria-hidden="true" />
                更新日期
              </div>
              <p className="mt-2 text-sm leading-6 text-[#6f625b]">{updatedAt}</p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[#9b3933]">
              <Scale className="h-4 w-4" aria-hidden="true" />
              Legal document
            </div>
          </aside>

          <article className="rounded-[28px] border border-[#ded2c5] bg-[#fffaf3] p-6 shadow-[0_16px_40px_rgba(61,43,28,0.05)] sm:p-8 lg:p-10">
            <div className="space-y-10">
              {sections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <h2 className="text-2xl font-semibold tracking-tight text-[#201b18]">{section.title}</h2>
                  <div className="space-y-4 text-[15px] leading-8 text-[#5f554d]">{section.content}</div>
                </section>
              ))}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
