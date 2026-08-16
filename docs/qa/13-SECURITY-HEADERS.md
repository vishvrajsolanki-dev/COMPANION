# Security Headers & Content Security Policy Specification

**Project**: Academic OS (Student Academic Operating System)  
**Document**: `docs/qa/13-SECURITY-HEADERS.md`  
**Date**: August 16, 2026  
**Status**: AUDIT COMPLETE — REFINED SPECIFICATION ONLY (NOT APPLIED)  

---

## 1. Verified Runtime External Dependencies

A full audit of the production build graph, source files, asset declarations, and environment configuration revealed the following exact network and asset requirements:

1. **Origin Self (`'self'`)**: Local HTML app shell, Vite hashed JS chunks, CSS modules, self-hosted WOFF2 fonts (`/fonts/HankenGrotesk-*.woff2`, `/fonts/JetBrainsMono-600.woff2`), local SVG icons (`/icons/icon.svg`), and web manifest (`/manifest.json`). `[CONFIRMED]`
2. **Production Supabase Origin**:
   - HTTPS: `https://eyuevplcsfrgyqmzunni.supabase.co` (PostgREST API, Auth & RPC operations) `[CONFIRMED]`
   - WebSocket: `wss://eyuevplcsfrgyqmzunni.supabase.co` (Realtime subscription channel) `[CONFIRMED]`
3. **External Fonts (Google Fonts)**: **REMOVED / ZERO RUNTIME DEPENDENCY**. The project was fully migrated to self-hosted WOFF2 typography files located in `public/fonts/` and declared via `@font-face` in `src/styles/tokens.css`. Google Fonts domains (`fonts.googleapis.com` and `fonts.gstatic.com`) are not referenced or fetched anywhere in application runtime or production assets. `[CONFIRMED]`
4. **Third-Party Script & Analytics Origins**: **ZERO**. No external tracking, analytics, or third-party JS scripts exist in the project. `[CONFIRMED]`

---

## 2. Refined Narrow CSP Directive Matrix

| Directive | Narrow Allowed Sources | Justification & Technical Requirement |
|---|---|---|
| `default-src` | `'self'` | Secure default fallback for any unhandled asset type. `[CONFIRMED]` |
| `script-src` | `'self'` | Vite production JS chunks & SW registration. **No `'unsafe-inline'` or `'unsafe-eval'` required.** `[CONFIRMED]` |
| `style-src` | `'self' 'unsafe-inline'` | `'unsafe-inline'` is **demonstrably required** across 36 React component files for dynamic inline styles (e.g. `WeeklyGrid` positioning, subject color pills, progress bar percentages, `BottomSheet` heights). External font CSS domains removed. `[CONFIRMED]` |
| `font-src` | `'self'` | 100% of typography is served from local WOFF2 assets (`/fonts/*.woff2`). `https://fonts.gstatic.com` removed. `[CONFIRMED]` |
| `img-src` | `'self' data: blob:` | Local app icons (`/icons/icon.svg`), inline SVG data URIs, and dynamic file export blobs. `[CONFIRMED]` |
| `connect-src` | `'self' https://eyuevplcsfrgyqmzunni.supabase.co wss://eyuevplcsfrgyqmzunni.supabase.co` | **Exact production Supabase endpoint from `VITE_SUPABASE_URL`**. Broad wildcard (`https://*.supabase.co`) removed. `[CONFIRMED]` |
| `worker-src` | `'self' blob:` | PWA Workbox service worker (`/sw.js`) and background workers. `[CONFIRMED]` |
| `manifest-src` | `'self'` | Web app manifest (`/manifest.json`). `[CONFIRMED]` |
| `frame-ancestors` | `'none'` | Standalone ERP application; embedding in `<iframe>` is prohibited. `[CONFIRMED]` |
| `object-src` | `'none'` | Flash, Java, and legacy object plugins forbidden. `[CONFIRMED]` |
| `base-uri` | `'self'` | Prevents base tag hijacking attacks (`<base href="...">`). `[CONFIRMED]` |

---

## 3. Final Recommended Production CSP

Concrete, fully narrowed Content Security Policy header string:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://eyuevplcsfrgyqmzunni.supabase.co wss://eyuevplcsfrgyqmzunni.supabase.co; worker-src 'self' blob:; manifest-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';
```

---

## 4. Summary of CSP Directive Changes (What Was Removed)

1. **Removed `https://fonts.googleapis.com`** from `style-src` and `connect-src`: Application uses self-hosted WOFF2 fonts in `public/fonts/`.
2. **Removed `https://fonts.gstatic.com`** from `font-src` and `connect-src`: No external font binary downloads occur at runtime.
3. **Removed `data:` from `font-src`**: Local WOFF2 files are served directly via HTTP `/fonts/*.woff2`, eliminating the need for inline data URI font payloads.
4. **Replaced `https://*.supabase.co wss://*.supabase.co`** with exact origin `https://eyuevplcsfrgyqmzunni.supabase.co wss://eyuevplcsfrgyqmzunni.supabase.co`: Eliminates wildcard wildcard sub-domain exposure in `connect-src`.

---

## 5. Other HTTP Security Headers

| Security Header | Recommended Production Value | Classification |
|---|---|---|
| **Strict-Transport-Security** | `max-age=31536000; includeSubDomains; preload` | **P1** `[INFERRED]` |
| **X-Content-Type-Options** | `nosniff` | **P1** `[CONFIRMED]` |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | **P2** `[INFERRED]` |
| **Permissions-Policy** | `camera=(), microphone=(), geolocation=(), payment=()` | **P2** `[INFERRED]` |
| **X-Frame-Options** | `DENY` | **P1** `[CONFIRMED]` |

---

## 6. Deployment Platform Headers Config

### Vercel (`vercel.json` candidate)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://eyuevplcsfrgyqmzunni.supabase.co wss://eyuevplcsfrgyqmzunni.supabase.co; worker-src 'self' blob:; manifest-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

### Netlify (`_headers` candidate)
```text
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://eyuevplcsfrgyqmzunni.supabase.co wss://eyuevplcsfrgyqmzunni.supabase.co; worker-src 'self' blob:; manifest-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
```

---

## 7. Remaining CSP Uncertainties

1. **Staging / Preview Custom Domains**: If preview deployments on Vercel/Netlify use a different Supabase project or custom proxy domain, `connect-src` must include that domain for staging builds.
2. **Future External Asset Integration**: If third-party reporting, error tracking (e.g. Sentry), or external CDN assets are added in future milestones, `connect-src` or `script-src` will require explicit updates.

---

## 8. Status

**SPECIFICATION REFINED & VERIFIED — NOT APPLIED TO CODEBASE OR DEPLOYMENT PLATFORM.**
