import { useMemo, useState, type CSSProperties } from 'react'
import { ArrowRight, Heart, Layers, Library, Search, Sparkles, Wallet } from 'lucide-react'
import type { PokemonCard } from '../types/pokemon'
import { CardShowcase } from '../components/pokemon/CardShowcase'
import { CardDetail } from '../components/pokemon/CardDetail'
import { useOwned } from '../store/collection'
import { useWishlist } from '../store/wishlist'
import { useShowcases } from '../store/showcases'
import { TopCardSpotlight } from '../components/pokemon/TopCardSpotlight'
import { useCollectionPricing } from '../hooks/useCollectionValue'
import { useWishlistPricing } from '../hooks/useWishlistPricing'
import { formatBRL } from '../services/pricing'
import { computeBadges, trainerLevel, trainerXp } from '../utils/achievements'
import { setsInProgress } from '../utils/sets'
import { useUi } from '../store/ui'
import { useAuth } from '../store/auth'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatTile } from '../components/ui/StatTile'
import { CardTile } from '../components/pokemon/CardTile'
import { PokeballDeco, TrainerCard } from '../components/gamification/TrainerCard'

const SURFACE = '#13131A'

const bootAt = (i: number) => ({ '--i': i }) as CSSProperties

export function Dashboard() {
  const go = useUi((s) => s.go)
  const openSet = useUi((s) => s.openSet)
  const user = useAuth((s) => s.user)!
  const [selected, setSelected] = useState<PokemonCard | null>(null)
  const owned = useOwned()
  const pricing = useCollectionPricing(owned.entries)
  const wishes = useWishlist((s) => s.items)
  const wishPricing = useWishlistPricing(wishes)
  const featured = useShowcases((s) => s.items.find((x) => x.featured))
  const featuredCards = useMemo(() => {
    if (!featured) return []
    const byId = new Map(owned.cards.map((c) => [c.id, c]))
    return featured.cardIds.map((id) => byId.get(id)).filter((c): c is PokemonCard => !!c)
  }, [featured, owned.cards])
  const useFeatured = featuredCards.length >= 3
  const showcase = useFeatured ? featuredCards : owned.cards
  const recent = owned.cards.slice(0, 4)
  const sets = useMemo(() => setsInProgress(owned.entries), [owned.entries])
  const badges = useMemo(
    () => computeBadges(owned.entries, pricing.loading ? null : pricing.total),
    [owned.entries, pricing.loading, pricing.total],
  )
  const level = useMemo(() => trainerLevel(trainerXp(owned.entries, badges)), [owned.entries, badges])
  const openBadges = () => {
    go('perfil')
    window.setTimeout(() => document.getElementById('insignias')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
  }
  const alerts = wishPricing.list.filter((w) => w.belowTarget).length
  const monthPct = pricing.monthAvg30 > 0 ? ((pricing.monthNow - pricing.monthAvg30) / pricing.monthAvg30) * 100 : null
  const empty = owned.entries.length === 0

  return (
    <div className="space-y-8">
      <section
        style={bootAt(3)}
        className="boot panel relative grid animate-rise overflow-hidden lg:grid-cols-[minmax(340px,450px)_1fr] lg:items-center"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <PokeballDeco className="-bottom-28 -left-28 h-80 w-80 text-white/[0.035]" />
        <div className="relative p-6 pb-0 sm:p-8 sm:pb-0 lg:pb-8">
          <p className="label">Sua coleção</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
            {empty ? (
              <>
                Bem-vindo,
                <br />
              </>
            ) : (
              <>
                Bora completar
                <br />o set,{' '}
              </>
            )}
            <span className="text-primary">{user.name}</span>.
          </h1>
          <p className="mt-4 text-muted">
            {empty ? (
              'Busque uma carta, veja o preço em reais e adicione à sua coleção.'
            ) : (
              <>
                <span className="font-mono text-ink">{pricing.loading ? '…' : formatBRL(pricing.total)}</span> em {owned.total}{' '}
                {owned.total === 1 ? 'carta' : 'cartas'} de {sets.length} {sets.length === 1 ? 'coleção' : 'coleções'}.
              </>
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {empty ? (
              <Button onClick={() => go('busca')}>
                <Search size={16} aria-hidden /> Buscar carta
              </Button>
            ) : (
              <>
                <Button onClick={() => go('colecao')}>
                  Ver coleção <ArrowRight size={16} aria-hidden />
                </Button>
                <Button variant="secondary" onClick={() => go('valor')}>
                  <Wallet size={16} aria-hidden /> Ver valorização
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="relative">
          {showcase.length >= 3 ? (
            <>
              <p className="absolute left-0 right-0 top-4 z-10 flex items-center justify-center gap-1.5 text-xs text-muted lg:top-6">
                <Sparkles size={12} className="text-primary" aria-hidden />
                {useFeatured ? featured!.name : 'Sua coleção'} · arraste para girar ·
                <button
                  onClick={() => go('perfil')}
                  className="pointer-events-auto underline-offset-2 hover:text-primary hover:underline"
                >
                  {useFeatured ? 'editar' : 'criar vitrine'}
                </button>
              </p>
              <CardShowcase
                key={useFeatured ? `${featured!.id}-${featured!.style}` : 'todas'}
                cards={showcase}
                preset={useFeatured ? featured!.style : 'cylinder'}
                fadeColor={SURFACE}
                cardWidth={180}
                onOpen={setSelected}
                className="h-[330px] text-ink sm:h-[460px]"
              />
            </>
          ) : (
            <div className="flex h-[330px] flex-col items-center justify-center px-6 text-center sm:h-[460px]">
              <p className="font-medium">Sua vitrine aparece aqui</p>
              <p className="mt-1 text-sm text-muted">Adicione pelo menos 3 cartas para girar a vitrine.</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="boot" style={bootAt(4)}>
          <StatTile icon={Layers} label="Cartas" value={owned.total} hint={`${owned.unique} únicas`} tone="primary" />
        </div>
        <div className="boot" style={bootAt(5)}>
          <StatTile
            icon={Wallet}
            label="Valor estimado"
            value={pricing.loading ? '…' : pricing.error ? '—' : formatBRL(pricing.total)}
            hint={
              monthPct !== null && Math.abs(monthPct) >= 0.5
                ? `${monthPct > 0 ? '+' : ''}${monthPct.toFixed(1).replace('.', ',')}% na semana vs. mês`
                : pricing.missing
                  ? `${pricing.missing} sem preço`
                  : 'Cardmarket, em reais'
            }
            tone="success"
          />
        </div>
        <div className="boot" style={bootAt(6)}>
          <StatTile
            icon={Library}
            label="Coleções"
            value={sets.length}
            hint={sets.length ? 'com cartas suas' : 'nenhuma ainda'}
          />
        </div>
        <div className="boot" style={bootAt(7)}>
          <StatTile
            icon={Heart}
            label="Desejos"
            value={wishes.length}
            hint={alerts ? `${alerts} abaixo do alvo` : 'acompanhando preço'}
            tone="accent"
          />
        </div>
      </section>

      <div className="boot" style={bootAt(8)}>
        <TrainerCard level={level} badges={badges} onOpenBadges={openBadges} />
      </div>

      {!empty && (
        <div className="boot" style={bootAt(9)}>
          <TopCardSpotlight pricing={pricing} onOpen={setSelected} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="boot" style={bootAt(10)}>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-lg font-semibold">Adicionadas recentemente</h2>
            {!empty && (
              <button onClick={() => go('colecao')} className="text-sm text-muted hover:text-primary">
                Ver todas
              </button>
            )}
          </div>
          {recent.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {recent.map((c) => (
                <button key={c.id} onClick={() => setSelected(c)} className="rounded-lg text-left">
                  <CardTile card={c} quantity={owned.quantities[c.id]} size="sm" />
                </button>
              ))}
            </div>
          ) : (
            <p className="panel px-5 py-8 text-center text-sm text-muted">As cartas que você adicionar aparecem aqui.</p>
          )}
        </section>

        <section className="boot panel p-5" style={bootAt(11)}>
          <h2 className="mb-4 text-lg font-semibold">Seus sets</h2>
          {sets.length ? (
            <ul className="space-y-4">
              {sets.slice(0, 5).map((s) => (
                <li key={s.setId}>
                  <button onClick={() => openSet(s.setId)} className="group block w-full text-left">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm group-hover:text-primary">{s.name}</span>
                      <span className="shrink-0 font-mono text-xs text-muted">
                        {s.owned}/{s.official}
                      </span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={s.owned} max={s.official} size="sm" tone="success" label={`Progresso de ${s.name}`} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Quando você adicionar cartas, o progresso de cada set aparece aqui.</p>
          )}
        </section>
      </div>

      <CardDetail card={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
