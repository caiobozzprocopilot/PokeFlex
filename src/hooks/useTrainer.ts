import { useEffect, useMemo } from 'react'
import { useCollection } from '../store/collection'
import { useFx, type Celebration } from '../store/fx'
import { computeBadges, trainerLevel, trainerXp, type Tier } from '../utils/achievements'
import { useCollectionPricing } from './useCollectionValue'

// Insígnias, XP e nível do treinador calculados da coleção real.
export function useTrainer() {
  const entries = useCollection((s) => s.entries)
  const pricing = useCollectionPricing(entries)
  const value = pricing.loading ? null : pricing.total
  const badges = useMemo(() => computeBadges(entries, value), [entries, value])
  const level = useMemo(() => trainerLevel(trainerXp(entries, badges)), [entries, badges])
  return { badges, level, pricing }
}

type Seen = { tiers: Record<string, Tier>; level: number }

const read = (key: string): Seen | null => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Seen) : null
  } catch {
    return null
  }
}

const write = (key: string, seen: Seen) => {
  try {
    localStorage.setItem(key, JSON.stringify(seen))
  } catch {
    // Sem armazenamento: as comemorações podem se repetir na próxima visita.
  }
}

// Compara com o que o treinador já viu e põe na fila cada insígnia nova e cada nível novo.
// Na primeira vez só registra, para não comemorar a coleção inteira de uma vez.
export function useAchievementWatcher(userId: string | null) {
  const status = useCollection((s) => s.status)
  const { badges, level, pricing } = useTrainer()
  const celebrate = useFx((s) => s.celebrate)

  useEffect(() => {
    if (!userId || status !== 'ready' || pricing.loading) return
    const key = `pokeflex:trainer:${userId}`
    const seen = read(key)
    const tiers: Record<string, Tier> = { ...(seen?.tiers ?? {}) }
    const items: Celebration[] = []
    for (const b of badges) {
      const before = tiers[b.id] ?? 0
      if (b.tier > before) {
        if (seen) items.push({ kind: 'badge', key: `${b.id}-${b.tier}`, badge: b, tier: b.tier })
        tiers[b.id] = b.tier
      }
    }
    if (seen && level.level > seen.level) items.push({ kind: 'level', key: `level-${level.level}`, level: level.level, title: level.title })
    const changed = !seen || items.length > 0 || Object.keys(tiers).length !== Object.keys(seen.tiers).length
    if (changed) write(key, { tiers, level: Math.max(level.level, seen?.level ?? 0) })
    if (items.length) celebrate(items)
  }, [userId, status, pricing.loading, badges, level, celebrate])
}
