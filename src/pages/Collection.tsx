import { useEffect, useMemo, useState } from 'react'
import { Camera, ChevronDown, CloudOff, LayoutGrid, Rotate3d, Search, SearchX } from 'lucide-react'
import { useOwned } from '../store/collection'
import type { CardCategory, PokemonCard, PokemonType } from '../types/pokemon'
import { CATEGORY_LABEL, compareRarity, rarityLabel, TYPE_INFO } from '../utils/pokemon'
import { useSetCards, useSets } from '../hooks/useTcgdex'
import { Chip } from '../components/ui/Chip'
import { SetCompletion } from '../components/collection/SetCompletion'
import { SET_KEY, useUi } from '../store/ui'
import { isMainSetCard } from '../utils/sets'
import { ProgressBar } from '../components/ui/ProgressBar'
import { CardTile } from '../components/pokemon/CardTile'
import { CardShowcase } from '../components/pokemon/CardShowcase'
import { CardDetail } from '../components/pokemon/CardDetail'
import { SetPicker } from '../components/collection/SetPicker'

type Ownership = 'todas' | 'tenho' | 'faltando'
type Kind = PokemonType | Exclude<CardCategory, 'pokemon'>

const DEFAULT_SET = 'base1'

const readSet = () => {
  try {
    return localStorage.getItem(SET_KEY) || DEFAULT_SET
  } catch {
    return DEFAULT_SET
  }
}

const kindOf = (c: PokemonCard): Kind | undefined => (c.category === 'pokemon' ? c.type : c.category)

const kindInfo = (k: Kind) => (k === 'trainer' || k === 'energy' ? { label: CATEGORY_LABEL[k], color: undefined } : TYPE_INFO[k])

