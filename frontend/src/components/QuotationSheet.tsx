"use client";

import { useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Send,
} from "lucide-react";

import { companyFromEmail, formatDate, formatINR } from "@/lib/format";
import type { QuoteRecord } from "@/lib/types";

const SHEET_GRID =
  "grid grid-cols-[minmax(0,1fr)_30px_56px_62px] gap-1.5";

// The document uses inline hex colors (never Tailwind color utilities) so
// html2canvas can rasterize it reliably without hitting oklch() values.
const INK = "#0B2530";
const MUTED = "#6B7280";
const SECONDARY = "#4B5563";
const TERTIARY = "#374151";
const FAINT = "#9CA3AF";
const RULE = "#F1E3C8";
const BRAND = "#0B2530";
const ACCENT = "#0B2530";

interface QuotationSheetProps {
  quote: QuoteRecord | null;
  dispatching: boolean;
  dispatchError: string | null;
  onApprove: () => void;
}

export default function QuotationSheet({
  quote,
  dispatching,
  dispatchError,
  onApprove,
}: QuotationSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleDownload() {
    if (!quote || !sheetRef.current || exporting) {
      return;
    }

    setExporting(true);
    setExportError(null);

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      if (document.fonts) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
        onclone: (clonedDocument) => {
          clonedDocument.documentElement.style.backgroundColor = "#ffffff";
          if (clonedDocument.body) {
            clonedDocument.body.style.backgroundColor = "#ffffff";
            clonedDocument.body.style.color = INK;
          }
        },
      });

      const image = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;

      // Fit the whole sheet on a single A4 page, preserving its aspect ratio,
      // so a quotation never splits across a page break.
      let imageWidth = contentWidth;
      let imageHeight = (canvas.height * contentWidth) / canvas.width;

      if (imageHeight > contentHeight) {
        imageHeight = contentHeight;
        imageWidth = (canvas.width * contentHeight) / canvas.height;
      }

      pdf.addImage(
        image,
        "PNG",
        margin + (contentWidth - imageWidth) / 2,
        margin,
        imageWidth,
        imageHeight,
      );

      pdf.save(`Rapqo-Quotation-${quote.id}.pdf`);
    } catch (error) {
      setExportError(
        error instanceof Error
          ? `PDF export failed: ${error.message}`
          : "PDF export failed.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <aside className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-[#0B2530]">
            Live Quotation Preview
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Client-ready {"\u00B7"} single-page PDF export
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-[#0B2530] ring-1 ring-[#D6D3D1]">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          A4
        </span>
      </div>

      <div className="mt-5 flex-1">
        {quote ? (
          <div
            ref={sheetRef}
            className="rounded-xl p-5 sm:p-6"
            style={{
              backgroundColor: "#ffffff",
              color: INK,
              border: `1px solid ${RULE}`,
              boxShadow: "0 18px 40px -24px rgba(11, 37, 48, 0.35)",
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded"
                  style={{ backgroundColor: BRAND }}
                >
                  <span
                    className="font-mono text-base font-bold leading-none"
                    style={{ color: "#ffffff" }}
                  >
                    R
                  </span>
                </div>
                <div className="min-w-0">
                  <p
                    className="break-words text-[11px] font-bold leading-tight tracking-[0.12em]"
                    style={{ color: BRAND }}
                  >
                    RAPQO INDUSTRIAL SUPPLY
                  </p>
                  <p
                    className="mt-0.5 text-[8px] leading-tight tracking-wide"
                    style={{ color: MUTED }}
                  >
                    Cables {"\u00B7"} Switchgear {"\u00B7"} Conduits {"\u00B7"}{" "}
                    Fasteners
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className="text-[8px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: ACCENT }}
                >
                  Quotation
                </p>
                <p
                  className="mt-0.5 whitespace-nowrap font-mono text-[12px] font-bold leading-tight"
                  style={{ color: INK }}
                >
                  #{quote.id}
                </p>
                <p
                  className="mt-0.5 font-mono text-[8px]"
                  style={{ color: MUTED }}
                >
                  {formatDate(quote.received_at)}
                </p>
              </div>
            </div>

            <div
              className="mt-4 h-[2px] w-full"
              style={{ backgroundColor: BRAND }}
            />

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p
                  className="text-[8px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: FAINT }}
                >
                  Prepared For
                </p>
                <p
                  className="mt-1 text-[10px] font-semibold"
                  style={{ color: INK }}
                >
                  {companyFromEmail(quote.sender)}
                </p>
                <p
                  className="font-mono text-[8px]"
                  style={{ color: SECONDARY }}
                >
                  {quote.sender}
                </p>
              </div>
              <div>
                <p
                  className="text-[8px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: FAINT }}
                >
                  Reference
                </p>
                <p
                  className="mt-1 break-words text-[10px] font-medium leading-snug"
                  style={{ color: INK }}
                >
                  {quote.subject}
                </p>
                <p
                  className="mt-0.5 font-mono text-[8px] uppercase"
                  style={{ color: ACCENT }}
                >
                  Status: {quote.status}
                </p>
              </div>
            </div>

            <div
              className={`mt-4 ${SHEET_GRID} text-[7px] font-semibold uppercase tracking-[0.14em]`}
              style={{ color: MUTED }}
            >
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Amount</span>
            </div>
            <div
              className="mt-1 h-px"
              style={{ backgroundColor: BRAND }}
            />

            <div>
              {quote.items.length === 0 ? (
                <p
                  className="py-3 text-[9px]"
                  style={{ color: MUTED }}
                >
                  No line items extracted from this inquiry.
                </p>
              ) : (
                quote.items.map((line) => (
                  <div
                    key={line.id}
                    className={`${SHEET_GRID} items-start py-3`}
                    style={{ borderBottom: `1px solid ${RULE}` }}
                  >
                    <div className="min-w-0">
                      <p
                        className="break-words text-[9px] font-medium leading-tight"
                        style={{ color: INK }}
                      >
                        {line.matched_name}
                      </p>
                      <p
                        className="mt-0.5 break-words font-mono text-[7px] leading-tight"
                        style={{ color: MUTED }}
                      >
                        {line.matched_sku}
                      </p>
                    </div>
                    <p
                      className="whitespace-nowrap text-right font-mono text-[8px] leading-tight"
                      style={{ color: TERTIARY }}
                    >
                      {line.quantity}
                      <span className="block text-[6px] uppercase">
                        {line.unit}
                      </span>
                    </p>
                    <p
                      className="whitespace-nowrap text-right font-mono text-[8px] leading-tight"
                      style={{ color: TERTIARY }}
                    >
                      {formatINR(line.unit_price)}
                    </p>
                    <p
                      className="whitespace-nowrap text-right font-mono text-[8px] font-semibold leading-tight"
                      style={{ color: INK }}
                    >
                      {formatINR(line.total_price)}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 flex justify-end">
              <div className="w-[62%] min-w-[132px] space-y-1">
                <div
                  className="flex items-center justify-between gap-2 text-[8px]"
                  style={{ color: SECONDARY }}
                >
                  <span>Subtotal</span>
                  <span className="whitespace-nowrap font-mono">
                    {formatINR(quote.subtotal)}
                  </span>
                </div>
                <div
                  className="flex items-center justify-between gap-2 text-[8px]"
                  style={{ color: SECONDARY }}
                >
                  <span className="whitespace-nowrap">GST @ 18%</span>
                  <span className="whitespace-nowrap font-mono">
                    {formatINR(quote.tax)}
                  </span>
                </div>
                <div
                  className="mt-1 flex items-center justify-between gap-2 rounded px-2 py-1.5"
                  style={{ backgroundColor: BRAND, color: "#ffffff" }}
                >
                  <span className="text-[7px] font-semibold uppercase tracking-[0.14em]">
                    Grand Total
                  </span>
                  <span className="whitespace-nowrap font-mono text-[10px] font-bold">
                    {formatINR(quote.grand_total)}
                  </span>
                </div>
              </div>
            </div>

            <p
              className="mt-4 text-[7px] leading-relaxed"
              style={{ color: MUTED }}
            >
              Prices in INR. GST @ 18% as applicable. Validity 15 days from
              issue. Delivery ex-works unless agreed otherwise.
            </p>

            <div className="mt-5 flex items-end justify-between gap-4">
              <p className="text-[7px]" style={{ color: FAINT }}>
                Rapqo Industrial Supply {"\u00B7"} sales@supplier.com
              </p>
              <div className="text-right">
                <div
                  className="mb-1 h-6 w-24"
                  style={{ borderBottom: `1px solid ${FAINT}` }}
                />
                <p
                  className="text-[7px] uppercase tracking-[0.14em]"
                  style={{ color: MUTED }}
                >
                  Authorised Signatory
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-amber-200/70 bg-white/80 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F5F5F4] ring-1 ring-[#D6D3D1]">
              <FileText className="h-6 w-6 text-[#0B2530]/50" aria-hidden="true" />
            </div>
            <p className="mt-4 text-sm font-medium tracking-tight text-stone-700">
              Quotation preview
            </p>
            <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-stone-500">
              Select an RFQ to render a white-sheet quotation with GST totals
              and dispatch controls.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-stone-200 pt-4">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              void handleDownload();
            }}
            disabled={!quote || exporting}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-[11px] font-medium text-stone-700 transition-all duration-200 ease-out hover:border-[#0B2530]/40 hover:text-[#0B2530] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2530]/40 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-50 disabled:text-stone-400"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {exporting ? "Exporting" : "Download PDF"}
          </button>

          <button
            type="button"
            onClick={onApprove}
            disabled={!quote || dispatching || quote.status === "SENT"}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0B2530] px-3 py-2.5 text-[11px] font-semibold text-white transition-all duration-200 ease-out hover:bg-[#071A21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2530]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
          >
            {dispatching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : quote?.status === "SENT" ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {dispatching
              ? "Dispatching"
              : quote?.status === "SENT"
                ? "Quote Dispatched"
                : "Approve & Dispatch Quote"}
          </button>
        </div>

        {exportError ? (
          <p className="mt-2 break-words text-[10px] leading-relaxed text-rose-600">
            {exportError}
          </p>
        ) : null}
        {dispatchError ? (
          <p className="mt-2 break-words text-[10px] leading-relaxed text-rose-600">
            {dispatchError}
          </p>
        ) : null}
        {!exportError && !dispatchError ? (
          <p className="mt-2 text-[10px] leading-relaxed text-stone-500">
            {quote?.status === "SENT"
              ? `Dispatched to ${quote.sender}`
              : "Review edits before exporting or dispatching."}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
