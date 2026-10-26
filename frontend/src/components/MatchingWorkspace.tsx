"use client";

import { ScanSearch } from "lucide-react";

import StatusBadge from "@/components/StatusBadge";
import { formatINR } from "@/lib/format";
import type { LineEdit, QuoteRecord } from "@/lib/types";

interface MatchingWorkspaceProps {
  quote: QuoteRecord | null;
  onLineEdit: (quoteId: string, lineId: string, patch: LineEdit) => void;
}

const INPUT_CLASS =
  "mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 font-mono text-xs text-stone-800 outline-none transition-all duration-200 ease-out focus:border-[#0B2530] focus:ring-2 focus:ring-[#0B2530]/40";

const ROW_GRID =
  "grid grid-cols-1 gap-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)] md:gap-5";

function ConfidencePill({ score }: { score: number }) {
  const confident = score >= 80;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium ${
        confident
          ? "border-[#D6D3D1] bg-[#F5F5F4] text-[#0B2530]"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
      title={
        confident
          ? "High confidence match"
          : "Low confidence, needs human review"
      }
    >
      {score.toFixed(0)}%
    </span>
  );
}

export default function MatchingWorkspace({
  quote,
  onLineEdit,
}: MatchingWorkspaceProps) {
  const matchedCount = quote
    ? quote.items.filter((line) => line.matched_sku !== "UNMATCHED").length
    : 0;
  const reviewCount = quote
    ? quote.items.filter((line) => line.needs_review).length
    : 0;

  return (
    <section className="flex h-full flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-[#0B2530]">
            SKU Matching Workspace
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Hybrid fuzzy match {"\u00B7"} live re-pricing
          </p>
        </div>
        {quote ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-md bg-[#F5F5F4] px-2 py-1 font-mono text-[10px] font-medium text-[#0B2530] ring-1 ring-[#D6D3D1]">
              {matchedCount}/{quote.items.length} matched
            </span>
            {reviewCount > 0 ? (
              <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-mono text-[10px] font-medium text-amber-700">
                {reviewCount} review
              </span>
            ) : (
              <span className="rounded-md border border-[#D6D3D1] bg-[#F5F5F4] px-2 py-1 font-mono text-[10px] font-medium text-[#0B2530]">
                clean
              </span>
            )}
          </div>
        ) : null}
      </div>

      {quote ? (
        <>
          <div className="mt-4 rounded-xl border border-stone-200 bg-[#FFF8EC]/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold tracking-tight text-[#0B2530]">
                  {quote.subject}
                </p>
                <p className="mt-1 break-words font-mono text-[10px] text-stone-500">
                  {quote.sender} {"\u00B7"} {quote.id}
                </p>
              </div>
              <StatusBadge status={quote.status} />
            </div>

            <div className="mt-4 rounded-lg border border-stone-200 bg-white px-3.5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                Customer inquiry excerpt
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                {quote.items.map((line) => line.raw_query).join("   \u2022   ") ||
                  "No line items extracted."}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="grid grid-cols-1 gap-4 border-b border-stone-200 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)] md:gap-5">
              <span>Customer Inquiry</span>
              <span>Matched Catalog SKU &amp; Spec</span>
              <span className="md:text-right">Qty / Price / Total</span>
            </div>

            <div className="divide-y divide-stone-100">
              {quote.items.map((line, index) => (
                <div
                  key={line.id}
                  className={ROW_GRID}
                >
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] text-stone-300">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-1 break-words text-xs leading-relaxed text-stone-600">
                      {line.raw_query}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium leading-snug tracking-tight text-[#0B2530]">
                      {line.matched_name}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#F5F5F4] px-2 py-0.5 font-mono text-[10px] font-medium text-[#0B2530] ring-1 ring-[#D6D3D1]">
                        {line.matched_sku}
                      </span>
                      <ConfidencePill score={line.confidence_score} />
                      {line.needs_review ? (
                        <span className="text-[10px] font-medium text-amber-600">
                          review
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                          Qty
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={line.quantity}
                          aria-label={`Quantity for ${line.raw_query}`}
                          onChange={(event) => {
                            const parsed = Number(event.target.value);
                            onLineEdit(quote.id, line.id, {
                              quantity: Number.isFinite(parsed)
                                ? Math.max(0, Math.floor(parsed))
                                : 0,
                            });
                          }}
                          className={INPUT_CLASS}
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                          Rate
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={line.unit_price}
                          aria-label={`Unit price for ${line.raw_query}`}
                          onChange={(event) => {
                            const parsed = Number(event.target.value);
                            onLineEdit(quote.id, line.id, {
                              unit_price: Number.isFinite(parsed)
                                ? Math.max(0, parsed)
                                : 0,
                            });
                          }}
                          className={INPUT_CLASS}
                        />
                      </label>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-stone-500">
                        Subtotal
                      </span>
                      <span className="whitespace-nowrap font-mono text-sm font-semibold text-[#0B2530]">
                        {formatINR(line.total_price)}
                      </span>
                    </div>
                    <p className="mt-1 text-right font-mono text-[10px] text-stone-400">
                      per {line.unit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F5F5F4] ring-1 ring-[#D6D3D1]">
            <ScanSearch
              className="h-6 w-6 text-[#0B2530]/60"
              aria-hidden="true"
            />
          </div>
          <p className="mt-4 text-sm font-medium tracking-tight text-stone-700">
            Select an RFQ from the inbound queue
          </p>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-stone-500">
            Rapqo will show the extracted inquiry beside its matched catalog SKU,
            confidence score, and editable pricing.
          </p>
        </div>
      )}
    </section>
  );
}
