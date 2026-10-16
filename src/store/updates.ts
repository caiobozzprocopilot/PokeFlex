import { create } from 'zustand'
import { LATEST_VERSION } from '../data/updates'

const KEY = 'pokeflex:seen-update'

const read = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

type UpdatesState = { unseen: boolean; markSeen: () => void }

// "Visto" vale por navegador; serve só para acender o aviso de novidade.
export const useUpdates = create<UpdatesState>()((set) => ({
  unseen: read() !== LATEST_VERSION,
  markSeen: () => {
    try {
      localStorage.setItem(KEY, LATEST_VERSION)
    } catch {
      // Sem armazenamento: o aviso volta na próxima visita.
    }
    set({ unseen: false })
  },
}))
