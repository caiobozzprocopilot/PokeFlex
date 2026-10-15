import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import type { CardSet } from '../../types/pokemon'

interface SetPickerProps {
  open: boolean
  sets: CardSet[] | null
  loading: boolean
  error: string | null
  currentId: string
  onPick: (id: string) => void
  onClose: () => void
  onRetry: () => void
}

const year = (date: string) => date.slice(0, 4)

export function SetPicker({ open, sets, loading, error, currentId, onPick, onClose, onRetry }: SetPickerProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  const [brokenLogos, setBrokenLogos] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = (sets ?? []).filter(
      (s) => !q || s.name.toLowerCase().includes(q) || s.serie.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
    )
    const map = new Map<string, { name: string; sets: CardSet[] }>()
    for (const s of list) {
      const g = map.get(s.serie.id) ?? { name: s.serie.name, sets: [] }
      g.sets.push(s)
      map.set(s.serie.id, g)
    }
    return [...map.values()]
  }, [sets, query])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto flex max-h-[min(86vh,760px)] w-[min(94vw,640px)] flex-col overflow-hidden rounded-3xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-bg/80 backdrop:backdrop-blur-sm [&:not([open])]:hidden"
    >
      <header className="flex items-center gap-3 border-b border-line p-4">
        <label className="relative flex-1">
          <span className="sr-only">Buscar coleção</span>
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar coleção ou série"
            autoFocus
            className="h-11 w-full rounded-xl border border-line bg-bg pl-11 pr-4 text-sm placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </label>
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink"
        >
          <X size={18} aria-hidden />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <ul className="space-y-1 p-2" aria-label="Carregando coleções">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i} className="h-14 animate-pulse rounded-xl bg-raised/60" />
            ))}
          </ul>
        )}
        {error && (
          <div className="p-8 text-center">
            <p className="font-medium">Não deu para carregar as coleções</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <button onClick={onRetry} className="mt-4 text-sm text-primary hover:underline">
              Tentar de novo
            </button>
          </div>
        )}
        {!loading && !error && groups.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">Nenhuma coleção com “{query}”.</p>
        )}
        {groups.map((g) => (
          <section key={g.name} className="mb-2">
            <h3 className="label sticky top-0 z-10 bg-surface px-3 py-2">{g.name}</h3>
            <ul>
              {g.sets.map((s) => {
                const active = s.id === currentId
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => onPick(s.id)}
                      aria-current={active || undefined}
                      className={`flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        active ? 'bg-primary/10' : 'hover:bg-raised'
                      }`}
                    >
                      <span className="grid h-10 w-20 shrink-0 place-items-center">
                        {s.logo && !brokenLogos.has(s.id) ? (
                          <img
                            src={s.logo}
                            alt=""
                            loading="lazy"
                            onError={() => setBrokenLogos((b) => new Set(b).add(s.id))}
                            className="max-h-10 max-w-20 object-contain"
                          />
                        ) : (
                          <span className="font-mono text-[11px] uppercase text-muted">{s.id}</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm font-medium ${active ? 'text-primary' : ''}`}>{s.name}</span>
                        <span className="block text-xs text-muted">
                          {year(s.releaseDate)} · {s.total} cartas
                        </span>
                      </span>
                      {active && <Check size={18} className="shrink-0 text-primary" aria-label="Selecionada" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </dialog>
  )
}
