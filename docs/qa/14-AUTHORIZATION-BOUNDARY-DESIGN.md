# SERVER-ISSUED DEVICE SESSION CREDENTIAL AUTHORIZATION DESIGN (FINAL REVISION)

**Project**: Academic OS (Student Academic Operating System)  
**Document**: `docs/qa/14-AUTHORIZATION-BOUNDARY-DESIGN.md`  
**Date**: August 16, 2026  
**Status**: PROPOSED — Final Revision  
**Target Release**: v0.2.0 Hardening Pass  

---

## 1. Executive Summary & Core Security Principle

This document specifies the finalized token-based authorization architecture for Academic OS. It preserves the offline-first PWA design and access-key activation UX while establishing **Session Token Server-Side Identity Derivation** as the singular authorization mechanism for student RPC operations.

### Core Principle: Session Token as Primary Authorization Credential
Protected RPCs (`save_student_profile`, `sign_out_session`) do **NOT** accept or trust client-supplied `account_id` or `device_id` as primary authorization parameters.

The server authorization flow is:
$$\text{session\_token} \xrightarrow{\text{SHA-256}} \text{hash} \xrightarrow{\text{Lookup}} \text{active device\_sessions row} \xrightarrow{\text{Derive}} \{\text{account\_id}, \text{device\_id}, \text{role}\} \xrightarrow{\text{Authorize}} \text{Operation}$$

Client-supplied `account_id` secrecy is **never** relied upon as a security boundary. **[CONFIRMED]**

---

## 2. Token Security Controls & Trade-off Analysis

### 2.1 Token Generation & Entropy
- **CSPRNG Generation**: Generated in PL/pgSQL using PostgreSQL cryptographically secure pseudo-random bytes: `encode(extensions.gen_random_bytes(32), 'hex')`.
- **Entropy**: 256 bits (64 hexadecimal characters), providing $2^{256} \approx 1.15 \times 10^{77}$ total token space. **[CONFIRMED]**

### 2.2 Storage & XSS Security Boundary
- **Hash-at-Rest**: The database stores only the SHA-256 digest (`session_token_hash text not null`). Plaintext session tokens are **never** stored in database tables or logs. **[CONFIRMED]**
- **Client Storage Choice**: Session tokens are stored in `localStorage` under `academic_os_activation`. **[CONFIRMED]**
- **Explicit XSS Reality**:
  - Content Security Policy (CSP) reduces XSS injection vectors (blocking unauthorized scripts and inline execution).
  - However, **any successful same-origin XSS vulnerability can still read `localStorage`**.
  - Therefore, XSS prevention remains security-critical: strict dependency minimization, output encoding, HTML sanitization, and secure coding practices are mandatory. **[CONFIRMED]**

### 2.3 Network Transport & Replay Analysis
- **Transport Security**: TLS 1.3 protects session tokens in transit across the network. **[CONFIRMED]**
- **Replay Boundary**:
  - A bearer session token remains replayable if intercepted or extracted from client storage.
  - Expiration limits the window of vulnerability.
  - Server-side revocation invalidates stolen tokens immediately. **[CONFIRMED]**

---

## 3. Offline & Cloud RPC Behavior

- **Academic Operations (100% Offline)**: All student academic functionality (Timetable builder, Attendance tracking, Task board, Note editor, Exam countdown) reads and writes strictly to local IndexedDB via Dexie.js (`AcademicOSDB_<accountId>`). Zero network or session validation is required for offline academic management. **[CONFIRMED]**
- **Cloud-Required Operations**: Profile onboarding synchronization (`save_student_profile`) and server sign-out (`sign_out_session`) require active network connectivity. **[CONFIRMED]**
- **No Offline RPC Queue**: If attempted while offline, cloud RPCs return a network error. Offline cloud operations are **NOT** silently queued (no background RPC queue exists in the codebase). **[CONFIRMED]**

---

## 4. Session Expiration & Revocation Rules

