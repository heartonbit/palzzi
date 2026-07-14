import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import http from 'http';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const adsenseClientId = env.VITE_ADSENSE_CLIENT_ID || '';
  const adsenseEnabled = adsenseClientId && !adsenseClientId.includes('XXXX');
  const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
  const appVersion = pkg.version;

  // Firebase Emulator auto-detection:
  // When running via `firebase emulators:exec "npm run dev"`, the CLI sets
  // FIRESTORE_EMULATOR_HOST etc. for the child process. Vite only exposes
  // VITE_* env vars to the browser, so we inject these via `define` so the
  // Firebase JS SDK's getDefaultEmulatorHostnameAndPort() can find them.
  const define = {};
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    define['process.env.FIRESTORE_EMULATOR_HOST'] = JSON.stringify(process.env.FIRESTORE_EMULATOR_HOST);
  }
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    define['process.env.FIREBASE_AUTH_EMULATOR_HOST'] = JSON.stringify(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  }

  return {
  root: '.',
  define,
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
      // Inject dynamic OG tags for /simulator?d=<docId>
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const docId = url.searchParams.get('d');
        const isSimulator = url.pathname === '/simulator' || url.pathname === '/s';

        if (isSimulator && docId && /^[A-Za-z0-9]+$/.test(docId)) {
          const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8088';
          const firestoreUrl = `http://${firestoreHost}/v1/projects/palzzilab/databases/(default)/documents/patterns/${docId}`;

          http.get(firestoreUrl, (fireRes) => {
            let data = '';
            fireRes.on('data', chunk => data += chunk);
            fireRes.on('end', () => {
              let html = readFileSync(resolve(__dirname, 'simulator.html'), 'utf-8');
              try {
                const doc = JSON.parse(data);
                const name = (doc.fields?.nameKo?.stringValue) || (doc.fields?.templateName?.stringValue) || 'Palzzi Pattern';
                const origin = `http://${req.headers.host}`;
                const imageUrl = `${origin}/img/${docId}`;

                const ogTags = `<meta property="og:type" content="article">
<meta property="og:title" content="${name} — Palzzi">
<meta property="og:description" content="Palzzi 쿠미히모 팔찌 패턴 — 시뮬레이터에서 열어보세요!">
<meta property="og:image" content="${imageUrl}">
<meta property="og:url" content="${origin}/simulator?d=${docId}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${name} — Palzzi">
<meta name="twitter:image" content="${imageUrl}">`;

                html = html.replace('<head>', `<head>\n${ogTags}`);
              } catch (e) {
                // Pattern not found, serve without OG injection
              }
              res.setHeader('Content-Type', 'text/html');
              res.end(html);
            });
          }).on('error', () => next());
          return;
        }

        // Rewrite short share URL and page routes in dev mode
        if (req.url === '/s' || req.url.startsWith('/s?')) {
          req.url = '/simulator.html' + req.url.slice(2);
        }
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
