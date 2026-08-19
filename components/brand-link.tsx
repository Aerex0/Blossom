"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { DocsLogo } from "@/components/docs-logo";

export function BrandLink({
  size = "md",
}: {
  size?: "sm" | "md";
}) {
  const { status } = useSession();
  const href = status === "authenticated" ? "/documents" : "/";

  return (
    <Link
      href={href}
      className="flex items-center gap-2.5"
      title="Blossom — home"
    >
      <DocsLogo
        className={
          size === "sm"
            ? "h-7 w-7 drop-shadow-[0_4px_10px_rgba(92,163,170,0.35)]"
            : "h-8 w-8 drop-shadow-[0_4px_10px_rgba(92,163,170,0.35)]"
        }
      />
      <span
        className={
          size === "sm"
            ? "font-serif text-base font-medium tracking-tight text-ink"
            : "font-serif text-lg font-medium tracking-tight text-ink"
        }
      >
        Blossom
      </span>
    </Link>
  );
}