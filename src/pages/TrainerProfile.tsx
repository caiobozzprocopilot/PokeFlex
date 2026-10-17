import { useMemo, useState } from 'react'
import { BookOpen, CalendarDays, Check, CloudOff, Layers, Library, Lock, Pencil, Share2, UserX, Wallet } from 'lucide-react'
import type { PokemonCard } from '../types/pokemon'
import type { CollectionEntry } from '../store/collection'
import { useAuth } from '../store/auth'
import { useCollection } from '../store/collection'
import { useUi } from '../store/ui'
import { useResource } from '../hooks/useResource'
import { useCollectionPricing } from '../hooks/useCollectionValue'
import { fetchPublicProfile, profileLink } from '../services/social'
import { formatBRL } from '../services/pricing'
import { computeBadges, trainerLevel, trainerXp } from '../utils/achievements'
import { Avatar } from '../components/profile/Avatar'
import { Button } from '../components/ui/Button'
import { StatTile } from '../components/ui/StatTile'
import { CardTile } from '../components/pokemon/CardTile'
import { CardShowcase } from '../components/pokemon/CardShowcase'
import { CardDetail } from '../components/pokemon/CardDetail'
import { BadgeCase } from '../components/gamification/BadgeCase'
import { PokeballDeco, XpBar } from '../components/gamification/TrainerCard'
import { FollowButton } from '../components/social/SocialBits'

const SURFACE = '#13131A'
const NO_ENTRIES: CollectionEntry[] = []
const PAGE_SIZE = 20

const since = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')

