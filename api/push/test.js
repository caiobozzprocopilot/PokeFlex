// Notificação de teste para os aparelhos de quem pediu.
import { json, missingConfig, sendToUser, userFromRequest } from '../../server/push.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' })
  const missing = missingConfig()
  if (missing.length) return json(res, 503, { error: `Servidor sem configuração: ${missing.join(', ')}.` })
  const user = await userFromRequest(req)
  if (!user) return json(res, 401, { error: 'Entre na sua conta.' })
  const sent = await sendToUser(user.id, {
    title: 'Notificações ligadas! 🔥',
    body: 'É assim que o Fagulin vai te chamar quando a chama estiver fraca ou chegar uma proposta de troca.',
    url: '/#/inicio',
    tag: 'teste',
  })
  return json(res, 200, { sent })
}
