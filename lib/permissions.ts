import type { Role } from "@/src/generated/prisma/client";

export const roleRank: Record<Role, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

export function canEdit(role: Role | undefined): boolean {
  if (!role) return false;
  return roleRank[role] >= roleRank.EDITOR;
}

export function canManage(role: Role | undefined): boolean {
  if (!role) return false;
  return roleRank[role] >= roleRank.OWNER;
}