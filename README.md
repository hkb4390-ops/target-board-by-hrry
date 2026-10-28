# Target Board - Free Study Portal

Free board exam batches, video lectures and chapter notes.

```bash
npm install
npm run dev
npm run build
```

## API

| Use | Endpoint |
| --- | --- |
| Batches | `api.php?courses` |
| Class / subject / chapter tree | `api.php?courseid=<id>` |
| Video stream info | `api.php?video=<videoId>` |

Base: `https://studyapkmod.free.nf/tbapi/api.php` (change with `VITE_API_BASE`). Code: `src/services/tbApi.ts`.
The client tries direct → `?i=1` → same-origin `/tbapi` proxy (vite dev/preview) → `VITE_CORS_PROXY` → public CORS proxies.

## Configured endpoints

- `https://studyapkmod.free.nf/tbapi/api.php`
- `https://studyapkmod.free.nf/tbapi/api.php?courses`
- `https://studyapkmod.free.nf/tbapi/api.php?courseid=696f785373cd1e3b3306170c`
- `https://studyapkmod.free.nf/tbapi/api.php?video=B8qhf9zP4c7`

## Hosting (API proxy)

The free API host blocks browsers (CORS + bot-check), so the app calls `/tbapi/api.php` on its own domain and a tiny server function forwards it:

- Netlify: `netlify/functions/tbapi.js` (already wired in `netlify.toml`)
- Vercel: `api/tbapi.js` + `vercel.json`
- `npm run dev` / `npm run preview`: built into `vite.config.ts`
- Plain static hosting (GitHub Pages etc.) has no server, so the app falls back to public CORS proxies, which are unreliable.

Open `/api-test.html` on the running site to see what each API returns.

## Video / API fixes (v44)

- Course data now reads the video id from the `asset` field (it was ignored before, so the player asked the video API for a wrong id).
- Items listed both on a folder and in `catalog` are counted once (a chapter showed 40 videos instead of 20).
- Lesson ids are stable (video id / folder id), so player links keep working after a reload.
- `cloudflare/worker.js`: optional second proxy if InfinityFree blocks Vercel. Set `VITE_CORS_PROXY=https://YOUR-WORKER.workers.dev/?q=` in Vercel.
- `vercel.json` runs the proxy in Mumbai (`bom1`).


## STUDYMODSHRRY branding update
- Frontend: React + Vite. Main source is in `src/`.
- Branding/social URLs: `src/branding.ts`.
- Top banner and single home carousel banner: `src/pages/Home.tsx` (top banner is imported from branding).
- Video thumbnail/banner: `VIDEO_THUMBNAIL` in `src/branding.ts`.
- Liquid-glass styling and STUDYMODSHRRY watermark: `src/index.css`.

### Deploy with GitHub + Vercel
1. Create a new GitHub repository and upload the contents of this folder (the `tb` folder's contents, not its parent).
2. Import that repository into Vercel.
3. Framework preset: **Vite**; Build Command: `npm run build`; Output Directory: `dist`.
4. If using the API proxy, configure the environment variables described in `.env.example` in Vercel Project Settings.
5. Deploy. The repository includes `vercel.json` for SPA/API routing.

The original API/data flow has been retained. External lesson URLs are opened directly from the lesson row when the API provides an external `playerUrl`; other lessons fall back to the existing in-site player flow.
