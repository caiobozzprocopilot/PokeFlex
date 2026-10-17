import { useEffect, useState } from 'react'
import { Check, Flame, Snowflake, Sparkles, Trophy } from 'lucide-react'
import { useMascot } from '../../store/mascot'
import { activeToday, DAILY_BONUS_XP, displayState, hourSP, MAX_CRYSTALS, MISSIONS, stageOf, type MissionDef } from '../../utils/mascot'
import { Fagulin } from './Fagulin'

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <span className="block h-2 overflow-hidden rounded-full bg-bg">
      <span className="xp-fill block h-full rounded-full" style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%`, background: color }} />
    </span>
  )
}

function MissionRow({ mission, progress, done }: { mission: MissionDef; progress: number; done: boolean }) {
  return (
    <li className={`rounded-xl border p-3 ${done ? 'border-success/30 bg-success/5' : 'border-line bg-raised/40'}`}>
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md ${done ? 'bg-success text-bg' : 'border border-line'}`}>
          {done && <Check size={13} strokeWidth={3} aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={`truncate text-sm font-medium ${done ? 'text-muted line-through' : ''}`}>{mission.title}</span>
            <span className="shrink-0 font-mono text-xs text-primary">+{mission.xp} XP</span>
          </span>
          <span className="block text-xs text-muted">{mission.detail}</span>
          {!done && mission.target > 1 && (
            <span className="mt-2 flex items-center gap-2">
              <span className="flex-1">
                <Bar value={progress} max={mission.target} color="rgb(var(--primary))" />
              </span>
              <span className="font-mono text-[11px] text-muted">
                {progress}/{mission.target}
              </span>
            </span>
          )}
        </span>
      </div>
    </li>
  )
}

const hoursLeft = () => Math.max(1, 24 - hourSP())

