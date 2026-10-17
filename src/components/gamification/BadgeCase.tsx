import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Check, X } from 'lucide-react'
import { badgeProgress, TIERS, tierName, type Badge, type Tier } from '../../utils/achievements'
import { GymBadge, METAL } from './GymBadge'

const fmt = (b: Badge, n: number) => (b.format ? b.format(n) : n.toLocaleString('pt-BR'))

function TierPips({ tier }: { tier: Tier }) {
  return (
    <span className="mt-1.5 flex justify-center gap-1" aria-label={`Nível ${tierName(tier)}`}>
      {([1, 2, 3, 4] as const).map((t) => (
        <span
          key={t}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: tier >= t ? METAL[t][1] : 'rgb(255 255 255 / 0.12)' }}
        />
      ))}
    </span>
  )
}

function BadgeDetail({ badge, onClose }: { badge: Badge | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (badge && !dialog.open) dialog.showModal()
    if (!badge && dialog.open) dialog.close()
  }, [badge])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(94vw,480px)] overflow-y-auto rounded-3xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-bg/80 backdrop:backdrop-blur-sm"
    >
      {badge && (
        <div className="relative p-6 sm:p-8">
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink"
          >
            <X size={18} aria-hidden />
          </button>
          <div className="flex flex-col items-center text-center">
            <div className="relative grid h-44 w-44 place-items-center">
              {badge.tier > 0 && (
                <div
                  aria-hidden
                  className="burst-rays absolute -inset-10 opacity-60"
                  style={{ '--ray': `${badge.color}30` } as CSSProperties}
                />
              )}
              <div key={badge.id} className="badge-spin">
                <div className="badge-float">
                  <GymBadge shape={badge.shape} icon={badge.icon} color={badge.color} tier={badge.tier} size={132} />
                </div>
              </div>
            </div>
            <h3 className="mt-2 font-display text-2xl font-bold">{badge.name}</h3>
            {badge.tier > 0 ? (
              <span
                className="mt-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-bg"
                style={{ background: `linear-gradient(135deg, ${METAL[badge.tier as 1][0]}, ${METAL[badge.tier as 1][1]})` }}
              >
                {tierName(badge.tier)}
              </span>
            ) : (
              <span className="mt-2 rounded-full border border-dashed border-line px-3 py-1 text-xs text-muted">Ainda bloqueada</span>
            )}
            {badge.next !== null ? (
              <div className="mt-5 w-full">
                <p className="text-sm">
                  Próximo: <span className="text-muted">{badge.description(badge.next)}</span>
                </p>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-raised">
                  <div className="xp-fill h-full rounded-full" style={{ width: `${badgeProgress(badge) * 100}%`, background: badge.color }} />
                </div>
                <p className="mt-1.5 font-mono text-xs text-muted">
                  {fmt(badge, badge.value)} / {fmt(badge, badge.next)}
                </p>
              </div>
            ) : (
              <p className="mt-5 text-sm text-primary">Nível máximo! Você é Mestre nesta insígnia.</p>
            )}
          </div>

          <ol className="mt-6 space-y-2">
            {badge.goals.map((goal, i) => {
              const t = (i + 1) as Tier
              const done = badge.tier >= t
              return (
                <li
                  key={t}
                  className={`flex items-center gap-3 rounded-2xl border p-2.5 pr-4 ${done ? 'border-line bg-raised/60' : 'border-dashed border-line/70'}`}
                >
                  <GymBadge shape={badge.shape} icon={badge.icon} color={badge.color} tier={done ? t : 0} size={40} shine={false} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium" style={done ? { color: METAL[t as 1][1] } : undefined}>
                      {tierName(t)}
                    </span>
                    <span className="block truncate text-xs text-muted">{badge.description(goal)}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted">+{TIERS[t].xp} XP</span>
                  {done && <Check size={16} className="shrink-0 text-success" aria-label="Conquistado" />}
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </dialog>
  )
}

// Estojo de insígnias, como o dos jogos: couro vermelho, costura dourada e um encaixe para cada insígnia.
export function BadgeCase({ badges }: { badges: Badge[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const earned = badges.filter((b) => b.tier > 0).length
  const tiers = badges.reduce((n, b) => n + b.tier, 0)

  return (
    <section
      id="insignias"
      aria-labelledby="badge-case-title"
      className="relative scroll-mt-24 overflow-hidden rounded-3xl bg-gradient-to-br from-[#9F1D1D] via-[#7A1414] to-[#3E0808] p-2 shadow-card"
    >
      <div className="rounded-[20px] border-2 border-dashed border-[#FFD60A]/30 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-pixel text-[10px] text-[#FFD60A]/80">Estojo de insígnias</p>
            <h2 id="badge-case-title" className="mt-1.5 font-display text-2xl font-bold text-white">
              {earned} de {badges.length} conquistadas
            </h2>
          </div>
          <p className="font-mono text-xs text-white/60">
            {tiers}/{badges.length * 4} níveis
          </p>
        </div>

        <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {badges.map((b, i) => (
            <li key={b.id}>
              <button
                onClick={() => setOpen(b.id)}
                className="group flex w-full flex-col items-center rounded-2xl bg-black/25 px-1 pb-3 pt-4 shadow-[inset_0_4px_14px_rgb(0_0_0/0.55)] transition-colors hover:bg-black/35"
              >
                <span
                  className="transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105"
                  style={{ '--shine-delay': `${(i % 6) * 0.35 + 1}s` } as CSSProperties}
                >
                  <GymBadge shape={b.shape} icon={b.icon} color={b.color} tier={b.tier} size={60} />
                </span>
                <span className={`mt-2 line-clamp-1 px-1 text-center text-xs font-medium ${b.tier ? 'text-white' : 'text-white/45'}`}>
                  {b.name}
                </span>
                <TierPips tier={b.tier} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <BadgeDetail badge={badges.find((b) => b.id === open) ?? null} onClose={() => setOpen(null)} />
    </section>
  )
}
