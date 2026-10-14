// apps/web/app/sign-up/page.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    await authClient.signUp.email(
      { name, email, password },
      {
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
        onError: (ctx) => {
          setError(ctx.error.message || "Sign up failed.");
          setLoading(false);
        },
      }
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <p className="font-sans text-sm text-muted mb-3">Enterprise Research</p>
      <h1 className="font-serif text-3xl leading-tight mb-10">Create an account</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block font-sans text-sm text-muted mb-2">
            Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent border-0 border-b border-border focus:border-b-2 focus:border-accent focus:outline-none font-sans text-text py-2 transition-all"
          />
        </div>
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
            minLength={8}
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
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="font-sans text-sm text-muted mt-8">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}