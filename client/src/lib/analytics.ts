export type PublicEvent =
  | { event_type: "page_view"; label: string }
  | { event_type: "service_click"; label: string; service_id?: string }
  | { event_type: "offer_click"; label: string; offer_id?: string }
  | { event_type: "search"; label: string; search_term: string };

export function trackPublicEvent(event: PublicEvent): void {
  if (typeof navigator === "undefined") return;
  const body = JSON.stringify(event);
  try {
    if (typeof navigator.sendBeacon === "function") {
      const queued = navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
      if (queued) return;
    }
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  } catch {
    // Analytics must never interrupt the visitor's move to WhatsApp.
  }
}
