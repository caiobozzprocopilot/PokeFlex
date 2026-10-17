// Mesma regra de src/services/pricing.ts (bestQuote + toBRL), para o servidor checar os preços-alvo.

const num = (...values) => values.find((v) => typeof v === 'number' && v > 0)

const TCG_KEYS = {
  normal: ['normal', 'unlimited', 'unlimited-normal', 'unlimitedNormal'],
  holo: ['holofoil', 'unlimited-holofoil', 'unlimitedHolofoil'],
  reverse: ['reverse-holofoil', 'reverseHolofoil'],
  firstEdition: ['1st-edition-holofoil', '1stEditionHolofoil', '1st-edition-normal', '1stEditionNormal', '1st-edition'],
}

function cardmarket(cm, card, variant) {
  const shiny = variant === 'reverse' || (variant === 'holo' && card?.variants?.normal)
  const value = shiny ? num(cm['trend-holo'], cm['avg30-holo'], cm['avg-holo']) : num(cm.trend, cm.avg30, cm.avg)
  return value ? { currency: 'EUR', value } : null
}

function tcgplayer(tp, variant) {
  const entries = Object.entries(tp).filter((e) => typeof e[1] === 'object' && e[1])
  const match = entries.find(([k]) => TCG_KEYS[variant]?.includes(k)) ?? (entries.length === 1 ? entries[0] : undefined)
  if (!match) return null
  const value = num(match[1].marketPrice, match[1].midPrice, match[1].lowPrice)
  return value ? { currency: 'USD', value } : null
}

export async function fetchRates() {
  const res = await fetch('https://api.frankfurter.dev/v1/latest?from=EUR&to=BRL,USD')
  const json = await res.json()
  return { EUR: json.rates.BRL, USD: json.rates.BRL / json.rates.USD }
}

export async function priceBRL(cardId, card, variant, rates) {
  const res = await fetch(`https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(cardId)}`)
  if (!res.ok) return null
  const pricing = (await res.json()).pricing
  if (!pricing) return null
  const q = (pricing.cardmarket && cardmarket(pricing.cardmarket, card, variant)) ?? (pricing.tcgplayer && tcgplayer(pricing.tcgplayer, variant))
  return q ? q.value * rates[q.currency] : null
}

export const formatBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
