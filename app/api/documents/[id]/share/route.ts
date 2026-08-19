import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";

const ROLES = ["VIEWER", "EDITOR"] as const;
type ShareRole = (typeof ROLES)[number];

async function getOwnership(docId: string, userId: string) {
  const member = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: docId, userId } },
  });
  return member && canManage(member.role) ? member : null;
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
  const owner = await getOwnership(id, session.user.id);
  if (!owner) {
    return NextResponse.json(
      { error: "Only the owner can share this document." },
      { status: 403 },
    );
  }

  let body: { email?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = typeof body.role === "string" ? body.role : "EDITOR";
  if (!email) {
    return NextResponse.json({ error: "An email address is required." }, { status: 400 });
  }
  if (!ROLES.includes(role as ShareRole)) {
    return NextResponse.json(
      { error: "Role must be one of: viewer, editor." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "No account exists for that email address." },
      { status: 404 },
    );
  }
  if (user.id === session.user.id) {
    return NextResponse.json(
      { error: "You already own this document." },
      { status: 400 },
    );
  }

  const member = await prisma.documentMember.upsert({
    where: {
      documentId_userId: { documentId: id, userId: user.id },
    },
    create: {
      documentId: id,
      userId: user.id,
      role: role as ShareRole,
    },
    update: { role: role as ShareRole },
  });

  return NextResponse.json({ member }, { status: 201 });
}