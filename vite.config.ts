import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'manifest.json'],
      manifest: {
        name: 'Student Academic OS',
        short_name: 'Academic OS',
        description: 'Offline-first personal academic ERP — timetable, attendance, tasks, notes, exams.',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#0B0D12',
        theme_color: '#2563EB',
        icons: [
          // vite-plugin-pwa will serve icon.svg; for real PNG icons, add them to public/icons/
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        categories: ['education', 'productivity'],
        lang: 'en',
      },
      workbox: {
        // Cache all assets from the app shell
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Cache Dexie-served data by default — no remote API calls needed for Phase 1
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        // Prevent the service worker from swallowing navigation to external links
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        // Enable SW in development so offline behavior can be tested locally
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
