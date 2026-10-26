"""Pydantic contracts for the Rapqo MVP.

These models mirror the schemas defined in ARCHITECTURE.md. They are the single
source of truth for request/response validation across the API.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Domain enumerations -------------------------------------------------------
Category = Literal["Cables", "Switchgear", "Conduits", "Fasteners"]
# Empty category means "ambiguous" and lets the matcher search the full catalog.
ExtractedCategory = Literal["Cables", "Switchgear", "Conduits", "Fasteners", ""]
Unit = Literal["meter", "piece", "bundle"]
QuoteStatus = Literal["DRAFT", "SENT", "REVIEW"]


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


class CatalogItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sku: str = Field(min_length=1)
    name: str = Field(min_length=1)
    category: Category
    spec: str = ""
    unit: Unit
    unit_price: float = Field(ge=0)
    stock: int = Field(ge=0)


class ExtractedRFQItem(BaseModel):
    """Strict schema handed to the LLM (and used by the regex fallback)."""

    model_config = ConfigDict(extra="forbid")

    raw_query: str = Field(min_length=1)
    category: ExtractedCategory = ""
    specifications: str = ""
    quantity: int = Field(gt=0)
    unit: Unit = "piece"


class QuoteLineItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    raw_query: str
    matched_sku: str
    matched_name: str
    quantity: int = Field(gt=0)
    unit: Unit
    unit_price: float = Field(ge=0)
    total_price: float = Field(ge=0)
    confidence_score: float = Field(ge=0, le=100)
    needs_review: bool


class QuoteRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    sender: str
    subject: str
    received_at: str
    status: QuoteStatus
    items: list[QuoteLineItem]
    subtotal: float = Field(ge=0)
    tax: float = Field(ge=0)
    grand_total: float = Field(ge=0)


class InboundRFQRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sender: str = Field(default="unknown@sender.com")
    subject: str = Field(default="Untitled RFQ")
    body: str = Field(default="")


class InboundEmailWebhookRequest(BaseModel):
    """Payload posted by the inbound email relay / IMAP worker."""

    model_config = ConfigDict(extra="forbid")

    from_email: str = Field(min_length=3, max_length=320)
    sender_name: str = Field(default="", max_length=200)
    subject: str = Field(default="", max_length=500)
    body_text: str = Field(default="")


class InboundEmailWebhookResponse(BaseModel):
    status: Literal["success"] = "success"
    quote_id: str
    email_sent: bool


class EmailStatusResponse(BaseModel):
    inbound_address: str
    smtp_configured: bool
    imap_polling: bool


class KPIResponse(BaseModel):
    total_rfqs: int
    quotes_drafted: int
    pipeline_val: float
    avg_turnaround_sec: float
