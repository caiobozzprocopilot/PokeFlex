import type { CardCategory, CardSet, PokemonCard, PokemonType } from '../types/pokemon'

const API = 'https://api.tcgdex.net/v2/graphql'
const CACHE_PREFIX = 'pokeflex:tcgdex:v2:'
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000
// A API não filtra cartas por set; pedimos cada carta com um alias, em lotes, numa única query cada.
const BATCH = 120
// Cartas exclusivas do jogo digital, fora do escopo de uma coleção física.
const EXCLUDED_SERIES = new Set(['tcgp'])

const TYPES = new Set<PokemonType>([
  'grass', 'fire', 'water', 'lightning', 'psychic', 'fighting', 'darkness', 'metal', 'dragon', 'fairy', 'colorless',
])

type ApiSet = {
  id: string
  name: string
  logo: string | null
  releaseDate: string
  cardCount: { official: number; total: number }
  serie: { id: string; name: string }
}

type ApiCard = {
  id: string
  localId: string
  name: string
  image: string | null
  rarity: string | null
  types: string[] | null
  hp: number | null
  category: string
  variants: { normal: boolean | null; holo: boolean | null; reverse: boolean | null; firstEdition: boolean | null } | null
}

async function gql<T>(query: string): Promise<T> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`A tcgDex respondeu com erro ${res.status}.`)
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] }
  if (!json.data) throw new Error(json.errors?.[0]?.message ?? 'Resposta vazia da tcgDex.')
  return json.data
}

function readCache<T>(key: string, ttl = CACHE_TTL): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const { at, data } = JSON.parse(raw) as { at: number; data: T }
    return Date.now() - at < ttl ? data : null
  } catch {
    return null
  }
}

function writeCache(key: string, data: unknown) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), data }))
  } catch {
    // Cache cheio ou bloqueado: seguimos sem cache.
  }
}

const inflight = new Map<string, Promise<unknown>>()

