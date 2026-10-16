import { CARD_H, CARD_W, HASH_WORDS, distance, hashCard } from '../lib/cardHash'
import type { PokemonCard } from '../types/pokemon'
import { fetchCards } from './tcgdex'

// OpenCV.js não tem tipos úteis; usamos `any` só dentro deste módulo.
/* eslint-disable @typescript-eslint/no-explicit-any */
type CV = any

export type Point = { x: number; y: number }

export type ScanCandidate = { card: PokemonCard; hashDistance: number; inliers: number }

export type ScanResult = {
  candidates: ScanCandidate[]
  confident: boolean
  detected: boolean
  preview: string
}

const HASH_SHORTLIST = 24
// O desempate olha só a ilustração: molduras e símbolos se repetem entre cartas da mesma linha (ex.: Prism Star).
const ORB_REGION = { x: 0.07, y: 0.09, w: 0.86, h: 0.42 }
const ORB_FEATURES = 600
const CONFIDENT_INLIERS = 18
const ORB_MIN_INLIERS = 10

// O módulo do OpenCV pode vir pronto, como Promise ou exigir onRuntimeInitialized; embrulhamos num objeto
// porque o próprio módulo tem um `then` que confundiria o await.
let cvPromise: Promise<{ cv: CV }> | null = null
export function loadCv(): Promise<{ cv: CV }> {
  cvPromise ??= import('@techstark/opencv-js').then(async (mod: any) => {
    const m = mod.default ?? mod
    if (m instanceof Promise) return { cv: await m }
    if (m.Mat) return { cv: m }
    await new Promise<void>((resolve) => {
      m.onRuntimeInitialized = () => resolve()
    })
    return { cv: m }
  })
  return cvPromise
}

type CardIndex = { ids: string[]; hashes: Uint32Array }
let indexPromise: Promise<CardIndex> | null = null
export function loadIndex(): Promise<CardIndex> {
  indexPromise ??= Promise.all([
    fetch('/card-index/ids.json').then((r) => {
      if (!r.ok) throw new Error('Índice de cartas indisponível.')
      return r.json() as Promise<string[]>
    }),
    fetch('/card-index/hashes.bin').then((r) => {
      if (!r.ok) throw new Error('Índice de cartas indisponível.')
      return r.arrayBuffer()
    }),
  ]).then(([ids, buf]) => ({ ids, hashes: new Uint32Array(buf) }))
  indexPromise.catch(() => (indexPromise = null))
  return indexPromise
}

// Ordena os 4 cantos em sentido horário a partir do superior esquerdo, com a carta em pé.
function orderCorners(pts: Point[]): Point[] {
  const bySum = [...pts].sort((a, b) => a.x + a.y - (b.x + b.y))
  const tl = bySum[0]
  const br = bySum[3]
  const [p, q] = [bySum[1], bySum[2]]
  const tr = p.x - p.y > q.x - q.y ? p : q
  const bl = tr === p ? q : p
  const top = Math.hypot(tr.x - tl.x, tr.y - tl.y)
  const side = Math.hypot(bl.x - tl.x, bl.y - tl.y)
  // Carta deitada: gira a ordem para o lado maior ficar na vertical.
  return top > side ? [bl, tl, tr, br] : [tl, tr, br, bl]
}

// Procura o maior quadrilátero convexo na imagem (a borda da carta).
export function detectCard(cv: CV, canvas: HTMLCanvasElement): Point[] | null {
  const src = cv.imread(canvas)
  const gray = new cv.Mat()
  const edges = new cv.Mat()
  const kernel = cv.Mat.ones(3, 3, cv.CV_8U)
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()
  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0)
    cv.Canny(gray, edges, 40, 120)
    cv.dilate(edges, edges, kernel)
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    const minArea = 0.08 * canvas.width * canvas.height
    let best: Point[] | null = null
    let bestArea = 0
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i)
      const area = cv.contourArea(c)
      if (area > minArea && area > bestArea) {
        const approx = new cv.Mat()
        cv.approxPolyDP(c, approx, 0.02 * cv.arcLength(c, true), true)
        if (approx.rows === 4 && cv.isContourConvex(approx)) {
          const d = approx.data32S
          best = [0, 1, 2, 3].map((k) => ({ x: d[k * 2], y: d[k * 2 + 1] }))
          bestArea = area
        }
        approx.delete()
      }
      c.delete()
    }
    return best ? orderCorners(best) : null
  } finally {
    ;[src, gray, edges, kernel, contours, hierarchy].forEach((m) => m.delete())
  }
}

