import { useMemo } from 'react'
import { Award, Layers, Library, LogOut, Wallet } from 'lucide-react'
import { useOwned } from '../store/collection'
import { useAuth } from '../store/auth'
import { useCollectionPricing } from '../hooks/useCollectionValue'
import { formatBRL } from '../services/pricing'
import { computeBadges } from '../utils/achievements'
import { TYPE_INFO } from '../utils/pokemon'
import { Button } from '../components/ui/Button'
import { StatTile } from '../components/ui/StatTile'
import { BadgeMedal } from '../components/gamification/BadgeMedal'

export function Profile() {
  const user = useAuth((s) => s.user)!
  const signOut = useAuth((s) => s.signOut)
  const owned = useOwned()
  const pricing = useCollectionPricing(owned.entries)
  const sets = useMemo(() => new Set(owned.entries.map((e) => e.card.setId)).size, [owned.entries])
  const badges = useMemo(
    () => computeBadges(owned.entries, pricing.loading ? null : pricing.total),
    [owned.entries, pricing.loading, pricing.total],
  )
  const unlocked = badges.filter((b) => b.unlocked).length

  const byType = Object.entries(TYPE_INFO)
    .map(([type, info]) => ({
      ...info,
      count: owned.entries.filter((e) => e.card.type === type).reduce((n, e) => n + e.quantity, 0),
    }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
  const maxType = Math.max(1, ...byType.map((t) => t.count))

  return (
    <div className="space-y-6">
      <section className="panel relative overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-primary font-display text-4xl font-bold text-bg">
            {user.name[0]?.toUpperCase()}
          </span>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{user.name}</h1>
            <p className="text-muted">{user.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut size={15} aria-hidden /> Sair
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={Layers} label="Cartas" value={owned.total} hint={`${owned.unique} únicas`} tone="primary" />
        <StatTile
          icon={Wallet}
          label="Valor estimado"
          value={pricing.loading ? '…' : pricing.error ? '—' : formatBRL(pricing.total)}
          tone="success"
        />
        <StatTile icon={Library} label="Coleções" value={sets} />
        <StatTile icon={Award} label="Conquistas" value={`${unlocked}/${badges.length}`} tone="accent" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="panel p-5">
          <h2 className="mb-5 text-lg font-semibold">Cartas por tipo</h2>
          {byType.length ? (
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
          ) : (
            <p className="text-sm text-muted">Adicione cartas Pokémon para ver a distribuição por tipo.</p>
          )}
        </section>

        <section className="panel p-5">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Conquistas</h2>
            <span className="font-mono text-xs text-muted">
              {unlocked}/{badges.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3">
            {badges.map((b) => (
              <BadgeMedal key={b.id} badge={b} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
