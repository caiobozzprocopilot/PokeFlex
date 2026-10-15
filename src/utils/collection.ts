import type { CardVariant, PokemonCard } from '../types/pokemon'
import type { Language } from '../store/collection'

export const VARIANT_LABEL: Record<CardVariant, string> = {
  normal: 'Normal',
  holo: 'Holo',
  reverse: 'Reverse holo',
  firstEdition: '1ª edição',
}

export const LANGUAGES: { id: Language; label: string; short: string }[] = [
  { id: 'pt', label: 'Português', short: 'PT' },
  { id: 'en', label: 'Inglês', short: 'EN' },
  { id: 'jp', label: 'Japonês', short: 'JP' },
  { id: 'es', label: 'Espanhol', short: 'ES' },
  { id: 'outro', label: 'Outro', short: '—' },
]

export const GRADERS = ['PSA', 'CGC', 'BGS', 'TAG', 'Outra']

export const availableVariants = (card: PokemonCard): CardVariant[] => {
  const list = (Object.keys(VARIANT_LABEL) as CardVariant[]).filter((v) => card.variants[v])
  return list.length ? list : ['normal']
}

export const defaultVariant = (card: PokemonCard): CardVariant => {
  const list = availableVariants(card)
  return list.includes('normal') ? 'normal' : list.includes('holo') ? 'holo' : list[0]
}
