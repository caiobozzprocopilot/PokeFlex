import { useEffect } from 'react'
import { useCollection } from '../../store/collection'
import { useValueHistory } from '../../store/valueHistory'
import { useCollectionPricing } from '../../hooks/useCollectionValue'

// Grava o valor da coleção do dia (um registro por dia, atualizado quando a coleção muda).
export function ValueRecorder({ userId }: { userId: string | null }) {
  const entries = useCollection((s) => s.entries)
  const status = useCollection((s) => s.status)
  const load = useValueHistory((s) => s.load)
  const record = useValueHistory((s) => s.record)
  const loadedFor = useValueHistory((s) => s.loadedFor)
  const pricing = useCollectionPricing(entries)

  useEffect(() => {
    load(userId)
  }, [userId, load])

  useEffect(() => {
    if (status !== 'ready' || pricing.loading || pricing.error || loadedFor === null || entries.length === 0) return
    const current =
      pricing.items.length === entries.length &&
      pricing.items.every((it, i) => it.entry.id === entries[i].id && it.entry.quantity === entries[i].quantity)
    if (!current) return
    record(userId, pricing.total, entries.reduce((n, e) => n + e.quantity, 0))
  }, [status, pricing, entries, loadedFor, userId, record])

  return null
}
