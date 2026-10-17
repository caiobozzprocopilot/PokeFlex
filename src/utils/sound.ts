// Efeitos 8-bit gerados na hora com Web Audio (sem arquivos de som).

const KEY = 'pokeflex:sound'

let ctx: AudioContext | null = null

const context = () => {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

// Navegadores só liberam áudio depois de um toque: aproveitamos o primeiro.
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => context(), { once: true, capture: true })
}

export function soundOn() {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // Sem armazenamento: vale só nesta visita.
  }
}

type Note = [freq: number, start: number, dur: number, type?: OscillatorType]

function play(notes: Note[], volume = 0.05) {
  if (!soundOn()) return
  const ac = context()
  if (!ac || ac.state !== 'running') return
  const t0 = ac.currentTime + 0.02
  for (const [freq, start, dur, type = 'square'] of notes) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, t0 + start)
    gain.gain.linearRampToValueAtTime(volume, t0 + start + 0.01)
    gain.gain.setValueAtTime(volume, t0 + start + dur * 0.7)
    gain.gain.linearRampToValueAtTime(0, t0 + start + dur)
    osc.connect(gain).connect(ac.destination)
    osc.start(t0 + start)
    osc.stop(t0 + start + dur + 0.02)
  }
}

const N = { C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5, G6: 1568 }

export const sfx = {
  // "tic" de cada balançada da Pokébola
  wobble: () => play([[220, 0, 0.05, 'triangle']], 0.08),
  // trava da Pokébola: captura confirmada
  click: () => play([[1400, 0, 0.03], [900, 0.04, 0.05]], 0.04),
  catch: () =>
    play([
      [N.E5, 0, 0.09],
      [N.G5, 0.1, 0.09],
      [N.C6, 0.2, 0.22],
    ]),
  badge: () =>
    play([
      [N.G5, 0, 0.12],
      [N.G5, 0.13, 0.12],
      [N.G5, 0.26, 0.12],
      [N.E6, 0.4, 0.5],
      [N.C5, 0.4, 0.5, 'triangle'],
      [N.F5, 0.95, 0.12],
      [N.A5, 1.08, 0.12],
      [N.G6, 1.22, 0.6],
      [N.E5, 1.22, 0.6, 'triangle'],
    ]),
  // Zumbido subindo durante a evolução, cada vez mais rápido.
  evolve: () =>
    play(
      Array.from({ length: 14 }, (_, i): Note => {
        const t = 2.6 * (1 - Math.pow(1 - i / 14, 1.6))
        return [N.C5 * Math.pow(2, i / 12), t, 0.08, i % 2 ? 'square' : 'triangle']
      }),
      0.035,
    ),
  level: () =>
    play([
      [N.C5, 0, 0.08],
      [N.E5, 0.08, 0.08],
      [N.G5, 0.16, 0.08],
      [N.C6, 0.24, 0.08],
      [N.E6, 0.32, 0.08],
      [N.G6, 0.4, 0.4],
      [N.C5, 0.4, 0.4, 'triangle'],
    ]),
}
