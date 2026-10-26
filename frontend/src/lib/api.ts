import type { InboundRfqPayload, Kpi, QuoteRecord } from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    throw new Error(`Cannot reach the Rapqo backend at ${API_BASE_URL}`);
  }

  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as { detail?: unknown };
      if (typeof payload.detail === "string") {
        detail = payload.detail;
      }
    } catch {
      // Non-JSON error bodies are fine; fall back to the status code.
    }
    throw new Error(detail || `Rapqo API request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export function getQuotes(): Promise<QuoteRecord[]> {
  return apiFetch<QuoteRecord[]>("/api/quotes");
}

export function getKpi(): Promise<Kpi> {
  return apiFetch<Kpi>("/api/kpi");
}

export function createInboundRfq(payload: InboundRfqPayload): Promise<QuoteRecord> {
  return apiFetch<QuoteRecord>("/api/inbound-rfq", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function approveQuote(quoteId: string): Promise<QuoteRecord> {
  return apiFetch<QuoteRecord>(
    `/api/quotes/${encodeURIComponent(quoteId)}/approve`,
    { method: "POST" },
  );
}
