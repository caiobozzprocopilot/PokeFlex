import { create } from 'zustand'
import { fetchTrades, respondTrade, type Trade, type TradeAction } from '../services/trades'

type TradesState = {
  items: Trade[]
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  act: (id: string, action: TradeAction) => Promise<void>
}

export const useTrades = create<TradesState>()((set, get) => ({
  items: [],
  loaded: false,
  error: null,

  load: async () => {
    try {
      set({ items: await fetchTrades(), loaded: true, error: null })
    } catch (err) {
      set({ loaded: true, error: err instanceof Error ? err.message : 'Não foi possível carregar suas trocas.' })
    }
  },

  act: async (id, action) => {
    await respondTrade(id, action)
    await get().load()
  },
}))

// O que pede uma ação sua: propostas recebidas esperando resposta e trocas concluídas a registrar na coleção.
export const needsAttention = (t: Trade) => (t.status === 'pending' && !t.outgoing) || (t.status === 'completed' && !t.applied)

export const useTradeAlerts = () => useTrades((s) => s.items.filter(needsAttention).length)
