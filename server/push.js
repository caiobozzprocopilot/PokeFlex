// Base das funções da Vercel (api/): Supabase com a chave secreta e envio de push.
// Variáveis na Vercel: VITE_SUPABASE_URL, SUPABASE_SECRET_KEY, VAPID_PRIVATE_KEY, CRON_SECRET.

import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// Chave pública VAPID: a mesma de src/config/push.ts (é pública por natureza).
export const VAPID_PUBLIC_KEY = 'BCD4NdZerb4HofA3m6A9TfG9uRW6icqwJ2yvoGVr4B6cJ-avPJk3Y6bvOngtduX04i2VxGW1LPaPPqIIMTlx5WQ'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SECRET = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const PUBLISHABLE = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

export function missingConfig() {
  const missing = []
  if (!SUPABASE_URL) missing.push('VITE_SUPABASE_URL')
  if (!SECRET) missing.push('SUPABASE_SECRET_KEY')
  if (!process.env.VAPID_PRIVATE_KEY) missing.push('VAPID_PRIVATE_KEY')
  return missing
}

let admin
export function db() {
  admin ??= createClient(SUPABASE_URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } })
  return admin
}

let configured = false
function setup() {
  if (configured) return
  webpush.setVapidDetails('mailto:contato@pokeflex.app', VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
  configured = true
}

// Usuário dono do token enviado pelo app (Authorization: Bearer <access token do Supabase>).
export async function userFromRequest(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  const client = createClient(SUPABASE_URL, PUBLISHABLE || SECRET, { auth: { persistSession: false } })
  const { data, error } = await client.auth.getUser(token)
  return error ? null : data.user
}

export async function prefsOf(userId) {
  const { data } = await db().from('notification_prefs').select('streak, trades, prices').eq('user_id', userId).maybeSingle()
  return data ?? { streak: true, trades: true, prices: true }
}

// Envia uma vez por (usuário, tipo, ref): o registro em notification_log impede repetição.
export async function once(userId, kind, ref) {
  const { error } = await db().from('notification_log').insert({ user_id: userId, kind, ref })
  return !error
}

// Envia para todos os aparelhos do usuário; aparelhos que não existem mais saem da lista.
export async function sendToUser(userId, payload) {
  setup()
  const { data: subs } = await db().from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', userId)
  let sent = 0
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), {
        TTL: 60 * 60 * 6,
        urgency: 'normal',
      })
      sent++
      await db().from('push_subscriptions').update({ last_ok_at: new Date().toISOString() }).eq('id', s.id)
    } catch (err) {
      if (err?.statusCode === 404 || err?.statusCode === 410) await db().from('push_subscriptions').delete().eq('id', s.id)
    }
  }
  return sent
}

// Chamadas agendadas da Vercel trazem "Authorization: Bearer <CRON_SECRET>".
export function isCron(req) {
  return !!process.env.CRON_SECRET && req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`
}

export const todaySP = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json').send(JSON.stringify(body))
}
