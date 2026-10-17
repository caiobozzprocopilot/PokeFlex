// Gera as imagens do Fagulin (public/mascot/fagulin-N.webp) e o manifesto src/data/mascotArt.ts.
//
// Fontes em assets/mascot/:
//   - stage-N.(png|webp|jpg): uma imagem por forma (com ou sem fundo). Tem prioridade.
//   - folha.(webp|jpg|png) + recortes.json: a folha com as 12 formas e onde cortar cada uma.
//   - mascaras/stage-N.png: máscara de transparência de cada recorte da folha (branco = criatura).
//     As atuais saíram do removedor de fundo @imgly/background-removal-node (modelo "medium").
//
// Sem máscara nem transparência, o fundo escuro é removido por "inundação" a partir das bordas. A inundação
// não atravessa a faixa perto das partes claras, então contornos e partes escuras (armaduras) ficam.
//
// Uso: node scripts/build-mascot.mjs

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const SRC = 'assets/mascot'
const OUT = 'public/mascot'
const SIZE = 512
const PAD = 0.04

const find = (base) => ['png', 'webp', 'jpg', 'jpeg'].map((e) => `${SRC}/${base}.${e}`).find(existsSync)

// Máximo numa janela quadrada de raio r (dilatação), separável: linhas e depois colunas.
function dilate(src, w, h, r) {
  if (r <= 0) return src
  const tmp = new Uint8Array(w * h)
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    let count = 0
    for (let x = -r; x < w; x++) {
      const add = x + r
      if (add < w && src[y * w + add]) count++
      const drop = x - r - 1
      if (drop >= 0 && src[y * w + drop]) count--
      if (x >= 0) tmp[y * w + x] = count > 0 ? 1 : 0
    }
  }
  for (let x = 0; x < w; x++) {
    let count = 0
    for (let y = -r; y < h; y++) {
      const add = y + r
      if (add < h && tmp[add * w + x]) count++
      const drop = y - r - 1
      if (drop >= 0 && tmp[drop * w + x]) count--
      if (y >= 0) out[y * w + x] = count > 0 ? 1 : 0
    }
  }
  return out
}

function removeBackground(rgba, w, h, opts) {
  const { bg = 112, bright = 125, guard = 4, minPart = 0.015 } = opts
  const n = w * h
  const lum = new Float32Array(n)
  const isBright = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const r = rgba[i * 4]
    const g = rgba[i * 4 + 1]
    const b = rgba[i * 4 + 2]
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b
    if (lum[i] > bright) isBright[i] = 1
  }
  const guarded = dilate(isBright, w, h, guard)

  // Inunda o fundo a partir das bordas, por pixels escuros fora da faixa protegida.
  const bgMask = new Uint8Array(n)
  const queue = new Int32Array(n)
  let head = 0
  let tail = 0
  const tryPush = (i) => {
    if (bgMask[i] || guarded[i] || lum[i] >= bg) return
    bgMask[i] = 1
    queue[tail++] = i
  }
  for (let x = 0; x < w; x++) {
    tryPush(x)
    tryPush((h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    tryPush(y * w)
    tryPush(y * w + w - 1)
  }
  while (head < tail) {
    const i = queue[head++]
    const x = i % w
    const y = (i - x) / w
    if (x > 0) tryPush(i - 1)
    if (x < w - 1) tryPush(i + 1)
    if (y > 0) tryPush(i - w)
    if (y < h - 1) tryPush(i + w)
  }

  // A faixa protegida que encosta no fundo vira borda suave: some aos poucos conforme escurece.
  // Partes soltas pequenas (faíscas do cenário) saem; ficam as maiores.
  const fg = new Uint8Array(n)
  for (let i = 0; i < n; i++) fg[i] = bgMask[i] ? 0 : 1
  const label = new Int32Array(n)
  const sizes = [0]
  for (let i = 0; i < n; i++) {
    if (!fg[i] || label[i]) continue
    const id = sizes.length
    let size = 0
    head = 0
    tail = 0
    queue[tail++] = i
    label[i] = id
    while (head < tail) {
      const j = queue[head++]
      size++
      const x = j % w
      const y = (j - x) / w
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const k = ny * w + nx
          if (fg[k] && !label[k]) {
            label[k] = id
            queue[tail++] = k
          }
        }
      }
    }
    sizes.push(size)
  }
  const largest = Math.max(...sizes)
  const keep = sizes.map((s) => s >= largest * minPart)

  const alpha = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    if (!label[i] || !keep[label[i]]) continue
    // Pixels escuros que só ficaram por estarem na faixa protegida: transparência proporcional ao brilho.
    const soft = lum[i] >= bg ? 1 : Math.max(0.35, lum[i] / bg)
    alpha[i] = Math.round(255 * (isBright[i] ? 1 : soft))
  }
  return alpha
}

