import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const member = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
  });
  if (!canManage(member?.role)) {
    return NextResponse.json(
      { error: "Only the owner can manage share links." },
      { status: 403 },
    );
  }

  const shares = await prisma.documentShare.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    shares: shares.map((s) => ({
      id: s.id,
      role: s.role,
      createdAt: s.createdAt,
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
  const member = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
  });
  if (!canManage(member?.role)) {
    return NextResponse.json(
      { error: "Only the owner can manage share links." },
      { status: 403 },
    );
  }

  let body: { role?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const role = body.role === "EDITOR" ? "EDITOR" : "VIEWER";

  const share = await prisma.documentShare.create({
    data: { documentId: id, role },
  });

  return NextResponse.json(
    {
      share: { id: share.id, role: share.role, createdAt: share.createdAt },
    },
    { status: 201 },
  );
}