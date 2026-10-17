import type { PokemonCard, PokemonType } from '../types/pokemon'

// Coleção inicial do modo demonstração (sem Supabase configurado).

const img = (id: number) => `https://assets.tcgdex.net/en/base/base1/${id}/high.webp`

export const card = (n: number, name: string, type: PokemonType, rarity: 'Rare' | 'Common', holo: boolean, hp: number): PokemonCard => ({
  id: `base1-${n}`,
  name,
  setId: 'base1',
  series: 'Base Set',
  releaseDate: '1999-01-09',
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
  card(10, 'Mewtwo', 'psychic', 'Rare', true, 60),
  card(16, 'Zapdos', 'lightning', 'Rare', true, 90),
  card(6, 'Gyarados', 'water', 'Rare', true, 100),
  card(14, 'Raichu', 'lightning', 'Rare', true, 80),
  card(18, 'Dragonair', 'colorless', 'Rare', false, 80),
  card(20, 'Electabuzz', 'lightning', 'Rare', false, 70),
  card(17, 'Beedrill', 'grass', 'Rare', false, 80),
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
