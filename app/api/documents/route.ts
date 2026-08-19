import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.documentMember.findMany({
    where: { userId: session.user.id },
    orderBy: { document: { updatedAt: "desc" } },
    include: {
      document: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  const documents = memberships.map((m) => ({
    id: m.document.id,
    title: m.document.title,
    role: m.role,
    owner: m.document.owner,
    createdAt: m.document.createdAt,
    updatedAt: m.document.updatedAt,
  }));

  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      : "Untitled document";

  const document = await prisma.document.create({
    data: {
      title,
      ownerId: session.user.id,
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
  });

  return NextResponse.json({ document }, { status: 201 });
}