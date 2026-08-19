import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/permissions";

async function getMembership(docId: string, userId: string) {
  return prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: docId, userId } },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const member = await getMembership(id, session.user.id);
  if (!member) {
    return NextResponse.json(
      { error: "You do not have access to this document." },
      { status: 403 },
    );
  }

  const comments = await prisma.comment.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      text: c.text,
      resolved: c.resolved,
      createdAt: c.createdAt,
      author: c.user,
    })),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const member = await getMembership(id, session.user.id);
  if (!member) {
    return NextResponse.json(
      { error: "You do not have access to this document." },
      { status: 403 },
    );
  }
  if (!canEdit(member.role)) {
    return NextResponse.json(
      { error: "Viewers cannot add comments to this document." },
      { status: 403 },
    );
  }

  let body: { text?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Comment text is required." }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: { documentId: id, userId: session.user.id, text },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(
    {
      comment: {
        id: comment.id,
        text: comment.text,
        resolved: comment.resolved,
        createdAt: comment.createdAt,
        author: comment.user,
      },
    },
    { status: 201 },
  );
}