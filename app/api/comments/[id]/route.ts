import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/permissions";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      document: {
        include: {
          members: { where: { userId: session.user.id } },
        },
      },
    },
  });

  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }
  const membership = comment.document.members[0];
  if (!membership || !canEdit(membership.role)) {
    return NextResponse.json(
      { error: "You do not have permission to change this comment." },
      { status: 403 },
    );
  }

  let body: { resolved?: unknown; text?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const data: { resolved?: boolean; text?: string } = {};
  if (typeof body.resolved === "boolean") data.resolved = body.resolved;
  if (typeof body.text === "string" && body.text.trim()) data.text = body.text.trim();

  if (!data.resolved && !data.text) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await prisma.comment.update({
    where: { id },
    data,
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({
    comment: {
      id: updated.id,
      text: updated.text,
      resolved: updated.resolved,
      createdAt: updated.createdAt,
      author: updated.user,
    },
  });
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
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      document: {
        include: {
          members: { where: { userId: session.user.id } },
        },
      },
    },
  });

  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  const membership = comment.document.members[0];
  const canRemove = comment.userId === session.user.id || (membership && canEdit(membership.role));
  if (!canRemove) {
    return NextResponse.json(
      { error: "You do not have permission to delete this comment." },
      { status: 403 },
    );
  }

  await prisma.comment.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}