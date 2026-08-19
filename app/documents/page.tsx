import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DocumentsClient } from "./documents-client";

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const memberships = await prisma.documentMember.findMany({
    where: { userId: session.user.id },
    orderBy: { document: { updatedAt: "desc" } },
    include: {
      document: {
        include: {
          owner: { select: { id: true, name: true } },
        },
      },
    },
  });

  const documents = memberships.map((m) => ({
    id: m.document.id,
    title: m.document.title,
    role: m.role,
    ownerName: m.document.owner.name,
    isOwner: m.document.ownerId === session.user.id,
    updatedAt: m.document.updatedAt.toISOString(),
  }));

  return (
    <DocumentsClient
      userName={session.user.name ?? session.user.email ?? "You"}
      documents={documents}
    />
  );
}