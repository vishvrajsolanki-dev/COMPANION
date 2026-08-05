# Deployment & Operational System Specification — Student Academic OS

**Document ID:** `17_DEPLOYMENT`  
**Author:** Principal Systems Engineer  
**Status:** Approved / Frozen Under Implementation Freeze  
**Primary References:** [Student_OS_PRD.md §4](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/Student_OS_PRD.md#4-stack-confirmed), [01_PRD_REVIEW.md §Risks](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#risks), [06_SYSTEM_ARCHITECTURE.md §2, §6](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/06_SYSTEM_ARCHITECTURE.md#2-high-level-system-architecture)  
**Target Audience:** DevOps Engineers, System Administrators, Infrastructure Architects, AI Implementation Agents  

---

## 1. Production Infrastructure Architecture & Topology

**Student Academic OS** executes on a 100% free-tier, multi-cloud deployment footprint designed to survive four years of continuous operation without cost or maintenance overhead.

```mermaid
graph TD
    subgraph Client_Hosting ["Static Asset Tier (Vercel / Cloudflare Pages Free)"]
        PWA["React PWA App Shell + Service Worker"]
    end

    subgraph Mesh_Network ["Network Boundary (Tailscale Private Mesh)"]
        TailscaleNet["Tailscale Encrypted Tunnel (100.x.y.z)"]
    end

    subgraph Compute_Tier ["Backend Compute Tier (Oracle Cloud Always Free VM)"]
        systemd["systemd Daemon (Node.js Express API)"]
        Cron["In-Process Cron Scheduler"]
        BackupWorker["Nightly Encrypted Backup Script"]
    end

    subgraph Database_Tier ["Database & Off-Site Archive"]
        NeonDB[("Neon Serverless Postgres (Cloud Primary)")]
        R2Storage["Cloudflare R2 Object Storage (10GB Free Tier)"]
        GitHubRepo["Private GitHub Repository (Encrypted Backups)"]
    end

    PWA <== "Encrypted Rest API over Tailscale" ==> TailscaleNet
    TailscaleNet ==> systemd
    systemd --- Cron
    systemd <== "SSL Connection Pool" ==> NeonDB
    systemd --- R2Storage
    BackupWorker -. "Nightly Commit & Push" .-> GitHubRepo
```

---

## 2. Infrastructure Inventory & Cost Boundary

| Service Layer | Provider & Tier | Configuration Specs | Monthly Cost |
| :--- | :--- | :--- | :--- |
| **Compute VM** | Oracle Cloud Always Free | Ampere ARM (4 vCPU, 24GB RAM, 200GB Storage, Ubuntu 24.04) | **$0.00** |
| **Database** | Neon Serverless Postgres | Free Tier (0.5GB storage, auto-suspend / instant wake) | **$0.00** |
| **PWA Hosting** | Vercel / Cloudflare Pages | Free Tier (Global CDN Edge distribution, custom domain) | **$0.00** |
| **Mesh Network** | Tailscale | Personal Free Tier (Up to 100 devices, WireGuard encryption) | **$0.00** |
| **Object Storage**| Cloudflare R2 | Free Tier (10GB storage, $0 egress fee) | **$0.00** |
| **Off-Site Backup**| Private GitHub Repository | GitHub Student Developer Pack | **$0.00** |
| **Crash Logging** | Sentry | GitHub Student Developer Pack (50k events/month) | **$0.00** |
| **TOTAL** | | | **$0.00 / Month** |

---

## 3. Environment Variable & Secret Inventory

The Express API daemon reads configuration parameters exclusively from systemd environment files located at `/etc/student-os/env`:

```env
# Server Runtime
PORT=4000
NODE_ENV=production
TAILSCALE_BIND_IP=100.64.0.1

# Database Credentials
DATABASE_URL=postgres://user:password@ep-cool-db.neon.tech/student_os?sslmode=require

# Tailscale & Auth Security
TAILSCALE_AUTH_KEY=tskey-auth-xxxxxx
PIN_SECRET_HASH=$2b$12$eImiTXuWVxfM37uY4JANjO...

# Web Push Credentials (VAPID)
VAPID_PUBLIC_KEY=BEl62iUYg...
VAPID_PRIVATE_KEY=4k8J9x...
VAPID_SUBJECT=mailto:vishvraj@adit.ac.in

# Off-Site Backup Credentials
BACKUP_ENCRYPTION_PASSPHRASE=super-secret-aes-passphrase
GITHUB_BACKUP_TOKEN=ghp_xxxxxxxxxxxx
```

---

## 4. Disaster Recovery & VM Migration Runbook

As documented in [01_PRD_REVIEW.md §Risks](file:///c:/Users/vishv/OneDrive/Desktop/Student-Academic-OS/docs/01_PRD_REVIEW.md#risks), Oracle Cloud reserves the right to reclaim inactive free VMs. In the event of VM reclamation or host failure, execute the following **15-Minute Recovery Runbook**:

```mermaid
flowchart TD
    A[VM Unreachable Alert Received via Email] --> B[Provision Alternative Free Host (Fly.io / Render / Backup VPS)]
    B --> C[Install Tailscale & Authenticate Node]
    C --> D[Clone Repository & Install Systemd Daemon]
    D --> E[Pull Latest Encrypted Backup Snapshot from Private GitHub Repo]
    E --> F[Decrypt Snapshot with AES-256 Passphrase & Restore to Neon DB]
    F --> G[Start Node.js Service -> System Fully Restored in <15 Mins]
```

---

## 5. 4-Year Maintenance Checklist

To ensure the application remains operational across 2025–2029 without unexpected breakage:

```
4-YEAR ANNUAL MAINTENANCE CHECKLIST
[ ] 1. (Annual - June) Dependency Health Review: Run `npm audit` and update non-breaking security patches.
[ ] 2. (Annual - July) Storage Cleanup: Check Oracle VM disk usage (`df -h`) and clear old application log files.
[ ] 3. (Semi-Annual) Tailscale Auth Key Renewal: Verify Tailscale node auth key expiration status.
[ ] 4. (Quarterly) Backup Verification: Pull latest GitHub encrypted backup JSON and test restore to local DB.
```
