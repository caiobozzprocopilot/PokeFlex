import type { CollectionEntry } from '../store/collection'

export type BadgeIcon = 'cards' | 'flame' | 'gem' | 'swap' | 'crown' | 'star' | 'zap' | 'trophy'

export type Badge = {
  id: string
  name: string
  description: string
  icon: BadgeIcon
  unlocked: boolean
  progress?: string
}

const STARTERS = ['Bulbasaur', 'Charmander', 'Squirtle']

// Conquistas calculadas a partir da coleção real; nada fica salvo à parte.
export function computeBadges(entries: CollectionEntry[], value: number | null): Badge[] {
  const total = entries.reduce((n, e) => n + e.quantity, 0)
  const names = new Set(entries.map((e) => e.card.name))
  const types = new Set(entries.map((e) => e.card.type).filter(Boolean))
  const sets = new Set(entries.map((e) => e.card.setId))
  const holo = entries.some((e) => e.variant === 'holo' || e.variant === 'reverse' || e.card.holo)
  const graded = entries.some((e) => e.graded)
  const starters = STARTERS.filter((s) => names.has(s)).length

  const count = (goal: number) => (total >= goal ? undefined : `${total}/${goal}`)

  return [
    { id: 'first', name: 'Primeira carta', description: 'Adicione uma carta à coleção', icon: 'cards', unlocked: total >= 1, progress: count(1) },
    { id: 'ten', name: 'Dezena', description: 'Tenha 10 cartas', icon: 'star', unlocked: total >= 10, progress: count(10) },
    { id: 'holo', name: 'Holo!', description: 'Tenha uma carta holográfica', icon: 'gem', unlocked: holo },
    {
      id: 'starters',
      name: 'Trio inicial',
      description: 'Bulbasaur, Charmander e Squirtle',
      icon: 'flame',
      unlocked: starters === 3,
      progress: starters < 3 ? `${starters}/3` : undefined,
    },
    {
      id: 'rainbow',
      name: 'Arco-íris',
      description: 'Cartas de 5 tipos diferentes',
      icon: 'zap',
      unlocked: types.size >= 5,
      progress: types.size < 5 ? `${types.size}/5` : undefined,
    },
    {
      id: 'explorer',
      name: 'Explorador',
      description: 'Cartas de 5 coleções diferentes',
      icon: 'swap',
      unlocked: sets.size >= 5,
      progress: sets.size < 5 ? `${sets.size}/5` : undefined,
    },
    { id: 'slab', name: 'Slab', description: 'Tenha uma carta graduada', icon: 'trophy', unlocked: graded },
    { id: 'hundred', name: 'Centenário', description: 'Tenha 100 cartas', icon: 'trophy', unlocked: total >= 100, progress: count(100) },
    {
      id: 'treasure',
      name: 'Tesouro',
      description: 'Coleção avaliada em R$ 1.000 ou mais',
      icon: 'crown',
      unlocked: value !== null && value >= 1000,
    },
  ]
}
