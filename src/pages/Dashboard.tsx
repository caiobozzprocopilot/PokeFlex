import { useState, type CSSProperties } from 'react'
import { ArrowRight, Check, Flame, Layers, Repeat2, Sparkles, Wallet } from 'lucide-react'
import type { PokemonCard } from '../types/pokemon'
import { CardShowcase } from '../components/pokemon/CardShowcase'
import { CardDetail } from '../components/pokemon/CardDetail'
import { BADGES, MISSIONS, STATS } from '../data/mock'
import { useOwned } from '../store/collection'
import { useCollectionValue } from '../hooks/useCollectionValue'
import { formatBRL } from '../services/pricing'
import { useUi } from '../store/ui'
import { useAuth } from '../store/auth'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatTile } from '../components/ui/StatTile'
import { CardTile } from '../components/pokemon/CardTile'
import { BadgeMedal } from '../components/gamification/BadgeMedal'

const SURFACE = '#13131A'

const bootAt = (i: number) => ({ '--i': i }) as CSSProperties

export function Dashboard() {
  const go = useUi((s) => s.go)
  const user = useAuth((s) => s.user)!
  const [selected, setSelected] = useState<PokemonCard | null>(null)
  const owned = useOwned()
  const value = useCollectionValue(owned.entries)
  const showcase = owned.cards
  const recent = owned.cards.slice(0, 4)
  const xpLeft = STATS.nextLevelXp - STATS.xp

  return (
    <div className="space-y-8">
      <section style={bootAt(3)} className="boot panel relative grid animate-rise overflow-hidden lg:grid-cols-[minmax(340px,450px)_1fr] lg:items-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative p-6 pb-0 sm:p-8 sm:pb-0 lg:pb-8">
          <p className="label">Nível {STATS.level} · Treinador</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
            Bora completar
            <br />
            o set, <span className="text-primary">{user.name}</span>.
          </h1>
          <div className="mt-6 max-w-md">
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="text-muted">
                <span className="font-mono text-ink">{STATS.xp.toLocaleString('pt-BR')}</span> /{' '}
                {STATS.nextLevelXp.toLocaleString('pt-BR')} XP
              </span>
              <span className="text-muted">faltam {xpLeft.toLocaleString('pt-BR')}</span>
            </div>
            <ProgressBar value={STATS.xp} max={STATS.nextLevelXp} label="Progresso de XP" />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => go('colecao')}>
              Ver coleção <ArrowRight size={16} aria-hidden />
            </Button>
            <Button variant="secondary" onClick={() => go('trocas')}>
              <Repeat2 size={16} aria-hidden /> 2 trocas esperando
            </Button>
          </div>
        </div>
        <div className="relative">
          <p className="absolute left-0 right-0 top-4 z-10 flex items-center justify-center gap-1.5 text-xs text-muted lg:top-6">
            <Sparkles size={12} className="text-primary" aria-hidden /> Sua vitrine · arraste para girar
          </p>
          {showcase.length >= 3 ? (
            <CardShowcase
              cards={showcase}
              fadeColor={SURFACE}
              cardWidth={180}
              onOpen={setSelected}
              className="h-[330px] text-ink sm:h-[460px]"
            />
          ) : (
            <div className="flex h-[330px] flex-col items-center justify-center px-6 text-center sm:h-[460px]">
              <p className="font-medium">Sua vitrine aparece aqui</p>
              <p className="mt-1 text-sm text-muted">Adicione pelo menos 3 cartas à coleção para girar a vitrine.</p>
              <Button variant="secondary" className="mt-4" onClick={() => go('colecao')}>
                Adicionar cartas
              </Button>
            </div>
          )}
        </div>
      </section>
      <CardDetail card={selected} onClose={() => setSelected(null)} />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="boot" style={bootAt(4)}><StatTile icon={Layers} label="Cartas" value={owned.total} hint={`${owned.unique} únicas`} tone="primary" /></div>
        <div className="boot" style={bootAt(5)}><StatTile
          icon={Wallet}
          label="Valor estimado"
          value={value.loading ? '…' : value.error ? '—' : formatBRL(value.total)}
          hint={value.missing ? `${value.missing} sem preço` : 'Cardmarket, em reais'}
          tone="success"
        /></div>
        <div className="boot" style={bootAt(6)}><StatTile icon={Repeat2} label="Trocas" value={STATS.tradesCompleted} hint="concluídas" /></div>
        <div className="boot" style={bootAt(7)}><StatTile icon={Flame} label="Sequência" value={`${STATS.streak} dias`} hint="recorde: 9" tone="accent" /></div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="boot" style={bootAt(8)}>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-lg font-semibold">Adicionadas recentemente</h2>
            <button onClick={() => go('colecao')} className="text-sm text-muted hover:text-primary">
              Ver todas
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {recent.map((c) => (
              <button key={c.id} onClick={() => setSelected(c)} className="rounded-lg text-left">
                <CardTile card={c} quantity={owned.quantities[c.id]} size="sm" />
              </button>
            ))}
          </div>
        </section>

        <section className="boot panel p-5" style={bootAt(9)}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Missões do dia</h2>
            <span className="font-mono text-xs text-muted">renova em 6h</span>
          </div>
          <ul className="space-y-4">
            {MISSIONS.map((m) => {
              const done = m.progress >= m.goal
              return (
                <li key={m.id} className="flex gap-3">
                  <span
                    className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                      done ? 'border-success bg-success/15 text-success' : 'border-line text-transparent'
                    }`}
                  >
                    <Check size={14} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`text-sm ${done ? 'text-muted line-through' : ''}`}>{m.title}</span>
                      <span className="shrink-0 font-mono text-xs text-primary">+{m.xp} XP</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <ProgressBar value={m.progress} max={m.goal} size="sm" tone={done ? 'success' : 'primary'} label={m.title} />
                      <span className="font-mono text-[11px] text-muted">
                        {m.progress}/{m.goal}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <section className="boot panel p-5" style={bootAt(10)}>
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-lg font-semibold">Conquistas</h2>
          <button onClick={() => go('perfil')} className="text-sm text-muted hover:text-primary">
            {BADGES.filter((b) => b.unlocked).length} de {BADGES.length}
          </button>
        </div>
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {BADGES.map((b) => (
            <BadgeMedal key={b.id} badge={b} compact />
          ))}
        </div>
      </section>
    </div>
  )
}
