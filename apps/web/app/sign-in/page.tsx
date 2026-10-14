// apps/web/app/sign-in/page.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    await authClient.signIn.email(
      { email, password },
      {
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
        onError: (ctx) => {
          setError(ctx.error.message || "Sign in failed.");
          setLoading(false);
        },
      }
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <p className="font-sans text-sm text-muted mb-3">Enterprise Research</p>
      <h1 className="font-serif text-3xl leading-tight mb-10">Sign in</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block font-sans text-sm text-muted mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent border-0 border-b border-border focus:border-b-2 focus:border-accent focus:outline-none font-sans text-text py-2 transition-all"
          />
        </div>
        <div>
          <label htmlFor="password" className="block font-sans text-sm text-muted mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent border-0 border-b border-border focus:border-b-2 focus:border-accent focus:outline-none font-sans text-text py-2 transition-all"
          />
        </div>

        {error && <p className="font-sans text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="font-sans text-sm font-medium bg-accent text-bg px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="font-sans text-sm text-muted mt-8">
        No account?{" "}
        <Link href="/sign-up" className="text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}