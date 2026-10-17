interface PokeballProps {
  size?: number
  open?: boolean
  blink?: boolean
  className?: string
}

// Pokébola desenhada em SVG; a metade de cima gira para abrir.
export function Pokeball({ size = 96, open = false, blink = false, className = '' }: PokeballProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={`${open ? 'pb-open' : ''} overflow-visible ${className}`} aria-hidden>
      <defs>
        <radialGradient id="pb-red" cx="0.35" cy="0.25" r="0.9">
          <stop offset="0" stopColor="#FF7A6B" />
          <stop offset="0.45" stopColor="#E3350D" />
          <stop offset="1" stopColor="#8E1B05" />
        </radialGradient>
        <radialGradient id="pb-white" cx="0.4" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#B9BFCC" />
        </radialGradient>
      </defs>
      <g>
        <path d="M4 50a46 46 0 0 0 92 0z" fill="url(#pb-white)" stroke="#111" strokeWidth="4" />
      </g>
      <g className="pb-top">
        <path d="M4 50a46 46 0 0 1 92 0z" fill="url(#pb-red)" stroke="#111" strokeWidth="4" />
        <ellipse cx="34" cy="22" rx="13" ry="6" fill="#fff" opacity="0.45" transform="rotate(-25 34 22)" />
      </g>
      {!open && (
        <>
          <rect x="4" y="46" width="92" height="8" fill="#111" />
          <circle cx="50" cy="50" r="14" fill="#111" />
          <circle cx="50" cy="50" r="9" fill="#F5F5F5" stroke="#111" strokeWidth="2" className={blink ? 'pb-button-blink' : ''} />
        </>
      )}
    </svg>
  )
}
