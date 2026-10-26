"""Outbound SMTP delivery for Rapqo quotation replies.

Everything here is best-effort and environment driven: if SMTP credentials are
absent the API still returns a quotation, it simply reports ``email_sent:
false``. Configure the following variables in ``backend/.env`` or the repo
``.env`` to enable real delivery::

    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=sales@yourdomain.com
    SMTP_PASSWORD=app-specific-password
    SMTP_FROM=sales@yourdomain.com        # optional, defaults to SMTP_USER
    SMTP_USE_SSL=false                    # true for implicit TLS on port 465
    INBOUND_EMAIL_ADDRESS=sales@yourdomain.com

Gmail and Outlook 365 both require an app password / SMTP AUTH credential; the
account password alone will be rejected.
"""

from __future__ import annotations

import logging
import os
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from pathlib import Path
from typing import TYPE_CHECKING

try:  # package import (backend.email_service)
    from .quotation_pdf import _money, _register_fonts
except ImportError:  # flat import (email_service)
    from quotation_pdf import _money, _register_fonts  # type: ignore[no-redef]

if TYPE_CHECKING:  # pragma: no cover - typing only
    from schemas import QuoteRecord

logger = logging.getLogger("rapqo.email")

DEFAULT_INBOUND_ADDRESS = "quotes@rapqo.demo"
SMTP_TIMEOUT_SECONDS = 15


def _flag(value: str | None, default: bool = False) -> bool:
    if value is None or value.strip() == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class SmtpSettings:
    host: str
    port: int
    user: str
    password: str
    sender: str
    use_ssl: bool
    use_tls: bool


def load_smtp_settings() -> SmtpSettings | None:
    """Return SMTP settings, or ``None`` when outbound email is not configured."""
    host = os.getenv("SMTP_HOST", "").strip()
    user = os.getenv("SMTP_USER", "").strip() or os.getenv("EMAIL_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip() or os.getenv("EMAIL_PASSWORD", "").strip()

    if not (host and user and password and "@" in user):
        return None

    try:
        port = int(os.getenv("SMTP_PORT", "587").strip() or "587")
    except ValueError:
        port = 587

    sender = os.getenv("SMTP_FROM", "").strip() or user
    use_ssl = _flag(os.getenv("SMTP_USE_SSL"), default=(port == 465))
    use_tls = _flag(os.getenv("SMTP_USE_TLS"), default=not use_ssl)

    return SmtpSettings(
        host=host,
        port=port,
        user=user,
        password=password,
        sender=sender,
        use_ssl=use_ssl,
        use_tls=use_tls,
    )


def smtp_configured() -> bool:
    return load_smtp_settings() is not None


def inbound_address() -> str:
    """Address evaluators should email; falls back to a documentation default."""
    for key in ("INBOUND_EMAIL_ADDRESS", "EMAIL_USER", "SMTP_FROM", "SMTP_USER"):
        value = os.getenv(key, "").strip()
        if value:
            return value
    return DEFAULT_INBOUND_ADDRESS


def build_quotation_email(
    quote: "QuoteRecord",
    pdf_bytes: bytes,
    to_address: str,
    settings: SmtpSettings,
) -> EmailMessage:
    """Compose the reply email with the quotation PDF attached."""
    _, _, has_rupee = _register_fonts()

    message = EmailMessage()
    # Keep the Subject ASCII so every mail client renders it identically.
    message["Subject"] = f"Quotation {quote.id} - {quote.subject or 'Your RFQ'}"
    message["From"] = settings.sender
    message["To"] = to_address
    message["Reply-To"] = settings.sender

    lines = [
        "Hello,",
        "",
        "Thank you for your inquiry. Rapqo has parsed your requirements and priced "
        "every line against our live catalog.",
        "",
        f"Quotation: {quote.id}",
        f"Reference: {quote.subject or 'Untitled RFQ'}",
        f"Status: {quote.status}",
        "",
        "LINE ITEMS",
        "-" * 62,
    ]

    for index, item in enumerate(quote.items, start=1):
        rate = _money(item.unit_price, has_rupee)
        amount = _money(item.total_price, has_rupee)
        lines.append(
            f"{index:>2}. {item.matched_name} [{item.matched_sku}]"
        )
        lines.append(
            f"    {item.quantity} {item.unit} x {rate} = {amount} "
            f"({item.confidence_score:.0f}% match)"
        )
        if item.needs_review:
            lines.append("    Needs a human review before dispatch.")

    if not quote.items:
        lines.append("No line items could be extracted. Reply with the item list "
                     "and we will re-run the quote.")

    lines.extend(
        [
            "-" * 62,
            f"Subtotal:    {_money(quote.subtotal, has_rupee)}",
            f"GST (18%):   {_money(quote.tax, has_rupee)}",
            f"Grand total: {_money(quote.grand_total, has_rupee)}",
            "",
            "The single-page A4 quotation is attached as a PDF.",
            "",
            "Rapqo \u00B7 Autonomous quotation agent for industrial supply",
        ]
    )

    message.set_content("\n".join(lines))

    filename = f"{quote.id}-quotation.pdf"
    message.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename=filename,
    )
    return message


def send_quotation_email(
    quote: "QuoteRecord",
    pdf_bytes: bytes,
    to_address: str,
    settings: SmtpSettings | None = None,
    pdf_path: Path | None = None,
) -> bool:
    """Send the quotation reply. Returns ``True`` only on confirmed delivery."""
    config = settings or load_smtp_settings()
    recipient = (to_address or "").strip()

    if config is None:
        logger.info("SMTP is not configured; skipping outbound reply for %s", quote.id)
        return False
    if "@" not in recipient:
        logger.warning("Refusing to email an invalid recipient: %r", recipient)
        return False
    if recipient.lower() == config.sender.lower():
        logger.warning("Skipping reply to our own inbox %s (loop protection)", recipient)
        return False

    payload = pdf_bytes
    if not payload and pdf_path is not None and pdf_path.exists():
        payload = pdf_path.read_bytes()
    if not payload:
        logger.warning("No PDF bytes available for %s; skipping email", quote.id)
        return False

    message = build_quotation_email(quote, payload, recipient, config)

    try:
        context = ssl.create_default_context()
        if config.use_ssl:
            with smtplib.SMTP_SSL(
                config.host, config.port, timeout=SMTP_TIMEOUT_SECONDS, context=context
            ) as server:
                server.login(config.user, config.password)
                server.send_message(message)
        else:
            with smtplib.SMTP(
                config.host, config.port, timeout=SMTP_TIMEOUT_SECONDS
            ) as server:
                server.ehlo()
                if config.use_tls:
                    server.starttls(context=context)
                    server.ehlo()
                server.login(config.user, config.password)
                server.send_message(message)
    except Exception as exc:  # network, auth, TLS, quota: never fail the request
        logger.warning("SMTP delivery to %s failed: %s", recipient, exc)
        return False

    logger.info("Quotation %s emailed to %s", quote.id, recipient)
    return True
