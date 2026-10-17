// Fagulin: estágios, missões e as mesmas regras do banco (0006_mascote.sql), usadas no modo demonstração.

export type MascotState = 'active' | 'dimmed'

export type MascotStatus = {
  xp: number
  stage: number
  currentStreak: number
  bestStreak: number
  lastActiveDay: string | null
  today: string
  freezeCrystals: number
  freezesUsed: string[]
  state: MascotState
  relightProgress: number
  missions: Record<string, { progress: number; completed: boolean }>
}

export type MascotEvent = 'card_add' | 'card_remove' | 'scan' | 'wish' | 'wish_target' | 'trade' | 'trade_reply'

// Nomes das formas seguem a arte de referência do mascote; os requisitos seguem o desenho do sistema.
export const STAGES = [
  { name: 'Fagulha', streak: 0, xp: 0, line: 'Um ovo rachado com uma brasa acesa lá dentro. Tem alguém aí.' },
  { name: 'Centelha', streak: 1, xp: 0, line: 'Uma bolinha de fogo sorridente acabou de nascer.' },
  { name: 'Labareda', streak: 3, xp: 100, line: 'Saltitante, com uma cauda de chama que não para quieta.' },
  { name: 'Pira', streak: 7, xp: 300, line: 'Ganhou orelhas pontudas e uma crista de brasa.' },
  { name: 'Fogaréu', streak: 14, xp: 700, line: 'Leva um medalhão no peito e solta faíscas pela cauda.' },
  { name: 'Incêndio', streak: 21, xp: 1200, line: 'Orelhas longas e chamas por todo o corpo.' },
  { name: 'Inferno', streak: 30, xp: 2000, line: 'Chifres, braçadeiras de rocha e um olhar decidido.' },
  { name: 'Vulcânico', streak: 50, xp: 3500, line: 'Armadura de magma e chifres curvados para trás.' },
  { name: 'Blaze', streak: 75, xp: 5500, line: 'Ágil como uma raposa e todo feito de chama.' },
  { name: 'Fênix-Magma', streak: 100, xp: 8000, line: 'Asas de fênix e penas de fogo vermelho.' },
  { name: 'Celestial', streak: 180, xp: 13000, line: 'Envolto por um círculo de runas douradas.' },
  { name: 'Divindade Flamejante', streak: 365, xp: 25000, line: 'Asas de luz, auras sagradas e escudos de fogo. Uma lenda da constância.' },
] as const

export type MissionDef = { id: string; period: 'daily' | 'weekly'; title: string; detail: string; target: number; xp: number }

export const MISSIONS: MissionDef[] = [
  { id: 'capture_cards', period: 'daily', title: 'Captura do dia', detail: 'Registre 3 cartas na coleção', target: 3, xp: 30 },
  { id: 'scan_card', period: 'daily', title: 'Olho de treinador', detail: 'Escaneie uma carta com a câmera', target: 1, xp: 20 },
  { id: 'wish_targets', period: 'weekly', title: 'Caçada', detail: 'Adicione 3 desejos com preço-alvo', target: 3, xp: 80 },
  { id: 'trade_any', period: 'weekly', title: 'Ponte entre treinadores', detail: 'Proponha ou conclua uma troca', target: 1, xp: 150 },
  { id: 'collect_shiny', period: 'weekly', title: 'Brilho raro', detail: 'Registre 2 cartas holo ou reverse', target: 2, xp: 120 },
]

export const DAILY_BONUS_XP = 25
export const MAX_CRYSTALS = 2
const DAY = 24 * 60 * 60 * 1000

export const stageOf = (n: number) => STAGES[Math.max(1, Math.min(12, n)) - 1]

export function stageFor(best: number, xp: number) {
  let n = 1
  STAGES.forEach((s, i) => {
    if (best >= s.streak && xp >= s.xp) n = i + 1
  })
  return n
}

export const dayXp = (streak: number) => Math.min(10 + streak, 60)

// "Hoje" no fuso de São Paulo, no formato AAAA-MM-DD.
export const todaySP = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

export const hourSP = (now = new Date()) =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' }).format(now))

const addDays = (day: string, n: number) => new Date(new Date(`${day}T12:00:00Z`).getTime() + n * DAY).toISOString().slice(0, 10)
const diffDays = (a: string, b: string) => Math.round((new Date(`${a}T12:00:00Z`).getTime() - new Date(`${b}T12:00:00Z`).getTime()) / DAY)

