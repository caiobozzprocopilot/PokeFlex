import { useId, useState, type CSSProperties, type PointerEvent } from 'react'
import { SHAPES } from '../gamification/GymBadge'
import { MASCOT_ART } from '../../data/mascotArt'

export type FagulinLook = 'active' | 'dimmed' | 'frozen' | 'at_risk'

// Cores do corpo por estágio: [claro, médio, escuro, chama da cabeça].
const PALETTES: [string, string, string, string][] = [
  ['#FFE08A', '#FF9F1C', '#E8590C', '#FFD60A'], // 1-2 (faísca)
  ['#FFE08A', '#FF9F1C', '#E8590C', '#FFD60A'], // 3
  ['#FFD08A', '#FF8A1C', '#D9480F', '#FFD60A'], // 4
  ['#FFC27A', '#FF7A1C', '#C92A2A', '#FFB703'], // 5
  ['#FFB27A', '#FF5F1F', '#B3001B', '#FFD60A'], // 6
  ['#FFB27A', '#FF4D1F', '#A10016', '#FFE066'], // 7
  ['#FFF4D6', '#FFB703', '#E85D04', '#FFFFFF'], // 8
  ['#FFD08A', '#FF7A3D', '#3A2D7A', '#FFE066'], // 9
  ['#FFE9A8', '#F59E0B', '#7C3AED', '#FFFFFF'], // 10
  ['#FFD6F5', '#E879F9', '#0E7490', '#B9FBFF'], // 11
  ['#FFF8D6', '#F472B6', '#6D28D9', '#B9FBFF'], // 12
]

const AURAS = ['#FFD60A', '#C084FC', '#22D3EE']

function flamePath(h: number, w: number) {
  return `M0 0 C ${w} ${-h * 0.35}, ${w * 0.4} ${-h * 0.75}, ${-w * 0.2} ${-h} C ${w * 0.1} ${-h * 0.65}, ${-w * 0.9} ${-h * 0.45}, ${-w * 0.6} 0 Z`
}

function Flame({ at, h, w, fill, stroke, animate, delay }: { at: string; h: number; w: number; fill: string; stroke?: string; animate?: string; delay?: number }) {
  return (
    <g transform={at}>
      <path d={flamePath(h, w)} fill={fill} stroke={stroke} strokeWidth={stroke ? 2 : undefined} className={animate} style={delay ? { animationDelay: `${delay}s` } : undefined} />
    </g>
  )
}

interface FagulinProps {
  stage: number
  look?: FagulinLook
  size?: number
  className?: string
  // Silhueta branca (animação de evolução).
  silhouette?: boolean
  still?: boolean
}

