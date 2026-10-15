export type PokemonType =
  | 'grass'
  | 'fire'
  | 'water'
  | 'lightning'
  | 'psychic'
  | 'fighting'
  | 'darkness'
  | 'metal'
  | 'dragon'
  | 'fairy'
  | 'colorless'

export type CardCategory = 'pokemon' | 'trainer' | 'energy'

export type CardVariant = 'normal' | 'holo' | 'reverse' | 'firstEdition'

export type CardVariants = Record<CardVariant, boolean>

export interface PokemonCard {
  id: string
  name: string
  setId: string
  series: string
  releaseDate?: string
  number: string
  rarity: string
  holo: boolean
  variants: CardVariants
  category: CardCategory
  type?: PokemonType
  hp?: number
  imageUrl: string
}

export interface CardSet {
  id: string
  name: string
  logo?: string
  releaseDate: string
  official: number
  total: number
  serie: { id: string; name: string }
}

export interface UserCollection {
  userId: string
  cards: CollectionCard[]
  totalCards: number
  statistics: CollectionStats
}

export interface CollectionCard {
  cardId: string
  quantity: number
  condition: 'mint' | 'near-mint' | 'lightly-played' | 'moderately-played' | 'heavily-played' | 'damaged'
  addedAt: Date
  notes?: string
}

export interface CollectionStats {
  totalCards: number
  totalUnique: number
  completedSeries: number
  rarityDistribution: Record<string, number>
  percentageComplete: number
}
