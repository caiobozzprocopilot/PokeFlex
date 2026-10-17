import { ArrowDown, ArrowUp } from 'lucide-react'
import type { PokemonCard } from '../../types/pokemon'
import { Chip } from '../ui/Chip'

export type PriceRange = { id: string; label: string; min: number; max: number }
export type PriceSort = 'desc' | 'asc' | null

export const PRICE_RANGES: PriceRange[] = [
  { id: 'ate10', label: 'Até R$ 10', min: 0, max: 10 },
  { id: '10-50', label: 'R$ 10 a 50', min: 10, max: 50 },
  { id: '50-200', label: 'R$ 50 a 200', min: 50, max: 200 },
  { id: '200+', label: 'Acima de R$ 200', min: 200, max: Infinity },
]

// Cartas sem preço saem quando há faixa escolhida e vão para o fim quando só há ordenação.
export function applyPrice(cards: PokemonCard[], prices: Record<string, number | null>, range: string | null, sort: PriceSort) {
  const r = PRICE_RANGES.find((x) => x.id === range)
  let list = cards
  if (r) {
    list = list.filter((c) => {
      const v = prices[c.id]
      return typeof v === 'number' && v >= r.min && v < r.max
    })
  }
  if (sort) {
    const sign = sort === 'desc' ? -1 : 1
    list = [...list].sort((a, b) => {
      const va = prices[a.id]
      const vb = prices[b.id]
      if (typeof va !== 'number') return typeof vb === 'number' ? 1 : 0
      if (typeof vb !== 'number') return -1
      return (va - vb) * sign
    })
  }
  return list
}

interface PriceFilterProps {
  range: string | null
  sort: PriceSort
  onRange: (id: string | null) => void
  onSort: (s: PriceSort) => void
  loaded: number
  total: number
}

export function PriceFilter({ range, sort, onRange, onSort, loaded, total }: PriceFilterProps) {
  const active = range !== null || sort !== null
  return (
    <div className="space-y-2">
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrar por preço">
        <span className="label shrink-0 pr-1">Preço</span>
        {PRICE_RANGES.map((r) => (
          <Chip key={r.id} active={range === r.id} onClick={() => onRange(range === r.id ? null : r.id)}>
            {r.label}
          </Chip>
        ))}
        <span className="mx-1 w-px shrink-0 self-stretch bg-line" aria-hidden />
        <Chip active={sort === 'desc'} onClick={() => onSort(sort === 'desc' ? null : 'desc')}>
          <ArrowDown size={14} aria-hidden /> Mais caras
        </Chip>
        <Chip active={sort === 'asc'} onClick={() => onSort(sort === 'asc' ? null : 'asc')}>
          <ArrowUp size={14} aria-hidden /> Mais baratas
        </Chip>
      </div>
      {active && loaded < total && (
        <div className="flex items-center gap-3 text-xs text-muted" aria-live="polite">
          <span className="h-1 w-32 overflow-hidden rounded-full bg-raised">
            <span className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${(loaded / total) * 100}%` }} />
          </span>
          Consultando preços… {loaded} de {total}
        </div>
      )}
    </div>
  )
}
