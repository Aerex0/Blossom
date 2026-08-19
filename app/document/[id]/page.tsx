import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { colorForUser } from "@/lib/colors";
import { EditorClient } from "./editor";

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ share?: string }>;
}) {
  const { id } = await params;
  const { share } = await searchParams;

  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const member = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
  });

  let accessRole: string | null = member?.role ?? null;
  let shareId: string | null = null;

  if (!member && share) {
    const shareLink = await prisma.documentShare.findUnique({
      where: { id: share },
    });
    if (shareLink && shareLink.documentId === id) {
      accessRole = shareLink.role;
      shareId = shareLink.id;
    }
  }

  if (!accessRole) {
    notFound();
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
    notFound();
  }

  return (
    <EditorClient
      docId={id}
      initialTitle={document.title}
      role={accessRole}
      isOwner={document.ownerId === session.user.id}
      shareId={shareId}
      ownerName={document.owner.name}
      members={document.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        color: colorForUser(m.user.id),
      }))}
      currentUserId={session.user.id}
      currentUserName={session.user.name ?? session.user.email ?? "You"}
    />
  );
}