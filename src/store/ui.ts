import { create } from 'zustand'

export type Page = 'inicio' | 'colecao' | 'trocas' | 'perfil' | 'busca'

const PAGES: Page[] = ['inicio', 'colecao', 'trocas', 'perfil', 'busca']

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
}

export const useUi = create<UiState>((set) => ({
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
}))

window.addEventListener('hashchange', () => useUi.setState(fromHash()))
