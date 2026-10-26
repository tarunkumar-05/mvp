import Link from "next/link";

import BrandLockup from "@/components/BrandLockup";
import HeaderShell from "@/components/HeaderShell";

const NAV_LINKS = [
  { href: "#overview", label: "Overview" },
  { href: "#market-gap", label: "Market Gap" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#integrations", label: "Integrations" },
];

/**
 * Landing header: one 60px tier that scrolls away with the page instead of
 * pinning over the content. The bar itself lives in `HeaderShell`, shared with
 * the console header.
 */
export default function HeaderBar() {
  return (
    <HeaderShell
      maxWidth="max-w-[1400px]"
      left={<BrandLockup />}
      center={
        <nav aria-label="Sections" className="flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-stone-600 transition-all duration-200 ease-out hover:bg-stone-100/70 hover:text-[#0B2530]"
            >
              {link.label}
            </a>
          ))}
        </nav>
      }
      right={
        <Link
          href="/app"
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-[#0B2530] px-4 py-2 text-xs font-medium text-white shadow-sm transition-all duration-200 ease-out hover:bg-[#071A21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2530]/40 focus-visible:ring-offset-2 sm:px-5 sm:text-sm"
        >
          <span className="hidden sm:inline">+ Launch Live MVP</span>
          <span className="sm:hidden">+ Launch MVP</span>
        </Link>
      }
    />
  );
}
