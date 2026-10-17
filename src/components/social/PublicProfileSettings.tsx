import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, Copy, Eye, Globe2, Lock, QrCode } from 'lucide-react'
import { useProfile } from '../../store/profile'
import { useOwned } from '../../store/collection'
import { useShowcases } from '../../store/showcases'
import { useTrainer } from '../../hooks/useTrainer'
import { pickInviteCards, type InviteData } from '../../utils/invite'
import { InviteDialog } from './InviteDialog'
import { useAuth } from '../../store/auth'
import { useSocial } from '../../store/social'
import { useUi } from '../../store/ui'
import { profileLink, USERNAME_RE } from '../../services/social'
import { Button } from '../ui/Button'

// Sugestão de @usuário a partir do nome: "Ash Ketchum" vira "ash_ketchum".
const suggest = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20)

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-raised ring-1 ring-line'}`}
      >
        <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  )
}

export function PublicProfileSettings() {
  const user = useAuth((s) => s.user)!
  const settings = useSocial((s) => s.settings)
  const loaded = useSocial((s) => s.loaded)
  const save = useSocial((s) => s.save)
  const openTrainer = useUi((s) => s.openTrainer)

  const [isPublic, setIsPublic] = useState(settings.isPublic)
  const [username, setUsername] = useState(settings.username ?? '')
  const [bio, setBio] = useState(settings.bio)
  const [showValue, setShowValue] = useState(settings.showValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!loaded) return
    setIsPublic(settings.isPublic)
    setUsername(settings.username ?? suggest(user.name))
    setBio(settings.bio)
    setShowValue(settings.showValue)
  }, [loaded, settings, user.name])

  const handle = username.trim().toLowerCase()
  const validHandle = USERNAME_RE.test(handle)
  const dirty =
    isPublic !== settings.isPublic || handle !== (settings.username ?? '') || bio.trim() !== settings.bio || showValue !== settings.showValue

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await save(user.id, { ...settings, username: handle || null, isPublic, showValue, bio })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  const copy = async () => {
    if (!settings.username) return
    try {
      await navigator.clipboard.writeText(profileLink(settings.username))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      // Sem acesso à área de transferência: o link continua visível para copiar à mão.
    }
  }

  const live = settings.isPublic && settings.username

  const [inviting, setInviting] = useState(false)
  const avatarUrl = useProfile((s) => s.avatarUrl)
  const owned = useOwned()
  const featured = useShowcases((s) => s.items.find((x) => x.featured))
  const { badges, level } = useTrainer()
  const invite = useMemo<InviteData | null>(
    () =>
      settings.username
        ? {
            url: profileLink(settings.username),
            name: user.name,
            username: settings.username,
            avatarUrl,
            level: level.level,
            title: level.title,
            cards: owned.total,
            pokedex: badges.find((b) => b.id === 'pokedex')?.value ?? 0,
            badges: badges.filter((b) => b.tier > 0).length,
            cardImages: pickInviteCards(owned.cards, featured?.cardIds),
            own: true,
          }
        : null,
    [settings.username, user.name, avatarUrl, level, owned, badges, featured],
  )

  return (
    <section id="perfil-publico" className="panel scroll-mt-24 p-5 sm:p-6" aria-labelledby="public-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="public-title" className="flex items-center gap-2 text-lg font-semibold">
            {live ? <Globe2 size={18} className="text-success" aria-hidden /> : <Lock size={18} className="text-muted" aria-hidden />}
            Perfil público
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Visitantes veem nome, foto, bio, cartas, vitrines, insígnias e nível. Nunca veem seu e-mail, quanto você pagou nem sua lista de desejos.
          </p>
        </div>
        {live && (
          <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">No ar</span>
        )}
      </div>

      <form onSubmit={submit} className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="space-y-5">
          <Toggle
            checked={isPublic}
            onChange={setIsPublic}
            label="Deixar meu perfil público"
            hint="Outros treinadores podem te encontrar, seguir e visitar sua coleção."
          />
          <Toggle
            checked={showValue}
            onChange={setShowValue}
            label="Mostrar o valor da coleção"
            hint="Desligado, o total em reais e a insígnia Tesouro ficam ocultos."
          />
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Nome de usuário</span>
            <span className="relative mt-1.5 block">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-muted">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
                placeholder="ash_ketchum"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="h-11 w-full rounded-xl border border-line bg-bg pl-8 pr-4 font-mono text-sm focus:border-primary focus:outline-none"
              />
            </span>
            <span className={`mt-1 block text-xs ${handle && !validHandle ? 'text-accent' : 'text-muted'}`}>
              {handle && !validHandle ? 'Use de 3 a 20 caracteres: letras minúsculas, números ou _.' : `Seu link: ${profileLink(handle || 'seu_nome')}`}
            </span>
          </label>
          <label className="block">
            <span className="flex justify-between text-sm font-medium">
              Bio <span className="font-mono text-xs font-normal text-muted">{bio.length}/160</span>
            </span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              rows={2}
              placeholder="Ex.: Caçador de Charizard desde 1999."
              className="mt-1.5 w-full resize-none rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-accent/10 px-4 py-2 text-sm text-accent md:col-span-2">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 md:col-span-2">
          <Button type="submit" size="sm" disabled={saving || !dirty || (isPublic && !validHandle)}>
            {saved ? <Check size={15} aria-hidden /> : null} {saving ? 'Salvando…' : saved ? 'Salvo' : 'Salvar'}
          </Button>
          {live && (
            <>
              <Button type="button" size="sm" onClick={() => setInviting(true)}>
                <QrCode size={15} aria-hidden /> Convite com QR code
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => openTrainer(settings.username!)}>
                <Eye size={15} aria-hidden /> Ver como visitante
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={copy}>
                {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} {copied ? 'Link copiado' : 'Copiar link'}
              </Button>
            </>
          )}
        </div>
      </form>
      {live && <InviteDialog open={inviting} data={invite} onClose={() => setInviting(false)} />}
    </section>
  )
}