async function cutout(input, box, opts = {}, matteFile = null) {
  let img = sharp(input)
  if (box) img = img.extract(box)
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info

  // Máscara pronta (ex.: feita por um removedor de fundo com IA): a transparência vem dela, a cor da original.
  if (matteFile) {
    const matte = await sharp(matteFile).resize(w, h, { fit: 'fill' }).extractChannel(0).raw().toBuffer()
    for (let i = 0; i < w * h; i++) data[i * 4 + 3] = matte[i]
  }

  let alpha
  const hasAlpha = (() => {
    for (let i = 3; i < data.length; i += 4) if (data[i] < 250) return true
    return false
  })()
  if (hasAlpha) {
    alpha = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) alpha[i] = data[i * 4 + 3]
    // Recortes de IA costumam deixar brilho de fogo meio transparente; perto do corpo, pixel claro fica opaco.
    if (opts.boost) {
      // Peso suave (redondo) em volta do corpo: borrar a máscara do núcleo evita blocos retos.
      const core = Buffer.alloc(w * h)
      for (let i = 0; i < w * h; i++) core[i] = alpha[i] > 200 ? 255 : 0
      const radius = typeof opts.boost === 'number' ? opts.boost : 28
      const lo = opts.boostFrom ?? 85
      const near = await sharp(core, { raw: { width: w, height: h, channels: 1 } })
        .blur(radius / 2)
        .extractChannel(0)
        .raw()
        .toBuffer()
      for (let i = 0; i < w * h; i++) {
        // boostAll: formas cheias de brilho espalhado (asas de luz) usam o recorte inteiro.
        const weight = opts.boostAll ? 1 : Math.min(1, (near[i] / 255) * 2.5)
        if (weight <= 0) continue
        const l = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
        const lit = Math.max(0, Math.min(1, (l - lo) / 80))
        alpha[i] = Math.max(alpha[i], Math.round(255 * lit * weight))
      }
    }
  } else {
    alpha = removeBackground(data, w, h, opts)
    // Suaviza o recorte para não ficar serrilhado (extractChannel garante um canal só na saída).
    alpha = new Uint8Array(
      await sharp(Buffer.from(alpha), { raw: { width: w, height: h, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer(),
    )
  }

  // Some aos poucos perto das bordas do recorte: nada de linha reta onde a caixa cortou um brilho.
  const fade = opts.edgeFade ?? 10
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.min(x, y, w - 1 - x, h - 1 - y)
      if (d < fade) alpha[y * w + x] = Math.round(alpha[y * w + x] * (d / fade))
    }
  }

  // Recorta no que sobrou e centraliza num quadrado com margem.
  let x0 = w
  let y0 = h
  let x1 = 0
  let y1 = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x] > 12) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  const out = Buffer.from(data)
  for (let i = 0; i < w * h; i++) out[i * 4 + 3] = alpha[i]
  const cw = x1 - x0 + 1
  const ch = y1 - y0 + 1
  const inner = Math.round(SIZE * (1 - PAD * 2))
  const piece = await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: x0, top: y0, width: cw, height: ch })
    .resize(inner, inner, { fit: 'inside' })
    .png()
    .toBuffer({ resolveWithObject: true })
  // Encosta a base da criatura perto do chão do quadrado, para todas "pisarem" na mesma linha.
  const left = Math.round((SIZE - piece.info.width) / 2)
  const top = Math.round(SIZE * (1 - PAD) - piece.info.height)
  return sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: piece.data, left, top }])
    .webp({ quality: 88, alphaQuality: 90, effort: 6 })
    .toBuffer()
}

mkdirSync(OUT, { recursive: true })
const sheet = find('folha')
const boxes = existsSync(`${SRC}/recortes.json`) ? JSON.parse(readFileSync(`${SRC}/recortes.json`, 'utf8')) : []
const meta = sheet ? await sharp(sheet).metadata() : null
const made = []

for (let stage = 1; stage <= 12; stage++) {
  const single = find(`stage-${stage}`)
  const spec = boxes.find((b) => b.stage === stage)
  let buf
  if (single) buf = await cutout(single, null, spec?.opts)
  else if (sheet && spec) {
    const box = {
      left: Math.round(spec.x * meta.width),
      top: Math.round(spec.y * meta.height),
      width: Math.round(spec.w * meta.width),
      height: Math.round(spec.h * meta.height),
    }
    const matte = existsSync(`${SRC}/mascaras/stage-${stage}.png`) ? `${SRC}/mascaras/stage-${stage}.png` : null
    buf = await cutout(sheet, box, spec.opts, matte)
  } else continue
  writeFileSync(`${OUT}/fagulin-${stage}.webp`, buf)
  made.push(stage)
  console.log(`forma ${stage}: ${Math.round(buf.length / 1024)} KB`)
}

const entries = made.map((s) => `  ${s}: '/mascot/fagulin-${s}.webp',`).join('\n')
writeFileSync(
  'src/data/mascotArt.ts',
  `// Gerado por scripts/build-mascot.mjs: imagens prontas de cada forma do Fagulin (public/mascot/).
// Formas sem imagem usam o desenho em SVG de components/mascot/Fagulin.tsx.

export const MASCOT_ART: Partial<Record<number, string>> = {${made.length ? `\n${entries}\n` : ''}}
`,
)
console.log(`${made.length} formas geradas.`)
