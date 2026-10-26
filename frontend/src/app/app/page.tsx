"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Radio } from "lucide-react";

import ConsoleHeader from "@/components/ConsoleHeader";
import InboxPanel from "@/components/InboxPanel";
import KpiRibbon from "@/components/KpiRibbon";
import MatchingWorkspace from "@/components/MatchingWorkspace";
import QuotationSheet from "@/components/QuotationSheet";
import SimulateRfqModal from "@/components/SimulateRfqModal";
import { approveQuote, createInboundRfq, getKpi, getQuotes } from "@/lib/api";
import { clearQuoteEdits, recomputeQuote } from "@/lib/quote-math";
import type {
  ApiStatus,
  InboundRfqPayload,
  Kpi,
  LineEdit,
  QuoteRecord,
} from "@/lib/types";

const POLL_INTERVAL_MS = 3000;

const WORKSPACE_STATUS: Record<
  ApiStatus,
  { label: string; tone: string; dot: string }
> = {
  connecting: {
    label: "Connecting to the agent",
    tone: "border-stone-200 bg-white text-stone-500",
    dot: "bg-stone-400",
  },
  live: {
    label: "Polling every 3 seconds",
    tone: "border-[#D6D3D1] bg-[#F5F5F4] text-[#0B2530]",
    dot: "bg-[#0B2530]",
  },
  offline: {
    label: "Backend offline, showing cache",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
};

export default function ConsolePage() {
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("connecting");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, LineEdit>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<{
    quoteId: string;
    message: string;
  } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextQuotes, nextKpi] = await Promise.all([getQuotes(), getKpi()]);
      setQuotes(nextQuotes);
      setKpi(nextKpi);
      setApiStatus("live");
    } catch {
      setApiStatus("offline");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const [nextQuotes, nextKpi] = await Promise.all([getQuotes(), getKpi()]);
        if (cancelled) {
          return;
        }
        setQuotes(nextQuotes);
        setKpi(nextKpi);
        setApiStatus("live");
      } catch {
        if (!cancelled) {
          setApiStatus("offline");
        }
      }
    }

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const activeQuoteId = useMemo(() => {
    if (activeId && quotes.some((quote) => quote.id === activeId)) {
      return activeId;
    }
    return quotes.length > 0 ? quotes[quotes.length - 1].id : null;
  }, [activeId, quotes]);

  const activeQuote = useMemo(() => {
    const base = quotes.find((quote) => quote.id === activeQuoteId);
    return base ? recomputeQuote(base, edits) : null;
  }, [activeQuoteId, edits, quotes]);

  const activeDispatchError =
    activeQuote && dispatchError?.quoteId === activeQuote.id
      ? dispatchError.message
      : null;

  function handleSelect(quoteId: string) {
    setActiveId(quoteId);
    setDispatchError(null);
  }

  function handleLineEdit(quoteId: string, lineId: string, patch: LineEdit) {
    const key = `${quoteId}::${lineId}`;
    setEdits((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...patch,
      },
    }));
  }

  async function handleSimulate(payload: InboundRfqPayload) {
    const created = await createInboundRfq(payload);
    setActiveId(created.id);
    setDispatchError(null);
    setQuotes((current) => [
      ...current.filter((quote) => quote.id !== created.id),
      created,
    ]);
    await refresh();
  }

  async function handleApprove() {
    if (!activeQuote || dispatching) {
      return;
    }

    const quoteId = activeQuote.id;
    setDispatching(true);
    setDispatchError(null);

    try {
      const sent = await approveQuote(quoteId);
      setQuotes((current) =>
        current.map((quote) => (quote.id === sent.id ? sent : quote)),
      );
      setEdits((current) => clearQuoteEdits(current, sent.id));
      await refresh();
    } catch (error) {
      setDispatchError({
        quoteId,
        message:
          error instanceof Error ? error.message : "Could not dispatch quote.",
      });
    } finally {
      setDispatching(false);
    }
  }

  const workspaceStatus = WORKSPACE_STATUS[apiStatus];

  return (
    <div className="min-h-screen bg-[#FFF8EC]/40 text-stone-900">
      <ConsoleHeader
        apiStatus={apiStatus}
        onSimulate={() => setModalOpen(true)}
      />

      <main className="mx-auto w-full max-w-[1600px] px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        <div className="animate-fade-in-up flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0B2530]">
              Live MVP console
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0B2530] text-balance sm:text-4xl">
              Run an industrial quotation end to end.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600">
              Pick an inbound RFQ, review the extracted specifications, adjust
              quantities or rates, then export a single-page PDF or dispatch the
              quote to the customer.
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-medium md:self-auto ${workspaceStatus.tone}`}
          >
            <span className={`h-2 w-2 rounded-full ${workspaceStatus.dot}`} />
            {workspaceStatus.label}
          </span>
        </div>

        <div className="mt-8">
          <KpiRibbon kpi={kpi} />
        </div>

        <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <div className="animate-fade-in-up delay-300 min-h-[600px] rounded-2xl border border-stone-200 bg-white p-4 shadow-sm lg:col-span-3">
            <InboxPanel
              quotes={quotes}
              activeId={activeQuoteId}
              onSelect={handleSelect}
            />
          </div>

          <div className="animate-fade-in-up delay-300 min-h-[600px] rounded-2xl border border-stone-200 bg-white p-6 shadow-sm lg:col-span-5">
            <MatchingWorkspace quote={activeQuote} onLineEdit={handleLineEdit} />
          </div>

          <div className="animate-fade-in-up delay-300 min-h-[600px] rounded-2xl border border-amber-200/60 bg-[#FFF8EC] p-6 shadow-sm lg:col-span-4">
            <QuotationSheet
              quote={activeQuote}
              dispatching={dispatching}
              dispatchError={activeDispatchError}
              onApprove={() => {
                void handleApprove();
              }}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-amber-100/70 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-6 py-8 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#0B2530]">
              <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
              3s polling
            </span>
            <span className="text-stone-300">{"|"}</span>
            <span className="inline-flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              1-page A4 export {"\u00B7"} 18% GST
            </span>
          </p>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-medium text-[#0B2530] transition-all duration-200 ease-out hover:text-[#0B2530]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to Overview / Pitch
          </Link>
        </div>
      </footer>

      {modalOpen ? (
        <SimulateRfqModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleSimulate}
        />
      ) : null}
    </div>
  );
}
