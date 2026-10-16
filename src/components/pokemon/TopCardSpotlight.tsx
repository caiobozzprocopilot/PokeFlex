import { Crown, TrendingDown, TrendingUp } from 'lucide-react'
import type { PokemonCard } from '../../types/pokemon'
import type { CollectionPricing } from '../../hooks/useCollectionValue'
import { CONDITIONS, formatBRL } from '../../services/pricing'
import { VARIANT_LABEL } from '../../utils/collection'
import { TYPE_INFO } from '../../utils/pokemon'
import { CardTile } from './CardTile'
import { Button } from '../ui/Button'

interface TopCardSpotlightProps {
  pricing: CollectionPricing
  onOpen: (card: PokemonCard) => void
  className?: string
}

// Destaque da carta de maior valor por cópia da coleção.
export function TopCardSpotlight({ pricing, onOpen, className = '' }: TopCardSpotlightProps) {
  if (pricing.loading) {
    return <div className={`panel h-[340px] animate-pulse ${className}`} aria-label="Carregando carta mais valiosa" />
  }
  const top = pricing.items
    .filter((i) => i.unit !== null)
    .sort((a, b) => b.unit! - a.unit!)[0]
  if (!top) return null

  const { entry, quote, unit, total } = top
  const { card } = entry
  const glow = card.type ? TYPE_INFO[card.type].color : 'rgb(var(--primary))'
  const condition = CONDITIONS.find((c) => c.id === entry.condition)?.label
  const change = quote?.changePct
  const paidGain = entry.pricePaid ? ((unit! - entry.pricePaid) / entry.pricePaid) * 100 : null

  return (
    <section className={`panel relative overflow-hidden ${className}`} aria-labelledby="top-card-title">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: glow }}
      />
      <div className="relative grid items-center gap-6 p-6 sm:grid-cols-[220px_1fr] sm:gap-10 sm:p-8">
        <button onClick={() => onOpen(card)} className="mx-auto w-44 rounded-lg sm:w-full" aria-label={`Ver detalhes de ${card.name}`}>
          <CardTile card={card} showMeta={false} owned quantity={entry.quantity} />
        </button>
        <div className="min-w-0">
          <p className="label flex items-center gap-1.5 text-primary">
            <Crown size={14} aria-hidden /> Sua carta mais valiosa
          </p>
          <h2 id="top-card-title" className="mt-2 truncate font-display text-3xl font-bold sm:text-4xl">
            {card.name}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {card.series} · {card.number} · {VARIANT_LABEL[entry.variant]} · {condition}
            {entry.graded && (
              <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[11px] text-primary">
                {entry.graded.company} {entry.graded.grade}
              </span>
            )}
          </p>

          <p className="mt-5 font-display text-5xl font-bold tabular-nums">{formatBRL(unit!)}</p>
          <p className="mt-1 text-sm text-muted">
            por cópia{entry.quantity > 1 && ` · ${entry.quantity} cópias = ${formatBRL(total!)}`}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {change !== undefined && Math.abs(change) >= 0.5 && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                  change > 0 ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'
                }`}
              >
                {change > 0 ? <TrendingUp size={13} aria-hidden /> : <TrendingDown size={13} aria-hidden />}
                {change > 0 ? '+' : ''}
                {change.toFixed(0)}% na semana vs. mês
              </span>
            )}
            {paidGain !== null && (
              <span className="rounded-full bg-raised px-2.5 py-1 text-xs text-muted">
                Você pagou {formatBRL(entry.pricePaid!)} ({paidGain >= 0 ? '+' : ''}
                {paidGain.toFixed(0)}%)
              </span>
            )}
          </div>

          <Button variant="secondary" className="mt-6" onClick={() => onOpen(card)}>
            Ver detalhes e preço
          </Button>
        </div>
      </div>
    </section>
  )
}
