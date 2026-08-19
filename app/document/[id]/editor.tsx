"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { DocsLogo } from "@/components/docs-logo";
import { BrandLink } from "@/components/brand-link";
import { colorForUser } from "@/lib/colors";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:1234";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  color: string;
}

interface Comment {
  id: string;
  text: string;
  resolved: boolean;
  createdAt: string;
  author: { id: string; name: string };
}

interface OnlineUser {
  clientId: number;
  name: string;
  color: string;
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

export function EditorClient({
  docId,
  initialTitle,
  role,
  isOwner,
  ownerName,
  members,
  currentUserId,
  currentUserName,
}: {
  docId: string;
  initialTitle: string;
  role: string;
  isOwner: boolean;
  ownerName: string;
  members: Member[];
  currentUserId: string;
  currentUserName: string;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">(
    "connecting",
  );
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [title, setTitle] = useState(initialTitle);
  const [titleSaved, setTitleSaved] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const userColor = useMemo(() => colorForUser(currentUserId), [currentUserId]);

  useEffect(() => {
    let cancelled = false;
    let prov: WebsocketProvider | null = null;
    let doc: Y.Doc | null = null;

    async function init() {
      try {
        const res = await fetch(
          `/api/collab/token?docId=${encodeURIComponent(docId)}`,
        );
        if (!res.ok) {
          if (!cancelled) setStatus("error");
          return;
        }
        const { token } = await res.json();
        if (cancelled) return;

        doc = new Y.Doc();
        prov = new WebsocketProvider(WS_URL, docId, doc, {
          params: { token },
          connect: false,
        });
        prov.awareness.setLocalStateField("user", {
          name: currentUserName,
          color: userColor,
        });
        prov.on("status", ({ status: s }: { status: string }) => {
          if (!cancelled) {
            setStatus(s === "connected" ? "connected" : "connecting");
          }
        });
        prov.on("connection-error", () => {
          if (!cancelled) setStatus("error");
        });
        prov.connect();
        setProvider(prov);
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void init();

    return () => {
      cancelled = true;
      prov?.destroy();
      doc?.destroy();
      setProvider(null);
    };
  }, [docId, currentUserName, userColor]);

  useEffect(() => {
    if (!provider) return;
    const awareness = provider.awareness;

    const update = () => {
      const users: OnlineUser[] = [];
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return;
        const user = (state as { user?: { name?: string; color?: string } }).user;
        if (user?.name) {
          users.push({
            clientId,
            name: user.name,
            color: user.color ?? "#a8a294",
          });
        }
      });
      setOnlineUsers(users);
    };

    awareness.on("change", update);
    update();
    return () => {
      awareness.off("change", update);
    };
  }, [provider]);

  async function renameTitle(nextTitle: string) {
    const trimmed = nextTitle.trim();
    if (!trimmed || trimmed === initialTitle) {
      setTitle(initialTitle);
      setTitleSaved(true);
      return;
    }
    setTitleSaved(false);
    const res = await fetch(`/api/documents/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    if (res.ok) {
      setTitle(trimmed);
      router.refresh();
    }
    setTitleSaved(true);
  }

  const currentUser = members.find((m) => m.id === currentUserId);
  const currentUserColor = currentUser?.color ?? userColor;
  const canEdit = role !== "VIEWER";

  return (
    <div className="relative flex min-h-screen flex-col bg-canvas">
      <div className="photo-backdrop" aria-hidden />
      <div className="photo-overlay" aria-hidden />
      <TopBar
        title={title}
        onTitleChange={setTitle}
        onTitleBlur={() => renameTitle(title)}
        titleSaved={titleSaved}
        status={status}
        onlineUsers={onlineUsers}
        isOwner={isOwner}
        canShare={role === "OWNER"}
        onShare={() => setShareOpen(true)}
        onToggleComments={() => setCommentsOpen((open) => !open)}
        commentsOpen={commentsOpen}
        currentUserName={currentUserName}
        currentUserColor={currentUserColor}
      />

      {provider ? (
        <EditorWorkspace
          provider={provider}
          editable={canEdit}
          userName={currentUserName}
          userColor={userColor}
          commentsOpen={commentsOpen}
          onCloseComments={() => setCommentsOpen(false)}
          canComment={canEdit}
          docId={docId}
          currentUserId={currentUserId}
        />
      ) : (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3">
          <DocsLogo className="h-12 w-12 opacity-70" />
          <p className="text-sm text-white/45">
            {status === "error"
              ? "Could not reach the collaboration server. Is it running? (npm run dev:collab)"
              : "Warming up the lamp…"}
          </p>
        </div>
      )}

      {shareOpen && (
        <ShareDialog
          docId={docId}
          title={title}
          ownerName={ownerName}
          members={members}
          isOwner={isOwner}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

function EditorWorkspace({
  provider,
  editable,
  userName,
  userColor,
  commentsOpen,
  onCloseComments,
  canComment,
  docId,
  currentUserId,
}: {
  provider: WebsocketProvider;
  editable: boolean;
  userName: string;
  userColor: string;
  commentsOpen: boolean;
  onCloseComments: () => void;
  canComment: boolean;
  docId: string;
  currentUserId: string;
}) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Underline,
        LinkExtension.configure({ openOnClick: false }),
        Placeholder.configure({ placeholder: "Start typing…" }),
        Collaboration.configure({
          document: provider.doc,
          field: "default",
        }),
        CollaborationCaret.configure({
          provider,
          user: { name: userName, color: userColor },
        }),
      ],
      editable,
      immediatelyRender: false,
    },
    [provider],
  );

  if (!editor) {
    return (
      <div className="relative z-10 h-11 shrink-0 border-b border-white/10 bg-black/25 backdrop-blur-xl" />
    );
  }

  return (
    <>
      <Toolbar editor={editor} editable={editable} />

      {!editable && (
        <div className="relative z-10 border-b border-white/10 bg-accent/15 px-4 py-1.5 text-center text-xs font-medium text-accent">
          You have view-only access to this document.
        </div>
      )}

      <div className="relative z-10 flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto my-8 w-full max-w-[816px] px-2 sm:px-4">
            <div className="paper-page animate-page-in min-h-[80vh] px-6 py-12 sm:min-h-[1056px] sm:px-16 sm:py-14">
              <EditorContent editor={editor} />
            </div>
          </div>
        </main>

        {commentsOpen && (
          <CommentsPanel
            docId={docId}
            currentUserId={currentUserId}
            canComment={canComment}
            onClose={onCloseComments}
          />
        )}
      </div>
    </>
  );
}

function Toolbar({
  editor,
  editable,
}: {
  editor: ReturnType<typeof useEditor>;
  editable: boolean;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      underline: e?.isActive("underline") ?? false,
      strike: e?.isActive("strike") ?? false,
      bulletList: e?.isActive("bulletList") ?? false,
      orderedList: e?.isActive("orderedList") ?? false,
      blockquote: e?.isActive("blockquote") ?? false,
      codeBlock: e?.isActive("codeBlock") ?? false,
      link: e?.isActive("link") ?? false,
      heading: e?.isActive("heading")
        ? (e.getAttributes("heading").level as number)
        : 0,
    }),
  });

  if (!editor) {
    return (
      <div className="relative z-10 h-11 shrink-0 border-b border-white/10 bg-black/25 backdrop-blur-xl" />
    );
  }

  function toggleLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }

  function setHeading(level: number) {
    if (!editable) return;
    if (level === 0) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().setHeading({ level: level as 1 | 2 | 3 }).run();
    }
  }

  return (
    <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-0.5 border-b border-white/10 bg-black/25 px-3 py-2 backdrop-blur-xl sm:px-6">
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!state.canUndo || !editable}
        title="Undo (Ctrl+Z)"
        label="Undo"
      >
        <UndoIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!state.canRedo || !editable}
        title="Redo (Ctrl+Y)"
        label="Redo"
      >
        <RedoIcon />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-hairline" />

      <select
        value={state.heading}
        onChange={(e) => setHeading(Number(e.target.value))}
        disabled={!editable}
        className="h-8 rounded-lg border border-white/15 bg-white/10 px-2.5 text-sm text-ink outline-none transition hover:border-white/30 focus:border-accent/70 disabled:opacity-50"
        aria-label="Text style"
      >
        <option value={0} className="bg-canvas text-ink">Normal text</option>
        <option value={1} className="bg-canvas text-ink">Heading 1</option>
        <option value={2} className="bg-canvas text-ink">Heading 2</option>
        <option value={3} className="bg-canvas text-ink">Heading 3</option>
      </select>

      <div className="mx-1 h-5 w-px bg-hairline" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={state.bold}
        disabled={!editable}
        title="Bold (Ctrl+B)"
        label="Bold"
      >
        <BoldIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={state.italic}
        disabled={!editable}
        title="Italic (Ctrl+I)"
        label="Italic"
      >
        <ItalicIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={state.underline}
        disabled={!editable}
        title="Underline (Ctrl+U)"
        label="Underline"
      >
        <UnderlineIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={state.strike}
        disabled={!editable}
        title="Strikethrough"
        label="Strikethrough"
      >
        <StrikeIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={toggleLink}
        active={state.link}
        disabled={!editable}
        title="Insert link"
        label="Insert link"
      >
        <LinkIcon />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-hairline" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={state.bulletList}
        disabled={!editable}
        title="Bulleted list"
        label="Bulleted list"
      >
        <BulletListIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={state.orderedList}
        disabled={!editable}
        title="Numbered list"
        label="Numbered list"
      >
        <OrderedListIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={state.blockquote}
        disabled={!editable}
        title="Quote"
        label="Quote"
      >
        <QuoteIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={state.codeBlock}
        disabled={!editable}
        title="Code block"
        label="Code block"
      >
        <CodeIcon />
      </ToolbarButton>

      <div className="ml-auto flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          disabled={!editable}
          title="Clear formatting"
          label="Clear formatting"
        >
          <ClearFormattingIcon />
        </ToolbarButton>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-ink transition hover:bg-white/10"
          title="Sign out"
          aria-label="Sign out"
        >
          <SignOutIcon />
        </button>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-ink transition hover:bg-white/10 disabled:opacity-35 disabled:hover:bg-transparent ${
        active ? "bg-white/15 text-accent" : ""
      }`}
    >
      {children}
    </button>
  );
}

function TopBar({
  title,
  onTitleChange,
  onTitleBlur,
  titleSaved,
  status,
  onlineUsers,
  isOwner,
  canShare,
  onShare,
  onToggleComments,
  commentsOpen,
  currentUserName,
  currentUserColor,
}: {
  title: string;
  onTitleChange: (t: string) => void;
  onTitleBlur: () => void;
  titleSaved: boolean;
  status: "connecting" | "connected" | "error";
  onlineUsers: OnlineUser[];
  isOwner: boolean;
  canShare: boolean;
  onShare: () => void;
  onToggleComments: () => void;
  commentsOpen: boolean;
  currentUserName: string;
  currentUserColor: string;
}) {
  const initials = currentUserName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="relative z-10 flex h-16 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/10 bg-black/25 px-3 backdrop-blur-xl sm:px-6">
      <BrandLink />

      <div className="flex min-w-0 flex-col">
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={() => onTitleBlur()}
          aria-label="Document title"
          className="w-full max-w-[280px] truncate rounded-lg border border-transparent bg-transparent px-2 py-0.5 text-base font-medium text-ink outline-none transition hover:border-white/20 focus:border-accent/50 focus:bg-white/10"
        />
        <div className="flex items-center gap-2 px-2 text-xs text-white/45">
          <span>
            {status === "connected"
              ? "All changes saved"
              : status === "error"
                ? "Connection lost"
                : "Connecting…"}
          </span>
          {!titleSaved && <span>· Saving title…</span>}
          {!isOwner && <span>· Shared with you</span>}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center -space-x-2">
          {onlineUsers.map((user) => (
            <div
              key={user.clientId}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-white/15"
              style={{ backgroundColor: user.color }}
              title={`${user.name} is here`}
            >
              {user.name.slice(0, 2).toUpperCase()}
            </div>
          ))}
        </div>

        <button
          onClick={onToggleComments}
          className={`rounded-lg p-2 transition hover:bg-white/10 ${
            commentsOpen ? "bg-white/15 text-accent" : "text-white/70"
          }`}
          title="Comments"
          aria-label="Toggle comments panel"
        >
          <CommentIcon />
        </button>

        <button
          onClick={onShare}
          disabled={!canShare}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#0d1f21] transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
        >
          {canShare ? "Share" : "Shared"}
        </button>

        <div
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-white/15"
          style={{ backgroundColor: currentUserColor }}
          title={`${currentUserName} (you)`}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}

function CommentsPanel({
  docId,
  currentUserId,
  canComment,
  onClose,
}: {
  docId: string;
  currentUserId: string;
  canComment: boolean;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents/${docId}/comments`)
      .then((res) => (res.ok ? res.json() : { comments: [] }))
      .then((data) => {
        if (!cancelled) {
          setComments(data.comments);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [docId]);

  async function addComment() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const res = await fetch(`/api/documents/${docId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed }),
    });
    if (res.ok) {
      const { comment } = await res.json();
      setComments((prev) => [...prev, comment]);
      setText("");
    }
  }

  async function toggleResolved(comment: Comment) {
    const res = await fetch(`/api/comments/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: !comment.resolved }),
    });
    if (res.ok) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id ? { ...c, resolved: !comment.resolved } : c,
        ),
      );
    }
  }

  async function deleteComment(comment: Comment) {
    const res = await fetch(`/api/comments/${comment.id}`, { method: "DELETE" });
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
    }
  }

  return (
    <aside className="relative z-10 flex w-full max-w-xs shrink-0 flex-col border-l border-white/10 bg-black/40 backdrop-blur-xl sm:w-80">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="font-serif text-base font-medium text-ink">Comments</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Close comments panel"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <p className="text-sm text-white/45">Loading comments…</p>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center">
            <p className="font-serif text-base text-white/80">Margins are quiet.</p>
            <p className="mt-1 text-sm text-white/40">
              Leave the first note below — or ask a collaborator to.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {comments.map((comment) => (
              <li key={comment.id} className={comment.resolved ? "opacity-50" : ""}>
                <div className="flex items-start gap-2.5">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-1 ring-white/15"
                    style={{ backgroundColor: colorForUser(comment.author.id) }}
                  >
                    {comment.author.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-xs font-semibold text-ink">
                        {comment.author.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-white/40">
                        {timeAgo(comment.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                      {comment.text}
                    </p>
                    <div className="mt-1 flex gap-2 text-xs">
                      <button
                        onClick={() => toggleResolved(comment)}
                        className="text-white/40 transition hover:text-accent"
                      >
                        {comment.resolved ? "Reopen" : "Resolve"}
                      </button>
                      {(comment.author.id === currentUserId || canComment) && (
                        <button
                          onClick={() => deleteComment(comment)}
                          className="text-white/40 transition hover:text-danger"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canComment && (
        <div className="border-t border-white/10 p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void addComment();
              }
            }}
            placeholder="Add a comment…  (Ctrl+Enter to post)"
            rows={3}
            className="w-full resize-none rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-ink placeholder:text-white/40 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/25"
          />
          <button
            onClick={() => void addComment()}
            disabled={!text.trim()}
            className="mt-2 w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#0d1f21] transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            Comment
          </button>
        </div>
      )}
    </aside>
  );
}

function ShareDialog({
  docId,
  title,
  ownerName,
  members,
  isOwner,
  onClose,
}: {
  docId: string;
  title: string;
  ownerName: string;
  members: Member[];
  isOwner: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EDITOR");
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  async function addMember() {
    if (!email.trim()) return;
    setSharing(true);
    setError(null);
    const res = await fetch(`/api/documents/${docId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    setSharing(false);
    if (res.ok) {
      setEmail("");
      window.location.reload();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not share the document.");
    }
  }

  async function removeMember(userId: string) {
    const res = await fetch(`/api/documents/${docId}/share/${userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      window.location.reload();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-24 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/15 bg-black/50 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div className="min-w-0">
            <h2 className="truncate font-serif text-xl font-medium text-ink">
              Share “{title}”
            </h2>
            <p className="mt-0.5 text-sm text-white/60">
              Owned by {ownerName} · everyone writes in real time
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="p-5">
          {isOwner ? (
            <div className="mb-5 flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-ink placeholder:text-white/40 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/25"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-lg border border-white/15 bg-white/10 px-2 py-2 text-sm text-ink outline-none transition focus:border-accent/70"
                aria-label="Role"
              >
                <option value="EDITOR" className="bg-canvas text-ink">Can edit</option>
                <option value="VIEWER" className="bg-canvas text-ink">Can view</option>
              </select>
              <button
                onClick={() => void addMember()}
                disabled={sharing || !email.trim()}
                className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#0d1f21] transition hover:bg-accent-dark disabled:opacity-40"
              >
                {sharing ? "Adding…" : "Add"}
              </button>
            </div>
          ) : (
            <p className="mb-5 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/70">
              Only the owner can add or remove members.
            </p>
          )}

          {error && (
            <p className="mb-4 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-1 ring-white/15"
                  style={{ backgroundColor: member.color }}
                >
                  {member.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {member.name}
                  </p>
                  <p className="truncate text-xs text-white/55">
                    {member.email} ·{" "}
                    {member.role === "OWNER"
                      ? "owner"
                      : member.role === "EDITOR"
                        ? "can edit"
                        : "can view"}
                  </p>
                </div>
                {isOwner && member.role !== "OWNER" && (
                  <button
                    onClick={() => void removeMember(member.id)}
                    className="rounded-md px-2 py-1 text-xs text-white/40 transition hover:bg-danger/15 hover:text-danger"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 3L2.5 6.5 6 10M3 6.5h6.5a4 4 0 014 4V12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 3l3.5 3.5L10 10M13 6.5h-6.5a4 4 0 00-4 4V12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BoldIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 2.5h4a2.5 2.5 0 010 5H5V2.5zM5 7.5h4.5a2.5 2.5 0 010 5H5v-5z" strokeLinejoin="round" />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9.5 2.5h3.5M7 13.5h3.5M10.5 2.5L7 13.5" strokeLinecap="round" />
    </svg>
  );
}

function UnderlineIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 2v5a4 4 0 008 0V2M3 13.5h10" strokeLinecap="round" />
    </svg>
  );
}

function StrikeIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 2v4h8M4 10v4h8M2.5 8h11" strokeLinecap="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6.5 9.5l3-3M7 11.5l-1 1a3 3 0 01-4.5-4l1-1M9 4.5l1-1a3 3 0 014.5 4l-1 1" strokeLinecap="round" />
    </svg>
  );
}

function BulletListIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="3" cy="4" r="1" fill="currentColor" />
      <circle cx="3" cy="8" r="1" fill="currentColor" />
      <circle cx="3" cy="12" r="1" fill="currentColor" />
      <path d="M6.5 4h7M6.5 8h7M6.5 12h7" strokeLinecap="round" />
    </svg>
  );
}

function OrderedListIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3h1v2l-1 1M6.5 4h7M6.5 8h7M6.5 12h7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.6 8.5h1.3l-1.3 2h1.3M3.2 12.5c.2.3.5.5 1 .5.7 0 1-.4 1-.9 0-.9-1.2-1-1.2-1.7 0-.5.4-.8.9-.8.4 0 .8.2 1 .4" fill="none" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 8.5V4.5h4v4H3.5a3 3 0 003 2.5v1.5a4.5 4.5 0 01-4-4zM9.5 8.5V4.5h4v4h-3a3 3 0 003 2.5v1.5a4.5 4.5 0 01-4-4z" strokeLinejoin="round" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 3.5L2.5 8 6 12.5M10 3.5l3.5 4.5L10 12.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClearFormattingIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3l10 10M9.5 5.5L10.8 2.5h3.2M7 10.5l-1 3h5M6 5.5L5 8.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2.5h2.5a1 1 0 011 1v9a1 1 0 01-1 1H10M6.5 8H13M10.5 5.5L13 8l-2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 4a1.5 1.5 0 011.5-1.5h8A1.5 1.5 0 0113.5 4v5a1.5 1.5 0 01-1.5 1.5H7l-3.5 3v-3A1.5 1.5 0 012.5 9V4z" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
    </svg>
  );
}