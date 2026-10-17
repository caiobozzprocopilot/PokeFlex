// Todo dia às 20h de Brasília (23h UTC): avisa quem tem streak e ainda não fez nada hoje.
import { db, isCron, json, missingConfig, once, sendToUser, todaySP } from '../../server/push.js'

export default async function handler(req, res) {
  if (!isCron(req)) return json(res, 401, { error: 'Só para o agendador.' })
  if (missingConfig().length) return json(res, 503, { error: 'Servidor sem configuração.' })

  const today = todaySP()
  const yesterday = new Date(new Date(`${today}T12:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10)

  const { data: subs } = await db().from('push_subscriptions').select('user_id')
  const users = [...new Set((subs ?? []).map((s) => s.user_id))]
  if (!users.length) return json(res, 200, { sent: 0 })

  // Ativo até ontem e nada hoje: a chama apaga à meia-noite.
  const { data: atRisk } = await db()
    .from('mascots')
    .select('user_id, current_streak, freeze_crystals')
    .in('user_id', users)
    .eq('last_active_day', yesterday)
    .gt('current_streak', 0)
  const { data: prefs } = await db().from('notification_prefs').select('user_id, streak').in('user_id', users)
  const off = new Set((prefs ?? []).filter((p) => !p.streak).map((p) => p.user_id))

  let sent = 0
  for (const m of atRisk ?? []) {
    if (off.has(m.user_id) || !(await once(m.user_id, 'streak', today))) continue
    const days = m.current_streak
    const crystal = m.freeze_crystals > 0 ? ' Você tem um Cristal de Gelo, mas melhor não gastar à toa!' : ''
    sent += await sendToUser(m.user_id, {
      title: '🔥 Sua chama está fraca!',
      body: `Seu streak de ${days} ${days === 1 ? 'dia' : 'dias'} acaba à meia-noite. Registre ou escaneie uma carta para manter o Fagulin aceso.${crystal}`,
      url: '/#/inicio',
      tag: 'streak',
    })
  }
  return json(res, 200, { candidates: atRisk?.length ?? 0, sent })
}
