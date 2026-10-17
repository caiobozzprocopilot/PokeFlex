import type { CardVariant, PokemonCard } from '../types/pokemon'
import type { CollectionEntry, Language } from '../store/collection'
import type { Condition } from './pricing'
import type { ShowcaseStyle } from '../store/showcases'
import { isDemo, supabase } from '../lib/supabase'
import { card as baseCard } from '../data/mock'

export type SocialSettings = { username: string | null; isPublic: boolean; showValue: boolean; bio: string; openToTrade?: boolean }

export type PublicShowcase = { id: string; name: string; cardIds: string[]; style: ShowcaseStyle; featured: boolean }

export type PublicProfile = {
  id: string
  username: string
  name: string
  avatarUrl: string | null
  bio: string
  showValue: boolean
  isPublic: boolean
  createdAt: string
  followers: number
  following: number
  isFollowing: boolean
  entries: CollectionEntry[]
  showcases: PublicShowcase[]
}

export type TrainerSummary = {
  id: string
  username: string
  name: string
  avatarUrl: string | null
  cards: number
  isFollowing: boolean
}

export type ActivityData =
  | { kind: 'card'; id: string; name: string; image?: string; set?: string; variant?: CardVariant; quantity?: number }
  | { kind: 'badge'; id: string; name: string; tier: number }
  | { kind: 'level'; level: number; title: string }

export type Activity = {
  id: string
  createdAt: string
  user: { id: string; username: string | null; name: string; avatarUrl: string | null }
  data: ActivityData
}

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/

const failure = (fallback: string, message?: string) =>
  new Error(message && /fetch|network/i.test(message) ? 'Sem conexão com o servidor.' : fallback)

export function profileLink(username: string) {
  return `${window.location.origin}/#/t/${username}`
}

// ---------- Modo demonstração: dois treinadores fictícios para explorar o recurso ----------

const DAY = 24 * 60 * 60 * 1000
const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

export type DemoTrainer = Omit<PublicProfile, 'isFollowing' | 'followers'> & { baseFollowers: number }

const demoEntries = (prefix: string, cards: [PokemonCard, number, CardVariant?][]): CollectionEntry[] =>
  cards.map(([c, quantity, variant], i) => ({
    id: `${prefix}-${c.id}`,
    card: c,
    variant: variant ?? (c.holo ? 'holo' : 'normal'),
    condition: 'NM' as Condition,
    language: 'en' as Language,
    quantity,
    addedAt: ago((i + 1) * 0.6 * DAY),
  }))

// Cartas que cada treinador fictício procura, para as trocas da demonstração.
export const DEMO_WANTS: Record<string, string[]> = {
  'demo-misty': ['base1-58', 'base1-18', 'base1-4'],
  'demo-brock': ['base1-46', 'base1-17', 'base1-16'],
}

