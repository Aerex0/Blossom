# Blossom

A collaborative document editor inspired by Google Docs — write together, in real time.

Multiple users can create documents, edit them simultaneously with live cursors and carets, leave comments, and share documents with editors or viewers. All clients converge on the same state through CRDT-based synchronization, so there are no merge conflicts and no refreshes.

## Screenshots

### Home

<img src="screenshots/Home.png" width="600" alt="Blossom home page" />

### Log in

<img src="screenshots/LogIn.png" width="600" alt="Blossom log in page" />

### Documents

<img src="screenshots/Documents.png" width="600" alt="Blossom documents desk" />

### Editor

<img src="screenshots/Document.png" width="600" alt="Blossom document editor" />

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Editor | Tiptap v3 on ProseMirror |
| Collaboration | Yjs (CRDT), y-websocket, y-protocols |
| Realtime transport | WebSocket (custom collaboration server) |
| Backend | Next.js API routes, Auth.js v5 (credentials + JWT) |
| Database | PostgreSQL (hosted on Supabase) via Prisma 7 (driver adapters) |

## Architecture

```mermaid
flowchart TB
    subgraph Browser["Browser"]
        UI["Tiptap Editor"] --> PM["ProseMirror"] --> Y["Yjs"]
        API["REST API"]
    end

    WS["WebSocket"]
    CS["Collaboration Server<br/>(rooms, roles, persistence)"]
    DB[("Supabase PostgreSQL")]

    Y <-->|"Realtime Yjs updates"| WS
    WS <--> CS
    CS --> DB

    API -->|"Auth, documents,<br/>share links, comments"| DB
```

Two communication paths:

- **Realtime path** — keystrokes flow Tiptap → ProseMirror → Yjs → WebSocket → collaboration server → other connected clients. Yjs handles concurrent edits, conflict resolution and convergence.
- **Application path** — REST API calls for non-realtime operations (create/rename/delete documents, share, share links, comments, auth).

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project with its Postgres database enabled (free tier is fine)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Then fill in the values (get the pooler connection string from Supabase → Database → Connection settings):

```bash
# Use the pooler host aws-0-<region>.pooler.supabase.com
# Port 5432 = session pooler (used by the app and for migrations)
# Port 6543 = transaction pooler (alternative for runtime)
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
AUTH_SECRET="openssl rand -base64 32"
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_WS_URL="ws://localhost:1234"
COLLAB_PORT=1234
```

URL-encode special characters in the password (e.g. `@` → `%40`).

### 3. Set up the database

```bash
npm run db:generate
DATABASE_URL="<your-session-pooler-url>:5432/postgres" npx prisma migrate deploy
```

`prisma migrate dev` does not work through the pooler (it needs a shadow database); use `migrate deploy` with the session pooler URL instead.

### 4. Start the collaboration server

```bash
npm run dev:collab
```

### 5. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create an account, create a document, and open the same document in a second browser/tab to see live collaboration.

### Docker (dev)

```bash
docker compose up --build
```

Runs the Next.js app and collaboration server in separate containers with hot reload. Both read from `.env`.

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
| `npm run db:migrate` | Apply migrations with `prisma migrate dev` (local Postgres only; use `migrate deploy` against Supabase) |
| `npm run db:studio` | Open Prisma Studio |

## Features

- **Real-time collaborative editing** — CRDT-based (Yjs); concurrent edits from multiple users merge and converge automatically
- **Live presence** — cursors, carets and selections of other collaborators, plus an online-users indicator
- **Rich text editor** — headings, bold/italic/underline/strikethrough, lists, quotes, code blocks, links, undo/redo
- **Comments** — side-panel notes with resolve/delete, tied to documents
- **Sharing & roles** — share by email with `EDITOR` or `VIEWER` access, or create a revocable share link (`/s/<id>`) that grants anyone with the link `VIEWER`/`EDITOR` access without an account match; only the owner can manage sharing or delete
- **Document management** — create, rename, delete, and browse documents with last-edited info; shared documents are visually flagged
- **Authentication** — Auth.js credentials provider with bcrypt-hashed passwords and JWT sessions

## Project Structure

