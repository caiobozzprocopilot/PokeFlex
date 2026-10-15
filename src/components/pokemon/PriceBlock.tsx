import { TrendingDown, TrendingUp } from 'lucide-react'
import type { CardVariant, PokemonCard } from '../../types/pokemon'
import { usePricing, useRates } from '../../hooks/useTcgdex'
import { formatBRL, formatForeign, quote, toBRL, type PriceSource } from '../../services/pricing'
import { availableVariants, VARIANT_LABEL } from '../../utils/collection'

interface PriceBlockProps {
  card: PokemonCard
  variant: CardVariant
  source: PriceSource
  onVariant: (v: CardVariant) => void
  onSource: (s: PriceSource) => void
}

const SOURCES: { id: PriceSource; label: string }[] = [
  { id: 'cardmarket', label: 'Cardmarket' },
  { id: 'tcgplayer', label: 'TCGplayer' },
]

const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : null)

export function PriceBlock({ card, variant, source, onVariant, onSource }: PriceBlockProps) {
  const pricing = usePricing(card.id)
  const rates = useRates()
  const variants = availableVariants(card)
  const q = quote(pricing.data, card, variant, source)
  const loading = pricing.loading || rates.loading
  const error = pricing.error || rates.error

  return (
    <section className="rounded-2xl border border-line bg-raised/40 p-5" aria-labelledby="price-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="price-title" className="label">
          Preço de mercado
        </h3>
        <div className="flex rounded-lg border border-line bg-bg/60 p-0.5 text-xs" role="group" aria-label="Fonte do preço">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => onSource(s.id)}
              aria-pressed={source === s.id}
              className={`rounded-md px-2.5 py-1 transition-colors ${source === s.id ? 'bg-raised text-ink' : 'text-muted hover:text-ink'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {variants.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Variante">
          {variants.map((v) => (
            <button
              key={v}
              onClick={() => onVariant(v)}
              aria-pressed={variant === v}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                variant === v ? 'border-primary bg-primary/10 text-primary' : 'border-line text-muted hover:text-ink'
              }`}
            >
              {VARIANT_LABEL[v]}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 min-h-[86px]" aria-live="polite">
        {loading ? (
          <div className="space-y-2" aria-label="Carregando preço">
            <div className="h-9 w-40 animate-pulse rounded-lg bg-raised" />
            <div className="h-4 w-56 animate-pulse rounded bg-raised" />
          </div>
        ) : error ? (
          <div>
            <p className="text-sm">Não deu para buscar o preço agora.</p>
            <button
              onClick={() => {
                pricing.retry()
                rates.retry()
              }}
              className="mt-1 text-sm text-primary hover:underline"
            >
              Tentar de novo
            </button>
          </div>
        ) : !q || !rates.data ? (
          <div>
            <p className="font-medium">Sem preço de referência</p>
            <p className="mt-0.5 text-sm text-muted">
              {pricing.data
                ? `O ${source === 'cardmarket' ? 'Cardmarket' : 'TCGplayer'} não tem preço para a variante ${VARIANT_LABEL[variant].toLowerCase()}.`
                : 'Esta carta ainda não tem preço nos mercados que acompanhamos.'}
            </p>
          </div>
        ) : (
          <>
            <p className="font-display text-4xl font-bold tabular-nums">{formatBRL(toBRL(q, q.value, rates.data))}</p>
            <p className="mt-1 text-sm text-muted">
              ≈ {formatForeign(q.value, q.currency)} · {source === 'cardmarket' ? 'tendência Cardmarket' : 'preço de mercado TCGplayer'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              {q.changePct !== undefined && Math.abs(q.changePct) >= 0.5 && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                    q.changePct > 0 ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'
                  }`}
                >
                  {q.changePct > 0 ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}
                  {q.changePct > 0 ? '+' : ''}
                  {q.changePct.toFixed(0)}% vs. média de 30 dias
                </span>
              )}
              {q.low && <span>mín. {formatBRL(toBRL(q, q.low, rates.data))}</span>}
              {q.high && <span>máx. {formatBRL(toBRL(q, q.high, rates.data))}</span>}
              {formatDate(q.updated) && <span>atualizado {formatDate(q.updated)}</span>}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