export const DEMO_TRAINERS: DemoTrainer[] = [
  {
    id: 'demo-misty',
    username: 'misty',
    name: 'Misty',
    avatarUrl: null,
    bio: 'Líder do Ginásio de Cerulean. Só aceito Pokémon de Água na minha coleção (quase sempre).',
    showValue: true,
    isPublic: true,
    createdAt: ago(120 * DAY),
    following: 3,
    baseFollowers: 128,
    entries: demoEntries('misty', [
      [baseCard(2, 'Blastoise', 'water', 'Rare', true, 100), 1],
      [baseCard(64, 'Starmie', 'water', 'Common', false, 60), 3],
      [baseCard(65, 'Staryu', 'water', 'Common', false, 40), 4],
      [baseCard(6, 'Gyarados', 'water', 'Rare', true, 100), 2],
      [baseCard(13, 'Poliwrath', 'water', 'Rare', true, 90), 1],
      [baseCard(42, 'Wartortle', 'water', 'Common', false, 70), 2],
      [baseCard(63, 'Squirtle', 'water', 'Common', false, 40), 3],
      [baseCard(59, 'Poliwag', 'water', 'Common', false, 40), 2],
      [baseCard(35, 'Magikarp', 'water', 'Common', false, 30), 5],
      [baseCard(25, 'Dewgong', 'water', 'Common', false, 80), 1],
      [baseCard(41, 'Seel', 'water', 'Common', false, 60), 2],
      [baseCard(58, 'Pikachu', 'lightning', 'Common', false, 40), 1],
    ]),
    showcases: [{ id: 'misty-1', name: 'Time de Cerulean', cardIds: ['base1-2', 'base1-64', 'base1-6', 'base1-13', 'base1-42'], style: 'orbit', featured: true }],
  },
  {
    id: 'demo-brock',
    username: 'brock',
    name: 'Brock',
    avatarUrl: null,
    bio: 'Pewter City. Pedra, luta e um carinho especial por Onix.',
    showValue: false,
    isPublic: true,
    createdAt: ago(90 * DAY),
    following: 5,
    baseFollowers: 74,
    entries: demoEntries('brock', [
      [baseCard(56, 'Onix', 'fighting', 'Common', false, 90), 3],
      [baseCard(8, 'Machamp', 'fighting', 'Rare', true, 100), 1],
      [baseCard(7, 'Hitmonchan', 'fighting', 'Rare', true, 70), 1],
      [baseCard(34, 'Machoke', 'fighting', 'Common', false, 80), 2],
      [baseCard(52, 'Machop', 'fighting', 'Common', false, 50), 4],
      [baseCard(62, 'Sandshrew', 'fighting', 'Common', false, 40), 2],
      [baseCard(47, 'Diglett', 'fighting', 'Common', false, 30), 3],
      [baseCard(19, 'Dugtrio', 'fighting', 'Rare', false, 70), 1],
      [baseCard(16, 'Zapdos', 'lightning', 'Rare', true, 90), 1],
    ]),
    showcases: [{ id: 'brock-1', name: 'Rocha dura', cardIds: ['base1-56', 'base1-8', 'base1-7', 'base1-19'], style: 'cylinder', featured: true }],
  },
]

const DEMO_KEYS = { settings: 'pokeflex-social', following: 'pokeflex-following' }

export const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sem armazenamento: vale só nesta visita.
  }
}

const demoAvatar = () => {
  try {
    return localStorage.getItem('pokeflex-avatar')
  } catch {
    return null
  }
}

const demoFollowing = () => new Set(readJson<string[]>(DEMO_KEYS.following, []))

const demoProfile = (t: DemoTrainer): PublicProfile => {
  const isFollowing = demoFollowing().has(t.id)
  const { baseFollowers, ...rest } = t
  return { ...rest, followers: baseFollowers + (isFollowing ? 1 : 0), isFollowing }
}

const demoActivities = (t: DemoTrainer): Activity[] => {
  const user = { id: t.id, username: t.username, name: t.name, avatarUrl: t.avatarUrl }
  const cards: Activity[] = t.entries.slice(0, 6).map((e) => ({
    id: `${e.id}-act`,
    createdAt: e.addedAt,
    user,
    data: { kind: 'card', id: e.card.id, name: e.card.name, image: e.card.imageUrl, set: e.card.series, variant: e.variant, quantity: e.quantity },
  }))
  const extra: Activity[] =
    t.id === 'demo-misty'
      ? [
          { id: 'misty-badge', createdAt: ago(0.15 * DAY), user, data: { kind: 'badge', id: 'colecionador', name: 'Colecionador', tier: 2 } },
          { id: 'misty-level', createdAt: ago(0.16 * DAY), user, data: { kind: 'level', level: 5, title: 'Treinador' } },
        ]
      : [{ id: 'brock-badge', createdAt: ago(1.3 * DAY), user, data: { kind: 'badge', id: 'iniciais', name: 'Iniciais', tier: 1 } }]
  return [...extra, ...cards]
}

// ---------- API ----------

