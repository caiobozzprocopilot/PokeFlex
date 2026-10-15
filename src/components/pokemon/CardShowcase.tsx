import { useMemo, useRef } from 'react'
import CircularCarousel, { type CircularCarouselProps } from '../reactbits/CircularCarousel'
import type { PokemonCard } from '../../types/pokemon'
import { cardLabel, rarityLabel } from '../../utils/pokemon'

interface CardShowcaseProps {
  cards: PokemonCard[]
  onOpen: (card: PokemonCard) => void
  preset?: CircularCarouselProps['preset']
  cardWidth?: number
  fadeColor: string
  className?: string
}

const CARD_RATIO = 63 / 88

export function CardShowcase({ cards, onOpen, preset = 'cylinder', cardWidth = 190, fadeColor, className }: CardShowcaseProps) {
  const active = useRef(0)

  const items = useMemo(
    () =>
      cards.map((c) => ({
        src: c.imageUrl,
        alt: c.name,
        title: c.name,
        subtitle: `${cardLabel(c)} · ${rarityLabel(c.rarity)}`,
      })),
    [cards],
  )

  return (
    <CircularCarousel
      items={items}
      preset={preset}
      intro="rise"
      cardWidth={cardWidth}
      aspectRatio={CARD_RATIO}
      gap={28}
      speed={12}
      cornerRadius={9}
      fadeColor={fadeColor}
      depthFade={0.7}
      captions
      className={className}
      onChange={(i) => (active.current = i)}
      // A carta da frente abre os detalhes; as laterais só giram até a frente.
      onItemClick={(_, i) => i === active.current && onOpen(cards[i])}
    />
  )
}
