import type { CollectionEntry } from '../store/collection'
import { TYPE_INFO } from './pokemon'
import { isMainSetCard, setsInProgress } from './sets'

export type BadgeShape =
  | 'octagon'
  | 'droplet'
  | 'star'
  | 'hexagon'
  | 'heart'
  | 'circle'
  | 'flame'
  | 'diamond'
  | 'shield'
  | 'bolt'
  | 'crown'
  | 'pokeball'

export type BadgeIcon = 'cards' | 'book' | 'palette' | 'map' | 'sparkle' | 'leaf' | 'crown' | 'zap' | 'shield' | 'gem' | 'trophy' | 'eye'

export type Tier = 0 | 1 | 2 | 3 | 4

export const TIERS = [
  { name: 'Bloqueada', xp: 0 },
  { name: 'Bronze', xp: 100 },
  { name: 'Prata', xp: 250 },
  { name: 'Ouro', xp: 500 },
  { name: 'Mestre', xp: 1000 },
] as const

export type Badge = {
  id: string
  name: string
  description: (goal: number) => string
  shape: BadgeShape
  icon: BadgeIcon
  color: string
  goals: number[]
  value: number
  tier: Tier
  next: number | null
  format?: (n: number) => string
}

const STARTERS = [
  'Bulbasaur', 'Charmander', 'Squirtle', 'Chikorita', 'Cyndaquil', 'Totodile', 'Treecko', 'Torchic', 'Mudkip',
  'Turtwig', 'Chimchar', 'Piplup', 'Snivy', 'Tepig', 'Oshawott', 'Chespin', 'Fennekin', 'Froakie',
  'Rowlet', 'Litten', 'Popplio', 'Grookey', 'Scorbunny', 'Sobble', 'Sprigatito', 'Fuecoco', 'Quaxly',
]

const LEGENDS = [
  'Articuno', 'Zapdos', 'Moltres', 'Mewtwo', 'Mew', 'Raikou', 'Entei', 'Suicune', 'Lugia', 'Ho-Oh', 'Celebi',
  'Regirock', 'Regice', 'Registeel', 'Latias', 'Latios', 'Kyogre', 'Groudon', 'Rayquaza', 'Jirachi', 'Deoxys',
  'Uxie', 'Mesprit', 'Azelf', 'Dialga', 'Palkia', 'Heatran', 'Regigigas', 'Giratina', 'Cresselia', 'Darkrai',
  'Shaymin', 'Arceus', 'Victini', 'Cobalion', 'Terrakion', 'Virizion', 'Tornadus', 'Thundurus', 'Landorus',
  'Reshiram', 'Zekrom', 'Kyurem', 'Keldeo', 'Meloetta', 'Genesect', 'Xerneas', 'Yveltal', 'Zygarde', 'Diancie',
  'Hoopa', 'Volcanion', 'Tapu Koko', 'Tapu Lele', 'Tapu Bulu', 'Tapu Fini', 'Solgaleo', 'Lunala', 'Necrozma',
  'Magearna', 'Marshadow', 'Zeraora', 'Zacian', 'Zamazenta', 'Eternatus', 'Calyrex', 'Koraidon', 'Miraidon',
  'Terapagos', 'Ogerpon',
]

// "Dark Charizard", "Charizard ex" e "Team Rocket's Mewtwo" contam como o Pokémon do nome.
const hasPokemon = (name: string, list: string[]) => list.some((p) => new RegExp(`(^|[\\s'’])${p}($|[\\s-])`, 'i').test(name))

