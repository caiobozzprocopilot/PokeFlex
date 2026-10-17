import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { useFx, type Celebration, type Gotcha } from '../../store/fx'
import { tierName } from '../../utils/achievements'
import { setSound, sfx, soundOn } from '../../utils/sound'
import { GymBadge, METAL } from './GymBadge'
import { Pokeball } from './Pokeball'

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const CONFETTI_COLORS = ['#FFD60A', '#FF006E', '#38BDF8', '#4ADE80', '#F97316', '#A855F7', '#FFFFFF']

function Confetti({ count = 46, spread = 260, colors = CONFETTI_COLORS }: { count?: number; spread?: number; colors?: string[] }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4
        const dist = spread * (0.45 + Math.random() * 0.55)
        return {
          dx: `${Math.cos(angle) * dist}px`,
          dy: `${Math.sin(angle) * dist + 60}px`,
          r: `${Math.random() * 720 - 360}deg`,
          t: `${1.1 + Math.random() * 0.9}s`,
          d: `${Math.random() * 0.15}s`,
          color: colors[i % colors.length],
          star: i % 4 === 0,
          size: 6 + Math.random() * 6,
        }
      }),
    [count, spread, colors],
  )
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {parts.map((p, i) =>
        p.star ? (
          <svg
            key={i}
            viewBox="0 0 24 24"
            width={p.size * 1.8}
            height={p.size * 1.8}
            className="confetti"
            style={{ '--dx': p.dx, '--dy': p.dy, '--r': p.r, '--t': p.t, '--d': p.d } as React.CSSProperties}
          >
            <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill={p.color} />
          </svg>
        ) : (
          <span
            key={i}
            className="confetti rounded-[2px]"
            style={
              {
                '--dx': p.dx,
                '--dy': p.dy,
                '--r': p.r,
                '--t': p.t,
                '--d': p.d,
                width: p.size,
                height: p.size * 0.5,
                background: p.color,
              } as React.CSSProperties
            }
          />
        ),
      )}
    </div>
  )
}

// Texto aparecendo letra a letra, como nos jogos.
function useTypewriter(text: string, active: boolean, speed = 28) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!active) return setN(0)
    if (reduced()) return setN(text.length)
    setN(0)
    const t = window.setInterval(() => setN((v) => (v >= text.length ? (window.clearInterval(t), v) : v + 1)), speed)
    return () => window.clearInterval(t)
  }, [text, active, speed])
  return { shown: text.slice(0, n), done: n >= text.length, finish: () => setN(text.length) }
}

type Phase = 'drop' | 'shake' | 'open' | 'reveal'

