import type { ReactNode } from 'react'

interface ChipProps {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  dot?: string
}

export function Chip({ active, onClick, children, dot }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors ${
        active ? 'border-primary bg-primary/10 text-primary' : 'border-line text-muted hover:text-ink hover:border-muted/50'
      }`}
    >
      {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
      {children}
    </button>
  )
}
