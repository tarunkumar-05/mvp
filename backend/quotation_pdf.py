"""Headless single-page A4 quotation PDFs for outbound email.

ReportLab draws the document directly on a canvas so the output is always
exactly one page: the layout is measured first and the font scale is reduced
until the line items and totals fit, with any overflow explicitly truncated.

Run with the same interpreter as the API (``backend/venv``); ``reportlab`` is
listed in ``requirements.txt``.
"""

from __future__ import annotations

import re
from io import BytesIO
from pathlib import Path
from typing import TYPE_CHECKING

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

try:  # package import (backend.quotation_pdf)
    from .schemas import QuoteRecord
except ImportError:  # flat import (quotation_pdf)
    from schemas import QuoteRecord  # type: ignore[no-redef]

if TYPE_CHECKING:  # pragma: no cover - typing only
    from reportlab.pdfgen.canvas import Canvas

BASE_DIR = Path(__file__).resolve().parent
DOCUMENTS_DIR = BASE_DIR / "data" / "documents"

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 40.0
CONTENT_WIDTH = PAGE_WIDTH - (2 * MARGIN)

INK = HexColor("#0B2530")
MUTED = HexColor("#6B7280")
SOFT = HexColor("#9CA3AF")
RULE = HexColor("#E7E2D8")
CREAM = HexColor("#FFF8EC")
WHITE = HexColor("#FFFFFF")

MONTHS = (
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
)

# Column geometry (points, measured from the left page edge).
COL_DESC_X = MARGIN
COL_DESC_W = 200.0
COL_SKU_X = MARGIN + 205.0
COL_SKU_W = 82.0
COL_QTY_RIGHT = MARGIN + 340.0
COL_RATE_RIGHT = MARGIN + 432.0
COL_AMOUNT_RIGHT = MARGIN + CONTENT_WIDTH

_FONT_CACHE: tuple[str, str, bool] | None = None


