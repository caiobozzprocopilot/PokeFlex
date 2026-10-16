import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Search, TrendingDown, TrendingUp } from 'lucide-react'
import type { PokemonCard } from '../types/pokemon'
import { useOwned } from '../store/collection'
import { useUi } from '../store/ui'
import { useValueHistory } from '../store/valueHistory'
import { useCollectionPricing, type ValuedEntry } from '../hooks/useCollectionValue'
import { formatBRL } from '../services/pricing'
import { VARIANT_LABEL } from '../utils/collection'
import { LineChart } from '../components/ui/LineChart'
import { Button } from '../components/ui/Button'
import { CardDetail } from '../components/pokemon/CardDetail'

const pct = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : null)

function Delta({ value, suffix }: { value: number | null; suffix: string }) {
  if (value === null || Math.abs(value) < 0.5) return <span className="text-sm text-muted">Estável {suffix}</span>
  const up = value > 0
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium ${
        up ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'
      }`}
    >
      {up ? <TrendingUp size={14} aria-hidden /> : <TrendingDown size={14} aria-hidden />}
      {up ? '+' : ''}
      {value.toFixed(1).replace('.', ',')}% {suffix}
    </span>
  )
}

function CardRow({ item, right, onOpen }: { item: ValuedEntry; right: React.ReactNode; onOpen: (c: PokemonCard) => void }) {
  const { card } = item.entry
  return (
    <li>
      <button
        onClick={() => onOpen(card)}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-raised"
      >
        {card.imageUrl ? (
          <img
            src={card.imageUrl.replace('/high.webp', '/low.webp')}
            alt=""
            loading="lazy"
            className="h-14 w-10 shrink-0 rounded object-cover"
          />
        ) : (
          <span className="h-14 w-10 shrink-0 rounded bg-raised" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{card.name}</span>
          <span className="block truncate text-xs text-muted">
            {card.series} · {VARIANT_LABEL[item.entry.variant]} · {item.entry.condition}
          </span>
        </span>
        <span className="shrink-0 text-right">{right}</span>
      </button>
    </li>
  )
}

const shortDate = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function Value() {
  const go = useUi((s) => s.go)
  const owned = useOwned()
  const pricing = useCollectionPricing(owned.entries)
  const snapshots = useValueHistory((s) => s.snapshots)
  const [selected, setSelected] = useState<PokemonCard | null>(null)

  const priced = useMemo(() => pricing.items.filter((i) => i.total !== null), [pricing.items])

  // Uma linha por carta+variante, para não repetir a mesma carta em condições diferentes.
  const movers = useMemo(() => {
    const seen = new Set<string>()
    return priced
      .filter((i) => i.quote?.changePct !== undefined)
      .filter((i) => {
        const k = `${i.entry.card.id}:${i.entry.variant}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      .sort((a, b) => b.quote!.changePct! - a.quote!.changePct!)
  }, [priced])
  const risers = movers.filter((i) => i.quote!.changePct! >= 1).slice(0, 5)
  const fallers = movers
    .filter((i) => i.quote!.changePct! <= -1)
    .slice(-5)
    .reverse()
  const valuable = useMemo(() => [...priced].sort((a, b) => b.total! - a.total!).slice(0, 5), [priced])

  const points = snapshots.map((s) => ({ label: shortDate(s.day), value: s.total }))

  if (owned.entries.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <p className="label">Sua coleção</p>
          <h1 className="mt-1 text-3xl font-bold">Valor</h1>
        </header>
        <div className="panel flex flex-col items-center px-6 py-16 text-center">
          <p className="font-medium">Sua coleção ainda está vazia</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Adicione cartas para acompanhar quanto elas valem, o que subiu e o que caiu.
          </p>
          <Button className="mt-5" onClick={() => go('busca')}>
            <Search size={16} aria-hidden /> Buscar carta
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="label">Sua coleção</p>
        <h1 className="mt-1 text-3xl font-bold">Valor</h1>
      </header>

      <section className="panel grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="label">Valor estimado</p>
          <p className="mt-2 font-display text-5xl font-bold tabular-nums" aria-live="polite">
            {pricing.loading ? '…' : pricing.error ? '—' : formatBRL(pricing.total)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {!pricing.loading && <Delta value={pct(pricing.monthNow, pricing.monthAvg30)} suffix="na semana vs. média do mês" />}
            <span className="text-sm text-muted">
              {pricing.priced} {pricing.priced === 1 ? 'carta com preço' : 'cartas com preço'}
              {pricing.missing > 0 && ` · ${pricing.missing} sem preço`}
            </span>
          </div>
        </div>
        {!pricing.loading && pricing.paid > 0 && (
          <div className="rounded-2xl border border-line bg-raised/40 p-4 lg:min-w-72">
            <p className="text-xs text-muted">Nas cartas com preço pago</p>
            <p className="mt-1 text-sm">
              Você pagou <span className="font-mono">{formatBRL(pricing.paid)}</span>, hoje valem{' '}
              <span className="font-mono">{formatBRL(pricing.paidNow)}</span>
            </p>
            <div className="mt-2">
              <Delta value={pct(pricing.paidNow, pricing.paid)} suffix="sobre o que você pagou" />
            </div>
          </div>
        )}
      </section>

      <section className="panel p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Histórico</h2>
          <span className="text-xs text-muted">Um registro por dia em que você abre o PokeFlex</span>
        </div>
        {points.length > 0 ? (
          <>
            <LineChart points={points} format={formatBRL} title="Valor da coleção por dia" />
            {points.length < 2 && (
              <p className="mt-3 text-sm text-muted">O histórico começou hoje. A linha aparece a partir do segundo dia.</p>
            )}
          </>
        ) : (
          <div className="h-[220px] animate-pulse rounded-xl bg-raised/50" aria-label="Carregando histórico" />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="panel p-4">
          <h2 className="mb-1 flex items-center gap-2 px-2 text-base font-semibold">
            <ArrowUpRight size={18} className="text-success" aria-hidden /> Mais subiram
          </h2>
          <p className="mb-2 px-2 text-xs text-muted">Média de 7 dias vs. 30 dias no Cardmarket</p>
          {risers.length ? (
            <ul>
              {risers.map((i) => (
                <CardRow
                  key={i.entry.id}
                  item={i}
                  onOpen={setSelected}
                  right={<span className="font-mono text-sm text-success">+{i.quote!.changePct!.toFixed(0)}%</span>}
                />
              ))}
            </ul>
          ) : (
            <p className="px-2 py-4 text-sm text-muted">{pricing.loading ? 'Calculando…' : 'Nenhuma alta relevante agora.'}</p>
          )}
        </section>

        <section className="panel p-4">
          <h2 className="mb-1 flex items-center gap-2 px-2 text-base font-semibold">
            <ArrowDownRight size={18} className="text-accent" aria-hidden /> Mais caíram
          </h2>
          <p className="mb-2 px-2 text-xs text-muted">Média de 7 dias vs. 30 dias no Cardmarket</p>
          {fallers.length ? (
            <ul>
              {fallers.map((i) => (
                <CardRow
                  key={i.entry.id}
                  item={i}
                  onOpen={setSelected}
                  right={<span className="font-mono text-sm text-accent">{i.quote!.changePct!.toFixed(0)}%</span>}
                />
              ))}
            </ul>
          ) : (
            <p className="px-2 py-4 text-sm text-muted">{pricing.loading ? 'Calculando…' : 'Nenhuma queda relevante agora.'}</p>
          )}
        </section>

        <section className="panel p-4">
          <h2 className="mb-1 px-2 text-base font-semibold">Mais valiosas</h2>
          <p className="mb-2 px-2 text-xs text-muted">Valor de todas as cópias, ajustado pela condição</p>
          {valuable.length ? (
            <ul>
              {valuable.map((i) => (
                <CardRow
                  key={i.entry.id}
                  item={i}
                  onOpen={setSelected}
                  right={
                    <>
                      <span className="block font-mono text-sm">{formatBRL(i.total!)}</span>
                      {i.entry.quantity > 1 && <span className="block text-[11px] text-muted">{i.entry.quantity} cópias</span>}
                    </>
                  }
                />
              ))}
            </ul>
          ) : (
            <p className="px-2 py-4 text-sm text-muted">{pricing.loading ? 'Calculando…' : 'Sem preços disponíveis.'}</p>
          )}
        </section>
      </div>

      <p className="text-xs text-muted">
        Preços de referência do Cardmarket (ou TCGplayer, quando não houver) para cartas Near Mint, convertidos pelo câmbio do
        dia. A condição de cada cópia ajusta a estimativa.
      </p>

      <CardDetail card={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
