import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Check, Eye, EyeOff, FastForward, Power, Volume2, VolumeX } from 'lucide-react'
import { useAuth, type AuthUser } from '../store/auth'
import { isDemo } from '../lib/supabase'
import { STATS } from '../data/mock'
import { useOwned } from '../store/collection'

// Medidas do vídeo (1280×720). No quadro FREEZE_AT a moldura de login desenhada pelo vídeo
// está completa e parada; o formulário real cobre o interior dela (BOX), escondendo o texto gerado pela IA.
const VIDEO_W = 1280
const VIDEO_H = 720
const FREEZE_AT = 6.85
const AUDIO_TAIL_MS = 2000
const RECOGNIZE_MS = 1300
const BOX = { x: 352, y: 220, w: 582, h: 320 }

const GRANTED_MS = 550
const DIVE_MS = 1300
const FADE_MS = 650

type Phase = 'idle' | 'intro' | 'login' | 'granted' | 'diving' | 'fading'
type Mode = 'entrar' | 'criar'

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

function useStage() {
  const measure = () => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const s = Math.max(vw / VIDEO_W, vh / VIDEO_H)
    const w = VIDEO_W * s
    const h = VIDEO_H * s
    const left = (vw - w) / 2
    const top = (vh - h) / 2
    const box = {
      left: left + BOX.x * s,
      top: top + BOX.y * s,
      right: left + (BOX.x + BOX.w) * s,
      bottom: top + (BOX.y + BOX.h) * s,
    }
    const embedded =
      vw >= 700 && s >= 0.72 && box.left >= 12 && box.right <= vw - 12 && box.top >= 12 && box.bottom + 48 * s <= vh - 12
    return { s, w, h, left, top, embedded }
  }
  const [stage, setStage] = useState(measure)
  useLayoutEffect(() => {
    const onResize = () => setStage(measure())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return stage
}

function PokeballIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="white" />
      <path d="M2 12a10 10 0 0 1 20 0z" fill="#E3350D" />
      <rect x="2" y="11" width="20" height="2" fill="#1a1a1a" />
      <circle cx="12" cy="12" r="3.6" fill="white" stroke="#1a1a1a" strokeWidth="2" />
    </svg>
  )
}

