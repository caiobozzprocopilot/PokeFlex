import { useCallback, useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { ValueRecorder } from './components/layout/ValueRecorder'
import { useUi } from './store/ui'
import { useAuth } from './store/auth'
import { useCollection } from './store/collection'
import { useWishlist } from './store/wishlist'
import { Dashboard } from './pages/Dashboard'
import { Collection } from './pages/Collection'
import { Value } from './pages/Value'
import { Wishlist } from './pages/Wishlist'
import { Profile } from './pages/Profile'
import { Login } from './pages/Login'
import { Search } from './pages/Search'

const PAGES = {
  inicio: Dashboard,
  colecao: Collection,
  valor: Value,
  desejos: Wishlist,
  perfil: Profile,
  busca: Search,
}

const BOOT_MS = 3500

type Gate = 'open' | 'revealing' | 'closed'

function App() {
  const page = useUi((s) => s.page)
  const user = useAuth((s) => s.user)
  const authReady = useAuth((s) => s.ready)
  const userId = user?.id ?? null
  const [gate, setGate] = useState<Gate>('open')
  const [boot, setBoot] = useState(false)

  useEffect(() => {
    if (!user) setGate('open')
  }, [user])

  useEffect(() => {
    if (!authReady) return
    useCollection.getState().load(userId)
    useWishlist.getState().load(userId)
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
  return (
    <>
      {user && <ValueRecorder userId={userId} />}
      {user && gate !== 'open' && (
        <AppShell boot={boot}>
          <Page key={page} />
        </AppShell>
      )}
      {gate !== 'closed' && (authReady ? <Login onReveal={reveal} onDone={done} /> : <div className="fixed inset-0 bg-black" />)}
    </>
  )
}

export default App
