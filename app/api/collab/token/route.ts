import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { signCollabToken } from "@/lib/ws-token";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const docId = searchParams.get("docId");
  if (!docId) {
    return NextResponse.json({ error: "docId is required." }, { status: 400 });
  }

  const member = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: docId, userId: session.user.id } },
  });

  let role = member?.role;

  // Not a member? Allow access via a valid share link.
  if (!role) {
    const shareId = searchParams.get("share");
    if (shareId) {
      const share = await prisma.documentShare.findUnique({
        where: { id: shareId },
      });
      if (share && share.documentId === docId) {
        role = share.role;
      }
    }
  }

  if (!role) {
    return NextResponse.json(
      { error: "You do not have access to this document." },
      { status: 403 },
    );
  }

  const token = await signCollabToken({
    sub: session.user.id,
    docId,
    role,
  });
  return NextResponse.json({ token });
}