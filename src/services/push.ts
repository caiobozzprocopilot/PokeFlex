import { isDemo, supabase } from '../lib/supabase'

// Chave pública VAPID (a privada fica só no servidor). A mesma de server/push.js.
const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BCD4NdZerb4HofA3m6A9TfG9uRW6icqwJ2yvoGVr4B6cJ-avPJk3Y6bvOngtduX04i2VxGW1LPaPPqIIMTlx5WQ'

export type PushPrefs = { streak: boolean; trades: boolean; prices: boolean }
export const DEFAULT_PREFS: PushPrefs = { streak: true, trades: true, prices: true }

export type PushSupport = 'ok' | 'unsupported' | 'ios-install'

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

// No iPhone, push só funciona com o app instalado na tela de início (iOS 16.4+).
export function pushSupport(): PushSupport {
  const capable = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (isIOS() && !standalone()) return 'ios-install'
  return capable ? 'ok' : 'unsupported'
}

async function registration() {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.getRegistration()
  if (reg) return reg
  // Primeira visita: espera o service worker registrar, sem travar se ele não existir (modo dev).
  return Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 4000))])
}

const toKey = (base64: string) => {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function currentSubscription() {
  const reg = await registration()
  return reg ? reg.pushManager.getSubscription() : null
}

export async function enablePush() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Você não permitiu as notificações. Dá para liberar nas configurações do site no navegador.')
  if (isDemo) return
  const reg = await registration()
  if (!reg) throw new Error('O app ainda está carregando. Tente de novo em alguns segundos.')
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID_PUBLIC_KEY) }))
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  const { error } = await supabase!.rpc('save_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
    p_user_agent: navigator.userAgent,
  })
  if (error) throw new Error('Não foi possível ativar as notificações neste aparelho.')
}

export async function disablePush() {
  const sub = await currentSubscription()
  if (!sub) return
  if (!isDemo) await supabase!.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

export async function loadPrefs(userId: string): Promise<PushPrefs> {
  if (isDemo) return DEFAULT_PREFS
  const { data } = await supabase!.from('notification_prefs').select('streak, trades, prices').eq('user_id', userId).maybeSingle()
  return (data as PushPrefs | null) ?? DEFAULT_PREFS
}

export async function savePrefs(userId: string, prefs: PushPrefs) {
  if (isDemo) return
  const { error } = await supabase!.from('notification_prefs').upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() })
  if (error) throw new Error('Não foi possível salvar suas preferências.')
}

async function authHeader() {
  const { data } = await supabase!.auth.getSession()
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : null
}

// Teste: no Supabase pede ao servidor (caminho real); na demonstração mostra direto no aparelho.
export async function sendTest() {
  if (isDemo) {
    const reg = await registration()
    const options = { body: 'É assim que o Fagulin vai te chamar quando a chama estiver fraca.', icon: '/icons/icon-192.png', tag: 'teste' }
    if (reg) await reg.showNotification('Notificações ligadas! 🔥', options)
    else new Notification('Notificações ligadas! 🔥', options)
    return 1
  }
  const headers = await authHeader()
  if (!headers) throw new Error('Entre na sua conta.')
  const res = await fetch('/api/push/test', { method: 'POST', headers })
  const body = (await res.json().catch(() => ({}))) as { sent?: number; error?: string }
  if (!res.ok) throw new Error(body.error ?? 'O servidor não conseguiu enviar o teste.')
  return body.sent ?? 0
}

// Avisa o outro treinador da troca. Se falhar, a troca segue normal (o aviso é um extra).
export function notifyTrade(tradeId: string) {
  if (isDemo) return
  void authHeader().then((headers) => {
    if (!headers) return
    return fetch('/api/push/trade', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ tradeId }) })
  }).catch(() => {})
}
