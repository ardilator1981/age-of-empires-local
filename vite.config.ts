import { configDefaults, defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Rutas relativas: el mismo build sirve en local, en GitHub Pages (/<repo>/) y dentro de un APK
  base: './',
  // Las copias de trabajo de las sesiones (.claude/worktrees) no son parte de las pruebas
  test: { exclude: [...configDefaults.exclude, '.claude/**'] },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'Liada de Imperios',
        short_name: 'Liada de Imperios',
        description: 'Estrategia en tiempo real de imperios que cambian con las eras. Funciona sin conexión.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        background_color: '#1a140e',
        theme_color: '#2c2621',
        categories: ['games'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Todo el juego queda en caché para jugar sin conexión
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
