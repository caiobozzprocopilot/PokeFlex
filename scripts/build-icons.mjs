// Gera os ícones do PWA (Pokébola) a partir de um único desenho vetorial.
// Uso: node scripts/build-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const BG = '#0A0A0E'

// Pokébola centrada em (0,0), raio 100.
const ball = `
  <defs>
    <radialGradient id="shine" cx="-35" cy="-45" r="70" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="red" x1="0" y1="-100" x2="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FF5A3C"/>
      <stop offset="1" stop-color="#D2290B"/>
    </linearGradient>
    <linearGradient id="white" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#D9DCE3"/>
    </linearGradient>
  </defs>
  <circle r="100" fill="#111"/>
  <path d="M -92 0 A 92 92 0 0 1 92 0 Z" fill="url(#red)"/>
  <path d="M -92 0 A 92 92 0 0 0 92 0 Z" fill="url(#white)"/>
  <rect x="-96" y="-9" width="192" height="18" fill="#111"/>
  <circle r="34" fill="#111"/>
  <circle r="24" fill="#F4F5F8"/>
  <circle r="13" fill="none" stroke="#C9CDD6" stroke-width="3"/>
  <ellipse cx="-40" cy="-52" rx="34" ry="20" fill="url(#shine)" transform="rotate(-28 -40 -52)"/>
`

// size: lado do PNG; scale: diâmetro da bola em relação ao lado; radius: arredondamento do fundo (0 = quadrado cheio).
const svg = ({ size, scale, background, radius = 0 }) => {
  const r = (size * scale) / 2
  const bg = background
    ? `<rect width="${size}" height="${size}" rx="${radius * size}" fill="${background}"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg}
    <g transform="translate(${size / 2} ${size / 2}) scale(${r / 100})">${ball}</g>
  </svg>`
}

const OUT = 'public/icons'
mkdirSync(OUT, { recursive: true })

const targets = [
  // Ícones comuns: fundo escuro arredondado, bola grande.
  { file: 'icon-192.png', size: 192, scale: 0.78, background: BG, radius: 0.22 },
  { file: 'icon-512.png', size: 512, scale: 0.78, background: BG, radius: 0.22 },
  // Maskable (Android recorta em círculo/squircle): fundo cheio e bola dentro da zona segura de 80%.
  { file: 'maskable-512.png', size: 512, scale: 0.58, background: BG },
  // iOS aplica o próprio arredondamento e não aceita transparência.
  { file: 'apple-touch-icon.png', size: 180, scale: 0.72, background: BG },
  { file: 'favicon-32.png', size: 32, scale: 0.94 },
]

for (const t of targets) {
  await sharp(Buffer.from(svg(t))).png().toFile(`${OUT}/${t.file}`)
  console.log(`${OUT}/${t.file}`)
}
writeFileSync('public/favicon.svg', svg({ size: 64, scale: 0.94 }))
console.log('public/favicon.svg')
