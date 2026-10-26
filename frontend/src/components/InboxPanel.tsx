"use client";

import { useMemo, useState } from "react";
import { Inbox, Radio } from "lucide-react";

import StatusBadge from "@/components/StatusBadge";
import { companyFromEmail, formatTimestamp } from "@/lib/format";
import type { QuoteRecord } from "@/lib/types";

type InboxFilter = "ALL" | "REVIEW" | "SENT";

const FILTERS: Array<{ id: InboxFilter; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "REVIEW", label: "Review" },
  { id: "SENT", label: "Sent" },
];

const CARD_BASE =
  "w-full rounded-xl border-t border-r border-b border-l-4 p-3.5 text-left transition-all duration-200 ease-out";

interface InboxPanelProps {
  quotes: QuoteRecord[];
  activeId: string | null;
  onSelect: (quoteId: string) => void;
}

export default function InboxPanel({
  quotes,
  activeId,
  onSelect,
}: InboxPanelProps) {
  const [filter, setFilter] = useState<InboxFilter>("ALL");

  const counts = useMemo(
    () => ({
      ALL: quotes.length,
      REVIEW: quotes.filter((quote) => quote.status === "REVIEW").length,
      SENT: quotes.filter((quote) => quote.status === "SENT").length,
    }),
    [quotes],
  );

  const visibleQuotes = useMemo(() => {
    const filtered =
      filter === "ALL"
        ? quotes
        : quotes.filter((quote) => quote.status === filter);
    return [...filtered].reverse();
  }, [filter, quotes]);

  return (
    <section className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-[#0B2530]" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-tight text-[#0B2530]">
            Inbound Queue
          </h2>
          <span className="rounded-md bg-[#F5F5F4] px-2 py-0.5 font-mono text-[10px] font-medium text-[#0B2530] ring-1 ring-[#D6D3D1]">
            {quotes.length}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#0B2530]">
          <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
          3s
        </span>
      </div>

      <div className="flex gap-1 border-b border-stone-200 py-3">
        {FILTERS.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs transition-all duration-200 ease-out ${
                isActive
                  ? "border-[#0B2530]/30 bg-[#F5F5F4] font-semibold text-[#0B2530]"
                  : "border-transparent font-medium text-stone-500 hover:bg-stone-50 hover:text-[#0B2530]"
              }`}
            >
              {tab.label}
              <span
                className={`ml-1 font-mono text-[10px] ${
                  isActive ? "text-[#0B2530]/70" : "text-stone-400"
                }`}
              >
                {counts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 space-y-2.5">
        {visibleQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F5F4] ring-1 ring-[#D6D3D1]">
              <Inbox className="h-5 w-5 text-[#0B2530]/60" aria-hidden="true" />
            </div>
            <p className="mt-4 text-sm font-medium text-stone-700">
              {filter === "ALL"
                ? "Listening for inbound RFQs"
                : `No ${filter.toLowerCase()} quotes`}
            </p>
            <p className="mt-1.5 max-w-[220px] text-xs leading-relaxed text-stone-500">
              {filter === "ALL"
                ? "Simulate an email and Rapqo will parse, match, and draft the quote."
                : "Switch back to All to see the rest of the queue."}
            </p>
          </div>
        ) : (
          visibleQuotes.map((quote) => {
            const isActive = quote.id === activeId;
            return (
              <button
                key={quote.id}
                type="button"
                onClick={() => onSelect(quote.id)}
                aria-pressed={isActive}
                className={`${CARD_BASE} ${
                  isActive
                    ? "border-t-[#D6D3D1] border-r-[#D6D3D1] border-b-[#D6D3D1] border-l-[#0B2530] bg-[#F5F5F4]/60"
                    : "border-t-stone-200 border-r-stone-200 border-b-stone-200 border-l-transparent bg-white hover:bg-[#FFF8EC]/70"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-xs font-semibold tracking-tight text-[#0B2530]">
                      {companyFromEmail(quote.sender)}
                    </p>
                    <p className="mt-0.5 break-words font-mono text-[10px] text-stone-500">
                      {quote.sender}
                    </p>
                  </div>
                  <StatusBadge status={quote.status} />
                </div>

                <p className="mt-2.5 text-xs leading-relaxed text-stone-600">
                  {quote.subject}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-stone-400">
                  <span>{quote.id}</span>
                  <span>{formatTimestamp(quote.received_at)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
