"use client";

import { Check, Download, SendHorizontal, Share2, Volume2, X } from "lucide-react";
import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { HomeLogo } from "@/components/brand/home-logo";
import { Button } from "@/components/ui/button";

type ChatMessage = {
  id: string;
  role: string;
  type?: string;
  content: string;
};

type Character = {
  name: string;
  title: string;
  baseImageUrl: string;
};

export function ChatPanel({
  sessionId,
  character,
  initialMessages
}: {
  sessionId: string;
  character: Character;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [voicePendingId, setVoicePendingId] = useState<string | null>(null);
  const [isShareMode, setIsShareMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isSharePending, setIsSharePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasMessages = messages.length > 0;

  const pendingMessages = useMemo(
    () => (isPending ? [...messages, { id: "pending", role: "assistant", content: "正在回复..." }] : messages),
    [isPending, messages]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextContent = content.trim();

    if (!nextContent || isPending) {
      return;
    }

    const localUserMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: nextContent
    };

    setMessages((current) => [...current, localUserMessage]);
    setContent("");
    setIsPending(true);
    setError(null);

    const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ content: nextContent })
    });

    setIsPending(false);

    if (!response.ok) {
      setError("消息发送失败，请稍后再试。");
      return;
    }

    const body = (await response.json()) as {
      assistantMessage?: ChatMessage;
      imageMessage?: ChatMessage;
      reply: string;
    };

    const nextMessages = [
      body.assistantMessage ?? {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        type: "text",
        content: body.reply
      }
    ];

    if (body.imageMessage) {
      nextMessages.push(body.imageMessage);
    }

    setMessages((current) => [...current, ...nextMessages]);
  }

  async function playVoice(message: ChatMessage) {
    if (voicePendingId) {
      return;
    }

    setVoicePendingId(message.id);
    setError(null);

    const response = await fetch(`/api/chat/sessions/${sessionId}/messages/${message.id}/voice`, {
      method: "POST"
    });

    setVoicePendingId(null);

    if (!response.ok) {
      setError("语音生成失败，请稍后再试。");
      return;
    }

    const audioUrl = URL.createObjectURL(await response.blob());
    const audio = new Audio(audioUrl);

    audio.addEventListener("ended", () => URL.revokeObjectURL(audioUrl), { once: true });
    audio.addEventListener("error", () => URL.revokeObjectURL(audioUrl), { once: true });
    await audio.play();
  }

  function toggleShareMode() {
    setError(null);
    setSelectedMessageIds([]);
    setIsShareMode((current) => !current);
  }

  function toggleSelectedMessage(message: ChatMessage) {
    if ((message.type ?? "text") !== "text" || message.id === "pending") {
      return;
    }

    setError(null);
    setSelectedMessageIds((current) => {
      if (current.includes(message.id)) {
        return current.filter((id) => id !== message.id);
      }

      if (current.length >= 10) {
        setError("最多只能选择 10 条消息。");
        return current;
      }

      return [...current, message.id];
    });
  }

  async function createShareCard() {
    if (selectedMessageIds.length < 1 || isSharePending) {
      return;
    }

    setIsSharePending(true);
    setError(null);

    const response = await fetch(`/api/chat/sessions/${sessionId}/share-card`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ messageIds: selectedMessageIds })
    });

    setIsSharePending(false);

    if (!response.ok) {
      setError("分享图生成失败，请稍后再试。");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `my-girl-share-${Date.now()}.svg`;

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setIsShareMode(false);
    setSelectedMessageIds([]);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col bg-[#f3f0e8]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur">
        <HomeLogo className="text-[#2b201f] [&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
        <div className="h-8 w-px bg-border" />
        <div className="relative h-11 w-11 overflow-hidden rounded-md bg-secondary">
          <Image alt={character.name} fill sizes="44px" src={character.baseImageUrl} className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold">{character.name}</h1>
          <p className="text-xs text-muted-foreground">{character.title}</p>
        </div>
        <Button
          aria-label={isShareMode ? "退出分享选择" : "分享对话"}
          onClick={toggleShareMode}
          size="icon"
          type="button"
          variant={isShareMode ? "outline" : "ghost"}
        >
          {isShareMode ? <X className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </header>

      <main className={`flex-1 space-y-4 px-4 py-6 ${isShareMode ? "pb-28" : ""}`}>
        {!hasMessages ? (
          <p className="mx-auto max-w-sm rounded-lg bg-card px-4 py-3 text-center text-sm text-muted-foreground shadow-sm">
            你们还没有开始聊天。发一句问候，她会用自己的方式回应你。
          </p>
        ) : null}

        {pendingMessages.map((message) => {
          const isUser = message.role === "user";
          const isImage = message.type === "image";

          return (
            <div className={`flex items-center gap-3 ${isUser ? "justify-end" : "justify-start"}`} key={message.id}>
              {isShareMode ? (
                <button
                  aria-label={selectedMessageIds.includes(message.id) ? "取消选择消息" : "选择消息"}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                    selectedMessageIds.includes(message.id)
                      ? "border-[#0f766e] bg-[#0f766e] text-white"
                      : "border-muted-foreground/40 bg-card text-transparent"
                  } ${isUser ? "order-first" : ""}`}
                  disabled={(message.type ?? "text") !== "text" || message.id === "pending"}
                  onClick={() => toggleSelectedMessage(message)}
                  type="button"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
              <div className={`flex max-w-[78%] items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
                {isImage ? (
                  <div className="relative aspect-[4/5] w-56 max-w-full overflow-hidden rounded-lg bg-secondary shadow-sm">
                    <Image alt={`${character.name}发送的图片`} fill sizes="224px" src={message.content} className="object-cover" />
                  </div>
                ) : (
                  <div
                    className={`rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${
                      isUser
                        ? "bg-[#95ec69] text-[#13200d]"
                        : "bg-card text-card-foreground"
                    }`}
                  >
                    {message.content}
                  </div>
                )}
                {!isUser && !isImage && message.id !== "pending" ? (
                  <Button
                    aria-label="播放语音"
                    disabled={voicePendingId === message.id}
                    onClick={() => void playVoice(message)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </main>

      <footer className="sticky bottom-0 border-t bg-card p-3">
        {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
        {isShareMode ? (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">已选择 {selectedMessageIds.length}/10 条</p>
              <p className="text-xs text-muted-foreground">确认后生成包含网址和所选对话的分享图</p>
            </div>
            <Button onClick={toggleShareMode} type="button" variant="outline">
              取消
            </Button>
            <Button disabled={selectedMessageIds.length < 1 || isSharePending} onClick={() => void createShareCard()} type="button">
              <Download className="h-4 w-4" aria-hidden="true" />
              {isSharePending ? "生成中" : "确认"}
            </Button>
          </div>
        ) : (
          <form className="flex items-end gap-2" onSubmit={handleSubmit}>
            <textarea
              className="min-h-11 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              maxLength={2000}
              onChange={(event) => setContent(event.target.value)}
              placeholder="输入消息"
              rows={1}
              value={content}
            />
            <Button disabled={isPending || !content.trim()} size="icon" type="submit">
              <SendHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
        )}
      </footer>
    </div>
  );
}
