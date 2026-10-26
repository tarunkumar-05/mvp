export type QuoteStatus = "DRAFT" | "SENT" | "REVIEW";

export type Unit = "meter" | "piece" | "bundle";

export interface QuoteLineItem {
  id: string;
  raw_query: string;
  matched_sku: string;
  matched_name: string;
  quantity: number;
  unit: Unit;
  unit_price: number;
  total_price: number;
  confidence_score: number;
  needs_review: boolean;
}

export interface QuoteRecord {
  id: string;
  sender: string;
  subject: string;
  received_at: string;
  status: QuoteStatus;
  items: QuoteLineItem[];
  subtotal: number;
  tax: number;
  grand_total: number;
}

export interface Kpi {
  total_rfqs: number;
  quotes_drafted: number;
  pipeline_val: number;
  avg_turnaround_sec: number;
}

export interface InboundRfqPayload {
  sender: string;
  subject: string;
  body: string;
}

export interface SampleRfq {
  id: string;
  sender: string;
  subject: string;
  body: string;
}

export interface LineEdit {
  quantity?: number;
  unit_price?: number;
}

export type ApiStatus = "connecting" | "live" | "offline";
