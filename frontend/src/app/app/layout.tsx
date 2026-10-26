import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Rapqo Live Console \u00B7 Autonomous Quotation Agent",
  description:
    "Interactive Rapqo console: inbound RFQ queue, deterministic catalog matching with live GST recalculation, and single-page A4 quotation export.",
};

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return children;
}
