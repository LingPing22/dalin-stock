import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// ─────────────────────────────────────────────────────────────
//  ສຳຄັນສຳລັບ GitHub Pages
//  base: './'  = ໃຊ້ທີ່ຢູ່ໄຟລ໌ແບບ "ສົມທຽບ" (relative)
//  → ເອົາຂຶ້ນ repo ຊື່ຫຍັງກໍ່ໄດ້ (https://<user>.github.io/<ຊື່-repo>/)
//    ໂດຍບໍ່ຕ້ອງແກ້ຊື່ repo ໃນໄຟລ໌ນີ້ ແລະ ບໍ່ຂຶ້ນໜ້າຂາວ / 404
//  ແອັບນີ້ໃຊ້ການສະຫຼັບໜ້າແບບ #hash (ເຊັ່ນ .../#/lots) ຈຶ່ງບໍ່ມີບັນຫາ
//  Not Found ຕອນກົດ Refresh.
//  ຖ້າຢາກລະບຸແບບຕາຍຕົວ ໃຫ້ປ່ຽນເປັນ base: '/<ຊື່-repo>/'
// ─────────────────────────────────────────────────────────────
const APP_NAME = 'Dalin Stock — ສະຕັອກລັອດ & ຄືນທຶນ'
const SHORT_NAME = 'Dalin Stock'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: APP_NAME,
        short_name: SHORT_NAME,
        description: 'ບັນທຶກລັອດສິນຄ້າ, ຂາຍດ່ວນ ແລະ ເບິ່ງຈຸດຄືນທຶນ — ໃຊ້ໄດ້ບໍ່ຕ້ອງມີເນັດ',
        lang: 'lo',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#EEF2F0',
        theme_color: '#173F6B',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
