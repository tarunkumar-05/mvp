"""Optional IMAP worker: turn unread inbox mail into quotation replies.

Run it next to the API when you want evaluators to email a real mailbox
instead of posting to the webhook::

    backend\\venv\\Scripts\\python.exe backend\\email_listener.py

Environment (``.env`` in the repo root or ``backend/``)::

    IMAP_SERVER=imap.gmail.com
    IMAP_PORT=993
    EMAIL_USER=sales@yourdomain.com
    EMAIL_PASSWORD=app-specific-password
    IMAP_MAILBOX=INBOX                 # optional
    IMAP_POLL_SECONDS=5                # optional
    EMAIL_LISTENER_ENABLED=true        # optional: auto-start inside the API

Each unread message is parsed, priced through the same deterministic pipeline
as ``POST /api/inbound-rfq``, persisted to ``quotes.json``, rendered as a
one-page PDF, emailed back over SMTP, and finally marked as read.
"""

from __future__ import annotations

import asyncio
import email
import html as html_module
import imaplib
import logging
import os
import re
import ssl
import sys
from dataclasses import dataclass
from email.header import decode_header, make_header
from email.message import Message
from email.utils import parseaddr
from pathlib import Path
from typing import Callable

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
for _path in (str(ROOT_DIR), str(BASE_DIR)):
    if _path not in sys.path:
        sys.path.insert(0, _path)

logger = logging.getLogger("rapqo.imap")

DEFAULT_POLL_SECONDS = 5.0


@dataclass(frozen=True)
class ImapSettings:
    host: str
    port: int
    user: str
    password: str
    mailbox: str


@dataclass(frozen=True)
class ProcessedEmail:
    quote_id: str
    from_email: str
    subject: str
    email_sent: bool


def load_imap_settings() -> ImapSettings | None:
    """Return IMAP settings, or ``None`` when inbound polling is unconfigured."""
    host = os.getenv("IMAP_SERVER", "").strip()
    user = (
        os.getenv("EMAIL_USER", "").strip()
        or os.getenv("IMAP_USER", "").strip()
        or os.getenv("SMTP_USER", "").strip()
    )
    password = (
        os.getenv("EMAIL_PASSWORD", "").strip()
        or os.getenv("IMAP_PASSWORD", "").strip()
        or os.getenv("SMTP_PASSWORD", "").strip()
    )
    if not (host and user and password):
        return None

    try:
        port = int(os.getenv("IMAP_PORT", "993").strip() or "993")
    except ValueError:
        port = 993

    return ImapSettings(
        host=host,
        port=port,
        user=user,
        password=password,
        mailbox=os.getenv("IMAP_MAILBOX", "INBOX").strip() or "INBOX",
    )


def _decode_header_value(raw: str | None) -> str:
    if not raw:
        return ""
    try:
        return str(make_header(decode_header(raw))).strip()
    except Exception:  # malformed headers should never break the poll loop
        return str(raw).strip()


def _decode_part(part: Message) -> str:
    try:
        payload = part.get_payload(decode=True)
    except Exception:
        return ""
    if not payload:
        return ""
    charset = part.get_content_charset() or "utf-8"
    try:
        return payload.decode(charset, errors="replace")
    except LookupError:
        return payload.decode("utf-8", errors="replace")


