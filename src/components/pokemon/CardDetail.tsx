import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, Heart, Plus, Trash2, X } from 'lucide-react'
import { useWishlist } from '../../store/wishlist'
import type { CardVariant, PokemonCard } from '../../types/pokemon'
import { cardLabel, rarityLabel, TYPE_INFO } from '../../utils/pokemon'
import { defaultVariant, LANGUAGES, VARIANT_LABEL } from '../../utils/collection'
import { useCollection } from '../../store/collection'
import { usePricing, useRates } from '../../hooks/useTcgdex'
import { bestQuote, conditionFactor, formatBRL, toBRL, type PriceSource } from '../../services/pricing'
import { useUi } from '../../store/ui'
import { Button } from '../ui/Button'
import { CardTile } from './CardTile'
import { PriceBlock } from './PriceBlock'
import { AddToCollection } from '../collection/AddToCollection'

interface CardDetailProps {
  card: PokemonCard | null
  onClose: () => void
}

type View = 'info' | 'add'

function OwnedList({ card }: { card: PokemonCard }) {
  const all = useCollection((s) => s.entries)
  const entries = all.filter((e) => e.card.id === card.id)
  const remove = useCollection((s) => s.remove)
  const error = useCollection((s) => s.error)
  const dismissError = useCollection((s) => s.dismissError)
  const pricing = usePricing(card.id)
  const rates = useRates()

  const alert = error && (
    <p
      role="alert"
      className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent"
    >
      {error}
      <button onClick={dismissError} aria-label="Fechar aviso" className="shrink-0 text-accent/70 hover:text-accent">
        <X size={14} aria-hidden />
      </button>
    </p>
  )

  if (entries.length === 0) {
    return (
      <>
        {alert}
        <p className="text-sm text-muted">Você ainda não tem esta carta.</p>
      </>
    )
  }

  return (
    <>
      {alert}
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {entries.map((e) => {
          const q = bestQuote(pricing.data, card, e.variant)
          const value = q && rates.data ? toBRL(q, q.value, rates.data) * conditionFactor(e.condition) * e.quantity : null
          const lang = LANGUAGES.find((l) => l.id === e.language)
          return (
            <li key={e.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-9 min-w-9 place-items-center rounded-lg bg-raised px-2 font-mono text-sm">
                ×{e.quantity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {VARIANT_LABEL[e.variant]} · {e.condition}
                  {e.graded && (
                    <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[11px] text-primary">
                      {e.graded.company} {e.graded.grade}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {lang?.label}
                  {e.pricePaid ? ` · pagou ${formatBRL(e.pricePaid)}/un.` : ''} ·{' '}
                  {new Date(e.addedAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <span className="hidden text-right sm:block">
                <span className="block font-mono text-sm tabular-nums">{value !== null ? formatBRL(value) : '—'}</span>
                {value !== null && e.pricePaid && (
                  <span
                    className={`block font-mono text-[11px] tabular-nums ${
                      value >= e.pricePaid * e.quantity ? 'text-success' : 'text-accent'
                    }`}
                  >
                    {value >= e.pricePaid * e.quantity ? '+' : '−'}
                    {formatBRL(Math.abs(value - e.pricePaid * e.quantity))} (
                    {(((value - e.pricePaid * e.quantity) / (e.pricePaid * e.quantity)) * 100).toFixed(0)}%)
                  </span>
                )}
              </span>
              <button
                onClick={() => remove(e.id)}
                aria-label={`Remover ${e.quantity} ${VARIANT_LABEL[e.variant]} ${e.condition} da coleção`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-accent/10 hover:text-accent"
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export function CardDetail({ card, onClose }: CardDetailProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const go = useUi((s) => s.go)
  const wishes = useWishlist((s) => s.items)
  const addWish = useWishlist((s) => s.add)
  const removeWish = useWishlist((s) => s.remove)
  const entries = useCollection((s) => s.entries)
  const ownedQty = card ? entries.filter((e) => e.card.id === card.id).reduce((n, e) => n + e.quantity, 0) : 0
  const [view, setView] = useState<View>('info')
  const [variant, setVariant] = useState<CardVariant>('normal')
  const [source, setSource] = useState<PriceSource>('cardmarket')
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (card && !dialog.open) dialog.showModal()
    if (!card && dialog.open) dialog.close()
    if (card) {
      setView('info')
      setVariant(defaultVariant(card))
      setFlash(null)
    }
  }, [card])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 3500)
    return () => clearTimeout(t)
  }, [flash])

  const type = card?.type ? TYPE_INFO[card.type] : undefined
  const wish = card ? wishes.find((w) => w.card.id === card.id && w.variant === variant) : undefined

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto max-h-[94vh] w-[min(94vw,960px)] overflow-y-auto rounded-3xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-bg/80 backdrop:backdrop-blur-sm"
    >
      {card && (
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[280px_1fr]">
          <div className="mx-auto w-52 md:sticky md:top-0 md:w-full md:self-start">
            <CardTile card={card} showMeta={false} owned />
            <p className="mt-3 text-center text-xs text-muted">
              {ownedQty ? `Você tem ${ownedQty} ${ownedQty > 1 ? 'cópias' : 'cópia'}` : 'Ainda não está na sua coleção'}
            </p>
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {view === 'add' ? (
                  <button onClick={() => setView('info')} className="label flex items-center gap-1.5 hover:text-ink">
                    <ArrowLeft size={14} aria-hidden /> Voltar
                  </button>
                ) : (
                  <p className="label">
                    {card.series} · {card.number}
                  </p>
                )}
                <h2 className="mt-1 truncate text-3xl font-bold">{view === 'add' ? `Adicionar ${card.name}` : card.name}</h2>
                {view === 'info' && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      {type && <span className="h-2 w-2 rounded-full" style={{ background: type.color }} />}
                      {cardLabel(card)}
                    </span>
                    <span aria-hidden>·</span>
                    <span className={card.holo ? 'text-primary' : ''}>{rarityLabel(card.rarity)}</span>
                    {card.hp && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{card.hp} HP</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            {view === 'info' ? (
              <div className="mt-6 space-y-6">
                {flash && (
                  <p role="status" className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">
                    <Check size={16} aria-hidden /> {flash}
                  </p>
                )}

                <PriceBlock card={card} variant={variant} source={source} onVariant={setVariant} onSource={setSource} />

                <section aria-labelledby="owned-title">
                  <h3 id="owned-title" className="label mb-3">
                    Na sua coleção
                  </h3>
                  <OwnedList card={card} />
                </section>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => setView('add')}>
                    <Plus size={16} aria-hidden /> {ownedQty ? 'Adicionar mais' : 'Adicionar à coleção'}
                  </Button>
                  <Button
                    variant="secondary"
                    aria-pressed={!!wish}
                    onClick={() => (wish ? removeWish(wish.id) : addWish(card, variant))}
                    className={wish ? 'border-accent/50 text-accent' : ''}
                  >
                    <Heart size={16} fill={wish ? 'currentColor' : 'none'} aria-hidden />
                    {wish ? `Nos desejos (${VARIANT_LABEL[variant].toLowerCase()})` : 'Quero esta'}
                  </Button>
                  {wish && (
                    <button
                      onClick={() => {
                        onClose()
                        go('desejos')
                      }}
                      className="self-center text-sm text-muted hover:text-primary"
                    >
                      Definir preço-alvo
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-6 flex-1">
                <AddToCollection
                  card={card}
                  initialVariant={variant}
                  onCancel={() => setView('info')}
                  onAdded={(n) => {
                    setFlash(n > 1 ? `${n} cópias adicionadas à sua coleção.` : `${card.name} adicionada à sua coleção.`)
                    setView('info')
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
