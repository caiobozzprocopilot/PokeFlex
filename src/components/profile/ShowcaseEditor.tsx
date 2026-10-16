import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Check, Search, Trash2, X } from 'lucide-react'
import type { PokemonCard } from '../../types/pokemon'
import { useOwned } from '../../store/collection'
import {
  MAX_SHOWCASE_CARDS,
  MIN_SHOWCASE_CARDS,
  useShowcases,
  type Showcase,
  type ShowcaseStyle,
} from '../../store/showcases'
import { Button } from '../ui/Button'

interface ShowcaseEditorProps {
  open: boolean
  showcase: Showcase | null
  onClose: () => void
  onSaved?: (id: string) => void
}

const STYLES: { id: ShowcaseStyle; label: string; hint: string }[] = [
  { id: 'cylinder', label: 'Cilindro', hint: 'As cartas giram em volta, curvadas' },
  { id: 'orbit', label: 'Órbita', hint: 'Todas sempre viradas para você' },
  { id: 'wheel', label: 'Roda', hint: 'Giram de cima para baixo' },
]

const thumb = (c: PokemonCard) => (c.imageUrl ? c.imageUrl.replace('/high.webp', '/low.webp') : '')

export function ShowcaseEditor({ open, showcase, onClose, onSaved }: ShowcaseEditorProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const owned = useOwned()
  const { create, update, remove } = useShowcases()
  const [name, setName] = useState('')
  const [style, setStyle] = useState<ShowcaseStyle>('cylinder')
  const [ids, setIds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setName(showcase?.name ?? '')
      setStyle(showcase?.style ?? 'cylinder')
      setIds(showcase?.cardIds.filter((id) => owned.quantities[id]) ?? [])
      setQuery('')
      setError(null)
      setConfirmDelete(false)
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, showcase])

  const byId = useMemo(() => new Map(owned.cards.map((c) => [c.id, c])), [owned.cards])
  const chosen = ids.map((id) => byId.get(id)).filter((c): c is PokemonCard => !!c)
  const pool = useMemo(() => {
    const q = query.trim().toLowerCase()
    return owned.cards.filter((c) => !q || c.name.toLowerCase().includes(q) || c.series.toLowerCase().includes(q))
  }, [owned.cards, query])

  const toggle = (id: string) => {
    if (ids.includes(id)) {
      setError(null)
      return setIds(ids.filter((x) => x !== id))
    }
    if (ids.length >= MAX_SHOWCASE_CARDS) return setError(`Uma vitrine pode ter até ${MAX_SHOWCASE_CARDS} cartas.`)
    setError(null)
    setIds([...ids, id])
  }

  const move = (index: number, delta: number) =>
    setIds((list) => {
      const next = [...list]
      const target = index + delta
      if (target < 0 || target >= next.length) return list
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const draft = { name, style, cardIds: ids }
      if (showcase) {
        await update(showcase.id, draft)
        onSaved?.(showcase.id)
      } else {
        const created = await create(draft)
        onSaved?.(created.id)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a vitrine.')
    }
    setSaving(false)
  }

  const destroy = async () => {
    if (!showcase) return
    try {
      await remove(showcase.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível apagar a vitrine.')
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto flex max-h-[94vh] w-[min(96vw,980px)] flex-col overflow-hidden rounded-3xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-bg/80 backdrop:backdrop-blur-sm [&:not([open])]:hidden"
    >
      <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-line p-6">
          <div className="min-w-0 flex-1">
            <p className="label">{showcase ? 'Editar vitrine' : 'Nova vitrine'}</p>
            <label className="mt-2 block">
              <span className="sr-only">Nome da vitrine</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Meus holos favoritos"
                maxLength={40}
                autoFocus
                className="h-11 w-full max-w-md rounded-xl border border-line bg-bg px-4 font-display text-lg font-semibold placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-muted focus:border-primary focus:outline-none"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Estilo de giro">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={style === s.id}
                  title={s.hint}
                  onClick={() => setStyle(s.id)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    style === s.id ? 'border-primary bg-primary/10 text-primary' : 'border-line text-muted hover:text-ink'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[300px_1fr]">
          <section className="flex min-h-0 flex-col border-b border-line md:border-b-0 md:border-r" aria-labelledby="chosen-title">
            <div className="flex items-baseline justify-between px-5 pt-4">
              <h3 id="chosen-title" className="text-sm font-semibold">
                Na vitrine
              </h3>
              <span className={`font-mono text-xs ${ids.length < MIN_SHOWCASE_CARDS ? 'text-accent' : 'text-muted'}`}>
                {ids.length}/{MAX_SHOWCASE_CARDS}
              </span>
            </div>
            {chosen.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">Toque nas cartas ao lado para montar a vitrine (mínimo {MIN_SHOWCASE_CARDS}).</p>
            ) : (
              <ol className="max-h-48 overflow-y-auto px-3 py-2 md:max-h-none md:flex-1">
                {chosen.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-raised/60">
                    <span className="w-5 text-right font-mono text-xs text-muted">{i + 1}</span>
                    {thumb(c) ? (
                      <img src={thumb(c)} alt="" className="h-10 w-7 rounded-sm object-cover" />
                    ) : (
                      <span className="h-10 w-7 rounded-sm bg-raised" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label={`Subir ${c.name}`}
                      className="grid h-7 w-7 place-items-center rounded text-muted hover:text-ink disabled:opacity-30"
                    >
                      <ArrowUp size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === chosen.length - 1}
                      aria-label={`Descer ${c.name}`}
                      className="grid h-7 w-7 place-items-center rounded text-muted hover:text-ink disabled:opacity-30"
                    >
                      <ArrowDown size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(c.id)}
                      aria-label={`Tirar ${c.name} da vitrine`}
                      className="grid h-7 w-7 place-items-center rounded text-muted hover:text-accent"
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="flex min-h-0 flex-col" aria-labelledby="pool-title">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
              <h3 id="pool-title" className="text-sm font-semibold">
                Suas cartas
              </h3>
              <label className="relative">
                <span className="sr-only">Filtrar cartas</span>
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filtrar por nome ou set"
                  className="h-9 w-56 rounded-lg border border-line bg-bg pl-9 pr-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none"
                />
              </label>
            </div>
            {owned.cards.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">Sua coleção está vazia. Adicione cartas primeiro.</p>
            ) : (
              <ul className="grid flex-1 grid-cols-3 content-start gap-3 overflow-y-auto p-5 sm:grid-cols-4 lg:grid-cols-5">
                {pool.map((c) => {
                  const position = ids.indexOf(c.id)
                  const on = position >= 0
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => toggle(c.id)}
                        aria-pressed={on}
                        aria-label={`${c.name}, ${c.series}`}
                        className={`relative block w-full overflow-hidden rounded-lg ring-2 transition ${
                          on ? 'ring-primary' : 'ring-transparent opacity-80 hover:opacity-100'
                        }`}
                      >
                        {thumb(c) ? (
                          <img src={thumb(c)} alt="" loading="lazy" className="aspect-[63/88] w-full object-cover" />
                        ) : (
                          <span className="grid aspect-[63/88] w-full place-items-center bg-raised p-2 text-xs text-muted">{c.name}</span>
                        )}
                        {on && (
                          <span className="absolute right-1.5 top-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1 font-mono text-xs font-bold text-bg">
                            {position + 1}
                          </span>
                        )}
                      </button>
                      <p className="mt-1 truncate text-[11px] text-muted">{c.name}</p>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 sm:px-6">
          <div>
            {showcase &&
              (confirmDelete ? (
                <Button type="button" variant="danger" size="sm" onClick={destroy}>
                  <Trash2 size={14} aria-hidden /> Confirmar: apagar vitrine
                </Button>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={14} aria-hidden /> Apagar vitrine
                </Button>
              ))}
          </div>
          <div className="flex items-center gap-3">
            <p role="alert" className={`text-sm text-accent ${error ? '' : 'sr-only'}`}>
              {error}
            </p>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              <Check size={16} aria-hidden /> {saving ? 'Salvando…' : 'Salvar vitrine'}
            </Button>
          </div>
        </footer>
      </form>
    </dialog>
  )
}
