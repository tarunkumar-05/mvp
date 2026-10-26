import type { QuoteStatus } from "@/lib/types";

const TONES: Record<QuoteStatus, string> = {
  DRAFT: "bg-[#F5F5F4] text-[#0B2530] ring-[#D6D3D1]",
  SENT: "bg-[#E7E5E4] text-[#071A21] ring-[#D6D3D1]",
  REVIEW: "bg-amber-50 text-amber-700 ring-amber-200",
};

interface StatusBadgeProps {
  status: QuoteStatus;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ring-1 transition-colors duration-200 ease-out ${TONES[status]} ${className}`}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {status}
    </span>
  );
}
