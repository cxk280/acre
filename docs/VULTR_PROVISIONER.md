# Running Acre on real Vultr infrastructure

By default Acre provisions with the `MockProvisioner` (instant, free, no infra). Setting
`ACRE_PROVISIONER=vultr` swaps in the real `VultrProvisioner`, which creates a genuine
per-tenant fractional-GPU instance + private VPC through the Vultr API, boots Ollama on
that instance, and routes the tenant's inference to its own endpoint.

This is real money on real hardware. Read this before flipping it on.

## What a real provision does

For each tenant, in order:

1. **slice** — `POST /v2/instances` with the slice size's real plan (`a16-1_8` →
   `vcg-a16-2c-8g-2vram`, ~$0.06/hr), Ubuntu 24.04, tagged `acre-managed`, with a
   cloud-init that installs Ollama and pulls the model.
2. **vpc** — `POST /v2/vpcs` + attach to the instance (real id + CIDR in the badge).
3. **bucket** — kept simulated. Per-tenant Vultr Object Storage is a paid subscription,
   not a cheap per-tenant call, so it isn't provisioned for real.
4. **endpoint** — poll until the instance is active and Ollama has finished pulling the
   model (**minutes**, not the mock's ~60s).
5. **live** — the endpoint becomes `http://<instance-ip>:11434/v1`.

Teardown deletes the instance and VPC — but only after re-reading the instance and
confirming it carries the `acre-managed` tag, so sibling projects on a shared account are
never touched.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `ACRE_PROVISIONER=vultr` | (mock) | Turn on the real adapter |
| `VULTR_API_KEY` | — | **Required.** Account API key (env only, never committed) |
| `ACRE_VULTR_OLLAMA_MODEL` | `llama3.2:1b` | Model pulled onto the instance (must fit the slice VRAM — 2 GB for the cheapest) |
| `ACRE_VULTR_OS_ID` | `2284` | Ubuntu 24.04 LTS x64 |
| `ACRE_VULTR_TAG` | `acre-managed` | Management tag the teardown guard requires |
| `ACRE_VULTR_FIREWALL_GROUP` | — | **Strongly recommended** (see security) |
| `ACRE_VULTR_POLL_MS` | `5000` | Poll interval while waiting for the endpoint |
| `ACRE_VULTR_ENDPOINT_TIMEOUT_MS` | `900000` | Max wait for the model to load (15 min) |
| `ACRE_VULTR_DELETE_TIMEOUT_MS` | `120000` | Max wait for teardown to complete (2 min) |
| `ACRE_SSE_LIFETIME_MS` | `1200000` | SSE stream lifetime (20 min, outlives a real provision) |

Also set `ACRE_INFERENCE` appropriately — the per-tenant dedicated endpoint is used
automatically once `ACRE_PROVISIONER=vultr` and a tenant has a real endpoint.

## Before a live run

- **Fund the account.** A negative balance makes `POST /v2/instances` fail; the adapter
  surfaces this as a clean "fund the account" failure rather than crashing, but nothing
  will provision.
- **Region support.** The small A16 slice exists only in: `ewr, ord, atl, lhr, fra, sjc,
  nrt, sgp, blr`. Other regions fail fast with a clear message.
- **Rehearse once.** Provision one tenant, confirm inference answers, tear it down.

## Security — the endpoint is public by default

The cloud-init binds Ollama to `0.0.0.0:11434` so the control plane can reach it. On a
public IP that is an **open, unauthenticated GPU**. The private VPC does not gate public
ingress. Before any non-throwaway use, create a Vultr firewall group that allows `:11434`
only from the control-plane host (and locks down SSH) and pass it via
`ACRE_VULTR_FIREWALL_GROUP`. This is a known first-cut limitation.

## Cost safety

- Every managed instance is tagged; teardown refuses anything untagged.
- A failure after the instance is created best-effort tears it down, so a failed provision
  doesn't leak a billing GPU.
- Tenant state is **in-memory and resets on restart.** If the process dies mid-provision,
  an instance can be orphaned. Reconcile by tag:

  ```bash
  set -a; . .env.local; set +a          # load VULTR_API_KEY
  node scripts/vultr-reap.mjs           # list managed instances (dry run)
  node scripts/vultr-reap.mjs --yes     # delete all managed instances
  node scripts/vultr-reap.mjs --keep <id1>,<id2> --yes   # keep some, delete the rest
  ```

  Run this after any crash, and when you're done demoing, to make sure nothing is left
  billing. Note: the reaper deletes orphaned *instances* (the billed resource); their
  attached VPCs are free and are not auto-reaped — remove any leftover `acre-*` VPCs from
  the Vultr portal if you want a fully clean account.
