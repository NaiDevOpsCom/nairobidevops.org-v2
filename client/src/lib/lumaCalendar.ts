import ICAL from "ical.js";

// Type for ICAL Time to avoid 'any' usage
type ICALTime = {
  toJSDate: () => Date;
  timezone?: string;
  zone?: {
    tzid: string;
  };
};

export interface LumaEvent {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location?: string;
  url?: string;
  uid: string;
  categories?: string[];
  timezone?: string;
}

// webcal://api.luma.com/ics/get?entity=calendar&id=cal-fFX28aaHRNQkThJ

const LUMA_CALENDAR_ID = "cal-fFX28aaHRNQkThJ";

/**
 * Extract URL from Luma event description if not in URL field
 * Luma often includes the event URL in the description
 */
function extractUrlFromDescription(description: string): string | undefined {
  if (!description) return undefined;

  // Match Luma event URLs
  const lumaUrlMatch = description.match(/https:\/\/lu\.ma\/[a-zA-Z0-9-_]+/i);
  if (lumaUrlMatch) return lumaUrlMatch[0];

  // Match generic URLs in description (using simplified regex)
  const urlMatch = description.match(/https?:\/\/\S+/i);
  if (urlMatch) return urlMatch[0];

  return undefined;
}

export async function fetchLumaEvents(): Promise<LumaEvent[]> {
  const encodedId = encodeURIComponent(LUMA_CALENDAR_ID);
  const proxiedUrl = `/api/luma/ics/get?entity=calendar&id=${encodedId}`;
  let response: Response;

  // 1. Try Proxied Fetch
  const proxyController = new AbortController();
  const proxyTimeoutId = setTimeout(() => proxyController.abort(), 10000); // 10s timeout

  try {
    response = await fetch(proxiedUrl, { signal: proxyController.signal });

    if (!response.ok) {
      throw new Error(`Proxy failed with status: ${response.status}`);
    }
  } catch (error) {
    // If it's a real error (not just a proxy 404/500), or if it's the proxy failing, try fallback
    console.warn("Proxied Luma fetch failed, attempting direct fetch fallback...", error);

    // 2. Try Direct Fetch Fallback (only when not running in a browser)
    if (typeof window === "undefined") {
      const directUrl = `https://api.luma.com/ics/get?entity=calendar&id=${encodedId}`;
      const directController = new AbortController();
      const directTimeoutId = setTimeout(() => directController.abort(), 10000); // 10s timeout

      try {
        response = await fetch(directUrl, { signal: directController.signal });

        if (!response.ok) {
          const directFetchError = new Error(
            `Both proxied and direct fetch failed. Direct status: ${response.status}`
          );
          (directFetchError as unknown as { cause?: unknown }).cause = error;
          throw directFetchError;
        }
      } finally {
        clearTimeout(directTimeoutId);
      }
    } else {
      const proxyFetchError = new Error(
        "Failed to fetch Luma events via proxy (direct fetch is blocked by CORS)."
      );
      (proxyFetchError as unknown as { cause?: unknown }).cause = error;
      throw proxyFetchError;
    }
  } finally {
    clearTimeout(proxyTimeoutId);
  }

  const icsData = await response.text();

  if (!icsData || !icsData.includes("BEGIN:VCALENDAR")) {
    throw new Error("Invalid ICS response (missing VCALENDAR)");
  }

  let jcalData: unknown;
  try {
    jcalData = ICAL.parse(icsData);
  } catch {
    throw new Error("Failed to parse ICS response");
  }
  // @ts-expect-error - ICAL.parse returns a jCal object which Component expects
  const component = new ICAL.Component(jcalData);
  const events = component.getAllSubcomponents("vevent");

  return events
    .map((event): LumaEvent | null => {
      const summary = event.getFirstPropertyValue("summary")?.toString() || "Untitled Event";
      const description = event.getFirstPropertyValue("description")?.toString() || "";

      const start = event.getFirstPropertyValue("dtstart") as unknown as ICALTime | null;
      if (!start || typeof start.toJSDate !== "function") return null;

      const end = event.getFirstPropertyValue("dtend") as unknown as ICALTime | null;

      const startJs = start.toJSDate();
      const endJs = end && typeof end.toJSDate === "function" ? end.toJSDate() : startJs;

      const location = event.getFirstPropertyValue("location")?.toString();
      let url = event.getFirstPropertyValue("url")?.toString();

      // Use a deterministic fallback for the UID
      const uid =
        event.getFirstPropertyValue("uid")?.toString() || `${summary}-${startJs.toISOString()}`;

      // Correctly get the ICAL.Property object to safely call getValues()
      const categoriesProperty = event.getFirstProperty("categories");
      const categories = categoriesProperty
        ? categoriesProperty.getValues().map((v: unknown) => String(v))
        : [];

      // If no URL field, try to extract from description
      if (!url && description) {
        url = extractUrlFromDescription(description);
      }

      return {
        title: summary,
        description,
        startDate: startJs.toISOString(),
        endDate: endJs.toISOString(),
        location,
        url,
        uid,
        categories,
        timezone:
          start.zone?.tzid || (typeof start.timezone === "string" ? start.timezone : undefined),
      };
    })
    .filter((event): event is LumaEvent => {
      if (!event) return false;
      // Only include events that are currently active or in the future
      const eventEndDate = new Date(event.endDate);
      const now = new Date();
      return eventEndDate >= now;
    })
    .sort((a: LumaEvent, b: LumaEvent) => {
      // Sort by date, soonest first
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
}
