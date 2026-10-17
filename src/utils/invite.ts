import qrcode from 'qrcode-generator'

// Convite de treinador desenhado em canvas: 1080x1920 (Stories), com o QR code no botão de uma Pokébola.
// O que importa fica entre y=220 e y=1680, fora das barras do Instagram e do WhatsApp Status.

export type InviteData = {
  url: string
  name: string
  username: string
  avatarUrl: string | null
  level: number
  title: string
  cards: number
  pokedex: number
  badges: number
  cardImages: string[]
  own: boolean
}

// Duas cartas para aparecer atrás da Pokébola: primeiro as da vitrine, depois as brilhantes, depois as mais recentes.
export function pickInviteCards(cards: { id: string; imageUrl?: string; holo?: boolean }[], showcaseIds: string[] = []) {
  const byId = new Map(cards.map((c) => [c.id, c]))
  const ordered = [...showcaseIds.map((id) => byId.get(id)), ...cards.filter((c) => c.holo), ...cards]
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of ordered) {
    if (!c?.imageUrl || seen.has(c.id)) continue
    seen.add(c.id)
    out.push(c.imageUrl)
    if (out.length === 2) break
  }
  return out
}

const W = 1080
const H = 1920

const COLORS = {
  bg: '#0A0A0E',
  ink: '#EDEDF2',
  muted: '#9696A8',
  primary: '#FFD60A',
  accent: '#FF006E',
  red: '#E3350D',
  line: 'rgba(255,255,255,0.08)',
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

const fit = (ctx: CanvasRenderingContext2D, text: string, font: (size: number) => string, size: number, max: number) => {
  let s = size
  ctx.font = font(s)
  while (ctx.measureText(text).width > max && s > 20) ctx.font = font((s -= 2))
  return s
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function drawQr(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, side: number) {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const n = qr.getModuleCount()
  const cell = side / n
  const x0 = cx - side / 2
  const y0 = cy - side / 2
  const finder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)

  ctx.fillStyle = '#16161C'
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.isDark(r, c) || finder(r, c)) continue
      ctx.beginPath()
      ctx.arc(x0 + (c + 0.5) * cell, y0 + (r + 0.5) * cell, cell * 0.46, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // Olhos do QR arredondados, com o miolo vermelho da Pokébola.
  for (const [r, c] of [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ]) {
    const x = x0 + c * cell
    const y = y0 + r * cell
    ctx.fillStyle = '#16161C'
    roundRect(ctx, x, y, cell * 7, cell * 7, cell * 2.2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    roundRect(ctx, x + cell, y + cell, cell * 5, cell * 5, cell * 1.6)
    ctx.fill()
    ctx.fillStyle = COLORS.red
    roundRect(ctx, x + cell * 2, y + cell * 2, cell * 3, cell * 3, cell * 1.1)
    ctx.fill()
  }
}

function drawPokeballQr(ctx: CanvasRenderingContext2D, url: string, cx: number, cy: number, R: number) {
  // Brilho atrás da Pokébola
  const glow = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.45)
  glow.addColorStop(0, 'rgba(255,214,10,0.28)')
  glow.addColorStop(1, 'rgba(255,214,10,0)')
  ctx.fillStyle = glow
  ctx.fillRect(cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2)

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 60
  ctx.shadowOffsetY = 24
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fillStyle = '#111'
  ctx.fill()
  ctx.restore()

  // Metade de cima vermelha
  const red = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.7, R * 0.1, cx, cy - R * 0.2, R * 1.2)
  red.addColorStop(0, '#FF7A6B')
  red.addColorStop(0.45, COLORS.red)
  red.addColorStop(1, '#8E1B05')
  ctx.beginPath()
  ctx.arc(cx, cy, R - 7, Math.PI, 0)
  ctx.closePath()
  ctx.fillStyle = red
  ctx.fill()

  // Metade de baixo branca
  const white = ctx.createLinearGradient(cx, cy, cx, cy + R)
  white.addColorStop(0, '#FFFFFF')
  white.addColorStop(1, '#C3C8D2')
  ctx.beginPath()
  ctx.arc(cx, cy, R - 7, 0, Math.PI)
  ctx.closePath()
  ctx.fillStyle = white
  ctx.fill()

  // Reflexo
  ctx.save()
  ctx.translate(cx - R * 0.45, cy - R * 0.62)
  ctx.rotate(-0.45)
  ctx.beginPath()
  ctx.ellipse(0, 0, R * 0.26, R * 0.1, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fill()
  ctx.restore()

  // Faixa preta
  ctx.fillStyle = '#111'
  ctx.fillRect(cx - R + 4, cy - R * 0.06, R * 2 - 8, R * 0.12)

  // Botão central com o QR
  ctx.beginPath()
  ctx.arc(cx, cy, R * 0.64, 0, Math.PI * 2)
  ctx.fillStyle = '#111'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, R * 0.57, 0, Math.PI * 2)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  const side = R * 0.57 * Math.SQRT2 * 0.93
  drawQr(ctx, url, cx, cy, side)
}

