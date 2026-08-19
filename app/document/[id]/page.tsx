import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { colorForUser } from "@/lib/colors";
import { EditorClient } from "./editor";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const member = await prisma.documentMember.findUnique({
    where: { documentId_userId: { documentId: id, userId: session.user.id } },
  });
  if (!member) {
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
      role={member.role}
      isOwner={document.ownerId === session.user.id}
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