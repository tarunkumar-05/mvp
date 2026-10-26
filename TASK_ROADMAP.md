# Rapqo MVP Task Roadmap

## Phase 1: Environment & Mock Data
- [x] 1.1 Populate `backend/data/catalog.json` with 25 realistic electrical/hardware SKUs from `MOCK_DATA.json`.
- [x] 1.2 Populate `backend/data/sample_rfqs.json` with 3 test cases (Clean, Messy, Edge Case).

## Phase 2: Backend Development (FastAPI)
- [x] 2.1 Set up FastAPI app structure with CORS enabled.
- [x] 2.2 Implement Catalog search and `/api/catalog` endpoint.
- [x] 2.3 Build LLM extraction service using Pydantic strict output.
- [x] 2.4 Build `RapidFuzz` hybrid matching engine with confidence scoring.
- [x] 2.5 Build `/api/inbound-rfq` endpoint linking parser -> matcher -> quote generator.
- [x] 2.6 Implement `/api/kpi` calculation endpoint.

## Phase 3: Frontend Development (Next.js)
- [x] 3.1 Initialize clean Tailwind Next.js layout with the warm Zoho CRM aesthetic (cream canvas, royal blue accent, white cards).
- [x] 3.2 Build Top KPI Ribbon component.
- [x] 3.3 Build Column 1: Live Inbox Feed with "Simulate Inbound RFQ" modal.
- [x] 3.4 Build Column 2: ERP Line-Item Matcher table with inline price/qty edits and confidence badges.
- [x] 3.5 Build Column 3: Quotation Sheet summary and client details.
- [x] 3.6 Implement PDF export on Quotation Sheet using `jspdf` / `html2canvas`.
- [x] 3.7 Add real-time polling (3-second interval) so incoming simulated emails trigger instant UI updates.

## Phase 4: Integration Verification
- [x] 4.1 Run end-to-end test with Sample RFQ #2 (Messy Email). Verify auto-pricing and PDF generation.
- [x] 4.2 Re-theme the frontend to the Zoho CRM palette (cream `#FFF8EC` canvas, royal blue `#1F69FF` actions, navy `#0B2530` anchors) and verify live recalc + single-page PDF export.
- [x] 4.3 Replace the fixed-height viewport with a scrolling Zoho-style landing page (hero, 4 KPI cards, feature architecture) above a wide 3-column ERP workspace; verify smooth scroll, no horizontal overflow at 320/360/390px, 3s polling, 18% GST recalc and single-page PDF export, plus a clean `npm run build`.
- [x] 4.4 Split the frontend into two routes: `/` as the investor/evaluator pitch (hero, market gap, three-dimensional pipeline, integrations, benchmarks, evaluator banner) and `/app` as the interactive MVP console (KPI cards + 3-column workspace, 3s polling, GST recalc, PDF export, simulate modal), with `<Link>` client-side navigation in both directions.

## Phase 5: Live Email Loop (inbound RFQ -> emailed PDF quotation)
- [x] 5.1 Add `reportlab` to `backend/requirements.txt` and install it into `backend/venv`; build `backend/quotation_pdf.py` producing a guaranteed single-page A4 quotation PDF.
- [x] 5.2 Build `backend/email_service.py` (SMTP settings from env, quotation email composition, PDF attachment, graceful failure when unconfigured) and `backend/email_listener.py` (5s IMAP poll worker that replies and marks mail read).
- [x] 5.3 Add `POST /api/webhook/inbound-email` plus the shared `process_inbound_email` pipeline and `GET /api/email/status`; document SMTP/IMAP variables in `backend/.env.example`.
- [x] 5.4 Add the "Live Evaluator Test" email banner on both `/` and `/app`, wired to `/api/email/status` with a demo-address fallback. *(Retired in 5.6: banner removed at the client's request, email loop remains server-side.)*
- [x] 5.5 Verify the loop end to end: webhook stores the quote, writes a 1-page PDF, mocked SMTP delivers the attachment, IMAP worker marks the message read, and `npm run build` / `tsc --noEmit` stay clean.
- [x] 5.6 Remove the demo-inbox banner and its now-dead client wiring (`EvaluatorTestBanner`, `getEmailStatus`, `EmailStatus`); add staggered `fadeInUp` entry animations (`animate-fade-in-up`, `delay-100`…`delay-400`) with a `prefers-reduced-motion` opt-out, plus `transition-all duration-200 ease-out` micro-transitions and hover lifts; verify `npm run build` and `tsc --noEmit`.
- [x] 5.7 Rebuild the brand mark as a navy `#0B2530` monogram tile + uppercase RAPQO wordmark (`RapqoLogo`), collapse both headers into a single non-sticky 60px bar with an "Agent Active" pulse badge, trim landing nav to Overview / Market Gap / How It Works / Integrations, and drop `scroll-padding-top` to `1.5rem` now that nothing overlays anchors; verify scroll-away (`relative`), anchor offset (24px), mobile layout, and `npm run build` / `tsc --noEmit` / `next lint`.
- [x] 5.8 Replace frontend blue UI accents with the dark petroleum navy palette for text, buttons, badges, controls, focus states, and supporting surfaces; verify build, typecheck, and lint.
