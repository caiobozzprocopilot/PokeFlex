import { useEffect, useRef, useState } from 'react'
import type { PokemonCard } from '../../types/pokemon'
import { usePricing, useRates } from '../../hooks/useTcgdex'
import { bestQuote, formatBRL, toBRL } from '../../services/pricing'
import { defaultVariant } from '../../utils/collection'

// Preço de referência (Near Mint, variante padrão) em reais; só consulta quando a carta chega perto da tela.
export function CardPrice({ card, className = '' }: { card: PokemonCard; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  const pricing = usePricing(visible ? card.id : null)
  const rates = useRates()
  const q = bestQuote(pricing.data, card, defaultVariant(card))
  const loading = !visible || pricing.loading || rates.loading

  return (
    <span ref={ref} className={`font-mono text-[13px] font-semibold tabular-nums ${className}`}>
      {loading ? (
        <span className="inline-block h-3.5 w-16 animate-pulse rounded bg-raised align-middle" aria-label="Carregando preço" />
      ) : q && rates.data ? (
        <span className="text-success" title={`Preço de mercado (${q.source === 'cardmarket' ? 'Cardmarket' : 'TCGplayer'}, Near Mint)`}>
          {formatBRL(toBRL(q, q.value, rates.data))}
        </span>
      ) : (
        <span className="font-sans text-xs font-normal text-muted">Sem preço</span>
      )}
    </span>
  )
}
