/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        hud: {
          DEFAULT: 'rgb(var(--hud) / <alpha-value>)',
          ink: 'rgb(var(--hud-ink) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['Poppins', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 rgb(255 255 255 / 0.04) inset, 0 8px 24px -12px rgb(0 0 0 / 0.6)',
        glow: '0 0 0 1px rgb(var(--primary) / 0.4), 0 8px 32px -8px rgb(var(--primary) / 0.35)',
      },
      keyframes: {
        rise: {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        hudReveal: {
          '0%': { clipPath: 'inset(0 0 100% 0)', filter: 'brightness(1.6)' },
          '60%': { clipPath: 'inset(0 0 0 0)', filter: 'brightness(1.6)' },
          '70%': { filter: 'brightness(0.8)' },
          '80%, 100%': { clipPath: 'inset(0 0 0 0)', filter: 'brightness(1)' },
        },
        hudIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)', clipPath: 'inset(48% 0 48% 0 round 16px)' },
          '45%': { opacity: '1', clipPath: 'inset(0 0 0 0 round 16px)' },
          '55%': { opacity: '0.7' },
          '65%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'scale(1)', clipPath: 'inset(0 0 0 0 round 16px)' },
        },
      },
      animation: {
        rise: 'rise 400ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'hud-in': 'hudIn 700ms cubic-bezier(0.2, 0.8, 0.2, 1) 250ms both',
        'hud-reveal': 'hudReveal 650ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
    },
  },
  plugins: [],
}
