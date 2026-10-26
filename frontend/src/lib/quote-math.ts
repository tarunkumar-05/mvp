import type { LineEdit, QuoteLineItem, QuoteRecord } from "./types";

export const GST_RATE = 0.18;
export const REVIEW_THRESHOLD = 80;

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function lineKey(quoteId: string, lineId: string): string {
  return `${quoteId}::${lineId}`;
}

export function effectiveLine(
  quoteId: string,
  line: QuoteLineItem,
  edits: Record<string, LineEdit>,
): QuoteLineItem {
  const edit = edits[lineKey(quoteId, line.id)];
  const quantity = edit?.quantity ?? line.quantity;
  const unitPrice = edit?.unit_price ?? line.unit_price;

  return {
    ...line,
    quantity,
    unit_price: unitPrice,
    total_price: round2(quantity * unitPrice),
    needs_review: line.confidence_score < REVIEW_THRESHOLD,
  };
}

/** Applies inline edits and recomputes the 18% GST quotation totals. */
export function recomputeQuote(
  quote: QuoteRecord,
  edits: Record<string, LineEdit>,
): QuoteRecord {
  const items = quote.items.map((line) =>
    effectiveLine(quote.id, line, edits),
  );
  const subtotal = round2(
    items.reduce((sum, line) => sum + line.total_price, 0),
  );
  const tax = round2(subtotal * GST_RATE);

  return {
    ...quote,
    items,
    subtotal,
    tax,
    grand_total: round2(subtotal + tax),
  };
}

export function clearQuoteEdits(
  edits: Record<string, LineEdit>,
  quoteId: string,
): Record<string, LineEdit> {
  const prefix = `${quoteId}::`;
  const next: Record<string, LineEdit> = {};
  for (const [key, value] of Object.entries(edits)) {
    if (!key.startsWith(prefix)) {
      next[key] = value;
    }
  }
  return next;
}
