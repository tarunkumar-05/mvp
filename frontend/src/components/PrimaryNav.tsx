const NAV_LINKS = [
  { href: "/#overview", label: "Overview" },
  { href: "/#market-gap", label: "Market Gap" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#integrations", label: "Integrations" },
];

/**
 * Section links shared by the landing header and the console header. Hrefs are
 * absolute (`/#section`) so the same markup works from `/app` as well: on the
 * landing page they resolve to a same-document hash and scroll smoothly, and
 * from the console they return to the landing page and land on the section.
 */
export default function PrimaryNav() {
  return (
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
  );
}
