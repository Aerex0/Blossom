import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function ShareLinkPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;

  const share = await prisma.documentShare.findUnique({ where: { id: shareId } });
  if (!share) {
    notFound();
  }

  const dest = `/document/${share.documentId}?share=${share.id}`;

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(dest)}`);
  }

  redirect(dest);
}