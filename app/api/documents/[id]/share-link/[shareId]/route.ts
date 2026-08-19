import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; shareId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, shareId } = await context.params;
  const member = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
  });
  if (!canManage(member?.role)) {
    return NextResponse.json(
      { error: "Only the owner can manage share links." },
      { status: 403 },
    );
  }

  const share = await prisma.documentShare.findUnique({ where: { id: shareId } });
  if (!share || share.documentId !== id) {
    return NextResponse.json({ error: "Share link not found." }, { status: 404 });
  }

  await prisma.documentShare.delete({ where: { id: shareId } });
  return new NextResponse(null, { status: 204 });
}