export function cached<T>(key: string, load: () => Promise<T>, ttl = CACHE_TTL): Promise<T> {
  const hit = readCache<T>(key, ttl)
  if (hit) return Promise.resolve(hit)
  const running = inflight.get(key) as Promise<T> | undefined
  if (running) return running
  const promise = load()
    .then((data) => {
      writeCache(key, data)
      return data
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, promise)
  return promise
}

const CARD_FIELDS = 'id localId name image rarity types hp category variants { normal holo reverse firstEdition }'

const toSet = (s: ApiSet): CardSet => ({
  id: s.id,
  name: s.name,
  logo: s.logo ? `${s.logo}.webp` : undefined,
  releaseDate: s.releaseDate,
  official: s.cardCount.official,
  total: s.cardCount.total,
  serie: s.serie,
})

const toCategory = (c: string): CardCategory => {
  const v = c.toLowerCase()
  return v === 'trainer' ? 'trainer' : v === 'energy' ? 'energy' : 'pokemon'
}

const toCard = (c: ApiCard, set: CardSet): PokemonCard => {
  const type = c.types?.[0]?.toLowerCase() as PokemonType | undefined
  const rarity = c.rarity ?? 'Sem raridade'
  const fancy = !['common', 'uncommon', 'rare', 'none', 'sem raridade'].includes(rarity.toLowerCase())
  return {
    id: c.id,
    name: c.name,
    setId: set.id,
    series: set.name,
    releaseDate: set.releaseDate,
    number: `${c.localId}/${set.official}`,
    rarity,
    holo: (c.variants?.holo === true && c.variants?.normal !== true) || fancy,
    variants: {
      normal: c.variants?.normal ?? !c.variants?.holo,
      holo: c.variants?.holo ?? false,
      reverse: c.variants?.reverse ?? false,
      firstEdition: c.variants?.firstEdition ?? false,
    },
    category: toCategory(c.category),
    type: type && TYPES.has(type) ? type : undefined,
    hp: c.hp ?? undefined,
    imageUrl: c.image ? `${c.image}/high.webp` : '',
  }
}

export function fetchSets(): Promise<CardSet[]> {
  return cached('sets', async () => {
    const data = await gql<{ sets: ApiSet[] }>(
      `{ sets { id name logo releaseDate cardCount { official total } serie { id name } } }`,
    )
    return data.sets
      .filter((s) => !EXCLUDED_SERIES.has(s.serie.id) && s.cardCount.total > 0)
      .map(toSet)
      .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
  })
}

export function fetchSetCards(setId: string): Promise<{ set: CardSet; cards: PokemonCard[] }> {
  return cached(`set:${setId}`, async () => {
    const safeId = JSON.stringify(setId)
    const data = await gql<{ set: (ApiSet & { cards: { id: string }[] }) | null }>(
      `{ set(id: ${safeId}) { id name logo releaseDate cardCount { official total } serie { id name } cards { id } } }`,
    )
    if (!data.set) throw new Error('Set não encontrado na tcgDex.')
    const set = toSet(data.set)
    const ids = data.set.cards.map((c) => c.id)
    const batches: string[][] = []
    for (let i = 0; i < ids.length; i += BATCH) batches.push(ids.slice(i, i + BATCH))
    const results = await Promise.all(
      batches.map((batch) =>
        gql<Record<string, ApiCard | null>>(
          `{ ${batch.map((id, i) => `c${i}: card(id: ${JSON.stringify(id)}) { ${CARD_FIELDS} }`).join(' ')} }`,
        ),
      ),
    )
    const cards = results
      .flatMap((r) => Object.values(r))
      .filter((c): c is ApiCard => !!c)
      .map((c) => toCard(c, set))
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
    return { set, cards }
  })
}

// Várias cartas por id numa única consulta, na ordem pedida (ids desconhecidos são ignorados).
export async function fetchCards(ids: string[]): Promise<PokemonCard[]> {
  if (!ids.length) return []
  const [sets, data] = await Promise.all([
    fetchSets(),
    gql<Record<string, (ApiCard & { set: { id: string } | null }) | null>>(
      `{ ${ids.map((id, i) => `c${i}: card(id: ${JSON.stringify(id)}) { ${CARD_FIELDS} set { id } }`).join(' ')} }`,
    ),
  ])
  const byId = new Map(sets.map((s) => [s.id, s]))
  return ids
    .map((_, i) => data[`c${i}`])
    .filter((c): c is ApiCard & { set: { id: string } } => !!c?.set && byId.has(c.set.id))
    .map((c) => toCard(c, byId.get(c.set.id)!))
}

const SEARCH_TTL = 24 * 60 * 60 * 1000
const SEARCH_PAGE = 100
export const SEARCH_LIMIT = 600

async function searchPages(term: string) {
  const found: (ApiCard & { set: { id: string } | null })[] = []
  for (let page = 1; found.length < SEARCH_LIMIT; page++) {
    const data = await gql<{ cards: (ApiCard & { set: { id: string } | null })[] }>(
      `{ cards(filters: { name: ${JSON.stringify(term)} }, pagination: { page: ${page}, count: ${SEARCH_PAGE} }) { ${CARD_FIELDS} set { id } } }`,
    )
    found.push(...data.cards)
    if (data.cards.length < SEARCH_PAGE) break
  }
  return found
}

// Busca por nome em todos os sets (contém o termo, sem diferenciar maiúsculas), das mais novas para as mais antigas.
export function searchCards(name: string): Promise<PokemonCard[]> {
  const term = name.trim().toLowerCase()
  return cached(
    `search:${term}`,
    async () => {
      const [sets, found] = await Promise.all([fetchSets(), searchPages(term)])
      const byId = new Map(sets.map((s) => [s.id, s]))
      return found
        .filter((c) => c.set && byId.has(c.set.id))
        .map((c) => toCard(c, byId.get(c.set!.id)!))
        .sort(
          (a, b) =>
            (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '') ||
            a.number.localeCompare(b.number, undefined, { numeric: true }),
        )
    },
    SEARCH_TTL,
  )
}
