import type { LucideIcon } from "lucide-react";
import { FileCheck2, Inbox, IndianRupee, Timer } from "lucide-react";

import { formatINR, formatSeconds } from "@/lib/format";
import type { Kpi } from "@/lib/types";

interface KpiRibbonProps {
  kpi: Kpi | null;
}

interface Metric {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
}

export default function KpiRibbon({ kpi }: KpiRibbonProps) {
  const metrics: Metric[] = [
    {
      label: "Inbound RFQs",
      value: kpi ? String(kpi.total_rfqs) : "\u2014",
      hint: "Emails captured by the agent",
      icon: Inbox,
    },
    {
      label: "Auto-Drafted",
      value: kpi ? String(kpi.quotes_drafted) : "\u2014",
      hint: "Quotes ready for review",
      icon: FileCheck2,
    },
    {
      label: "Pipeline Value",
      value: kpi ? formatINR(kpi.pipeline_val, 0) : "\u2014",
      hint: "Open gross value incl. GST",
      icon: IndianRupee,
    },
    {
      label: "Turnaround Time",
      value: kpi ? formatSeconds(kpi.avg_turnaround_sec) : "\u2014",
      hint: "Average agent cycle",
      icon: Timer,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className={`animate-fade-in-up delay-300 rounded-2xl border border-stone-200 p-6 shadow-xs transition-all duration-200 ease-out ${
              index % 2 === 0 ? "bg-[#FFF8EC]" : "bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                {metric.label}
              </p>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-stone-100">
                <Icon className="h-5 w-5 text-[#0B2530]" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 break-words font-mono text-3xl font-semibold leading-none tracking-tight text-[#0B2530]">
              {metric.value}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-stone-500">
              {metric.hint}
            </p>
          </div>
        );
      })}
    </div>
  );
}