function drawPokeballOutline(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, width: number) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.moveTo(cx - r, cy)
  ctx.lineTo(cx - r * 0.33, cy)
  ctx.moveTo(cx + r * 0.33, cy)
  ctx.lineTo(cx + r, cy)
  ctx.moveTo(cx + r * 0.33, cy)
  ctx.arc(cx, cy, r * 0.33, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawCard(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, w: number, angle: number) {
  const h = w * (88 / 63)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.shadowColor = 'rgba(0,0,0,0.65)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 18
  roundRect(ctx, -w / 2, -h / 2, w, h, w * 0.045)
  ctx.fillStyle = '#222'
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.clip()
  ctx.drawImage(img, -w / 2, -h / 2, w, h)
  ctx.restore()
}

async function fonts() {
  if (!('fonts' in document)) return
  await Promise.all(
    ['800 80px Poppins', '700 40px Poppins', '600 34px Inter', '400 30px Inter', '500 32px "IBM Plex Mono"', '400 22px "Press Start 2P"'].map((f) =>
      document.fonts.load(f).catch(() => null),
    ),
  )
}

export async function renderInvite(d: InviteData): Promise<Blob> {
  await fonts()
  const [avatar, ...cards] = await Promise.all([
    d.avatarUrl ? loadImage(d.avatarUrl) : Promise.resolve(null),
    ...d.cardImages.slice(0, 2).map((src) => loadImage(src)),
  ])

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // Fundo com brilhos e uma Pokébola gigante bem apagada
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, W, H)
  const g1 = ctx.createRadialGradient(140, 160, 0, 140, 160, 760)
  g1.addColorStop(0, 'rgba(255,214,10,0.22)')
  g1.addColorStop(1, 'rgba(255,214,10,0)')
  ctx.fillStyle = g1
  ctx.fillRect(0, 0, W, H)
  const g2 = ctx.createRadialGradient(W - 80, H - 220, 0, W - 80, H - 220, 820)
  g2.addColorStop(0, 'rgba(255,0,110,0.2)')
  g2.addColorStop(1, 'rgba(255,0,110,0)')
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, W, H)
  drawPokeballOutline(ctx, W - 60, 300, 420, 'rgba(255,255,255,0.035)', 10)
  drawPokeballOutline(ctx, 40, H - 200, 300, 'rgba(255,255,255,0.03)', 8)

  // Logo
  const logoY = 262
  ctx.font = '800 46px Poppins'
  const pokeW = ctx.measureText('Poke').width
  const flexW = ctx.measureText('Flex').width
  const iconR = 26
  const total = iconR * 2 + 16 + pokeW + flexW
  const lx = W / 2 - total / 2
  drawMiniBall(ctx, lx + iconR, logoY - 16, iconR)
  ctx.textAlign = 'left'
  ctx.fillStyle = COLORS.ink
  ctx.fillText('Poke', lx + iconR * 2 + 16, logoY)
  ctx.fillStyle = COLORS.primary
  ctx.fillText('Flex', lx + iconR * 2 + 16 + pokeW, logoY)
  ctx.textAlign = 'center'

  ctx.font = '400 22px "Press Start 2P"'
  ctx.fillStyle = COLORS.primary
  ctx.fillText(d.own ? 'CONVITE DE TREINADOR' : 'PERFIL DE TREINADOR', W / 2, 336)

  // Avatar com anel em degradê
  const ay = 470
  const ar = 92
  const ring = ctx.createLinearGradient(W / 2 - ar, ay - ar, W / 2 + ar, ay + ar)
  ring.addColorStop(0, COLORS.accent)
  ring.addColorStop(1, COLORS.primary)
  ctx.beginPath()
  ctx.arc(W / 2, ay, ar + 9, 0, Math.PI * 2)
  ctx.fillStyle = ring
  ctx.fill()
  ctx.save()
  ctx.beginPath()
  ctx.arc(W / 2, ay, ar, 0, Math.PI * 2)
  ctx.clip()
  if (avatar) {
    const s = Math.min(avatar.width, avatar.height)
    ctx.drawImage(avatar, (avatar.width - s) / 2, (avatar.height - s) / 2, s, s, W / 2 - ar, ay - ar, ar * 2, ar * 2)
  } else {
    ctx.fillStyle = ring
    ctx.fillRect(W / 2 - ar, ay - ar, ar * 2, ar * 2)
    ctx.font = '800 96px Poppins'
    ctx.fillStyle = COLORS.bg
    ctx.fillText((d.name[0] ?? '?').toUpperCase(), W / 2, ay + 34)
  }
  ctx.restore()

  // Nome, @usuário e nível
  fit(ctx, d.name, (s) => `800 ${s}px Poppins`, 78, 900)
  ctx.fillStyle = COLORS.ink
  ctx.fillText(d.name, W / 2, 652)

  ctx.font = '500 32px "IBM Plex Mono"'
  const handle = `@${d.username}`
  const levelText = `NV ${d.level} · ${d.title}`
  ctx.font = '600 30px Inter'
  const chipW = ctx.measureText(levelText).width + 44
  ctx.font = '500 32px "IBM Plex Mono"'
  const handleW = ctx.measureText(handle).width
  const rowW = handleW + 24 + chipW
  const rx = W / 2 - rowW / 2
  ctx.textAlign = 'left'
  ctx.fillStyle = COLORS.muted
  ctx.fillText(handle, rx, 714)
  ctx.fillStyle = 'rgba(255,214,10,0.16)'
  roundRect(ctx, rx + handleW + 24, 680, chipW, 48, 24)
  ctx.fill()
  ctx.font = '600 30px Inter'
  ctx.fillStyle = COLORS.primary
  ctx.fillText(levelText, rx + handleW + 24 + 22, 714)
  ctx.textAlign = 'center'

  // Números
  const stats: [number, string][] = [
    [d.cards, d.cards === 1 ? 'carta' : 'cartas'],
    [d.pokedex, 'na Pokédex'],
    [d.badges, d.badges === 1 ? 'insígnia' : 'insígnias'],
  ]
  stats.forEach(([n, label], i) => {
    const x = W / 2 + (i - 1) * 300
    ctx.font = '800 60px Poppins'
    ctx.fillStyle = COLORS.ink
    ctx.fillText(n.toLocaleString('pt-BR'), x, 828)
    ctx.font = '400 28px Inter'
    ctx.fillStyle = COLORS.muted
    ctx.fillText(label, x, 868)
  })
  ctx.fillStyle = COLORS.line
  ctx.fillRect(W / 2 - 150, 792, 2, 76)
  ctx.fillRect(W / 2 + 150, 792, 2, 76)

  // Cartas aparecendo por trás da Pokébola
  const by = 1230
  const R = 318
  if (cards[0]) drawCard(ctx, cards[0], 205, by + 20, 250, -0.24)
  if (cards[1]) drawCard(ctx, cards[1], W - 205, by + 20, 250, 0.24)
  drawPokeballQr(ctx, d.url, W / 2, by, R)

  // Chamada
  ctx.font = '700 44px Poppins'
  ctx.fillStyle = COLORS.ink
  ctx.fillText(d.own ? 'Escaneie e veja minha coleção' : `Escaneie e veja a coleção`, W / 2, 1626)
  const shortUrl = d.url.replace(/^https?:\/\//, '')
  fit(ctx, shortUrl, (s) => `500 ${s}px "IBM Plex Mono"`, 30, 940)
  ctx.fillStyle = COLORS.muted
  ctx.fillText(shortUrl, W / 2, 1672)

  ctx.font = '400 26px Inter'
  ctx.fillStyle = 'rgba(150,150,168,0.7)'
  ctx.fillText('Colecione cartas · conquiste insígnias · siga treinadores', W / 2, 1820)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Não deu para gerar a imagem.'))), 'image/jpeg', 0.9))
}

function drawMiniBall(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  ctx.arc(cx, cy, r, Math.PI, 0)
  ctx.closePath()
  ctx.fillStyle = COLORS.red
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI)
  ctx.closePath()
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.fillRect(cx - r, cy - r * 0.12, r * 2, r * 0.24)
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.34, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
}
