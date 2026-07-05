# Deploy Acre to Vultr (cheap, temporary)

Deploys the console to one small Vultr Cloud Compute instance for ~$0.009/hr while
it's up (destroy it when done → $0). The Playground runs on Vultr Serverless
Inference (pennies/query); provisioning stays simulated (no GPU cost).

> Deploys whatever branch is checked out. For the fullest demo, merge the open PRs
> into `main` and `git checkout main` first.

## One-time prerequisites

- An SSH key on your machine. Check with `ls ~/.ssh/id_*.pub`; if none:
  `ssh-keygen -t ed25519` (press Enter through the prompts).
- `.env.local` has your Vultr inference settings (`ACRE_INFERENCE=vultr`,
  `VULTR_INFERENCE_API_KEY`, `VULTR_INFERENCE_MODEL`) — the deploy script copies
  these to the server. They are never committed.

## Step 1 — Create the instance (Vultr portal, ~2 min)

1. **Deploy → Cloud Compute.**
2. Type: **Shared CPU** (the cheapest). Plan: the smallest (~$5–6/mo, 1 vCPU / 1 GB).
3. OS: **Ubuntu 24.04 LTS**.
4. **SSH Keys:** add/select your key (so `ssh` works without a password).
5. Deploy. Copy the instance's **public IP** once it's ready.

## Step 2 — Deploy (one command, from this repo)

```bash
./scripts/deploy.sh root@<INSTANCE_IP>
```

It builds locally, ships the bundle + your env, installs Node if needed, and starts
the app under systemd on port 80. First run takes a few minutes (Node install);
redeploys are fast.

## Step 3 — Open it

```
http://<INSTANCE_IP>
```

Provision a tenant → Playground → real Vultr AI answers. (It's plain HTTP on the IP;
fine for a demo. A domain + TLS is an optional add-on.)

## Day-to-day

- **Redeploy after changes:** just re-run `./scripts/deploy.sh root@<IP>`.
- **Logs:** `ssh root@<IP> journalctl -u acre -f`
- **Restart:** `ssh root@<IP> systemctl restart acre`

## When the interview's over — stop paying

**Destroy the instance** in the Vultr portal (Server → … → Destroy). Billing is
hourly, so a destroyed instance costs nothing. To bring it back later, recreate the
instance (Step 1) and redeploy (Step 2).
