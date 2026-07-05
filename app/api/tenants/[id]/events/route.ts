import { tenantRepository } from "@/lib/store/tenant-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-Sent Events stream of a tenant's state. Pushes the full tenant JSON
// whenever it changes, so the provisioning theater updates the instant a step
// completes (instead of on a poll tick). Kept open through failure→retry→running.
//
// Note: SSE needs a host/proxy that doesn't buffer `text/event-stream`. The rest
// of the app still uses plain polling, so this is an enhancement, not a hard dep.
const POLL_MS = 400;
const MAX_LIFETIME_MS = 5 * 60 * 1000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const encoder = new TextEncoder();

  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let last = "";
      let closed = false;

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        clearTimeout(lifetime);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      cleanup = close;

      const push = () => {
        if (closed) return;
        const tenant = tenantRepository.get(id);
        if (!tenant) {
          controller.enqueue(encoder.encode(`event: gone\ndata: {}\n\n`));
          close();
          return;
        }
        const json = JSON.stringify(tenant);
        if (json !== last) {
          last = json;
          controller.enqueue(encoder.encode(`data: ${json}\n\n`));
        }
      };

      push(); // initial snapshot
      const interval = setInterval(push, POLL_MS);
      const lifetime = setTimeout(close, MAX_LIFETIME_MS);
      request.signal.addEventListener("abort", close);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
