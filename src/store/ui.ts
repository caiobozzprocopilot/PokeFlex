import { create } from 'zustand'

export type Page = 'inicio' | 'colecao' | 'valor' | 'desejos' | 'perfil' | 'busca' | 'novidades' | 'treinadores' | 'treinador'

const PAGES: Page[] = ['inicio', 'colecao', 'valor', 'desejos', 'perfil', 'busca', 'novidades', 'treinadores']

export const SET_KEY = 'pokeflex:set'

// #/t/misty abre o perfil público da Misty.
const fromHash = (): { page: Page; query: string; trainer: string } => {
  const [path, search = ''] = window.location.hash.replace(/^#\/?/, '').split('?')
  const handle = /^t\/([a-z0-9_]{1,20})$/i.exec(path)?.[1]
  if (handle) return { page: 'treinador', query: '', trainer: handle.toLowerCase() }
  const page = PAGES.includes(path as Page) ? (path as Page) : 'inicio'
  return { page, query: page === 'busca' ? (new URLSearchParams(search).get('q') ?? '') : '', trainer: '' }
}

type UiState = {
  page: Page
  query: string
  trainer: string
  go: (page: Page) => void
  openTrainer: (username: string) => void
  search: (query: string, replace?: boolean) => void
  openSet: (setId: string) => void
  scanning: boolean
  setScanning: (open: boolean) => void
}

export const useUi = create<UiState>((set, get) => ({
  ...fromHash(),
  scanning: false,
  setScanning: (scanning) => set({ scanning }),
  go: (page) => {
    window.location.hash = `/${page}`
    set({ page })
    window.scrollTo({ top: 0 })
  },
  openTrainer: (username) => {
    window.location.hash = `/t/${username}`
    set({ page: 'treinador', trainer: username })
    window.scrollTo({ top: 0 })
  },
  search: (query, replace = false) => {
    const hash = `#/busca${query ? `?q=${encodeURIComponent(query)}` : ''}`
    if (replace) history.replaceState(null, '', hash)
    else window.location.hash = hash
    set({ page: 'busca', query })
  },
  openSet: (setId) => {
    try {
      localStorage.setItem(SET_KEY, setId)
    } catch {
      // Sem armazenamento: a Coleção abre no set padrão.
    }
    get().go('colecao')
  },
}))

window.addEventListener('hashchange', () => useUi.setState(fromHash()))
