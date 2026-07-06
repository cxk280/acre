# Acre — Fractional-GPU micro-tenancy

## Elevator pitch

Acre is a provisioning platform that hands each small organization a **dedicated fractional-GPU AI
endpoint** — a private, isolated slice of a GPU in the tenant's own region, spun up in seconds for
well under $0.50/hr. It's "your own AI server" for orgs that could never justify a whole GPU and won't
put their data on a shared API.

**Why it works now:** fractional GPUs + flat cheap per-hour pricing + a broad regional footprint =
per-tenant dedicated AI with unit economics that finally pencil out. A 2 GB slice that runs a real
model starts around $0.06/hr, so every tenant sits comfortably under the $0.50/hr ceiling.

## Target user / niche & why hyperscalers can't serve it

The long tail: schools, community clinics, NGOs, local co-ops, small municipalities. Too small for
enterprise AI sales, underserved by shared inference APIs they don't trust with student/patient/member
data. Hyperscalers bill dedicated GPUs by the whole accelerator at rates these orgs can't touch and
don't offer true fractional-GPU tenancy in-region. Acre's model only pencils out because GPU
*fractions* rent at a low flat rate across many regions.

## Architecture

- **Compute:** API-driven provisioning of **fractional-GPU** instances (vGPU vram-slices) — the smallest
  A16 slices start at 2 GB VRAM for ~$0.06/hr.
- **Isolation:** per-tenant **VPC** + per-tenant private storage; each tenant gets its own private
  inference endpoint served from its own instance, not a shared queue.
- **Orchestration:** a control app that creates/tears down tenant sandboxes on demand.
- **Made *visible*:** a **provisioning console** that brings up a new tenant's dedicated endpoint live,
  showing an **isolation badge** (dedicated slice, private VPC, private storage) and a running **cost
  meter** that ticks up and stays under $0.50/hr.

## Demo script

1. Click "Create tenant" → pick a region → a private inference endpoint appears.
2. The isolation badge confirms: dedicated GPU slice, private VPC, private storage.
3. Send a prompt to the tenant's endpoint; watch the cost meter read e.g. **"$0.31/hr · isolated."**
4. Spin up a second tenant to show clean separation; tear the first one down to show elastic cost.

## Backend modes

Provisioning runs behind a swappable `Provisioner` port:

- **`MockProvisioner`** (default) — a timed state machine that simulates the ~60s spin-up with zero
  infrastructure, so the whole product is explorable at no cost.
- **`VultrProvisioner`** (`ACRE_PROVISIONER=vultr`) — the real adapter: creates a genuine per-tenant
  fractional-GPU instance + private VPC via the cloud API, boots a model server on the instance, and
  routes that tenant's inference to its own endpoint. Real provisioning takes minutes (it's really
  pulling a model onto a dedicated GPU), so the mock remains the path for the instant walkthrough.

Inference runs behind a matching `Inference` port (mock / Ollama / serverless), and tenant state lives
behind a `TenantRepository` port (in-memory today, a database drop-in later).
