import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const adsenseClientId = env.VITE_ADSENSE_CLIENT_ID || '';
  const adsenseEnabled = adsenseClientId && !adsenseClientId.includes('XXXX');

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
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        simulator: resolve(__dirname, 'simulator.html'),
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
        next();
      });
    },
  },
  };
});
