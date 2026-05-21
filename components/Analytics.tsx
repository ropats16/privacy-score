"use client";

// Mounts once in the root layout. Fires a `page_view` whenever the route
// changes. Sends a normalized page name only — never the raw path, so a
// scanned wallet address in `/w/<address>` never reaches analytics.

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { EventProps, PageName } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

function pageNameFor(pathname: string): PageName | null {
  if (pathname === "/") return "landing";
  if (pathname === "/methodology") return "methodology";
  if (pathname.startsWith("/w/")) return "scan_result";
  return null; // /admin and anything else is not tracked
}

// Guards against React's dev-mode double-invoked effects double-counting a
// view. A genuine repeat visit always has another route in between.
let lastTrackedPath: string | null = null;

export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === lastTrackedPath) return;
    const page = pageNameFor(pathname);
    if (!page) return;
    lastTrackedPath = pathname;

    const props: EventProps = { page };

    if (document.referrer) {
      try {
        const host = new URL(document.referrer).host;
        if (host && host !== window.location.host) props.ref = host;
      } catch {
        // unparseable referrer — skip
      }
    }

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    const utmMedium = params.get("utm_medium");
    const utmCampaign = params.get("utm_campaign");
    if (utmSource) props.utmSource = utmSource;
    if (utmMedium) props.utmMedium = utmMedium;
    if (utmCampaign) props.utmCampaign = utmCampaign;

    track("page_view", props);
  }, [pathname]);

  return null;
}
