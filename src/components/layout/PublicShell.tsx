import type { ReactNode } from 'react'
import { LogIn } from 'lucide-react'
import { useUi } from '../../store/ui'
import { Button } from '../ui/Button'
import { Logo } from './AppShell'

// Moldura para quem visita um perfil público sem estar logado.
export function PublicShell({ children }: { children: ReactNode }) {
  const go = useUi((s) => s.go)
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <Button size="sm" onClick={() => go('inicio')}>
            <LogIn size={15} aria-hidden /> Entrar
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        {children}
        <section className="panel mt-10 flex flex-col items-center px-6 py-10 text-center">
          <img src="/favicon.svg" alt="" className="h-12 w-12" />
          <h2 className="mt-4 text-2xl font-bold">Monte sua coleção também</h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            No PokeFlex você registra suas cartas, acompanha o preço em reais, conquista insígnias e segue outros treinadores. É grátis.
          </p>
          <Button className="mt-6" onClick={() => go('inicio')}>
            Criar minha conta
          </Button>
        </section>
      </main>
    </div>
  )
}
