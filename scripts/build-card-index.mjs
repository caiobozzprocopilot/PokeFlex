// Gera o índice de reconhecimento por câmera: um hash perceptual por carta de todos os sets da tcgDex.
// Uso: node scripts/build-card-index.mjs   (retoma de onde parou; os resultados parciais ficam em scripts/.cache)
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { CARD_H, CARD_W, HASH_WORDS, hashCard } from '../src/lib/cardHash.js'

const API = 'https://api.tcgdex.net/v2'
const OUT_DIR = 'public/card-index'
const CACHE_DIR = 'scripts/.cache'
const CACHE = `${CACHE_DIR}/hashes.jsonl`
const CONCURRENCY = 16
const EXCLUDED_SERIES = new Set(['tcgp'])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchRetry(url, as = 'json', tries = 4) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url)
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return as === 'json' ? await res.json() : Buffer.from(await res.arrayBuffer())
    } catch (err) {
      if (attempt >= tries) throw new Error(`${url}: ${err.message}`)
      await sleep(500 * attempt)
    }
  }
}

async function listSets() {
  const res = await fetch(`${API}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ sets { id serie { id } } }' }),
  })
  const { data } = await res.json()
  return data.sets.filter((s) => !EXCLUDED_SERIES.has(s.serie.id)).map((s) => s.id)
}

async function listCards(setIds) {
  const cards = []
  for (let i = 0; i < setIds.length; i += 8) {
    const batch = await Promise.all(setIds.slice(i, i + 8).map((id) => fetchRetry(`${API}/en/sets/${encodeURIComponent(id)}`)))
    for (const set of batch) for (const c of set?.cards ?? []) if (c.image) cards.push({ id: c.id, image: c.image })
  }
  return cards
}

async function hashOne(card) {
  const buf = await fetchRetry(`${card.image}/low.webp`, 'buffer')
  if (!buf) return null
  const { data } = await sharp(buf).resize(CARD_W, CARD_H, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return Array.from(hashCard(data))
}

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true })
  mkdirSync(OUT_DIR, { recursive: true })

  const done = new Map()
  if (existsSync(CACHE)) {
    for (const line of readFileSync(CACHE, 'utf8').split('\n')) {
      if (!line) continue
      const { id, h } = JSON.parse(line)
      done.set(id, h)
    }
  }

  console.log('Listando sets…')
  const setIds = await listSets()
  console.log(`${setIds.length} sets. Listando cartas…`)
  const cards = await listCards(setIds)
  const todo = cards.filter((c) => !done.has(c.id))
  console.log(`${cards.length} cartas com imagem; ${done.size} já no cache; ${todo.length} para calcular.`)

  let next = 0
  let finished = 0
  let failed = 0
  const started = Date.now()
  const worker = async () => {
    while (next < todo.length) {
      const card = todo[next++]
      try {
        const h = await hashOne(card)
        if (h) {
          done.set(card.id, h)
          appendFileSync(CACHE, `${JSON.stringify({ id: card.id, h })}\n`)
        } else failed++
      } catch (err) {
        failed++
        console.warn(`  falhou ${card.id}: ${err.message}`)
      }
      if (++finished % 500 === 0) {
        const rate = finished / ((Date.now() - started) / 1000)
        console.log(`  ${finished}/${todo.length} (${rate.toFixed(1)}/s, ~${Math.round((todo.length - finished) / rate / 60)} min restantes)`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  const ids = cards.map((c) => c.id).filter((id) => done.has(id))
  const words = new Uint32Array(ids.length * HASH_WORDS)
  ids.forEach((id, i) => words.set(done.get(id), i * HASH_WORDS))
  writeFileSync(`${OUT_DIR}/hashes.bin`, Buffer.from(words.buffer))
  writeFileSync(`${OUT_DIR}/ids.json`, JSON.stringify(ids))
  writeFileSync(`${OUT_DIR}/meta.json`, JSON.stringify({ count: ids.length, words: HASH_WORDS, builtAt: new Date().toISOString() }))
  console.log(`Pronto: ${ids.length} cartas no índice (${failed} falharam). Arquivos em ${OUT_DIR}/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
