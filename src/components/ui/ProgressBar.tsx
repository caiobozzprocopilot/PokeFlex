import { useEffect, useState } from 'react'

interface ProgressBarProps {
  value: number
  max: number
  tone?: 'primary' | 'accent' | 'success'
  size?: 'sm' | 'md'
  label?: string
}

const TONES = { primary: 'bg-primary', accent: 'bg-accent', success: 'bg-success' }

export function ProgressBar({ value, max, tone = 'primary', size = 'md', label }: ProgressBarProps) {
  const target = Math.min(100, Math.round((value / max) * 100))
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPct(target))
    return () => cancelAnimationFrame(raf)
  }, [target])
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={`w-full overflow-hidden rounded-full bg-raised ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}
    >
      <div className={`h-full rounded-full ${TONES[tone]} transition-[width] delay-300 duration-1000 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  )
}
