import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Rapqo ERP \u00B7 Autonomous Quotation Agent",
  description:
    "Rapqo turns inbound RFQ emails into matched, priced, and dispatch-ready quotations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Browser extensions (password managers, the local "crxlauncher" add-on,
  // Grammarly, etc.) stamp attributes onto <html>/<body> before React
  // hydrates. React never patches those attributes anyway, so suppressing the
  // warning on <html> keeps the console clean without hiding genuine
  // mismatches inside the page — suppression does not cascade to children.
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
