const PALETTE = [
  "#5ca3aa",
  "#d2b999",
  "#e0a34e",
  "#c96f6f",
  "#9ecfd4",
  "#c9a1d6",
  "#8fd4b0",
  "#7fb6c9",
];

export function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}