// Avisa o outro lado de uma troca quando ela muda (proposta nova, aceita, recusada, concluída).
// Quem chama é o app logo depois da ação; o servidor confere a troca no banco antes de avisar.
import { db, json, missingConfig, once, prefsOf, sendToUser, userFromRequest } from '../../server/push.js'

const MESSAGES = {
  pending: (name) => ({ title: 'Nova proposta de troca', body: `${name} quer trocar cartas com você. Toque para ver.` }),
  accepted: (name) => ({ title: 'Troca aceita! 🤝', body: `${name} aceitou sua proposta. Combinem a entrega.` }),
  declined: (name) => ({ title: 'Proposta recusada', body: `${name} recusou a troca desta vez.` }),
  cancelled: (name) => ({ title: 'Troca cancelada', body: `${name} cancelou a troca.` }),
  completed: (name) => ({ title: 'Troca concluída', body: `${name} recebeu as cartas. Atualize sua coleção!` }),
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' })
  if (missingConfig().length) return json(res, 503, { error: 'Servidor sem configuração.' })
  const user = await userFromRequest(req)
  if (!user) return json(res, 401, { error: 'Entre na sua conta.' })

  const tradeId = typeof req.body?.tradeId === 'string' ? req.body.tradeId : null
  if (!tradeId) return json(res, 400, { error: 'Troca não informada.' })
  const { data: trade } = await db().from('trades').select('id, status, from_user, to_user').eq('id', tradeId).maybeSingle()
  if (!trade || ![trade.from_user, trade.to_user].includes(user.id)) return json(res, 404, { error: 'Troca não encontrada.' })

  const recipient = trade.from_user === user.id ? trade.to_user : trade.from_user
  const message = MESSAGES[trade.status]
  if (!message) return json(res, 200, { sent: 0 })
  if (!(await prefsOf(recipient)).trades) return json(res, 200, { sent: 0 })
  // Um aviso por mudança de status, mesmo que o app chame de novo.
  if (!(await once(recipient, 'trade', `${trade.id}:${trade.status}`))) return json(res, 200, { sent: 0 })

  const { data: me } = await db().from('profiles').select('name').eq('id', user.id).maybeSingle()
  const sent = await sendToUser(recipient, { ...message(me?.name || 'Um treinador'), url: '/#/treinadores?aba=trocas', tag: `troca-${trade.id}` })
  return json(res, 200, { sent })
}
