import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Unique per build — used by ensureFreshAppShell to reclaim stale PWAs. */
const TPL_BUILD_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function emitBuildJson(): Plugin {
  return {
    name: 'tpl-emit-build-json',
    writeBundle(outputOptions) {
      const outDir = outputOptions.dir || path.resolve(__dirname, 'dist');
      writeFileSync(
        path.join(outDir, 'build.json'),
        JSON.stringify(
          {
            id: TPL_BUILD_ID,
            builtAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
    },
  };
}

export default defineConfig({
  define: {
    __TPL_BUILD_ID__: JSON.stringify(TPL_BUILD_ID),
  },
  plugins: [
    react(),
    tailwindcss(),
    emitBuildJson(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'icons/*.png', 'icons/*.svg'],
      manifest: {
        id: '/',
        name: 'Triumph Plaza Hotel Laundry',
        short_name: 'TPL Laundry',
        description: 'Luxury hotel laundry operations application',
        lang: 'en',
        dir: 'ltr',
        theme_color: '#050505',
        background_color: '#050505',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['business', 'productivity', 'utilities'],
        icons: [
          { src: 'icons/icon-72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-180.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Inventory',
            short_name: 'Inventory',
            description: 'Open laundry inventory',
            url: '/inventory',
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' }],
          },
          {
            name: 'Price List',
            short_name: 'Prices',
            description: 'Open laundry price list',
            url: '/price-list',
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' }],
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,webmanifest}'],
        // OneSignal owns /onesignal/* — keep it out of the PWA precache and SPA fallback.
        // build.json must stay NetworkOnly so stale shells can detect a newer deploy.
        globIgnores: ['**/onesignal/**', '**/build.json'],
        navigateFallbackDenylist: [/^\/onesignal\//, /\/build\.json$/i],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/build\.json$/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'tpl-build-id',
            },
          },
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'tpl-html-navigations',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2022',
    cssMinify: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/i18n/dictionaries.ts')) {
            return 'i18n';
          }

          if (id.includes('node_modules/@supabase')) {
            return 'supabase';
          }

          if (id.includes('node_modules/framer-motion')) {
            return 'motion';
          }

          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }

          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/react/')
          ) {
            return 'vendor';
          }
        },
      },
    },
  },
});
