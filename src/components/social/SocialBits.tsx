import { useState } from 'react'
import { Check, UserPlus } from 'lucide-react'
import { useAuth } from '../../store/auth'
import { useUi } from '../../store/ui'
import { setFollowing, type Activity, type TrainerSummary } from '../../services/social'
import { BADGES_BY_ID, tierName, type Tier } from '../../utils/achievements'
import { Avatar } from '../profile/Avatar'
import { GymBadge } from '../gamification/GymBadge'
import { LevelEmblem } from '../gamification/Celebrations'

interface FollowButtonProps {
  targetId: string
  following: boolean
  onChange?: (following: boolean) => void
  size?: 'sm' | 'md'
}

// Seguir com resposta imediata; se o servidor recusar, volta ao estado anterior.
export function FollowButton({ targetId, following, onChange, size = 'md' }: FollowButtonProps) {
  const user = useAuth((s) => s.user)
  const go = useUi((s) => s.go)
  const [state, setState] = useState(following)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user?.id === targetId) return null

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return go('inicio')
    const next = !state
    setState(next)
    onChange?.(next)
    setBusy(true)
    setError(null)
    try {
      await setFollowing(targetId, next)
    } catch (err) {
      setState(!next)
      onChange?.(!next)
      setError(err instanceof Error ? err.message : 'Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  const h = size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm'
  return (
    <span className="inline-flex flex-col items-end">
      <button
        onClick={toggle}
        disabled={busy}
        aria-pressed={state}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl font-semibold transition-colors ${h} ${
          state ? 'border border-line bg-raised text-ink hover:border-accent/50 hover:text-accent' : 'bg-primary text-bg hover:bg-primary/90'
        }`}
      >
        {state ? <Check size={14} aria-hidden /> : <UserPlus size={14} aria-hidden />}
        {state ? 'Seguindo' : user ? 'Seguir' : 'Entrar para seguir'}
      </button>
      {error && (
        <span role="alert" className="mt-1 text-xs text-accent">
          {error}
        </span>
      )}
    </span>
  )
}

export function TrainerRow({ trainer, onFollowChange }: { trainer: TrainerSummary; onFollowChange?: (following: boolean) => void }) {
  const openTrainer = useUi((s) => s.openTrainer)
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => openTrainer(trainer.username)}
        onKeyDown={(e) => e.key === 'Enter' && openTrainer(trainer.username)}
        className="flex cursor-pointer items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-raised/70"
      >
        <Avatar name={trainer.name} url={trainer.avatarUrl} className="h-11 w-11" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{trainer.name}</span>
          <span className="block truncate text-xs text-muted">
            @{trainer.username} · {trainer.cards} {trainer.cards === 1 ? 'carta' : 'cartas'}
          </span>
        </span>
        <FollowButton targetId={trainer.id} following={trainer.isFollowing} onChange={onFollowChange} size="sm" />
      </div>
    </li>
  )
}

const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

export function timeAgo(iso: string) {
  const s = (new Date(iso).getTime() - Date.now()) / 1000
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, secs] of steps) if (Math.abs(s) >= secs) return rtf.format(Math.round(s / secs), unit)
  return 'agora'
}

// Cartas seguidas do mesmo treinador viram um item só: "capturou 5 cartas".
export type FeedGroup = { key: string; items: Activity[] }

const GROUP_WINDOW = 3 * 60 * 60 * 1000

export function groupFeed(list: Activity[]): FeedGroup[] {
  const groups: FeedGroup[] = []
  for (const a of list) {
    const last = groups[groups.length - 1]
    const head = last?.items[0]
    if (
      head &&
      a.data.kind === 'card' &&
      head.data.kind === 'card' &&
      head.user.id === a.user.id &&
      new Date(last.items[last.items.length - 1].createdAt).getTime() - new Date(a.createdAt).getTime() < GROUP_WINDOW
    ) {
      last.items.push(a)
    } else groups.push({ key: a.id, items: [a] })
  }
  return groups
}

export function FeedItem({ group, meId }: { group: FeedGroup; meId?: string }) {
  const openTrainer = useUi((s) => s.openTrainer)
  const go = useUi((s) => s.go)
  const first = group.items[0]
  const { user, data } = first
  const me = user.id === meId
  const who = me ? 'Você' : user.name
  const openUser = () => (me ? go('perfil') : user.username && openTrainer(user.username))

  let action: React.ReactNode
  let visual: React.ReactNode = null
  if (data.kind === 'card') {
    const count = group.items.length
    action =
      count === 1 ? (
        <>
          capturou <span className="font-semibold text-ink">{data.name}</span>
          {data.set && <span className="text-muted"> · {data.set}</span>}
        </>
      ) : (
        <>
          capturou <span className="font-semibold text-ink">{count} cartas</span>
        </>
      )
    visual = (
      <span className="flex -space-x-6">
        {group.items.slice(0, 5).map((a, i) =>
          a.data.kind === 'card' && a.data.image ? (
            <img
              key={a.id}
              src={`${a.data.image}`}
              alt={a.data.name}
              loading="lazy"
              className="h-20 w-auto rounded-[4px] shadow-lg ring-2 ring-surface transition-transform hover:-translate-y-1"
              style={{ zIndex: 10 - i, transform: `rotate(${(i - (Math.min(group.items.length, 5) - 1) / 2) * 5}deg)` }}
            />
          ) : null,
        )}
      </span>
    )
  } else if (data.kind === 'badge') {
    const def = BADGES_BY_ID[data.id]
    action = (
      <>
        conquistou a insígnia <span className="font-semibold text-ink">{data.name}</span>
        <span className="text-muted"> · {tierName(data.tier as Tier)}</span>
      </>
    )
    if (def) visual = <GymBadge shape={def.shape} icon={def.icon} color={def.color} tier={data.tier as Tier} size={56} />
  } else {
    action = (
      <>
        subiu para o <span className="font-semibold text-ink">nível {data.level}</span>
        <span className="text-muted"> · {data.title}</span>
      </>
    )
    visual = <LevelEmblem level={data.level} size={56} />
  }

  return (
    <li className="panel flex gap-3 p-4">
      <button onClick={openUser} className="shrink-0 self-start rounded-full" aria-label={`Abrir perfil de ${user.name}`}>
        <Avatar name={user.name} url={user.avatarUrl} className="h-10 w-10" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">
          <button onClick={openUser} className="font-semibold text-ink hover:text-primary">
            {who}
          </button>{' '}
          {action}
        </p>
        <p className="mt-0.5 text-xs text-muted">{timeAgo(first.createdAt)}</p>
        {visual && <div className="mt-3">{visual}</div>}
      </div>
    </li>
  )
}
