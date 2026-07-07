import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const adsenseClientId = env.VITE_ADSENSE_CLIENT_ID || '';
  const adsenseEnabled = adsenseClientId && !adsenseClientId.includes('XXXX');
  const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
  const appVersion = pkg.version;

  return {
  root: '.',
  plugins: [
    {
      name: 'adsense-inject',
      transformIndexHtml(html) {
        if (!adsenseEnabled) return html;
        const tag = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}" crossorigin="anonymous"></script>`;
        return html.replace('</head>', `  ${tag}\n</head>`);
      },
    },
    {
      name: 'version-inject',
      transformIndexHtml(html) {
        const tag = `<div class="app-version">v${appVersion}</div>`;
        return html.replace('</body>', `  ${tag}\n</body>`);
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        simulator: resolve(__dirname, 'simulator.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
  server: {
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Rewrite /simulator → /simulator.html in dev mode (matches Firebase Hosting rewrite)
        if (req.url === '/simulator' || req.url === '/simulator/') {
          req.url = '/simulator.html';
        }
        if (req.url === '/admin' || req.url === '/admin/') {
          req.url = '/admin.html';
        }
        next();
      });
    },
  },
  };
});
