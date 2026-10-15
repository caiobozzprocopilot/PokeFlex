import { useState } from 'react'
import { ArrowLeftRight, Check, Inbox, X } from 'lucide-react'
import { cardById, TRADES, type Trade } from '../data/mock'
import { Button } from '../components/ui/Button'

type Tab = 'recebidas' | 'enviadas' | 'historico'

const STATUS_STYLE: Record<Trade['status'], string> = {
  pendente: 'text-primary bg-primary/10',
  aceita: 'text-success bg-success/10',
  recusada: 'text-accent bg-accent/10',
}

function CardStack({ ids, label }: { ids: string[]; label: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="label mb-2">{label}</p>
      <div className="flex gap-2">
        {ids.map((id) => {
          const c = cardById(id)
          return (
            <div key={id} className="w-16 shrink-0 sm:w-20">
              <img
                src={c.imageUrl}
                alt={c.name}
                loading="lazy"
                className="aspect-[63/88] w-full rounded-md bg-raised object-cover ring-1 ring-line"
              />
              <p className="mt-1 truncate text-xs text-muted">{c.name}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TradeCard({ trade, onRespond }: { trade: Trade; onRespond: (id: string, s: Trade['status']) => void }) {
  const actionable = trade.direction === 'recebida' && trade.status === 'pendente'
  return (
    <article className="panel animate-rise p-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-raised font-display text-sm font-bold">
            {trade.with[0]}
          </span>
          <div>
            <p className="text-sm font-medium">
              {trade.direction === 'recebida' ? `${trade.with} propôs uma troca` : `Você propôs para ${trade.with}`}
            </p>
            <p className="text-xs text-muted">{trade.when}</p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLE[trade.status]}`}>
          {trade.status}
        </span>
      </header>

      <div className="mt-5 flex items-center gap-3 sm:gap-6">
        <CardStack ids={trade.give} label="Você dá" />
        <ArrowLeftRight size={20} className="shrink-0 text-muted" aria-hidden />
        <CardStack ids={trade.get} label="Você recebe" />
      </div>

      {actionable && (
        <div className="mt-5 flex gap-3 border-t border-line pt-4">
          <Button size="sm" onClick={() => onRespond(trade.id, 'aceita')}>
            <Check size={16} aria-hidden /> Aceitar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onRespond(trade.id, 'recusada')}>
            <X size={16} aria-hidden /> Recusar
          </Button>
        </div>
      )}
    </article>
  )
}

export function Trading() {
  const [trades, setTrades] = useState(TRADES)
  const [tab, setTab] = useState<Tab>('recebidas')

  const respond = (id: string, status: Trade['status']) =>
    setTrades((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)))

  const lists: Record<Tab, Trade[]> = {
    recebidas: trades.filter((t) => t.direction === 'recebida' && t.status === 'pendente'),
    enviadas: trades.filter((t) => t.direction === 'enviada' && t.status === 'pendente'),
    historico: trades.filter((t) => t.status !== 'pendente'),
  }
  const TABS: { key: Tab; label: string }[] = [
    { key: 'recebidas', label: 'Recebidas' },
    { key: 'enviadas', label: 'Enviadas' },
    { key: 'historico', label: 'Histórico' },
  ]
  const list = lists[tab]

  return (
    <div className="space-y-6">
      <header>
        <p className="label">Mercado entre treinadores</p>
        <h1 className="mt-1 text-3xl font-bold">Trocas</h1>
      </header>

      <div className="flex gap-1 border-b border-line" role="tablist">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px flex h-11 items-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors ${
              tab === key ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {label}
            {key !== 'historico' && lists[key].length > 0 && (
              <span className="rounded-full bg-raised px-1.5 font-mono text-[11px]">{lists[key].length}</span>
            )}
          </button>
        ))}
      </div>

      {list.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((t) => (
            <TradeCard key={t.id} trade={t} onRespond={respond} />
          ))}
        </div>
      ) : (
        <div className="panel flex flex-col items-center px-6 py-16 text-center">
          <Inbox size={32} className="text-muted" aria-hidden />
          <p className="mt-4 font-medium">Nada por aqui</p>
          <p className="mt-1 text-sm text-muted">Quando houver propostas, elas aparecem nesta aba.</p>
        </div>
      )}
    </div>
  )
}