type ProfileRow = {
  id: string
  username: string
  name: string
  avatar_url: string | null
  bio: string | null
  show_value: boolean
  is_public: boolean
  created_at: string
  followers: number
  following: number
  is_following: boolean
  entries: {
    id: string
    card: PokemonCard
    variant: CardVariant
    condition: Condition
    language: Language
    quantity: number
    graded_company: string | null
    graded_grade: number | null
    added_at: string
  }[]
  showcases: { id: string; name: string; card_ids: string[]; style: ShowcaseStyle; is_featured: boolean }[]
}

export async function fetchMySettings(userId: string): Promise<SocialSettings> {
  if (isDemo) return readJson<SocialSettings>(DEMO_KEYS.settings, { username: null, isPublic: false, showValue: false, bio: '' })
  const { data, error } = await supabase!
    .from('profiles')
    .select('username, is_public, show_value, bio, open_to_trade')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw failure('Não foi possível carregar seu perfil público.', error.message)
  const row = data as { username: string | null; is_public: boolean; show_value: boolean; bio: string | null; open_to_trade: boolean } | null
  return {
    username: row?.username ?? null,
    isPublic: !!row?.is_public,
    showValue: !!row?.show_value,
    bio: row?.bio ?? '',
    openToTrade: !!row?.open_to_trade,
  }
}

export async function saveMySettings(userId: string, s: SocialSettings) {
  const username = s.username?.trim().toLowerCase() || null
  const bio = s.bio.trim()
  if (s.isPublic && !username) throw new Error('Escolha um nome de usuário para deixar o perfil público.')
  if (username && !USERNAME_RE.test(username)) throw new Error('Use de 3 a 20 letras minúsculas, números ou _ no nome de usuário.')
  if (bio.length > 160) throw new Error('A bio pode ter até 160 caracteres.')
  if (username && DEMO_TRAINERS.some((t) => t.username === username) && isDemo) throw new Error('Esse nome de usuário já está em uso.')
  const clean = { username, isPublic: s.isPublic, showValue: s.showValue, bio, openToTrade: !!s.openToTrade }
  if (isDemo) return writeJson(DEMO_KEYS.settings, clean)
  const { error } = await supabase!
    .from('profiles')
    .update({ username, is_public: s.isPublic, show_value: s.showValue, bio: bio || null, open_to_trade: !!s.openToTrade })
    .eq('id', userId)
  if (error?.code === '23505') throw new Error('Esse nome de usuário já está em uso.')
  if (error) throw failure('Não foi possível salvar o perfil público.', error.message)
}

// Perfil público pelo @usuário; null quando não existe ou é privado.
export async function fetchPublicProfile(username: string, me?: { id: string; name: string } | null, own?: CollectionEntry[]): Promise<PublicProfile | null> {
  const handle = username.toLowerCase()
  if (isDemo) {
    const t = DEMO_TRAINERS.find((x) => x.username === handle)
    if (t) {
      const p = demoProfile(t)
      return me ? p : { ...p, isFollowing: false, followers: t.baseFollowers }
    }
    const mine = readJson<SocialSettings>(DEMO_KEYS.settings, { username: null, isPublic: false, showValue: false, bio: '' })
    if (me && mine.username === handle) {
      return {
        id: me.id,
        username: handle,
        name: me.name,
        avatarUrl: demoAvatar(),
        bio: mine.bio,
        showValue: mine.showValue,
        isPublic: mine.isPublic,
        createdAt: ago(10 * DAY),
        followers: 0,
        following: demoFollowing().size,
        isFollowing: false,
        entries: own ?? [],
        showcases: readJson<PublicShowcase[]>('pokeflex-showcases', []),
      }
    }
    return null
  }
  const { data, error } = await supabase!.rpc('public_profile', { p_username: handle })
  if (error) throw failure('Não foi possível abrir o perfil.', error.message)
  const row = data as ProfileRow | null
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    avatarUrl: row.avatar_url,
    bio: row.bio ?? '',
    showValue: row.show_value,
    isPublic: row.is_public,
    createdAt: row.created_at,
    followers: Number(row.followers),
    following: Number(row.following),
    isFollowing: row.is_following,
    entries: row.entries.map((e) => ({
      id: e.id,
      card: e.card,
      variant: e.variant,
      condition: e.condition,
      language: e.language,
      quantity: e.quantity,
      graded: e.graded_company ? { company: e.graded_company, grade: Number(e.graded_grade) } : undefined,
      addedAt: e.added_at,
    })),
    showcases: row.showcases.map((s) => ({ id: s.id, name: s.name, cardIds: s.card_ids, style: s.style, featured: s.is_featured })),
  }
}

