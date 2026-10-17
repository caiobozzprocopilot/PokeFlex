import { useState } from 'react'
import { Bell, BellOff, BellRing, Check, Flame, Repeat2, Send, Smartphone, TrendingDown } from 'lucide-react'
import { useAuth } from '../../store/auth'
import { usePush } from '../../store/push'
import type { PushPrefs } from '../../services/push'
import { Button } from '../ui/Button'

const OPTIONS: { key: keyof PushPrefs; icon: typeof Flame; label: string; hint: string }[] = [
  { key: 'streak', icon: Flame, label: 'Lembrete do streak', hint: 'Às 20h, se você ainda não cuidou do Fagulin no dia.' },
  { key: 'trades', icon: Repeat2, label: 'Trocas', hint: 'Proposta nova, troca aceita, recusada ou concluída.' },
  { key: 'prices', icon: TrendingDown, label: 'Preço-alvo', hint: 'De manhã, quando uma carta desejada chega ao seu alvo.' },
]

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-raised ring-1 ring-line'}`}
    >
      <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

export function NotificationSettings() {
  const user = useAuth((s) => s.user)!
  const { support, permission, subscribed, prefs, enable, disable, setPref, test } = usePush()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true)
    setMessage(null)
    try {
      const text = await fn()
      if (text) setMessage({ ok: true, text })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Algo deu errado. Tente de novo.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="notificacoes" className="panel scroll-mt-24 p-5 sm:p-6" aria-labelledby="notif-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="notif-title" className="flex items-center gap-2 text-lg font-semibold">
            {subscribed ? <BellRing size={18} className="text-primary" aria-hidden /> : <Bell size={18} className="text-muted" aria-hidden />}
            Notificações
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted">Avisos no celular ou no computador, mesmo com o PokeFlex fechado.</p>
        </div>
        {subscribed && <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">Ativas neste aparelho</span>}
      </div>

      {support === 'ios-install' ? (
        <div className="mt-5 flex gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <Smartphone size={20} className="shrink-0 text-primary" aria-hidden />
          <p>
            No iPhone, as notificações funcionam com o PokeFlex instalado: no Safari, toque em <span className="font-semibold">Compartilhar</span> →{' '}
            <span className="font-semibold">Adicionar à Tela de Início</span> e abra o app por lá.
          </p>
        </div>
      ) : support === 'unsupported' ? (
        <p className="mt-5 rounded-2xl bg-raised/60 p-4 text-sm text-muted">Este navegador não aceita notificações. Tente pelo Chrome, Edge, Firefox ou Safari atualizados.</p>
      ) : permission === 'denied' ? (
        <div className="mt-5 flex gap-3 rounded-2xl bg-accent/10 p-4 text-sm text-accent">
          <BellOff size={20} className="shrink-0" aria-hidden />
          <p>As notificações estão bloqueadas para o PokeFlex neste navegador. Libere nas configurações do site (o cadeado ao lado do endereço) e volte aqui.</p>
        </div>
      ) : !subscribed ? (
        <div className="mt-5">
          <ul className="space-y-2 text-sm text-muted">
            {OPTIONS.map(({ key, icon: Icon, label, hint }) => (
              <li key={key} className="flex gap-2.5">
                <Icon size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                <span>
                  <span className="font-medium text-ink">{label}:</span> {hint}
                </span>
              </li>
            ))}
          </ul>
          <Button className="mt-5" disabled={busy} onClick={() => run(async () => enable(user.id).then(() => 'Pronto! Use "Enviar teste" para ver como chega.'))}>
            <BellRing size={16} aria-hidden /> {busy ? 'Ativando…' : 'Ativar notificações'}
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <ul className="space-y-3">
            {OPTIONS.map(({ key, icon: Icon, label, hint }) => (
              <li key={key} className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-raised text-primary">
                  <Icon size={17} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted">{hint}</span>
                </span>
                <Switch checked={prefs[key]} label={label} onChange={() => run(() => setPref(user.id, key, !prefs[key]))} />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => run(async () => ((await test()) > 0 ? 'Teste enviado! Deve chegar em alguns segundos.' : 'Nenhum aparelho recebeu. Desative e ative de novo.'))}
            >
              <Send size={15} aria-hidden /> Enviar teste
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(async () => disable().then(() => 'Notificações desativadas neste aparelho.'))}>
              <BellOff size={15} aria-hidden /> Desativar neste aparelho
            </Button>
          </div>
        </div>
      )}

      {message && (
        <p role="status" className={`mt-4 flex items-center gap-2 text-sm ${message.ok ? 'text-success' : 'text-accent'}`}>
          {message.ok && <Check size={15} aria-hidden />} {message.text}
        </p>
      )}
    </section>
  )
}
