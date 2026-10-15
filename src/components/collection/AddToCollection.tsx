import { useState, type FormEvent, type ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import type { CardVariant, PokemonCard } from '../../types/pokemon'
import { useCollection, type Language } from '../../store/collection'
import { usePricing, useRates } from '../../hooks/useTcgdex'
import { bestQuote, CONDITIONS, conditionFactor, formatBRL, toBRL, type Condition } from '../../services/pricing'
import { availableVariants, defaultVariant, GRADERS, LANGUAGES, VARIANT_LABEL } from '../../utils/collection'
import { Button } from '../ui/Button'

interface AddToCollectionProps {
  card: PokemonCard
  initialVariant?: CardVariant
  onAdded: (quantity: number) => void
  onCancel: () => void
}

function Group({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </fieldset>
  )
}

const pill = (active: boolean) =>
  `rounded-xl border px-3 py-2 text-sm transition-colors ${
    active ? 'border-primary bg-primary/10 text-primary' : 'border-line text-muted hover:border-muted/50 hover:text-ink'
  }`

const parseMoney = (v: string) => {
  const n = Number(v.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function AddToCollection({ card, initialVariant, onAdded, onCancel }: AddToCollectionProps) {
  const add = useCollection((s) => s.add)
  const pricing = usePricing(card.id)
  const rates = useRates()
  const variants = availableVariants(card)

  const [variant, setVariant] = useState<CardVariant>(
    initialVariant && variants.includes(initialVariant) ? initialVariant : defaultVariant(card),
  )
  const [condition, setCondition] = useState<Condition>('NM')
  const [language, setLanguage] = useState<Language>('pt')
  const [quantity, setQuantity] = useState(1)
  const [graded, setGraded] = useState(false)
  const [company, setCompany] = useState('PSA')
  const [grade, setGrade] = useState('10')
  const [paid, setPaid] = useState('')
  const [gradeError, setGradeError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const q = bestQuote(pricing.data, card, variant)
  const unit = q && rates.data ? toBRL(q, q.value, rates.data) * conditionFactor(condition) : null
  const conditionInfo = CONDITIONS.find((c) => c.id === condition)!

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const gradeValue = Number(grade.replace(',', '.'))
    if (graded && !(gradeValue >= 1 && gradeValue <= 10)) {
      setGradeError('A nota vai de 1 a 10.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await add({
        card,
        variant,
        condition,
        language,
        quantity,
        graded: graded ? { company, grade: gradeValue } : undefined,
        pricePaid: parseMoney(paid),
      })
      onAdded(quantity)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Não foi possível salvar a carta.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex h-full flex-col">
      <div className="flex-1 space-y-6">
        {variants.length > 1 && (
          <Group label="Variante">
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVariant(v)}
                  aria-pressed={variant === v}
                  className={pill(variant === v)}
                >
                  {VARIANT_LABEL[v]}
                </button>
              ))}
            </div>
          </Group>
        )}

        <Group label="Condição" hint={conditionInfo.hint}>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {CONDITIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCondition(c.id)}
                aria-pressed={condition === c.id}
                title={c.label}
                className={`flex flex-col items-center rounded-xl border px-1 py-2 transition-colors ${
                  condition === c.id ? 'border-primary bg-primary/10 text-primary' : 'border-line text-muted hover:text-ink'
                }`}
              >
                <span className="font-mono text-sm font-semibold">{c.id}</span>
                <span className="mt-0.5 text-center text-[10px] leading-tight">{c.label}</span>
              </button>
            ))}
          </div>
        </Group>

        <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
          <Group label="Idioma da carta">
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLanguage(l.id)}
                  aria-pressed={language === l.id}
                  className={pill(language === l.id)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </Group>
          <Group label="Quantidade">
            <div className="flex h-11 items-center rounded-xl border border-line">
              <button
                type="button"
                onClick={() => setQuantity((n) => Math.max(1, n - 1))}
                disabled={quantity <= 1}
                aria-label="Diminuir"
                className="grid h-full w-11 place-items-center text-muted hover:text-ink disabled:opacity-40"
              >
                <Minus size={16} aria-hidden />
              </button>
              <output className="w-10 text-center font-mono text-base tabular-nums" aria-live="polite">
                {quantity}
              </output>
              <button
                type="button"
                onClick={() => setQuantity((n) => Math.min(99, n + 1))}
                aria-label="Aumentar"
                className="grid h-full w-11 place-items-center text-muted hover:text-ink"
              >
                <Plus size={16} aria-hidden />
              </button>
            </div>
          </Group>
        </div>

        <Group label="Graduação">
          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={graded} onChange={(e) => setGraded(e.target.checked)} className="peer sr-only" />
            <span className="relative h-6 w-11 rounded-full bg-raised transition-colors after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-muted after:transition-transform peer-checked:bg-primary/30 peer-checked:after:translate-x-5 peer-checked:after:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary" />
            <span className="text-sm">É uma carta graduada (slab)</span>
          </label>
          {graded && (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Empresa">
                {GRADERS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setCompany(g)}
                    aria-pressed={company === g}
                    className={pill(company === g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <label className="block">
                <span className="mb-1 block text-xs text-muted">Nota</span>
                <input
                  value={grade}
                  onChange={(e) => {
                    setGrade(e.target.value)
                    setGradeError(null)
                  }}
                  inputMode="decimal"
                  aria-invalid={!!gradeError}
                  aria-describedby="grade-error"
                  className="h-10 w-20 rounded-xl border border-line bg-bg px-3 text-center font-mono focus:border-primary focus:outline-none"
                />
              </label>
              <p id="grade-error" role="alert" className="w-full text-xs text-accent">
                {gradeError}
              </p>
              <p className="w-full text-xs text-muted">
                O preço de referência é de cartas sem graduação; slabs costumam valer mais.
              </p>
            </div>
          )}
        </Group>

        <Group label="Quanto você pagou? (opcional)" hint="Valor por unidade. Usamos para mostrar quanto sua coleção valorizou.">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative">
              <span className="sr-only">Preço pago por unidade em reais</span>
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">R$</span>
              <input
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="h-11 w-40 rounded-xl border border-line bg-bg pl-10 pr-3 font-mono focus:border-primary focus:outline-none"
              />
            </label>
            {unit !== null && (
              <button
                type="button"
                onClick={() => setPaid(unit.toFixed(2).replace('.', ','))}
                className="text-sm text-muted hover:text-primary"
              >
                Usar valor de mercado ({formatBRL(unit)})
              </button>
            )}
          </div>
        </Group>
      </div>

      <div className="sticky -bottom-6 mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line bg-surface pb-6 pt-4 sm:-bottom-8 sm:pb-8">
        <p role="alert" className={`w-full text-sm text-accent ${saveError ? '' : 'sr-only'}`}>
          {saveError}
        </p>
        <div aria-live="polite">
          <p className="text-xs text-muted">Valor estimado</p>
          <p className="font-display text-2xl font-bold tabular-nums">
            {pricing.loading || rates.loading ? '…' : unit !== null ? formatBRL(unit * quantity) : 'Sem preço'}
          </p>
          {unit !== null && (
            <p className="text-xs text-muted">
              {VARIANT_LABEL[variant]} · {conditionInfo.label}
              {quantity > 1 ? ` · ${quantity} × ${formatBRL(unit)}` : ''}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            <Plus size={16} aria-hidden />{' '}
            {saving ? 'Salvando…' : `Adicionar ${quantity > 1 ? `${quantity} cartas` : 'à coleção'}`}
          </Button>
        </div>
      </div>
    </form>
  )
}
