import { useCallback, useEffect, useRef, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { ValueRecorder } from './components/layout/ValueRecorder'
import { useUi } from './store/ui'
import { useAuth } from './store/auth'
import { useCollection } from './store/collection'
import { useWishlist } from './store/wishlist'
import { useProfile } from './store/profile'
import { useShowcases } from './store/showcases'
import { Dashboard } from './pages/Dashboard'
import { Collection } from './pages/Collection'
import { Value } from './pages/Value'
import { Wishlist } from './pages/Wishlist'
import { Profile } from './pages/Profile'
import { Login } from './pages/Login'
import { Search } from './pages/Search'
import { Updates } from './pages/Updates'
import { Trainers } from './pages/Trainers'
import { TrainerProfile } from './pages/TrainerProfile'
import { PublicShell } from './components/layout/PublicShell'
import { useSocial } from './store/social'
import { useMascot } from './store/mascot'
import { usePush } from './store/push'

// Toque numa notificação com o app aberto: o service worker pede para ir à tela certa.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'navigate' && typeof e.data.url === 'string') window.location.href = e.data.url
  })
}

const PAGES = {
  inicio: Dashboard,
  colecao: Collection,
  valor: Value,
  desejos: Wishlist,
  perfil: Profile,
  busca: Search,
  novidades: Updates,
  treinadores: Trainers,
  treinador: TrainerProfile,
}

const BOOT_MS = 3500

type Gate = 'open' | 'revealing' | 'closed'

function App() {
  const page = useUi((s) => s.page)
  const trainer = useUi((s) => s.trainer)
  const user = useAuth((s) => s.user)
  const authReady = useAuth((s) => s.ready)
  const userId = user?.id ?? null
  const [gate, setGate] = useState<Gate>('open')
  const [boot, setBoot] = useState(false)
  const restored = useRef(false)

  useEffect(() => {
    if (!user) setGate('open')
  }, [user])

  // Sessão já salva ao abrir o app: entra direto no Início, sem a intro da Pokédex.
  useEffect(() => {
    if (!authReady || restored.current) return
    restored.current = true
    if (useAuth.getState().user) setGate('closed')
  }, [authReady])

  useEffect(() => {
    if (!authReady) return
    useCollection.getState().load(userId)
    useWishlist.getState().load(userId)
    useProfile.getState().load(userId)
    useShowcases.getState().load(userId)
    useSocial.getState().load(userId)
    useMascot.getState().load(userId)
    void usePush.getState().load(userId)
  }, [authReady, userId])

  useEffect(() => {
    if (!boot) return
    const t = setTimeout(() => setBoot(false), BOOT_MS)
    return () => clearTimeout(t)
  }, [boot])

  const reveal = useCallback(() => {
    setGate('revealing')
    setBoot(true)
  }, [])
  const done = useCallback(() => setGate('closed'), [])

  const Page = PAGES[page]
  // Link de perfil aberto por quem não tem conta: mostra o perfil direto, sem a intro de login.
  const visiting = authReady && !user && page === 'treinador'
  return (
    <>
      {user && <ValueRecorder userId={userId} />}
      {user && gate !== 'open' && (
        <AppShell boot={boot}>
          <Page key={page === 'treinador' ? `t-${trainer}` : page} />
        </AppShell>
      )}
      {visiting && (
        <PublicShell>
          <TrainerProfile key={trainer} />
        </PublicShell>
      )}
      {gate !== 'closed' &&
        !visiting &&
        (authReady ? <Login onReveal={reveal} onDone={done} /> : <div className="fixed inset-0 bg-black" />)}
    </>
  )
}

export default App
