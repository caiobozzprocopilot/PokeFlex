import { ChevronRight } from 'lucide-react'
import { badgeProgress, closestBadge, tierName, type Badge, type trainerLevel } from '../../utils/achievements'
import { GymBadge } from './GymBadge'
import { LevelEmblem } from './Celebrations'

type Level = ReturnType<typeof trainerLevel>

const fmt = (b: Badge, n: number) => (b.format ? b.format(n) : n.toLocaleString('pt-BR'))

export function PokeballDeco({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={`pokeball-deco pointer-events-none absolute ${className}`}>
      <g fill="none" stroke="currentColor" strokeWidth="3">
        <circle cx="50" cy="50" r="46" />
        <path d="M4 50h30M66 50h30" />
        <circle cx="50" cy="50" r="15" />
        <circle cx="50" cy="50" r="7" />
      </g>
    </svg>
  )
}

export function XpBar({ level, className = '' }: { level: Level; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-pixel text-[9px] text-primary">XP</span>
        <span className="font-mono text-muted">
          {level.into.toLocaleString('pt-BR')} / {level.span.toLocaleString('pt-BR')}
        </span>
      </div>
      <div className="mt-1.5 h-3 overflow-hidden rounded-full border border-line bg-raised p-[2px]">
        <div
          className="xp-fill h-full rounded-full bg-gradient-to-r from-[#22D3EE] via-[#4ADE80] to-[#FFD60A]"
          style={{ width: `${Math.max(3, level.progress * 100)}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted">
        Faltam <span className="text-ink">{(level.span - level.into).toLocaleString('pt-BR')} XP</span> para o nível {level.level + 1}
      </p>
    </div>
  )
}

interface TrainerCardProps {
  level: Level
  badges: Badge[]
  onOpenBadges: () => void
}

export function TrainerCard({ level, badges, onOpenBadges }: TrainerCardProps) {
  const near = closestBadge(badges)
  const earned = badges.filter((b) => b.tier > 0).sort((a, b) => b.tier - a.tier)
  const nearGoal = near?.next ?? 0

  return (
    <section className="panel relative overflow-hidden p-5 sm:p-6" aria-label="Cartão de treinador">
      <PokeballDeco className="-right-16 -top-16 h-56 w-56 text-white/[0.04]" />
      <div className="relative grid gap-6 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div className="flex items-center gap-4">
          <LevelEmblem level={level.level} size={76} />
          <div className="min-w-0 flex-1">
            <p className="label">Cartão de treinador</p>
            <p className="mt-0.5 font-display text-xl font-bold">{level.title}</p>
            <XpBar level={level} className="mt-2" />
          </div>
        </div>

        <div className="space-y-4">
          {near && (
            <button onClick={onOpenBadges} className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-raised/50 p-3 text-left transition-colors hover:border-primary/40">
              <GymBadge shape={near.shape} icon={near.icon} color={near.color} tier={Math.min(4, near.tier + 1) as Badge['tier']} size={48} shine={false} className="opacity-90 grayscale-[0.4]" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-muted">Quase lá</span>
                <span className="block truncate text-sm font-medium">
                  {near.name} <span className="text-muted">· {tierName((near.tier + 1) as Badge['tier'])}</span>
                </span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-bg">
                  <span className="block h-full rounded-full" style={{ width: `${badgeProgress(near) * 100}%`, background: near.color }} />
                </span>
                <span className="mt-1 block font-mono text-[11px] text-muted">
                  {fmt(near, near.value)} / {fmt(near, nearGoal)}
                </span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
          )}
          <button onClick={onOpenBadges} className="flex w-full items-center gap-3 text-left">
            <span className="flex -space-x-2">
              {earned.slice(0, 6).map((b) => (
                <GymBadge key={b.id} shape={b.shape} icon={b.icon} color={b.color} tier={b.tier} size={34} shine={false} />
              ))}
              {earned.length === 0 && <span className="text-sm text-muted">Nenhuma insígnia ainda</span>}
            </span>
            <span className="ml-auto shrink-0 text-sm text-muted hover:text-primary">
              {earned.length}/{badges.length} insígnias
            </span>
          </button>
        </div>
      </div>
    </section>
  )
}
