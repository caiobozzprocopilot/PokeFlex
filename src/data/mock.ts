import type { PokemonCard, PokemonType } from '../types/pokemon'
import type { UserStats } from '../types/user'

const img = (id: number) => `https://assets.tcgdex.net/en/base/base1/${id}/high.webp`

const card = (n: number, name: string, type: PokemonType, rarity: 'Rare' | 'Common', holo: boolean, hp: number): PokemonCard => ({
  id: `base1-${n}`,
  name,
  setId: 'base1',
  series: 'Base Set',
  number: `${n}/102`,
  rarity,
  holo,
  variants: { normal: !holo, holo, reverse: false, firstEdition: true },
  category: 'pokemon',
  type,
  hp,
  imageUrl: img(n),
})

export const CARDS: PokemonCard[] = [
  card(4, 'Charizard', 'fire', 'Rare', true, 120),
  card(2, 'Blastoise', 'water', 'Rare', true, 100),
  card(15, 'Venusaur', 'grass', 'Rare', true, 100),
  card(10, 'Mewtwo', 'psychic', 'Rare', true, 60),
  card(16, 'Zapdos', 'lightning', 'Rare', true, 90),
  card(1, 'Alakazam', 'psychic', 'Rare', true, 80),
  card(6, 'Gyarados', 'water', 'Rare', true, 100),
  card(8, 'Machamp', 'fighting', 'Rare', true, 100),
  card(14, 'Raichu', 'lightning', 'Rare', true, 80),
  card(12, 'Ninetales', 'fire', 'Rare', true, 80),
  card(18, 'Dragonair', 'colorless', 'Rare', false, 80),
  card(20, 'Electabuzz', 'lightning', 'Rare', false, 70),
  card(17, 'Beedrill', 'grass', 'Rare', false, 80),
  card(19, 'Dugtrio', 'fighting', 'Rare', false, 70),
  card(58, 'Pikachu', 'lightning', 'Common', false, 40),
  card(46, 'Charmander', 'fire', 'Common', false, 50),
  card(44, 'Bulbasaur', 'grass', 'Common', false, 40),
  card(63, 'Squirtle', 'water', 'Common', false, 40),
]

export const OWNED: Record<string, number> = {
  'base1-4': 1,
  'base1-10': 1,
  'base1-16': 2,
  'base1-6': 1,
  'base1-14': 1,
  'base1-18': 2,
  'base1-20': 1,
  'base1-17': 3,
  'base1-58': 4,
  'base1-46': 2,
  'base1-44': 1,
  'base1-63': 2,
}

export const USER = {
  name: 'Caio',
  handle: '@caio',
  joined: 'out 2026',
}

export const STATS: UserStats = {
  level: 12,
  xp: 2140,
  nextLevelXp: 3138,
  totalCardsCollected: Object.values(OWNED).reduce((a, b) => a + b, 0),
  tradesCompleted: 7,
  badgesUnlocked: 5,
  streak: 6,
  joinedDaysAgo: 14,
}

export type Mission = { id: string; title: string; progress: number; goal: number; xp: number }

export const MISSIONS: Mission[] = [
  { id: 'm1', title: 'Adicione 3 cartas à coleção', progress: 2, goal: 3, xp: 30 },
  { id: 'm2', title: 'Proponha uma troca', progress: 0, goal: 1, xp: 50 },
  { id: 'm3', title: 'Visite a coleção de um amigo', progress: 1, goal: 1, xp: 15 },
]

export type BadgeItem = {
  id: string
  name: string
  description: string
  unlocked: boolean
  icon: 'cards' | 'flame' | 'gem' | 'swap' | 'crown' | 'star' | 'zap' | 'trophy'
}

export const BADGES: BadgeItem[] = [
  { id: 'b1', name: 'Primeira carta', description: 'Adicionou a primeira carta', unlocked: true, icon: 'cards' },
  { id: 'b2', name: 'Em chamas', description: '5 dias seguidos', unlocked: true, icon: 'flame' },
  { id: 'b3', name: 'Holo!', description: 'Primeira carta holográfica', unlocked: true, icon: 'gem' },
  { id: 'b4', name: 'Negociante', description: 'Completou 5 trocas', unlocked: true, icon: 'swap' },
  { id: 'b5', name: 'Elétrico', description: '5 cartas elétricas', unlocked: true, icon: 'zap' },
  { id: 'b6', name: 'Trio inicial', description: 'Os três iniciais de Kanto', unlocked: false, icon: 'star' },
  { id: 'b7', name: 'Centenário', description: 'Colete 100 cartas', unlocked: false, icon: 'trophy' },
  { id: 'b8', name: 'Mestre', description: 'Atinja o nível 100', unlocked: false, icon: 'crown' },
]

export type Trade = {
  id: string
  direction: 'recebida' | 'enviada'
  with: string
  give: string[]
  get: string[]
  status: 'pendente' | 'aceita' | 'recusada'
  when: string
}

export const TRADES: Trade[] = [
  { id: 't1', direction: 'recebida', with: 'Marina', give: ['base1-17'], get: ['base1-2'], status: 'pendente', when: 'há 2 h' },
  { id: 't2', direction: 'recebida', with: 'João', give: ['base1-58', 'base1-46'], get: ['base1-12'], status: 'pendente', when: 'há 5 h' },
  { id: 't3', direction: 'enviada', with: 'Bia', give: ['base1-18'], get: ['base1-15'], status: 'pendente', when: 'ontem' },
  { id: 't4', direction: 'enviada', with: 'Léo', give: ['base1-63'], get: ['base1-8'], status: 'aceita', when: 'há 3 dias' },
  { id: 't5', direction: 'recebida', with: 'Ana', give: ['base1-20'], get: ['base1-10'], status: 'recusada', when: 'há 4 dias' },
]

export const cardById = (id: string) => CARDS.find((c) => c.id === id)!