// Endireita a carta para CARD_W x CARD_H; sem cantos, recorta a moldura-guia do centro.
export function warpCard(
  cv: CV,
  canvas: HTMLCanvasElement,
  corners: Point[] | null,
  guide: { x: number; y: number; w: number; h: number },
) {
  if (!corners) {
    const out = document.createElement('canvas')
    out.width = CARD_W
    out.height = CARD_H
    out.getContext('2d')!.drawImage(canvas, guide.x, guide.y, guide.w, guide.h, 0, 0, CARD_W, CARD_H)
    return out.getContext('2d')!.getImageData(0, 0, CARD_W, CARD_H)
  }
  const src = cv.imread(canvas)
  const dst = new cv.Mat()
  const from = cv.matFromArray(
    4,
    1,
    cv.CV_32FC2,
    corners.flatMap((p) => [p.x, p.y]),
  )
  const to = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, CARD_W, 0, CARD_W, CARD_H, 0, CARD_H])
  const m = cv.getPerspectiveTransform(from, to)
  try {
    cv.warpPerspective(src, dst, m, new cv.Size(CARD_W, CARD_H), cv.INTER_LINEAR, cv.BORDER_REPLICATE)
    return new ImageData(new Uint8ClampedArray(dst.data), CARD_W, CARD_H)
  } finally {
    ;[src, dst, from, to, m].forEach((x) => x.delete())
  }
}

function rotate180(img: ImageData) {
  const out = new Uint8ClampedArray(img.data.length)
  const px = img.width * img.height
  for (let i = 0; i < px; i++) out.set(img.data.subarray(i * 4, i * 4 + 4), (px - 1 - i) * 4)
  return new ImageData(out, img.width, img.height)
}

