import { useEffect, useMemo, useState } from 'react'
import { ArrowDownUp, CloudOff, Search as SearchIcon, SearchX } from 'lucide-react'
import type { PokemonCard } from '../types/pokemon'
import { useUi } from '../store/ui'
import { useOwned } from '../store/collection'
import { useResource } from '../hooks/useResource'
import { searchCards, SEARCH_LIMIT } from '../services/tcgdex'
import { rarityLabel } from '../utils/pokemon'
import { Chip } from '../components/ui/Chip'
import { CardTile } from '../components/pokemon/CardTile'
import { CardDetail } from '../components/pokemon/CardDetail'
import { applyPrice, PriceFilter, type PriceSort } from '../components/collection/PriceFilter'
import { useCardPrices } from '../hooks/useCardPrices'

const POPULAR = ['Charizard', 'Pikachu', 'Mewtwo', 'Umbreon', 'Eevee', 'Gengar', 'Lugia', 'Rayquaza', 'Gardevoir', 'Snorlax']
const MIN_CHARS = 2
const NAMES_SHOWN = 8

export function Search() {
  const query = useUi((s) => s.query)
  const search = useUi((s) => s.search)
  const { quantities } = useOwned()
  const [draft, setDraft] = useState(query)
  const [name, setName] = useState<string | null>(null)
  const [onlyOwned, setOnlyOwned] = useState(false)
  const [oldestFirst, setOldestFirst] = useState(false)
  const [allNames, setAllNames] = useState(false)
  const [priceRange, setPriceRange] = useState<string | null>(null)
  const [priceSort, setPriceSort] = useState<PriceSort>(null)
  const [selected, setSelected] = useState<PokemonCard | null>(null)

  useEffect(() => setDraft(query), [query])

  useEffect(() => {
    const term = draft.trim()
    if (term === query) return
    const t = setTimeout(() => search(term, true), 400)
    return () => clearTimeout(t)
  }, [draft, query, search])

  useEffect(() => {
    setName(null)
    setOnlyOwned(false)
    setAllNames(false)
  }, [query])

  const term = query.trim()
  const ready = term.length >= MIN_CHARS
  const results = useResource(ready ? `search:${term.toLowerCase()}` : null, () => searchCards(term))
  const all = useMemo(() => results.data ?? [], [results.data])
  // Com uma versão escolhida, só consulta o preço dela, não da busca inteira.
  const priceTargets = useMemo(() => (name ? all.filter((c) => c.name === name) : all), [all, name])
  const priced = useCardPrices(priceTargets, priceRange !== null || priceSort !== null)

  const names = useMemo(() => {
    const count = new Map<string, number>()
    for (const c of all) count.set(c.name, (count.get(c.name) ?? 0) + 1)
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [all])

  const sets = useMemo(() => new Set(all.map((c) => c.setId)).size, [all])

  const cards = useMemo(() => {
    const list = all.filter((c) => (!name || c.name === name) && (!onlyOwned || quantities[c.id]))
    return applyPrice(oldestFirst ? [...list].reverse() : list, priced.prices, priceRange, priceSort)
  }, [all, name, onlyOwned, oldestFirst, quantities, priced.prices, priceRange, priceSort])

  const ownedHere = useMemo(() => all.filter((c) => quantities[c.id]).length, [all, quantities])

  return (
    <div className="space-y-6">
      <header>
        <p className="label">Todas as coleções</p>
        <h1 className="mt-1 text-3xl font-bold">Buscar carta</h1>
      </header>

      <label className="relative block">
        <span className="sr-only">Nome da carta</span>
        <SearchIcon size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search(draft.trim(), true)}
          placeholder="Digite o nome de um Pokémon ou carta — ex.: Charizard"
          autoFocus
          className="h-14 w-full rounded-2xl border border-line bg-surface pl-12 pr-4 text-base placeholder:text-muted focus:border-primary focus:outline-none"
        />
      </label>

      {!ready ? (
        <section>
          <h2 className="label mb-3">Buscas populares</h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map((p) => (
              <Chip key={p} onClick={() => search(p, true)}>
                {p}
              </Chip>
            ))}
          </div>
          {term.length > 0 && <p className="mt-4 text-sm text-muted">Digite pelo menos {MIN_CHARS} letras.</p>}
        </section>
      ) : results.error ? (
        <div className="panel flex flex-col items-center px-6 py-16 text-center">
          <CloudOff size={32} className="text-muted" aria-hidden />
          <p className="mt-4 font-medium">Não deu para buscar agora</p>
          <p className="mt-1 text-sm text-muted">{results.error}</p>
          <button onClick={results.retry} className="mt-5 text-sm text-primary hover:underline">
            Tentar de novo
          </button>
        </div>
      ) : results.loading ? (
        <>
          <p className="text-sm text-muted" aria-live="polite">
            Procurando “{term}” em todas as coleções…
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5" aria-hidden>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i}>
                <div className="aspect-[63/88] animate-pulse rounded-[4.5%/3.2%] bg-raised" />
                <div className="mt-2.5 h-4 w-2/3 animate-pulse rounded bg-raised" />
              </div>
            ))}
          </div>
        </>
      ) : all.length === 0 ? (
        <div className="panel flex flex-col items-center px-6 py-16 text-center">
          <SearchX size={32} className="text-muted" aria-hidden />
          <p className="mt-4 font-medium">Nenhuma carta com “{term}”</p>
          <p className="mt-1 text-sm text-muted">Os nomes estão em inglês na base de dados — tente “Charizard”, “Professor” ou “Energy”.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              <span className="text-ink">{all.length}</span> cartas com “{term}” em <span className="text-ink">{sets}</span> coleções
              {ownedHere > 0 && (
                <>
                  {' '}
                  · você tem <span className="text-success">{ownedHere}</span>
                </>
              )}
              {all.length >= SEARCH_LIMIT && ' · mostrando as primeiras; refine a busca para ver mais'}
            </p>
            <div className="flex gap-2">
              {ownedHere > 0 && (
                <Chip active={onlyOwned} onClick={() => setOnlyOwned((v) => !v)}>
                  Só as que tenho
                </Chip>
              )}
              <Chip active={oldestFirst} onClick={() => setOldestFirst((v) => !v)}>
                <ArrowDownUp size={14} aria-hidden /> {oldestFirst ? 'Mais antigas primeiro' : 'Mais novas primeiro'}
              </Chip>
            </div>
          </div>

          {names.length > 1 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Versões do nome">
              <Chip active={!name} onClick={() => setName(null)}>
                Todas <span className="font-mono text-xs opacity-70">{all.length}</span>
              </Chip>
              {(allNames ? names : names.slice(0, NAMES_SHOWN)).map(([n, count]) => (
                <Chip key={n} active={name === n} onClick={() => setName(name === n ? null : n)}>
                  {n} <span className="font-mono text-xs opacity-70">{count}</span>
                </Chip>
              ))}
              {names.length > NAMES_SHOWN && (
                <button onClick={() => setAllNames((v) => !v)} className="h-9 shrink-0 px-2 text-sm text-primary hover:underline">
                  {allNames ? 'Mostrar menos' : `+${names.length - NAMES_SHOWN} versões`}
                </button>
              )}
            </div>
          )}

          <PriceFilter
            range={priceRange}
            sort={priceSort}
            onRange={setPriceRange}
            onSort={setPriceSort}
            loaded={priced.loaded}
            total={priced.total}
          />

          {cards.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {cards.map((c) => (
                <button key={c.id} onClick={() => setSelected(c)} className="rounded-lg text-left">
                  <CardTile
                    card={c}
                    owned
                    mark={!!quantities[c.id]}
                    quantity={quantities[c.id]}
                    subtitle={[c.series, c.releaseDate?.slice(0, 4), c.rarity.toLowerCase() !== 'none' && rarityLabel(c.rarity)]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              {priced.loading ? 'Procurando cartas nessa faixa de preço…' : 'Nenhuma carta com esses filtros.'}
            </p>
          )}
        </>
      )}

      <CardDetail card={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
