// apps/web/components/SignOutButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="font-sans text-sm text-muted hover:text-accent transition-colors"
    >
      Sign out
    </button>
  );
}