export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-xl font-bold text-forest ${className}`}>
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <path d="M5 19c-3-6 1-14 8-14s10 6 7 11-9 5-9 1 5-4 6-1" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="5" cy="19" r="2.4" fill="#CF8A3C" />
      </svg>
      Run Club
    </span>
  );
}