function CelebrationOverlay({ item, onDone, remaining }: { item: Celebration; onDone: () => void; remaining: number }) {
  const [phase, setPhase] = useState<Phase>(() => (reduced() ? 'reveal' : 'drop'))
  const [sound, setSoundState] = useState(soundOn)
  const isBadge = item.kind === 'badge'
  const metal = isBadge ? METAL[item.tier as 1 | 2 | 3 | 4] : METAL[3]
  const tint = isBadge ? item.badge.color : '#FFD60A'

  useEffect(() => {
    if (reduced()) {
      ;(isBadge ? sfx.badge : sfx.level)()
      return
    }
    const timers = [
      window.setTimeout(() => setPhase('shake'), 600),
      window.setTimeout(sfx.wobble, 850),
      window.setTimeout(sfx.wobble, 1330),
      window.setTimeout(sfx.wobble, 1810),
      window.setTimeout(() => {
        setPhase('open')
        sfx.click()
      }, 2150),
      window.setTimeout(() => {
        setPhase('reveal')
        ;(isBadge ? sfx.badge : sfx.level)()
      }, 2500),
    ]
    return () => timers.forEach(clearTimeout)
  }, [isBadge])

  const text = isBadge
    ? item.tier === 1
      ? `Parabéns! Você conquistou a insígnia ${item.badge.name}!`
      : `Incrível! A insígnia ${item.badge.name} evoluiu para ${tierName(item.tier)}!`
    : `Seu nível de treinador subiu para ${item.level}! Agora você é ${item.title}!`
  const typing = useTypewriter(text, phase === 'reveal')

  const advance = () => {
    if (phase !== 'reveal') return setPhase('reveal')
    if (!typing.done) return typing.finish()
    onDone()
  }

  // <dialog> modal entra na camada do topo: aparece até por cima do detalhe da carta aberto.
  const ref = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.close()
  }, [])

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault()
      advance()
    }
  }

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSound(!sound)
    setSoundState(!sound)
  }

  return (
    <dialog
      ref={ref}
      data-fullscreen
      aria-label={isBadge ? `Insígnia ${item.badge.name} ${tierName(item.tier)}` : `Nível ${item.level}`}
      onCancel={(e) => {
        e.preventDefault()
        advance()
      }}
      onKeyDown={onKey}
      onClick={advance}
      className="m-0 flex h-full max-h-none w-full max-w-none cursor-pointer select-none flex-col items-center justify-center overflow-hidden bg-bg/90 p-0 text-ink backdrop-blur-sm animate-rise backdrop:bg-transparent"
    >
      <button
        onClick={toggleSound}
        aria-label={sound ? 'Desligar sons' : 'Ligar sons'}
        className="absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-full border border-line bg-surface/80 text-muted hover:text-ink"
      >
        {sound ? <Volume2 size={18} aria-hidden /> : <VolumeX size={18} aria-hidden />}
      </button>

      <div className="relative grid h-[340px] w-full max-w-[520px] place-items-center">
        {phase === 'reveal' && (
          <>
            <div aria-hidden className="burst-rays absolute -inset-[60%] opacity-90" style={{ '--ray': `${tint}38` } as React.CSSProperties} />
            <div
              aria-hidden
              className="absolute h-56 w-56 rounded-full blur-3xl"
              style={{ background: `radial-gradient(circle, ${tint}88, transparent 70%)` }}
            />
            <Confetti colors={[metal[0], metal[1], tint, '#FFFFFF', '#FFD60A']} />
          </>
        )}

        {phase !== 'reveal' && (
          <div className={phase === 'drop' ? 'pb-drop' : ''}>
            <div className={phase === 'shake' ? 'pb-shake' : ''}>
              <Pokeball size={120} open={phase === 'open'} blink={phase === 'shake'} />
            </div>
          </div>
        )}
        {phase === 'open' && <div aria-hidden className="flash absolute inset-0 rounded-full bg-white blur-2xl" />}

        {phase === 'reveal' && (
          <div className="relative" style={{ perspective: 800 }}>
            <div className="badge-pop">
              <div className="badge-float">
                {isBadge ? (
                  <GymBadge shape={item.badge.shape} icon={item.badge.icon} color={item.badge.color} tier={item.tier} size={168} />
                ) : (
                  <LevelEmblem level={item.level} size={168} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {phase === 'reveal' && (
        <div className="pop-in mt-2 text-center">
          <p className="label" style={{ color: metal[1] }}>
            {isBadge ? (item.tier === 1 ? 'Nova insígnia' : 'Insígnia evoluiu') : 'Subiu de nível'}
          </p>
          <p className="mt-1 font-display text-3xl font-bold">
            {isBadge ? item.badge.name : `Nível ${item.level}`}
          </p>
          {isBadge && (
            <span
              className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-bg"
              style={{ background: `linear-gradient(135deg, ${metal[0]}, ${metal[1]})` }}
            >
              {tierName(item.tier)}
            </span>
          )}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {phase === 'reveal' && (
          <div className="pop-in relative mx-auto max-w-[620px] rounded-xl border-4 border-[#30304A] bg-[#F8F8F8] p-1 shadow-2xl">
            <div className="rounded-md border-2 border-[#5A5A7A] px-4 py-4 sm:px-5">
              <p className="min-h-[3.6em] font-pixel text-[11px] leading-[1.9] text-[#202030] sm:text-[13px]">{typing.shown}</p>
              <div className="mt-1 flex items-center justify-end gap-2 font-pixel text-[9px] text-[#606080]">
                {typing.done && (
                  <>
                    {remaining > 0 ? `+${remaining}` : ''}
                    <span className="dialog-arrow text-[#E3350D]">▼</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        {phase !== 'reveal' && <p className="text-center text-sm text-muted">Toque para pular</p>}
      </div>
    </dialog>
  )
}

export function LevelEmblem({ level, size = 64 }: { level: number; size?: number }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: 'conic-gradient(from 210deg, #FFF4B0, #FFC93C, #B7790A, #FFC93C, #FFF4B0)',
        boxShadow: `0 ${size * 0.06}px ${size * 0.25}px -${size * 0.05}px rgb(255 201 60 / 0.6)`,
      }}
    >
      <span
        className="grid place-items-center rounded-full bg-gradient-to-b from-[#E3350D] to-[#8E1B05] text-white"
        style={{ width: size * 0.78, height: size * 0.78, boxShadow: 'inset 0 -3px 0 rgb(0 0 0 / 0.25), inset 0 3px 0 rgb(255 255 255 / 0.25)' }}
      >
        <span className="flex flex-col items-center leading-none">
          <span className="font-pixel" style={{ fontSize: size * 0.11 }}>
            NV
          </span>
          <span className="font-display font-extrabold" style={{ fontSize: size * 0.36, marginTop: size * 0.02 }}>
            {level}
          </span>
        </span>
      </span>
    </span>
  )
}

function GotchaToast({ gotcha, onClose }: { gotcha: Gotcha; onClose: () => void }) {
  const [caught, setCaught] = useState(reduced)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const timers: number[] = []
    if (!reduced()) {
      timers.push(window.setTimeout(sfx.wobble, 250), window.setTimeout(sfx.wobble, 730), window.setTimeout(sfx.wobble, 1210))
      timers.push(
        window.setTimeout(() => {
          setCaught(true)
          sfx.click()
          window.setTimeout(sfx.catch, 120)
        }, 1500),
      )
    } else sfx.catch()
    timers.push(window.setTimeout(() => setLeaving(true), 4200), window.setTimeout(onClose, 4460))
    return () => timers.forEach(clearTimeout)
  }, [onClose])

  // Popover também vai para a camada do topo, acima de um <dialog> aberto.
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current as (HTMLDivElement & { showPopover?: () => void; hidePopover?: () => void }) | null
    if (!el?.showPopover) return
    el.setAttribute('popover', 'manual')
    el.showPopover()
    return () => el.hidePopover?.()
  }, [])

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] top-auto z-[80] m-0 flex h-auto w-auto justify-center overflow-visible border-0 bg-transparent p-0 px-4 lg:bottom-8"
    >
      <button
        onClick={onClose}
        role="status"
        className={`pointer-events-auto relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-2xl border border-line bg-surface/95 p-3 pr-4 text-left shadow-2xl backdrop-blur-md ${
          leaving ? 'pop-out' : 'pop-in'
        }`}
      >
        <span className="relative grid h-14 w-14 shrink-0 place-items-center">
          <span className={caught ? '' : 'pb-shake'}>
            <Pokeball size={44} blink={!caught} />
          </span>
          {caught && <Confetti count={10} spread={46} colors={['#FFD60A', '#FFFFFF', '#38BDF8']} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-pixel text-[11px] leading-relaxed text-primary">{caught ? 'Gotcha!' : '...'}</span>
          <span className="mt-0.5 block truncate text-sm">
            {caught ? (
              <>
                <span className="font-semibold">{gotcha.card.name}</span> entrou na coleção
              </>
            ) : (
              'Capturando…'
            )}
          </span>
          {caught && gotcha.newEntry && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
              Novo registro na Pokédex!
            </span>
          )}
        </span>
        {gotcha.card.imageUrl && (
          <img
            src={gotcha.card.imageUrl}
            alt=""
            className={`h-16 w-auto shrink-0 rounded-[4px] shadow-lg transition-all duration-500 ${caught ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
          />
        )}
      </button>
    </div>
  )
}

export function Celebrations() {
  const queue = useFx((s) => s.queue)
  const next = useFx((s) => s.next)
  const gotcha = useFx((s) => s.gotcha)
  const clearGotcha = useFx((s) => s.clearGotcha)
  const current = queue[0]
  // A comemoração espera o "Gotcha!" terminar para não brigarem pela atenção.
  const [ready, setReady] = useState(true)

  useEffect(() => {
    if (!gotcha) return setReady(true)
    setReady(false)
  }, [gotcha])

  const closeGotcha = useMemo(() => (gotcha ? () => clearGotcha(gotcha.key) : () => {}), [gotcha, clearGotcha])

  return (
    <>
      {gotcha && <GotchaToast key={gotcha.key} gotcha={gotcha} onClose={closeGotcha} />}
      {current && ready && <CelebrationOverlay key={current.key} item={current} remaining={queue.length - 1} onDone={next} />}
    </>
  )
}