def _register_fonts() -> tuple[str, str, bool]:
    """Register a Unicode face when available so the rupee glyph renders."""
    global _FONT_CACHE
    if _FONT_CACHE is not None:
        return _FONT_CACHE

    candidates = [
        (r"C:\Windows\Fonts\arial.ttf", r"C:\Windows\Fonts\arialbd.ttf"),
        (r"C:\Windows\Fonts\segoeui.ttf", r"C:\Windows\Fonts\segoeuib.ttf"),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ("/System/Library/Fonts/Supplemental/Arial.ttf",
         "/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
    ]

    for regular_path, bold_path in candidates:
        if not Path(regular_path).exists():
            continue
        try:
            regular = TTFont("RapqoSans", regular_path)
            pdfmetrics.registerFont(regular)
            font_bold = "RapqoSans"
            if Path(bold_path).exists():
                pdfmetrics.registerFont(TTFont("RapqoSans-Bold", bold_path))
                font_bold = "RapqoSans-Bold"
            has_rupee = regular.face.charToGlyph.get(0x20B9, 0) != 0
            _FONT_CACHE = ("RapqoSans", font_bold, has_rupee)
            return _FONT_CACHE
        except Exception:  # pragma: no cover - font quirks are environment specific
            continue

    _FONT_CACHE = ("Helvetica", "Helvetica-Bold", False)
    return _FONT_CACHE


def _group_indian(whole: str) -> str:
    if len(whole) <= 3:
        return whole
    head, tail = whole[:-3], whole[-3:]
    groups: list[str] = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return ",".join(groups + [tail])


def _money(value: float, has_rupee: bool) -> str:
    safe = value if isinstance(value, (int, float)) else 0.0
    whole, _, fraction = f"{abs(safe):.2f}".partition(".")
    grouped = _group_indian(whole)
    prefix = "\u20B9" if has_rupee else "Rs "
    sign = "-" if safe < 0 else ""
    return f"{sign}{prefix}{grouped}.{fraction}"


def _format_date(iso_value: str) -> str:
    match = re.match(r"^(\d{4})-(\d{2})-(\d{2})", iso_value or "")
    if not match:
        return iso_value or "-"
    year, month, day = match.groups()
    label = MONTHS[int(month) - 1] if 1 <= int(month) <= 12 else month
    return f"{day} {label} {year}"


def _fit_lines(
    text: str, font: str, size: float, width: float, max_lines: int
) -> list[str]:
    value = (text or "").strip()
    if not value:
        return []
    lines = simpleSplit(value, font, size, width)
    if len(lines) <= max_lines:
        return lines

    clipped = lines[:max_lines]
    last = clipped[-1]
    while last and pdfmetrics.stringWidth(f"{last}...", font, size) > width:
        last = last[:-1]
    clipped[-1] = f"{last.rstrip()}..."
    return clipped


class _Layout:
    """Resolved geometry for one font scale."""

    def __init__(self, quote: QuoteRecord, scale: float, max_rows: int | None) -> None:
        self.regular, self.bold, self.has_rupee = _register_fonts()
        self.scale = scale
        self.quote = quote

        self.body_size = 8.2 * scale
        self.small_size = 6.8 * scale
        self.label_size = 6.4 * scale
        self.row_pad = 7.0 * scale
        self.line_height = self.body_size * 1.28

        self.header_height = 64.0
        self.meta_height = 80.0 * max(scale, 0.85)
        self.table_head_height = 18.0
        self.totals_height = 102.0 * max(scale, 0.85)
        self.footer_height = 112.0

        self.rows = quote.items if max_rows is None else quote.items[:max_rows]
        self.omitted = len(quote.items) - len(self.rows)

        self.row_heights: list[float] = []
        self.row_name_lines: list[list[str]] = []
        for item in self.rows:
            name_lines = _fit_lines(
                item.matched_name, self.bold, self.body_size, COL_DESC_W, 2
            )
            spec_lines = _fit_lines(
                f"{item.matched_sku} \u00B7 per {item.unit}",
                self.regular,
                self.small_size,
                COL_DESC_W,
                1,
            )
            self.row_name_lines.append(name_lines)
            height = (len(name_lines) + len(spec_lines)) * self.line_height
            height += 2 * self.row_pad
            self.row_heights.append(max(24.0 * scale, height))

    @property
    def top(self) -> float:
        return PAGE_HEIGHT - MARGIN

    @property
    def footer_top(self) -> float:
        return MARGIN + self.footer_height

    @property
    def table_start(self) -> float:
        return self.top - self.header_height - self.meta_height - self.table_head_height

    @property
    def required_height(self) -> float:
        omitted_line = 14.0 if self.omitted else 0.0
        return (
            sum(self.row_heights)
            + omitted_line
            + self.totals_height
            + 8.0
        )

    @property
    def available_height(self) -> float:
        return self.table_start - self.footer_top

    def fits(self) -> bool:
        return self.required_height <= self.available_height


def _draw_header(c: "Canvas", layout: _Layout) -> None:
    top = layout.top
    c.setFillColor(INK)
    c.rect(MARGIN, top - layout.header_height, CONTENT_WIDTH, layout.header_height,
           stroke=0, fill=1)

    c.setFillColor(WHITE)
    c.setFont(layout.bold, 19)
    c.drawString(MARGIN + 18, top - 29, "RAPQO")

    c.setFillColor(HexColor("#9CC7FF"))
    c.setFont(layout.regular, 7.2)
    c.drawString(MARGIN + 18, top - 43, "INDUSTRIAL SUPPLY  \u00B7  AUTONOMOUS QUOTATION")

    c.setFillColor(WHITE)
    c.setFont(layout.bold, 12.5)
    c.drawRightString(MARGIN + CONTENT_WIDTH - 18, top - 29, "QUOTATION")

    c.setFillColor(HexColor("#C7D9F5"))
    c.setFont(layout.regular, 8.2)
    c.drawRightString(
        MARGIN + CONTENT_WIDTH - 18, top - 44, layout.quote.id
    )


def _draw_meta(c: "Canvas", layout: _Layout) -> None:
    quote = layout.quote
    top = layout.top - layout.header_height
    left_x = MARGIN + 2
    right_x = MARGIN + CONTENT_WIDTH - 2
    label_y = top - 20

    c.setFillColor(SOFT)
    c.setFont(layout.bold, layout.label_size)
    c.drawString(left_x, label_y, "PREPARED FOR")
    c.setFont(layout.regular, layout.body_size + 0.8)
    c.setFillColor(INK)
    c.drawString(left_x, label_y - 13, quote.sender or "unknown@sender.com")

    subject_lines = _fit_lines(
        quote.subject or "Untitled RFQ",
        layout.regular,
        layout.small_size + 0.4,
        CONTENT_WIDTH - 190,
        2,
    )
    c.setFillColor(MUTED)
    c.setFont(layout.regular, layout.small_size + 0.4)
    for index, line in enumerate(subject_lines):
        c.drawString(left_x, label_y - 27 - (index * 9.5), line)

    c.setFillColor(SOFT)
    c.setFont(layout.bold, layout.label_size)
    c.drawRightString(right_x, label_y, "QUOTE ID")
    c.setFillColor(INK)
    c.setFont(layout.bold, layout.body_size + 1.2)
    c.drawRightString(right_x, label_y - 13, quote.id)

    c.setFillColor(SOFT)
    c.setFont(layout.bold, layout.label_size)
    c.drawRightString(right_x, label_y - 27, "DATE")
    c.setFillColor(MUTED)
    c.setFont(layout.regular, layout.small_size + 0.4)
    c.drawRightString(right_x, label_y - 38, _format_date(quote.received_at))

    c.setFillColor(SOFT)
    c.setFont(layout.bold, layout.label_size)
    c.drawRightString(right_x, label_y - 47, "VALIDITY")
    c.setFillColor(MUTED)
    c.setFont(layout.regular, layout.small_size + 0.4)
    c.drawRightString(right_x, label_y - 58, "15 days")


def _draw_table_head(c: "Canvas", layout: _Layout) -> None:
    y = layout.table_start + 6
    c.setFillColor(SOFT)
    c.setFont(layout.bold, layout.label_size)
    c.drawString(COL_DESC_X, y, "DESCRIPTION")
    c.drawString(COL_SKU_X, y, "SKU")
    c.drawRightString(COL_QTY_RIGHT, y, "QTY")
    c.drawRightString(COL_RATE_RIGHT, y, "RATE")
    c.drawRightString(COL_AMOUNT_RIGHT, y, "AMOUNT")

    c.setStrokeColor(RULE)
    c.setLineWidth(0.7)
    c.line(MARGIN, layout.table_start - 1, MARGIN + CONTENT_WIDTH, layout.table_start - 1)


def _draw_rows(c: "Canvas", layout: _Layout) -> float:
    y = layout.table_start - 4
    for index, item in enumerate(layout.rows):
        height = layout.row_heights[index]
        baseline = y - layout.row_pad - layout.body_size

        c.setFillColor(INK)
        c.setFont(layout.bold, layout.body_size)
        for line_index, line in enumerate(layout.row_name_lines[index]):
            c.drawString(COL_DESC_X, baseline - (line_index * layout.line_height), line)

        spec_y = baseline - (len(layout.row_name_lines[index]) * layout.line_height)
        c.setFillColor(MUTED)
        c.setFont(layout.regular, layout.small_size)
        c.drawString(
            COL_DESC_X,
            spec_y,
            f"per {item.unit} \u00B7 {item.confidence_score:.0f}% match",
        )

        c.setFillColor(INK)
        c.setFont(layout.regular, layout.small_size)
        c.drawString(COL_SKU_X, baseline, item.matched_sku)

        c.setFillColor(MUTED)
        c.setFont(layout.regular, layout.body_size)
        c.drawRightString(COL_QTY_RIGHT, baseline, str(item.quantity))
        c.drawRightString(
            COL_RATE_RIGHT, baseline, _money(item.unit_price, layout.has_rupee)
        )

        c.setFillColor(INK)
        c.setFont(layout.bold, layout.body_size)
        c.drawRightString(
            COL_AMOUNT_RIGHT, baseline, _money(item.total_price, layout.has_rupee)
        )

        c.setStrokeColor(RULE)
        c.setLineWidth(0.4)
        c.line(MARGIN, y - height, MARGIN + CONTENT_WIDTH, y - height)
        y -= height

    if layout.omitted:
        c.setFillColor(MUTED)
        c.setFont(layout.regular, layout.small_size)
        c.drawString(
            COL_DESC_X,
            y - 9,
            f"+ {layout.omitted} additional line item(s) omitted from this page",
        )
        y -= 14

    return y


def _draw_totals(c: "Canvas", layout: _Layout, y: float) -> None:
    quote = layout.quote
    label_x = MARGIN + 330.0
    value_x = MARGIN + CONTENT_WIDTH - 4

    subtotal_y = y - 20
    gst_y = subtotal_y - 15
    band_height = 30.0
    band_top = gst_y - 16
    band_bottom = band_top - band_height

    c.setFillColor(MUTED)
    c.setFont(layout.regular, layout.body_size)
    c.drawString(label_x, subtotal_y, "Subtotal")
    c.setFillColor(INK)
    c.drawRightString(value_x, subtotal_y, _money(quote.subtotal, layout.has_rupee))

    c.setFillColor(MUTED)
    c.setFont(layout.regular, layout.body_size)
    c.drawString(label_x, gst_y, "GST (18%)")
    c.setFillColor(INK)
    c.drawRightString(value_x, gst_y, _money(quote.tax, layout.has_rupee))

    c.setFillColor(INK)
    c.rect(MARGIN + 296.0, band_bottom, CONTENT_WIDTH - 296.0, band_height,
           stroke=0, fill=1)

    c.setFillColor(HexColor("#C7D9F5"))
    c.setFont(layout.bold, layout.small_size + 0.8)
    c.drawString(MARGIN + 312.0, band_bottom + 11, "GRAND TOTAL")

    c.setFillColor(WHITE)
    c.setFont(layout.bold, layout.body_size + 5)
    c.drawRightString(
        value_x - 4,
        band_bottom + 9,
        _money(quote.grand_total, layout.has_rupee),
    )


def _draw_terms(c: "Canvas", layout: _Layout) -> None:
    box_bottom = MARGIN + 34.0
    box_height = 54.0
    c.setFillColor(CREAM)
    c.rect(MARGIN, box_bottom, CONTENT_WIDTH, box_height, stroke=0, fill=1)

    c.setFillColor(SOFT)
    c.setFont(layout.bold, layout.label_size)
    c.drawString(MARGIN + 12, box_bottom + box_height - 13, "TERMS & CONDITIONS")

    lines = (
        "Prices are ex-works and exclusive of freight unless stated otherwise.",
        "Quotation valid for 15 days from the date of issue.",
        "GST @ 18% is applied to every line item; totals above are final.",
    )
    c.setFillColor(MUTED)
    c.setFont(layout.regular, 6.6)
    for index, line in enumerate(lines):
        c.drawString(MARGIN + 12, box_bottom + box_height - 25 - (index * 9), line)


def _draw_footer(c: "Canvas", layout: _Layout) -> None:
    y = MARGIN + 26
    c.setStrokeColor(RULE)
    c.setLineWidth(0.7)
    c.line(MARGIN, y + 8, MARGIN + CONTENT_WIDTH, y + 8)

    c.setFillColor(MUTED)
    c.setFont(layout.regular, 6.8)
    c.drawString(
        MARGIN,
        y,
        "Generated by Rapqo \u00B7 deterministic catalog pricing \u00B7 GST 18% applied",
    )
    c.setFillColor(SOFT)
    c.drawRightString(MARGIN + CONTENT_WIDTH, y, "Page 1 of 1")


def build_quotation_pdf(quote: QuoteRecord) -> bytes:
    """Render ``quote`` as a single-page A4 PDF and return the raw bytes."""
    scales = (1.0, 0.94, 0.88, 0.82, 0.76, 0.7)
    layout: _Layout | None = None

    for scale in scales:
        candidate = _Layout(quote, scale, max_rows=None)
        if candidate.fits():
            layout = candidate
            break

    if layout is None:
        # Last resort: keep the largest scale that fits and truncate rows.
        layout = _Layout(quote, 0.7, max_rows=0)
        for keep in range(len(quote.items), -1, -1):
            candidate = _Layout(quote, 0.7, max_rows=keep)
            if candidate.fits():
                layout = candidate
                break

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    c.setTitle(f"Rapqo Quotation {quote.id}")
    c.setAuthor("Rapqo ERP")
    c.setSubject(quote.subject or "Quotation")
    c.setCreator("Rapqo quotation engine")

    _draw_header(c, layout)
    _draw_meta(c, layout)
    _draw_table_head(c, layout)
    y = _draw_rows(c, layout)
    _draw_totals(c, layout, y)
    _draw_terms(c, layout)
    _draw_footer(c, layout)

    c.showPage()
    c.save()
    return buffer.getvalue()


def save_quotation_pdf(quote: QuoteRecord) -> Path:
    """Write the PDF to ``backend/data/documents/<quote_id>.pdf``."""
    return write_quotation_pdf(quote.id, build_quotation_pdf(quote))


def write_quotation_pdf(quote_id: str, pdf_bytes: bytes) -> Path:
    """Persist already-rendered PDF bytes for later inspection / re-sending."""
    DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
    target = DOCUMENTS_DIR / f"{quote_id}.pdf"
    target.write_bytes(pdf_bytes)
    return target


def quotation_pdf_path(quote_id: str) -> Path:
    return DOCUMENTS_DIR / f"{quote_id}.pdf"
