import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; userId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, userId } = await context.params;

  const member = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
  });
  if (!member || !canManage(member.role)) {
    return NextResponse.json(
      { error: "Only the owner can manage sharing for this document." },
      { status: 403 },
    );
  }

  const target = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId } },
  });
  if (!target) {
    return NextResponse.json(
      { error: "That user is not a member of this document." },
      { status: 404 },
    );
  }
  if (target.role === "OWNER") {
    return NextResponse.json(
      { error: "The owner cannot be removed." },
      { status: 400 },
    );
  }

  await prisma.documentMember.delete({
    where: { documentId_userId: { documentId: id, userId } },
  });

  return new NextResponse(null, { status: 204 });
}