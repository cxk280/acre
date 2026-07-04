# VIEWS.md — Acre

Verbal description of every view in the Acre provisioning console. This is the source of truth for
Figma mocks. **Mocks must be approved before any UI coding begins.**

Acre's hero moments are **instant provisioning**, the **isolation badge**, and the **live cost meter
staying under $0.50/hr**. Every view should keep those three ideas visible or one click away.

---

## Global shell (applies to all views)

- **Top bar:** Acre wordmark (left), current region selector, account/org menu (right). A persistent
  small **fleet cost meter** in the top bar shows the summed live $/hr across all running tenants
  (e.g. "Fleet: $0.62/hr · 2 tenants"). It ticks in real time.
- **Left nav:** Tenants (default), Provisioning Console, Playground, Admin. Collapsible.
- **Theme:** clean, technical, trustworthy. Light and dark both supported. Isolation/security cues use
  a distinct accent (e.g. a "shielded" green/teal) so the isolation story reads instantly.

---

## 1. Tenants list (home / default view)

The landing view after login. Answers "what dedicated endpoints exist right now and what are they
costing me?"

- **Header row:** title "Tenants", a primary **"+ Create tenant"** button (routes to Provisioning
  Console), and the fleet cost meter echoed larger.
- **Tenant cards / table rows**, one per tenant. Each shows:
  - Tenant name + region (flag/region chip).
  - **Status pill:** Provisioning… (animated) / Running / Idle / Tearing down / Stopped.
  - **Isolation badge** (compact): three ticks — dedicated GPU slice, private VPC, private bucket.
    Hover/expand for detail. Green when all three confirmed.
  - **Live cost:** current $/hr (e.g. "$0.31/hr"), always rendered under the $0.50 line; a small
    inline meter bar shows how far under the ceiling it sits.
  - Model loaded (e.g. "Llama-3-8B") and endpoint health dot.
  - Row actions: Open (→ Tenant detail), Playground, Tear down.
- **Empty state:** when no tenants exist — a large centered "Create your first dedicated endpoint"
  call to action that sells the pitch in one line and drops the user into the Provisioning Console.

## 2. Provisioning Console (the hero create flow)

The showcase view. Creating a tenant here must *feel* like it happens in seconds, with isolation and
cost made visible as it happens.

- **Left: the request form.**
  - Tenant name.
  - **Region picker** (map or list of Vultr regions) — emphasizes "in the tenant's own region."
  - GPU slice size (fractional options, cheapest preselected — e.g. A16 fraction).
  - Model to preload (dropdown).
  - A live **estimated cost readout** that updates as choices change, always showing "< $0.50/hr".
  - Primary button: **"Provision dedicated endpoint."**
- **Right: the live provisioning theater.** After clicking provision, a stepper animates in real time:
  1. Reserving fractional GPU slice…
  2. Creating private VPC…
  3. Creating private Object Storage bucket…
  4. Booting inference endpoint + loading model…
  5. **Endpoint live.**
  Each completed step flips a segment of the **isolation badge** to confirmed-green. The **cost meter
  starts ticking** the instant the slice is reserved. On completion, a success state shows the private
  endpoint URL, the full isolation badge, and buttons: "Open Playground" / "View tenant."
- This view is where the ~60s demo lives; it must be visually satisfying and fast.

## 3. Tenant detail + cost meter

Deep view for a single tenant.

- **Header:** tenant name, region, status pill, Tear down button.
- **Isolation panel (expanded badge):** three rows — Dedicated GPU slice (MIG/vGPU id), Private VPC
  (subnet/id), Private Object Storage bucket (name) — each with a green shield and the concrete
  resource identifier, proving real isolation rather than a shared queue.
- **Cost meter (prominent):** large live $/hr readout with the <$0.50 ceiling drawn as a line the
  needle stays under; a running **session-cost total** ("$0.74 so far, 2h 21m") and a sparkline of
  $/hr over the session. Reinforces the "elastic, cheap, torn down after" story.
- **Endpoint panel:** private endpoint URL, model loaded, health/latency, a copyable curl snippet.
- **Activity/log:** recent provisioning + inference events for this tenant.

## 4. Playground (endpoint test)

Sends a prompt to the *tenant's own* private endpoint — proves it's a real, dedicated, working AI.

- **Context bar:** which tenant/endpoint you're talking to, its region, and the **live cost meter**
  pinned here too (so cost is visible while inferring).
- **Chat/prompt area:** prompt input, response stream, token/latency readout.
- Subtle reminder that this traffic hits a private isolated endpoint, not a shared API.

## 5. Admin / fleet overview

Operator view across all tenants — the multi-tenant isolation & unit-economics story at a glance.

- **Fleet summary:** total tenants, total live $/hr (under budget), regions in use, GPUs fractioned.
- **Isolation matrix:** a table proving each tenant has its own VPC + bucket + slice (no shared cells)
  — the visual proof of clean separation between tenants.
- **Cost history:** aggregate spend over time; highlights teardown events dropping cost to zero.
- Bulk actions: tear down all demo tenants (resets the stage after a demo).

## 6. System / status views (supporting)

- **Loading / skeleton states** for each view.
- **Error states:** provisioning failure (with retry), endpoint unreachable, region capacity.
- **Confirmation dialogs:** tear-down confirm (shows cost-savings framing).
- **Auth:** minimal sign-in (may be stubbed for the demo).

---

## View → hero-capability map

| View | Instant provisioning | Isolation badge | Cost meter <$0.50 |
|---|---|---|---|
| Tenants list | create entry point | compact per row | per-tenant live |
| Provisioning Console | **primary** | **built live, step by step** | starts ticking live |
| Tenant detail | status | **expanded proof w/ resource ids** | **prominent + session total** |
| Playground | — | reminder | pinned |
| Admin/fleet | teardown = elastic | **isolation matrix** | fleet total |