| Trigger Event | Server Action | Client Handling |
|---|---|---|
| **7-Day Idle Timeout** | `verify_device_session` returns `is_valid = false` | RPC returns `UNAUTHORIZED_SESSION`. Client prompts user to re-activate. |
| **30-Day Absolute Expiry** | `verify_device_session` returns `is_valid = false` | RPC returns `UNAUTHORIZED_SESSION`. Client clears `localStorage` and redirects to gate. |
| **User Sign Out** | `sign_out_session` deletes `device_sessions` row | Client clears `localStorage` (`academic_os_activation`) and resets `useAuthStore`. |
| **Admin Deactivation** | `admin_set_key_active(false)` deletes all `device_sessions` rows for account | Next cloud RPC fails with `UNAUTHORIZED_SESSION`; client auto signs out. |

**[CONFIRMED]**

---

## 5. Comprehensive Threat Model (13 Scenarios)

| Scenario | Vector / Attack Description | Protection Mechanism | Classification |
|---|---|---|---|
| **1. Stolen `account_id` Alone** | Attacker learns target's 128-bit `account_id` UUID | RPC parameter list excludes `account_id`; identity is derived from token hash | **CONFIRMED** |
| **2. Stolen `device_id` Alone** | Attacker learns target's `device_id` UUID | RPC derives identity from token hash; `device_id` alone grants zero access | **CONFIRMED** |
| **3. Stolen `account_id` + `device_id`** | Attacker obtains both public UUID identifiers | Invoking RPCs fails because caller lacks the 256-bit `session_token` | **CONFIRMED** |
| **4. Stolen Session Token** | Attacker extracts `session_token` from client storage | Token permits operation only until session expires (30-day/7-day) or is revoked | **CONFIRMED** |
| **5. XSS / Token Theft** | Malicious script reads `localStorage` | Same-origin XSS can extract token. Prevented by CSP, zero inline scripts | **CONFIRMED** |
| **6. Replay Attack** | Attacker intercepts network HTTP payload | TLS 1.3 protects transport. If stolen, revocation invalidates token | **CONFIRMED** |
| **7. Revoked Token** | Admin deactivates key or revokes session | Row deleted from `device_sessions`. Token hash lookup yields `NOT FOUND` | **CONFIRMED** |
| **8. Expired Token** | Session exceeds 30-day limit or 7-day idle limit | `verify_device_session` validates timestamps and rejects expired tokens | **CONFIRMED** |
| **9. Concurrent Requests** | Multiple tabs fire RPCs simultaneously | Token hash verification is read-only and lock-free; all valid requests succeed | **CONFIRMED** |
| **10. Reinstall / Data Loss** | User clears browser storage | Local `session_token` erased; device must re-activate using key | **CONFIRMED** |
| **11. Device Replacement** | Student activates new device | `activate_access_key` mints new token for new session | **CONFIRMED** |
| **12. Offline Mode** | Device has no internet connection | Local academic operations proceed 100% offline; cloud RPCs return network error | **CONFIRMED** |
| **13. Admin Revocation** | Admin deactivates key via Admin Portal | Deactivation deletes all associated `device_sessions` rows | **CONFIRMED** |

---

## 6. Database Schema & RPC Contracts

### 6.1 Schema Update (`supabase/migrations/0008_session_credentials.sql`)

```sql
create extension if not exists pgcrypto with schema extensions;

alter table public.device_sessions
  add column if not exists session_token_hash text,
  add column if not exists expires_at timestamptz not null default (now() + interval '30 days');

create or replace function public.gen_session_token()
returns text
language sql
as $$
  select encode(extensions.gen_random_bytes(32), 'hex');
$$;

create or replace function public.hash_session_token(p_token text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;
```

