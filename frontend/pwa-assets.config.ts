import {
  defineConfig,
  minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config'

// Membuat ikon PWA (favicon, apple-touch, 64/192/512, maskable) dari logo.svg.
// Jalankan: npm run generate-pwa-assets
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    maskable: { ...preset.maskable, resizeOptions: { background: '#6B3A2A' } },
    apple: { ...preset.apple, resizeOptions: { background: '#6B3A2A' } },
  },
  images: ['public/logo.svg'],
})
