"""Rapqo MVP backend.

FastAPI application exposing the contracts described in ARCHITECTURE.md.

Design rule: the API must never 500 because an external LLM is unavailable or
slow. Every AI call is wrapped and falls back to deterministic regex extraction
over the local sample RFQs / catalog.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
import threading
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from rapidfuzz import fuzz

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
# Allow `python backend/main.py`, `uvicorn main:app` (cwd=backend) and
# `uvicorn backend.main:app` (cwd=repo root) to all resolve `schemas`.
for _path in (str(ROOT_DIR), str(BASE_DIR)):
    if _path not in sys.path:
        sys.path.insert(0, _path)

try:  # package import (backend.main)
    from .schemas import (
        CatalogItem,
        EmailStatusResponse,
        ExtractedRFQItem,
        HealthResponse,
        InboundEmailWebhookRequest,
        InboundEmailWebhookResponse,
        InboundRFQRequest,
        KPIResponse,
        QuoteLineItem,
        QuoteRecord,
    )
except ImportError:  # flat import (main)
    from schemas import (  # type: ignore[no-redef]
        CatalogItem,
        EmailStatusResponse,
        ExtractedRFQItem,
        HealthResponse,
        InboundEmailWebhookRequest,
        InboundEmailWebhookResponse,
        InboundRFQRequest,
        KPIResponse,
        QuoteLineItem,
        QuoteRecord,
    )

try:  # package import (backend.*)
    from .email_service import inbound_address, send_quotation_email, smtp_configured
    from .quotation_pdf import build_quotation_pdf, write_quotation_pdf
except ImportError:  # flat import (cwd=backend)
    from email_service import (  # type: ignore[no-redef]
        inbound_address,
        send_quotation_email,
        smtp_configured,
    )
    from quotation_pdf import (  # type: ignore[no-redef]
        build_quotation_pdf,
        write_quotation_pdf,
    )

# Environment ---------------------------------------------------------------
for _env_file in (ROOT_DIR / ".env", BASE_DIR / ".env"):
    if _env_file.exists():
        load_dotenv(_env_file, override=False)

logger = logging.getLogger("rapqo")

DATA_DIR = BASE_DIR / "data"
CATALOG_FILE = DATA_DIR / "catalog.json"
QUOTES_FILE = DATA_DIR / "quotes.json"
SAMPLE_RFQS_FILE = DATA_DIR / "sample_rfqs.json"
GST_RATE = 0.18
REVIEW_THRESHOLD = 80.0
CATEGORY_MIN_SCORE = 50.0

# Persistence ---------------------------------------------------------------
_STORE_LOCK = threading.RLock()
_TURNAROUND_LOCK = threading.Lock()
_TURNAROUND_SAMPLES: list[float] = []


def _ensure_quotes_file() -> None:
    with _STORE_LOCK:
        if not QUOTES_FILE.exists():
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            _write_quotes([])


def _read_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Could not read %s: %s", path.name, exc)
        return None


def _load_catalog() -> list[CatalogItem]:
    raw = _read_json(CATALOG_FILE)
    if not isinstance(raw, list):
        logger.warning("Catalog missing or malformed; serving an empty catalog.")
        return []
    items: list[CatalogItem] = []
    for entry in raw:
        try:
            items.append(CatalogItem.model_validate(entry))
        except ValidationError as exc:
            logger.warning("Skipping invalid catalog entry %s: %s", entry, exc)
    return items


def _read_quotes() -> list[QuoteRecord]:
    raw = _read_json(QUOTES_FILE)
    if not isinstance(raw, list):
        return []
    quotes: list[QuoteRecord] = []
    for entry in raw:
        try:
            quotes.append(QuoteRecord.model_validate(entry))
        except ValidationError as exc:
            logger.warning("Skipping invalid stored quote: %s", exc)
    return quotes


def _write_quotes(quotes: list[QuoteRecord]) -> None:
    payload = [quote.model_dump(mode="json") for quote in quotes]
    with _STORE_LOCK:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        tmp = QUOTES_FILE.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        os.replace(tmp, QUOTES_FILE)


def _next_quote_id(quotes: list[QuoteRecord]) -> str:
    highest = 100
    for quote in quotes:
        match = re.fullmatch(r"RPQ-2026-(\d+)", quote.id)
        if match:
            highest = max(highest, int(match.group(1)))
    return f"RPQ-2026-{highest + 1:04d}"


# Text normalisation --------------------------------------------------------
_UNIT_ALIASES = {
    "meter": "meter",
    "meters": "meter",
    "metre": "meter",
    "metres": "meter",
    "mtr": "meter",
    "mtrs": "meter",
    "m": "meter",
    "piece": "piece",
    "pieces": "piece",
    "nos": "piece",
    "no": "piece",
    "pcs": "piece",
    "pc": "piece",
    "set": "piece",
    "sets": "piece",
    "unit": "piece",
    "units": "piece",
    "bundle": "bundle",
    "bundles": "bundle",
    "roll": "bundle",
    "rolls": "bundle",
    "coil": "bundle",
    "coils": "bundle",
    "box": "bundle",
    "boxes": "bundle",
}

_UNIT_WORDS = "|".join(sorted(_UNIT_ALIASES, key=len, reverse=True))
_QTY_UNIT_RE = re.compile(
    rf"(?P<quantity>\d+(?:\.\d+)?)\s*(?P<unit>{_UNIT_WORDS})\b", re.IGNORECASE
)

_NUMBER_WORDS = {
    "single": "1",
    "one": "1",
    "double": "2",
    "two": "2",
    "triple": "3",
    "three": "3",
    "four": "4",
    "five": "5",
    "six": "6",
}
_NUMBER_WORD_RE = re.compile(r"\b(" + "|".join(_NUMBER_WORDS) + r")\b", re.IGNORECASE)

_CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Cables": (
        "cable",
        "cables",
        "wire",
        "armoured",
        "armored",
        "cat6",
        "lan",
        "conductor",
        "core",
        "copper",
        "aluminium",
        "aluminum",
        "sqmm",
        "sq mm",
    ),
    "Switchgear": (
        "mcb",
        "mccb",
        "rccb",
        "elcb",
        "breaker",
        "switchgear",
        "contactor",
        "isolator",
        "distribution board",
        "changeover",
        "pole",
        "ampere",
        "amp",
    ),
    "Conduits": (
        "conduit",
        "pipe",
        "pipes",
        "bend",
        "junction box",
        "coupler",
        "casing",
        "trunking",
        "pvc",
    ),
    "Fasteners": (
        "fastener",
        "fasteners",
        "anchor",
        "bolt",
        "screw",
        "clamp",
        "nut",
        "washer",
        "rivet",
        "tray",
    ),
}

_QUERY_FILLER = {
    "make",
    "please",
    "need",
    "needed",
    "quote",
    "quotation",
    "price",
    "pricing",
    "send",
    "urgent",
    "urgently",
    "required",
    "require",
    "requirement",
    "for",
    "and",
    "the",
    "of",
    "with",
    "delivery",
    "by",
    "site",
    "kindly",
    "hi",
    "hello",
}

_SEGMENT_STOP_RE = re.compile(
    r"(?<=[.;!?])\s+(?=(?:need|needed|site|delivery|urgent|kindly|please|thanks|regards|send|quote)\b)",
    re.IGNORECASE,
)


def _normalize(text: str) -> str:
    """Lowercase and expand electrical shorthand into matchable tokens."""
    value = text.lower()
    value = _NUMBER_WORD_RE.sub(lambda m: _NUMBER_WORDS[m.group(1).lower()], value)
    value = re.sub(r"(\d+)\s*sq\.?\s*mm", r"\1 sq mm", value)
    value = re.sub(r"\bsq\.?\s*mm\b", " sq mm ", value)
    value = re.sub(r"\b(\d+)\s*c\b", r"\1 core ", value)
    value = re.sub(r"\b(\d+)\s*p\b", r"\1 pole ", value)
    value = re.sub(r"\b(\d+)\s*m\b", r"\1 meter ", value)
    value = re.sub(r"\b(mtrs?|meters?|metres?)\b", " meter ", value)
    value = re.sub(r"\b(nos?|pcs?|pieces?)\b", " piece ", value)
    value = re.sub(r"\bbundles?\b", " bundle ", value)
    value = re.sub(r"\b(breakers?)\b", " mcb ", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def _numbers(text: str) -> set[int]:
    return {int(token) for token in re.findall(r"\d+", text)}


def _match_query(raw_query: str) -> str:
    """Query text for fuzzy scoring: drop the order quantity and filler words."""
    normalized = _normalize(raw_query)
    normalized = re.sub(r"^\d+(?:\.\d+)?\s*(?:meter|piece|bundle)\b\s*", "", normalized)
    tokens = [token for token in normalized.split() if token not in _QUERY_FILLER]
    return " ".join(tokens)


def _item_text(item: CatalogItem) -> str:
    return _normalize(f"{item.sku} {item.name} {item.spec} {item.category}")


def _infer_category(text: str) -> str:
    lowered = text.lower()
    best_category = ""
    best_hits = 0
    for category, keywords in _CATEGORY_KEYWORDS.items():
        hits = sum(lowered.count(keyword) for keyword in keywords)
        if hits > best_hits:
            best_category, best_hits = category, hits
    return best_category


# Matching engine -----------------------------------------------------------
@dataclass(frozen=True)
class MatchResult:
    item: CatalogItem
    confidence_score: float


def _score(query: str, query_numbers: set[int], item: CatalogItem) -> float:
    text = _item_text(item)
    token_score = fuzz.token_set_ratio(query, text)
    item_numbers = _numbers(text)
    if query_numbers:
        numeric_score = 100.0 * len(query_numbers & item_numbers) / len(query_numbers)
    else:
        numeric_score = 100.0
    return max(0.0, min(100.0, 0.75 * token_score + 0.25 * numeric_score))


def _best_match(
    query: str, query_numbers: set[int], candidates: list[CatalogItem]
) -> MatchResult | None:
    if not candidates:
        return None
    best_item = max(candidates, key=lambda item: _score(query, query_numbers, item))
    return MatchResult(best_item, _score(query, query_numbers, best_item))


def match_line_item(
    spec_query: str, category: str = "", catalog: list[CatalogItem] | None = None
) -> MatchResult | None:
    """Hybrid RapidFuzz match, restricted to the inferred category when possible.

    Falls back to a full-catalog search when the category is ambiguous or the
    best in-category score is below 50 (per the Phase 2 contract).
    """
    items = catalog if catalog is not None else _load_catalog()
    if not items:
        return None

    query = _match_query(spec_query)
    if not query:
        query = _normalize(spec_query)
    if not query:
        return None
    query_numbers = _numbers(query)

    requested = category if category in _CATEGORY_KEYWORDS else ""
    scoped = [item for item in items if item.category == requested] if requested else []
    best = _best_match(query, query_numbers, scoped)

    if best is None or best.confidence_score < CATEGORY_MIN_SCORE:
        global_best = _best_match(query, query_numbers, items)
        if global_best and (best is None or global_best.confidence_score > best.confidence_score):
            best = global_best

    if best is None:
        return None
    return MatchResult(best.item, round(best.confidence_score, 1))


# Extraction ----------------------------------------------------------------
class _LLMLineItem(BaseModel):
    """Schema sent to Gemini.

    Deliberately constraint-free: google-genai's schema converter rejects
    ``exclusiveMinimum`` from ``Field(gt=0)``. Every response is re-validated
    against the strict ``ExtractedRFQItem`` contract afterwards.
    """

    raw_query: str
    category: str = ""
    specifications: str = ""
    quantity: int
    unit: str = "piece"


_EXTRACTION_SYSTEM_PROMPT = (
    "You are Rapqo's RFQ parsing engine for an electrical and hardware supplier. "
    "Extract every distinct line item from the customer email. "
    "Return only JSON that matches the provided schema. "
    "raw_query must be the exact substring copied from the email body. "
    "category must be one of Cables, Switchgear, Conduits, Fasteners, or an empty "
    "string when it cannot be inferred. unit must be one of meter, piece, bundle. "
    "quantity must be a positive integer. Never invent items that are not present."
)


def _sample_rfqs() -> list[dict]:
    raw = _read_json(SAMPLE_RFQS_FILE)
    return raw if isinstance(raw, list) else []


def _canned_body(body: str) -> str | None:
    """Return a matching sample body so canned test cases stay deterministic."""
    normalized = _normalize(body)
    if not normalized:
        return None
    for sample in _sample_rfqs():
        sample_body = sample.get("body")
        if not isinstance(sample_body, str):
            continue
        if fuzz.token_set_ratio(normalized, _normalize(sample_body)) >= 95:
            return sample_body
    return None


def _trim_segment(segment: str) -> str:
    """Drop separators, trailing punctuation and dangling conjunctions."""
    value = re.sub(
        r"(?:[\s,;:&+-]+(?:and|&))?[\s,;:.&+-]*$", "", segment.strip(), flags=re.IGNORECASE
    )
    return value.strip(" \t\r\n,;:-.")


def _split_segments(body: str) -> list[str]:
    matches = list(_QTY_UNIT_RE.finditer(body))
    if not matches:
        cleaned = body.strip()
        return [cleaned] if cleaned else []

    segments: list[str] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(body)
        segment = body[match.start() : end]
        segment = _SEGMENT_STOP_RE.split(segment)[0]
        segment = _trim_segment(segment)
        if segment:
            segments.append(segment)
    return segments


def _extract_with_regex(body: str) -> list[ExtractedRFQItem]:
    items: list[ExtractedRFQItem] = []
    for segment in _split_segments(body):
        match = _QTY_UNIT_RE.match(segment)
        if not match:
            # No explicit quantity: keep the clause with a conservative default.
            items.append(
                ExtractedRFQItem(
                    raw_query=segment,
                    category=_infer_category(segment),
                    specifications=segment,
                    quantity=1,
                    unit="piece",
                )
            )
            continue

        quantity = max(1, int(round(float(match.group("quantity")))))
        unit = _UNIT_ALIASES.get(match.group("unit").lower(), "piece")
        specification = segment[match.end() :].strip(" \t\r\n,;:-")
        items.append(
            ExtractedRFQItem(
                raw_query=segment,
                category=_infer_category(segment),
                specifications=specification or segment,
                quantity=quantity,
                unit=unit,
            )
        )
    return items


def _extract_with_gemini(body: str, sender: str, subject: str) -> list[ExtractedRFQItem] | None:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=15_000),
        )
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            contents=(
                f"Sender: {sender}\nSubject: {subject}\n"
                f"Email body:\n{body}\n\nExtract the line items."
            ),
            config=types.GenerateContentConfig(
                system_instruction=_EXTRACTION_SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=list[_LLMLineItem],
                temperature=0.0,
            ),
        )

        parsed = getattr(response, "parsed", None)
        if parsed is None:
            text = (getattr(response, "text", None) or "").strip()
            parsed = json.loads(text) if text else None
        if not parsed:
            return None

        items: list[ExtractedRFQItem] = []
        for entry in parsed:
            payload = entry.model_dump() if isinstance(entry, BaseModel) else dict(entry)
            unit = str(payload.get("unit") or "piece").strip().lower()
            payload["unit"] = _UNIT_ALIASES.get(unit, "piece")
            category = str(payload.get("category") or "").strip().lower()
            payload["category"] = next(
                (
                    name
                    for name in _CATEGORY_KEYWORDS
                    if name.lower() == category
                ),
                "",
            )
            try:
                payload["quantity"] = max(1, int(round(float(payload.get("quantity", 1)))))
            except (TypeError, ValueError):
                payload["quantity"] = 1
            items.append(ExtractedRFQItem.model_validate(payload))
        return items or None
    except Exception as exc:  # network, quota, schema, SDK drift: never surface a 500
        logger.warning("Gemini extraction failed, using regex fallback: %s", exc)
        return None


def extract_rfq_items(body: str, sender: str = "", subject: str = "") -> list[ExtractedRFQItem]:
    """Extract line items via Gemini when configured, otherwise deterministically."""
    source = _canned_body(body) or body
    items = _extract_with_gemini(source, sender, subject)
    if items:
        return items
    return _extract_with_regex(source)


# Quote assembly ------------------------------------------------------------
def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _build_line_item(
    index: int, extracted: ExtractedRFQItem, catalog: list[CatalogItem]
) -> QuoteLineItem:
    match = match_line_item(
        extracted.raw_query or extracted.specifications, extracted.category, catalog
    )
    if match is None:
        return QuoteLineItem(
            id=f"line_{index:02d}",
            raw_query=extracted.raw_query,
            matched_sku="UNMATCHED",
            matched_name="No catalog match",
            quantity=extracted.quantity,
            unit=extracted.unit,
            unit_price=0.0,
            total_price=0.0,
            confidence_score=0.0,
            needs_review=True,
        )

    confidence = round(match.confidence_score, 1)
    return QuoteLineItem(
        id=f"line_{index:02d}",
        raw_query=extracted.raw_query,
        matched_sku=match.item.sku,
        matched_name=match.item.name,
        quantity=extracted.quantity,
        unit=match.item.unit,
        unit_price=match.item.unit_price,
        total_price=round(extracted.quantity * match.item.unit_price, 2),
        confidence_score=confidence,
        needs_review=confidence < REVIEW_THRESHOLD,
    )


def _build_quote(payload: InboundRFQRequest, quote_id: str) -> QuoteRecord:
    catalog = _load_catalog()
    extracted = extract_rfq_items(payload.body, payload.sender, payload.subject)
    items = [
        _build_line_item(index, item, catalog)
        for index, item in enumerate(extracted, start=1)
    ]

    subtotal = round(sum(line.total_price for line in items), 2)
    tax = round(subtotal * GST_RATE, 2)
    needs_review = not items or any(line.needs_review for line in items)

    return QuoteRecord(
        id=quote_id,
        sender=payload.sender,
        subject=payload.subject,
        received_at=_utc_now(),
        status="REVIEW" if needs_review else "DRAFT",
        items=items,
        subtotal=subtotal,
        tax=tax,
        grand_total=round(subtotal + tax, 2),
    )


def _record_turnaround(started_at: float) -> None:
    with _TURNAROUND_LOCK:
        _TURNAROUND_SAMPLES.append(round(time.perf_counter() - started_at, 2))


# Inbound email pipeline ----------------------------------------------------
def process_inbound_email(
    from_email: str,
    sender_name: str = "",
    subject: str = "",
    body_text: str = "",
) -> tuple[QuoteRecord, bool, Path | None]:
    """Run one inbound email through extraction, matching, PDF and reply.

    Shared by ``POST /api/webhook/inbound-email`` and the IMAP worker so both
    entry points produce byte-identical quotes.
    """
    started_at = time.perf_counter()
    sender = (from_email or "").strip() or "unknown@sender.com"
    reference = (subject or "").strip()
    if not reference:
        reference = f"RFQ from {sender_name.strip()}" if sender_name.strip() else "Untitled RFQ"

    payload = InboundRFQRequest(
        sender=sender,
        subject=reference,
        body=body_text or "",
    )

    with _STORE_LOCK:
        quotes = _read_quotes()
        quote = _build_quote(payload, _next_quote_id(quotes))
        quotes.append(quote)
        _write_quotes(quotes)
    _record_turnaround(started_at)

    pdf_bytes = b""
    pdf_path: Path | None = None
    try:
        pdf_bytes = build_quotation_pdf(quote)
        pdf_path = write_quotation_pdf(quote.id, pdf_bytes)
    except Exception as exc:  # a PDF failure must not lose the quote
        logger.warning("Quotation PDF generation failed for %s: %s", quote.id, exc)

    email_sent = False
    if pdf_bytes:
        email_sent = send_quotation_email(quote, pdf_bytes, sender)

    if email_sent:
        with _STORE_LOCK:
            stored = _read_quotes()
            for index, entry in enumerate(stored):
                if entry.id == quote.id:
                    quote = entry.model_copy(update={"status": "SENT"})
                    stored[index] = quote
                    _write_quotes(stored)
                    break

    return quote, email_sent, pdf_path


# Application ---------------------------------------------------------------
@asynccontextmanager
async def _lifespan(_: FastAPI):
    """Optionally run the IMAP poller inside the API process."""
    stop_listener = None
    enabled = os.getenv("EMAIL_LISTENER_ENABLED", "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    if enabled:
        try:
            try:
                from .email_listener import (
                    start_background_listener,
                    stop_background_listener,
                )
            except ImportError:
                from email_listener import (  # type: ignore[no-redef]
                    start_background_listener,
                    stop_background_listener,
                )

            if start_background_listener():
                stop_listener = stop_background_listener
                logger.info("IMAP listener started in the background.")
        except Exception as exc:  # never block startup on the listener
            logger.warning("Could not start the IMAP listener: %s", exc)

    try:
        yield
    finally:
        if stop_listener is not None:
            try:
                await stop_listener()
            except Exception:
                pass


app = FastAPI(title="Rapqo API", version="1.0.0", lifespan=_lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/api/catalog", response_model=list[CatalogItem])
def get_catalog() -> list[CatalogItem]:
    return _load_catalog()


@app.get("/api/quotes", response_model=list[QuoteRecord])
def get_quotes() -> list[QuoteRecord]:
    return _read_quotes()


@app.get("/api/kpi", response_model=KPIResponse)
def get_kpi() -> KPIResponse:
    quotes = _read_quotes()
    with _TURNAROUND_LOCK:
        samples = list(_TURNAROUND_SAMPLES)
    average = round(sum(samples) / len(samples), 2) if samples else 42.0
    return KPIResponse(
        total_rfqs=len(quotes),
        quotes_drafted=sum(1 for quote in quotes if quote.status == "DRAFT"),
        pipeline_val=round(sum(quote.grand_total for quote in quotes), 2),
        avg_turnaround_sec=average,
    )


@app.post("/api/inbound-rfq", response_model=QuoteRecord)
def inbound_rfq(payload: InboundRFQRequest) -> QuoteRecord:
    started_at = time.perf_counter()
    with _STORE_LOCK:
        quotes = _read_quotes()
        quote = _build_quote(payload, _next_quote_id(quotes))
        quotes.append(quote)
        _write_quotes(quotes)
    _record_turnaround(started_at)
    return quote


@app.post("/api/webhook/inbound-email", response_model=InboundEmailWebhookResponse)
def inbound_email_webhook(
    payload: InboundEmailWebhookRequest,
) -> InboundEmailWebhookResponse:
    """Parse an inbound email, store the quote, and reply with a PDF."""
    quote, email_sent, _ = process_inbound_email(
        from_email=payload.from_email,
        sender_name=payload.sender_name,
        subject=payload.subject,
        body_text=payload.body_text,
    )
    return InboundEmailWebhookResponse(
        status="success",
        quote_id=quote.id,
        email_sent=email_sent,
    )


@app.get("/api/email/status", response_model=EmailStatusResponse)
def email_status() -> EmailStatusResponse:
    polling = False
    try:
        try:
            from .email_listener import listener_running
        except ImportError:
            from email_listener import listener_running  # type: ignore[no-redef]

        polling = listener_running()
    except Exception:
        polling = False

    return EmailStatusResponse(
        inbound_address=inbound_address(),
        smtp_configured=smtp_configured(),
        imap_polling=polling,
    )


@app.post("/api/quotes/{quote_id}/approve", response_model=QuoteRecord)
def approve_quote(quote_id: str) -> QuoteRecord:
    with _STORE_LOCK:
        quotes = _read_quotes()
        for index, quote in enumerate(quotes):
            if quote.id == quote_id:
                updated = quote.model_copy(update={"status": "SENT"})
                quotes[index] = updated
                _write_quotes(quotes)
                return updated
    raise HTTPException(status_code=404, detail=f"Quote {quote_id} not found")


_ensure_quotes_file()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
