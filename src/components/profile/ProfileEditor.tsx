import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Camera, Trash2, X } from 'lucide-react'
import { useAuth } from '../../store/auth'
import { useProfile } from '../../store/profile'
import { Avatar } from './Avatar'
import { Button } from '../ui/Button'

export function ProfileEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const user = useAuth((s) => s.user)!
  const { avatarUrl, uploadAvatar, removeAvatar, rename } = useProfile()
  const [name, setName] = useState(user.name)
  const [busy, setBusy] = useState<'photo' | 'name' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setName(user.name)
      setError(null)
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open, user.name])

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy('photo')
    setError(null)
    try {
      await uploadAvatar(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível trocar a foto.')
    }
    setBusy(null)
  }

  const dropPhoto = async () => {
    setError(null)
    try {
      await removeAvatar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível remover a foto.')
    }
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (name.trim() === user.name) return onClose()
    setBusy('name')
    setError(null)
    try {
      await rename(name)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o nome.')
    }
    setBusy(null)
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(92vw,440px)] rounded-3xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-bg/80 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={save} className="p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <h2 className="text-2xl font-bold">Editar perfil</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="mt-6 flex items-center gap-5">
          <div className="relative">
            <Avatar name={name || user.name} url={avatarUrl} className="h-24 w-24" textClassName="text-4xl" />
            {busy === 'photo' && (
              <span className="absolute inset-0 grid place-items-center rounded-full bg-bg/70 text-xs">Enviando…</span>
            )}
          </div>
          <div className="flex flex-col items-start gap-2">
            <input ref={fileRef} type="file" accept="image/*" onChange={pick} className="sr-only" id="avatar-file" />
            <Button type="button" variant="secondary" size="sm" disabled={busy !== null} onClick={() => fileRef.current?.click()}>
              <Camera size={15} aria-hidden /> {avatarUrl ? 'Trocar foto' : 'Escolher foto'}
            </Button>
            {avatarUrl && (
              <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={dropPhoto}>
                <Trash2 size={15} aria-hidden /> Remover foto
              </Button>
            )}
            <p className="text-xs text-muted">JPG, PNG ou WebP. Recortamos no centro.</p>
          </div>
        </div>

        <label className="mt-6 block">
          <span className="mb-1.5 block text-sm font-medium">Nome de treinador</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoComplete="nickname"
            className="h-11 w-full rounded-xl border border-line bg-bg px-4 focus:border-primary focus:outline-none"
          />
        </label>

        <p role="alert" className={`mt-3 text-sm text-accent ${error ? '' : 'sr-only'}`}>
          {error}
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy !== null}>
            {busy === 'name' ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