function FagulinSvg({ stage, look = 'active', size = 160, className = '', silhouette = false, still = false }: FagulinProps) {
  const uid = useId().replace(/:/g, '')
  const s = Math.max(1, Math.min(12, Math.round(stage)))
  const pal = PALETTES[Math.max(0, s - 2)]
  const dim = look === 'dimmed'
  const lively = !dim && !silhouette && !still
  const auras = dim ? 0 : s >= 12 ? 3 : s >= 10 ? 2 : s >= 7 ? 1 : 0
  const filter = silhouette ? 'brightness(0) invert(1)' : dim ? 'grayscale(0.9) brightness(0.65)' : undefined
  const id = (n: string) => `${n}-${uid}`

  return (
    <span className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} className="overflow-visible" style={{ filter }} aria-hidden>
        <defs>
          <radialGradient id={id('body')} cx="0.38" cy="0.32" r="0.85">
            <stop offset="0" stopColor={pal[0]} />
            <stop offset="0.55" stopColor={pal[1]} />
            <stop offset="1" stopColor={pal[2]} />
          </radialGradient>
          <radialGradient id={id('glow')} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={pal[1]} stopOpacity="0.55" />
            <stop offset="1" stopColor={pal[1]} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id('core')} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.4" stopColor={pal[3]} />
            <stop offset="1" stopColor={pal[3]} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id('metal')} x1="0" y1="0" x2="1" y2="1">
            {s >= 12 ? (
              <>
                <stop offset="0" stopColor="#B9FBFF" />
                <stop offset="0.5" stopColor="#FFE066" />
                <stop offset="1" stopColor="#F472B6" />
              </>
            ) : s >= 7 ? (
              <>
                <stop offset="0" stopColor="#FFF4B0" />
                <stop offset="1" stopColor="#B7790A" />
              </>
            ) : s >= 5 ? (
              <>
                <stop offset="0" stopColor="#FFFFFF" />
                <stop offset="1" stopColor="#7B8494" />
              </>
            ) : (
              <>
                <stop offset="0" stopColor="#F3C79B" />
                <stop offset="1" stopColor="#7A4520" />
              </>
            )}
          </linearGradient>
        </defs>

        {/* Brilho de fundo e auras */}
        {!dim && <circle cx="100" cy="112" r={60 + s * 3} fill={`url(#${id('glow')})`} />}
        {Array.from({ length: auras }, (_, i) => (
          <circle
            key={i}
            cx="100"
            cy="110"
            r={78 + i * 9}
            fill="none"
            stroke={AURAS[i]}
            strokeOpacity="0.5"
            strokeWidth="2"
            strokeDasharray={i === 1 ? '2 6' : i === 2 ? '10 8' : undefined}
            className={lively ? 'mascot-aura' : undefined}
            style={{ animationDelay: `${i * 0.6}s` }}
          />
        ))}

        {s <= 2 ? (
          <Egg stage={s} pal={pal} lively={lively} />
        ) : (
          <g className={lively ? 'mascot-bob' : undefined}>
            <g transform={`translate(100 118) scale(${0.62 + (s - 3) * 0.042})`}>
              {/* Anel solar (8+) */}
              {s >= 8 && (
                <circle r="78" cy="-12" fill="none" stroke={pal[3]} strokeWidth="5" strokeDasharray="4 7" opacity="0.8" className={lively ? 'mascot-spin' : undefined} />
              )}

              {/* Asas (7+) */}
              {s >= 7 && (
                <g opacity={s === 7 ? 0.55 : 0.92} className={lively ? 'mascot-wings' : undefined}>
                  {[-1, 1].map((d) => (
                    <path
                      key={d}
                      transform={`scale(${d} 1)`}
                      d={s >= 8 ? 'M-28 -6 C -110 -90, -150 -10, -96 46 C -82 18, -62 14, -36 22 Z' : 'M-30 -4 C -90 -60, -112 0, -72 38 C -60 18, -46 14, -32 20 Z'}
                      fill={s >= 9 ? `url(#${id('body')})` : pal[1]}
                      stroke={pal[2]}
                      strokeWidth="2"
                    />
                  ))}
                </g>
              )}

              {/* Juba de fogo (6+) */}
              {s >= 6 && (
                <g transform="translate(0 -14)">
                  {Array.from({ length: 12 }, (_, i) => (
                    <Flame key={i} at={`rotate(${i * 30}) translate(0 -40)`} h={26 + (i % 2) * 8} w={12} fill={i % 2 ? pal[2] : pal[1]} animate={lively ? 'mascot-flicker' : undefined} delay={(i % 4) * 0.15} />
                  ))}
                </g>
              )}

              {/* Cauda (4+) */}
              {s >= 4 && (
                <g transform="translate(34 34) rotate(-30)">
                  <path d="M0 0 C 26 -4, 40 -24, 34 -46 C 46 -30, 46 -6, 22 10 Z" fill={pal[1]} stroke={pal[2]} strokeWidth="2" />
                  <Flame at="translate(34 -46) scale(0.8)" h={24} w={10} fill={pal[3]} animate={lively ? 'mascot-flicker' : undefined} />
                </g>
              )}

              {/* Orelhas (4+) */}
              {s >= 4 &&
                [-1, 1].map((d) => (
                  <path key={d} transform={`scale(${d} 1)`} d="M-18 -34 L -40 -74 L -6 -44 Z" fill={pal[1]} stroke={pal[2]} strokeWidth="2" strokeLinejoin="round" />
                ))}

              {/* Pés */}
              {[-1, 1].map((d) => (
                <ellipse key={d} cx={d * 20} cy="56" rx="13" ry="8" fill={pal[2]} />
              ))}
              {s >= 5 &&
                [-1, 1].map((d) => (
                  <Flame key={`f${d}`} at={`translate(${d * 20} 58) scale(0.5)`} h={18} w={10} fill={pal[3]} animate={lively ? 'mascot-flicker' : undefined} />
                ))}

              {/* Corpo */}
              <path
                d="M0 -60 C 20 -34, 46 -16, 46 14 C 46 42, 25 60, 0 60 C -25 60, -46 42, -46 14 C -46 -16, -20 -34, 0 -60 Z"
                fill={`url(#${id('body')})`}
                stroke={pal[2]}
                strokeWidth="2.5"
              />
              <ellipse cx="0" cy="24" rx="26" ry="24" fill="#FFF3DC" opacity="0.85" />

              {/* Estrelas no corpo (9+) */}
              {s >= 9 &&
                [
                  [-28, -6],
                  [22, -18],
                  [30, 26],
                  [-18, 42],
                  [8, -34],
                ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 1.6 : 2.4} fill="#FFFFFF" opacity="0.9" />)}

              {/* Emblema / núcleo no peito */}
              {s >= 4 && (
                <path
                  d={SHAPES.octagon}
                  transform="translate(0 22) scale(0.3) translate(-32 -32)"
                  fill={`url(#${id('metal')})`}
                  stroke="#000"
                  strokeOpacity="0.3"
                  strokeWidth="3"
                />
              )}
              {s >= 10 && <circle cx="0" cy="22" r="16" fill={`url(#${id('core')})`} className={lively ? 'mascot-pulse' : undefined} />}
              {dim && <circle cx="0" cy="22" r="5" fill="#FF7A1C" className="mascot-ember" />}

              {/* Rosto */}
              {[-1, 1].map((d) => (
                <g key={d} transform={`translate(${d * 15} -4)`}>
                  <ellipse rx="6.5" ry={dim ? 1.6 : 8.5} fill="#1B1020" />
                  {!dim && <circle cx="2" cy="-3" r="2.4" fill="#FFFFFF" />}
                </g>
              ))}
              {!dim && [-1, 1].map((d) => <ellipse key={`c${d}`} cx={d * 28} cy="10" rx="6" ry="3.6" fill="#FF6B9A" opacity="0.55" />)}
              <path d={dim ? 'M-6 14 Q 0 10 6 14' : 'M-6 11 Q 0 17 6 11'} fill="none" stroke="#1B1020" strokeWidth="2.4" strokeLinecap="round" />

              {/* Chama da cabeça */}
              {!dim ? (
                <Flame at="translate(4 -54)" h={28 + s * 2.5} w={13 + s * 0.6} fill={pal[3]} stroke={pal[1]} animate={lively ? (look === 'at_risk' ? 'mascot-weak' : 'mascot-flicker') : undefined} />
              ) : (
                <path transform="translate(2 -56)" d="M0 0 C 4 -4, 2 -10, -1 -12 C 0 -7, -5 -5, -3 0 Z" fill="#6B7280" />
              )}

              {/* Coroa de doze chamas (12) */}
              {s >= 12 &&
                Array.from({ length: 12 }, (_, i) => {
                  const a = ((-75 + i * (150 / 11)) * Math.PI) / 180
                  return (
                    <Flame key={i} at={`translate(${Math.sin(a) * 74} ${-34 - Math.cos(a) * 74}) rotate(${(a * 180) / Math.PI}) scale(0.55)`} h={22} w={10} fill={AURAS[i % 3]} animate={lively ? 'mascot-flicker' : undefined} delay={(i % 5) * 0.12} />
                  )
                })}
            </g>

            {/* Runas (6+) e constelação (11+) em volta */}
            {s >= 6 && !dim && (
              <g className={lively ? 'mascot-spin' : undefined} style={{ transformOrigin: '100px 112px' }}>
                {Array.from({ length: s >= 9 ? 6 : 4 }, (_, i) => {
                  const a = (i / (s >= 9 ? 6 : 4)) * Math.PI * 2
                  return <circle key={i} cx={100 + Math.cos(a) * 84} cy={112 + Math.sin(a) * 84} r="3" fill={pal[3]} />
                })}
              </g>
            )}
            {s >= 11 && !dim && (
              <g stroke="#B9FBFF" strokeOpacity="0.55" strokeWidth="1.2" fill="#FFFFFF">
                <polyline points="22,60 48,38 70,52 60,24" fill="none" />
                <polyline points="178,64 150,40 132,58 146,22" fill="none" />
                {[
                  [22, 60],
                  [48, 38],
                  [70, 52],
                  [60, 24],
                  [178, 64],
                  [150, 40],
                  [132, 58],
                  [146, 22],
                ].map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r="2.2" stroke="none" />
                ))}
              </g>
            )}
          </g>
        )}

        {/* Faíscas subindo */}
        {lively &&
          Array.from({ length: 5 + Math.min(s, 7) }, (_, i) => (
            <circle
              key={`e${i}`}
              cx={60 + ((i * 37) % 80)}
              cy="150"
              r={1.5 + (i % 3) * 0.7}
              fill={i % 3 ? pal[1] : pal[3]}
              className="mascot-spark"
              style={{ animationDelay: `${(i * 0.43) % 2.4}s`, animationDuration: `${2 + (i % 4) * 0.4}s` }}
            />
          ))}

        {/* Bloco de gelo (cristal usado) */}
        {look === 'frozen' && !silhouette && (
          <g>
            <rect x="34" y="34" width="132" height="146" rx="18" fill="#A5F3FC" fillOpacity="0.28" stroke="#CFFAFE" strokeWidth="3" />
            <path d="M48 52 L 70 44 M 52 66 L 60 62 M 148 150 L 156 164" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
          </g>
        )}
      </svg>
    </span>
  )
}

