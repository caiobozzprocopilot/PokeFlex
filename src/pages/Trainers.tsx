import { useEffect, useMemo, useState } from 'react'
import { CloudOff, Globe2, Repeat2, Search, Users } from 'lucide-react'
import { useTradeAlerts } from '../store/trades'
import { TradesPanel } from '../components/social/Trades'
import { useAuth } from '../store/auth'
import { useCollection } from '../store/collection'
import { useSocial } from '../store/social'
import { useUi } from '../store/ui'
import { useResource } from '../hooks/useResource'
import { fetchFeed, searchTrainers } from '../services/social'
import { Button } from '../components/ui/Button'
import { FeedItem, groupFeed, TrainerRow } from '../components/social/SocialBits'
import { PokeballDeco } from '../components/gamification/TrainerCard'

export function Trainers() {
  const user = useAuth((s) => s.user)!
  const entries = useCollection((s) => s.entries)
  const settings = useSocial((s) => s.settings)
  const loaded = useSocial((s) => s.loaded)
  const go = useUi((s) => s.go)
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  // Muda quando você segue alguém, para o feed buscar as novidades dessa pessoa.
  const [version, setVersion] = useState(0)
  const [tab, setTab] = useState<'atividade' | 'trocas'>(() => (window.location.hash.includes('aba=trocas') ? 'trocas' : 'atividade'))
  const alerts = useTradeAlerts()

  const selectTab = (next: 'atividade' | 'trocas') => {
    setTab(next)
    history.replaceState(null, '', next === 'trocas' ? '#/treinadores?aba=trocas' : '#/treinadores')
  }

  useEffect(() => {
    const t = setTimeout(() => setQuery(draft.trim()), 350)
    return () => clearTimeout(t)
  }, [draft])

  const trainers = useResource(`trainers:${query}:${version}`, () => searchTrainers(query))
  const feed = useResource(`feed:${user.id}:${version}:${entries.length}`, () => fetchFeed(user, entries))
  const groups = useMemo(() => groupFeed(feed.data ?? []), [feed.data])
  const others = (trainers.data ?? []).filter((t) => t.id !== user.id)

  const openSettings = () => {
    go('perfil')
    window.setTimeout(() => document.getElementById('perfil-publico')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
  }

  return (
    <div className="space-y-6">
      <header className="panel relative overflow-hidden p-6 sm:p-8">
        <PokeballDeco className="-right-16 -top-20 h-64 w-64 text-white/[0.04]" />
        <p className="label">Comunidade</p>
        <h1 className="mt-1 text-3xl font-bold">Treinadores</h1>
        <p className="mt-2 max-w-xl text-muted">
          Siga outros colecionadores, veja o que eles estão capturando e visite as coleções e insígnias de cada um.
        </p>
        {loaded && !settings.isPublic && (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
            <Globe2 size={22} className="shrink-0 text-primary" aria-hidden />
            <p className="flex-1 text-sm">
              Seu perfil está <span className="font-semibold">privado</span>. Deixe-o público para outros treinadores te encontrarem e te seguirem.
            </p>
            <Button size="sm" onClick={openSettings}>
              Criar perfil público
            </Button>
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-4 flex w-fit rounded-xl border border-line bg-surface p-1" role="tablist" aria-label="Social">
            {(
              [
                ['atividade', 'Atividade', Users],
                ['trocas', 'Trocas', Repeat2],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => selectTab(id)}
                className={`flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors ${
                  tab === id ? 'bg-raised text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon size={16} aria-hidden /> {label}
                {id === 'trocas' && alerts > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 font-mono text-[11px] font-semibold text-white">
                    {alerts}
                  </span>
                )}
              </button>
            ))}
          </div>
          {tab === 'trocas' ? (
            <TradesPanel />
          ) : feed.error ? (
            <div className="panel flex flex-col items-center px-6 py-12 text-center">
              <CloudOff size={28} className="text-muted" aria-hidden />
              <p className="mt-3 text-sm text-muted">{feed.error}</p>
              <button onClick={feed.retry} className="mt-4 text-sm text-primary hover:underline">
                Tentar de novo
              </button>
            </div>
          ) : feed.loading ? (
            <ul className="space-y-3" aria-hidden>
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="panel h-28 animate-pulse" />
              ))}
            </ul>
          ) : groups.length === 0 ? (
            <div className="panel flex flex-col items-center px-6 py-12 text-center">
              <Users size={28} className="text-muted" aria-hidden />
              <p className="mt-3 font-medium">Nada por aqui ainda</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Siga treinadores ao lado. As cartas que eles capturam e as insígnias que conquistam aparecem aqui.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {groups.map((g) => (
                <FeedItem key={g.key} group={g} meId={user.id} />
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <label className="relative block">
            <span className="sr-only">Buscar treinador</span>
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Buscar por nome ou @usuário"
              className="h-11 w-full rounded-xl border border-line bg-surface pl-11 pr-4 text-sm placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </label>
          <section className="panel p-3" aria-labelledby="trainers-title">
            <h2 id="trainers-title" className="label px-2.5 pb-1 pt-1.5">
              {query ? 'Resultados' : 'Treinadores para seguir'}
            </h2>
            {trainers.error ? (
              <p className="px-2.5 py-4 text-sm text-muted">{trainers.error}</p>
            ) : trainers.loading ? (
              <ul className="space-y-1" aria-hidden>
                {Array.from({ length: 3 }, (_, i) => (
                  <li key={i} className="h-14 animate-pulse rounded-2xl bg-raised/60" />
                ))}
              </ul>
            ) : others.length === 0 ? (
              <p className="px-2.5 py-4 text-sm text-muted">
                {query ? `Ninguém encontrado com “${query}”.` : 'Ainda não há outros perfis públicos. Convide seus amigos!'}
              </p>
            ) : (
              <ul>
                {others.map((t) => (
                  <TrainerRow key={t.id} trainer={t} onFollowChange={() => window.setTimeout(() => setVersion((v) => v + 1), 400)} />
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
