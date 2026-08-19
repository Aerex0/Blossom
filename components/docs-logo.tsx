export function DocsLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      {/* warm paper sheet */}
      <rect x="7" y="6" width="34" height="36" rx="3.5" fill="#faf6ee" />
      <path d="M31 6h4a4 4 0 014 4v3h-8V6z" fill="#eadfc4" />
      {/* hairline rule lines */}
      <path d="M14 20h20M14 25h20M14 30h13" stroke="#d2b999" strokeWidth="1.6" strokeLinecap="round" />
      {/* lamp glow */}
      <circle cx="39" cy="41" r="9" fill="#5ca3aa" opacity="0.25" />
      <circle cx="39" cy="41" r="4.2" fill="#5ca3aa" />
      <circle cx="39" cy="41" r="2" fill="#fff" opacity="0.9" />
    </svg>
  );
}