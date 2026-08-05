# PRD Review — Student Academic OS v1

## Executive Summary

The v1 PRD is a genuinely strong single-user product spec — the data model is normalized correctly, the offline-first stance is right for a 4-year unattended app, and the phase sequencing avoids the classic mistake of building analytics before there's data to analyze. The weaknesses are concentrated in three places: **sync correctness** (last-write-wins is underspecified and will silently lose data), **operational resilience** (single VM, single maintainer, no monitoring, no off-site backup), and **security posture for a self-hosted single-user backend** (PIN auth on an internet-exposed API is a real risk that has a nearly-free fix). None of these are reasons to delay Phase 1 — they're reasons to bake three specific decisions in now, before the schema and sync layer are built around assumptions that are expensive to unwind later.

## Overall Quality Assessment

**Strong.** Comparable to a real internal PRD for a small SaaS product, scaled correctly down to one user. The biggest gap isn't missing features — it's missing *failure-mode thinking*. A 4-year unattended system needs to be reviewed for "what happens when this breaks," not just "what happens when this works."

## Strengths

- 5-state attendance (not binary) matches how CVM's actual policy works — this alone beats most attendance apps.
- Cancelled-lecture exclusion from the denominator is correct and non-obvious; most student apps get this wrong.
- Append-only `AnalyticsEvent` log is genuinely good AI-readiness design — cheap now, valuable later.
- Soft-delete-everywhere is the right call for a personal historical record.
- Phase sequencing (local-first MVP before backend, before notifications, before analytics) means the app is usable within the first build session — this de-risks the whole project against abandonment, which is the actual biggest threat to a 4-year personal tool.

## Weaknesses

1. **Sync strategy is a placeholder, not a design.** "Last-write-wins with timestamp comparison" sounds simple but will silently overwrite an attendance mark made on your phone with a stale value from your laptop if both were offline and edited the same slot before either synced. For a 1-user, 2-device system this is rare but not impossible, and attendance data is exactly the kind of thing where silent data loss is unacceptable.
2. **No off-site backup.** The weekly JSON export is generated *on the same VM* that hosts everything else. If that VM's disk fails, the backup dies with the primary data. A backup that lives next to what it's backing up isn't a backup.
3. **No monitoring/alerting for the backend itself.** Sentry is scoped to app errors, not "the VM is down" or "the cron scheduler silently stopped running." A notification engine that fails silently is worse than no notification engine, because you'll trust it.
4. **PIN auth on a publicly reachable API is a weak boundary.** Fine against casual snooping, not fine against anything automated scanning for exposed endpoints. This is solvable almost for free (see Decision Log).
5. **PWA cache invalidation isn't addressed.** Service workers are notorious for serving stale JS after a deploy. Without an explicit versioned-cache-busting strategy, "I pushed an update" and "the app actually updated" can silently diverge — you'll be debugging a bug you already fixed.

## Missing Features

- **Sync status indicator** — a persistent, subtle "synced 2 min ago / offline / sync failed" signal, not just an on-demand check.
- **Conflict resolution queue** — when sync detects two conflicting edits to the same record, surface both and let you pick, rather than silently picking one.
- **Off-site backup destination** — export target that isn't the same VM (GitHub private repo via Student Pack, or Google Drive).
- **App-level version indicator + changelog** — so a future-you debugging a 3-year-old bug report knows which version was running.
- **Data validation layer on manual entry** — e.g. block a `LectureSlot` end time before its start time, block negative credits — currently implied but not specified.

## Missing User Flows

- **Two-device conflict flow:** phone and laptop both mark the same slot differently while offline, both reconnect — what does the UI actually show you?
- **VM-down flow:** you open the app, it's fully offline-capable so you don't notice anything — but *how do you find out* the backend needs attention before a week of missed syncs piles up?
- **Push-subscription-expired flow:** browser push subscriptions can silently expire or invalidate; there's no flow for detecting this and prompting re-subscription.
- **Semester rollover flow:** the exact sequence of "archive current semester → activate new one → import new timetable" isn't walked through step by step.

## Missing Edge Cases

