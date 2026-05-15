import { HeartHandshake } from "lucide-react";
import Link from "next/link";

export function HomeLogo({ className = "" }: { className?: string }) {
  return (
    <Link
      aria-label="返回 My Girl 首页"
      className={`inline-flex items-center gap-3 text-sm font-semibold tracking-wide ${className}`}
      href="/"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#2b201f] text-[#fff7ec] shadow-sm">
        <HeartHandshake className="h-4 w-4" aria-hidden="true" />
      </span>
      <span>My Girl</span>
    </Link>
  );
}