export async function searchTrainers(query: string): Promise<TrainerSummary[]> {
  const q = query.trim().toLowerCase()
  if (isDemo) {
    const following = demoFollowing()
    return DEMO_TRAINERS.filter((t) => !q || t.username.includes(q) || t.name.toLowerCase().includes(q)).map((t) => ({
      id: t.id,
      username: t.username,
      name: t.name,
      avatarUrl: t.avatarUrl,
      cards: t.entries.reduce((n, e) => n + e.quantity, 0),
      isFollowing: following.has(t.id),
    }))
  }
  const { data, error } = await supabase!.rpc('search_trainers', { p_query: q })
  if (error) throw failure('Não foi possível buscar treinadores.', error.message)
  return ((data ?? []) as { id: string; username: string; name: string; avatar_url: string | null; cards: number; is_following: boolean }[]).map((r) => ({
    id: r.id,
    username: r.username,
    name: r.name,
    avatarUrl: r.avatar_url,
    cards: Number(r.cards),
    isFollowing: r.is_following,
  }))
}

export async function setFollowing(targetId: string, follow: boolean) {
  if (isDemo) {
    const set = demoFollowing()
    if (follow) set.add(targetId)
    else set.delete(targetId)
    return writeJson(DEMO_KEYS.following, [...set])
  }
  const { error } = follow
    ? await supabase!.from('follows').insert({ followee_id: targetId })
    : await supabase!.from('follows').delete().eq('followee_id', targetId)
  if (error && error.code !== '23505') throw failure(follow ? 'Não foi possível seguir.' : 'Não foi possível deixar de seguir.', error.message)
}

type FeedRow = {
  id: string
  kind: 'card' | 'badge' | 'level'
  data: Record<string, unknown>
  created_at: string
  user_id: string
  username: string | null
  name: string
  avatar_url: string | null
}

export async function fetchFeed(me: { id: string; name: string }, own: CollectionEntry[], before?: string): Promise<Activity[]> {
  if (isDemo) {
    const following = demoFollowing()
    const mine: Activity[] = own.slice(0, 8).map((e) => ({
      id: `me-${e.id}`,
      createdAt: e.addedAt,
      user: { id: me.id, username: null, name: me.name, avatarUrl: demoAvatar() },
      data: { kind: 'card', id: e.card.id, name: e.card.name, image: e.card.imageUrl, set: e.card.series, variant: e.variant, quantity: e.quantity },
    }))
    const theirs = DEMO_TRAINERS.filter((t) => following.has(t.id)).flatMap(demoActivities)
    return [...mine, ...theirs]
      .filter((a) => !before || a.createdAt < before)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 40)
  }
  const { data, error } = await supabase!.rpc('feed', { p_before: before ?? null, p_limit: 40 })
  if (error) throw failure('Não foi possível carregar o feed.', error.message)
  return ((data ?? []) as FeedRow[]).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    user: { id: r.user_id, username: r.username, name: r.name, avatarUrl: r.avatar_url },
    data: { kind: r.kind, ...r.data } as ActivityData,
  }))
}

// Insígnias e níveis vão para o feed; cartas entram pelo gatilho do banco.
export async function postAchievement(data: Extract<ActivityData, { kind: 'badge' | 'level' }>) {
  if (isDemo) return
  const { kind, ...rest } = data
  await supabase!.from('activities').insert({ kind, data: rest })
}