export function MascotCard() {
  const status = useMascot((s) => s.status)
  const error = useMascot((s) => s.error)
  // Atualiza o "em risco" quando vira 20h com a página aberta.
  const [, tick] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 5 * 60 * 1000)
    return () => window.clearInterval(t)
  }, [])

  if (error || !status) return null

  const look = displayState(status)
  const today = activeToday(status)
  const stage = stageOf(status.stage)
  const next = status.stage < 12 ? stageOf(status.stage + 1) : null
  const daily = MISSIONS.filter((m) => m.period === 'daily')
  const weekly = MISSIONS.filter((m) => m.period === 'weekly')
  const mission = (id: string) => status.missions[id] ?? { progress: 0, completed: false }

  const message =
    look === 'dimmed'
      ? { tone: 'text-muted bg-raised', text: `A chama apagou. Volte 3 dias seguidos para reacender o Fagulin (${status.relightProgress}/3).` }
      : look === 'frozen'
        ? { tone: 'text-[#67E8F9] bg-[#67E8F9]/10', text: 'Um Cristal de Gelo protegeu seu streak ontem. Faça algo hoje para seguir!' }
        : look === 'at_risk'
          ? { tone: 'text-accent bg-accent/10', text: `Sua chama está fraca! Faltam ${hoursLeft()}h para a meia-noite: registre uma carta, escaneie ou mexa nos desejos.` }
          : today
            ? { tone: 'text-success bg-success/10', text: 'Chama acesa hoje! Volte amanhã para o streak crescer.' }
            : { tone: 'text-primary bg-primary/10', text: 'Registre uma carta, escaneie ou mexa nos desejos hoje para manter a chama acesa.' }

  return (
    <section id="fagulin" className="panel relative scroll-mt-24 overflow-hidden" aria-label="Fagulin, seu mascote de streaks">
      <div className="grid lg:grid-cols-[300px_1fr]">
        <div className="relative flex flex-col items-center justify-center bg-gradient-to-b from-[#2A1408] via-surface to-surface px-6 pb-6 pt-8 lg:bg-gradient-to-br">
          <Fagulin stage={status.stage} look={look} size={250} />
          <p className="mt-2 font-pixel text-[10px] text-primary/80">Estágio {status.stage}/12</p>
          <h2 className="mt-1 font-display text-2xl font-bold">{stage.name}</h2>
          <p className="mt-1 max-w-[240px] text-center text-xs text-muted">{stage.line}</p>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-3">
              <span className={`grid h-14 w-14 place-items-center rounded-2xl ${today ? 'bg-[#FF7A1C]/15 text-[#FF7A1C]' : 'bg-raised text-muted'}`}>
                <Flame size={30} fill={today ? 'currentColor' : 'none'} aria-hidden />
              </span>
              <div>
                <p className="font-display text-3xl font-extrabold leading-none">
                  {status.currentStreak} <span className="text-lg font-bold text-muted">{status.currentStreak === 1 ? 'dia' : 'dias'}</span>
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                  <Trophy size={12} aria-hidden /> melhor: {status.bestStreak} {status.bestStreak === 1 ? 'dia' : 'dias'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2" title="Cristais de Gelo protegem o streak num dia sem atividade">
              {Array.from({ length: MAX_CRYSTALS }, (_, i) => (
                <span
                  key={i}
                  className={`grid h-9 w-9 place-items-center rounded-xl ${i < status.freezeCrystals ? 'bg-[#67E8F9]/15 text-[#67E8F9]' : 'border border-dashed border-line text-muted/40'}`}
                >
                  <Snowflake size={18} aria-hidden />
                </span>
              ))}
              <span className="text-xs text-muted">
                {status.freezeCrystals} {status.freezeCrystals === 1 ? 'cristal' : 'cristais'}
              </span>
            </div>
            <div className="ml-auto text-right">
              <p className="font-mono text-sm">{status.xp.toLocaleString('pt-BR')} XP</p>
              <p className="text-xs text-muted">do Fagulin</p>
            </div>
          </div>

          <p className={`rounded-xl px-4 py-2.5 text-sm ${message.tone}`}>{message.text}</p>

          {next ? (
            <div>
              <p className="flex items-center gap-1.5 text-sm">
                <Sparkles size={14} className="text-primary" aria-hidden /> Próxima forma: <span className="font-semibold">{next.name}</span>
              </p>
              <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 flex justify-between text-xs text-muted">
                    <span>Maior streak</span>
                    <span className="font-mono">
                      {Math.min(status.bestStreak, next.streak)}/{next.streak} dias
                    </span>
                  </p>
                  <Bar value={status.bestStreak} max={next.streak} color="#FF7A1C" />
                </div>
                <div>
                  <p className="mb-1 flex justify-between text-xs text-muted">
                    <span>XP</span>
                    <span className="font-mono">
                      {Math.min(status.xp, next.xp).toLocaleString('pt-BR')}/{next.xp.toLocaleString('pt-BR')}
                    </span>
                  </p>
                  <Bar value={status.xp} max={next.xp} color="rgb(var(--primary))" />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-primary">Forma final alcançada. O Fagulin Eterno é uma lenda!</p>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="label mb-2">Missões do dia</p>
              <ul className="space-y-2">
                {daily.map((m) => (
                  <MissionRow key={m.id} mission={m} progress={mission(m.id).progress} done={mission(m.id).completed} />
                ))}
              </ul>
              <p className={`mt-2 text-xs ${status.missions.daily_bonus?.completed ? 'text-success' : 'text-muted'}`}>
                {status.missions.daily_bonus?.completed ? '✓ ' : ''}Bônus: as duas do dia valem +{DAILY_BONUS_XP} XP
              </p>
            </div>
            <div>
              <p className="label mb-2">Missões da semana</p>
              <ul className="space-y-2">
                {weekly.map((m) => (
                  <MissionRow key={m.id} mission={m} progress={mission(m.id).progress} done={mission(m.id).completed} />
                ))}
              </ul>
              <p className={`mt-2 text-xs ${status.missions.weekly_bonus?.completed ? 'text-success' : 'text-muted'}`}>
                {status.missions.weekly_bonus?.completed ? '✓ ' : ''}Bônus: as três da semana valem 1 Cristal de Gelo
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Selo do streak no topo: chama acesa quando já houve atividade hoje.
export function StreakChip({ onClick }: { onClick: () => void }) {
  const status = useMascot((s) => s.status)
  if (!status) return null
  const look = displayState(status)
  const lit = activeToday(status)
  return (
    <button
      onClick={onClick}
      aria-label={`Streak de ${status.currentStreak} dias${lit ? ', chama acesa hoje' : ', sem atividade hoje'}`}
      title="Seu streak com o Fagulin"
      className={`flex h-9 items-center gap-1 rounded-full px-2.5 font-mono text-sm font-semibold transition-colors hover:bg-raised ${
        look === 'at_risk' ? 'animate-pulse text-accent' : lit ? 'text-[#FF7A1C]' : 'text-muted'
      }`}
    >
      <Flame size={18} fill={lit ? 'currentColor' : 'none'} aria-hidden />
      {status.currentStreak}
    </button>
  )
}
