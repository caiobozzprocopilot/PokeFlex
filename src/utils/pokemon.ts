import type { CardCategory, PokemonCard, PokemonType } from '../types/pokemon'

export const TYPE_INFO: Record<PokemonType, { label: string; color: string }> = {
  grass: { label: 'Planta', color: '#4ADE80' },
  fire: { label: 'Fogo', color: '#F97316' },
  water: { label: 'Água', color: '#38BDF8' },
  lightning: { label: 'Elétrico', color: '#FACC15' },
  psychic: { label: 'Psíquico', color: '#C084FC' },
  fighting: { label: 'Lutador', color: '#FB7185' },
  darkness: { label: 'Escuridão', color: '#64748B' },
  metal: { label: 'Metal', color: '#94A3B8' },
  dragon: { label: 'Dragão', color: '#818CF8' },
  fairy: { label: 'Fada', color: '#F9A8D4' },
  colorless: { label: 'Incolor', color: '#D6D3D1' },
}

export const CATEGORY_LABEL: Record<CardCategory, string> = {
  pokemon: 'Pokémon',
  trainer: 'Treinador',
  energy: 'Energia',
}

const RARITIES: [string, string][] = [
  ['common', 'Comum'],
  ['uncommon', 'Incomum'],
  ['rare', 'Rara'],
  ['rare holo', 'Rara holo'],
  ['double rare', 'Rara dupla'],
  ['illustration rare', 'Rara ilustrada'],
  ['ultra rare', 'Ultra rara'],
  ['special illustration rare', 'Ilustração especial'],
  ['secret rare', 'Rara secreta'],
  ['hyper rare', 'Hiper rara'],
  ['promo', 'Promo'],
  ['none', 'Sem raridade'],
]
const RARITY_INDEX = new Map(RARITIES.map(([k], i) => [k, i]))
const RARITY_PT = new Map(RARITIES)

export const rarityLabel = (rarity: string) => RARITY_PT.get(rarity.toLowerCase()) ?? rarity

// Raridades conhecidas na ordem do jogo; as desconhecidas vão para o fim em ordem alfabética.
export const compareRarity = (a: string, b: string) =>
  (RARITY_INDEX.get(a.toLowerCase()) ?? 99) - (RARITY_INDEX.get(b.toLowerCase()) ?? 99) || a.localeCompare(b)

export const isHolo = (c: PokemonCard) => c.holo

export const cardLabel = (c: PokemonCard) =>
  c.type ? TYPE_INFO[c.type].label : CATEGORY_LABEL[c.category]
