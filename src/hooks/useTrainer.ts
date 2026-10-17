import { useEffect, useMemo } from 'react'
import { useCollection } from '../store/collection'
import { useFx, type Celebration } from '../store/fx'
import { computeBadges, trainerLevel, trainerXp, type Tier } from '../utils/achievements'
import { useCollectionPricing } from './useCollectionValue'
import { postAchievement } from '../services/social'
import { useMascot } from '../store/mascot'

// Insígnias, XP e nível do treinador calculados da coleção real.
export function useTrainer() {
  const entries = useCollection((s) => s.entries)
  const pricing = useCollectionPricing(entries)
  const value = pricing.loading ? null : pricing.total
  const badges = useMemo(() => computeBadges(entries, value), [entries, value])
  const level = useMemo(() => trainerLevel(trainerXp(entries, badges)), [entries, badges])
  return { badges, level, pricing }
}

// Evolução do Fagulin: comemora quando o estágio passa do último que o treinador viu.
export function useMascotWatcher(userId: string | null) {
  const stage = useMascot((s) => s.status?.stage)
  const celebrate = useFx((s) => s.celebrate)

  useEffect(() => {
    if (!userId || !stage) return
    const key = `pokeflex:mascot-stage:${userId}`
    let seen: number | null = null
    try {
      const raw = localStorage.getItem(key)
      seen = raw ? Number(raw) : null
    } catch {
      seen = null
    }
    if (seen !== null && stage > seen) celebrate([{ kind: 'mascot', key: `mascot-${stage}`, stage, from: seen }])
    if (seen === null || stage > seen) {
      try {
        localStorage.setItem(key, String(stage))
      } catch {
        // Sem armazenamento: a evolução pode ser comemorada de novo.
      }
    }
  }, [userId, stage, celebrate])
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
    if (items.length) {
      celebrate(items)
      for (const item of items) {
        if (item.kind === 'badge') void postAchievement({ kind: 'badge', id: item.badge.id, name: item.badge.name, tier: item.tier }).catch(() => {})
        else if (item.kind === 'level') void postAchievement({ kind: 'level', level: item.level, title: item.title }).catch(() => {})
      }
    }
  }, [userId, status, pricing.loading, badges, level, celebrate])
}
