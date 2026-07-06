# Acre — a private AI endpoint for every small organization

**Acre** gives a small organization its *own dedicated* AI inference endpoint — an isolated, private
slice of a GPU in its own region, provisioned in seconds for well under **$0.50/hr**. It's "your own AI
server" for the organizations that could never justify a whole GPU and won't put their data on a shared,
multi-tenant API: schools, community clinics, NGOs, local co-ops, small municipalities.

The idea Acre explores: dedicated AI has always meant *enterprise* pricing and *enterprise* scale.
Fractional GPUs change the unit economics enough that a two-person clinic can have the same thing a
hospital network does — a private endpoint, its own region, its data never mingled with anyone else's —
for the price of a couple of coffees a day.

## Why this is newly possible

Renting a *fraction* of a GPU at a low, flat, per-hour rate — across many regions — is what makes
per-tenant dedicated inference pencil out. Acre is built on [Vultr](https://www.vultr.com)'s fractional
GPUs for exactly this reason; the smallest slice that runs a real model starts around **$0.06/hr**
(a 2 GB NVIDIA A16 slice), which is why every tenant's live rate sits comfortably under the $0.50/hr
ceiling. Hyperscalers bill dedicated accelerators by the whole card at rates this audience can't touch,
and don't offer true in-region fractional tenancy — so this long tail stays underserved.

## What it does

- **Provisioning console** — create a tenant, pick a region, and watch a dedicated endpoint come up:
  a private GPU slice, a private VPC, a private storage bucket.
- **Isolation, made visible** — an *isolation badge* shows the concrete per-tenant resources
  (dedicated slice, private VPC + CIDR, private bucket) so "isolated" is something you can see, not a
  marketing word.
- **A live cost meter** — ticks up in real time and stays under the $0.50/hr ceiling, so the unit
  economics are legible at a glance.
- **Elastic teardown** — tear a tenant down and billing stops. The elasticity *is* the point: spin up
  for a workload, tear down when it's done.

See [`PLAN.md`](./PLAN.md) for the full concept and build notes, and [`VIEWS.md`](./VIEWS.md) for the
view spec the UI is built from.

## What's real, and what's simulated

Honesty about the moving parts, because it matters:

- **Inference is real.** Prompts are answered by a live model, not a canned response.
- **Provisioning is simulated by default** by a `MockProvisioner` — a timed state machine behind a
  `Provisioner` interface. The ~60s spin-up theater, the isolation badge, and the cost meter all run
  without touching real infrastructure, so the product is fully explorable at zero cost.
- **The real path is implemented and opt-in.** Setting `ACRE_PROVISIONER=vultr` swaps in the
  `VultrProvisioner` adapter (`lib/provisioner/vultr.ts`), which provisions a genuine per-tenant
  fractional-GPU instance + private VPC through the Vultr API, boots the model on that instance, and
  routes the tenant's inference to its *own* endpoint — dedicated, not shared. Real provisioning takes
  minutes (it actually pulls a model onto a fresh GPU), so the mock stays the default for the instant
  walkthrough. See [`docs/VULTR_PROVISIONER.md`](./docs/VULTR_PROVISIONER.md) for how to run it live.
- **State is in-memory** (one process, resets on restart) behind a `TenantRepository` interface, so a
  real database is a drop-in later.

The clean seams — swappable `Provisioner` and `Inference` ports, a pure domain layer for the
provisioning state machine and cost math — are what let the simulated and real backends coexist without
touching any of the UI or API code.

## Run the App

```bash
npm install
npm run dev        # http://localhost:3000  (redirects to /tenants)
```

Other scripts: `npm run build`, `npm start`, `npm run lint`, `npm run typecheck`, `npm test`.

**Stack:** Next.js (App Router) · TypeScript · Tailwind v4 (design tokens ported from an approved Figma
system) · Vitest.
