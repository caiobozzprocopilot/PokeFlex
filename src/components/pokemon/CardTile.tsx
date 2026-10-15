import { useRef, useState, type PointerEvent } from 'react'
import { Check, ImageOff, Lock } from 'lucide-react'
import type { PokemonCard } from '../../types/pokemon'
import { cardLabel, isHolo, rarityLabel, TYPE_INFO } from '../../utils/pokemon'

interface CardTileProps {
  card: PokemonCard
  quantity?: number
  owned?: boolean
  showMeta?: boolean
  size?: 'sm' | 'md'
  mark?: boolean
  subtitle?: string
}

export function CardTile({ card, quantity = 0, owned = true, showMeta = true, size = 'md', mark = false, subtitle }: CardTileProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(!card.imageUrl)
  const holo = owned && isHolo(card)
  const type = card.type ? TYPE_INFO[card.type] : undefined

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse') return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--mx', `${x * 100}%`)
    el.style.setProperty('--my', `${y * 100}%`)
    el.style.setProperty('--rx', `${(0.5 - y) * 14}deg`)
    el.style.setProperty('--ry', `${(x - 0.5) * 14}deg`)
  }

  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  return (
    <figure className="group">
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        data-holo={holo}
        className={`holo relative aspect-[63/88] overflow-hidden rounded-[4.5%/3.2%] bg-raised ${
          holo ? 'ring-1 ring-primary/30 group-hover:shadow-glow' : 'ring-1 ring-line'
        }`}
      >
        {!loaded && !failed && <div className="absolute inset-0 animate-pulse bg-raised" />}
        {failed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center text-muted">
            <ImageOff size={22} aria-hidden />
            <span className="text-xs">{card.name}</span>
          </div>
        ) : (
        <img
          src={card.imageUrl}
          alt={card.name}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${
            owned ? '' : 'grayscale opacity-30'
          }`}
        />
        )}
        {!owned && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-bg/80 text-muted">
              <Lock size={18} aria-label="Não coletada" />
            </span>
          </div>
        )}
        {mark && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-success/90 px-1.5 py-0.5 text-[11px] font-semibold text-bg">
            <Check size={12} aria-hidden /> Tenho
          </span>
        )}
        {quantity > 1 && (
          <span className="absolute right-2 top-2 rounded-md bg-bg/85 px-1.5 py-0.5 font-mono text-xs font-medium text-ink backdrop-blur">
            ×{quantity}
          </span>
        )}
      </div>
      {showMeta && (
        <figcaption className={`mt-2.5 ${size === 'sm' ? 'space-y-0' : 'space-y-0.5'}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`truncate font-medium ${size === 'sm' ? 'text-sm' : 'text-[15px]'} ${owned ? 'text-ink' : 'text-muted'}`}>
              {card.name}
            </span>
            <span className="font-mono text-xs text-muted">{card.number.split('/')[0]}</span>
          </div>
          {size === 'md' && subtitle && <div className="truncate text-xs text-muted">{subtitle}</div>}
          {size === 'md' && !subtitle && (
            <div className="flex items-center gap-2 text-xs text-muted">
              {type && <span className="h-2 w-2 rounded-full" style={{ background: type.color }} />}
              <span>{cardLabel(card)}</span>
              <span aria-hidden>·</span>
              <span className={holo ? 'text-primary' : ''}>{rarityLabel(card.rarity)}</span>
            </div>
          )}
        </figcaption>
      )}
    </figure>
  )
}
