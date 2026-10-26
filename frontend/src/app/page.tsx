import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowRightLeft,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Gauge,
  IndianRupee,
  Mail,
  ScanText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Workflow,
} from "lucide-react";

import HeaderBar from "@/components/HeaderBar";

export const metadata = {
  title: "Rapqo \u00B7 The Autonomous B2B Quotation Engine",
  description:
    "Rapqo closes the 45-minute quotation latency gap for industrial suppliers: messy buyer inquiries become deterministic catalog matches and 18% GST quotations in under 4 seconds.",
};

const FRICTION_STATS = [
  {
    value: "60%",
    label: "of high-value wholesale deals lost to response latency",
    note: "The first credible quote usually wins the order, not the cheapest one.",
    icon: TrendingUp,
  },
  {
    value: "45 min",
    label: "average manual turnaround for a single inbound RFQ",
    note: "Re-keying, catalogue lookups and GST checks happen one line at a time.",
    icon: Clock3,
  },
  {
    value: "6mm\u00B2",
    label: "read as 16mm\u00B2 silently reprices an entire BOQ",
    note: "Cross-section and unit mix-ups survive review because nothing validates the number.",
    icon: AlertTriangle,
  },
];

const MANUAL_FAILURES = [
  "A buyer sends a PDF with mixed units, abbreviations and missing grades, and a rep retypes every line by hand.",
  "Wire cross-sections get read off a phone photo: 6mm\u00B2 becomes 16mm\u00B2 and the whole BOQ is priced wrong.",
  "Rates are copied from last quarter's sheet, so the ERP, the email thread and the PDF all disagree.",
  "Tax is recalculated manually, GST lines drift, and a finance reviewer rebuilds the quote before it can ship.",
  "Forty-five minutes later the reply lands. The buyer already awarded the order to a faster supplier.",
];

const PIPELINE = [
  {
    step: "01",
    title: "Ingestion",
    icon: Mail,
    tone: "bg-[#F5F5F4] text-[#0B2530]",
    summary: "Multi-format email and PDF parsing with zero data prep.",
    points: [
      "Reads the raw inquiry body, attachments and forwarded threads",
      "Extracts quantity, unit, grade and delivery constraints",
      "Flags missing specifications before any price is generated",
    ],
  },
  {
    step: "02",
    title: "Hybrid Deterministic Matching",
    icon: Workflow,
    tone: "bg-emerald-50 text-emerald-600",
    summary:
      "Token-set ratio plus exact numeric overlap, so a 6mm\u00B2 cable can never resolve to a 16mm\u00B2 SKU.",
    points: [
      "Fuzzy token matching is gated by numeric and unit agreement",
      "Every rate is read from the catalog master, never generated",
      "Confidence scoring surfaces low-certainty lines for review",
    ],
  },
  {
    step: "03",
    title: "Human-in-the-Loop & Dispatch",
    icon: FileText,
    tone: "bg-amber-50 text-amber-600",
    summary:
      "Instant reactive GST recalculations and a single-page A4 PDF ready to send.",
    points: [
      "Editable quantities and rates recompute subtotal, 18% GST and grand total live",
      "Reviewers approve with the full audit trail attached to the quote",
      "One-page A4 dispatch artifact, no spreadsheet stitching",
    ],
  },
];

const BENCHMARKS = [
  {
    value: "0.02s \u2013 4s",
    label: "Parse \u2192 match \u2192 quote latency",
    note: "Measured from inbound payload to a priced, review-ready draft.",
    icon: Gauge,
  },
  {
    value: "100%",
    label: "Catalog price integrity",
    note: "Every line item is priced from the SKU master, never from a model.",
    icon: ShieldCheck,
  },
  {
    value: "0%",
    label: "Rate hallucination",
    note: "Deterministic matching keeps generative text away from the price column.",
    icon: BadgeCheck,
  },
  {
    value: "18%",
    label: "Automated GST compliance",
    note: "Tax is applied and re-applied on every edit before dispatch.",
    icon: IndianRupee,
  },
];