- Two devices editing the same `AttendanceRecord` offline simultaneously (see Weakness #1).
- Push notification permission revoked by the OS after being granted (iOS is aggressive about this) — app should detect and re-prompt, not fail silently.
- Daylight-saving / timezone edge cases if you ever travel — low priority given IST-only use, but worth one line in Settings rather than an assumption.
- Oracle Cloud reclaiming an "Always Free" VM for inactivity (documented to happen) — no mitigation currently exists in the plan.
- IndexedDB storage eviction — browsers can clear IndexedDB under storage pressure for sites not explicitly "installed"; a PWA added to home screen is much safer here, but this should be a stated assumption, not an accident.

## Missing Analytics

- **Sync health** — how often sync fails/succeeds, surfaced somewhere even if just in Settings.
- **Notification delivery rate** — did the push actually arrive, or silently fail (measurable via service worker + backend log correlation).
- **Anomaly flag** — a subject's cancellation rate spiking, or your own absence rate spiking in a specific week, surfaced without you having to go looking.

## Missing Notifications

- Push subscription expired / needs re-grant.
- Backend health alert (VM down, cron stopped) — should go to *email*, not push, since push depends on the thing that's broken.
- Quiet hours — no notification should fire between, e.g., 11pm–7am regardless of rule (weekly digest, exam countdown "morning of" excepted).

## Missing Settings

- Backup destination + cadence configuration.
- Notification quiet hours.
- Per-subject attendance threshold override (already implied, should be explicit in Settings, not just "editable" in the abstract).
- Data retention policy statement (nothing auto-deletes — this should be a visible, confirmed setting, not just an architectural default the user has to trust blindly).

## Missing AI Opportunities

- Anomaly detection on attendance/cancellation patterns (flagged above under Analytics).
- Notification bundling — instead of 3 separate pushes within 10 minutes, AI-assisted digest logic to merge them (a genuinely good UX use of "AI" that doesn't require anything exotic).

## Security Concerns

The core issue: a Node/Express API reachable from the public internet, protected only by a PIN, is a soft target even with zero commercial value — automated scanners don't care that it's a personal app. **Recommendation:** don't expose the API publicly at all. Use Tailscale (free for personal use, effectively zero setup cost) to put your VM and your devices on a private mesh network — the backend is never reachable from the open internet, so PIN auth becomes a reasonable *second* layer instead of the *only* layer. This also removes the need for a public domain + Let's Encrypt cert renewal cycle for the API itself (the frontend on Vercel already handles HTTPS for you).

## Offline Concerns

Full initial dataset must be present in IndexedDB before the first offline session — this needs to be explicit in the PWA install flow (force a full sync on first successful connection, block "you can go offline now" until that completes). Service worker caching strategy needs to be stated explicitly: stale-while-revalidate for the app shell, network-first for API calls with IndexedDB fallback.

## Sync Concerns

Already covered above (Weakness #1) — this is the single highest-risk architectural gap in v1. Needs a real decision, not a placeholder phrase. See Decision Log.

## Scalability Concerns

Not a multi-user scalability question (there is one user), but a **data-growth-over-4-years** one:
- Attachments (scanned notes, PDFs) stored as Postgres blobs will bloat the database and slow backups. Recommend filesystem storage on the VM or a free object-storage tier (Cloudflare R2 free tier, 10GB) with the DB holding only references.
- Dashboard aggregation query must be scoped to active semester only by default — querying across 4 years of `LectureSlot` rows on every app open is a self-inflicted performance problem, easily avoided by the Semester Archive boundary already in the plan (just needs to be enforced at the query level, not left as an assumption).

## Performance Concerns

Global search across 4 years of notes needs an actual index (Postgres full-text search, or a client-side index like FlexSearch/MiniSearch over the IndexedDB notes table) rather than a linear scan — fine to defer *implementation* to the phase where Search ships, but the index strategy should be decided now so the Notes schema doesn't need retrofitting.

## UX Concerns

"Quiet dashboard when healthy" is a good principle but has a failure mode: if sync silently fails, the dashboard looks exactly as healthy as when everything's fine. A persistent, low-attention sync-status element is necessary specifically *because* the dashboard is otherwise designed to be quiet — without it, quiet and broken look identical.

## Risks

- **Single point of maintenance.** You are the only engineer. No code review, no second pair of eyes. Mitigate by keeping Phase 1–3 deliberately simple and well-tested before layering notifications/analytics on top — a bug in the attendance calculator during exam week is the worst-case failure, so that module deserves the most manual testing before trust is placed in it.
- **Oracle Always Free reclamation.** Documented risk, currently no mitigation. Cheapest fix: a scheduled lightweight cron ping to keep the instance active, plus a documented fallback host (Fly.io free tier or a $5/mo VPS) if it's ever reclaimed anyway.
- **Dependency rot over 4 years.** React/Vite/Node ecosystem moves fast. Recommend an explicit yearly "dependency review" checkpoint rather than either freezing versions forever (accumulates security debt) or auto-updating (breaks things unpredictably mid-semester).

## Future Expansion Opportunities

- A public, read-only "portfolio" view of this project (architecture writeup, not your personal data) — genuinely strong portfolio/LinkedIn material given your existing project-documentation habits (ROCKET/VISION pipeline already exists for exactly this).
- Optional read-only share link for a specific semester's timetable, if a friend ever needs it — deliberately out of scope for v1, noted so it doesn't get designed in accidentally via schema decisions now.

## Open Questions

1. Do you want this project itself documented for your portfolio once Phase 1–3 are stable (separate from the app's own function)?
2. Should exported backups be encrypted at rest, given they contain a full record of your attendance/notes/academic history?
3. Is two-device use (phone + laptop) a Phase-1 requirement, or single-device-first with sync added properly in Phase 3 as currently planned? This materially affects how urgently the conflict-resolution design (above) needs to be solved.

## Final Recommendations

1. Adopt Tailscale for VM access instead of public exposure — near-zero cost, removes the single biggest security concern.
2. Replace "last-write-wins" with an explicit conflict-log-and-prompt strategy for `AttendanceRecord` specifically (low-frequency table, cheap to handle correctly) while accepting last-write-wins for lower-stakes tables like Notes drafts.
3. Add a persistent sync-status indicator to the Dashboard before Phase 3 ships — cheap, and directly fixes the "quiet dashboard = healthy dashboard" false equivalence.
4. Move off-site backup (GitHub private repo, Student Pack) into Phase 3 alongside the backend, not deferred — it's cheap to add while the sync layer is already being built.
5. Store attachments on the filesystem/object storage, not as DB blobs, decided now so the Notes/Resources schema doesn't need a migration later.
