Update the existing collaborative document editor. **Inspect the current codebase first and reuse existing code.**

Keep the stack:
**Next.js + Tiptap/ProseMirror + Yjs + WebSocket + Node.js + Auth.js + PostgreSQL/Supabase.**

Use the official documentation where needed:

* Supabase Next.js: [Supabase Next.js Docs](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs?utm_source=chatgpt.com)
* Supabase migrations: [Supabase Migration Docs](https://supabase.com/docs/guides/deployment/database-migrations?utm_source=chatgpt.com)
* Supabase PostgreSQL: [Supabase Database Docs](https://supabase.com/docs/guides/database/overview?utm_source=chatgpt.com)

### Changes

1. **Supabase**

   * Move the current local PostgreSQL database to **Supabase Postgres**.
   * Preserve the existing schema and migrate it properly.
   * Use migrations rather than making unmanaged production schema changes.
   * Keep Auth.js for authentication.

2. **Yjs persistence**

   * Persist incremental Yjs binary updates in PostgreSQL.
   * Do not save the entire document on every keystroke.
   * Keep Yjs persistence separate from normal metadata.

3. **Snapshots**

   * Periodically create encoded Yjs snapshots.
   * Store snapshots in **Supabase Postgres initially**.
   * Reconstruct documents using:
     `latest snapshot + Yjs updates after snapshot`.
   * Safely compact old updates when appropriate.

4. **Active document sessions**

   * Maintain one in-memory `Y.Doc` per active `documentId`.
   * Multiple users editing the same document must share the same session.

5. **WebSocket security**

   * Authenticate WebSocket connections using Auth.js.
   * Check `document_members` before allowing access.
   * Support `owner`, `editor`, and `viewer`.
   * Viewers cannot submit document updates.

6. **Presence**

   * Use Yjs Awareness for cursors, selections, and online users.
   * Keep presence ephemeral and do not persist it.

7. **Recovery**

   * Handle WebSocket reconnects and collaboration-server restarts.
   * Restore documents from snapshot + subsequent Yjs updates.
   * Let Yjs handle CRDT conflict resolution.

Keep REST for normal operations such as documents, sharing, permissions, and comments. Realtime editing must use **Yjs + WebSocket**, not REST.

Keep the architecture simple and industry-standard. Do not add Redis, Kafka, microservices, or unnecessary infrastructure.

After implementation, briefly report:

* Updated architecture
* Supabase setup/migrations
* PostgreSQL schema changes
* Required environment variables
* How to run the project
* Any important architectural decisions