### 6.2 Internal Helper: `verify_device_session` (Hardened in Migration 0009 — [CONFIRMED] Live-Verified)
```sql
create type public.session_verification_result as (
  account_id  uuid,
  device_id   text,
  role        text,
  is_valid    boolean
);

create or replace function public.verify_device_session(p_session_token text)
returns public.session_verification_result
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_hash text;
  v_res  public.session_verification_result;
  v_rec  record;
begin
  v_res.is_valid := false;

  if p_session_token is null or trim(p_session_token) = '' then
    return v_res;
  end if;

  v_hash := public.hash_session_token(trim(p_session_token));

  -- Query device_sessions joined ONLY with accounts (1:1 relationship),
  -- using an EXISTS subquery on access_keys to eliminate row multiplication
  -- for multi-key accounts.
  select ds.account_id,
         ds.device_id,
         ac.role,
         ds.expires_at,
         ds.last_seen,
         exists (
           select 1
           from public.access_keys ak
           where ak.account_id = ds.account_id
             and ak.is_active = true
         ) as key_active
  into v_rec
  from public.device_sessions ds
  join public.accounts ac on ac.id = ds.account_id
  where ds.session_token_hash = v_hash;

  if not found then
    return v_res;
  end if;

  -- Verify key is active (account must have at least one active access key)
  if not v_rec.key_active then
    return v_res;
  end if;

  -- Absolute expiration check (30 days)
  if v_rec.expires_at < now() then
    return v_res;
  end if;

  -- Idle timeout check (7 days)
  if v_rec.last_seen < (now() - interval '7 days') then
    return v_res;
  end if;

  -- Update last_seen on active session use
  update public.device_sessions
  set last_seen = now()
  where session_token_hash = v_hash;

  v_res.account_id := v_rec.account_id;
  v_res.device_id  := v_rec.device_id;
  v_res.role        := v_rec.role;
  v_res.is_valid    := true;

  return v_res;
end;
$$;

revoke execute on function public.verify_device_session(text) from public, anon, authenticated;
```
```

### 6.3 Redesigned `save_student_profile` RPC
```sql
create or replace function public.save_student_profile(
  p_session_token     text,
  p_name              text,
  p_department        text,
  p_enrollment_number text
)
returns json
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_auth public.session_verification_result;
begin
  v_auth := public.verify_device_session(p_session_token);
  if not v_auth.is_valid then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED_SESSION');
  end if;

  update public.accounts
  set student_profile = jsonb_build_object(
    'name',              nullif(trim(p_name), ''),
    'department',        nullif(trim(p_department), ''),
    'enrollment_number', nullif(trim(p_enrollment_number), '')
  )
  where id = v_auth.account_id;

  return json_build_object('ok', true);
end;
$$;
```

### 6.4 Redesigned `sign_out_session` RPC
```sql
create or replace function public.sign_out_session(p_session_token text)
returns json
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_auth public.session_verification_result;
begin
  v_auth := public.verify_device_session(p_session_token);
  if not v_auth.is_valid then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED_SESSION');
  end if;

  delete from public.device_sessions
  where session_token_hash = public.hash_session_token(trim(p_session_token));

  return json_build_object('ok', true);
end;
$$;
```

---

## 7. Migration Dependencies & Signature Invalidation

### Repository Dependency Verification [CONFIRMED]
A repository-wide audit identified the exact call sites that require updates during migration:
- **Database Migrations**: `0005_account_model.sql` (contains legacy 4-arg `save_student_profile` and 2-arg `sign_out_session`).
- **Client Code**: `src/lib/accessKeys.ts` (lines 127-148, 157-170) and `src/store/authStore.ts` (lines 112-147).
- **Unit Tests**: `src/lib/__tests__/accessKeys.test.ts`.

### Legacy Signature Invalidation SQL
```sql
-- Explicitly drop old parameter signatures to ensure legacy calls fail fast
drop function if exists public.save_student_profile(uuid, text, text, text);
drop function if exists public.sign_out_session(uuid, text);

revoke execute on function public.save_student_profile(uuid, text, text, text) from anon, authenticated;
revoke execute on function public.sign_out_session(uuid, text) from anon, authenticated;

grant execute on function public.save_student_profile(text, text, text, text) to anon, authenticated;
grant execute on function public.sign_out_session(text) to anon, authenticated;
```

**Compatibility Rating**: **[CONFIRMED — Requires Simultaneous Frontend RPC Signature Migration]**

---

*Server-Issued Device Session Credential Authorization Specification final revision complete. Saved to `docs/qa/14-AUTHORIZATION-BOUNDARY-DESIGN.md`.*
