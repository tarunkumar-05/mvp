# System Contracts & API Schemas for Rapqo

## 1. Domain Entities

### CatalogItem
```typescript
{
  sku: string;         // e.g., "CAB-CU-4C-06"
  name: string;        // e.g., "Polycab 4C 6 sq.mm Copper Armoured Cable"
  category: string;    // "Cables" | "Switchgear" | "Conduits" | "Fasteners"
  spec: string;
  unit: string;        // "meter" | "piece" | "bundle"
  unit_price: number;
  stock: number;
}



ExtractedRFQItem
TypeScript
{
  raw_query: string;       // Exact string from email
  category: string;        // Inferred category
  specifications: string;  // Extracted specs
  quantity: number;
  unit: string;
}

QuoteLineItem (Matched Result)
TypeScript
{
  id: string;
  raw_query: string;
  matched_sku: string;
  matched_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  confidence_score: number; // 0 to 100
  needs_review: boolean;    // true if confidence < 80
}

QuoteRecord
TypeScript
{
  id: string;              // e.g., "RPQ-2026-101"
  sender: string;
  subject: string;
  received_at: string;
  status: "DRAFT" | "SENT" | "REVIEW";
  items: QuoteLineItem[];
  subtotal: number;
  tax: number;             // 18% GST
  grand_total: number;
}

2. API Endpoints
GET  /api/health -> { status: "ok" }

GET  /api/kpi -> { total_rfqs: number, quotes_drafted: number, pipeline_val: number, avg_turnaround_sec: number }

GET  /api/catalog -> CatalogItem[]

GET  /api/quotes -> QuoteRecord[]

POST /api/inbound-rfq -> Body: { sender: string, subject: string, body: string } -> Response: QuoteRecord

POST /api/quotes/:id/approve -> Updates status to "SENT"

POST /api/webhook/inbound-email -> Body: { from_email: string, sender_name: string, subject: string, body_text: string } -> Response: { status: "success", quote_id: string, email_sent: boolean }

GET  /api/email/status -> { inbound_address: string, smtp_configured: boolean, imap_polling: boolean }

Email loop (optional, environment driven):
- Inbound: POST /api/webhook/inbound-email or the IMAP worker in `backend/email_listener.py` (polls IMAP every 5s, replies, marks mail read).
- Pipeline: `extract_rfq_items` -> `match_catalog_items` -> append to `backend/data/quotes.json` -> ReportLab single-page PDF in `backend/data/documents/<quote_id>.pdf` -> SMTP reply with the PDF attached.
- No SMTP/IMAP credentials: the quote and PDF are still produced, `email_sent` is false, and nothing raises. Configure `SMTP_*`, `IMAP_*`, `EMAIL_USER`, `EMAIL_PASSWORD` and `INBOUND_EMAIL_ADDRESS` (see `backend/.env.example`).

3. UI & Styling Guidelines
App Brand: "Rapqo" / "Rapqo ERP"

Theme: Dark Mode Enterprise Console (bg-slate-950 background, bg-slate-900 cards, border-slate-800 borders).

Header Branding: Rapqo with sub-badge [● Agent Active: Listening on sales@supplier.com]

Layout: Fixed 100vh viewport, 3-column layout (25% Inbox | 45% Matching Workspace | 30% Live Quotation Preview).

Status Colors: Emerald (text-emerald-400 bg-emerald-500/10) for confidence >= 80%; Amber (text-amber-400 bg-amber-500/10) for confidence < 80%.

Document Card: Column 3 quotation must be styled as a realistic white sheet (bg-white text-slate-900) with high-contrast print typography.