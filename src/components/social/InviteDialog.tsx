import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Download, Loader2, Share2, X } from 'lucide-react'
import { renderInvite, type InviteData } from '../../utils/invite'
import { Button } from '../ui/Button'

interface InviteDialogProps {
  open: boolean
  data: InviteData | null
  onClose: () => void
}

// Ícone do WhatsApp (marca registrada não existe no lucide).
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  )
}

export function InviteDialog({ open, data, onClose }: InviteDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [canShareFiles, setCanShareFiles] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // A imagem é gerada ao abrir: o menu de compartilhar do iPhone só abre direto no toque, sem espera.
  useEffect(() => {
    if (!open || !data) return
    let cancelled = false
    let url: string | null = null
    setBlob(null)
    setPreview(null)
    setError(null)
    renderInvite(data).then(
      (b) => {
        if (cancelled) return
        url = URL.createObjectURL(b)
        setBlob(b)
        setPreview(url)
        const file = new File([b], 'convite.jpg', { type: 'image/jpeg' })
        const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
        setCanShareFiles(!!nav.canShare?.({ files: [file] }))
      },
      () => !cancelled && setError('Não deu para gerar a imagem do convite.'),
    )
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [open, data])

  if (!data) return <dialog ref={ref} className="hidden" />

  const text = data.own
    ? `Bora colecionar juntos! Veja minha coleção Pokémon no PokeFlex 👉 ${data.url}`
    : `Olha a coleção Pokémon de ${data.name} no PokeFlex 👉 ${data.url}`
  const fileName = `pokeflex-${data.username}.jpg`

  const shareNative = async () => {
    if (!blob) return
    const file = new File([blob], fileName, { type: 'image/jpeg' })
    try {
      // Texto junto com a imagem: o WhatsApp usa como legenda; o Instagram ignora e fica só a imagem.
      await navigator.share({ files: [file], text, title: 'Convite PokeFlex' })
    } catch {
      // Cancelado pelo usuário.
    }
  }

  const shareLink = async () => {
    try {
      await navigator.share({ text, url: data.url, title: 'PokeFlex' })
    } catch {
      // Cancelado pelo usuário.
    }
  }

  const download = () => {
    if (!preview) return
    const a = document.createElement('a')
    a.href = preview
    a.download = fileName
    a.click()
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      // Sem acesso à área de transferência.
    }
  }

  const hasShare = typeof navigator !== 'undefined' && 'share' in navigator

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(94vw,760px)] overflow-y-auto rounded-3xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-bg/80 backdrop:backdrop-blur-sm"
    >
      <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,260px)_1fr] sm:p-7">
        <div className="mx-auto w-48 sm:w-full">
          <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-line bg-bg shadow-card">
            {preview ? (
              <img src={preview} alt="Prévia do convite com QR code" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-muted">
                {error ? <span className="px-4 text-center text-sm">{error}</span> : <Loader2 size={28} className="animate-spin" aria-label="Gerando convite" />}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label">{data.own ? 'Convite de treinador' : 'Perfil de treinador'}</p>
              <h2 className="mt-1 text-2xl font-bold">Compartilhe com QR code</h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
          <p className="mt-2 text-sm text-muted">
            Quem escanear a Pokébola cai direto no {data.own ? 'seu perfil' : 'perfil'}, mesmo sem conta no PokeFlex.
          </p>

          <div className="mt-5 space-y-2.5">
            {canShareFiles ? (
              <Button className="w-full" onClick={shareNative} disabled={!blob}>
                <Share2 size={16} aria-hidden /> Compartilhar imagem
              </Button>
            ) : (
              hasShare && (
                <Button className="w-full" onClick={shareLink}>
                  <Share2 size={16} aria-hidden /> Compartilhar link
                </Button>
              )
            )}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-[#06281A] transition-colors hover:bg-[#2EE073]"
            >
              <WhatsAppIcon /> Enviar link no WhatsApp
            </a>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="secondary" onClick={download} disabled={!preview}>
                <Download size={16} aria-hidden /> Baixar
              </Button>
              <Button variant="secondary" onClick={copy}>
                {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {copied ? 'Copiado' : 'Copiar link'}
              </Button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-raised/60 p-4 text-xs leading-relaxed text-muted">
            <p>
              <span className="font-semibold text-ink">Instagram:</span> toque em “Compartilhar imagem” e escolha Stories. Lá, adicione o
              adesivo de Link com o seu endereço.
            </p>
            <p className="mt-2">
              <span className="font-semibold text-ink">WhatsApp:</span> pela imagem, o link vai junto na legenda. Para Status, baixe a
              imagem e publique.
            </p>
          </div>
        </div>
      </div>
    </dialog>
  )
}