export function TrainerProfile() {
  const handle = useUi((s) => s.trainer)
  const go = useUi((s) => s.go)
  const user = useAuth((s) => s.user)
  const own = useCollection((s) => s.entries)
  const profile = useResource(`trainer:${handle}`, () => fetchPublicProfile(handle, user, own))
  const p = profile.data

  if (profile.loading) {
    return (
      <div className="space-y-6" aria-busy>
        <div className="panel h-56 animate-pulse" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="panel h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (profile.error) {
    return (
      <div className="panel flex flex-col items-center px-6 py-16 text-center">
        <CloudOff size={32} className="text-muted" aria-hidden />
        <p className="mt-4 font-medium">Não deu para abrir este perfil</p>
        <p className="mt-1 text-sm text-muted">{profile.error}</p>
        <button onClick={profile.retry} className="mt-5 text-sm text-primary hover:underline">
          Tentar de novo
        </button>
      </div>
    )
  }

  if (!p) {
    return (
      <div className="panel flex flex-col items-center px-6 py-16 text-center">
        <UserX size={32} className="text-muted" aria-hidden />
        <p className="mt-4 font-medium">Treinador não encontrado</p>
        <p className="mt-1 max-w-sm text-sm text-muted">
          O perfil <span className="font-mono">@{handle}</span> não existe ou é privado.
        </p>
        {user && (
          <Button variant="secondary" className="mt-6" onClick={() => go('treinadores')}>
            Ver treinadores
          </Button>
        )}
      </div>
    )
  }

  return <ProfileView key={p.id} profile={p} />
}

function ProfileView({ profile: p }: { profile: NonNullable<Awaited<ReturnType<typeof fetchPublicProfile>>> }) {
  const user = useAuth((s) => s.user)
  const go = useUi((s) => s.go)
  const isMe = user?.id === p.id
  const [followers, setFollowers] = useState(p.followers)
  const [shared, setShared] = useState(false)
  const [shown, setShown] = useState(PAGE_SIZE)
  const [selected, setSelected] = useState<PokemonCard | null>(null)

  const pricing = useCollectionPricing(p.showValue ? p.entries : NO_ENTRIES)
  const badges = useMemo(
    () => computeBadges(p.entries, p.showValue && !pricing.loading ? pricing.total : null),
    [p.entries, p.showValue, pricing.loading, pricing.total],
  )
  const level = useMemo(() => trainerLevel(trainerXp(p.entries, badges)), [p.entries, badges])

  const cards = useMemo(() => {
    const seen = new Map<string, { card: PokemonCard; quantity: number }>()
    for (const e of p.entries) {
      const s = seen.get(e.card.id)
      if (s) s.quantity += e.quantity
      else seen.set(e.card.id, { card: e.card, quantity: e.quantity })
    }
    return [...seen.values()]
  }, [p.entries])
  const total = p.entries.reduce((n, e) => n + e.quantity, 0)
  const sets = new Set(p.entries.map((e) => e.card.setId)).size
  const pokedex = badges.find((b) => b.id === 'pokedex')?.value ?? 0

  const featured = p.showcases.find((s) => s.featured) ?? p.showcases[0]
  const byId = useMemo(() => new Map(cards.map((c) => [c.card.id, c.card])), [cards])
  const showcaseCards = featured ? featured.cardIds.map((id) => byId.get(id)).filter((c): c is PokemonCard => !!c) : []

  const share = async () => {
    const url = profileLink(p.username)
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    try {
      if (nav.share && matchMedia('(pointer: coarse)').matches) {
        await nav.share({ title: `${p.name} no PokeFlex`, text: `Veja a coleção de ${p.name} no PokeFlex`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setShared(true)
      window.setTimeout(() => setShared(false), 2200)
    } catch {
      // Compartilhamento cancelado: nada a fazer.
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel relative overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <PokeballDeco className="-right-20 -top-24 h-72 w-72 text-white/[0.04]" />
        <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
          <Avatar name={p.name} url={p.avatarUrl} className="h-24 w-24" textClassName="text-4xl" />
          <div className="w-full min-w-0 flex-1">
            <div className="flex flex-col items-center gap-x-3 gap-y-1 sm:flex-row sm:items-baseline">
              <h1 className="text-3xl font-bold">{p.name}</h1>
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                NV {level.level} · {level.title}
              </span>
            </div>
            <p className="font-mono text-sm text-muted">@{p.username}</p>
            {p.bio && <p className="mx-auto mt-3 max-w-xl text-sm sm:mx-0">{p.bio}</p>}
            <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted sm:justify-start">
              <span>
                <span className="font-semibold text-ink">{followers}</span> {followers === 1 ? 'seguidor' : 'seguidores'}
              </span>
              <span>
                <span className="font-semibold text-ink">{p.following}</span> seguindo
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={14} aria-hidden /> desde {since(p.createdAt)}
              </span>
            </p>
            <XpBar level={level} className="mx-auto mt-4 max-w-sm sm:mx-0" />
          </div>
          <div className="flex shrink-0 flex-wrap justify-center gap-2">
            {isMe ? (
              <Button variant="secondary" size="sm" onClick={() => go('perfil')}>
                <Pencil size={15} aria-hidden /> Editar
              </Button>
            ) : (
              <FollowButton targetId={p.id} following={p.isFollowing} onChange={(f) => setFollowers((n) => n + (f ? 1 : -1))} />
            )}
            <Button variant="secondary" size="sm" className="h-10" onClick={share}>
              {shared ? <Check size={15} aria-hidden /> : <Share2 size={15} aria-hidden />} {shared ? 'Link copiado' : 'Compartilhar'}
            </Button>
          </div>
        </div>
        {isMe && !p.isPublic && (
          <p className="relative mt-5 rounded-xl bg-accent/10 px-4 py-2 text-center text-sm text-accent">
            Só você vê esta página: seu perfil ainda está privado.
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={Layers} label="Cartas" value={total} hint={`${cards.length} únicas`} tone="primary" />
        <StatTile icon={BookOpen} label="Pokédex" value={pokedex} hint="Pokémon diferentes" />
        <StatTile icon={Library} label="Coleções" value={sets} />
        {p.showValue ? (
          <StatTile icon={Wallet} label="Valor" value={pricing.loading ? '…' : formatBRL(pricing.total)} hint="estimado, em reais" tone="success" />
        ) : (
          <StatTile icon={Lock} label="Valor" value="Privado" hint="o treinador escolheu ocultar" />
        )}
      </section>

      {showcaseCards.length >= 3 && featured && (
        <section className="panel relative overflow-hidden" aria-label={`Vitrine ${featured.name}`}>
          <p className="absolute left-0 right-0 top-4 z-10 text-center text-xs text-muted">{featured.name}</p>
          <CardShowcase
            cards={showcaseCards}
            preset={featured.style}
            cardWidth={180}
            fadeColor={SURFACE}
            onOpen={(c) => user && setSelected(c)}
            className="h-[380px] text-ink sm:h-[460px]"
          />
        </section>
      )}

      <BadgeCase badges={badges} />

      <section aria-labelledby="public-cards-title">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="public-cards-title" className="text-lg font-semibold">
            Coleção
          </h2>
          <span className="text-sm text-muted">mais recentes primeiro</span>
        </div>
        {cards.length === 0 ? (
          <p className="panel px-5 py-10 text-center text-sm text-muted">Nenhuma carta ainda.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {cards.slice(0, shown).map(({ card, quantity }) =>
                user ? (
                  <button key={card.id} onClick={() => setSelected(card)} className="rounded-lg text-left">
                    <CardTile card={card} quantity={quantity} />
                  </button>
                ) : (
                  <CardTile key={card.id} card={card} quantity={quantity} />
                ),
              )}
            </div>
            {shown < cards.length && (
              <div className="mt-6 text-center">
                <Button variant="secondary" onClick={() => setShown((n) => n + PAGE_SIZE * 2)}>
                  Ver mais ({cards.length - shown})
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {user && <CardDetail card={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
