import { useCallback, useEffect, useState } from 'react'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallEvent | null = null
const listeners = new Set<() => void>()

// O evento chega cedo, às vezes antes de qualquer componente montar; guardamos fora do React.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as InstallEvent
  listeners.forEach((fn) => fn())
})
window.addEventListener('appinstalled', () => {
  deferred = null
  listeners.forEach((fn) => fn())
})

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export function useInstallPrompt() {
  const [available, setAvailable] = useState(() => !!deferred && !isStandalone())

  useEffect(() => {
    const update = () => setAvailable(!!deferred && !isStandalone())
    listeners.add(update)
    return () => {
      listeners.delete(update)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    deferred = null
    setAvailable(false)
  }, [])

  return { available, install }
}
