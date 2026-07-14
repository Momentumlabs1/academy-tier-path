/**
 * ZekoMascot — the Zeko Global brand character, hand-built as a crisp vector
 * (1:1 from the brand avatar). Scales to any size, theme-independent.
 */
export function ZekoMascot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Zeko character">
      <defs>
        <clipPath id="zeko-circ"><circle cx="200" cy="200" r="196" /></clipPath>
      </defs>
      <circle cx="200" cy="200" r="198" fill="#e7ddc8" />
      <circle cx="200" cy="200" r="196" fill="#efe7d6" />
      <g clipPath="url(#zeko-circ)" stroke="#2a2622" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round">
        <path d="M150 250 q-30 -6 -34 26 q26 8 40 -8 Z" fill="#8aa588" />
        <path d="M250 250 q30 -6 34 26 q-26 8 -40 -8 Z" fill="#8aa588" />
        <path d="M104 372 C104 250 150 230 200 230 C250 230 296 250 296 372 Z" fill="#95af92" />
        <path d="M182 232 q18 20 36 0 q-4 16 -18 16 q-14 0 -18 -16 Z" fill="#7e997c" strokeWidth="5" />
        <line x1="188" y1="248" x2="186" y2="286" strokeWidth="5" />
        <line x1="212" y1="248" x2="214" y2="286" strokeWidth="5" />
        <circle cx="185" cy="290" r="5" fill="#2a2622" stroke="none" />
        <circle cx="215" cy="290" r="5" fill="#2a2622" stroke="none" />
        <path d="M148 316 h104 a10 10 0 0 1 10 10 v34 h-124 v-34 a10 10 0 0 1 10 -10 Z" fill="#8aa588" strokeWidth="6" />
        <line x1="150" y1="322" x2="176" y2="342" strokeWidth="5" />
        <line x1="250" y1="322" x2="224" y2="342" strokeWidth="5" />
        <ellipse cx="200" cy="182" rx="60" ry="63" fill="#f6f1e7" />
        <circle cx="181" cy="186" r="6.5" fill="#2a2622" stroke="none" />
        <circle cx="219" cy="186" r="6.5" fill="#2a2622" stroke="none" />
        <path d="M186 206 q14 12 28 0" fill="none" strokeWidth="5" />
        <path d="M244 120 q54 -6 62 20 q-30 14 -66 4 Z" fill="#33322f" />
        <path d="M132 150 q0 -78 68 -78 q68 0 68 78 q-68 22 -136 0 Z" fill="#33322f" />
        <rect x="188" y="128" width="24" height="16" rx="4" fill="#4a4844" strokeWidth="5" />
        <circle cx="200" cy="136" r="4.5" fill="#efe7d6" strokeWidth="3" />
      </g>
    </svg>
  );
}
