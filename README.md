# Acre — Fractional-GPU micro-tenancy

**Acre** gives small organizations their own *dedicated* fractional-GPU AI endpoint — isolated, in
their own region, for well under $0.50/hr. It provisions a private inference sandbox per tenant in
seconds, so schools, clinics, NGOs, and co-ops that are too small for enterprise AI (and unwilling to
trust shared multi-tenant APIs with their data) get a private slice of a GPU they fully control.

**Vultr capability this proves:** Vultr-pioneered **fractional GPUs** + flat, predictable pricing +
broad regional footprint — the combination that makes per-tenant dedicated AI economically viable.

## Cost estimate (tight budget)

Acre *is* the fractional-GPU story, so it runs on the cheapest slices Vultr sells.

| Item | Rate | Notes |
|---|---|---|
| Fractional A16 slice per tenant | from ~$0.032/hr (~$21.50/mo) | Spun up per demo tenant, torn down after |
| Control-plane / console host (Cloud Compute) | ~$0.01/hr (~$5–10/mo) | Provisioning UI + cost meter |
| **~4-hour demo with 2 tenants** | **≈ $1–2 total** | Comfortably proves the <$0.50/hr claim |

Provision tenants live during the demo and **tear them down afterward** — the elastic teardown is
itself part of the story.

See [`PLAN.md`](./PLAN.md) for the full concept and build plan.
