"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { DocsLogo } from "@/components/docs-logo";
import { BrandLink } from "@/components/brand-link";

interface DocumentItem {
  id: string;
  title: string;
  role: string;
  ownerName: string;
  isOwner: boolean;
  updatedAt: string;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function DocumentsClient({
  userName,
  documents,
}: {
  userName: string;
  documents: DocumentItem[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<DocumentItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<DocumentItem | null>(null);

  async function createDocument() {
    setCreating(true);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const { document } = await res.json();
      router.push(`/document/${document.id}`);
    } else {
      setCreating(false);
    }
  }

  async function renameDocument() {
    if (!renaming) return;
    const title = renameValue.trim();
    if (!title) return;
    const res = await fetch(`/api/documents/${renaming.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      setRenaming(null);
      router.refresh();
    }
  }

  async function deleteDocument() {
    if (!deleting) return;
    const res = await fetch(`/api/documents/${deleting.id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleting(null);
      router.refresh();
    }
  }

  const initials = userName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative min-h-screen bg-canvas">
      <div className="photo-backdrop" aria-hidden />
      <div className="photo-overlay" aria-hidden />

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-black/30 px-4 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-3">
          <BrandLink />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-lg border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm font-medium text-white/80 backdrop-blur-sm transition hover:border-white/25 hover:bg-white/10 hover:text-white"
          >
            Sign out
          </button>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ring-2 ring-white/15"
            style={{ backgroundColor: "#b4532f" }}
            title={userName}
          >
            {initials}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <section className="mb-12">
          <button
            onClick={createDocument}
            disabled={creating}
            className="group flex w-full items-center gap-5 rounded-2xl border border-white/15 bg-white/10 p-5 text-left backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-accent/60 hover:bg-white/[0.14] hover:shadow-[0_20px_40px_-16px_rgba(0,0,0,0.6)] disabled:cursor-wait disabled:opacity-60"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-2xl font-light text-[#0d1f21] shadow-[0_0_24px_rgba(92,163,170,0.45)] transition group-hover:shadow-[0_0_32px_rgba(92,163,170,0.6)]">
              {creating ? "…" : "+"}
            </span>
            <span className="min-w-0">
              <span className="block font-medium text-white">
                {creating ? "Clearing your desk…" : "Start a new document"}
              </span>
              <span className="block text-sm text-white/60">
                A blank page, ready for your first words
              </span>
            </span>
          </button>
        </section>

        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/50 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
            On your desk
          </h2>

          {documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-6 py-16 text-center backdrop-blur-md">
              <DocsLogo className="mx-auto h-10 w-10 opacity-70" />
              <p className="mt-5 font-serif text-lg text-white/85">
                Your desk is empty.
              </p>
              <p className="mt-1 text-sm text-white/50">
                Start a new document above — the first word is the hardest.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <li key={doc.id} className="group">
                  <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-accent/60 hover:bg-white/[0.14] hover:shadow-[0_20px_40px_-16px_rgba(0,0,0,0.6)]">
                    {!doc.isOwner && (
                      <span className="animate-badge-pop absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-accent/50 bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-accent backdrop-blur-md">
                        <ShareIcon />
                        Shared
                      </span>
                    )}
                    <Link
                      href={`/document/${doc.id}`}
                      className="flex h-44 items-start justify-center border-b border-white/10 bg-black/20 p-5"
                    >
                      <PageThumbnail title={doc.title} />
                    </Link>
                    <div className="flex items-center justify-between gap-2 p-4">
                      <div className="min-w-0">
                        <Link
                          href={`/document/${doc.id}`}
                          className="block truncate font-medium text-white hover:text-accent"
                          title={doc.title}
                        >
                          {doc.title}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-white/55">
                          {timeAgo(doc.updatedAt)} · {doc.ownerName}
                          {doc.role === "VIEWER" && " · viewer"}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                        <button
                          onClick={() => {
                            setRenaming(doc);
                            setRenameValue(doc.title);
                          }}
                          className="rounded-md p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                          title="Rename"
                          aria-label={`Rename ${doc.title}`}
                        >
                          <PencilIcon />
                        </button>
                        {doc.isOwner && (
                          <button
                            onClick={() => setDeleting(doc)}
                            className="rounded-md p-2 text-white/60 transition hover:bg-danger/15 hover:text-danger"
                            title="Delete"
                            aria-label={`Delete ${doc.title}`}
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {renaming && (
        <Modal
          title="Rename document"
          onClose={() => setRenaming(null)}
          footer={
            <>
              <button
                onClick={() => setRenaming(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={renameDocument}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#0d1f21] transition hover:bg-accent-dark"
              >
                Rename
              </button>
            </>
          }
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium text-white">
            Title
            <input
              autoFocus
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && renameDocument()}
              className="rounded-lg border border-white/15 bg-white/10 px-3.5 py-2.5 text-[15px] text-white outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/25"
            />
          </label>
        </Modal>
      )}

      {deleting && (
        <Modal
          title="Take this off your desk?"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button
                onClick={() => setDeleting(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={deleteDocument}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:bg-danger/80"
              >
                Delete
              </button>
            </>
          }
        >
          <p className="text-sm leading-relaxed text-white/60">
            “{deleting.title}” will be removed for everyone who can open it. This
            cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

function PageThumbnail({ title }: { title: string }) {
  return (
    <svg viewBox="0 0 90 116" role="img" aria-label={title} className="h-full max-h-40 drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]">
      <title>{title}</title>
      <rect x="1" y="1" width="88" height="114" rx="4" fill="#f1ead9" />
      <path d="M65 1v11h11" fill="#eadfc4" />
      <rect x="12" y="26" width="66" height="6" rx="3" fill="#d8c9a3" />
      <rect x="12" y="38" width="66" height="6" rx="3" fill="#e8dfc8" />
      <rect x="12" y="50" width="46" height="6" rx="3" fill="#e8dfc8" />
      <rect x="12" y="62" width="66" height="6" rx="3" fill="#e8dfc8" />
      <rect x="12" y="74" width="52" height="6" rx="3" fill="#e8dfc8" />
      <circle cx="79" cy="104" r="7" fill="#f0a63c" opacity="0.25" />
      <circle cx="79" cy="104" r="3" fill="#f0a63c" />
    </svg>
  );
}

function Modal({
  title,
  onClose,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-black/50 p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-serif text-xl font-medium text-white">{title}</h2>
        {children}
        <div className="mt-6 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="2.5" cy="6" r="1.3" />
      <circle cx="9.5" cy="3" r="1.3" />
      <circle cx="9.5" cy="9" r="1.3" />
      <path d="M3.7 5.1l4.6-1.9M3.7 6.9l4.6 1.9" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M11.5 2.5l2 2L6 12l-2.5.5L4 10l7.5-7.5z" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.5 9.5h7L12 4M6.5 7v4M9.5 7v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}