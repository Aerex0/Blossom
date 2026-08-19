import Link from "next/link";
import { BrandLink } from "@/components/brand-link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-canvas">
      <div className="photo-backdrop" aria-hidden />
      <div className="photo-overlay" aria-hidden />

      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <BrandLink />
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#0d1f21] shadow-[0_8px_24px_-8px_rgba(92,163,170,0.6)] transition hover:bg-accent-dark"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 75%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-3xl text-center">

          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-7xl">
            The desk where
            <br />
            words{" "}
            <span className="bg-gradient-to-r from-[#8ec8cd] to-[#d2b999] bg-clip-text text-transparent">
              gather.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/70">
            Blossom is a calm writing desk for teams. Live cursors, threaded
            comments, and one link that stays in sync — no refreshes, no merge
            conflicts, no lost words.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-[#0d1f21] shadow-[0_12px_32px_-8px_rgba(92,163,170,0.6)] transition hover:bg-accent-dark"
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 backdrop-blur-md transition hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>

          <p className="mt-8 text-sm text-white/45">
            Free forever · No credit card · Your documents stay yours
          </p>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-b from-transparent to-black/70" />
      </section>

      <section className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-28 sm:grid-cols-3 lg:gap-8">
          <Feature
            title="Live cursors"
            body="Every collaborator appears the moment they start typing. Cursors, carets and selections move in real time — even on flaky connections."
            icon={
              <CursorIcon />
            }
          />
          <Feature
            title="Comments in the margins"
            body="Thread notes right where the words are. Resolve them as you go, and let the conversation become part of the document."
            icon={
              <CommentIcon />
            }
          />
          <Feature
            title="One link, every device"
            body="Share a single link with anyone. Editors and viewers land on the same page, always in sync, with nothing to install."
            icon={
              <ShareIcon />
            }
          />
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 bg-black/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <BrandLink size="sm" />
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Blossom. Write together, in real time.
          </p>
        </div>
      </footer>
    </main>
  );
}

function Feature({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.08]">
      <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-accent transition group-hover:border-white/25">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2.5 text-sm leading-relaxed text-white/55">{body}</p>
    </div>
  );
}

function CursorIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M3 2.5l10 4-4 1-2 5-4-10z" strokeLinejoin="round" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2.5 4a1.5 1.5 0 011.5-1.5h8A1.5 1.5 0 0113.5 4v5a1.5 1.5 0 01-1.5 1.5H7l-3.5 3v-3A1.5 1.5 0 012.5 9V4z" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="3.5" cy="8" r="1.7" />
      <circle cx="12.5" cy="4" r="1.7" />
      <circle cx="12.5" cy="12" r="1.7" />
      <path d="M5.1 6.8l5.8-2.4M5.1 9.2l5.8 2.4" strokeLinecap="round" />
    </svg>
  );
}