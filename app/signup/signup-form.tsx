"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DocsLogo } from "@/components/docs-logo";

export function SignupForm() {
  const router = useRouter();
  const { status } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Account created. Please sign in with your new credentials.");
      setLoading(false);
      return;
    }

    router.push("/documents");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-between overflow-hidden px-4 sm:px-14 lg:px-24">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-[position:60%_100%]"
        style={{ backgroundImage: "url('/imgs/login-signin-bg.jpeg')" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/80"
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center gap-3">
          <Link
            href={status === "authenticated" ? "/documents" : "/"}
            className="flex flex-col items-center gap-3"
            title="Blossom — home"
          >
            <DocsLogo className="h-14 w-14 drop-shadow-[0_8px_16px_rgba(92,163,170,0.35)]" />
            <h1 className="font-serif text-3xl font-medium tracking-tight text-ink drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
              Blossom
            </h1>
          </Link>
          <p className="text-sm text-muted drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
            Create your desk
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-white/15 bg-white/10 p-7 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl"
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
            Name
            <input
              type="text"
              name="name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/25 px-3.5 py-2.5 text-[15px] text-ink placeholder:text-white/40 outline-none backdrop-blur-sm transition focus:border-accent/80 focus:ring-2 focus:ring-accent/30"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/25 px-3.5 py-2.5 text-[15px] text-ink placeholder:text-white/40 outline-none backdrop-blur-sm transition focus:border-accent/80 focus:ring-2 focus:ring-accent/30"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
            Password
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/25 px-3.5 py-2.5 text-[15px] text-ink placeholder:text-white/40 outline-none backdrop-blur-sm transition focus:border-accent/80 focus:ring-2 focus:ring-accent/30"
            />
            <span className="text-xs text-white/50">
              At least 8 characters.
            </span>
          </label>

          {error && (
            <p
              className="rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger backdrop-blur-sm"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#0d1f21] shadow-[0_8px_24px_-8px_rgba(92,163,170,0.5)] transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <div className="relative z-10 hidden w-full max-w-lg flex-col items-start gap-6 lg:flex">
        <div className="h-px w-16 bg-accent/70" />
        <p className="font-serif text-5xl leading-[1.15] text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
          Write together,
          <br />
          in real time.
        </p>
        <p className="max-w-md text-base leading-relaxed text-white/70">
          Blossom is a calm writing desk for teams. Open a page, share a link,
          and watch the words come together — live.
        </p>
        <ul className="flex flex-col gap-3.5 text-base text-white/80">
          <li className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            Live cursors — see everyone as they type
          </li>
          <li className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sand" />
            Comments, right in the margins
          </li>
          <li className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
            One link, always in sync
          </li>
        </ul>
        <div className="mt-2 h-px w-32 bg-sand/50" />
      </div>
    </main>
  );
}