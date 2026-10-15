import { Award, Calendar, Flame, Layers, LogOut, Repeat2 } from 'lucide-react'
import { BADGES, STATS, USER } from '../data/mock'
import { useOwned } from '../store/collection'
import { useAuth } from '../store/auth'
import { Button } from '../components/ui/Button'
import { TYPE_INFO } from '../utils/pokemon'
import { StatTile } from '../components/ui/StatTile'
import { BadgeMedal } from '../components/gamification/BadgeMedal'

function LevelRing({ level, value, max }: { level: number; value: number; max: number }) {
  const r = 44
  const c = 2 * Math.PI * r
  const pct = value / max
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(var(--raised))" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="rgb(var(--primary))"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[10px] text-muted">NÍVEL</span>
        <span className="font-display text-3xl font-bold leading-none">{level}</span>
      </div>
      <span className="sr-only">
        Nível {level}, {value} de {max} XP
      </span>
    </div>
  )
}

export function Profile() {
  const user = useAuth((s) => s.user)!
  const signOut = useAuth((s) => s.signOut)
  const owned = useOwned()
  const byType = Object.entries(TYPE_INFO)
    .map(([type, info]) => ({
      ...info,
      count: owned.entries.filter((e) => e.card.type === type).reduce((n, e) => n + e.quantity, 0),
    }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
  const maxType = Math.max(...byType.map((t) => t.count))
  const unlocked = BADGES.filter((b) => b.unlocked).length

  return (
    <div className="space-y-6">
      <section className="panel relative overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <LevelRing level={STATS.level} value={STATS.xp} max={STATS.nextLevelXp} />
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{user.name}</h1>
            <p className="text-muted">{user.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted sm:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} aria-hidden /> Desde {USER.joined}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Flame size={14} className="text-accent" aria-hidden /> {STATS.streak} dias seguidos
              </span>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className="font-mono text-sm">
              {STATS.xp.toLocaleString('pt-BR')} <span className="text-muted">/ {STATS.nextLevelXp.toLocaleString('pt-BR')} XP</span>
            </p>
            <p className="mt-0.5 text-xs text-muted">até o nível {STATS.level + 1}</p>
            <Button variant="ghost" size="sm" onClick={signOut} className="mt-3">
              <LogOut size={15} aria-hidden /> Sair
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={Layers} label="Cartas" value={owned.total} tone="primary" />
        <StatTile icon={Repeat2} label="Trocas" value={STATS.tradesCompleted} />
        <StatTile icon={Award} label="Conquistas" value={`${unlocked}/${BADGES.length}`} tone="success" />
        <StatTile icon={Flame} label="Sequência" value={STATS.streak} hint="dias" tone="accent" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="panel p-5">
          <h2 className="mb-5 text-lg font-semibold">Cartas por tipo</h2>
          <ul className="space-y-3.5">
            {byType.map((t) => (
              <li key={t.label} className="grid grid-cols-[80px_1fr_28px] items-center gap-3 text-sm">
                <span className="text-muted">{t.label}</span>
                <span className="h-2 overflow-hidden rounded-full bg-raised">
                  <span className="block h-full rounded-full" style={{ width: `${(t.count / maxType) * 100}%`, background: t.color }} />
                </span>
                <span className="text-right font-mono text-xs">{t.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel p-5">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Conquistas</h2>
            <span className="font-mono text-xs text-muted">
              {unlocked}/{BADGES.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4">
            {BADGES.map((b) => (
              <BadgeMedal key={b.id} badge={b} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
