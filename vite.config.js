import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
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
});
