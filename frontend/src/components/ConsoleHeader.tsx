"use client";

import { Plus } from "lucide-react";

import BrandLockup from "@/components/BrandLockup";
import HeaderShell from "@/components/HeaderShell";
import PrimaryNav from "@/components/PrimaryNav";
import type { ApiStatus } from "@/lib/types";

interface ConsoleHeaderProps {
  apiStatus: ApiStatus;
  onSimulate: () => void;
}

const API_STATUS_LABEL: Record<ApiStatus, string> = {
  connecting: "Connecting",
  live: "API Live",
  offline: "Backend Offline",
};

const API_STATUS_TONE: Record<ApiStatus, string> = {
  connecting: "border-stone-200 bg-white text-stone-500",
  live: "border-[#D6D3D1] bg-[#F5F5F4] text-[#0B2530]",
  offline: "border-amber-200 bg-amber-50 text-amber-700",
};

const API_STATUS_DOT: Record<ApiStatus, string> = {
  connecting: "bg-stone-400",
  live: "bg-[#0B2530]",
  offline: "bg-amber-500",
};

/**
 * Console counterpart to `HeaderBar`. Same shared bar, same brand lockup and
 * badge, same section links, same non-pinned scroll behaviour; only the
 * right-hand actions differ (live API pill + simulate) because this page is the
 * workspace, not the pitch. The centre links start at `lg` rather than `md`
 * because the API pill and simulate button need that space at tablet widths.
 */
export default function ConsoleHeader({
  apiStatus,
  onSimulate,
}: ConsoleHeaderProps) {
  return (
    <HeaderShell
      maxWidth="max-w-[1600px]"
      left={<BrandLockup />}
      center={<PrimaryNav />}
      centerFrom="lg"
      right={
        <>
          <span
            className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] sm:inline-flex ${API_STATUS_TONE[apiStatus]}`}
            title="Live polling every 3 seconds"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${API_STATUS_DOT[apiStatus]}`}
            />
            {API_STATUS_LABEL[apiStatus]}
          </span>

          <button
            type="button"
            onClick={onSimulate}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#0B2530] px-4 py-2 text-xs font-medium text-white shadow-sm transition-all duration-200 ease-out hover:bg-[#071A21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2530]/40 focus-visible:ring-offset-2 sm:px-5 sm:text-sm"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Simulate Inbound RFQ</span>
            <span className="sm:hidden">Simulate</span>
          </button>
        </>
      }
    />
  );
}
