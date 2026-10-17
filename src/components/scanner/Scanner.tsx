import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Camera, CheckCircle2, ImageUp, RotateCcw, Search, X } from 'lucide-react'
import type { PokemonCard } from '../../types/pokemon'
import { loadCv, loadIndex, recognize, type ScanResult } from '../../services/scanner'
import { rarityLabel } from '../../utils/pokemon'
import { Button } from '../ui/Button'

type Phase = 'starting' | 'live' | 'nocamera' | 'working' | 'results' | 'error'

interface ScannerProps {
  open: boolean
  onClose: () => void
  onPick: (card: PokemonCard) => void
  onSearch: () => void
}

const MAX_SIDE = 1280
// Moldura-guia: proporção de carta, ocupando ~78% do lado limitante do quadro.
const guideFor = (w: number, h: number) => {
  const gh = Math.min(h * 0.78, ((w * 0.78) / 63) * 88)
  const gw = (gh / 88) * 63
  return { x: (w - gw) / 2, y: (h - gh) / 2, w: gw, h: gh }
}

function toCanvas(source: CanvasImageSource, width: number, height: number) {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

export function Scanner({ open, onClose, onPick, onSearch }: ScannerProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('starting')
  const [step, setStep] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aspect, setAspect] = useState(3 / 4)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    setPhase('starting')
    setResult(null)
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) return setPhase('nocamera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()
      setAspect(video.videoWidth / video.videoHeight || 3 / 4)
      setPhase('live')
    } catch {
      setPhase('nocamera')
    }
  }, [])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // Começa a baixar o motor de visão e o índice enquanto a câmera abre.
      loadCv().catch(() => undefined)
      loadIndex().catch(() => undefined)
      startCamera()
    }
    if (!open && dialog.open) dialog.close()
    if (!open) stopCamera()
  }, [open, startCamera, stopCamera])

  useEffect(() => stopCamera, [stopCamera])

  const run = async (canvas: HTMLCanvasElement) => {
    setPhase('working')
    setError(null)
    try {
      const res = await recognize(canvas, guideFor(canvas.width, canvas.height), setStep)
      setResult(res)
      setPhase('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível reconhecer a carta.')
      setPhase('error')
    }
  }

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = toCanvas(video, video.videoWidth, video.videoHeight)
    stopCamera()
    run(canvas)
  }

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    stopCamera()
    try {
      const bitmap = await createImageBitmap(file)
      const canvas = toCanvas(bitmap, bitmap.width, bitmap.height)
      bitmap.close()
      run(canvas)
    } catch {
      setError('Não deu para abrir essa imagem.')
      setPhase('error')
    }
  }

  const close = () => {
    stopCamera()
    onClose()
  }

  const guide = guideFor(1, 1 / aspect)
  const top = result?.candidates[0]

  return (
    <dialog
      ref={ref}
      onClose={close}
      aria-label="Escanear carta"
      data-fullscreen
      className="m-0 h-full max-h-none w-full max-w-none bg-black p-0 text-white backdrop:bg-black"
    >
      <div className="flex h-full flex-col pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
        <header className="flex items-center justify-between px-4 py-3">
          <h2 className="font-display text-lg font-bold">Escanear carta</h2>
          <button
            onClick={close}
            aria-label="Fechar"
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"
          >
            <X size={20} aria-hidden />
          </button>
        </header>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={upload}
          className="sr-only"
          id="scan-file"
        />

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
          {(phase === 'starting' || phase === 'live') && (
            <div
              className="relative max-h-full w-full max-w-md overflow-hidden rounded-2xl bg-white/5"
              style={{ aspectRatio: aspect }}
            >
              <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
              <div
                aria-hidden
                className="absolute rounded-[4.5%/3.2%] border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                style={{
                  left: `${guide.x * 100}%`,
                  top: `${(guide.y / (1 / aspect)) * 100}%`,
                  width: `${guide.w * 100}%`,
                  height: `${(guide.h / (1 / aspect)) * 100}%`,
                }}
              />
              {phase === 'starting' && (
                <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-white/70">Abrindo a câmera…</p>
              )}
            </div>
          )}

          {phase === 'nocamera' && (
            <div className="max-w-sm text-center">
              <Camera size={36} className="mx-auto text-white/50" aria-hidden />
              <p className="mt-4 font-medium">Não deu para abrir a câmera</p>
              <p className="mt-1 text-sm text-white/60">
                Libere o acesso à câmera no navegador ou envie uma foto da carta tirada antes.
              </p>
            </div>
          )}

          {phase === 'working' && (
            <div className="text-center" aria-live="polite">
              <span
                className="mx-auto block h-12 w-12 animate-spin rounded-full border-4 border-white/15 border-t-primary"
                aria-hidden
              />
              <p className="mt-4 text-sm text-white/80">{step || 'Reconhecendo…'}</p>
              <p className="mt-1 text-xs text-white/50">Na primeira vez baixamos o motor de visão (~10 MB).</p>
            </div>
          )}

          {phase === 'error' && (
            <div className="max-w-sm text-center" role="alert">
              <p className="font-medium">Algo deu errado</p>
              <p className="mt-1 text-sm text-white/60">{error}</p>
            </div>
          )}

          {phase === 'results' && result && (
            <div className="h-full w-full max-w-3xl overflow-y-auto pb-4" aria-live="polite">
              <div className="flex items-center gap-4">
                <img
                  src={result.preview}
                  alt="Recorte da sua foto"
                  className="h-28 w-20 shrink-0 rounded-md object-cover ring-1 ring-white/20"
                />
                <div>
                  {result.confident ? (
                    <p className="flex items-center gap-2 font-display text-xl font-bold text-success">
                      <CheckCircle2 size={22} aria-hidden /> Encontramos!
                    </p>
                  ) : (
                    <p className="font-display text-xl font-bold">Qual destas é a sua carta?</p>
                  )}
                  <p className="mt-1 text-sm text-white/60">
                    {result.detected
                      ? 'Toque na carta certa para adicionar.'
                      : 'Não achamos a borda da carta; usamos a moldura-guia.'}
                  </p>
                </div>
              </div>

              {result.confident && top && (
                <button
                  onClick={() => onPick(top.card)}
                  className="mt-5 flex w-full items-center gap-4 rounded-2xl border border-success/50 bg-success/10 p-3 text-left hover:bg-success/15"
                >
                  <img src={top.card.imageUrl.replace('/high.webp', '/low.webp')} alt="" className="h-36 w-auto rounded-md" />
                  <span>
                    <span className="block font-display text-2xl font-bold">{top.card.name}</span>
                    <span className="block text-sm text-white/70">
                      {top.card.series} · {top.card.number} · {rarityLabel(top.card.rarity)}
                    </span>
                    <span className="mt-3 inline-block rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-bg">
                      Adicionar à coleção
                    </span>
                  </span>
                </button>
              )}

              <h3 className="mb-3 mt-6 text-sm text-white/60">
                {result.confident ? 'Não é essa? Outras parecidas:' : 'Candidatas'}
              </h3>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {result.candidates.slice(result.confident ? 1 : 0, result.confident ? 9 : 12).map((c) => (
                  <li key={c.card.id}>
                    <button onClick={() => onPick(c.card)} className="block w-full text-left">
                      {c.card.imageUrl ? (
                        <img
                          src={c.card.imageUrl.replace('/high.webp', '/low.webp')}
                          alt=""
                          loading="lazy"
                          className="aspect-[63/88] w-full rounded-md object-cover ring-1 ring-white/15 hover:ring-primary"
                        />
                      ) : (
                        <span className="grid aspect-[63/88] w-full place-items-center rounded-md bg-white/5 text-xs">
                          {c.card.name}
                        </span>
                      )}
                      <span className="mt-1 block truncate text-xs">{c.card.name}</span>
                      <span className="block truncate text-[11px] text-white/50">
                        {c.card.series} · {c.card.number.split('/')[0]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {phase === 'live' && (
            <>
              <p className="w-full text-center text-sm text-white/70">
                Encaixe a carta na moldura, sem reflexo, e toque no botão.
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                aria-label="Enviar foto"
                className="grid h-12 w-12 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <ImageUp size={20} aria-hidden />
              </button>
              <button
                onClick={capture}
                aria-label="Tirar foto"
                className="grid h-[72px] w-[72px] place-items-center rounded-full border-4 border-white bg-white/20 transition-transform active:scale-95"
              >
                <span className="h-14 w-14 rounded-full bg-white" />
              </button>
              <span className="h-12 w-12" aria-hidden />
            </>
          )}
          {(phase === 'nocamera' || phase === 'error' || phase === 'results') && (
            <>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                <ImageUp size={16} aria-hidden /> Enviar foto
              </Button>
              {phase !== 'nocamera' && (
                <Button variant="secondary" onClick={startCamera}>
                  <RotateCcw size={16} aria-hidden /> Escanear de novo
                </Button>
              )}
              <Button variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={onSearch}>
                <Search size={16} aria-hidden /> Buscar pelo nome
              </Button>
            </>
          )}
        </footer>
      </div>
    </dialog>
  )
}
