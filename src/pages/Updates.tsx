import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Lightbulb, Sparkles, X } from 'lucide-react'
import { RELEASES, type UpdateAction } from '../data/updates'
import { useUi } from '../store/ui'
import { useUpdates } from '../store/updates'
import { Button } from '../components/ui/Button'

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function Lightbox({ src, alt, onClose }: { src: string | null; alt: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (src && !dialog.open) dialog.showModal()
    if (!src && dialog.open) dialog.close()
  }, [src])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={onClose}
      aria-label={alt}
      className="m-auto max-h-[94vh] w-[min(96vw,1280px)] overflow-hidden rounded-2xl border border-line bg-surface p-0 backdrop:bg-bg/90 backdrop:backdrop-blur-sm"
    >
      {src && <img src={src} alt={alt} className="block h-auto w-full" />}
      <button
        onClick={onClose}
        aria-label="Fechar"
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-bg/80 text-ink hover:bg-bg"
      >
        <X size={18} aria-hidden />
      </button>
    </dialog>
  )
}

export function Updates() {
  const go = useUi((s) => s.go)
  const setScanning = useUi((s) => s.setScanning)
  const markSeen = useUpdates((s) => s.markSeen)
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null)

  useEffect(() => {
    markSeen()
  }, [markSeen])

  const run = (action: UpdateAction) => {
    if (action.scan) setScanning(true)
    else if (action.page) go(action.page)
  }

  return (
    <div className="space-y-10">
      <header>
        <p className="label flex items-center gap-1.5">
          <Sparkles size={13} className="text-primary" aria-hidden /> O que mudou
        </p>
        <h1 className="mt-1 text-3xl font-bold">Novidades</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Cada atualização do PokeFlex aparece aqui, com o que mudou, como usar e alguns detalhes que passam despercebidos.
        </p>
      </header>

      <ol className="relative space-y-14 border-l border-line pl-6 sm:pl-10">
        {RELEASES.map((release, ri) => (
          <li key={release.version} className="relative">
            <span
              aria-hidden
              className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 sm:-left-[47px] ${
                ri === 0 ? 'border-primary bg-primary shadow-[0_0_12px_rgb(var(--primary)/0.7)]' : 'border-line bg-bg'
              }`}
            />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="rounded-md bg-raised px-2 py-0.5 font-mono text-xs text-muted">v{release.version}</span>
              <time dateTime={release.date} className="text-sm text-muted">
                {formatDate(release.date)}
              </time>
              {ri === 0 && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">Nova</span>}
            </div>
            <h2 className="mt-2 text-2xl font-bold">{release.title}</h2>
            <p className="mt-1 max-w-2xl text-muted">{release.intro}</p>

            <div className="mt-6 space-y-6">
              {release.items.map((item, ii) => (
                <article
                  key={item.title}
                  className={`panel grid overflow-hidden ${item.image ? 'lg:grid-cols-[1.25fr_1fr]' : ''}`}
                >
                  {item.image && (
                    <button
                      onClick={() => setZoom({ src: item.image!, alt: item.title })}
                      className={`group relative block overflow-hidden bg-bg ${ii % 2 ? 'lg:order-2' : ''}`}
                      aria-label={`Ampliar print: ${item.title}`}
                    >
                      <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                        className="aspect-[16/10] w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                      <span className="absolute bottom-3 right-3 rounded-md bg-bg/80 px-2 py-1 text-xs text-muted opacity-0 transition-opacity group-hover:opacity-100">
                        Toque para ampliar
                      </span>
                    </button>
                  )}
                  <div className="flex flex-col p-6">
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                    {item.tip && (
                      <p className="mt-4 flex gap-2.5 rounded-xl bg-primary/5 p-3 text-sm leading-relaxed">
                        <Lightbulb size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                        <span>
                          <span className="font-semibold text-primary">Dica: </span>
                          {item.tip}
                        </span>
                      </p>
                    )}
                    {item.action && (
                      <Button variant="secondary" size="sm" className="mt-5 self-start" onClick={() => run(item.action!)}>
                        {item.action.label} <ArrowRight size={14} aria-hidden />
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <Lightbox src={zoom?.src ?? null} alt={zoom?.alt ?? ''} onClose={() => setZoom(null)} />
    </div>
  )
}
