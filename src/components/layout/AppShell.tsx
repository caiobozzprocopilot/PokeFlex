import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { Heart, Home, Layers, LogOut, Search, TrendingUp, User, type LucideIcon } from 'lucide-react'
import { useUi, type Page } from '../../store/ui'
import { useWishlist } from '../../store/wishlist'
import { useWishlistPricing } from '../../hooks/useWishlistPricing'
import { useAuth } from '../../store/auth'
import { useProfile } from '../../store/profile'
import { Avatar } from '../profile/Avatar'

const NAV: { page: Page; label: string; icon: LucideIcon }[] = [
  { page: 'inicio', label: 'Início', icon: Home },
  { page: 'colecao', label: 'Coleção', icon: Layers },
  { page: 'valor', label: 'Valor', icon: TrendingUp },
  { page: 'desejos', label: 'Desejos', icon: Heart },
  { page: 'perfil', label: 'Perfil', icon: User },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-primary">
        <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-bg" />
        <span className="relative h-3 w-3 rounded-full border-2 border-bg bg-primary" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight">
        Poke<span className="text-primary">Flex</span>
      </span>
    </div>
  )
}

function HeaderSearch() {
  const search = useUi((s) => s.search)
  const page = useUi((s) => s.page)
  const [value, setValue] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key !== '/' || target.closest('input, textarea, [contenteditable]') || document.querySelector('dialog[open]')) return
      e.preventDefault()
      ref.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    search(value.trim())
    setValue('')
    ref.current?.blur()
  }

  if (page === 'busca') return <div className="hidden flex-1 lg:block" />

  return (
    <form onSubmit={submit} role="search" className="relative hidden max-w-md flex-1 lg:block">
      <label className="sr-only" htmlFor="header-search">
        Buscar carta em todas as coleções
      </label>
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
      <input
        id="header-search"
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar carta em todas as coleções"
        className="h-10 w-full rounded-xl border border-line bg-surface pl-10 pr-10 text-sm placeholder:text-muted focus:border-primary focus:outline-none"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line px-1.5 font-mono text-[11px] text-muted">
        /
      </kbd>
    </form>
  )
}

export function AppShell({ children, boot = false }: { children: ReactNode; boot?: boolean }) {
  const { page, go } = useUi()
  const user = useAuth((s) => s.user)!
  const signOut = useAuth((s) => s.signOut)
  const avatarUrl = useProfile((s) => s.avatarUrl)
  const wishes = useWishlist((s) => s.items)
  const alerts = useWishlistPricing(wishes).list.filter((w) => w.belowTarget).length
  const badge = (p: Page) =>
    p === 'desejos' && alerts > 0 ? (
      <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-success px-1.5 font-mono text-[11px] font-semibold text-bg">
        {alerts}
        <span className="sr-only"> abaixo do alvo</span>
      </span>
    ) : null

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]" data-boot={boot || undefined}>
      {boot && <div aria-hidden className="boot-sweep" />}
      <aside className="boot-x sticky top-0 hidden h-screen flex-col border-r border-line bg-surface/60 px-4 py-6 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav className="mt-10 flex flex-col gap-1" aria-label="Principal">
          {NAV.map(({ page: p, label, icon: Icon }, i) => {
            const active = p === page
            return (
              <button
                key={p}
                onClick={() => go(p)}
                aria-current={active ? 'page' : undefined}
                style={{ '--i': i + 2 } as CSSProperties}
                className={`boot flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                  active ? 'bg-raised text-ink' : 'text-muted hover:bg-raised/60 hover:text-ink'
                }`}
              >
                <Icon size={18} className={active ? 'text-primary' : ''} aria-hidden />
                {label}
                {badge(p)}
              </button>
            )
          })}
        </nav>
        <button
          onClick={signOut}
          className="mt-auto flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-raised/60 hover:text-ink"
        >
          <LogOut size={16} aria-hidden /> Sair
        </button>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="boot-down sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <div className="lg:hidden">
              <Logo />
            </div>
            <HeaderSearch />
            <div className="flex items-center gap-3">
              <button
                onClick={() => go('busca')}
                aria-label="Buscar carta"
                className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink lg:hidden"
              >
                <Search size={18} aria-hidden />
              </button>
              <button onClick={() => go('perfil')} aria-label="Abrir perfil" className="rounded-full">
                <Avatar name={user.name} url={avatarUrl} />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-12">{children}</main>
      </div>

      <nav
        aria-label="Principal"
        className="boot-up fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <div className="grid grid-cols-5">
          {NAV.map(({ page: p, label, icon: Icon }) => {
            const active = p === page
            return (
              <button
                key={p}
                onClick={() => go(p)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                  active ? 'text-primary' : 'text-muted'
                }`}
              >
                <Icon size={20} aria-hidden />
                {label}
                {p === 'desejos' && alerts > 0 && (
                  <span
                    className="absolute right-[22%] top-2.5 h-2 w-2 rounded-full bg-success"
                    aria-label={`${alerts} abaixo do alvo`}
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
