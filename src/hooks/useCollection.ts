import { useState, useCallback } from 'react'
import type { PokemonCard, CollectionCard } from '../types/pokemon'

export function useCollection() {
  const [collection, setCollection] = useState<CollectionCard[]>([])
  const [loading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addCard = useCallback((card: PokemonCard, condition: CollectionCard['condition'] = 'near-mint') => {
    try {
      setCollection(prev => {
        const existing = prev.find(c => c.cardId === card.id)
        if (existing) {
          return prev.map(c =>
            c.cardId === card.id ? { ...c, quantity: c.quantity + 1 } : c
          )
        }
        return [...prev, {
          cardId: card.id,
          quantity: 1,
          condition,
          addedAt: new Date(),
        }]
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar carta')
    }
  }, [])

  const removeCard = useCallback((cardId: string) => {
    try {
      setCollection(prev =>
        prev
          .map(c => c.cardId === cardId ? { ...c, quantity: c.quantity - 1 } : c)
          .filter(c => c.quantity > 0)
      )
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover carta')
    }
  }, [])

  const updateCard = useCallback((cardId: string, updates: Partial<CollectionCard>) => {
    try {
      setCollection(prev =>
        prev.map(c => c.cardId === cardId ? { ...c, ...updates } : c)
      )
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar carta')
    }
  }, [])

  const getStatistics = useCallback(() => {
    const totalCards = collection.reduce((sum, c) => sum + c.quantity, 0)
    const totalUnique = collection.length

    return {
      totalCards,
      totalUnique,
      averagePerCard: totalUnique > 0 ? (totalCards / totalUnique).toFixed(2) : 0,
    }
  }, [collection])

  return {
    collection,
    loading,
    error,
    addCard,
    removeCard,
    updateCard,
    getStatistics,
    setCollection,
  }
}