export function weekStart(day: string) {
  const d = new Date(`${day}T12:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7
  return addDays(day, -dow)
}

// Situação para mostrar: congelado (cristal usado ontem), em risco (sem ação hoje, depois das 20h), apagado.
export function displayState(s: MascotStatus, now = new Date()) {
  if (s.state === 'dimmed') return 'dimmed' as const
  if (s.freezesUsed.includes(addDays(s.today, -1)) && s.lastActiveDay !== s.today) return 'frozen' as const
  if (s.currentStreak > 0 && s.lastActiveDay !== s.today && hourSP(now) >= 20) return 'at_risk' as const
  return 'active' as const
}

export const activeToday = (s: MascotStatus) => s.lastActiveDay === s.today

// ---------- Motor local (modo demonstração) ----------

type Missions = Record<string, { progress: number; completed: boolean }>
export type LocalMascot = Omit<MascotStatus, 'today' | 'missions'> & { missionsByPeriod: Record<string, Missions> }

export const newLocalMascot = (): LocalMascot => ({
  xp: 0,
  stage: 1,
  currentStreak: 0,
  bestStreak: 0,
  lastActiveDay: null,
  freezeCrystals: 0,
  freezesUsed: [],
  state: 'active',
  relightProgress: 0,
  missionsByPeriod: {},
})

export function rollover(m: LocalMascot, today = todaySP()): LocalMascot {
  if (!m.lastActiveDay || m.currentStreak === 0 || diffDays(today, m.lastActiveDay) <= 1) return m
  const missed = diffDays(today, m.lastActiveDay) - 1
  if (m.freezeCrystals >= missed) {
    const used = Array.from({ length: missed }, (_, i) => addDays(m.lastActiveDay!, i + 1))
    return { ...m, freezeCrystals: m.freezeCrystals - missed, freezesUsed: [...m.freezesUsed, ...used].slice(-10), lastActiveDay: addDays(today, -1) }
  }
  const floor = stageOf(m.stage).xp
  return { ...m, currentStreak: 0, state: 'dimmed', relightProgress: 0, xp: Math.max(floor, m.xp - Math.floor((m.xp - floor) / 4)) }
}

export function touch(input: LocalMascot, kind: MascotEvent, amount = 1, shiny = false, today = todaySP()): LocalMascot {
  const m = { ...rollover(input, today), missionsByPeriod: { ...input.missionsByPeriod } }
  const dayk = `d:${today}`
  const week = `w:${weekStart(today)}`
  let gain = 0
  let crystal = 0

  if (m.lastActiveDay !== today) {
    m.currentStreak = m.lastActiveDay && diffDays(today, m.lastActiveDay) === 1 ? m.currentStreak + 1 : 1
    gain += dayXp(m.currentStreak)
    if (m.state === 'dimmed') {
      m.relightProgress += 1
      if (m.relightProgress >= 3) {
        m.state = 'active'
        m.relightProgress = 0
      }
    }
  }

  const progress = (period: string, id: string, n: number) => {
    const def = MISSIONS.find((x) => x.id === id)!
    const list = { ...(m.missionsByPeriod[period] ?? {}) }
    const cur = list[id] ?? { progress: 0, completed: false }
    const next = Math.min(def.target, cur.progress + n)
    const done = next >= def.target
    list[id] = { progress: next, completed: done }
    m.missionsByPeriod[period] = list
    if (done && !cur.completed) gain += def.xp
  }

  const n = Math.max(1, Math.min(amount, 99))
  if (kind === 'card_add') {
    progress(dayk, 'capture_cards', n)
    if (shiny) progress(week, 'collect_shiny', n)
  } else if (kind === 'scan') progress(dayk, 'scan_card', 1)
  else if (kind === 'wish_target') progress(week, 'wish_targets', 1)
  else if (kind === 'trade') progress(week, 'trade_any', 1)

  const d = m.missionsByPeriod[dayk] ?? {}
  if (!d.daily_bonus && d.capture_cards?.completed && d.scan_card?.completed) {
    m.missionsByPeriod[dayk] = { ...d, daily_bonus: { progress: 1, completed: true } }
    gain += DAILY_BONUS_XP
  }
  const w = m.missionsByPeriod[week] ?? {}
  if (!w.weekly_bonus && w.wish_targets?.completed && w.trade_any?.completed && w.collect_shiny?.completed) {
    m.missionsByPeriod[week] = { ...w, weekly_bonus: { progress: 1, completed: true } }
    crystal = 1
  }

  // Só guarda os períodos recentes.
  const keep = new Set([dayk, week])
  m.missionsByPeriod = Object.fromEntries(Object.entries(m.missionsByPeriod).filter(([k]) => keep.has(k)))

  const best = Math.max(m.bestStreak, m.currentStreak)
  const xp = m.xp + gain
  return {
    ...m,
    bestStreak: best,
    lastActiveDay: today,
    xp,
    freezeCrystals: Math.min(MAX_CRYSTALS, m.freezeCrystals + crystal),
    stage: Math.max(m.stage, stageFor(best, xp)),
  }
}

export function toStatus(m: LocalMascot, today = todaySP()): MascotStatus {
  const r = rollover(m, today)
  const { missionsByPeriod, ...rest } = r
  return { ...rest, today, missions: { ...(missionsByPeriod[`d:${today}`] ?? {}), ...(missionsByPeriod[`w:${weekStart(today)}`] ?? {}) } }
}
