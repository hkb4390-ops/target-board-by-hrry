import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {createRequire} from 'module';

const {fetchTb} = createRequire(import.meta.url)('./proxy/tbproxy.cjs');

// /tbapi/* -> studyapkmod.free.nf, with the host's bot-check solved server-side (dev + preview)
const tbApiPlugin = (): Plugin => {
  const mw = async (req: any, res: any, next: any) => {
    if (!req.url || !req.url.startsWith('/tbapi')) return next();
    try {
      const body = await fetchTb(req.url.split('?')[1] || '');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(body);
    } catch (e: any) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({error: String(e?.message || e)}));
    }
  };
  return {
    name: 'tbapi-proxy',
    configureServer: (s) => { s.middlewares.use(mw); },
    configurePreviewServer: (s) => { s.middlewares.use(mw); },
  };
};

export default defineConfig(() => {
  return {
    plugins: [tbApiPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
