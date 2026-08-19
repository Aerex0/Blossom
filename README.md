# Blossom

A collaborative document editor inspired by Google Docs — write together, in real time.

Multiple users can create documents, edit them simultaneously with live cursors and carets, leave comments in the margins, and share documents with editors or viewers. All clients converge on the same state through CRDT-based synchronization, so there are no merge conflicts and no refreshes.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Editor | Tiptap v3 on ProseMirror |
| Collaboration | Yjs (CRDT), y-websocket, y-protocols |
| Realtime transport | WebSocket (custom collaboration server) |
| Backend | Next.js API routes, Auth.js v5 (credentials + JWT) |
| Database | PostgreSQL via Prisma 7 (driver adapters) |

## Architecture

```
Browser
├── Tiptap editor ── ProseMirror ── Yjs
│                                     │
│            WebSocket (Yjs updates)  │
│                                     ▼
│                            Collaboration Server
│                                     │
│                                     ▼
│                            PostgreSQL (persisted state)
│
├── REST API (documents, sharing, comments, auth)
```

Two communication paths:

- **Realtime path** — keystrokes flow Tiptap → ProseMirror → Yjs → WebSocket → collaboration server → other connected clients. Yjs handles concurrent edits, conflict resolution and convergence.
- **Application path** — REST API calls for non-realtime operations (create/rename/delete documents, share, comments, auth).

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (a Docker container works well)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Then fill in the values:

```bash
DATABASE_URL="postgresql://docs:docs@localhost:5432/docs"
AUTH_SECRET="openssl rand -base64 32"
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_WS_URL="ws://localhost:1234"
COLLAB_PORT=1234
```

### 3. Set up the database

```bash
npm run db:generate
npm run db:migrate
```

### 4. Start the collaboration server

```bash
npm run dev:collab
```

### 5. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create an account, create a document, and open the same document in a second browser/tab to see live collaboration.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run dev:collab` | Start the WebSocket collaboration server (with watch) |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |

## Features

- **Real-time collaborative editing** — CRDT-based (Yjs); concurrent edits from multiple users merge and converge automatically
- **Live presence** — cursors, carets and selections of other collaborators, plus an online-users indicator
- **Rich text editor** — headings, bold/italic/underline/strikethrough, lists, quotes, code blocks, links, undo/redo
- **Comments** — threaded notes with resolve/delete, tied to documents
- **Sharing & roles** — share by email with `EDITOR` or `VIEWER` access; only the owner can manage sharing or delete
- **Document management** — create, rename, delete, and browse documents with last-edited info; shared documents are visually flagged
- **Authentication** — Auth.js credentials provider with bcrypt-hashed passwords and JWT sessions

## Project Structure

```
app/
├── api/                  # REST API routes (auth, documents, sharing, comments, collab token)
├── document/[id]/        # Editor page (editor, toolbar, comments panel, share dialog)
├── documents/            # Document list ("desk") page
├── login/ signup/        # Auth pages
├── page.tsx              # Landing page
└── globals.css           # Theme (beach palette), paper page, editor typography
auth.ts                   # Auth.js configuration
server/collab-server.ts   # Standalone WebSocket collaboration server
lib/                      # Prisma client, permissions, WS token signing, user colors
prisma/schema.prisma      # Database schema
components/               # Brand logo, brand link
public/imgs/              # Background images
```

## Database Schema

- **users** — id, name, email, passwordHash, timestamps
- **documents** — id, title, ownerId, `content` (bytea, serialized Yjs update), timestamps
- **document_members** — documentId, userId, role (`OWNER` / `EDITOR` / `VIEWER`)
- **comments** — id, documentId, authorId, text, resolved, timestamps

Document content is persisted as Yjs updates (Uint8Array), written by the collaboration server when clients stop sending changes.

## How Realtime Editing Works

1. The editor page fetches a short-lived JWT from `/api/collab/token` and connects a `WebsocketProvider` to the collaboration server.
2. Keystrokes produce ProseMirror transactions, which the Tiptap Collaboration extension applies to the shared `Y.Doc`.
3. Yjs encodes the changes and sends them over the WebSocket; the server broadcasts them to every other client in the document room.
4. Incoming updates are applied locally and rendered by Tiptap — other users see the change instantly, including remote carets.
5. The server persists the full document state (debounced) to PostgreSQL.

## License

Private project.