import { useMemo, useState } from 'react'
import { Award, Download, Layers, Library, LogOut, Pencil, Plus, Star, Wallet } from 'lucide-react'
import type { PokemonCard } from '../types/pokemon'
import { useOwned } from '../store/collection'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { useShowcases, type Showcase } from '../store/showcases'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useCollectionPricing } from '../hooks/useCollectionValue'
import { formatBRL } from '../services/pricing'
import { computeBadges } from '../utils/achievements'
import { TYPE_INFO } from '../utils/pokemon'
import { Button } from '../components/ui/Button'
import { StatTile } from '../components/ui/StatTile'
import { BadgeMedal } from '../components/gamification/BadgeMedal'
import { Avatar } from '../components/profile/Avatar'
import { ProfileEditor } from '../components/profile/ProfileEditor'
import { ShowcaseEditor } from '../components/profile/ShowcaseEditor'
import { CardShowcase } from '../components/pokemon/CardShowcase'
import { CardDetail } from '../components/pokemon/CardDetail'
import { TopCardSpotlight } from '../components/pokemon/TopCardSpotlight'

const SURFACE = '#13131A'

export function Profile() {
  const user = useAuth((s) => s.user)!
  const signOut = useAuth((s) => s.signOut)
  const avatarUrl = useProfile((s) => s.avatarUrl)
  const owned = useOwned()
  const pricing = useCollectionPricing(owned.entries)
  const showcases = useShowcases((s) => s.items)
  const feature = useShowcases((s) => s.feature)
  const { available: installable, install } = useInstallPrompt()

  const [editingProfile, setEditingProfile] = useState(false)
  const [editor, setEditor] = useState<{ open: boolean; showcase: Showcase | null }>({ open: false, showcase: null })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selected, setSelected] = useState<PokemonCard | null>(null)
  const [showcaseError, setShowcaseError] = useState<string | null>(null)

  const byId = useMemo(() => new Map(owned.cards.map((c) => [c.id, c])), [owned.cards])
  const active = showcases.find((s) => s.id === activeId) ?? showcases.find((s) => s.featured) ?? showcases[0]
  const activeCards = active ? active.cardIds.map((id) => byId.get(id)).filter((c): c is PokemonCard => !!c) : []

  const sets = useMemo(() => new Set(owned.entries.map((e) => e.card.setId)).size, [owned.entries])
  const badges = useMemo(
    () => computeBadges(owned.entries, pricing.loading ? null : pricing.total),
    [owned.entries, pricing.loading, pricing.total],
  )
  const unlocked = badges.filter((b) => b.unlocked).length

  const byType = Object.entries(TYPE_INFO)
    .map(([type, info]) => ({
      ...info,
      count: owned.entries.filter((e) => e.card.type === type).reduce((n, e) => n + e.quantity, 0),
    }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
  const maxType = Math.max(1, ...byType.map((t) => t.count))

  const makeFeatured = async (id: string) => {
    setShowcaseError(null)
    try {
      await feature(id)
    } catch (err) {
      setShowcaseError(err instanceof Error ? err.message : 'Não foi possível trocar a vitrine principal.')
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel relative overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <button
            onClick={() => setEditingProfile(true)}
            aria-label="Trocar foto de perfil"
            className="group relative rounded-full"
          >
            <Avatar name={user.name} url={avatarUrl} className="h-24 w-24" textClassName="text-4xl" />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-bg/60 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Pencil size={20} aria-hidden />
            </span>
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{user.name}</h1>
            <p className="text-muted">{user.email}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {installable && (
              <Button size="sm" onClick={install}>
                <Download size={15} aria-hidden /> Instalar app
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setEditingProfile(true)}>
              <Pencil size={15} aria-hidden /> Editar perfil
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut size={15} aria-hidden /> Sair
            </Button>
          </div>
        </div>
      </section>

      <TopCardSpotlight pricing={pricing} onOpen={setSelected} />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={Layers} label="Cartas" value={owned.total} hint={`${owned.unique} únicas`} tone="primary" />
        <StatTile
          icon={Wallet}
          label="Valor estimado"
          value={pricing.loading ? '…' : pricing.error ? '—' : formatBRL(pricing.total)}
          tone="success"
        />
        <StatTile icon={Library} label="Coleções" value={sets} />
        <StatTile icon={Award} label="Conquistas" value={`${unlocked}/${badges.length}`} tone="accent" />
      </section>

      <section className="panel overflow-hidden" aria-labelledby="showcases-title">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-0">
          <h2 id="showcases-title" className="text-lg font-semibold">
            Vitrines
          </h2>
          <Button size="sm" onClick={() => setEditor({ open: true, showcase: null })} disabled={owned.cards.length < 3}>
            <Plus size={15} aria-hidden /> Nova vitrine
          </Button>
        </div>

        {showcaseError && (
          <p role="alert" className="mx-5 mt-3 rounded-xl bg-accent/10 px-4 py-2 text-sm text-accent">
            {showcaseError}
          </p>
        )}

        {showcases.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="font-medium">Monte suas vitrines</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              {owned.cards.length < 3
                ? 'Adicione pelo menos 3 cartas à coleção para montar uma vitrine.'
                : 'Escolha as cartas que você mais gosta, a ordem e o jeito de girar. A vitrine principal aparece no Início.'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto px-5 pt-4" role="tablist" aria-label="Suas vitrines">
              {showcases.map((s) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={active?.id === s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors ${
                    active?.id === s.id ? 'border-primary bg-primary/10 text-primary' : 'border-line text-muted hover:text-ink'
                  }`}
                >
                  {s.featured && <Star size={13} fill="currentColor" aria-label="Principal" />}
                  {s.name}
                </button>
              ))}
            </div>

            {active && (
              <div role="tabpanel" aria-label={active.name}>
                {activeCards.length >= 3 ? (
                  <CardShowcase
                    key={`${active.id}-${active.style}-${activeCards.length}`}
                    cards={activeCards}
                    preset={active.style}
                    cardWidth={190}
                    fadeColor={SURFACE}
                    onOpen={setSelected}
                    className="h-[400px] text-ink sm:h-[480px]"
                  />
                ) : (
                  <p className="px-5 py-12 text-center text-sm text-muted">
                    Algumas cartas desta vitrine saíram da coleção. Edite para escolher outras.
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
                  <span className="text-sm text-muted">
                    {activeCards.length} {activeCards.length === 1 ? 'carta' : 'cartas'}
                    {active.featured ? ' · aparece no Início' : ''}
                  </span>
                  <div className="flex gap-2">
                    {!active.featured && (
                      <Button variant="ghost" size="sm" onClick={() => makeFeatured(active.id)}>
                        <Star size={15} aria-hidden /> Tornar principal
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => setEditor({ open: true, showcase: active })}>
                      <Pencil size={15} aria-hidden /> Editar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="panel p-5">
          <h2 className="mb-5 text-lg font-semibold">Cartas por tipo</h2>
          {byType.length ? (
            <ul className="space-y-3.5">
              {byType.map((t) => (
                <li key={t.label} className="grid grid-cols-[80px_1fr_28px] items-center gap-3 text-sm">
                  <span className="text-muted">{t.label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-raised">
                    <span className="block h-full rounded-full" style={{ width: `${(t.count / maxType) * 100}%`, background: t.color }} />
                  </span>
                  <span className="text-right font-mono text-xs">{t.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Adicione cartas Pokémon para ver a distribuição por tipo.</p>
          )}
        </section>

        <section className="panel p-5">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Conquistas</h2>
            <span className="font-mono text-xs text-muted">
              {unlocked}/{badges.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3">
            {badges.map((b) => (
              <BadgeMedal key={b.id} badge={b} />
            ))}
          </div>
        </section>
      </div>

      <ProfileEditor open={editingProfile} onClose={() => setEditingProfile(false)} />
      <ShowcaseEditor
        open={editor.open}
        showcase={editor.showcase}
        onClose={() => setEditor({ open: false, showcase: null })}
        onSaved={setActiveId}
      />
      <CardDetail card={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
