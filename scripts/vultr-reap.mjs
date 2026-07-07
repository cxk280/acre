#!/usr/bin/env node
// Reconcile Vultr against Acre: list every `acre-managed` instance and (optionally)
// delete the ones you don't want to keep. Because tenant state is in-memory and
// resets on restart, a crash mid-provision can orphan a paid GPU whose id the app
// no longer knows. This finds them by tag so they never bill silently.
//
// SAFETY: only ever touches instances carrying the management tag, so sibling
// projects on the shared account are never at risk. Dry-run by default.
//
//   node scripts/vultr-reap.mjs                     # list managed instances (dry run)
//   node scripts/vultr-reap.mjs --keep <id>,<id>    # show which would be reaped
//   node scripts/vultr-reap.mjs --keep <id> --yes   # actually delete the rest
//
// Requires VULTR_API_KEY in the environment (e.g. `set -a; . .env.local; set +a`).

const API = "https://api.vultr.com/v2";
const TAG = process.env.ACRE_VULTR_TAG ?? "acre-managed";
const KEY = process.env.VULTR_API_KEY;

if (!KEY) {
  console.error("VULTR_API_KEY is not set.");
  process.exit(1);
}

const args = process.argv.slice(2);
const doDelete = args.includes("--yes");
const keepArg = args[args.indexOf("--keep") + 1];
const keep = new Set(
  args.includes("--keep") && keepArg ? keepArg.split(",").map((s) => s.trim()) : [],
);

const headers = { authorization: `Bearer ${KEY}` };

async function main() {
  const res = await fetch(
    `${API}/instances?tag=${encodeURIComponent(TAG)}&per_page=500`,
    { headers },
  );
  if (!res.ok) {
    console.error(`List failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const { instances = [] } = await res.json();
  console.log(`Found ${instances.length} instance(s) tagged "${TAG}":`);
  for (const i of instances) {
    const flag = keep.has(i.id) ? "KEEP" : doDelete ? "DELETE" : "would reap";
    console.log(`  [${flag}] ${i.id}  ${i.label ?? ""}  ${i.region}  ${i.main_ip}`);
  }

  if (!doDelete) {
    console.log("\nDry run. Re-run with --yes to delete the non-kept instances.");
    return;
  }

  for (const i of instances) {
    if (keep.has(i.id)) continue;
    // Defensive: never delete anything that isn't actually tagged.
    const tagged =
      (Array.isArray(i.tags) && i.tags.includes(TAG)) || i.tag === TAG;
    if (!tagged) continue;
    const del = await fetch(`${API}/instances/${i.id}`, {
      method: "DELETE",
      headers,
    });
    console.log(`  deleted ${i.id}: ${del.status}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
