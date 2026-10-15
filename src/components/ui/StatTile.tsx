import type { LucideIcon } from 'lucide-react'
import { useCountUp } from '../../hooks/useCountUp'

interface StatTileProps {
  icon: LucideIcon
  label: string
  value: string | number
  hint?: string
  tone?: 'primary' | 'accent' | 'success' | 'muted'
}

const TONES = {
  primary: 'text-primary bg-primary/10',
  accent: 'text-accent bg-accent/10',
  success: 'text-success bg-success/10',
  muted: 'text-ink bg-raised',
}

function AnimatedValue({ value }: { value: string | number }) {
  const [, num = '', rest = String(value)] = String(value).match(/^(\d+)(.*)$/) ?? []
  const counted = useCountUp(num ? Number(num) : 0, 1000, 350)
  return (
    <>
      {num ? counted : ''}
      {rest}
    </>
  )
}

export function StatTile({ icon: Icon, label, value, hint, tone = 'muted' }: StatTileProps) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${TONES[tone]}`}>
          <Icon size={18} aria-hidden />
        </span>
        <span className="label">{label}</span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold tabular-nums" aria-label={String(value)}>
        <AnimatedValue value={value} />
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}