const MOATS = [
  {
    title: "Catalog-anchored determinism",
    body: "Matching is token-set similarity plus numeric overlap. A wrong cross-section fails the numeric gate instead of slipping through as a plausible sentence.",
  },
  {
    title: "Auditable human-in-the-loop",
    body: "Every quantity and rate change is an explicit, reversible edit, so the approved quote can always be traced back to the catalog line it came from.",
  },
  {
    title: "Dispatch-ready output",
    body: "The artifact is a single-page A4 PDF with GST totals, not a draft that still needs a finance pass before it can leave the building.",
  },
];

const INBOUND_CHANNELS = [
  "Gmail API webhooks",
  "Outlook 365 subscriptions",
  "PDF + attachment scrapers",
  "Shared sales inbox routing",
];

const ERP_TARGETS = [
  "SAP S/4HANA",
  "Oracle NetSuite",
  "Tally Prime",
  "REST / JSON API",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-stone-900">
      <HeaderBar />

      <main>
        {/* Section 1: Hero */}
        <section
          id="overview"
          className="border-b border-amber-100/60 bg-gradient-to-b from-[#FFF8EC] via-[#FFF8EC]/70 to-white"
        >
          <div className="mx-auto max-w-[1400px] px-6 py-20 text-center sm:py-28">
            <span className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white px-4 py-1.5 text-xs font-medium text-[#0B2530] shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-[#0B2530]" aria-hidden="true" />
              Autonomous B2B Quotation Engine
            </span>

            <h1 className="animate-fade-in-up delay-100 mx-auto mt-8 max-w-5xl text-4xl font-bold tracking-tight text-[#0B2530] text-balance sm:text-5xl lg:text-6xl">
              The <span className="text-[#0B2530]">Autonomous</span> B2B Quotation
              Engine for <span className="text-[#0B2530]">Industrial Supply</span>.
            </h1>

            <p className="animate-fade-in-up delay-100 mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-stone-600 sm:text-xl">
              Closing the 45-minute quotation latency gap. Transforming messy,
              fragmented buyer inquiries into deterministic catalog matches and
              18% GST quotations in under 4 seconds.
            </p>

            <div className="animate-fade-in-up delay-200 mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/app"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B2530] px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-[#071A21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2530]/40 focus-visible:ring-offset-2 sm:w-auto"
              >
                Launch Working MVP
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#market-gap"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-8 py-3.5 text-sm font-semibold text-[#0B2530] shadow-xs transition-all duration-200 ease-out hover:border-[#0B2530]/40 hover:text-[#0B2530] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2530]/40 sm:w-auto"
              >
                Explore Market Case
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <ul className="animate-fade-in-up delay-300 mx-auto mt-12 flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium text-stone-500">
              {[
                "Zero data prep on inbound RFQs",
                "Catalog-anchored, deterministic pricing",
                "One-page A4 quotation dispatch",
              ].map((item) => (
                <li key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2
                    className="h-4 w-4 text-[#0B2530]"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Section 2: Market & financial bottleneck */}
        <section id="market-gap" className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-[1400px] px-6">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0B2530]">
                The market gap
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0B2530] text-balance sm:text-4xl">
                Suppliers lose 60% of high-value wholesale deals to response
                latency.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-stone-600 sm:text-lg">
                Industrial quotation is still a manual relay race between an
                inbox, a catalog PDF and a spreadsheet. Every hand-off adds
                minutes, and every minute hands the order to whoever replies
                first with a number the buyer can trust.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
              {FRICTION_STATS.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.value}
                    className={`rounded-2xl border border-stone-200 p-6 shadow-xs ${
                      index === 1 ? "bg-white" : "bg-[#FFF8EC]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-mono text-4xl font-semibold leading-none tracking-tight text-[#0B2530]">
                        {stat.value}
                      </p>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-stone-100">
                        <Icon className="h-5 w-5 text-[#0B2530]" aria-hidden="true" />
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-medium leading-snug text-[#0B2530]">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-stone-500">
                      {stat.note}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 overflow-hidden rounded-3xl bg-[#0B2530] p-8 sm:p-10">
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A9C9E6]">
                    The manual nightmare
                  </p>
                  <h3 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    The bottleneck is not the price. It is the re-keying.
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-slate-300">
                    A skilled rep is not slow because they cannot price an RFQ.
                    They are slow because five manual steps sit between the
                    inquiry and a dispatachable quotation, and each step quietly
                    leaks margin.
                  </p>
                  <p className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-[11px] text-slate-300">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                    {"6mm\u00B2 vs 16mm\u00B2: one digit, an entire BOQ repriced"}
                  </p>
                </div>

                <ul className="space-y-4">
                  {MANUAL_FAILURES.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0B2530]" />
                      <span className="text-sm leading-relaxed text-slate-300">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: How Rapqo works */}
        <section
          id="how-it-works"
          className="border-y border-amber-100/80 bg-[#FFF8EC]/60 py-20 sm:py-24"
        >
          <div className="mx-auto max-w-[1400px] px-6">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0B2530]">
                How Rapqo works
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0B2530] text-balance sm:text-4xl">
                One intelligence. A three-dimensional core.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-stone-600">
                Every inquiry moves through the same deterministic pipeline, so
                the price a rep reviews is the price the customer receives.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {PIPELINE.map((stage) => {
                const Icon = stage.icon;
                return (
                  <div key={stage.step} className="animate-fade-in-up delay-200">
                    <article className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-8 shadow-xs transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#D6D3D1] hover:shadow-md">
                      <div className="flex items-center justify-between">
                        <span
                          className={`flex h-14 w-14 items-center justify-center rounded-xl ${stage.tone}`}
                        >
                          <Icon className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <span className="font-mono text-xs text-stone-300">
                          {stage.step}
                        </span>
                      </div>
                      <h3 className="mt-6 text-xl font-semibold tracking-tight text-[#0B2530]">
                        {stage.title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-stone-600">
                        {stage.summary}
                      </p>
                      <ul className="mt-auto space-y-3 pt-6 text-sm text-stone-600">
                        {stage.points.map((point) => (
                          <li key={point} className="flex items-start gap-2.5">
                            <CheckCircle2
                              className="mt-0.5 h-4 w-4 shrink-0 text-[#0B2530]"
                              aria-hidden="true"
                            />
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 4: Integrations */}
        <section id="integrations" className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-[1400px] px-6">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0B2530]">
                Enterprise integrations
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0B2530] text-balance sm:text-4xl">
                Built to sit inside the workflow your team already runs.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-stone-600">
                Rapqo is not another destination tool. It listens where inquiries
                land and writes back where purchase history lives.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <article className="rounded-2xl border border-stone-200 bg-white p-8 shadow-xs">
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#F5F5F4] text-[#0B2530]">
                  <Mail className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-[#0B2530]">
                  Inbound connectivity
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-600">
                  Webhook subscriptions on the sales inbox and attachment
                  scrapers for PDFs, so the agent sees the inquiry the moment it
                  arrives. No forwarding rules, no CSV exports, no data prep.
                </p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {INBOUND_CHANNELS.map((channel) => (
                    <li
                      key={channel}
                      className="rounded-lg border border-stone-200 bg-[#FFF8EC]/70 px-3 py-2.5 text-xs font-medium text-[#0B2530]"
                    >
                      {channel}
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-2xl border border-stone-200 bg-white p-8 shadow-xs">
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Database className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-[#0B2530]">
                  Downstream ERP connectors
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-600">
                  Bidirectional REST connectors keep catalog prices, stock and
                  quote status in sync with the systems of record your finance
                  team already trusts.
                </p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {ERP_TARGETS.map((erp) => (
                    <li
                      key={erp}
                      className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-medium text-[#0B2530]"
                    >
                      {erp}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-emerald-700">
                  <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Bidirectional sync on quotes, rates and dispatch status
                </p>
              </article>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-[#FFF8EC] px-6 py-4 text-xs text-stone-600">
              <span className="inline-flex items-center gap-2 font-semibold text-[#0B2530]">
                <ScanText className="h-4 w-4 text-[#0B2530]" aria-hidden="true" />
                Zero data prep
              </span>
              <span className="text-stone-400">|</span>
              <span>Email body, PDF attachment or forwarded thread, all accepted as-is.</span>
            </div>
          </div>
        </section>

        {/* Section 5: Evaluator moat & benchmarks */}
        <section
          id="financial-impact"
          className="border-y border-amber-100/80 bg-[#FFF8EC]/60 py-20 sm:py-24"
        >
          <div className="mx-auto max-w-[1400px] px-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0B2530]">
                  Evaluator moat &amp; benchmarks
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0B2530] text-balance sm:text-4xl">
                  Fast is the feature. Correct is the moat.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-stone-600">
                  Speed alone is a demo. Speed with catalog-anchored pricing and
                  measurable tax compliance is what survives a procurement
                  review.
                </p>
              </div>

              <Link
                href="/app"
                className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-[#0B2530] shadow-xs transition-all duration-200 ease-out hover:border-[#0B2530]/40 hover:text-[#0B2530] lg:self-auto"
              >
                Test the benchmarks live
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {BENCHMARKS.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <div
                    key={metric.label}
                    className={`rounded-2xl border border-stone-200 p-6 shadow-xs ${
                      index % 2 === 0 ? "bg-white" : "bg-[#FFF8EC]"
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white ring-1 ring-stone-100">
                      <Icon className="h-5 w-5 text-[#0B2530]" aria-hidden="true" />
                    </span>
                    <p className="mt-5 break-words font-mono text-3xl font-semibold leading-none tracking-tight text-[#0B2530]">
                      {metric.value}
                    </p>
                    <p className="mt-3 text-sm font-medium leading-snug text-[#0B2530]">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-stone-500">
                      {metric.note}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-xs">
                <h3 className="text-lg font-semibold tracking-tight text-[#0B2530]">
                  Why the moat holds
                </h3>
                <ul className="mt-5 space-y-5">
                  {MOATS.map((moat) => (
                    <li key={moat.title} className="flex items-start gap-3">
                      <ShieldCheck
                        className="mt-0.5 h-5 w-5 shrink-0 text-[#0B2530]"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#0B2530]">
                          {moat.title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-stone-600">
                          {moat.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-amber-200/70 bg-white p-8 shadow-xs">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600">
                  Modelled financial impact
                </p>
                <p className="mt-2 text-xs leading-relaxed text-stone-500">
                  Modelled against the 45-minute manual baseline captured on the
                  sample RFQ set.
                </p>
                <dl className="mt-6 space-y-5">
                  <div className="flex items-baseline justify-between gap-4 border-b border-stone-100 pb-4">
                    <dt className="text-sm text-stone-600">Quote turnaround</dt>
                    <dd className="whitespace-nowrap font-mono text-lg font-semibold text-[#0B2530]">
                      45 min {"\u2192"} &lt;4 s
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 border-b border-stone-100 pb-4">
                    <dt className="text-sm text-stone-600">
                      Quotes handled per rep / day
                    </dt>
                    <dd className="whitespace-nowrap font-mono text-lg font-semibold text-[#0B2530]">
                      {"~11\u00D7"}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-sm text-stone-600">
                      Hours re-keying catalog prices
                    </dt>
                    <dd className="whitespace-nowrap font-mono text-lg font-semibold text-[#0B2530]">
                      0
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Evaluator callout */}
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-[1400px] px-6">
            <div className="relative overflow-hidden rounded-3xl bg-[#0B2530] px-8 py-14 text-center shadow-lg sm:px-12">
              <div
                className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#0B2530]/25 blur-3xl"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl"
                aria-hidden="true"
              />

              <p className="relative text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A9C9E6]">
                Working prototype
              </p>
              <h2 className="relative mx-auto mt-4 max-w-3xl text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl">
                Experience the real-time pipeline in action.
              </h2>
              <p className="relative mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Open the console, inject an inbound RFQ, watch the matcher price
                every line against the catalog, edit a quantity and export a
                single-page A4 quotation with 18% GST already applied.
              </p>

              <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/app"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B2530] px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-[#071A21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B2530] sm:w-auto"
                >
                  Launch Live MVP
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href="#financial-impact"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition-all duration-200 ease-out hover:border-white/50 hover:bg-white/5 sm:w-auto"
                >
                  Review the benchmarks
                </a>
              </div>

              <p className="relative mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">
                3-second polling {"\u00B7"} 18% GST {"\u00B7"} 1-page A4 export
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-6 py-10 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold text-[#0B2530]">Rapqo ERP</span>{" "}
            {"\u00B7"} Autonomous quotation agent for industrial supply
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
            <Link href="/app" className="text-[#0B2530] hover:underline">
              Launch the console
            </Link>
            <span className="text-stone-300">{"|"}</span>
            <a href="#overview" className="hover:text-[#0B2530]">
              Back to top
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
