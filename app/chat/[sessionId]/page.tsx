import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ChatPanel } from "@/components/chat/chat-panel";
import { getSessionUser } from "@/server/auth/session";
import { getSessionForUser, listMessages } from "@/server/chat/service";
import { getDb } from "@/server/db/client";

type ChatSession = {
  id: string;
  character?: {
    name: string;
    title: string;
    baseImageUrl: string;
  };
};

export default async function ChatPage({
  params
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await getSessionUser(await headers());

  if (!user) {
    redirect("/sign-in");
  }

  const { sessionId } = await params;
  const db = getDb();
  const session = (await getSessionForUser(db, sessionId, user.id)) as ChatSession | null;

  if (!session?.character) {
    notFound();
  }

  const messages = await listMessages(db, sessionId);

  return (
    <ChatPanel
      character={session.character}
      initialMessages={messages.map((message) => ({
        id: message.id,
        role: message.role,
        type: message.type,
        content: message.content
      }))}
      sessionId={sessionId}
    />
  );
}