```
.
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/
│   │   │   │   └── route.ts           # Auth.js catch-all (login, session, CSRF)
│   │   │   └── signup/
│   │   │       └── route.ts           # POST — register new user
│   │   ├── collab/
│   │   │   └── token/
│   │   │       └── route.ts           # POST — issue short-lived JWT for WS auth
│   │   ├── comments/
│   │   │   └── [id]/
│   │   │       └── route.ts           # PATCH / DELETE — update or resolve a comment
│   │   └── documents/
│   │       ├── [id]/
│   │       │   ├── comments/
│   │       │   │   └── route.ts       # GET / POST — document comments
│   │       │   ├── share/
│   │       │   │   ├── [userId]/
│   │       │   │   │   └── route.ts   # DELETE — remove a specific member
│   │       │   │   └── route.ts       # GET / PUT / DELETE — manage member roles
│   │       │   ├── share-link/
│   │       │   │   ├── [shareId]/
│   │       │   │   │   └── route.ts   # GET / DELETE — resolve or revoke a share link
│   │       │   │   └── route.ts       # POST — create a share link
│   │       │   └── route.ts           # GET / PATCH / DELETE — single document CRUD
│   │       └── route.ts               # GET (list) / POST (create)
│   ├── document/
│   │   └── [id]/
│   │       ├── editor.tsx             # Client — Tiptap editor, toolbar, comments, share dialog
│   │       └── page.tsx               # Server — fetches doc metadata, renders EditorClient
│   ├── documents/
│   │   ├── documents-client.tsx       # Client — document list, create/rename/delete
│   │   └── page.tsx                   # Server — fetches user's documents, renders desk
│   ├── login/
│   │   ├── login-form.tsx             # Client — email/password form
│   │   └── page.tsx                   # Login page wrapper
│   ├── s/
│   │   └── [shareId]/
│   │       └── page.tsx               # Share-link landing — resolves link, redirects or opens doc
│   ├── signup/
│   │   ├── page.tsx                   # Signup page wrapper
│   │   └── signup-form.tsx            # Client — name/email/password form
│   ├── globals.css                    # Tailwind base, theme (beach palette), editor typography
│   ├── layout.tsx                     # Root layout — fonts, metadata, providers
│   ├── page.tsx                       # Landing / marketing page
│   └── providers.tsx                  # SessionProvider wrapper for client components
├── server/
│   └── collab-server.ts               # Standalone WebSocket server — rooms, Yjs sync, persistence, viewer blocking
├── lib/
│   ├── colors.ts                      # Deterministic user color palette for presence
│   ├── permissions.ts                 # Role ranking, owner/editor/viewer permission checks
│   ├── prisma.ts                      # Singleton PrismaClient (with PrismaPg adapter)
│   └── ws-token.ts                    # Sign and verify short-lived JWTs for WS auth
├── prisma/
│   ├── migrations/
│   │   ├── 20260819110050_init/
│   │   │   └── migration.sql          # Initial schema (users, documents, members, comments)
│   │   ├── 20260820120000_yjs_persistence_snapshots_share_links/
│   │   │   └── migration.sql          # Add yjs_updates, yjs_snapshots, document_shares
│   │   └── migration_lock.toml        # Prisma migration lock
│   └── schema.prisma                  # Database schema
├── components/
│   ├── brand-link.tsx                 # Logo link (used in headers)
│   └── docs-logo.tsx                  # SVG logo component
├── types/
│   └── next-auth.d.ts                 # Auth.js type augmentation (session.user.id, session.user.role)
├── public/
│   └── imgs/                          # Background images for pages
├── screenshots/                       # README screenshots (Home, LogIn, Documents, Document)
├── auth.ts                            # Auth.js config — CredentialsProvider, JWT strategy, session callback
├── next.config.ts                     # Next.js config
├── tsconfig.json                      # TypeScript config (@/ path alias)
├── prisma.config.ts                   # Prisma config (driver adapter)
├── eslint.config.mjs                  # ESLint flat config
├── postcss.config.mjs                 # PostCSS + Tailwind plugin
├── Dockerfile                         # Multi-stage build (deps → builder → runner)
├── docker-compose.yaml                # Dev — separate app and collab containers
├── .dockerignore                      # Exclude node_modules, .next, .git, .env
├── .env.example                       # Template for required env vars
└── package.json                       # Dependencies, scripts
```

## Database Schema

- **users** — id, name, email, passwordHash, timestamps
- **documents** — id, title, ownerId, timestamps
- **document_members** — documentId, userId, role (`OWNER` / `EDITOR` / `VIEWER`)
- **document_shares** — id, documentId, role, createdAt (share links, no expiry)
- **yjs_updates** — id, documentId, seq (autoincrement), update (bytea), createdAt
- **yjs_snapshots** — documentId (unique), seq, snapshot (bytea), createdAt
- **comments** — id, documentId, authorId, text, resolved, timestamps

Document content is never stored as a whole. The collaboration server writes incremental Yjs binary updates (`yjs_updates`) and periodically stores a compacted snapshot (`yjs_snapshots`), after which older updates are pruned. Restoring a document = latest snapshot + all updates after it.

## How Realtime Editing Works

1. The editor page fetches a short-lived JWT (with the user's role) from `/api/collab/token` and connects a `WebsocketProvider` to the collaboration server.
2. Keystrokes produce ProseMirror transactions, which the Tiptap Collaboration extension applies to the shared `Y.Doc`.
3. Yjs encodes the changes and sends them over the WebSocket; the server broadcasts them to every other client in the document room.
4. Incoming updates are applied locally and rendered by Tiptap — other users see the change instantly, including remote carets.
5. The server buffers updates, merges them, and flushes them to `yjs_updates` every 2 s. Every 100 updates or 5 min of activity it takes a snapshot and compacts older updates.
6. Viewers (role from the token) can connect, sync, and see presence, but the server drops any document updates they submit.

## License

[MIT](LICENSE) — free to use, modify and distribute.