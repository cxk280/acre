import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// HTTP Basic Auth gate for the public demo. The app provisions REAL, billed GPUs,
// so this keeps random visitors (and bots) out of the console AND the provisioning
// API. Credentials come from env; when unset (e.g. local dev) the gate is disabled
// so development is unaffected.
const USER = process.env.ACRE_BASIC_AUTH_USER;
const PASS = process.env.ACRE_BASIC_AUTH_PASSWORD;

function challenge() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Acre", charset="UTF-8"' },
  });
}

export function middleware(req: NextRequest) {
  // No credentials configured → gate disabled (local dev).
  if (!USER || !PASS) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const sep = decoded.indexOf(":");
      const user = decoded.slice(0, sep);
      const pass = decoded.slice(sep + 1);
      if (user === USER && pass === PASS) return NextResponse.next();
    } catch {
      // Malformed header → fall through to challenge.
    }
  }
  return challenge();
}

export const config = {
  // Gate everything (pages + API) except Next internals and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
