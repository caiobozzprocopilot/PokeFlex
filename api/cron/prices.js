// Todo dia às 9h de Brasília (12h UTC): avisa quando uma carta desejada chega ao preço-alvo.
// Cada desejo avisa no máximo uma vez por semana, para não insistir enquanto o preço oscila perto do alvo.
import { db, isCron, json, missingConfig, once, sendToUser } from '../../server/push.js'
import { fetchRates, formatBRL, priceBRL } from '../../server/prices.js'

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (!isCron(req)) return json(res, 401, { error: 'Só para o agendador.' })
  if (missingConfig().length) return json(res, 503, { error: 'Servidor sem configuração.' })

  const { data: subs } = await db().from('push_subscriptions').select('user_id')
  const users = [...new Set((subs ?? []).map((s) => s.user_id))]
  if (!users.length) return json(res, 200, { sent: 0 })
  const { data: prefs } = await db().from('notification_prefs').select('user_id, prices').in('user_id', users)
  const off = new Set((prefs ?? []).filter((p) => !p.prices).map((p) => p.user_id))
  const allowed = users.filter((u) => !off.has(u))
  if (!allowed.length) return json(res, 200, { sent: 0 })

  const { data: wishes } = await db()
    .from('wishlist_items')
    .select('id, user_id, card_id, card, variant, target_price')
    .in('user_id', allowed)
    .not('target_price', 'is', null)
  if (!wishes?.length) return json(res, 200, { sent: 0 })

  const rates = await fetchRates()
  const cache = new Map()
  const price = (w) => {
    const key = `${w.card_id}:${w.variant}`
    if (!cache.has(key)) cache.set(key, priceBRL(w.card_id, w.card, w.variant, rates).catch(() => null))
    return cache.get(key)
  }

  // Junta os achados por pessoa: um aviso com todas as cartas que baixaram.
  const hits = new Map()
  const week = (() => {
    const d = new Date()
    const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return `${d.getUTCFullYear()}-s${Math.ceil(((d - start) / 86400000 + start.getUTCDay() + 1) / 7)}`
  })()
  for (let i = 0; i < wishes.length; i += 6) {
    await Promise.all(
      wishes.slice(i, i + 6).map(async (w) => {
        const p = await price(w)
        if (p === null || p > Number(w.target_price)) return
        if (!(await once(w.user_id, 'price', `${w.id}:${week}`))) return
        hits.set(w.user_id, [...(hits.get(w.user_id) ?? []), { name: w.card?.name ?? 'Carta', price: p }])
      }),
    )
  }

  let sent = 0
  for (const [userId, list] of hits) {
    const first = list[0]
    sent += await sendToUser(userId, {
      title: list.length === 1 ? `${first.name} chegou ao seu preço-alvo!` : `${list.length} desejos chegaram ao preço-alvo!`,
      body:
        list.length === 1
          ? `Agora por cerca de ${formatBRL(first.price)}. Corra antes que suba!`
          : `${list.map((h) => h.name).slice(0, 3).join(', ')}${list.length > 3 ? ' e mais' : ''}. Veja na sua lista de desejos.`,
      url: '/#/desejos',
      tag: 'precos',
    })
  }
  return json(res, 200, { checked: wishes.length, users: hits.size, sent })
}