function Corners() {
  const base = 'pointer-events-none absolute h-5 w-5 border-hud'
  return (
    <>
      <span className={`${base} -left-px -top-px rounded-tl-lg border-l-2 border-t-2`} />
      <span className={`${base} -right-px -top-px rounded-tr-lg border-r-2 border-t-2`} />
      <span className={`${base} -bottom-px -left-px rounded-bl-lg border-b-2 border-l-2`} />
      <span className={`${base} -bottom-px -right-px rounded-br-lg border-b-2 border-r-2`} />
    </>
  )
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-hud-ink">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'h-11 w-full rounded-md border border-hud/50 bg-[#2b6283]/45 px-3.5 text-[15px] text-white shadow-[inset_0_0_12px_rgb(var(--hud)/0.12)] placeholder:text-hud-ink/45 transition-colors focus:border-hud focus:bg-[#2b6283]/65 focus:outline-none focus:ring-2 focus:ring-hud/35'

interface LoginFormProps {
  embedded: boolean
  granted: boolean
}

function LoginForm({ embedded, granted }: LoginFormProps) {
  const signIn = useAuth((s) => s.signIn)
  const signUp = useAuth((s) => s.signUp)
  const [mode, setMode] = useState<Mode>('entrar')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'entrar') await signIn(email, password)
      else if ((await signUp(name, email, password)) === 'confirm-email') {
        setNotice(`Enviamos um link de confirmação para ${email.trim()}. Depois de confirmar, entre com sua senha.`)
        setMode('entrar')
        setPassword('')
        setBusy(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar. Tente de novo.')
      setBusy(false)
    }
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
    setNotice(null)
  }

  const modeSwitch = (
    <div className="flex items-center gap-1 text-[13px]" role="tablist" aria-label="Tipo de acesso">
      {(['entrar', 'criar'] as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          onClick={() => switchMode(m)}
          className={`rounded px-2.5 py-1 transition-colors ${
            mode === m ? 'bg-hud/20 text-white' : 'text-hud-ink/60 hover:text-white'
          }`}
        >
          {m === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
      ))}
    </div>
  )

  const passwordField = (
    <Field label="Senha" id="password">
      <div className="relative">
        <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
          placeholder="••••••"
          className={`${inputClass} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
          className="absolute right-0.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded text-hud-ink/80 hover:text-white"
        >
          {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </div>
    </Field>
  )

  const emailField = (
    <Field label="E-mail" id="email">
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        inputMode="email"
        placeholder="voce@email.com"
        autoFocus
        className={inputClass}
      />
    </Field>
  )

  const nameField = (
    <Field label="Nome de treinador" id="name">
      <input
        id="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="nickname"
        placeholder="Ash"
        className={inputClass}
      />
    </Field>
  )

  return (
    <form onSubmit={submit} noValidate className={embedded ? 'flex h-full flex-col' : 'mt-6'}>
      {embedded ? (
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-hud">Acesso do treinador</span>
          {modeSwitch}
        </div>
      ) : (
        <div className="mb-5">{modeSwitch}</div>
      )}

      <div className={embedded && mode === 'criar' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
        {mode === 'criar' && nameField}
        {emailField}
        {embedded && mode === 'criar' && <div className="col-span-2">{passwordField}</div>}
      </div>
      {!(embedded && mode === 'criar') && <div className="mt-3">{passwordField}</div>}

      <button
        type="submit"
        disabled={busy}
        className={`mt-4 flex h-12 w-full shrink-0 items-center justify-center gap-2.5 rounded-md font-display text-[17px] font-semibold text-white transition-[background,filter,transform] active:scale-[0.99] disabled:cursor-wait ${
          granted
            ? 'bg-gradient-to-b from-[#4ade80] to-[#16a34a] shadow-[0_0_28px_-4px_rgba(74,222,128,0.8)]'
            : 'bg-gradient-to-b from-[#ff5a3c] to-[#d2290b] shadow-[0_0_24px_-6px_rgba(255,70,40,0.8)] hover:brightness-110'
        }`}
      >
        {granted ? (
          <>
            <Check size={20} aria-hidden /> Acesso liberado
          </>
        ) : (
          <>
            <span className={busy ? 'animate-spin' : ''}>
              <PokeballIcon />
            </span>
            {busy ? 'Conectando…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
          </>
        )}
      </button>

      <p role="alert" aria-live="assertive" className={`mt-2.5 text-center text-[13px] text-[#ff9b9b] ${error ? '' : 'sr-only'}`}>
        {error}
      </p>
      {notice && !error && (
        <p role="status" className="mt-2.5 text-center text-[13px] text-[#4ade80]">
          {notice}
        </p>
      )}
      {!error && !notice && isDemo && (
        <p className="mt-2.5 text-center font-mono text-[10.5px] text-hud-ink/55">
          Modo demonstração · qualquer e-mail válido e senha com 6+ caracteres
        </p>
      )}
    </form>
  )
}

interface RecognizedProps {
  user: AuthUser
  granted: boolean
  onSwitch: () => void
}

function Recognized({ user, granted, onSwitch }: RecognizedProps) {
  const owned = useOwned()
  const [scan, setScan] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setScan(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="flex h-full flex-col" aria-live="polite">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-hud">Treinador reconhecido</span>
        <span className="flex gap-1.5" aria-hidden>
          <span className={`h-2 w-2 rounded-full ${granted ? 'bg-[#4ade80]' : 'animate-pulse bg-[#ff4d4d]'}`} />
          <span className="h-2 w-2 rounded-full bg-[#ffd60a]" />
          <span className="h-2 w-2 rounded-full bg-[#4ade80]" />
        </span>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-primary font-display text-2xl font-bold text-bg shadow-[0_0_24px_-4px_rgb(var(--hud)/0.6)]">
          {user.name[0]?.toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-2xl font-bold">{user.name}</p>
          <p className="truncate text-sm text-hud-ink/60">{user.email}</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex justify-between font-mono text-[11px] uppercase tracking-[0.18em]">
          <span className={granted ? 'text-[#4ade80]' : 'text-hud'}>
            {granted ? 'Acesso liberado' : 'Verificando credenciais…'}
          </span>
          <span className="text-hud-ink/50">{granted ? '100%' : ''}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-hud/15">
          <div
            className={`h-full rounded-full ${granted ? 'bg-[#4ade80] shadow-[0_0_12px_rgba(74,222,128,0.8)]' : 'bg-hud shadow-[0_0_12px_rgb(var(--hud)/0.8)]'}`}
            style={{ width: scan ? '100%' : '6%', transition: `width ${RECOGNIZE_MS}ms linear, background-color 200ms` }}
          />
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-2">
        {[
          ['Nível', STATS.level],
          ['Cartas', owned.total],
          ['Sequência', `${STATS.streak} dias`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border border-hud/25 bg-hud/10 px-3 py-2">
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-hud-ink/55">{k}</dt>
            <dd className="font-display text-lg font-bold leading-tight">{v}</dd>
          </div>
        ))}
      </dl>

      {!granted && (
        <button
          type="button"
          onClick={onSwitch}
          className="mt-auto self-start text-[13px] text-hud-ink/60 underline-offset-4 hover:text-white hover:underline"
        >
          Não é você? Entrar com outra conta
        </button>
      )}
    </div>
  )
}

interface LoginProps {
  onReveal: () => void
  onDone: () => void
}

export function Login({ onReveal, onDone }: LoginProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const user = useAuth((s) => s.user)
  const signOut = useAuth((s) => s.signOut)
  const stage = useStage()
  const [returning, setReturning] = useState(() => !!useAuth.getState().user)
  const [phase, setPhase] = useState<Phase>(() => (prefersReducedMotion() ? 'login' : 'idle'))
  const [muted, setMuted] = useState(true)
  const [videoFailed, setVideoFailed] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frozen, setFrozen] = useState(false)
  const tailRaf = useRef(0)

  // A imagem fica parada num canvas enquanto o vídeo segue tocando por baixo só pelo áudio.
  const snapshot = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    setFrozen(true)
  }, [])

  const playAudioTail = useCallback((video: HTMLVideoElement) => {
    if (video.muted) return video.pause()
    const volume = video.volume
    const start = performance.now()
    const step = (now: number) => {
      const t = (now - start) / AUDIO_TAIL_MS
      if (t >= 1) {
        video.pause()
        video.volume = volume
        return
      }
      video.volume = volume * (1 - Math.max(0, (t - 0.55) / 0.45))
      tailRaf.current = requestAnimationFrame(step)
    }
    tailRaf.current = requestAnimationFrame(step)
  }, [])

  useEffect(() => () => cancelAnimationFrame(tailRaf.current), [])

  const freeze = useCallback(() => {
    setPhase('login')
    const video = videoRef.current
    if (!video) return
    if (!video.paused && Math.abs(video.currentTime - FREEZE_AT) <= 0.08) {
      snapshot()
      playAudioTail(video)
      return
    }
    video.pause()
    video.currentTime = FREEZE_AT
    video.addEventListener(
      'seeked',
      () => {
        snapshot()
        if (!video.muted)
          video.play().then(
            () => playAudioTail(video),
            () => {},
          )
      },
      { once: true },
    )
  }, [snapshot, playAudioTail])

  // O toque libera o som: navegadores só tocam áudio sozinho depois de uma interação.
  const start = (withSound: boolean) => {
    const video = videoRef.current
    if (!video) return setPhase('login')
    video.muted = !withSound
    setMuted(!withSound)
    setPhase('intro')
    video.play().catch(() => {
      video.muted = true
      setMuted(true)
    })
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (phase === 'login' && video.paused && video.currentTime < FREEZE_AT - 0.1) {
      video.currentTime = FREEZE_AT
      return
    }
    if (phase !== 'intro') return
    let raf = 0
    const watch = () => {
      if (video.currentTime >= FREEZE_AT) return freeze()
      raf = requestAnimationFrame(watch)
    }
    video.play().then(() => (raf = requestAnimationFrame(watch)), freeze)
    return () => cancelAnimationFrame(raf)
  }, [phase, freeze])

  const accessGranted = !!user && phase !== 'idle' && phase !== 'intro'

  useEffect(() => {
    if (!accessGranted) return
    const reduced = prefersReducedMotion()
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    const hold = returning ? RECOGNIZE_MS : 0
    at(hold, () => setPhase('granted'))
    if (!reduced) at(hold + GRANTED_MS, () => setPhase('diving'))
    const revealAt = hold + GRANTED_MS + (reduced ? 0 : DIVE_MS)
    at(revealAt, () => {
      onReveal()
      setPhase('fading')
    })
    at(revealAt + FADE_MS, onDone)
    return () => timers.forEach(clearTimeout)
  }, [accessGranted, returning, onReveal, onDone])

  useEffect(() => {
    if (!user && (phase === 'granted' || phase === 'diving')) setPhase('login')
  }, [user, phase])

  const switchAccount = () => {
    setReturning(false)
    signOut()
  }

  const toggleSound = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }

  const showForm = phase !== 'idle' && phase !== 'intro'
  const diving = phase === 'diving' || phase === 'fading'
  const granted = phase === 'granted' || diving
  const recognized = returning && user
  const { s, embedded } = stage
  const originX = (BOX.x + BOX.w / 2) * s
  const originY = (BOX.y + BOX.h / 2) * s
  const dim = showForm && !embedded ? 'blur-[3px] brightness-50' : ''

  const content = recognized ? (
    <Recognized user={recognized} granted={granted} onSwitch={switchAccount} />
  ) : (
    <LoginForm embedded={embedded} granted={granted} />
  )

  return (
    <div
      className={`fixed inset-0 z-[100] overflow-hidden bg-black transition-opacity ease-out ${
        phase === 'fading' ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div
        className="absolute"
        style={{
          left: stage.left,
          top: stage.top,
          width: stage.w,
          height: stage.h,
          transformOrigin: `${originX}px ${originY}px`,
          transform: diving ? 'scale(6.5)' : 'scale(1)',
          filter: diving ? 'brightness(1.9) saturate(1.3) blur(4px)' : 'brightness(1) saturate(1) blur(0px)',
          transition: `transform ${DIVE_MS}ms cubic-bezier(0.65, 0, 0.9, 0.35), filter ${DIVE_MS}ms ease-in`,
        }}
      >
        <video
          ref={videoRef}
          src="/intro/pokedex.mp4"
          poster="/intro/pokedex-closed.jpg"
          muted
          playsInline
          preload="auto"
          onError={() => {
            setVideoFailed(true)
            setPhase((p) => (p === 'idle' || p === 'intro' ? 'login' : p))
          }}
          aria-hidden
          className={`absolute inset-0 h-full w-full transition-[filter] duration-700 ${dim}`}
        />
        <canvas
          ref={canvasRef}
          aria-hidden
          className={`absolute inset-0 h-full w-full transition-[filter] duration-700 ${frozen ? '' : 'invisible'} ${dim}`}
        />
        {videoFailed && <img src="/intro/pokedex-screen.jpg" alt="" className={`absolute inset-0 h-full w-full ${dim}`} />}

        {showForm && embedded && (
          <section
            aria-label={recognized ? 'Treinador reconhecido' : 'Entrar no PokeFlex'}
            className="hud-panel absolute animate-hud-reveal overflow-hidden rounded-[10px] bg-[#071a28] px-10 py-5 text-white"
            style={{
              left: BOX.x * s,
              top: BOX.y * s,
              width: BOX.w,
              height: BOX.h,
              transform: `scale(${s})`,
              transformOrigin: 'top left',
            }}
          >
            {content}
          </section>
        )}
      </div>

      {showForm && !embedded && (
        <div className={`absolute inset-0 overflow-y-auto transition-opacity duration-500 ${diving ? 'opacity-0' : ''}`}>
          <div className="flex min-h-full items-center justify-center p-4 py-10">
            <section
              aria-labelledby="login-title"
              className="hud-panel relative w-full max-w-[420px] animate-hud-in rounded-2xl border border-hud/50 bg-[#061420]/85 p-6 text-white shadow-[0_0_60px_-10px_rgb(var(--hud)/0.45)] backdrop-blur-md sm:p-8"
            >
              <Corners />
              {recognized ? (
                <>
                  <h1 id="login-title" className="sr-only">
                    Bem-vindo de volta
                  </h1>
                  <div className="min-h-[220px]">{content}</div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-hud">
                    <span>Pokédex · Registro</span>
                    <span className="flex gap-1.5" aria-hidden>
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff4d4d]" />
                      <span className="h-2 w-2 rounded-full bg-[#ffd60a]" />
                      <span className="h-2 w-2 rounded-full bg-[#4ade80]" />
                    </span>
                  </div>
                  <h1 id="login-title" className="mt-5 font-display text-2xl font-bold uppercase tracking-wide">
                    Bem-vindo, treinador!
                  </h1>
                  <p className="mt-1 text-sm text-hud-ink/70">Entre para acessar sua coleção.</p>
                  {content}
                </>
              )}
            </section>
          </div>
        </div>
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgb(var(--hud)/0.85)_0%,rgb(var(--hud)/0.35)_30%,rgb(var(--bg))_75%)] transition-opacity ease-in"
        style={{
          opacity: diving ? 1 : 0,
          transitionDuration: `${DIVE_MS * 0.55}ms`,
          transitionDelay: diving ? `${DIVE_MS * 0.45}ms` : '0ms',
        }}
      />

      {phase === 'idle' && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/50">
          <button
            onClick={() => start(true)}
            autoFocus
            className="group absolute inset-0 flex flex-col items-center justify-end pb-[16vh] text-white outline-none"
          >
            <span className="relative grid h-20 w-20 place-items-center">
              <span
                className="absolute inset-0 animate-ping rounded-full bg-[#ff4d4d]/40 [animation-duration:1.8s]"
                aria-hidden
              />
              <span className="relative grid h-20 w-20 place-items-center rounded-full border-2 border-white/80 bg-[#E3350D] shadow-[0_0_40px_-4px_rgba(227,53,13,0.9)] transition-transform group-hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-hud">
                <Power size={30} aria-hidden />
              </span>
            </span>
            <span className="mt-6 font-display text-xl font-bold tracking-wide sm:text-2xl">Toque para ligar a Pokédex</span>
            <span className="mt-1.5 text-sm text-white/60">
              {returning && user ? `Bem-vindo de volta, ${user.name}` : 'Melhor com o som ligado'}
            </span>
          </button>
          <button
            onClick={() => start(false)}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-sm text-white/55 hover:text-white"
          >
            Entrar sem som
          </button>
        </div>
      )}

      {phase === 'intro' && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4 sm:p-6">
          <button
            onClick={toggleSound}
            aria-label={muted ? 'Ativar som' : 'Desativar som'}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/40 text-white/80 backdrop-blur transition-colors hover:text-white"
          >
            {muted ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
          </button>
          <button
            onClick={freeze}
            className="flex h-11 items-center gap-2 rounded-full border border-white/20 bg-black/40 px-5 text-sm font-medium text-white/90 backdrop-blur transition-colors hover:text-white"
          >
            Pular intro <FastForward size={16} aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}
