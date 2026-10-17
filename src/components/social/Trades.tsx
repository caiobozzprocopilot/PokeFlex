import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftRight, Check, CloudOff, Globe2, PackageCheck, Repeat2, Send, Sparkles, X } from 'lucide-react'
import { useAuth } from '../../store/auth'
import { useCollection } from '../../store/collection'
import { useWishlist } from '../../store/wishlist'
import { useSocial } from '../../store/social'
import { useTrades } from '../../store/trades'
import { useUi } from '../../store/ui'
import { useMascot } from '../../store/mascot'
import { useResource } from '../../hooks/useResource'
import { fetchMatches, proposeTrade, type MatchCard, type Trade, type TradeItem, type TradeMatch, type TradeStatus } from '../../services/trades'
import { VARIANT_LABEL } from '../../utils/collection'
import { Avatar } from '../profile/Avatar'
import { Button } from '../ui/Button'
import { timeAgo } from './SocialBits'

function MiniCard({ card, quantity, label }: { card: { name: string; imageUrl?: string }; quantity?: number; label?: string }) {
  return (
    <span className="relative block w-16 shrink-0" title={card.name}>
      {card.imageUrl ? (
        <img src={card.imageUrl} alt={card.name} loading="lazy" className="aspect-[63/88] w-full rounded-[4px] object-cover shadow-md" />
      ) : (
        <span className="grid aspect-[63/88] w-full place-items-center rounded-[4px] bg-raised p-1 text-center text-[10px] text-muted">{card.name}</span>
      )}
      {quantity !== undefined && quantity > 1 && (
        <span className="absolute right-1 top-1 rounded bg-bg/85 px-1 font-mono text-[10px] font-semibold">×{quantity}</span>
      )}
      {label && <span className="mt-1 block truncate text-center text-[10px] text-muted">{label}</span>}
    </span>
  )
}

