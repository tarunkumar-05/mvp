import type { ReactNode } from "react";

interface HeaderShellProps {
  /** Constrain the inner row to the same width as the page content below it. */
  maxWidth: string;
  left: ReactNode;
  /** Rendered centred on `md+`. Omit where the page has no in-page anchors. */
  center?: ReactNode;
  right: ReactNode;
}

/**
 * The single-tier 60px bar shared by the landing page and the live console.
 *
 * `relative` (not `sticky`/`fixed`) is deliberate: the bar scrolls away with the
 * page so it never covers content being read. Both headers route through this
 * component so their height, border, backdrop and rhythm cannot drift apart.
 */
export default function HeaderShell({
  maxWidth,
  left,
  center,
  right,
}: HeaderShellProps) {
  return (
    <header className="relative w-full border-b border-stone-200/60 bg-white/80 font-sans backdrop-blur-md">
      <div
        className={`mx-auto flex h-[60px] w-full items-center justify-between gap-4 px-4 sm:px-6 ${maxWidth}`}
      >
        <div className="flex min-w-0 items-center gap-3">{left}</div>

        {center ? (
          <div className="hidden flex-1 items-center justify-center md:flex">
            {center}
          </div>
        ) : null}

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">{right}</div>
      </div>
    </header>
  );
}
