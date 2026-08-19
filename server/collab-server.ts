import "dotenv/config";
import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import { prisma } from "@/lib/prisma";
import { verifyCollabToken } from "@/lib/ws-token";

const PORT = Number(process.env.COLLAB_PORT ?? 1234);

const messageSync = 0;
const messageAwareness = 1;

const FLUSH_INTERVAL_MS = 2000;
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const SNAPSHOT_UPDATE_THRESHOLD = 100;

interface Room {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Set<WebSocket>;
  pending: Uint8Array[];
  updateCount: number;
  flushTimer: NodeJS.Timeout | null;
  snapshotTimer: NodeJS.Timeout | null;
}

const rooms = new Map<string, Room>();

function sendMessage(conn: WebSocket, message: Uint8Array) {
  if (conn.readyState === WebSocket.OPEN) {
    conn.send(message, { binary: true });
  }
}

function broadcastUpdate(room: Room, update: Uint8Array, origin: WebSocket | null) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);
  for (const client of room.clients) {
    if (client !== origin) {
      sendMessage(client, message);
    }
  }
}

function broadcastAwareness(room: Room, changed: Array<number> | null) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageAwareness);
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(
      room.awareness,
      changed ?? Array.from(room.awareness.getStates().keys()),
    ),
  );
  const message = encoding.toUint8Array(encoder);
  for (const client of room.clients) {
    sendMessage(client, message);
  }
}

async function flushUpdates(room: Room, docId: string) {
  room.flushTimer = null;
  if (room.pending.length === 0) return;
  const merged = Y.mergeUpdates(room.pending);
  room.pending = [];
  try {
    await prisma.yjsUpdate.create({
      data: { documentId: docId, update: Buffer.from(merged) },
    });
  } catch (err) {
    console.error(`Failed to persist updates for ${docId}:`, err);
  }
}

function scheduleFlush(room: Room, docId: string) {
  if (room.flushTimer) return;
  room.flushTimer = setTimeout(() => {
    void flushUpdates(room, docId);
  }, FLUSH_INTERVAL_MS);
}

async function takeSnapshot(room: Room, docId: string) {
  room.snapshotTimer = null;
  const snapshot = Y.encodeStateAsUpdate(room.doc);

  const maxSeq = await prisma.yjsUpdate
    .aggregate({ where: { documentId: docId }, _max: { seq: true } })
    .then((r) => r._max.seq)
    .catch(() => null);

  try {
    await prisma.$transaction([
      prisma.yjsSnapshot.upsert({
        where: { documentId: docId },
        update: { snapshot: Buffer.from(snapshot), seq: maxSeq ?? BigInt(0) },
        create: {
          documentId: docId,
          snapshot: Buffer.from(snapshot),
          seq: maxSeq ?? BigInt(0),
        },
      }),
      ...(maxSeq !== null
        ? [
            prisma.yjsUpdate.deleteMany({
              where: { documentId: docId, seq: { lte: maxSeq } },
            }),
          ]
        : []),
    ]);
    room.updateCount = 0;
  } catch (err) {
    console.error(`Failed to snapshot ${docId}:`, err);
  }
}

function maybeScheduleSnapshot(room: Room, docId: string) {
  if (room.updateCount >= SNAPSHOT_UPDATE_THRESHOLD) {
    void takeSnapshot(room, docId);
  } else if (!room.snapshotTimer) {
    room.snapshotTimer = setTimeout(() => {
      void takeSnapshot(room, docId);
    }, SNAPSHOT_INTERVAL_MS);
  }
}

