import { useState } from 'react'

interface AvatarProps {
  name: string
  url: string | null
  className?: string
  textClassName?: string
}

export function Avatar({ name, url, className = 'h-9 w-9', textClassName = 'text-sm' }: AvatarProps) {
  const [broken, setBroken] = useState<string | null>(null)
  const showImage = url && broken !== url

  return showImage ? (
    <img src={url} alt={`Foto de ${name}`} onError={() => setBroken(url)} className={`${className} shrink-0 rounded-full object-cover`} />
  ) : (
    <span
      aria-hidden
      className={`${className} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-primary font-display font-bold text-bg ${textClassName}`}
    >
      {name[0]?.toUpperCase()}
    </span>
  )
}
