import { SignJWT, jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? "");

export interface CollabTokenPayload {
  sub: string;
  docId: string;
}

const COLLAB_TTL = 60;

export async function signCollabToken(payload: CollabTokenPayload) {
  return new SignJWT({ docId: payload.docId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${COLLAB_TTL}s`)
    .sign(secret());
}

export async function verifyCollabToken(token: string): Promise<CollabTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.docId !== "string") return null;
    return { sub: payload.sub, docId: payload.docId };
  } catch {
    return null;
  }
}