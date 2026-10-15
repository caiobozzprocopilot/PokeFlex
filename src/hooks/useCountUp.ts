import { useEffect, useState } from 'react'

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export function useCountUp(target: number, duration = 900, delay = 0) {
  const [value, setValue] = useState(() => (reduced() ? target : 0))

  useEffect(() => {
    if (reduced()) {
      setValue(target)
      return
    }
    let raf = 0
    let start = 0
    const tick = (now: number) => {
      if (!start) start = now + delay
      const t = Math.min(1, Math.max(0, (now - start) / duration))
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, delay])

  return value
}
