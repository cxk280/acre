# Acre — Fractional-GPU micro-tenancy

> One of four Vultr capability-showcase projects. Sibling repos: `enclave`, `mothertongue`, `proxima`.
> Optimization target: a **Vultr capability showcase** — make the unique advantage viscerally obvious.

## Elevator pitch

Acre is a provisioning platform that hands each small organization a **dedicated fractional-GPU AI
endpoint** — a private, isolated slice of a GPU in the tenant's own region, spun up in seconds for
well under $0.50/hr. It's "your own AI server" for orgs that could never justify a whole GPU and won't
put their data on a shared API.

**The single Vultr capability it proves:** fractional GPUs (Vultr's invention) + flat cheap pricing +
regional footprint = per-tenant dedicated AI with unit economics that finally work.

## Target user / niche & why hyperscalers can't serve it

The long tail: schools, community clinics, NGOs, local co-ops, small municipalities. Too small for
enterprise AI sales, underserved by shared inference APIs they don't trust with student/patient/member
data. Hyperscalers bill dedicated GPUs by the whole accelerator at rates these orgs can't touch and
don't offer true fractional-GPU tenancy in-region. Acre's model only pencils out because Vultr rents
GPU *fractions* at a low flat rate across many regions.

## Showcase architecture

- **Compute:** Vultr **API**-driven provisioning of **fractional-GPU** instances (MIG/vGPU slices).
- **Isolation:** per-tenant **VPC** + per-tenant **Object Storage** bucket; each tenant gets a private
  inference endpoint, not a shared queue.
- **Orchestration:** a control app that creates/tears down tenant sandboxes on demand; optionally
  **VKE** for scheduling.
- **Capability spotlight (make it *visible*):** a **provisioning console** that creates a new tenant's
  dedicated endpoint live in seconds, showing an **isolation badge** (dedicated slice, private VPC,
  private bucket) and a running **cost meter** that ticks up and stays under $0.50/hr.

## Demo script (~60s)

1. Click "Create tenant" → pick a region → in seconds a private inference endpoint appears.
2. The isolation badge confirms: dedicated GPU slice, private VPC, private storage.
3. Send a prompt to the tenant's endpoint; watch the cost meter read e.g. **"$0.31/hr · isolated."**
4. Spin up a second tenant to show clean separation; tear the first one down to show elastic cost.

## Next steps for the build Claude

1. Author **`VIEWS.md`** (provisioning console, tenant detail + cost meter, endpoint playground, admin).
2. Create **Figma mocks** and get user approval **before any UI coding** (global rule).
3. Run **`/factory`** to build end-to-end into a reviewable PR.
4. Start with one-tenant create → endpoint → cost-meter loop, then multi-tenant isolation. Cost meter
   and instant provisioning are the heroes.
