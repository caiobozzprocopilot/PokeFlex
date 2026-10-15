import { Crown, Flame, Gem, Layers, Repeat2, Star, Trophy, Zap } from 'lucide-react'
import type { BadgeItem } from '../../data/mock'

const ICONS = { cards: Layers, flame: Flame, gem: Gem, swap: Repeat2, crown: Crown, star: Star, zap: Zap, trophy: Trophy }

export function BadgeMedal({ badge, compact = false }: { badge: BadgeItem; compact?: boolean }) {
  const Icon = ICONS[badge.icon]
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'w-20' : ''}`}>
      <span
        className={`grid h-14 w-14 place-items-center rounded-2xl border ${
          badge.unlocked
            ? 'border-primary/40 bg-gradient-to-br from-primary/20 to-accent/10 text-primary'
            : 'border-dashed border-line text-muted/40'
        }`}
      >
        <Icon size={24} aria-hidden />
      </span>
      <span className={`mt-2 text-xs font-medium ${badge.unlocked ? 'text-ink' : 'text-muted'}`}>{badge.name}</span>
      {!compact && <span className="mt-0.5 text-[11px] leading-tight text-muted">{badge.description}</span>}
    </div>
  )
}
