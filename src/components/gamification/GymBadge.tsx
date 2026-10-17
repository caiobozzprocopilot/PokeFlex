import { useId } from 'react'
import { BookOpen, Crown, Eye, Gem, Layers, Leaf, Lock, Map as MapIcon, Palette, Shield, Sparkles, Trophy, Zap } from 'lucide-react'
import type { BadgeIcon, BadgeShape, Tier } from '../../utils/achievements'

export const SHAPES: Record<BadgeShape, string> = {
  octagon: 'M22 5h20l17 17v20L42 59H22L5 42V22z',
  droplet: 'M32 3s21 23 21 38a21 21 0 0 1-42 0C11 26 32 3 32 3z',
  star: 'M32 3l8.2 18.6L60 23.6 45 37l4.4 20.4L32 47.2 14.6 57.4 19 37 4 23.6l19.8-2z',
  hexagon: 'M32 3l25 14.5v29L32 61 7 46.5v-29z',
  heart: 'M32 58S5 41 5 22a13.5 13.5 0 0 1 27-5 13.5 13.5 0 0 1 27 5c0 19-27 36-27 36z',
  circle: 'M32 4a28 28 0 1 1 0 56a28 28 0 1 1 0-56z',
  flame: 'M32 3c5 11 20 19 20 36a20 20 0 0 1-40 0c0-9 4.5-15 9-19 0 7 3 11 6.5 11C25 20 27.5 11 32 3z',
  diamond: 'M32 3l27 29-27 29L5 32z',
  shield: 'M32 3l25 8.5v19C57 47 46 57 32 61 18 57 7 47 7 30.5v-19z',
  bolt: 'M38 2L10 36h17l-5 26 32-37H37l7-23z',
  crown: 'M6 52V17l13 13 13-20 13 20 13-13v35z',
  pokeball: 'M32 4a28 28 0 1 1 0 56a28 28 0 1 1 0-56z',
}

// Cores do metal de cada nível: do mais claro ao mais escuro.
export const METAL: Record<Exclude<Tier, 0>, [string, string, string]> = {
  1: ['#F3C79B', '#C47F3E', '#7A4520'],
  2: ['#FFFFFF', '#C7CDD8', '#7B8494'],
  3: ['#FFF4B0', '#FFC93C', '#B7790A'],
  4: ['#B9FBFF', '#C084FC', '#F472B6'],
}

export const ICONS: Record<BadgeIcon, typeof Layers> = {
  cards: Layers,
  book: BookOpen,
  palette: Palette,
  map: MapIcon,
  sparkle: Sparkles,
  leaf: Leaf,
  crown: Crown,
  zap: Zap,
  shield: Shield,
  gem: Gem,
  trophy: Trophy,
  eye: Eye,
}

// Formatos com o "miolo" fora do centro: o ícone desce ou sobe junto.
const ICON_OFFSET: Partial<Record<BadgeShape, number>> = { crown: 0.1, droplet: 0.1, flame: 0.14, heart: -0.04 }

interface GymBadgeProps {
  shape: BadgeShape
  icon: BadgeIcon
  color: string
  tier: Tier
  size?: number
  shine?: boolean
  className?: string
}

export function GymBadge({ shape, icon, color, tier, size = 64, shine = true, className = '' }: GymBadgeProps) {
  const uid = useId().replace(/:/g, '')
  const path = SHAPES[shape]
  const Icon = ICONS[icon]
  const locked = tier === 0
  const metal = locked ? null : METAL[tier]

  return (
    <span className={`relative grid shrink-0 place-items-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size} className="absolute inset-0 overflow-visible" aria-hidden>
        <defs>
          <clipPath id={`clip-${uid}`}>
            <path d={path} />
          </clipPath>
          {metal && (
            <>
              <linearGradient id={`metal-${uid}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={metal[0]} />
                <stop offset="0.5" stopColor={metal[1]} />
                <stop offset="1" stopColor={metal[2]} />
              </linearGradient>
              <radialGradient id={`gem-${uid}`} cx="0.35" cy="0.3" r="0.8">
                <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
                <stop offset="0.25" stopColor={color} />
                <stop offset="1" stopColor={color} stopOpacity="0.55" />
              </radialGradient>
            </>
          )}
        </defs>

        {locked ? (
          <path d={path} fill="rgb(var(--raised))" stroke="rgb(var(--line))" strokeWidth="1.5" strokeDasharray="3 3" />
        ) : (
          <g style={{ filter: `drop-shadow(0 4px 10px ${color}55)` }}>
            <path d={path} fill={`url(#metal-${uid})`} />
            <path d={path} fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="1" />
            <path
              d={path}
              transform="translate(32 32) scale(0.68) translate(-32 -32)"
              fill={`url(#gem-${uid})`}
              stroke="#000"
              strokeOpacity="0.25"
              strokeWidth="1.2"
            />
            {shape === 'pokeball' && (
              <g transform="translate(32 32) scale(0.68) translate(-32 -32)" opacity="0.9">
                <path d="M4 32h56" stroke="#111" strokeWidth="4" />
                <circle cx="32" cy="32" r="8" fill="#fff" stroke="#111" strokeWidth="4" />
              </g>
            )}
            <ellipse cx="24" cy="16" rx="14" ry="6" fill="#fff" opacity="0.28" transform="rotate(-20 24 16)" />
            {shine && (
              <g clipPath={`url(#clip-${uid})`}>
                <rect className="badge-shine" x="-10" y="-20" width="14" height="100" fill="#fff" opacity="0.5" />
              </g>
            )}
          </g>
        )}
      </svg>
      {locked ? (
        <Lock size={size * 0.26} className="relative text-muted/50" aria-hidden />
      ) : (
        shape !== 'pokeball' && (
          <Icon
            size={size * 0.3}
            strokeWidth={2.4}
            className="relative text-white"
            style={{ filter: 'drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.55))', marginTop: size * (ICON_OFFSET[shape] ?? 0) }}
            aria-hidden
          />
        )
      )}
    </span>
  )
}
