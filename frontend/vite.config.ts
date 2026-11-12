import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * R1.5: semua variabel VITE_* ikut masuk bundle publik. Bila ada service_role/secret key
 * di situ, hentikan build/dev server supaya key tidak pernah bocor ke browser.
 */
function assertNoSecretKeys(env: Record<string, string>): void {
  for (const [name, raw] of Object.entries(env)) {
    const value = raw.trim()
    let jwtRole: unknown = null
    const parts = value.split('.')
    if (parts.length === 3) {
      try {
        jwtRole = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).role
      } catch {
        jwtRole = null
      }
    }
    if (/service_role|secret/i.test(name) || value.startsWith('sb_secret_') || jwtRole === 'service_role') {
      throw new Error(
        `[Send Food] ${name} berisi service_role/secret key. Key ini akan bocor ke bundle publik. ` +
          'Hapus dari .env; frontend hanya boleh memakai anon/publishable key.',
      )
    }
  }
}

const noSecretKeys = (): Plugin => ({
  name: 'sendfood-no-secret-keys',
  config(config, { mode }) {
    assertNoSecretKeys(loadEnv(mode, config.envDir || process.cwd(), 'VITE_'))
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    noSecretKeys(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        name: 'Send Food — Pesan Antar Desa',
        short_name: 'Send Food',
        description: 'Pesan makanan dari warung desa, bayar di tempat (COD).',
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFF9EE',
        theme_color: '#6B3A2A',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // SPA: semua navigasi dilayani index.html, kecuali panggilan API.
        navigateFallback: '/index.html',
        // Jangan cache respons Supabase (data pesanan harus selalu segar).
        runtimeCaching: [],
      },
    }),
  ],
})
