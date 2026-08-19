import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit, canManage } from "@/lib/permissions";
import { colorForUser } from "@/lib/colors";

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

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  return NextResponse.json({
    document: {
      id: document.id,
      title: document.title,
      role: member.role,
      owner: document.owner,
      members: document.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        color: colorForUser(m.user.id),
      })),
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    },
  });
}

export async function PATCH(
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
      { error: "You do not have permission to edit this document." },
      { status: 403 },
    );
  }

  let body: { title?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : undefined;
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const document = await prisma.document.update({
    where: { id },
    data: { title },
  });

  return NextResponse.json({ document });
}

export async function DELETE(
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
  if (!canManage(member.role)) {
    return NextResponse.json(
      { error: "Only the owner can delete this document." },
      { status: 403 },
    );
  }

  await prisma.document.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}