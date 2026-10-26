/**
 * Rapqo brand mark: a flat navy monogram tile set beside the uppercase
 * wordmark. Deliberately free of the old tilted multi-colour tiles so the
 * mark stays crisp at 32px and reads as an enterprise product lockup.
 */
export default function RapqoLogo() {
  return (
    <span className="flex select-none items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0B2530] shadow-sm">
        <span className="text-[15px] font-black leading-none tracking-tight text-white">
          R
        </span>
      </span>
      <span className="text-lg font-bold uppercase leading-none tracking-tight text-[#0B2530]">
        RAPQO
      </span>
    </span>
  );
}
