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

interface Room {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Set<WebSocket>;
  saveTimer: NodeJS.Timeout | null;
  dirty: boolean;
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

async function persistRoom(room: Room, docId: string) {
  if (!room.dirty) return;
  room.dirty = false;
  const update = Y.encodeStateAsUpdate(room.doc);
  await prisma.document.update({
    where: { id: docId },
    data: { content: Buffer.from(update) },
  });
}

function scheduleSave(room: Room, docId: string) {
  room.dirty = true;
  if (room.saveTimer) clearTimeout(room.saveTimer);
  room.saveTimer = setTimeout(() => {
    void persistRoom(room, docId);
  }, 2000);
}

async function loadDocument(docId: string): Promise<Room> {
  const record = await prisma.document.findUnique({
    where: { id: docId },
    select: { content: true },
  });

  const doc = new Y.Doc();
  if (record?.content) {
    Y.applyUpdate(doc, new Uint8Array(record.content));
  }

  const room: Room = {
    doc,
    awareness: new awarenessProtocol.Awareness(doc),
    clients: new Set(),
    saveTimer: null,
    dirty: false,
  };

  doc.on("update", (update: Uint8Array, origin) => {
    broadcastUpdate(room, update, origin === undefined ? null : (origin as WebSocket));
    scheduleSave(room, docId);
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

  const { docId, sub: userId } = payload;
  const member = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: docId, userId } },
  });
  if (!member) {
    conn.close(4403, "You do not have access to this document");
    return;
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
      if (room.saveTimer) clearTimeout(room.saveTimer);
      void persistRoom(room, docId).finally(() => {
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
      case messageSync:
        syncProtocol.readSyncMessage(decoder, encoder, room.doc, conn);
        if (encoding.length(encoder) > 1) {
          sendMessage(conn, encoding.toUint8Array(encoder));
        }
        break;
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