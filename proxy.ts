// The app's only proxy (formerly "middleware" pre-Next 16).
//
// Sole job: gate /admin behind HTTP Basic Auth using the ANALYTICS_TOKEN
// secret. It only gates — it logs nothing and stores nothing.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function unauthorized(): NextResponse {
  return new NextResponse("authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="privacy-score admin", charset="UTF-8"',
    },
  });
}

export function proxy(request: NextRequest): NextResponse {
  const token = process.env.ANALYTICS_TOKEN;
  // No token configured → admin is locked for everyone, including the operator.
  if (!token) return unauthorized();

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const sep = decoded.indexOf(":");
      const password = sep >= 0 ? decoded.slice(sep + 1) : decoded;
      if (constantTimeEqual(password, token)) {
        return NextResponse.next();
      }
    } catch {
      // malformed credentials — fall through to 401
    }
  }
  return unauthorized();
}
