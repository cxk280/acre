// The startup script a freshly-created GPU instance runs to become the tenant's
// private inference endpoint: install Ollama, bind it so the control plane can
// reach it, and pull the model. Passed to Vultr as base64 `user_data` at instance
// create. Pulling weights is the slow part (minutes) — the provisioner polls the
// instance's /api/tags until this finishes, so the model is guaranteed loaded
// before the endpoint is marked live.
//
// SECURITY: this binds Ollama on 0.0.0.0:11434 with no auth. On a public IP that
// is an open, keyless GPU. The endpoint MUST be fenced with a Vultr firewall group
// (ACRE_VULTR_FIREWALL_GROUP) restricting :11434 to the control-plane IP — see
// VultrProvisioner. The VPC alone does not gate public ingress.

/** Build the cloud-init bash for a given Ollama model tag (e.g. "llama3.2:1b"). */
export function ollamaCloudInit(model: string): string {
  // Guard the model tag: it is interpolated into a shell command, so only allow
  // the characters a real Ollama tag uses. Anything else is a programming error.
  if (!/^[a-zA-Z0-9._:/-]+$/.test(model)) {
    throw new Error(`Unsafe Ollama model tag: ${JSON.stringify(model)}`);
  }
  return `#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# Install Ollama.
curl -fsSL https://ollama.com/install.sh | sh

# Bind to all interfaces so the control plane can reach the endpoint.
mkdir -p /etc/systemd/system/ollama.service.d
cat >/etc/systemd/system/ollama.service.d/override.conf <<'EOF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
EOF
systemctl daemon-reload
systemctl enable ollama
systemctl restart ollama

# Pull the model. This is the slow step the provisioner waits on.
until ollama pull ${model}; do
  echo "ollama pull failed, retrying in 5s..." >&2
  sleep 5
done
echo "acre: endpoint ready with ${model}"
`;
}

/** Base64-encode the cloud-init for Vultr's `user_data` field. */
export function encodeUserData(script: string): string {
  return Buffer.from(script, "utf8").toString("base64");
}