function shortlist(index: CardIndex, img: ImageData) {
  const q = hashCard(img.data)
  const q180 = hashCard(rotate180(img).data)
  const scored: { i: number; d: number }[] = []
  let bestUpright = Infinity
  let bestRotated = Infinity
  for (let i = 0; i < index.ids.length; i++) {
    const off = i * HASH_WORDS
    const up = distance(q, index.hashes, off)
    const rot = distance(q180, index.hashes, off)
    if (up < bestUpright) bestUpright = up
    if (rot < bestRotated) bestRotated = rot
    scored.push({ i, d: Math.min(up, rot) })
  }
  scored.sort((a, b) => a.d - b.d)
  return { list: scored.slice(0, HASH_SHORTLIST), rotated: bestRotated < bestUpright }
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Falha ao carregar ${src}`))
    img.src = src
  })

function toGrayMat(cv: CV, source: CanvasImageSource | ImageData) {
  const full = document.createElement('canvas')
  full.width = CARD_W
  full.height = CARD_H
  const fctx = full.getContext('2d')!
  if (source instanceof ImageData) fctx.putImageData(source, 0, 0)
  else fctx.drawImage(source, 0, 0, CARD_W, CARD_H)
  const r = { x: ORB_REGION.x * CARD_W, y: ORB_REGION.y * CARD_H, w: ORB_REGION.w * CARD_W, h: ORB_REGION.h * CARD_H }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(r.w)
  canvas.height = Math.round(r.h)
  canvas.getContext('2d')!.drawImage(full, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height)
  const rgba = cv.imread(canvas)
  const gray = new cv.Mat()
  cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY)
  rgba.delete()
  return gray
}

// Pontos ORB que batem entre a foto e a imagem oficial, confirmados por homografia (RANSAC).
function orbInliers(cv: CV, orb: CV, query: { kp: CV; des: CV }, candidate: CV): number {
  const kp = new cv.KeyPointVector()
  const des = new cv.Mat()
  const noMask = new cv.Mat()
  const matcher = new cv.BFMatcher(cv.NORM_HAMMING, false)
  const knn = new cv.DMatchVectorVector()
  try {
    orb.detectAndCompute(candidate, noMask, kp, des)
    if (des.rows < 8 || query.des.rows < 8) return 0
    matcher.knnMatch(query.des, des, knn, 2)
    const good: { q: number; t: number }[] = []
    for (let i = 0; i < knn.size(); i++) {
      const pair = knn.get(i)
      if (pair.size() === 2) {
        const a = pair.get(0)
        const b = pair.get(1)
        if (a.distance < 0.75 * b.distance) good.push({ q: a.queryIdx, t: a.trainIdx })
      }
    }
    if (good.length < 6) return good.length
    const srcPts = cv.matFromArray(
      good.length,
      1,
      cv.CV_32FC2,
      good.flatMap((g) => [query.kp.get(g.q).pt.x, query.kp.get(g.q).pt.y]),
    )
    const dstPts = cv.matFromArray(
      good.length,
      1,
      cv.CV_32FC2,
      good.flatMap((g) => [kp.get(g.t).pt.x, kp.get(g.t).pt.y]),
    )
    const mask = new cv.Mat()
    const h = cv.findHomography(srcPts, dstPts, cv.RANSAC, 5, mask)
    const inliers = h.empty() ? 0 : cv.countNonZero(mask)
    ;[srcPts, dstPts, mask, h].forEach((m) => m.delete())
    return inliers
  } finally {
    ;[kp, des, noMask, matcher, knn].forEach((m) => m.delete())
  }
}

export async function recognize(
  canvas: HTMLCanvasElement,
  guide: { x: number; y: number; w: number; h: number },
  onStep?: (step: string) => void,
): Promise<ScanResult> {
  onStep?.('Preparando reconhecimento…')
  const timing: Record<string, number> = {}
  let mark = performance.now()
  const lap = (name: string) => {
    const now = performance.now()
    timing[name] = Math.round(now - mark)
    mark = now
  }
  const [{ cv }, index] = await Promise.all([loadCv(), loadIndex()])
  lap('carregar')

  onStep?.('Procurando a carta na foto…')
  const corners = detectCard(cv, canvas)
  const warped = warpCard(cv, canvas, corners, guide)

  onStep?.('Comparando com o catálogo…')
  lap('detectar')
  const { list: short, rotated } = shortlist(index, warped)
  lap('hash')
  // Carta fotografada de cabeça para baixo: desvira antes do desempate e da prévia.
  const card = rotated ? rotate180(warped) : warped
  const previewCanvas = document.createElement('canvas')
  previewCanvas.width = CARD_W
  previewCanvas.height = CARD_H
  previewCanvas.getContext('2d')!.putImageData(card, 0, 0)
  const preview = previewCanvas.toDataURL('image/jpeg', 0.85)

  const cards = await fetchCards(short.map((s) => index.ids[s.i]))
  const distanceById = new Map(short.map((s) => [index.ids[s.i], s.d]))
  lap('buscarCartas')

  onStep?.('Conferindo os detalhes…')
  const orb = new cv.ORB(ORB_FEATURES)
  const queryGray = toGrayMat(cv, card)
  const query = { kp: new cv.KeyPointVector(), des: new cv.Mat() }
  const noMask = new cv.Mat()
  orb.detectAndCompute(queryGray, noMask, query.kp, query.des)
  // Baixa as imagens das candidatas em paralelo; o ORB em si é rápido.
  const images = await Promise.all(
    cards.map((c) => (c.imageUrl ? loadImage(c.imageUrl.replace('/high.webp', '/low.webp')).catch(() => null) : Promise.resolve(null))),
  )
  lap('baixarImagens')
  const candidates: ScanCandidate[] = []
  try {
    cards.forEach((c, i) => {
      let inliers = 0
      const img = images[i]
      if (img) {
        const gray = toGrayMat(cv, img)
        inliers = orbInliers(cv, orb, query, gray)
        gray.delete()
      }
      candidates.push({ card: c, hashDistance: distanceById.get(c.id) ?? 999, inliers })
    })
  } finally {
    ;[orb, queryGray, query.kp, query.des, noMask].forEach((m) => m.delete())
  }

  lap('orb')
  // Com poucos pontos o desempate é ruído (reflexo, arte sem textura): vale a ordem da busca rápida.
  const orbDecides = Math.max(0, ...candidates.map((c) => c.inliers)) >= ORB_MIN_INLIERS
  candidates.sort((a, b) =>
    orbDecides ? b.inliers - a.inliers || a.hashDistance - b.hashDistance : a.hashDistance - b.hashDistance,
  )
  if (import.meta.env.DEV) {
    ;(window as unknown as { __lastScan: unknown }).__lastScan = {
      timing,
      rotated,
      hashTop: short.map((x) => ({ id: index.ids[x.i], d: x.d })),
      ranked: candidates.map((c) => ({ id: c.card.id, inliers: c.inliers, d: c.hashDistance })),
    }
  }
  const [first, second] = candidates
  const confident = !!first && first.inliers >= CONFIDENT_INLIERS && (!second || first.inliers >= second.inliers * 1.5)
  return { candidates, confident, detected: !!corners, preview }
}
