"use client";

import { LockKeyhole, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Character = {
  id: string;
  name: string;
  title: string;
  persona: string;
  baseImageUrl: string;
  kind?: string;
};

export function getCharacterGridClassName(variant: "gallery" | "compact" = "gallery") {
  return variant === "compact"
    ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3"
    : "grid gap-3 sm:grid-cols-2 lg:grid-cols-2";
}

export function CharacterGrid({
  characters,
  isSignedIn,
  paymentStatus = "unpaid",
  emptyText = "暂无角色",
  variant = "gallery"
}: {
  characters: Character[];
  isSignedIn: boolean;
  paymentStatus?: "unpaid" | "paid";
  emptyText?: string;
  variant?: "gallery" | "compact";
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startChat(characterId: string) {
    setPendingId(characterId);
    setError(null);

    const response = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ characterId })
    });

    if (!response.ok) {
      setPendingId(null);
      setError("暂时无法开始对话，请稍后再试。");
      return;
    }

    const body = (await response.json()) as { session: { id: string } };
    router.push(`/chat/${body.session.id}`);
  }

  return (
    <section
      id="characters"
      className={getCharacterGridClassName(variant)}
    >
      {characters.length === 0 ? (
        <div className="rounded-lg border border-[#d8cec2] bg-[#fffaf5] p-5 text-sm text-[#6f625b] md:col-span-2">
          {emptyText}
        </div>
      ) : null}
      {characters.map((character) => (
        <article
          className={
            variant === "compact"
              ? "group grid overflow-hidden rounded-lg border border-[#d8cec2] bg-[#fffaf5] shadow-sm sm:grid-cols-[150px_1fr]"
              : "group grid min-h-[250px] overflow-hidden rounded-lg border border-[#ded2c5] bg-[#fffaf5] shadow-[0_18px_42px_rgb(42_31_25_/_0.07)] transition duration-300 hover:-translate-y-0.5 hover:border-[#c9b7a7] hover:shadow-[0_22px_48px_rgb(42_31_25_/_0.12)] lg:grid-cols-[46%_1fr]"
          }
          key={character.id}
        >
          <div
            className={
              variant === "compact"
                ? "relative min-h-48 overflow-hidden bg-[#ece1d4]"
                : "relative min-h-[240px] overflow-hidden bg-[#ece1d4] sm:min-h-[280px] lg:min-h-[250px]"
            }
          >
            <Image
              alt={character.name}
              className="object-contain object-bottom saturate-[0.92] transition duration-700 group-hover:scale-[1.035] group-hover:saturate-100"
              fill
              priority={false}
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
              src={character.baseImageUrl}
            />
          </div>
          <div className={variant === "compact" ? "flex flex-1 flex-col p-4" : "flex min-h-0 flex-1 flex-col p-4 sm:p-5"}>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#9b3933]">
              {character.title}
            </p>
            <h2 className={variant === "compact" ? "mt-2 text-xl font-semibold text-[#201b18]" : "mt-2 text-2xl font-semibold leading-none text-[#201b18]"}>
              {character.name}
            </h2>
            <p className={variant === "compact" ? "mt-3 text-sm leading-7 text-[#6f625b]" : "mt-3 line-clamp-4 text-sm leading-6 text-[#6f625b]"}>
              {character.persona}
            </p>
            <div className="mt-auto pt-5">
              {isSignedIn ? (
                character.kind === "preset" || paymentStatus === "paid" ? (
                  <Button
                    className="w-full bg-[#1d1917] text-[#fff7ec] hover:bg-[#9b3933]"
                    disabled={pendingId === character.id}
                    onClick={() => startChat(character.id)}
                    type="button"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    {pendingId === character.id ? "正在进入" : "开始对话"}
                  </Button>
                ) : (
                  <Button
                    className="w-full border-[#d8cec2] bg-transparent text-[#7d7067]"
                    disabled
                    type="button"
                    variant="outline"
                  >
                    <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                    开通后可用
                  </Button>
                )
              ) : (
                <Button
                  asChild
                  className="w-full border-[#d8cec2] bg-transparent text-[#201b18] hover:bg-[#eee5da] hover:text-[#201b18]"
                  variant="outline"
                >
                  <Link href="/sign-in">
                    <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                    登录后开始
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </article>
      ))}
      {error ? (
        <p className="text-sm text-[#9f3d35] md:col-span-2 xl:col-span-4">{error}</p>
      ) : null}
    </section>
  );
}