function CardStrip({ title, items, empty }: { title: string; items: { key: string; card: { name: string; imageUrl?: string }; quantity?: number }[]; empty: string }) {
  return (
    <div className="min-w-0">
      <p className="label mb-2">{title}</p>
      {items.length ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.map((i) => (
            <MiniCard key={i.key} card={i.card} quantity={i.quantity} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">{empty}</p>
      )}
    </div>
  )
}

// ---------- Proposta ----------

function Picker({ title, hint, cards, selected, onToggle }: { title: string; hint: string; cards: MatchCard[]; selected: Set<string>; onToggle: (id: string) => void }) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-muted">{hint}</p>
      {cards.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-line px-3 py-4 text-center text-xs text-muted">Nenhuma carta deste lado.</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {cards.map((c) => {
            const on = selected.has(c.cardId)
            return (
              <button
                key={c.cardId}
                type="button"
                onClick={() => onToggle(c.cardId)}
                aria-pressed={on}
                className={`relative rounded-lg p-1 text-left transition-all ${on ? 'bg-primary/15 ring-2 ring-primary' : 'opacity-60 ring-1 ring-line hover:opacity-90'}`}
              >
                <img src={c.card.imageUrl} alt={c.card.name} loading="lazy" className="aspect-[63/88] w-full rounded-[4px] object-cover" />
                <span className="mt-1 block truncate text-[11px]">{c.card.name}</span>
                <span className="block truncate text-[10px] text-muted">
                  {VARIANT_LABEL[c.variant]} · +{c.extra}
                </span>
                {on && (
                  <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-primary text-bg">
                    <Check size={13} strokeWidth={3} aria-hidden />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

function ProposeDialog({ match, onClose, onSent }: { match: TradeMatch | null; onClose: () => void; onSent: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [give, setGive] = useState<Set<string>>(new Set())
  const [receive, setReceive] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (match) {
      setGive(new Set(match.iHave.map((c) => c.cardId)))
      setReceive(new Set(match.theyHave.map((c) => c.cardId)))
      setMessage('')
      setError(null)
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) dialog.close()
  }, [match])

  const toggle = (set: Set<string>, update: (s: Set<string>) => void) => (id: string) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    update(next)
  }

  const send = async () => {
    if (!match) return
    const pick = (cards: MatchCard[], ids: Set<string>): TradeItem[] =>
      cards.filter((c) => ids.has(c.cardId)).map((c) => ({ cardId: c.cardId, card: c.card, variant: c.variant, quantity: 1 }))
    setSending(true)
    setError(null)
    try {
      await proposeTrade(match.trainer.id, pick(match.iHave, give), pick(match.theyHave, receive), message)
      useMascot.getState().event('trade')
      onSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar.')
    } finally {
      setSending(false)
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(94vw,820px)] overflow-y-auto rounded-3xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-bg/80 backdrop:backdrop-blur-sm"
    >
      {match && (
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={match.trainer.name} url={match.trainer.avatarUrl} className="h-11 w-11" />
              <div>
                <p className="label">Proposta de troca</p>
                <h2 className="text-xl font-bold">com {match.trainer.name}</h2>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink">
              <X size={18} aria-hidden />
            </button>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto_1fr]">
            <Picker
              title="Você entrega"
              hint={`Suas repetidas que ${match.trainer.name} procura`}
              cards={match.iHave}
              selected={give}
              onToggle={toggle(give, setGive)}
            />
            <div className="hidden items-center md:flex">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-raised text-primary">
                <ArrowLeftRight size={18} aria-hidden />
              </span>
            </div>
            <Picker
              title="Você recebe"
              hint={`Repetidas de ${match.trainer.name} que estão nos seus desejos`}
              cards={match.theyHave}
              selected={receive}
              onToggle={toggle(receive, setReceive)}
            />
          </div>

          <label className="mt-6 block">
            <span className="flex justify-between text-sm font-medium">
              Mensagem <span className="font-mono text-xs font-normal text-muted">{message.length}/280</span>
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 280))}
              rows={2}
              placeholder="Ex.: Posso entregar no fim de semana, ou mando pelo correio."
              className="mt-1.5 w-full resize-none rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </label>

          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-accent/10 px-4 py-2 text-sm text-accent">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {give.size} {give.size === 1 ? 'carta' : 'cartas'} por {receive.size} {receive.size === 1 ? 'carta' : 'cartas'}
            </p>
            <Button onClick={send} disabled={sending || give.size + receive.size === 0}>
              <Send size={16} aria-hidden /> {sending ? 'Enviando…' : 'Enviar proposta'}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  )
}

// ---------- Trocas em andamento ----------

const STATUS: Record<TradeStatus, { label: string; className: string }> = {
  pending: { label: 'Aguardando resposta', className: 'bg-primary/15 text-primary' },
  accepted: { label: 'Aceita', className: 'bg-success/15 text-success' },
  declined: { label: 'Recusada', className: 'bg-raised text-muted' },
  cancelled: { label: 'Cancelada', className: 'bg-raised text-muted' },
  completed: { label: 'Concluída', className: 'bg-success/15 text-success' },
}

function TradeCard({ trade }: { trade: Trade }) {
  const act = useTrades((s) => s.act)
  const applyTrade = useCollection((s) => s.applyTrade)
  const wishes = useWishlist((s) => s.items)
  const removeWishes = useWishlist((s) => s.removeMany)
  const openTrainer = useUi((s) => s.openTrainer)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const incoming = !trade.outgoing && trade.status === 'pending'
  const status = incoming ? { label: 'Nova proposta', className: 'bg-accent/15 text-accent' } : STATUS[trade.status]

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  const apply = () =>
    run(async () => {
      await applyTrade(trade.give, trade.receive)
      const got = new Set(trade.receive.map((r) => r.cardId))
      await removeWishes(wishes.filter((w) => got.has(w.card.id)).map((w) => w.id))
      await act(trade.id, 'applied')
    })

  const items = (list: TradeItem[]) => list.map((i) => ({ key: `${i.cardId}-${i.variant}`, card: i.card, quantity: i.quantity }))

  return (
    <li className={`panel p-4 sm:p-5 ${incoming ? 'ring-1 ring-accent/40' : ''}`}>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => trade.other.username && openTrainer(trade.other.username)} className="flex min-w-0 items-center gap-3 text-left">
          <Avatar name={trade.other.name} url={trade.other.avatarUrl} className="h-10 w-10" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {trade.outgoing ? `Você → ${trade.other.name}` : `${trade.other.name} → você`}
            </span>
            <span className="block text-xs text-muted">{timeAgo(trade.updatedAt)}</span>
          </span>
        </button>
        <span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <CardStrip title="Você entrega" items={items(trade.give)} empty="Nada" />
        <CardStrip title="Você recebe" items={items(trade.receive)} empty="Nada" />
      </div>

      {trade.message && (
        <p className="mt-4 rounded-xl bg-raised/60 px-3.5 py-2.5 text-sm">
          <span className="text-muted">{trade.outgoing ? 'Você' : trade.other.name}: </span>
          {trade.message}
        </p>
      )}

      {trade.status === 'accepted' && (
        <p className="mt-4 text-xs text-muted">
          Combinem a entrega, pessoalmente ou pelo correio. Quando as cartas chegarem, marque como concluída.
        </p>
      )}
      {trade.status === 'completed' && !trade.applied && (
        <p className="mt-4 text-xs text-muted">
          Atualize sua coleção: as cartas entregues saem e as recebidas entram (e saem dos seus desejos).
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-accent">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {incoming && (
          <>
            <Button size="sm" disabled={busy} onClick={() => run(() => act(trade.id, 'accept'))}>
              <Check size={15} aria-hidden /> Aceitar
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => act(trade.id, 'decline'))}>
              Recusar
            </Button>
          </>
        )}
        {trade.outgoing && trade.status === 'pending' && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => act(trade.id, 'cancel'))}>
            Cancelar proposta
          </Button>
        )}
        {trade.status === 'accepted' && (
          <>
            <Button size="sm" disabled={busy} onClick={() => run(() => act(trade.id, 'complete'))}>
              <PackageCheck size={15} aria-hidden /> Recebi as cartas
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => act(trade.id, 'cancel'))}>
              Cancelar troca
            </Button>
          </>
        )}
        {trade.status === 'completed' && !trade.applied && (
          <Button size="sm" disabled={busy} onClick={apply}>
            <Sparkles size={15} aria-hidden /> Atualizar minha coleção
          </Button>
        )}
      </div>
    </li>
  )
}

