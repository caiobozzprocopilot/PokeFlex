import { useMemo, useState, type FormEvent } from 'react'
import { BellRing, Check, Heart, ListChecks, Search, Store, Trash2, X } from 'lucide-react'
import { ligaPokemonUrl } from '../utils/links'
import type { PokemonCard } from '../types/pokemon'
import { useWishlist, type WishItem } from '../store/wishlist'
import { useUi } from '../store/ui'
import { useWishlistPricing, type PricedWish } from '../hooks/useWishlistPricing'
import { formatBRL } from '../services/pricing'
import { VARIANT_LABEL } from '../utils/collection'
import { Button } from '../components/ui/Button'
import { CardDetail } from '../components/pokemon/CardDetail'

const parseMoney = (v: string) => {
  const n = Number(v.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : undefined
}

function TargetInput({ item }: { item: WishItem }) {
  const setTarget = useWishlist((s) => s.setTarget)
  const [value, setValue] = useState(item.targetPrice ? item.targetPrice.toFixed(2).replace('.', ',') : '')

  const save = (e?: FormEvent) => {
    e?.preventDefault()
    const next = parseMoney(value)
    if (next !== item.targetPrice) setTarget(item.id, next)
    if (!next) setValue('')
  }

  return (
    <form onSubmit={save} className="relative">
      <label htmlFor={`target-${item.id}`} className="sr-only">
        Preço-alvo para {item.card.name}
      </label>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">R$</span>
      <input
        id={`target-${item.id}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => save()}
        inputMode="decimal"
        placeholder="alvo"
        className="h-9 w-28 rounded-lg border border-line bg-bg pl-8 pr-2 font-mono text-sm placeholder:font-sans placeholder:text-muted focus:border-primary focus:outline-none"
      />
    </form>
  )
}

interface RowProps {
  wish: PricedWish
  onOpen: (c: PokemonCard) => void
  selecting: boolean
  checked: boolean
  onToggle: (id: string) => void
}

function Row({ wish, onOpen, selecting, checked, onToggle }: RowProps) {
  const remove = useWishlist((s) => s.remove)
  const { item, price, belowTarget } = wish
  const gap = price !== null && item.targetPrice ? price - item.targetPrice : null

  return (
    <li
      className={`flex flex-wrap items-center gap-4 rounded-2xl border p-3 transition-colors sm:flex-nowrap ${
        checked ? 'border-primary/60 bg-primary/5' : belowTarget ? 'border-success/50 bg-success/5' : 'border-line'
      }`}
    >
      <button
        onClick={() => (selecting ? onToggle(item.id) : onOpen(item.card))}
        role={selecting ? 'checkbox' : undefined}
        aria-checked={selecting ? checked : undefined}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        {selecting && (
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors ${
              checked ? 'border-primary bg-primary text-bg' : 'border-line'
            }`}
            aria-hidden
          >
            {checked && <Check size={14} strokeWidth={3} />}
          </span>
        )}
        {item.card.imageUrl ? (
          <img
            src={item.card.imageUrl.replace('/high.webp', '/low.webp')}
            alt=""
            loading="lazy"
            className="h-16 w-12 shrink-0 rounded object-cover"
          />
        ) : (
          <span className="h-16 w-12 shrink-0 rounded bg-raised" />
        )}
        <span className="min-w-0">
          <span className="block truncate font-medium">{item.card.name}</span>
          <span className="block truncate text-xs text-muted">
            {item.card.series} · {item.card.number} · {VARIANT_LABEL[item.variant]}
          </span>
          {belowTarget ? (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
              <BellRing size={12} aria-hidden /> Abaixo do seu alvo
            </span>
          ) : gap !== null ? (
            <span className="mt-1 block text-xs text-muted">Falta cair {formatBRL(gap)}</span>
          ) : null}
        </span>
      </button>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-[11px] text-muted">Hoje</p>
          <p className="font-mono text-sm tabular-nums">{price !== null ? formatBRL(price) : '—'}</p>
        </div>
        <TargetInput item={item} />
        <a
          href={ligaPokemonUrl(item.card)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Ver ofertas de ${item.card.name} na LigaPokemon (abre em nova aba)`}
          title="Ver ofertas na LigaPokemon"
          className={`grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-raised hover:text-primary ${selecting ? 'invisible' : ''}`}
        >
          <Store size={16} aria-hidden />
        </a>
        <button
          disabled={selecting}
          onClick={() => remove(item.id)}
          aria-label={`Remover ${item.card.name} da lista de desejos`}
          className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-accent/10 hover:text-accent disabled:invisible"
        >
          <Trash2 size={16} aria-hidden />
        </button>
      </div>
    </li>
  )
}

export function Wishlist() {
  const go = useUi((s) => s.go)
  const items = useWishlist((s) => s.items)
  const error = useWishlist((s) => s.error)
  const dismissError = useWishlist((s) => s.dismissError)
  const { loading, list } = useWishlistPricing(items)
  const [selected, setSelected] = useState<PokemonCard | null>(null)
  const removeMany = useWishlist((s) => s.removeMany)
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const [confirming, setConfirming] = useState(false)

  const toggle = (id: string) => {
    setConfirming(false)
    setPicked((p) => {
      const next = new Set(p)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const pickOnly = (ids: string[]) => {
    setConfirming(false)
    setPicked(new Set(ids))
  }
  const stopSelecting = () => {
    setSelecting(false)
    setPicked(new Set())
    setConfirming(false)
  }
  const removePicked = async () => {
    const ids = [...picked]
    stopSelecting()
    await removeMany(ids)
  }

  const sorted = useMemo(
    () => [...list].sort((a, b) => Number(b.belowTarget) - Number(a.belowTarget) || (b.price ?? -1) - (a.price ?? -1)),
    [list],
  )
  const alerts = list.filter((w) => w.belowTarget).length
  const total = list.reduce((n, w) => n + (w.price ?? 0), 0)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Cartas que você quer</p>
          <h1 className="mt-1 text-3xl font-bold">Desejos</h1>
        </div>
        {items.length > 0 && !loading && (
          <p className="text-sm text-muted">
            {items.length} {items.length === 1 ? 'carta' : 'cartas'} · {formatBRL(total)} para conseguir todas
            {alerts > 0 && <span className="text-success"> · {alerts} abaixo do alvo</span>}
          </p>
        )}
      </header>

      {error && (
        <p role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent">
          {error}
          <button onClick={dismissError} aria-label="Fechar aviso">
            <X size={14} aria-hidden />
          </button>
        </p>
      )}

      {items.length === 0 ? (
        <div className="panel flex flex-col items-center px-6 py-16 text-center">
          <Heart size={32} className="text-muted" aria-hidden />
          <p className="mt-4 font-medium">Sua lista de desejos está vazia</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Abra qualquer carta e toque em “Quero esta”. Defina um preço-alvo e ela fica destacada quando o preço cair até ele.
          </p>
          <Button className="mt-5" onClick={() => go('busca')}>
            <Search size={16} aria-hidden /> Buscar carta
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {selecting ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted" aria-live="polite">
                    {picked.size} {picked.size === 1 ? 'selecionada' : 'selecionadas'}
                  </span>
                  <span aria-hidden className="text-line">
                    |
                  </span>
                  <button
                    onClick={() => pickOnly(picked.size === items.length ? [] : items.map((i) => i.id))}
                    className="rounded-lg px-2 py-1 text-muted hover:text-ink"
                  >
                    {picked.size === items.length ? 'Limpar seleção' : 'Selecionar todos'}
                  </button>
                  {alerts > 0 && (
                    <button
                      onClick={() => pickOnly(list.filter((w) => w.belowTarget).map((w) => w.item.id))}
                      className="rounded-lg px-2 py-1 text-muted hover:text-ink"
                    >
                      Já abaixo do alvo
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={stopSelecting}>
                    Cancelar
                  </Button>
                  {confirming ? (
                    <Button variant="danger" size="sm" onClick={removePicked}>
                      <Trash2 size={14} aria-hidden /> Confirmar remoção de {picked.size}
                    </Button>
                  ) : (
                    <Button variant="danger" size="sm" disabled={picked.size === 0} onClick={() => setConfirming(true)}>
                      <Trash2 size={14} aria-hidden /> Remover{picked.size ? ` (${picked.size})` : ''}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setSelecting(true)} className="ml-auto">
                <ListChecks size={16} aria-hidden /> Selecionar
              </Button>
            )}
          </div>
          <ul className="space-y-3" aria-busy={loading}>
            {(loading ? items.map((item) => ({ item, quote: null, price: null, belowTarget: false })) : sorted).map((w) => (
              <Row
                key={w.item.id}
                wish={w}
                onOpen={setSelected}
                selecting={selecting}
                checked={picked.has(w.item.id)}
                onToggle={toggle}
              />
            ))}
          </ul>
          <p className="text-xs text-muted">
            O aviso aparece aqui e no menu sempre que você abre o PokeFlex. Preço de referência Near Mint do Cardmarket (ou
            TCGplayer), em reais.
          </p>
        </>
      )}

      <CardDetail card={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
