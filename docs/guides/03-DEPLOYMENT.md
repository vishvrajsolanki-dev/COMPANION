# Deploying Student Academic OS — Cloudflare Pages

Static PWA + managed Supabase. Deployment is a single command once you've
logged in once. The app has **no URL routes** (zustand-driven subviews), so no
SPA rewrite rules are needed — `index.html` at the root is the whole app.

## Prereqs

- Node 18+ (the build needs it)
- A free Cloudflare account
- `.env.local` present with the two `VITE_*` vars (already the case in this repo)

## One-time setup

1. **Log in to Cloudflare** (interactive — opens a browser):
   ```
   npx wrangler login
   ```
2. **Create the Pages project** (first deploy only):
   ```
   npx wrangler pages project create student-academic-os
   ```
   Answer the prompts: production branch → `main`, no GitHub integration needed.

## Deploy (every release)

```
npm run build        # tsc + vite build → dist/, inlines the VITE_* vars from .env.local
npx wrangler pages deploy dist --project-name student-academic-os
```

Live URL: `https://student-academic-os.pages.dev`

## Environment variables

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are **baked into the bundle at
build time**, so:

- **Direct-upload deploys** (the flow above) build locally → they inherit the
  values already in `.env.local`. No dashboard setup needed.
- **Git-integrated / CI builds** (Pages builds in the cloud) must have these two
  vars set in the dashboard: **Settings → Environment variables** — or in the
  `[vars]` block of `wrangler.toml`.

`VERIFY_OWNER_KEY` is a **dev-only** variable for `scripts/`. It is never needed
by the deployed app and must never be set on Pages.

## Automated deploys (CI/CD)

`.github/workflows/ci.yml` runs on every push/PR to `main`:

1. **Test & build** — `npm ci`, `npm run build` (tsc + vite), `npm test` (vitest). This is the quality gate.
2. **Deploy** (main only) — rebuilds with the CI env vars, then publishes `dist/`
   to Cloudflare Pages via `cloudflare/pages-action@v1`.

For the deploy job to work, the repo needs these **secrets**
(Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (My Profile → API Tokens → Create Token → "Edit Cloudflare Workers", or custom: Account › Cloudflare Pages › **Edit**) |
| `CLOUDFLARE_ACCOUNT_ID` | `002adda401224c1cb17f5b5d2995a91c` (from `wrangler whoami`) |
| `VITE_SUPABASE_URL` | From `.env.local` |
| `VITE_SUPABASE_ANON_KEY` | From `.env.local` |

> The two `VITE_*` values are public by design (anon key + project URL), but
> storing them as secrets keeps the workflow copyable without leaking them.
> `VERIFY_OWNER_KEY` is never a CI/GitHub value.

Alternative: Cloudflare's native GitHub integration (dashboard → Pages → your
project → Settings → Builds & deployments → Connect Git) can also build + deploy
on push; the Actions workflow above is the in-repo equivalent.

## Verifying a deploy

1. Open `https://student-academic-os.pages.dev` — activation gate should render.
2. DevTools → Application → Service Workers: `sw.js` should be active.
3. DevTools → Application → Manifest: `manifest.webmanifest` should load.
4. Activate with a throwaway temp key (minted by an admin) — the account card
   should appear, proving the anon-key RPC reaches Supabase over HTTPS.

## Security headers & CORS (Networking)

**Security headers** ship with every deploy via `public/_headers`, which Vite
copies into `dist/_headers` and Cloudflare Pages applies to every response:

- `Content-Security-Policy` — locked to first-party assets only:
  - `script-src 'self'` — no inline scripts, no `unsafe-inline`, no eval.
  - `style-src 'self' 'unsafe-inline'` + Google Fonts CSS (`unsafe-inline` is
    required because the React views use inline `style={{}}` props).
  - `font-src`/`img-src` allow the Google Fonts hosts + `data:`/`blob:`.
  - `connect-src` allows only the app itself, the Supabase host (`*.supabase.co`,
    REST + future realtime), and the Google Fonts preconnect hosts.
  - `frame-ancestors 'none'` + `X-Frame-Options: DENY` — the app can't be
    iframed (clickjacking).
  - `base-uri`, `form-action`, `object-src` pinned to `'self'`/`none`.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `Permissions-Policy` (camera/mic/geolocation/payment/usb all disabled),
  `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy:
  same-origin`.

This is deliberately header-based (not a `<meta>` tag) so local `vite dev`
(HMR/React-refresh) is unaffected — CSP applies only in production.

> To verify the headers on a live deploy, `scripts/verify-live-deploy.cjs`
> fetches the root response and asserts the CSP + nosniff/referrer/frame headers.

**CORS on Supabase.** The browser calls `supabase.rpc(...)` straight to the
Supabase REST endpoint (`*.supabase.co`), so the Supabase project must allow
this origin. Supabase's hosted Data API answers `Access-Control-Allow-Origin:
*` and **does not expose any per-origin CORS allow-list** — origin restriction
is not available at the Data API layer (checked 2026-08-08 against the Supabase
docs: the API guide documents the model as "Postgres RLS provisioned behind a
key-auth gateway", and the API-keys guide marks the anon/publishable key "safe
to expose online … web page, mobile or desktop app"; neither mentions any
origin/CORS setting). The Settings → Auth → URL Configuration panel only covers
Auth redirects (OAuth/email), not the Data API.

So the browser-facing security boundary is not an origin allow-list — it is:

1. **RLS + key-auth on Postgres** — every table has RLS with zero
   `anon`/`authenticated` policies; the only data paths are SECURITY DEFINER
   RPCs that self-verify an access key before doing anything. The anon key is
   public by design and cannot read anything on its own.
2. **`connect-src` in the CSP** (above) is already scoped to `*.supabase.co` —
   a browser visiting this app cannot be tricked into exfiltrating to any other
   host, and the app itself is the only intended caller.

Any website can still *attempt* an RPC to `*.supabase.co` — that is inherent to
Supabase's model and why the RPCs never trust the caller's origin. The access
key is the authorization check, and RLS/grants stop everything else.

## How a release reaches students

`npm run build` produces a content-hashed bundle; the service worker precaches
the app shell so the app works offline after first visit. Bump the version and
redeploy; existing clients pick up the new SW on `autoUpdate` reload.
