// Hash perceptual (pHash por DCT) de cartas, compartilhado entre o navegador e o script que gera o índice.
// Entrada: pixels RGBA de uma carta já endireitada em CARD_W x CARD_H.

export const CARD_W = 252
export const CARD_H = 352

// Regiões em proporção da carta: inteira e a janela da ilustração (padrão da maioria das cartas).
const REGIONS = [
  [0, 0, 1, 1],
  [0.08, 0.1, 0.92, 0.47],
]

export const HASH_WORDS = REGIONS.length * 2

const N = 32
const K = 8

const COS = (() => {
  const t = new Float64Array(N * N)
  for (let u = 0; u < N; u++) for (let x = 0; x < N; x++) t[u * N + x] = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N))
  return t
})()

function grayscale(rgba, w, h) {
  const g = new Float64Array(w * h)
  for (let i = 0, p = 0; i < g.length; i++, p += 4) g[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]
  return g
}

// Média por área: determinística e igual nos dois ambientes.
function downsample(gray, w, region) {
  const [x0, y0, x1, y1] = region
  const h = gray.length / w
  const rx = x0 * w
  const ry = y0 * h
  const rw = (x1 - x0) * w
  const rh = (y1 - y0) * h
  const out = new Float64Array(N * N)
  for (let j = 0; j < N; j++) {
    const ys = Math.floor(ry + (j * rh) / N)
    const ye = Math.max(ys + 1, Math.floor(ry + ((j + 1) * rh) / N))
    for (let i = 0; i < N; i++) {
      const xs = Math.floor(rx + (i * rw) / N)
      const xe = Math.max(xs + 1, Math.floor(rx + ((i + 1) * rw) / N))
      let sum = 0
      for (let y = ys; y < ye; y++) for (let x = xs; x < xe; x++) sum += gray[y * w + x]
      out[j * N + i] = sum / ((ye - ys) * (xe - xs))
    }
  }
  return out
}

function phash(block) {
  const coeffs = new Float64Array(K * K)
  for (let v = 0; v < K; v++) {
    for (let u = 0; u < K; u++) {
      let sum = 0
      for (let y = 0; y < N; y++) {
        const cy = COS[v * N + y]
        for (let x = 0; x < N; x++) sum += block[y * N + x] * COS[u * N + x] * cy
      }
      coeffs[v * K + u] = sum
    }
  }
  const sorted = Array.from(coeffs.subarray(1)).sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  let hi = 0
  let lo = 0
  for (let i = 0; i < 64; i++) {
    if (coeffs[i] > median) {
      if (i < 32) hi |= 1 << i
      else lo |= 1 << (i - 32)
    }
  }
  return [hi >>> 0, lo >>> 0]
}

export function hashCard(rgba, w = CARD_W, h = CARD_H) {
  const gray = grayscale(rgba, w, h)
  const out = new Uint32Array(HASH_WORDS)
  REGIONS.forEach((region, r) => {
    const [hi, lo] = phash(downsample(gray, w, region))
    out[r * 2] = hi
    out[r * 2 + 1] = lo
  })
  return out
}

function popcount(n) {
  n = n - ((n >>> 1) & 0x55555555)
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333)
  return (((n + (n >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
}

// Distância ponderada: a ilustração pesa mais, porque molduras se repetem entre cartas da mesma época.
export function distance(a, b, offset = 0) {
  const full = popcount(a[0] ^ b[offset]) + popcount(a[1] ^ b[offset + 1])
  const art = popcount(a[2] ^ b[offset + 2]) + popcount(a[3] ^ b[offset + 3])
  return full + 2 * art
}
