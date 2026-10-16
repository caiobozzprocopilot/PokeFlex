import { create } from 'zustand'

export type Page = 'inicio' | 'colecao' | 'valor' | 'desejos' | 'perfil' | 'busca'

const PAGES: Page[] = ['inicio', 'colecao', 'valor', 'desejos', 'perfil', 'busca']

export const SET_KEY = 'pokeflex:set'

const fromHash = (): { page: Page; query: string } => {
  const [path, search = ''] = window.location.hash.replace(/^#\/?/, '').split('?')
  const page = PAGES.includes(path as Page) ? (path as Page) : 'inicio'
  return { page, query: page === 'busca' ? new URLSearchParams(search).get('q') ?? '' : '' }
}

type UiState = {
  page: Page
  query: string
  go: (page: Page) => void
  search: (query: string, replace?: boolean) => void
  openSet: (setId: string) => void
}

export const useUi = create<UiState>((set, get) => ({
  ...fromHash(),
  go: (page) => {
    window.location.hash = `/${page}`
    set({ page })
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
