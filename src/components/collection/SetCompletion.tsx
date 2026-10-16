import { useEffect, useMemo, useRef, useState } from 'react'
import { Heart, X } from 'lucide-react'
import type { CardSet, PokemonCard } from '../../types/pokemon'
import { useWishlist } from '../../store/wishlist'
import { mapLimited } from '../../hooks/useCollectionValue'
import { bestQuote, fetchPricing, fetchRates, formatBRL, toBRL } from '../../services/pricing'
import { defaultVariant } from '../../utils/collection'
import { rarityLabel } from '../../utils/pokemon'
import { ProgressBar } from '../ui/ProgressBar'
import { Button } from '../ui/Button'

interface SetCompletionProps {
  open: boolean
  set: CardSet | undefined
  missing: PokemonCard[]
  ownedCount: number
  onClose: () => void
  onOpenCard: (card: PokemonCard) => void
}

type Priced = { card: PokemonCard; price: number | null }

export function SetCompletion({ open, set, missing, ownedCount, onClose, onOpenCard }: SetCompletionProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const wishlist = useWishlist((s) => s.items)
  const addWish = useWishlist((s) => s.add)
  const [prices, setPrices] = useState<Map<string, number | null>>(new Map())
  const [done, setDone] = useState(0)
  const [sortCheap, setSortCheap] = useState(false)
  const key = missing.map((c) => c.id).join()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setPrices(new Map())
    setDone(0)
    fetchRates()
      .then((rates) =>
        mapLimited(missing, 4, async (card) => {
          const pricing = await fetchPricing(card.id).catch(() => null)
          const q = bestQuote(pricing, card, defaultVariant(card))
          if (cancelled) return
          setPrices((m) => new Map(m).set(card.id, q ? toBRL(q, q.value, rates) : null))
          setDone((n) => n + 1)
        }),
      )
      .catch(() => !cancelled && setDone(missing.length))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key])

  const rows: Priced[] = useMemo(() => {
    const list = missing.map((card) => ({ card, price: prices.has(card.id) ? prices.get(card.id)! : null }))
    return list.sort((a, b) => (sortCheap ? (a.price ?? Infinity) - (b.price ?? Infinity) : (b.price ?? -1) - (a.price ?? -1)))
  }, [missing, prices, sortCheap])

  const total = rows.reduce((n, r) => n + (r.price ?? 0), 0)
  const noPrice = done === missing.length ? rows.filter((r) => r.price === null).length : 0
  const finished = done >= missing.length
  const wished = (card: PokemonCard) => wishlist.some((w) => w.card.id === card.id)
  const notWished = missing.filter((c) => !wished(c))

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto flex max-h-[min(90vh,820px)] w-[min(94vw,720px)] flex-col overflow-hidden rounded-3xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-bg/80 backdrop:backdrop-blur-sm [&:not([open])]:hidden"
    >
      <header className="border-b border-line p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label">Completar o set</p>
            <h2 className="mt-1 text-2xl font-bold">{set?.name}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted">Progresso</p>
            <p className="mt-0.5 font-display text-2xl font-bold">
              {ownedCount}/{set?.official ?? ownedCount + missing.length}
            </p>
            <div className="mt-2">
              <ProgressBar value={ownedCount} max={set?.official || 1} tone="success" label="Progresso do set" />
            </div>
          </div>
          <div aria-live="polite">
            <p className="text-xs text-muted">Custo estimado do que falta</p>
            <p className="mt-0.5 font-display text-2xl font-bold tabular-nums">{formatBRL(total)}</p>
            <p className="mt-1 text-xs text-muted">
              {finished
                ? `${missing.length} cartas${noPrice ? ` · ${noPrice} sem preço` : ''} · Near Mint`
                : `Buscando preços… ${done}/${missing.length}`}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-lg border border-line p-0.5 text-xs" role="group" aria-label="Ordenar">
            {[
              [false, 'Mais caras primeiro'],
              [true, 'Mais baratas primeiro'],
            ].map(([v, label]) => (
              <button
                key={String(v)}
                onClick={() => setSortCheap(v as boolean)}
                aria-pressed={sortCheap === v}
                className={`rounded-md px-2.5 py-1 ${sortCheap === v ? 'bg-raised text-ink' : 'text-muted hover:text-ink'}`}
              >
                {label as string}
              </button>
            ))}
          </div>
          {notWished.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => notWished.forEach((c) => addWish(c, defaultVariant(c)))}>
              <Heart size={14} aria-hidden /> Todas para os desejos
            </Button>
          )}
        </div>
      </header>

      <ul className="flex-1 divide-y divide-line overflow-y-auto px-3 py-2">
        {rows.map(({ card, price }) => (
          <li key={card.id} className="flex items-center gap-3 px-2 py-2">
            <button onClick={() => onOpenCard(card)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              {card.imageUrl ? (
                <img
                  src={card.imageUrl.replace('/high.webp', '/low.webp')}
                  alt=""
                  loading="lazy"
                  className="h-14 w-10 shrink-0 rounded object-cover"
                />
              ) : (
                <span className="h-14 w-10 shrink-0 rounded bg-raised" />
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{card.name}</span>
                <span className="block text-xs text-muted">
                  {card.number.split('/')[0]} · {rarityLabel(card.rarity)}
                </span>
              </span>
            </button>
            <span className="w-24 shrink-0 text-right font-mono text-sm tabular-nums">
              {prices.has(card.id) ? price !== null ? formatBRL(price) : '—' : <span className="text-muted">…</span>}
            </span>
            <button
              onClick={() => !wished(card) && addWish(card, defaultVariant(card))}
              aria-pressed={wished(card)}
              aria-label={wished(card) ? `${card.name} já está nos desejos` : `Adicionar ${card.name} aos desejos`}
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${wished(card) ? 'text-accent' : 'text-muted hover:bg-raised hover:text-ink'}`}
            >
              <Heart size={16} fill={wished(card) ? 'currentColor' : 'none'} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  )
}