async function loadDocument(docId: string): Promise<Room> {
  const [snapshot, updates] = await Promise.all([
    prisma.yjsSnapshot.findUnique({ where: { documentId: docId } }),
    prisma.yjsUpdate.findMany({
      where: { documentId: docId },
      orderBy: { seq: "asc" },
      select: { seq: true, update: true },
    }),
  ]);

  const doc = new Y.Doc();
  let applied = 0;

  if (snapshot) {
    Y.applyUpdate(doc, new Uint8Array(snapshot.snapshot));
    applied = Number(snapshot.seq);
  }

  const after = updates
    .filter((u) => u.seq > BigInt(applied))
    .map((u) => new Uint8Array(u.update));
  if (after.length > 0) {
    Y.applyUpdate(doc, Y.mergeUpdates(after));
  }

  const room: Room = {
    doc,
    awareness: new awarenessProtocol.Awareness(doc),
    clients: new Set(),
    pending: [],
    updateCount: updates.length,
    flushTimer: null,
    snapshotTimer: null,
  };

  doc.on("update", (update: Uint8Array, origin) => {
    broadcastUpdate(room, update, origin === undefined ? null : (origin as WebSocket));
    room.pending.push(update);
    room.updateCount += 1;
    scheduleFlush(room, docId);
    maybeScheduleSnapshot(room, docId);
  });

  return room;
}

async function setupConnection(conn: WebSocket, request: import("http").IncomingMessage) {
  conn.binaryType = "arraybuffer";

  const url = new URL(request.url ?? "/", "http://localhost");
  const token = url.searchParams.get("token");
  if (!token) {
    conn.close(4401, "Missing authentication token");
    return;
  }

  const payload = await verifyCollabToken(token);
  if (!payload) {
    conn.close(4401, "Invalid or expired token");
    return;
  }

  const { docId, sub: userId, role } = payload;

  // Server-side membership check; share-link holders are authorized by the
  // token (issued only after validating the link), re-checked here via the
  // share id passed in the connection URL.
  const member = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: docId, userId } },
    select: { role: true },
  });

  if (!member) {
    const shareId = url.searchParams.get("share");
    const share = shareId
      ? await prisma.documentShare.findUnique({ where: { id: shareId } })
      : null;
    if (!share || share.documentId !== docId) {
      conn.close(4403, "You do not have access to this document");
      return;
    }
  }

  let room = rooms.get(docId);
  if (!room) {
    room = await loadDocument(docId);
    rooms.set(docId, room);
  }

  room.clients.add(conn);

  conn.on("close", () => {
    room.clients.delete(conn);
    if (room.clients.size === 0) {
      if (room.flushTimer) clearTimeout(room.flushTimer);
      if (room.snapshotTimer) clearTimeout(room.snapshotTimer);
      void flushUpdates(room, docId).finally(() => {
        rooms.delete(docId);
      });
    }
  });

  conn.on("error", () => {
    conn.close();
  });

  conn.on("message", (data) => {
    const message = new Uint8Array(data as ArrayBuffer);
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);
    const encoder = encoding.createEncoder();

    switch (messageType) {
      case messageSync: {
        const syncMessageType = decoding.readVarUint(decoder);
        switch (syncMessageType) {
          case syncProtocol.messageYjsSyncStep1:
            encoding.writeVarUint(encoder, messageSync);
            syncProtocol.readSyncStep1(decoder, encoder, room.doc);
            if (encoding.length(encoder) > 1) {
              sendMessage(conn, encoding.toUint8Array(encoder));
            }
            break;
          case syncProtocol.messageYjsSyncStep2:
            syncProtocol.readSyncStep2(decoder, room.doc, conn);
            break;
          case syncProtocol.messageYjsUpdate:
            if (role === "VIEWER") {
              // Viewers can observe but not submit document updates.
              break;
            }
            syncProtocol.readUpdate(decoder, room.doc, conn);
            break;
          default:
            break;
        }
        break;
      }
      case messageAwareness: {
        const update = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(room.awareness, update, conn);
        broadcastAwareness(room, null);
        break;
      }
      default:
        break;
    }
  });

  const init = encoding.createEncoder();
  encoding.writeVarUint(init, messageSync);
  syncProtocol.writeSyncStep1(init, room.doc);
  sendMessage(conn, encoding.toUint8Array(init));

  const states = room.awareness.getStates();
  if (states.size > 0) {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, messageAwareness);
    encoding.writeVarUint8Array(
      enc,
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(states.keys())),
    );
    sendMessage(conn, encoding.toUint8Array(enc));
  }
}

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (conn, request) => {
  void setupConnection(conn, request);
});

wss.on("error", (err) => {
  console.error("WebSocket server error:", err);
});

console.log(`Collaboration server listening on ws://localhost:${PORT}`);