const SUFFIX = /\s+(ex|gx|v|vmax|vstar|v-union|lv\.\s?x|break|prime|legend|star|δ|☆|x|y|tera)$/i
const PREFIX = /^(mega|dark|light|shining|radiant|alolan|galarian|hisuian|paldean|[\w.]+(\s[\w.]+)?['’]s)\s+/i

// Entrada da Pokédex: "Dark Charizard", "Charizard ex" e "Mega Charizard X" são todos o Charizard.
export function pokedexName(name: string) {
  let n = name.trim()
  for (let i = 0; i < 3; i++) n = n.replace(SUFFIX, '').replace(PREFIX, '')
  return n.toLowerCase()
}

const brl =(n: number) => `R$ ${n.toLocaleString('pt-BR')}`

type Def = Omit<Badge, 'value' | 'tier' | 'next'>

const n = (g: number, one: string, many: string) => (g === 1 ? one : many.replace('#', String(g)))

const DEFS: Def[] = [
  { id: 'colecionador', name: 'Colecionador', description: (g) => n(g, 'Adicione sua primeira carta', 'Tenha # cartas na coleção'), shape: 'octagon', icon: 'cards', color: '#FFD60A', goals: [1, 25, 100, 500] },
  { id: 'pokedex', name: 'Pokédex', description: (g) => `Registre ${g} Pokémon diferentes`, shape: 'pokeball', icon: 'book', color: '#EF4444', goals: [5, 30, 151, 400] },
  { id: 'tipos', name: 'Mestre dos Tipos', description: (g) => `Cartas de ${g} tipos diferentes`, shape: 'star', icon: 'palette', color: '#A855F7', goals: [3, 6, 9, Object.keys(TYPE_INFO).length] },
  { id: 'explorador', name: 'Explorador', description: (g) => `Cartas de ${g} coleções diferentes`, shape: 'hexagon', icon: 'map', color: '#38BDF8', goals: [2, 5, 15, 40] },
  { id: 'brilho', name: 'Caçador de Brilho', description: (g) => n(g, 'Tenha uma carta holo ou reverse', 'Tenha # cartas holo ou reverse'), shape: 'diamond', icon: 'sparkle', color: '#F472B6', goals: [1, 10, 30, 100] },
  { id: 'iniciais', name: 'Iniciais', description: (g) => `Tenha ${g} Pokémon iniciais diferentes`, shape: 'droplet', icon: 'leaf', color: '#4ADE80', goals: [3, 9, 18, 27] },
  { id: 'lendas', name: 'Lendário', description: (g) => n(g, 'Tenha um Pokémon lendário ou mítico', 'Tenha # lendários ou míticos diferentes'), shape: 'crown', icon: 'crown', color: '#F59E0B', goals: [1, 5, 15, 40] },
  { id: 'pikachu', name: 'Fã de Pikachu', description: (g) => n(g, 'Tenha uma carta do Pikachu', 'Tenha # cartas do Pikachu'), shape: 'bolt', icon: 'zap', color: '#FACC15', goals: [1, 5, 15, 40] },
  { id: 'segredo', name: 'Raridade Secreta', description: (g) => n(g, 'Tenha uma carta além da numeração do set', 'Tenha # cartas além da numeração do set'), shape: 'flame', icon: 'eye', color: '#FB923C', goals: [1, 5, 15, 40] },
  { id: 'graduada', name: 'Slab', description: (g) => n(g, 'Tenha uma carta graduada', 'Tenha # cartas graduadas'), shape: 'shield', icon: 'shield', color: '#94A3B8', goals: [1, 3, 10, 25] },
  { id: 'set', name: 'Mestre do Set', description: (g) => (g === 1 ? 'Complete um set inteiro' : `Complete ${g} sets inteiros`), shape: 'circle', icon: 'trophy', color: '#34D399', goals: [1, 3, 5, 10] },
  { id: 'tesouro', name: 'Tesouro', description: (g) => `Coleção avaliada em ${brl(g)}`, shape: 'heart', icon: 'gem', color: '#FF006E', goals: [200, 1000, 5000, 20000], format: brl },
]

export const BADGE_COUNT = DEFS.length

export const BADGES_BY_ID: Record<string, Def> = Object.fromEntries(DEFS.map((d) => [d.id, d]))

const tierOf = (value: number, goals: number[]) => goals.filter((g) => value >= g).length as Tier

// Insígnias calculadas a partir da coleção real; nada fica salvo à parte.
// value nulo (preço ainda carregando) deixa o Tesouro de fora para não piscar entre níveis.
export function computeBadges(entries: CollectionEntry[], value: number | null): Badge[] {
  const total = entries.reduce((n, e) => n + e.quantity, 0)
  const names = [...new Set(entries.filter((e) => e.card.category === 'pokemon').map((e) => e.card.name))]
  const types = new Set(entries.map((e) => e.card.type).filter(Boolean)).size
  const sets = new Set(entries.map((e) => e.card.setId)).size
  const shiny = entries.filter((e) => e.variant === 'holo' || e.variant === 'reverse').reduce((n, e) => n + e.quantity, 0)
  const starters = STARTERS.filter((s) => names.some((n) => hasPokemon(n, [s]))).length
  const legends = LEGENDS.filter((s) => names.some((n) => hasPokemon(n, [s]))).length
  const pikachu = entries.filter((e) => /pikachu/i.test(e.card.name)).reduce((n, e) => n + e.quantity, 0)
  const secret = new Set(
    entries
      .filter(({ card }) => {
        const [local, official] = card.number.split('/')
        return !isMainSetCard(card) && Number.parseInt(local, 10) > Number.parseInt(official, 10)
      })
      .map((e) => e.card.id),
  ).size
  const graded = entries.filter((e) => e.graded).reduce((n, e) => n + e.quantity, 0)
  const complete = setsInProgress(entries).filter((s) => s.owned >= s.official).length

  const values: Record<string, number> = {
    colecionador: total,
    pokedex: new Set(names.map(pokedexName)).size,
    tipos: types,
    explorador: sets,
    brilho: shiny,
    iniciais: starters,
    lendas: legends,
    pikachu,
    segredo: secret,
    graduada: graded,
    set: complete,
    tesouro: Math.floor(value ?? -1),
  }

  return DEFS.filter((d) => d.id !== 'tesouro' || value !== null).map((d) => {
    const v = Math.max(0, values[d.id])
    const tier = tierOf(v, d.goals)
    return { ...d, value: v, tier, next: d.goals[tier] ?? null }
  })
}

export const tierName = (t: Tier) => TIERS[t].name

// Progresso até o próximo nível da insígnia, de 0 a 1.
export function badgeProgress(b: Badge) {
  if (b.next === null) return 1
  const from = b.tier === 0 ? 0 : b.goals[b.tier - 1]
  return Math.min(1, Math.max(0, (b.value - from) / (b.next - from)))
}

// Nível de treinador: cada carta diferente vale 10 XP, cópias extras valem 2 e cada nível de insígnia soma o seu bônus.
export function trainerXp(entries: CollectionEntry[], badges: Badge[]) {
  const unique = new Set(entries.map((e) => e.card.id)).size
  const total = entries.reduce((n, e) => n + e.quantity, 0)
  const tiers = badges.reduce((n, b) => n + TIERS.slice(1, b.tier + 1).reduce((s, t) => s + t.xp, 0), 0)
  return unique * 10 + (total - unique) * 2 + tiers
}

const xpForLevel = (level: number) => 60 * (level - 1) ** 2

const TITLES: [number, string][] = [
  [50, 'Mestre Pokémon'],
  [40, 'Campeão'],
  [30, 'Elite dos Quatro'],
  [20, 'Líder de Ginásio'],
  [10, 'Treinador Veterano'],
  [5, 'Treinador'],
  [1, 'Treinador Iniciante'],
]

export function trainerLevel(xp: number) {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  const from = xpForLevel(level)
  const to = xpForLevel(level + 1)
  return {
    level,
    title: TITLES.find(([min]) => level >= min)![1],
    xp,
    into: xp - from,
    span: to - from,
    progress: (xp - from) / (to - from),
  }
}

// A insígnia mais perto de subir de nível, para o "Quase lá".
export function closestBadge(badges: Badge[]) {
  return badges.filter((b) => b.next !== null).sort((a, b) => badgeProgress(b) - badgeProgress(a))[0] ?? null
}
