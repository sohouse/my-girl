"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <Button
      disabled={isPending}
      onClick={handleSignOut}
      type="button"
      variant="outline"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {isPending ? "正在登出" : "登出"}
    </Button>
  );
}
