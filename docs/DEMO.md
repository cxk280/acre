# Acre — demo runbook (interview rehearsal)

A script for running and presenting the local Acre demo. Everything here runs with
**no API keys, no database, and no cost** — provisioning is a timed simulation.

## Run it

```bash
npm run dev          # then open http://localhost:3000  (Ctrl+C to stop)
```

State is in-memory and **resets on restart** — start fresh before each rehearsal.

## The one-sentence pitch

> Acre gives each small org (a clinic, a school, an NGO) its **own dedicated,
> isolated fractional-GPU AI endpoint** — private VPC, private bucket, in their own
> region — for **well under $0.50/hr**. That only pencils out because Vultr rents
> GPU *fractions* at a flat low rate across many regions.

**The single Vultr capability it proves:** fractional GPUs + flat cheap pricing +
regional footprint = per-tenant dedicated AI with unit economics that finally work.

## The ~60-second click-through

Do these in order. The three "hero" moments are **instant provisioning**, the
**isolation badge**, and the **cost meter under $0.50/hr**.

1. **Provisioning Console** (`/provisioning`)
   - Leave the defaults (Harbor Free Clinic · US-East · A16 ⅛ · Llama-3-8B).
   - Note the **Estimated cost $0.03/hr — well under the $0.50/hr ceiling.**
   - Click **Provision dedicated endpoint**. Narrate the theater on the right:
     GPU slice → private VPC → private bucket → endpoint boots. Isolation badge
     builds **1/3 → 3/3**; the live cost pill starts ticking.
   - Say: *"Seconds, not sales calls. Dedicated slice, private VPC, private
     bucket — in the tenant's own region, so data never leaves it."*

2. **Tenant detail** (click **View tenant**, or **Open** from Tenants)
   - Point at the **private endpoint URL** + the curl snippet.
   - Point at the **prominent cost meter**: the green fill sits well under the red
     **$0.50 ceiling** line; session total ticks.
   - Point at **Isolation — proven**: real resource IDs (slice, `vpc-…`, bucket).

3. **Playground** (`/playground`)
   - Send a prompt (a canned but on-message reply comes back).
   - Say: *"Real inference on the tenant's **own** endpoint — see 'Private &
     isolated' and the pinned $/hr — not a shared multi-tenant API."*

4. **Admin / fleet** (`/admin`)  — provision a 2nd or 3rd tenant first (different
   regions make it look better).
   - **Isolation matrix**: *"No shared cells — every tenant its own slice, VPC,
     CIDR, and bucket."*
   - Click **Tear down all demo tenants** and watch the fleet meter fall to
     **$0.00/hr**. Say: *"Elastic — tear it down and you stop paying. That's the
     whole cost story."*
   - (If PR #6 is merged) the **spend-history chart** shows the spend rise then
     collapse — a great visual for this beat.

5. **Failure / retry** (optional, shows robustness)
   - On the Console, pick region **AP-South · Bangalore (at capacity)** → Provision
     → it fails cleanly ("No free A16 slices…", nothing charged) → switch region →
     **Retry provisioning** → succeeds.

## Reset between runs

Just restart the dev server (Ctrl+C, `npm run dev`) — the in-memory store clears.

## Honest framing (if asked)

- Provisioning is **simulated** behind a `Provisioner` interface (`lib/provisioner`);
  a real Vultr adapter (`vultr.ts`) is a stub, swappable in later. Say this plainly
  — it shows clean architecture.
- Store is in-memory (single instance) behind a `TenantRepository` interface —
  Postgres is a drop-in later.

## Optional polish before the interview

Two open PRs add nice-to-haves (both independent, safe to merge into `main`):

- **PR #6** — real fleet spend-history time-series chart on Admin.
- **PR #7** — SSE live updates for the provisioning theater.

## Stack (for architecture questions)

Next.js 15 (App Router) · TypeScript (strict) · Tailwind v4 (design tokens ported
from an approved Figma system) · Vitest. Domain in `lib/domain`, storage in
`lib/store`, provisioning in `lib/provisioner`, inference in `lib/inference`,
typed API client in `lib/api/client.ts`, views in `app/(console)`.