export function Collection() {
  const [setId, setSetId] = useState(readSet)
  const { quantities: OWNED } = useOwned()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [completionOpen, setCompletionOpen] = useState(false)
  const setScanning = useUi((s) => s.setScanning)
  const sets = useSets()
  const { data, error, loading, retry } = useSetCards(setId)

  const [query, setQuery] = useState('')
  const [ownership, setOwnership] = useState<Ownership>('todas')
  const [kind, setKind] = useState<Kind | null>(null)
  const [rarity, setRarity] = useState<string | null>(null)
  const [view, setView] = useState<'grade' | 'vitrine'>('grade')
  const [selected, setSelected] = useState<PokemonCard | null>(null)

  const allCards = useMemo(() => data?.cards ?? [], [data])
  const set = data?.set ?? sets.data?.find((s) => s.id === setId)

  useEffect(() => {
    try {
      localStorage.setItem(SET_KEY, setId)
    } catch {
      // Sem armazenamento: o set volta ao padrão na próxima visita.
    }
  }, [setId])

  const pickSet = (id: string) => {
    setSetId(id)
    setPickerOpen(false)
    setKind(null)
    setRarity(null)
    setQuery('')
  }

  const kinds = useMemo(() => {
    const present = new Set(allCards.map(kindOf).filter(Boolean) as Kind[])
    const order: Kind[] = [...(Object.keys(TYPE_INFO) as PokemonType[]), 'trainer', 'energy']
    return order.filter((k) => present.has(k))
  }, [allCards])

  const rarities = useMemo(() => [...new Set(allCards.map((c) => c.rarity))].sort(compareRarity), [allCards])

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allCards.filter((c) => {
      const owned = !!OWNED[c.id]
      if (ownership === 'tenho' && !owned) return false
      if (ownership === 'faltando' && owned) return false
      if (kind && kindOf(c) !== kind) return false
      if (rarity && c.rarity !== rarity) return false
      if (q && !c.name.toLowerCase().includes(q) && !c.number.toLowerCase().startsWith(q)) return false
      return true
    })
  }, [allCards, query, ownership, kind, rarity, OWNED])

  const ownedCards = useMemo(() => cards.filter((c) => OWNED[c.id]), [cards, OWNED])
  const mainCards = useMemo(() => allCards.filter(isMainSetCard), [allCards])
  const uniqueOwned = useMemo(() => mainCards.filter((c) => OWNED[c.id]).length, [mainCards, OWNED])
  const missing = useMemo(() => mainCards.filter((c) => !OWNED[c.id]), [mainCards, OWNED])
  const setSize = set?.official ?? mainCards.length

  const clear = () => {
    setQuery('')
    setOwnership('todas')
    setKind(null)
    setRarity(null)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => setPickerOpen(true)}
            className="group -ml-2 flex max-w-full items-center gap-3 rounded-xl px-2 py-1 text-left transition-colors hover:bg-raised"
            aria-haspopup="dialog"
          >
            {set?.logo && <img src={set.logo} alt="" className="hidden h-12 w-24 object-contain sm:block" />}
            <span className="min-w-0">
              <span className="label block">
                {set ? `${set.serie.name} · ${set.releaseDate.slice(0, 4)}` : 'Carregando coleção…'}
              </span>
              <span className="mt-0.5 flex items-center gap-2 font-display text-3xl font-bold">
                <span className="truncate">{set?.name ?? 'Coleção'}</span>
                <ChevronDown size={22} className="shrink-0 text-muted transition-colors group-hover:text-ink" aria-hidden />
              </span>
            </span>
          </button>
        </div>
        <div className="w-full sm:w-64">
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="text-muted">Progresso do set</span>
            <span className="font-mono">
              {uniqueOwned}/{setSize || '—'}
            </span>
          </div>
          <ProgressBar value={uniqueOwned} max={setSize || 1} tone="success" label="Progresso do set" />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            {missing.length > 0 && (
              <button onClick={() => setCompletionOpen(true)} className="text-sm text-primary hover:underline">
                Quanto falta pra completar?
              </button>
            )}
            <button
              onClick={() => setScanning(true)}
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary"
            >
              <Camera size={15} aria-hidden /> Escanear carta
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Buscar carta</span>
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou número"
              className="h-11 w-full rounded-xl border border-line bg-surface pl-11 pr-4 text-sm placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </label>
          <div className="flex rounded-xl border border-line bg-surface p-1" role="group" aria-label="Filtrar por posse">
            {(['todas', 'tenho', 'faltando'] as Ownership[]).map((o) => (
              <button
                key={o}
                onClick={() => setOwnership(o)}
                aria-pressed={ownership === o}
                className={`h-9 flex-1 rounded-lg px-4 text-sm capitalize transition-colors ${
                  ownership === o ? 'bg-raised text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {allCards.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {kinds.map((k) => {
              const info = kindInfo(k)
              return (
                <Chip key={k} dot={info.color} active={kind === k} onClick={() => setKind(kind === k ? null : k)}>
                  {info.label}
                </Chip>
              )
            })}
            <span className="mx-1 w-px shrink-0 self-stretch bg-line" aria-hidden />
            {rarities.map((r) => (
              <Chip key={r} active={rarity === r} onClick={() => setRarity(rarity === r ? null : r)}>
                {rarityLabel(r)}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted" aria-live="polite">
          {loading
            ? `Buscando ${set ? `${set.total} cartas` : 'cartas'} na tcgDex…`
            : view === 'vitrine'
              ? `${ownedCards.length} ${ownedCards.length === 1 ? 'carta sua' : 'cartas suas'} na vitrine`
              : `${cards.length} de ${allCards.length} cartas`}
        </p>
        <div className="flex rounded-xl border border-line bg-surface p-1" role="group" aria-label="Modo de visualização">
          {(
            [
              ['grade', 'Grade', LayoutGrid],
              ['vitrine', 'Vitrine 3D', Rotate3d],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors ${
                view === key ? 'bg-raised text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              <Icon size={15} aria-hidden /> {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="panel flex flex-col items-center px-6 py-16 text-center">
          <CloudOff size={32} className="text-muted" aria-hidden />
          <p className="mt-4 font-medium">Não deu para carregar as cartas</p>
          <p className="mt-1 text-sm text-muted">{error}</p>
          <button onClick={retry} className="mt-5 text-sm text-primary hover:underline">
            Tentar de novo
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i}>
              <div className="aspect-[63/88] animate-pulse rounded-[4.5%/3.2%] bg-raised" />
              <div className="mt-2.5 h-4 w-2/3 animate-pulse rounded bg-raised" />
            </div>
          ))}
        </div>
      ) : view === 'vitrine' && ownedCards.length >= 3 ? (
        <div className="panel overflow-hidden">
          <CardShowcase
            key={ownedCards.map((c) => c.id).join()}
            cards={ownedCards}
            preset="orbit"
            cardWidth={200}
            fadeColor="#13131A"
            onOpen={setSelected}
            className="h-[460px] text-ink sm:h-[560px]"
          />
        </div>
      ) : view === 'vitrine' && cards.length > 0 ? (
        <div className="panel flex flex-col items-center px-6 py-16 text-center">
          <Rotate3d size={32} className="text-muted" aria-hidden />
          <p className="mt-4 font-medium">Poucas cartas para a vitrine</p>
          <p className="mt-1 text-sm text-muted">A vitrine precisa de pelo menos 3 cartas suas com esses filtros.</p>
          <button onClick={() => setView('grade')} className="mt-5 text-sm text-primary hover:underline">
            Ver em grade
          </button>
        </div>
      ) : cards.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {cards.map((c) => (
            <button key={c.id} onClick={() => setSelected(c)} className="rounded-lg text-left">
              <CardTile card={c} owned={!!OWNED[c.id]} quantity={OWNED[c.id]} />
            </button>
          ))}
        </div>
      ) : (
        <div className="panel flex flex-col items-center px-6 py-16 text-center">
          <SearchX size={32} className="text-muted" aria-hidden />
          <p className="mt-4 font-medium">Nenhuma carta com esses filtros</p>
          <p className="mt-1 text-sm text-muted">Tente outro nome ou remova algum filtro.</p>
          <button onClick={clear} className="mt-5 text-sm text-primary hover:underline">
            Limpar filtros
          </button>
        </div>
      )}

      <SetCompletion
        open={completionOpen}
        set={set}
        missing={missing}
        ownedCount={uniqueOwned}
        onClose={() => setCompletionOpen(false)}
        onOpenCard={setSelected}
      />
      <CardDetail card={selected} onClose={() => setSelected(null)} />
      <SetPicker
        open={pickerOpen}
        sets={sets.data}
        loading={sets.loading}
        error={sets.error}
        currentId={setId}
        onPick={pickSet}
        onClose={() => setPickerOpen(false)}
        onRetry={sets.retry}
      />
    </div>
  )
}
