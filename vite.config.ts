import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const DAY = 24 * 60 * 60

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'PokeFlex — Coleção Pokémon',
        short_name: 'PokeFlex',
        description: 'Sua coleção de cartas Pokémon com preços em reais, vitrines e câmera para escanear cartas.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#0A0A0E',
        background_color: '#0A0A0E',
        categories: ['entertainment', 'lifestyle'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // A casca do app fica pronta offline; o motor de visão (14 MB) e o vídeo entram no cache só quando usados.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/opencv-*.js', 'card-index/**', 'intro/**'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === 'assets.tcgdex.net',
            handler: 'CacheFirst',
            options: {
              cacheName: 'cartas-imagens',
              expiration: { maxEntries: 4000, maxAgeSeconds: 60 * DAY },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'api.tcgdex.net' || url.hostname === 'api.frankfurter.dev',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'dados-cartas', expiration: { maxEntries: 600, maxAgeSeconds: DAY } },
          },
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/card-index/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'indice-camera' },
          },
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/opencv-.*\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'motor-visao', expiration: { maxEntries: 2 } },
          },
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/intro/'),
            handler: 'CacheFirst',
            options: { cacheName: 'intro', rangeRequests: true, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            // Arte do Fagulin: só a forma atual é baixada, e fica guardada.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/mascot/'),
            handler: 'CacheFirst',
            options: { cacheName: 'mascote', expiration: { maxEntries: 16, maxAgeSeconds: 365 * DAY } },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fontes', expiration: { maxEntries: 20, maxAgeSeconds: 365 * DAY } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    open: true,
    strictPort: false,
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    // O motor de visão (OpenCV) é grande por natureza e só carrega ao abrir a câmera.
    chunkSizeWarningLimit: 16000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
})