// ---------- Painel ----------

export function TradesPanel() {
  const user = useAuth((s) => s.user)!
  const entries = useCollection((s) => s.entries)
  const wishes = useWishlist((s) => s.items)
  const settings = useSocial((s) => s.settings)
  const loaded = useSocial((s) => s.loaded)
  const save = useSocial((s) => s.save)
  const trades = useTrades((s) => s.items)
  const tradesError = useTrades((s) => s.error)
  const loadTrades = useTrades((s) => s.load)
  const go = useUi((s) => s.go)
  const [proposing, setProposing] = useState<TradeMatch | null>(null)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const open = !!settings.openToTrade
  const key = open ? `matches:${entries.map((e) => `${e.card.id}:${e.quantity}`).join(',')}|${wishes.map((w) => w.card.id).join(',')}|${version}` : null
  const matches = useResource(key, () => fetchMatches(entries, wishes))

  useEffect(() => {
    void loadTrades()
  }, [loadTrades, version])

  const active = useMemo(() => trades.filter((t) => t.status === 'pending' || t.status === 'accepted' || (t.status === 'completed' && !t.applied)), [trades])
  const history = useMemo(() => trades.filter((t) => !active.includes(t)), [trades, active])

  const join = async () => {
    setJoining(true)
    setJoinError(null)
    try {
      await save(user.id, { ...settings, openToTrade: true })
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Não foi possível ativar.')
    } finally {
      setJoining(false)
    }
  }

  const openSettings = () => {
    go('perfil')
    window.setTimeout(() => document.getElementById('perfil-publico')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
  }

  if (loaded && !open) {
    return (
      <div className="panel flex flex-col items-center px-6 py-12 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Repeat2 size={26} aria-hidden />
        </span>
        <h2 className="mt-4 text-xl font-bold">Troque suas repetidas</h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          O PokeFlex cruza suas cartas repetidas com os desejos de outros treinadores (e o contrário) e monta as trocas possíveis para você.
        </p>
        <p className="mt-3 max-w-md text-xs text-muted">
          Sua lista de desejos continua privada: uma carta desejada só aparece para quem tem uma repetida dela.
        </p>
        {settings.isPublic ? (
          <Button className="mt-6" onClick={join} disabled={joining}>
            <Repeat2 size={16} aria-hidden /> {joining ? 'Ativando…' : 'Participar das trocas'}
          </Button>
        ) : (
          <Button className="mt-6" onClick={openSettings}>
            <Globe2 size={16} aria-hidden /> Primeiro, crie seu perfil público
          </Button>
        )}
        {joinError && (
          <p role="alert" className="mt-3 text-sm text-accent">
            {joinError}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {active.length > 0 && (
        <section aria-labelledby="active-trades">
          <h2 id="active-trades" className="mb-3 text-lg font-semibold">
            Em andamento
          </h2>
          <ul className="space-y-3">
            {active.map((t) => (
              <TradeCard key={t.id} trade={t} />
            ))}
          </ul>
        </section>
      )}
      {tradesError && <p className="text-sm text-accent">{tradesError}</p>}

      <section aria-labelledby="matches-title">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="matches-title" className="text-lg font-semibold">
            Trocas possíveis
          </h2>
          <button onClick={() => setVersion((v) => v + 1)} className="text-sm text-muted hover:text-primary">
            Atualizar
          </button>
        </div>
        {matches.error ? (
          <div className="panel flex flex-col items-center px-6 py-10 text-center">
            <CloudOff size={28} className="text-muted" aria-hidden />
            <p className="mt-3 text-sm text-muted">{matches.error}</p>
          </div>
        ) : matches.loading ? (
          <ul className="space-y-3" aria-hidden>
            {Array.from({ length: 2 }, (_, i) => (
              <li key={i} className="panel h-40 animate-pulse" />
            ))}
          </ul>
        ) : (matches.data ?? []).length === 0 ? (
          <div className="panel px-6 py-10 text-center">
            <p className="font-medium">Nenhuma troca encontrada por enquanto</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              Adicione cartas à sua lista de desejos e registre suas repetidas. Quanto mais treinadores participarem, mais trocas aparecem.
            </p>
            <Button variant="secondary" size="sm" className="mt-5" onClick={() => go('desejos')}>
              Abrir desejos
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {matches.data!.map((m) => {
              const both = m.theyHave.length > 0 && m.iHave.length > 0
              return (
                <li key={m.trainer.id} className="panel p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar name={m.trainer.name} url={m.trainer.avatarUrl} className="h-10 w-10" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{m.trainer.name}</span>
                      <span className="block text-xs text-muted">@{m.trainer.username}</span>
                    </span>
                    {both && <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">Troca perfeita</span>}
                    <Button size="sm" onClick={() => setProposing(m)}>
                      <ArrowLeftRight size={15} aria-hidden /> Propor troca
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <CardStrip
                      title="Tem o que você quer"
                      items={m.theyHave.map((c) => ({ key: c.cardId, card: c.card, quantity: c.extra }))}
                      empty="Nenhuma das suas cartas desejadas."
                    />
                    <CardStrip
                      title="Quer o que você tem"
                      items={m.iHave.map((c) => ({ key: c.cardId, card: c.card, quantity: c.extra }))}
                      empty="Nenhuma das suas repetidas."
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section aria-labelledby="history-title">
          <h2 id="history-title" className="mb-3 text-lg font-semibold">
            Histórico
          </h2>
          <ul className="space-y-3">
            {history.map((t) => (
              <TradeCard key={t.id} trade={t} />
            ))}
          </ul>
        </section>
      )}

      <ProposeDialog
        match={proposing}
        onClose={() => setProposing(null)}
        onSent={() => {
          setProposing(null)
          setVersion((v) => v + 1)
          // Confere de novo daqui a pouco: a resposta pode chegar rápido.
          window.setTimeout(() => setVersion((v) => v + 1), 4500)
        }}
      />
    </div>
  )
}
