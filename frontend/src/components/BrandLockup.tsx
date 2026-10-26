import Link from "next/link";

import RapqoLogo from "@/components/RapqoLogo";

/**
 * Brand lockup + "Agent Active" pulse badge. Shared verbatim by the landing
 * header and the console header so both show the same mark at the same
 * breakpoints; the badge hides below `sm` where the row is too tight.
 */
export default function BrandLockup() {
  return (
    <>
      <Link
        href="/"
        aria-label="Rapqo home"
        className="shrink-0 rounded-lg transition-opacity duration-200 ease-out hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2530]/40"
      >
        <RapqoLogo />
      </Link>

      <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-[#D6D3D1] bg-[#F5F5F4] px-2.5 py-1 text-[11px] font-medium text-[#4B5563] sm:inline-flex">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0B2530] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#0B2530]" />
        </span>
        Agent Active
      </span>
    </>
  );
}