// Estágio 1: ovo rachado com brasa; estágio 2: a Centelha saindo das cascas.
function Egg({ stage, pal, lively }: { stage: number; pal: string[]; lively: boolean }) {
  const shell = 'M100 50 C 134 50, 152 100, 152 128 C 152 158, 129 178, 100 178 C 71 178, 48 158, 48 128 C 48 100, 66 50, 100 50 Z'
  return (
    <g>
      {stage === 1 ? (
        <g className={lively ? 'mascot-bob' : undefined}>
          <path d={shell} fill="#3A2216" stroke="#1A0E08" strokeWidth="3" />
          <ellipse cx="82" cy="86" rx="12" ry="18" fill="#FFFFFF" opacity="0.08" transform="rotate(-20 82 86)" />
          <path
            d="M70 104 L 84 118 L 96 102 L 108 122 L 122 106 L 132 118"
            fill="none"
            stroke={pal[1]}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={lively ? 'mascot-pulse' : undefined}
            style={{ filter: `drop-shadow(0 0 6px ${pal[1]})` }}
          />
          <path d="M100 140 L 92 154 L 102 166" fill="none" stroke={pal[1]} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
        </g>
      ) : (
        <g>
          <path d="M52 150 C 52 176, 76 186, 98 184 L 92 166 L 80 172 L 72 156 L 60 160 Z" fill="#3A2216" stroke="#1A0E08" strokeWidth="2" />
          <path d="M148 150 C 148 176, 124 186, 102 184 L 108 166 L 120 172 L 128 156 L 140 160 Z" fill="#3A2216" stroke="#1A0E08" strokeWidth="2" />
          <g className={lively ? 'mascot-bob' : undefined}>
            <circle cx="100" cy="112" r="34" fill={pal[1]} opacity="0.3" />
            <circle cx="100" cy="112" r="24" fill={pal[0]} stroke={pal[1]} strokeWidth="3" />
            <Flame at="translate(102 92)" h={24} w={10} fill={pal[3]} animate={lively ? 'mascot-flicker' : undefined} />
            <ellipse cx="92" cy="112" rx="3.8" ry="5.2" fill="#1B1020" />
            <ellipse cx="108" cy="112" rx="3.8" ry="5.2" fill="#1B1020" />
            <circle cx="93.4" cy="110.2" r="1.4" fill="#FFF" />
            <circle cx="109.4" cy="110.2" r="1.4" fill="#FFF" />
            <path d="M95 120 Q 100 125 105 120" fill="none" stroke="#1B1020" strokeWidth="2" strokeLinecap="round" />
          </g>
        </g>
      )}
    </g>
  )
}

