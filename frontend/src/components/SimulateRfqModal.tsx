"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";

import { SAMPLE_RFQS } from "@/lib/sample-rfqs";
import type { InboundRfqPayload } from "@/lib/types";

const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-amber-200/80 bg-white px-2.5 py-2 text-[11px] text-[#1F2937] outline-none transition-all duration-200 ease-out placeholder:text-[#9CA3AF] focus:border-[#0B2530] focus:ring-2 focus:ring-[#0B2530]/40";

const FIRST_SAMPLE = SAMPLE_RFQS[0];

interface SimulateRfqModalProps {
  onClose: () => void;
  onSubmit: (payload: InboundRfqPayload) => Promise<void>;
}

export default function SimulateRfqModal({
  onClose,
  onSubmit,
}: SimulateRfqModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(FIRST_SAMPLE.id);
  const [sender, setSender] = useState(FIRST_SAMPLE.sender);
  const [subject, setSubject] = useState(FIRST_SAMPLE.subject);
  const [body, setBody] = useState(FIRST_SAMPLE.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function selectSample(sampleId: string) {
    const sample = SAMPLE_RFQS.find((candidate) => candidate.id === sampleId);
    if (!sample) {
      return;
    }
    setSelectedId(sample.id);
    setSender(sample.sender);
    setSubject(sample.subject);
    setBody(sample.body);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await onSubmit({
        sender: sender.trim() || "unknown@sender.com",
        subject: subject.trim() || "Untitled RFQ",
        body,
      });
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not inject the RFQ.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B2530]/35 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="simulate-rfq-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-amber-100/70 bg-white shadow-2xl shadow-[#0B2530]/20"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-amber-100/60 px-5 py-4">
          <div>
            <h2
              id="simulate-rfq-title"
              className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[#0B2530]"
            >
              <Sparkles
                className="h-4 w-4 text-[#0B2530]"
                aria-hidden="true"
              />
              Simulate Inbound RFQ
            </h2>
            <p className="mt-1 text-[10px] text-[#6B7280]">
              Inject a sample email or paste custom text. Rapqo parses, matches,
              prices, and drafts the quotation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close simulation dialog"
            className="rounded-lg p-1 text-[#9CA3AF] transition-all duration-200 ease-out hover:bg-amber-50 hover:text-[#0B2530]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-[#9CA3AF]">
              Sample test cases
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {SAMPLE_RFQS.map((sample, index) => {
                const isSelected = selectedId === sample.id;
                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => selectSample(sample.id)}
                    className={`rounded-xl border p-2.5 text-left transition-all duration-200 ease-out ${
                      isSelected
                        ? "border-[#0B2530] bg-[#F5F5F4]/70"
                        : "border-amber-100/70 bg-white hover:border-amber-200 hover:bg-amber-50/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[9px] text-[#9CA3AF]">
                        #{index + 1} {"\u00B7"} {sample.id}
                      </span>
                      {isSelected ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#0B2530]" />
                      ) : null}
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-[10px] font-semibold tracking-tight text-[#0B2530]">
                      {sample.subject}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[8px] text-[#6B7280]">
                      {sample.sender}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-[9px] leading-snug text-[#6B7280]">
                      {sample.body}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#6B7280]">
                  Sender
                </span>
                <input
                  type="email"
                  value={sender}
                  onChange={(event) => {
                    setSelectedId(null);
                    setSender(event.target.value);
                  }}
                  placeholder="buyer@company.com"
                  className={`${FIELD_CLASS} font-mono`}
                />
              </label>
              <label className="block">
                <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#6B7280]">
                  Subject
                </span>
                <input
                  type="text"
                  value={subject}
                  onChange={(event) => {
                    setSelectedId(null);
                    setSubject(event.target.value);
                  }}
                  placeholder="Requirement list"
                  className={FIELD_CLASS}
                />
              </label>
            </div>

            <label className="mt-3 block">
              <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#6B7280]">
                Email body
              </span>
              <textarea
                value={body}
                onChange={(event) => {
                  setSelectedId(null);
                  setBody(event.target.value);
                }}
                rows={5}
                placeholder="Need 250m 4c 6 sqmm copper cable and 4 nos 32A 3 pole MCB..."
                className={`${FIELD_CLASS} resize-none leading-relaxed`}
              />
            </label>

            {error ? (
              <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[10px] text-rose-700">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-amber-100/60 bg-[#FFF8EC]/70 px-5 py-3">
            <p className="font-mono text-[9px] text-[#9CA3AF]">
              POST /api/inbound-rfq
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] font-medium text-[#4B5563] transition-all duration-200 ease-out hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2530]/40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !body.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B2530] px-3 py-2 text-[10px] font-semibold text-white transition-all duration-200 ease-out hover:bg-[#071A21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2530]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF]"
              >
                {busy ? (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {busy ? "Agent parsing" : "Inject RFQ"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