def _strip_html(markup: str) -> str:
    text = re.sub(
        r"<(script|style)[^>]*>.*?</\1>", " ", markup, flags=re.IGNORECASE | re.DOTALL
    )
    text = re.sub(r"<br\s*/?>|</p>|</div>|</tr>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html_module.unescape(text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_body_text(message: Message) -> str:
    """Prefer the plain-text part, fall back to a crude HTML-to-text pass."""
    if message.is_multipart():
        for part in message.walk():
            disposition = str(part.get("Content-Disposition") or "").lower()
            if "attachment" in disposition:
                continue
            if part.get_content_type() == "text/plain":
                body = _decode_part(part).strip()
                if body:
                    return body
        for part in message.walk():
            if part.get_content_type() == "text/html":
                body = _strip_html(_decode_part(part))
                if body:
                    return body
        return ""

    body = _decode_part(message)
    if message.get_content_type() == "text/html":
        return _strip_html(body)
    return body.strip()


def _connect(settings: ImapSettings) -> imaplib.IMAP4_SSL:
    client = imaplib.IMAP4_SSL(
        settings.host,
        settings.port,
        ssl_context=ssl.create_default_context(),
    )
    client.login(settings.user, settings.password)
    return client


def _load_processor() -> Callable[[str, str, str, str], tuple[object, bool, object]]:
    """Import the shared pipeline lazily so this module stays standalone."""
    try:  # package import (backend.email_listener)
        from .main import process_inbound_email
    except ImportError:  # flat import (email_listener)
        from main import process_inbound_email  # type: ignore[no-redef]
    return process_inbound_email


def poll_once_sync(
    process: Callable[[str, str, str, str], tuple[object, bool, object]],
) -> list[ProcessedEmail]:
    """Fetch every unseen message once and reply to it. Blocking by design."""
    settings = load_imap_settings()
    if settings is None:
        logger.info("IMAP is not configured; nothing to poll.")
        return []

    client = _connect(settings)
    processed: list[ProcessedEmail] = []
    try:
        client.select(settings.mailbox)
        status, data = client.uid("search", None, "UNSEEN")
        if status != "OK":
            logger.warning("IMAP search failed with status %s", status)
            return []

        raw_uids = data[0].split() if data and data[0] else []
        for uid in raw_uids:
            status, payload = client.uid("fetch", uid, "(RFC822)")
            if status != "OK" or not payload or not isinstance(payload[0], tuple):
                logger.warning("Could not fetch IMAP uid %s", uid)
                continue

            message = email.message_from_bytes(payload[0][1])
            sender_name, from_email = parseaddr(
                _decode_header_value(message.get("From"))
            )
            sender_name = sender_name or ""
            from_email = from_email or "unknown@sender.com"
            subject = _decode_header_value(message.get("Subject"))
            body = extract_body_text(message)

            if not body.strip():
                logger.info("Skipping uid %s: empty body", uid)
                client.uid("store", uid, "+FLAGS", "(\\Seen)")
                continue

            try:
                quote, email_sent, _ = process(from_email, sender_name, subject, body)
            except Exception as exc:
                logger.warning("Pipeline failed for uid %s (%s): %s", uid, from_email, exc)
                continue

            quote_id = str(getattr(quote, "id", ""))
            processed.append(
                ProcessedEmail(
                    quote_id=quote_id,
                    from_email=from_email,
                    subject=subject,
                    email_sent=bool(email_sent),
                )
            )
            client.uid("store", uid, "+FLAGS", "(\\Seen)")
            logger.info(
                "Processed uid %s -> %s (reply sent: %s)",
                uid,
                quote_id,
                email_sent,
            )
    finally:
        try:
            client.logout()
        except Exception:
            pass

    return processed


def _poll_interval() -> float:
    try:
        value = float(os.getenv("IMAP_POLL_SECONDS", str(DEFAULT_POLL_SECONDS)))
    except ValueError:
        return DEFAULT_POLL_SECONDS
    return max(1.0, value)


async def poll_once() -> list[ProcessedEmail]:
    """Async wrapper around one blocking IMAP pass."""
    process = _load_processor()
    return await asyncio.to_thread(poll_once_sync, process)


async def run_listener(stop: asyncio.Event | None = None) -> None:
    """Poll the inbox forever (or until ``stop`` is set)."""
    settings = load_imap_settings()
    if settings is None:
        logger.warning(
            "IMAP listener disabled: set IMAP_SERVER, EMAIL_USER and EMAIL_PASSWORD."
        )
        return

    interval = _poll_interval()
    logger.info(
        "IMAP listener polling %s as %s every %.1fs",
        settings.host,
        settings.user,
        interval,
    )

    while stop is None or not stop.is_set():
        try:
            processed = await poll_once()
            for entry in processed:
                logger.info("Replied to %s with %s", entry.from_email, entry.quote_id)
        except Exception as exc:  # keep the worker alive across transient failures
            logger.warning("IMAP poll failed: %s", exc)

        if stop is None:
            await asyncio.sleep(interval)
        else:
            try:
                await asyncio.wait_for(stop.wait(), timeout=interval)
            except asyncio.TimeoutError:
                pass


# --- Optional auto-start inside the FastAPI process --------------------------
_LISTENER_TASK: asyncio.Task[None] | None = None
_STOP_EVENT: asyncio.Event | None = None


def start_background_listener() -> bool:
    """Start the poller on the running event loop. Returns whether it started."""
    global _LISTENER_TASK, _STOP_EVENT

    if load_imap_settings() is None:
        logger.info("Email listener not started: IMAP credentials are missing.")
        return False
    if _LISTENER_TASK is not None and not _LISTENER_TASK.done():
        return True

    loop = asyncio.get_running_loop()
    _STOP_EVENT = asyncio.Event()
    _LISTENER_TASK = loop.create_task(run_listener(_STOP_EVENT))
    return True


def listener_running() -> bool:
    return _LISTENER_TASK is not None and not _LISTENER_TASK.done()


async def stop_background_listener() -> None:
    global _LISTENER_TASK, _STOP_EVENT

    if _STOP_EVENT is not None:
        _STOP_EVENT.set()
    if _LISTENER_TASK is not None:
        try:
            await asyncio.wait_for(_LISTENER_TASK, timeout=5)
        except (asyncio.TimeoutError, asyncio.CancelledError):
            _LISTENER_TASK.cancel()
        except Exception:
            pass
    _LISTENER_TASK = None
    _STOP_EVENT = None


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    try:
        asyncio.run(run_listener())
    except KeyboardInterrupt:
        logger.info("IMAP listener stopped.")