// ---------- Forma com arte (imagem) ----------

const GLOW = ['#FF8A1C', '#FF8A1C', '#FF7A1C', '#FF6A1C', '#FF5F1F', '#FF4D1F', '#FF3D1F', '#FF5F1F', '#FFB703', '#FF3D6E', '#FFC93C', '#FFD27A']

// Camadas em profundidade (brilho atrás, criatura no meio, faíscas na frente) com inclinação 3D ao toque.
function FagulinArt({ src, stage, look = 'active', size = 160, className = '', silhouette = false, still = false }: FagulinProps & { src: string }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const dim = look === 'dimmed'
  const lively = !dim && !silhouette && !still
  const glow = GLOW[Math.max(0, Math.min(11, stage - 1))]
  const filter = silhouette ? 'brightness(0) invert(1)' : dim ? 'grayscale(0.85) brightness(0.6)' : undefined
  // O reflexo de luz usa a própria imagem como máscara: só passa por cima do bicho.
  const mask = {
    maskImage: `url(${src})`,
    WebkitMaskImage: `url(${src})`,
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
  } as CSSProperties

  const onMove = (e: PointerEvent<HTMLSpanElement>) => {
    if (!lively) return
    const r = e.currentTarget.getBoundingClientRect()
    setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -18, y: ((e.clientX - r.left) / r.width - 0.5) * 22 })
  }

  return (
    <span
      className={`relative inline-block touch-pan-y ${className}`}
      style={{ width: size, height: size, perspective: size * 3.2 }}
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <span
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{ transformStyle: 'preserve-3d', transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <span className={`absolute inset-0 ${lively ? 'mascot-sway' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
          {!silhouette && !dim && (
            <span
              aria-hidden
              className={`absolute inset-[14%] rounded-full blur-2xl ${lively ? 'mascot-glow' : ''}`}
              style={{ background: `radial-gradient(circle, ${glow}99, transparent 70%)`, transform: `translateZ(-${size * 0.25}px)` }}
            />
          )}
          {!silhouette && (
            <span
              aria-hidden
              className={`absolute bottom-[4%] left-1/2 h-[7%] w-[44%] rounded-[50%] bg-black/55 blur-md ${lively ? 'mascot-shadow' : ''}`}
              style={{ transform: `translateX(-50%) translateZ(-${size * 0.05}px)` }}
            />
          )}
          <span className={`absolute inset-0 ${lively ? 'mascot-bob' : ''}`} style={{ transform: `translateZ(${size * 0.12}px)` }}>
            <img
              src={src}
              alt=""
              draggable={false}
              className={`absolute inset-0 h-full w-full select-none object-contain ${lively ? (look === 'at_risk' ? 'mascot-breathe mascot-weak-img' : 'mascot-breathe') : ''}`}
              style={{ filter }}
            />
            {lively && <span aria-hidden className="mascot-shine absolute inset-0" style={mask} />}
          </span>
          {lively && (
            <svg
              viewBox="0 0 200 200"
              className="pointer-events-none absolute inset-0 overflow-visible"
              style={{ transform: `translateZ(${size * 0.3}px)` }}
              aria-hidden
            >
              {Array.from({ length: 6 + Math.min(stage, 8) }, (_, i) => (
                <circle
                  key={i}
                  cx={52 + ((i * 41) % 96)}
                  cy="168"
                  r={1.4 + (i % 3) * 0.8}
                  fill={i % 3 ? glow : '#FFE066'}
                  className="mascot-spark"
                  style={{ animationDelay: `${(i * 0.37) % 2.4}s`, animationDuration: `${2 + (i % 4) * 0.45}s` }}
                />
              ))}
            </svg>
          )}
          {dim && (
            <span
              aria-hidden
              className="mascot-ember absolute left-1/2 top-[58%] h-3 w-3 -translate-x-1/2 rounded-full bg-[#FF7A1C] shadow-[0_0_14px_4px_rgba(255,122,28,0.7)]"
            />
          )}
          {look === 'frozen' && !silhouette && (
            <span
              aria-hidden
              className="absolute inset-[12%] rounded-[22%] border-[3px] border-[#CFFAFE]/80 bg-[#A5F3FC]/25 shadow-[inset_0_0_30px_rgba(207,250,254,0.5)]"
              style={{ transform: `translateZ(${size * 0.35}px)` }}
            />
          )}
        </span>
      </span>
    </span>
  )
}

export function Fagulin(props: FagulinProps) {
  const src = MASCOT_ART[Math.max(1, Math.min(12, Math.round(props.stage)))]
  return src ? <FagulinArt {...props} src={src} /> : <FagulinSvg {...props} />
}
