import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'

export type Point = { label: string; value: number }

interface LineChartProps {
  points: Point[]
  format: (v: number) => string
  title: string
  height?: number
}

const PAD = { top: 16, right: 16, bottom: 28, left: 64 }

function niceTicks(min: number, max: number, count = 3) {
  if (min === max) return [min]
  const step = (max - min) / (count - 1)
  return Array.from({ length: count }, (_, i) => min + step * i)
}

export function LineChart({ points, format, title, height = 220 }: LineChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [hover, setHover] = useState<number | null>(null)
  const gradientId = useId()

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const values = points.map((p) => p.value)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const pad = (rawMax - rawMin) * 0.15 || rawMax * 0.1 || 1
  const min = Math.max(0, rawMin - pad)
  const max = rawMax + pad
  const innerW = width - PAD.left - PAD.right
  const innerH = height - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const y = (v: number) => PAD.top + innerH - ((v - min) / (max - min)) * innerH

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${PAD.top + innerH} L${x(0).toFixed(1)},${PAD.top + innerH} Z`

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    let best = 0
    for (let i = 1; i < points.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i
    setHover(best)
  }

  const active = hover ?? points.length - 1
  const tipLeft = Math.min(Math.max(x(active), 70), width - 70)

  return (
    <figure ref={wrapRef} className="relative">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${title}: de ${format(values[0])} a ${format(values[values.length - 1])}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        className="block touch-none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity="0.22" />
            <stop offset="100%" stopColor="rgb(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {niceTicks(min, max).map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="rgb(var(--line))" strokeDasharray="2 4" />
            <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted font-mono text-[11px]">
              {format(t)}
            </text>
          </g>
        ))}

        {points.length > 1 && <path d={area} fill={`url(#${gradientId})`} />}
        {points.length > 1 && (
          <path d={line} fill="none" stroke="rgb(var(--primary))" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}

        <line
          x1={x(active)}
          x2={x(active)}
          y1={PAD.top}
          y2={PAD.top + innerH}
          stroke="rgb(var(--muted))"
          strokeOpacity={hover === null ? 0 : 0.5}
        />
        <circle cx={x(active)} cy={y(points[active].value)} r={5} fill="rgb(var(--primary))" stroke="rgb(var(--surface))" strokeWidth={2} />

        <text x={x(0)} y={height - 8} textAnchor={points.length === 1 ? 'middle' : 'start'} className="fill-muted text-[11px]">
          {points[0].label}
        </text>
        {points.length > 1 && (
          <text x={x(points.length - 1)} y={height - 8} textAnchor="end" className="fill-muted text-[11px]">
            {points[points.length - 1].label}
          </text>
        )}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-line bg-raised px-3 py-1.5 text-center shadow-card"
          style={{ left: tipLeft }}
        >
          <p className="text-[11px] text-muted">{points[hover].label}</p>
          <p className="font-mono text-sm tabular-nums text-ink">{format(points[hover].value)}</p>
        </div>
      )}

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Dia</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.label}>
              <td>{p.label}</td>
              <td>{format(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
