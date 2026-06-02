import os
import json
import base64
import asyncio
import logging
import random
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List


import websockets
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.websockets import WebSocketDisconnect
from twilio.rest import Client as TwilioClient
from twilio.twiml.voice_response import VoiceResponse, Connect

from db import call_transcripts, clients, orders, medicines, trigger_words
from prompts import (
    END_CALL_PHRASES,
    INDEX_PAGE_MESSAGE,
    MSG_END_CALL,
    MSG_NO_ITEMS,
    MSG_NO_ORDER_ID_OR_LAST_ORDER,
    MSG_NO_VALID_ITEMS,
    MSG_ORDER_NOT_FOUND,
    MSG_ORDER_SAVED,
    MSG_ORDER_SAVED_SMS_FAILED,
    MSG_ORDER_SAVED_SMS_SENT,
    MSG_ORDER_STATUS_OK,
    MSG_VALIDATED_MEDICINES,
    SYSTEM_MESSAGE,
    TOOL_CHECK_ORDER_STATUS_DESCRIPTION,
    TOOL_END_CALL_DESCRIPTION,
    TOOL_PROP_ITEMS_DESCRIPTION,
    TOOL_PROP_ORDER_ID_DESCRIPTION,
    TOOL_SAVE_CONFIRMED_ORDER_DESCRIPTION,
    TOOL_VALIDATE_MEDICINE_ORDER_DESCRIPTION,
    TWIML_GREETING_NEW_CALLER,
    TWIML_GREETING_RETURNING_TEMPLATE,
)
from stripe_payment import generate_payment_link_and_sms

PROJECT_ROOT = Path(__file__).resolve().parent
load_dotenv(PROJECT_ROOT / ".env")

LOG_FILE_PATH = PROJECT_ROOT / "logs.log"
LOG_CONFIG_PATH = PROJECT_ROOT / "log_config.json"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# Application logger writes directly to voice-agent/logs.log.
logger = logging.getLogger(__name__)
logger.setLevel(LOG_LEVEL)
logger.propagate = False
logger.handlers.clear()
app_file_handler = logging.FileHandler(LOG_FILE_PATH, mode="a", encoding="utf-8")
app_file_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
logger.addHandler(app_file_handler)

# Keep Uvicorn logs in the same file.
for uvicorn_logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
    uvicorn_logger = logging.getLogger(uvicorn_logger_name)
    uvicorn_logger.setLevel(LOG_LEVEL)
    uvicorn_logger.propagate = False
    uvicorn_logger.handlers.clear()
    uvicorn_logger.addHandler(app_file_handler)


def load_uvicorn_log_config() -> Dict[str, Any]:
    with LOG_CONFIG_PATH.open("r", encoding="utf-8") as config_file:
        log_config = json.load(config_file)

    # Keep runtime paths/levels dynamic while structure stays in JSON file.
    log_config["handlers"]["default"]["filename"] = str(LOG_FILE_PATH)
    log_config["handlers"]["access"]["filename"] = str(LOG_FILE_PATH)
    log_config["loggers"]["uvicorn"]["level"] = LOG_LEVEL
    log_config["loggers"]["uvicorn.error"]["level"] = LOG_LEVEL
    log_config["loggers"]["uvicorn.access"]["level"] = LOG_LEVEL
    return log_config


# Configuration (skeleton from twilio_code.py)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # Requires OpenAI Realtime API access
PORT = int(os.getenv("PORT", 3000))
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "").strip()
BASE_URL = os.getenv("BASE_URL", "").strip()
TRIGGER_POLL_SECONDS = int(os.getenv("TRIGGER_POLL_SECONDS", "5"))
TRIGGER_MAX_CALL_AGE_SECONDS = int(os.getenv("TRIGGER_MAX_CALL_AGE_SECONDS", "30"))

VOICE = "alloy"
TEMPERATURE = float(os.getenv("TEMPERATURE", 0.8))
# Input speech transcription (off by default in Realtime API); required for transcript events.
REALTIME_INPUT_TRANSCRIPTION_MODEL = os.getenv("REALTIME_INPUT_TRANSCRIPTION_MODEL", "whisper-1")

LOG_EVENT_TYPES = [
    "response.content.done",
    "rate_limits.updated",
    "response.done",
    "input_audio_buffer.committed",
    "input_audio_buffer.speech_stopped",
    "input_audio_buffer.speech_started",
    "session.created",
]

twilio_client = (
    TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
    else None
)
trigger_poller_task: asyncio.Task | None = None
trigger_poller_started_at: datetime | None = None


app = FastAPI(title="MediVoice AI Realtime Voice Agent")

if not OPENAI_API_KEY:
    raise ValueError(
        "Missing the OPENAI_API_KEY. Please set it in the .env file "
        "with Realtime API access enabled."
    )


@app.on_event("startup")
async def startup() -> None:
    try:
        clients.create_index("contact")
        call_transcripts.create_index("pharmacist_id")
        orders.create_index("pharmacist_id")
        medicines.create_index("medicine_id")
        trigger_words.create_index("created_at")
        trigger_words.create_index("auto_call_status")
        logger.info("Mongo indexes ensured.")
        global trigger_poller_task, trigger_poller_started_at
        trigger_poller_started_at = now_est()
        if trigger_poller_task is None or trigger_poller_task.done():
            trigger_poller_task = asyncio.create_task(trigger_word_poller())
            logger.info(
                "Trigger word poller started. interval_seconds=%s started_at=%s",
                TRIGGER_POLL_SECONDS,
                trigger_poller_started_at,
            )
    except Exception as e:
        logger.error("Startup error: %s", str(e), exc_info=True)


def now_est() -> datetime:
    utc_now = datetime.now(timezone.utc)
    est_now = utc_now - timedelta(hours=4)
    return est_now

def get_or_create_pharmacist(call_context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Look up pharmacist by contact number in clients collection; create if missing.
    Stores the pharmacist document back into call_context["pharmacist"].
    """
    phone = call_context.get("phone_number") or ""
    if not phone:
        pharmacist = {
            "pharmacist_id": "unknown",
            "name": "",
            "contact": "",
            "language_preference": "en",
        }
        call_context["pharmacist"] = pharmacist
        return pharmacist

    existing = clients.find_one({"contact": phone}) or clients.find_one({"pharmacist_id": phone})
    if existing:
        call_context["pharmacist"] = existing
        return existing

    pharmacist = {
        "pharmacist_id": phone,
        "name": "",
        "contact": phone,
        "language_preference": "en",
    }
    result = clients.insert_one(pharmacist)
    pharmacist["_id"] = result.inserted_id
    call_context["pharmacist"] = pharmacist
    return pharmacist


def _extract_transcript_text_from_realtime_event(response: Dict[str, Any]) -> str:
    """Pull user speech text from OpenAI Realtime server events (field names vary by event)."""
    text = (
        response.get("transcript_text")
        or response.get("transcript")
        or response.get("text")
        or ""
    )
    if str(text).strip():
        return str(text).strip()
    item = response.get("item") or {}
    content = item.get("content")
    if isinstance(content, list) and content:
        part0 = content[0] or {}
        return str(part0.get("transcript") or part0.get("text") or "").strip()
    return ""


def _handle_client_speech_transcript(
    call_context: Dict[str, Any],
    transcript_text: str,
    source_event: str,
    item_id: str | None = None,
) -> bool:
    """
    Log, persist, and check end-call phrase. Returns True if the call should terminate.
    """
    transcript_text = str(transcript_text or "").strip()
    if not transcript_text:
        return False

    if item_id:
        seen = call_context.setdefault("_transcript_item_ids_seen", set())
        if item_id in seen:
            return False
        seen.add(item_id)

    logger.info(
        "Client speech source=%s call_sid=%s phone=%s transcript_text=%s",
        source_event,
        call_context.get("call_sid"),
        call_context.get("phone_number"),
        transcript_text,
    )
    call_context.setdefault("tran_list", []).append(f"Client: {transcript_text}\n")
    # Do NOT auto-terminate on transcript substrings. Whisper frequently
    # hallucinates short phrases like "Bye." on silence/noise, which would
    # kill the call mid-conversation. The model is instructed to call the
    # end_call tool when the caller actually wants to hang up.
    return False


def _extract_assistant_transcript_from_response_done(response: Dict[str, Any]) -> str:
    """Safely extract assistant transcript text from response.done payload."""
    output = ((response.get("response") or {}).get("output") or [])
    if not isinstance(output, list):
        return ""
    for item in output:
        content = (item or {}).get("content") or []
        if not isinstance(content, list):
            continue
        for part in content:
            text = (part or {}).get("transcript") or (part or {}).get("text") or ""
            if str(text).strip():
                return str(text).strip()
    return ""


def save_call_transcript(call_context: Dict[str, Any], transcript_text: Any, summary: str = "") -> None:
    """
    Store a single transcript snippet for this call in Live_Conversations.

    Writes the shape the website's Conversation model expects (pharmacy_name,
    transcript, type, status) plus the legacy fields the Python side used, so
    both the UI and any existing queries keep working.
    """
    if not transcript_text:
        return

    # Flatten list-of-lines into a single string; tolerate a plain string too.
    if isinstance(transcript_text, (list, tuple)):
        transcript_str = "".join(str(line) for line in transcript_text)
    else:
        transcript_str = str(transcript_text)
    if not transcript_str.strip():
        return

    pharmacist = call_context.get("pharmacist") or get_or_create_pharmacist(call_context)
    pharmacist_id = (
        pharmacist.get("pharmacy_id")
        or pharmacist.get("pharmacist_id")
        or call_context.get("phone_number")
        or "unknown"
    )
    pharmacy_name = str(pharmacist.get("name") or "").strip()
    conversation_id = call_context.get("call_sid") or call_context.get("stream_sid") or "unknown"
    conversation_type = str(call_context.get("conversation_type") or "inbound").strip() or "inbound"
    trigger_context = call_context.get("trigger_context") or {}
    combined_summary = " ".join(
        part for part in [
            str(summary or "").strip(),
            str(trigger_context.get("summary") or "").strip(),
        ] if part
    ).strip()

    doc = {
        "conversation_id": conversation_id,
        "pharmacist_id": pharmacist_id,
        "pharmacy_name": pharmacy_name,
        "type": conversation_type,
        "status": "completed",
        "timestamp": now_est(),
        "transcript": transcript_str,
        "summary": combined_summary,
        # Legacy fields kept for back-compat with earlier rows/queries.
        "call_type": "outgoing" if conversation_type == "outbound" else "incoming",
        "transcript_text": transcript_str,
        "trigger_context": trigger_context or None,
    }
    call_transcripts.insert_one(doc)


def normalize_phone(phone: str) -> str:
    if not phone:
        return ""
    return "".join(ch for ch in phone if ch.isdigit() or ch == "+")


def normalize_outbound_phone(phone: str) -> str:
    normalized = normalize_phone(phone)
    if not normalized:
        return ""
    if normalized.startswith("+"):
        return normalized
    if len(normalized) == 10:
        return f"+1{normalized}"
    return normalized


def build_trigger_call_reason(payload: Dict[str, Any]) -> str:
    medicine = str(payload.get("medicine") or payload.get("keyword") or "").strip()
    intent = str(payload.get("intent") or "").strip().replace("_", " ")
    summary = str(payload.get("summary") or "").strip()
    transcript = str(payload.get("transcript") or payload.get("text") or "").strip()

    parts = [
        f"medicine mention: {medicine}" if medicine else "",
        f"intent: {intent}" if intent else "",
        "store conversation follow-up needed" if (summary or transcript) else "",
    ]
    return ", ".join(part for part in parts if part) or "store conversation follow-up"


def build_transcription_bias_prompt() -> str:
    """
    Build a biasing prompt for Whisper so it transcribes brand names from the
    catalog instead of substituting the salt/active-ingredient equivalent
    (e.g. hearing 'Crocin' but writing 'Paracetamol').
    Whisper/Realtime accept a free-form `prompt` that nudges decoding toward
    the listed vocabulary. Keep it under a few hundred tokens.
    """
    try:
        names = [
            str(doc.get("name") or "").strip()
            for doc in medicines.find({}, {"_id": 0, "name": 1}).limit(400)
        ]
    except Exception as exc:
        logger.warning("Failed to load medicine names for transcription bias: %s", exc)
        names = []

    names = [n for n in names if n]
    if not names:
        return (
            "Medicines are referred to by their brand names (e.g. Crocin, Dolo, Calpol, "
            "Combiflam, Azithral, Augmentin). Transcribe brand names verbatim; do not "
            "substitute them with their salt or generic composition."
        )

    joined = ", ".join(sorted(set(names), key=str.lower))
    if len(joined) > 1500:
        joined = joined[:1500].rsplit(",", 1)[0]
    return (
        "The caller is ordering medicines by brand name. Transcribe the exact brand "
        "names they say; never replace them with the salt, active ingredient, or "
        "generic composition. Known brand names include: "
        f"{joined}."
    )


def build_catalog_snapshot_for_prompt() -> str:
    """
    Snapshot the live Medicines collection into a short, model-friendly string
    so the bot only ever refers to medicines using names that actually exist
    in the database. Without this, the model invents generic/salt names
    (e.g. 'ibuprofen', 'paracetamol') that aren't in the catalog.
    """
    try:
        docs = list(
            medicines.find(
                {},
                {"_id": 0, "name": 1, "stock_quantity": 1, "price_per_unit": 1},
            ).limit(400)
        )
    except Exception as exc:
        logger.warning("Failed to load medicines for prompt catalog: %s", exc)
        return ""

    lines: List[str] = []
    for doc in docs:
        name = str(doc.get("name") or "").strip()
        if not name:
            continue
        price = doc.get("price_per_unit")
        stock = doc.get("stock_quantity")
        details: List[str] = []
        if price is not None:
            try:
                details.append(f"${float(price):.2f}")
            except Exception:
                pass
        if stock is not None:
            details.append(f"stock {stock}")
        suffix = f" ({', '.join(details)})" if details else ""
        lines.append(f"- {name}{suffix}")

    if not lines:
        return ""

    return (
        "MEDICINE CATALOG (the ONLY medicines you can offer or accept — "
        "use these exact names verbatim, never substitute generic/salt names):\n"
        + "\n".join(lines)
    )


def build_call_system_message(call_context: Dict[str, Any]) -> str:
    trigger_context = call_context.get("trigger_context") or {}
    pharmacy = call_context.get("pharmacist") or {}
    pharmacy_name = str(pharmacy.get("name") or trigger_context.get("pharmacy_name") or "the pharmacy").strip()
    medicine = str(trigger_context.get("medicine") or "").strip()
    intent = str(trigger_context.get("intent") or "").strip().replace("_", " ")
    summary = str(trigger_context.get("summary") or "").strip()

    catalog_block = build_catalog_snapshot_for_prompt()
    catalog_rule = (
        " Only mention, suggest, confirm, or order medicines whose name appears "
        "exactly in the MEDICINE CATALOG below. Never invent names or use a "
        "generic/salt/active-ingredient name that is not in the catalog. If the "
        "caller asks for something not in the catalog, say it's not available "
        "and suggest the closest catalog item. When reading a medicine back to "
        "the caller, use the name exactly as it appears in the catalog."
    )

    base = SYSTEM_MESSAGE + catalog_rule
    if catalog_block:
        base = f"{base}\n\n{catalog_block}"

    if not trigger_context:
        return base

    trigger_message = (
        "This is an outbound trigger follow-up call. "
        f"You are speaking to {pharmacy_name}. "
        "You are the only assistant on the call, so do not say you are transferring, connecting, or handing over to another assistant. "
        "Open by naturally telling the pharmacy why you called, referencing the detected trigger medicine or store need. "
        f"Detected medicine: {medicine or 'not specified'}. "
        f"Detected intent: {intent or 'customer request'}. "
        f"Store summary: {summary or 'No summary provided.'} "
        "After the opening, have a natural conversation about whether they need stock, want to place an order, or want to confirm quantities. "
        "If they want to order, use the tools and save the order in the database. "
        "Keep the tone natural, helpful, short, and proactive."
    )
    return f"{base}\n\n{trigger_message}".strip()


def build_initial_greeting(call_context: Dict[str, Any]) -> str:
    trigger_context = call_context.get("trigger_context") or {}
    pharmacy = call_context.get("pharmacist") or {}
    pharmacy_name = str(pharmacy.get("name") or trigger_context.get("pharmacy_name") or "").strip()
    medicine = str(trigger_context.get("medicine") or "").strip()
    summary = str(trigger_context.get("summary") or "").strip()

    if trigger_context:
        details = []
        if medicine:
            details.append(f"I think you may need {medicine}")
        if summary:
            details.append(summary)
        detail_text = ". ".join(details).strip()
        if detail_text:
            detail_text = f" {detail_text}."
        return (
            f"Hello {pharmacy_name or 'there'}, this is MediVoice AI.{detail_text} "
            "I wanted to check with you directly and help you place an order or confirm what stock you need today."
        )

    client_name = str(pharmacy.get("name") or "").strip()
    if client_name:
        return TWIML_GREETING_RETURNING_TEMPLATE.format(client_name=client_name)
    return TWIML_GREETING_NEW_CALLER


def find_pharmacy_for_trigger(pharmacy_id: str = "", pharmacy_name: str = "") -> Dict[str, Any] | None:
    pharmacy_id = str(pharmacy_id or "").strip()
    pharmacy_name = str(pharmacy_name or "").strip()

    logger.info(
        "Trigger pharmacy lookup start pharmacy_id=%s pharmacy_name=%s",
        pharmacy_id,
        pharmacy_name,
    )

    if pharmacy_id:
        if ObjectId.is_valid(pharmacy_id):
            by_object_id = clients.find_one({"_id": ObjectId(pharmacy_id)})
            if by_object_id:
                logger.info(
                    "Trigger pharmacy found by _id name=%s contact=%s",
                    by_object_id.get("name"),
                    by_object_id.get("contact"),
                )
                return by_object_id

        by_business_id = clients.find_one({"pharmacy_id": pharmacy_id})
        if by_business_id:
            logger.info(
                "Trigger pharmacy found by pharmacy_id name=%s contact=%s",
                by_business_id.get("name"),
                by_business_id.get("contact"),
            )
            return by_business_id

    if pharmacy_name:
        by_name = clients.find_one({"name": {"$regex": f"^{pharmacy_name}$", "$options": "i"}})
        if by_name:
            logger.info(
                "Trigger pharmacy found by name name=%s contact=%s",
                by_name.get("name"),
                by_name.get("contact"),
            )
            return by_name

    logger.info(
        "Trigger pharmacy lookup failed pharmacy_id=%s pharmacy_name=%s",
        pharmacy_id,
        pharmacy_name,
    )
    return None


def place_trigger_follow_up_call_with_base(base_url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    logger.info(
        "Trigger auto-call start payload=%s",
        {
            "pharmacyId": payload.get("pharmacyId") or payload.get("pharmacy_id"),
            "pharmacyName": payload.get("pharmacyName") or payload.get("pharmacy_name"),
            "medicine": payload.get("medicine") or payload.get("keyword"),
            "intent": payload.get("intent"),
            "source": payload.get("source"),
            "language": payload.get("language"),
            "base_url": base_url,
        },
    )

    if not twilio_client:
        logger.info("Trigger auto-call aborted: Twilio credentials not configured")
        return {"ok": False, "error": "Twilio credentials not configured."}
    if not TWILIO_PHONE_NUMBER:
        logger.info("Trigger auto-call aborted: TWILIO_PHONE_NUMBER missing")
        return {"ok": False, "error": "TWILIO_PHONE_NUMBER not set in environment."}
    if not base_url:
        logger.info("Trigger auto-call aborted: BASE_URL missing")
        return {"ok": False, "error": "BASE_URL not configured."}

    pharmacy = find_pharmacy_for_trigger(
        pharmacy_id=str(payload.get("pharmacyId") or payload.get("pharmacy_id") or "").strip(),
        pharmacy_name=str(payload.get("pharmacyName") or payload.get("pharmacy_name") or "").strip(),
    )
    if not pharmacy:
        return {"ok": False, "error": "Pharmacy not found for auto-call."}

    to_number = normalize_outbound_phone(str(pharmacy.get("contact") or ""))
    if not to_number:
        logger.info(
            "Trigger auto-call aborted: pharmacy contact missing name=%s raw_contact=%s",
            pharmacy.get("name"),
            pharmacy.get("contact"),
        )
        return {"ok": False, "error": "Pharmacy contact number is missing."}

    from urllib.parse import quote

    reason = build_trigger_call_reason(payload)
    pharmacy_name = str(pharmacy.get("name") or payload.get("pharmacyName") or payload.get("pharmacy_name") or "Pharmacy").strip()
    voice_url = (
        f"{base_url}/api/twilio/trigger-call-script"
        f"?pharmacyName={quote(pharmacy_name)}"
        f"&to={quote(to_number)}"
        f"&medicine={quote(str(payload.get('medicine') or payload.get('keyword') or '').strip())}"
        f"&intent={quote(str(payload.get('intent') or '').strip())}"
        f"&summary={quote(str(payload.get('summary') or '').strip())}"
        f"&reason={quote(reason)}"
    )

    logger.info(
        "Trigger auto-call creating Twilio call to=%s from=%s url=%s",
        to_number,
        TWILIO_PHONE_NUMBER,
        voice_url,
    )

    try:
        call = twilio_client.calls.create(
            to=to_number,
            from_=TWILIO_PHONE_NUMBER,
            url=voice_url,
        )
    except Exception as exc:
        logger.exception("Trigger auto-call create failed: %s", exc)
        return {"ok": False, "error": str(exc)}

    logger.info("Trigger auto-call created call_sid=%s to=%s", call.sid, to_number)
    return {
        "ok": True,
        "call_sid": call.sid,
        "to": to_number,
        "pharmacy_name": pharmacy_name,
        "pharmacy_id": str(pharmacy.get("pharmacy_id") or pharmacy.get("_id") or "").strip(),
    }


def get_client_name_by_phone(phone: str) -> str:
    normalized_phone = normalize_phone(phone)
    if not normalized_phone:
        return ""
    client = clients.find_one(
        {"contact": normalized_phone},
        {"_id": 0, "name": 1},
    )
    return str((client or {}).get("name") or "").strip()


def _extract_medicine_name(item: Dict[str, Any]) -> str:
    return str(item.get("name") or item.get("medicine_name") or "").strip()


def _parse_quantity(value: Any) -> int:
    try:
        qty = int(str(value).strip())
    except Exception:
        qty = 0
    return max(qty, 0)


def _get_medicine_by_name(name: str) -> Dict[str, Any] | None:
    normalized = (name or "").strip()
    if not normalized:
        return None
    return medicines.find_one(
        {"name": {"$regex": f"^{normalized}$", "$options": "i"}},
        {"_id": 0, "medicine_id": 1, "name": 1, "stock_quantity": 1, "price_per_unit": 1, "discount": 1},
    )


def _get_medicine_by_id(medicine_id: str) -> Dict[str, Any] | None:
    normalized = (medicine_id or "").strip()
    if not normalized:
        return None
    return medicines.find_one(
        {"medicine_id": normalized},
        {"_id": 0, "medicine_id": 1, "name": 1, "stock_quantity": 1, "price_per_unit": 1, "discount": 1},
    )


def _stripe_line_items_from_final_items(final_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Build Stripe line items (USD cents per unit, quantity) matching order pricing."""
    out: List[Dict[str, Any]] = []
    for fi in final_items:
        med = _get_medicine_by_id(str(fi.get("medicine_id") or ""))
        if not med:
            continue
        name = _extract_medicine_name(med) or str(fi.get("medicine_id"))
        qty = _parse_quantity(fi.get("order_quantity"))
        unit_price = float(fi.get("unit_price") or 0.0)
        discount_pct = float(med.get("discount") or 0.0)
        unit_cents = int(round(unit_price * (1.0 - discount_pct / 100.0) * 100))
        unit_cents = max(1, unit_cents)
        out.append({"name": name, "unit_amount_cents": unit_cents, "quantity": max(1, qty)})
    return out


def _calc_line_total(unit_price: float, discount_pct: float, quantity: int) -> float:
    pct = float(discount_pct or 0.0)
    price = float(unit_price or 0.0)
    qty = int(quantity or 0)
    discounted_unit = price * (1.0 - (pct / 100.0))
    logger.info(f"price: {price}, discount_pct: {pct}, quantity: {qty}, discounted_unit: {discounted_unit}")
    logger.info(f"discounted_unit * quantity: {discounted_unit * qty}")
    return max(discounted_unit, 0.0) * max(qty, 0)


def should_end_call(text: str) -> bool:
    normalized = (text or "").lower()
    return any(phrase in normalized for phrase in END_CALL_PHRASES)


def validate_medicines(requested: List[str]) -> Dict[str, List[Dict[str, Any]]]:
    logger.info(f"requested: {requested}")
    catalog = list(
        medicines.find(
            {},
            {
                "_id": 0,
                "medicine_id": 1,
                "name": 1,
                "stock_quantity": 1,
                "price_per_unit": 1,
                "discount": 1,
            },
        )
    )
    by_name: Dict[str, Dict[str, Any]] = {}
    for item in catalog:
        logger.info(f"item: {item}")
        key = _extract_medicine_name(item).lower()
        if key:
            by_name[key] = item

    valid: List[Dict[str, Any]] = []
    invalid: List[Dict[str, Any]] = []
    for name in requested:
        key = name.lower().strip()
        logger.info(f"key: {key}")
        if key in by_name:
            valid.append(by_name[key])
        else:
            invalid.append({"name": name.strip()})
    return {"valid": valid, "invalid": invalid}


def _resolve_pharmacist_id(call_context: Dict[str, Any]) -> str:
    """Prefer the pharmacy's real ID (matches seed data), fall back to phone, then unknown."""
    pharmacy = call_context.get("pharmacist") or {}
    return (
        str(pharmacy.get("pharmacy_id") or "").strip()
        or str(pharmacy.get("pharmacist_id") or "").strip()
        or normalize_phone(call_context.get("phone_number") or "")
        or call_context.get("call_sid")
        or call_context.get("stream_sid")
        or "unknown"
    )


def create_order(
    call_context: Dict[str, Any],
    items: List[Dict[str, Any]],
    total_amount: float,
) -> Dict[str, Any]:
    # Enrich each item with the fields the pharmacy UI expects (medicine_name + quantity)
    # while keeping the original fields the bot/tool use.
    ui_items: List[Dict[str, Any]] = []
    for it in items:
        med = _get_medicine_by_id(str(it.get("medicine_id") or ""))
        ui_items.append(
            {
                "medicine_id": it.get("medicine_id"),
                "medicine_name": _extract_medicine_name(med) if med else (it.get("medicine_id") or ""),
                "quantity": _parse_quantity(it.get("order_quantity")),
                "order_quantity": str(it.get("order_quantity") or ""),
                "unit_price": float(it.get("unit_price") or 0.0),
            }
        )

    timestamp = now_est()
    delivery = timestamp + timedelta(days=4)
    order_doc = {
        "order_id": f"ORD-{random.randint(100000, 999999)}",
        "pharmacist_id": _resolve_pharmacist_id(call_context),
        "conversation_id": call_context.get("call_sid") or call_context.get("stream_sid"),
        "items": ui_items,
        "total_amount": float(total_amount or 0.0),
        # Match the status vocabulary the pharmacy UI filters/timelines use.
        "status": "Pending",
        "payment_status": "Pending",
        "order_timestamp": timestamp.isoformat(),
        "order_date": timestamp.date().isoformat(),
        "delivery_date": delivery.date().isoformat(),
        "mode_of_payment": "Credit card",
    }
    orders.insert_one(order_doc)
    return order_doc


def update_client_last_order(call_context: Dict[str, Any], order_id: str) -> None:
    phone = normalize_phone(call_context.get("phone_number") or "")
    if not phone or not order_id:
        return
    clients.update_one(
        {"contact": phone},
        {"$set": {"last_order": order_id}},
    )


def get_client_last_order_id(call_context: Dict[str, Any]) -> str:
    phone = normalize_phone(call_context.get("phone_number") or "")
    if not phone:
        return ""
    client = clients.find_one(
        {"contact": phone},
        {"_id": 0, "last_order": 1, "pharmacy_id": 1, "pharmacist_id": 1},
    )
    if client and client.get("last_order"):
        return str(client["last_order"]).strip()

    # Fallback: seed data + older bot runs didn't set last_order.
    # Find the most recent order keyed by this caller's pharmacy_id OR phone.
    lookup_keys: List[str] = [phone]
    for key in ("pharmacy_id", "pharmacist_id"):
        value = (client or {}).get(key)
        if value:
            lookup_keys.append(str(value))

    most_recent = orders.find_one(
        {"pharmacist_id": {"$in": lookup_keys}},
        {"_id": 0, "order_id": 1},
        sort=[("order_timestamp", -1), ("_id", -1)],
    )
    return str((most_recent or {}).get("order_id") or "").strip()


def get_order_status(order_id: str) -> Dict[str, Any]:
    normalized_order_id = str(order_id or "").strip()
    if not normalized_order_id:
        return {}
    order = orders.find_one(
        {"order_id": normalized_order_id},
        {"_id": 0, "order_id": 1, "status": 1, "payment_status": 1, "delivery_date": 1},
    )
    return order or {}


def handle_local_tool(tool_name: str, arguments: Dict[str, Any], call_context: Dict[str, Any]) -> Dict[str, Any]:
    if tool_name == "validate_medicine_order":
        logger.info(f"arguments: {arguments}")
        requested = [str(item).strip() for item in arguments.get("medicines", []) if str(item).strip()]
        result = validate_medicines(requested)
        valid_names = [_extract_medicine_name(item) for item in result["valid"]]
        call_context["pending_order"] = valid_names
        return {
            "ok": True,
            "valid_medicines": valid_names,
            "invalid_medicines": [item["name"] for item in result["invalid"]],
            "medicine_details": result["valid"],
            "pending_order": valid_names,
            "message": MSG_VALIDATED_MEDICINES,
        }

    if tool_name == "save_confirmed_order":
        raw_items = arguments.get("items")
        normalized_items: List[Dict[str, Any]] = []

        # Accept either a single dict item or a list of dict items.
        if isinstance(raw_items, dict):
            raw_items_list = [raw_items]
        elif isinstance(raw_items, list):
            raw_items_list = raw_items
        else:
            raw_items_list = []

        if raw_items_list:
            for raw in raw_items_list:
                if not isinstance(raw, dict):
                    continue
                medicine_id = str(raw.get("medicine_id") or "").strip()
                quantity = _parse_quantity(raw.get("order_quantity"))
                if medicine_id and quantity > 0:
                    normalized_items.append({"medicine_id": medicine_id, "order_quantity": str(quantity)})

        # Back-compat: if caller/model only provides medicine names, treat as quantity=1
        if not normalized_items:
            explicit_names = [str(item).strip() for item in arguments.get("medicines", []) if str(item).strip()]
            names = explicit_names if explicit_names else call_context.get("pending_order", [])
            for name in names:
                med = _get_medicine_by_name(str(name))
                if med and med.get("medicine_id"):
                    normalized_items.append({"medicine_id": med["medicine_id"], "order_quantity": "1"})

        if not normalized_items:
            return {
                "ok": False,
                "message": MSG_NO_ITEMS,
            }

        final_items: List[Dict[str, Any]] = []
        errors: List[str] = []
        total_amount = 0.0

        for entry in normalized_items:
            medicine_id = str(entry.get("medicine_id") or "").strip()
            quantity = _parse_quantity(entry.get("order_quantity"))
            med = _get_medicine_by_id(medicine_id)
            if not med:
                errors.append(f"Medicine not found: {medicine_id}")
                continue

            stock = _parse_quantity(med.get("stock_quantity"))
            if quantity <= 0:
                errors.append(f"Invalid quantity for {medicine_id}")
                continue
            if quantity > stock:
                errors.append(f"Quantity exceeds stock for {med.get('name') or medicine_id}: max {stock}")
                continue

            unit_price = float(med.get("price_per_unit") or 0.0)
            discount_pct = float(med.get("discount") or 0.0)
            total_amount += _calc_line_total(unit_price, discount_pct, quantity)

            final_items.append(
                {
                    "order_quantity": str(quantity),
                    "unit_price": unit_price,
                    "medicine_id": medicine_id,
                }
            )

        if errors:
            return {"ok": False, "errors": errors, "message": "Order validation failed."}
        if not final_items:
            return {"ok": False, "message": MSG_NO_VALID_ITEMS}

        # Atomically decrement stock per line. Conditional filter prevents going
        # negative if another order grabbed inventory between validation and now.
        decremented: List[Dict[str, Any]] = []
        stock_failure: str | None = None
        for fi in final_items:
            mid = str(fi["medicine_id"])
            qty = _parse_quantity(fi["order_quantity"])
            res = medicines.update_one(
                {"medicine_id": mid, "stock_quantity": {"$gte": qty}},
                {"$inc": {"stock_quantity": -qty}},
            )
            if res.modified_count != 1:
                med_now = _get_medicine_by_id(mid) or {}
                stock_failure = (
                    f"Stock unavailable for {med_now.get('name') or mid}: "
                    f"requested {qty}, available {_parse_quantity(med_now.get('stock_quantity'))}"
                )
                break
            decremented.append({"medicine_id": mid, "order_quantity": qty})

        if stock_failure:
            # Roll back any prior decrements so the catalog stays consistent.
            for d in decremented:
                medicines.update_one(
                    {"medicine_id": d["medicine_id"]},
                    {"$inc": {"stock_quantity": d["order_quantity"]}},
                )
            return {"ok": False, "message": stock_failure}

        order_doc = create_order(call_context, final_items, total_amount)
        update_client_last_order(call_context, order_doc["order_id"])

        phone = normalize_phone(call_context.get("phone_number") or "")
        stripe_lines = _stripe_line_items_from_final_items(final_items)
        if not stripe_lines and total_amount > 0:
            oid = order_doc["order_id"]
            stripe_lines = [
                {
                    "name": f"Order {oid}",
                    "unit_amount_cents": max(1, int(round(float(total_amount) * 100))),
                    "quantity": 1,
                }
            ]

        payment_link: str | None = None
        sms_sent = False
        logger.info(f"phone: {phone}, stripe_lines: {stripe_lines}")
        if phone and stripe_lines:
            payment_link, sms_sent = generate_payment_link_and_sms(
                order_doc["order_id"],
                stripe_lines,
                phone,
            )
            if payment_link:
                orders.update_one(
                    {"order_id": order_doc["order_id"]},
                    {"$set": {"payment_link": payment_link}},
                )

        call_context["pending_order"] = []
        if sms_sent:
            msg = MSG_ORDER_SAVED_SMS_SENT
        elif payment_link:
            msg = MSG_ORDER_SAVED_SMS_FAILED
        else:
            msg = MSG_ORDER_SAVED

        result: Dict[str, Any] = {
            "ok": True,
            "order_id": order_doc["order_id"],
            "items": order_doc["items"],
            "total_amount": order_doc["total_amount"],
            "status": order_doc["status"],
            "payment_status": order_doc["payment_status"],
            "delivery_date": (
                order_doc["delivery_date"].isoformat()
                if isinstance(order_doc["delivery_date"], (datetime,))
                else str(order_doc["delivery_date"])
            ),
            "mode_of_payment": order_doc["mode_of_payment"],
            "payment_link": payment_link,
            "sms_sent": sms_sent,
            "message": msg,
        }
        return result

    if tool_name == "end_call":
        return {
            "ok": True,
            "end_call": True,
            "message": MSG_END_CALL,
        }

    if tool_name == "check_order_status":
        provided_order_id = str(arguments.get("order_id") or "").strip()
        order_id = provided_order_id or get_client_last_order_id(call_context)
        if not order_id:
            return {
                "ok": False,
                "message": MSG_NO_ORDER_ID_OR_LAST_ORDER,
            }

        order = get_order_status(order_id)
        if not order:
            return {
                "ok": False,
                "order_id": order_id,
                "message": MSG_ORDER_NOT_FOUND,
            }

        delivery_date = order.get("delivery_date")
        return {
            "ok": True,
            "order_id": order.get("order_id"),
            "status": order.get("status", "unknown"),
            "payment_status": order.get("payment_status", "unknown"),
            "delivery_date": delivery_date.isoformat() if isinstance(delivery_date, datetime) else delivery_date,
            "message": MSG_ORDER_STATUS_OK,
        }

    return {"ok": False, "message": f"Unsupported tool: {tool_name}"}


def place_trigger_follow_up_call(request: Request, payload: Dict[str, Any]) -> Dict[str, Any]:
    base = str(request.base_url).rstrip("/")
    return place_trigger_follow_up_call_with_base(base, payload)


@app.get("/health", response_class=JSONResponse)
async def health() -> dict:
    return {"status": "ok"}


@app.get("/", response_class=JSONResponse)
async def index_page():
    return {"message": INDEX_PAGE_MESSAGE}


async def _store_trigger_event_impl(request: Request):
    try:
        content_type = request.headers.get("content-type") or ""
        if "application/json" in content_type:
            payload = await request.json()
        else:
            form = await request.form()
            payload = dict(form)
    except Exception:
        payload = {}

    logger.info("Store trigger payload=%s", payload)

    pharmacy_id = str(payload.get("pharmacyId") or payload.get("pharmacy_id") or "").strip()
    pharmacy_name = str(payload.get("pharmacyName") or payload.get("pharmacy_name") or "").strip()
    keyword = str(payload.get("keyword") or payload.get("medicine") or "").strip()
    summary = str(payload.get("summary") or "").strip()
    transcript = str(payload.get("transcript") or payload.get("text") or "").strip()
    intent = str(payload.get("intent") or "customer_request").strip()
    language = str(payload.get("language") or "en").strip()
    source = str(payload.get("source") or "raspberry_pi").strip()
    auto_call_raw = str(payload.get("autoCall", "true")).strip().lower()
    auto_call = auto_call_raw not in {"false", "0", "no", "off"}

    pharmacy = find_pharmacy_for_trigger(pharmacy_id=pharmacy_id, pharmacy_name=pharmacy_name)
    trigger_doc = {
        "pharmacy_id": str((pharmacy or {}).get("pharmacy_id") or pharmacy_id or (pharmacy or {}).get("_id") or "").strip() or None,
        "pharmacy_name": str((pharmacy or {}).get("name") or pharmacy_name or "").strip() or None,
        "medicine": keyword or None,
        "intent": intent,
        "summary": summary or None,
        "transcript": transcript or None,
        "language": language,
        "source": source,
        "created_at": now_est(),
    }
    insert_result = trigger_words.insert_one(trigger_doc)

    auto_call_result: Dict[str, Any] = {"ok": False, "skipped": True, "error": "Auto-call disabled."}
    if auto_call:
        auto_call_result = place_trigger_follow_up_call(request, payload)

    update_fields: Dict[str, Any] = {}
    if auto_call_result.get("ok"):
        update_fields = {
            "auto_call_status": "initiated",
            "auto_call_sid": auto_call_result.get("call_sid"),
            "auto_call_to": auto_call_result.get("to"),
            "call_triggered_at": now_est(),
        }
    else:
        update_fields = {
            "auto_call_status": "skipped" if auto_call_result.get("skipped") else "failed",
            "auto_call_error": auto_call_result.get("error") or "",
        }
    trigger_words.update_one({"_id": insert_result.inserted_id}, {"$set": update_fields})

    saved = trigger_words.find_one({"_id": insert_result.inserted_id})
    if saved and "_id" in saved:
        saved["_id"] = str(saved["_id"])

    logger.info("Store trigger result inserted_id=%s auto_call=%s", insert_result.inserted_id, auto_call_result)
    return JSONResponse({"ok": True, "item": saved, "autoCall": auto_call_result})


@app.post("/api/store-trigger", response_class=JSONResponse)
async def store_trigger_event(request: Request):
    return await _store_trigger_event_impl(request)


@app.post("/api/trigger-words", response_class=JSONResponse)
async def store_trigger_word_event(request: Request):
    return await _store_trigger_event_impl(request)


async def _trigger_call_script_impl(request: Request) -> HTMLResponse:
    params = request.query_params
    pharmacy_name = str(params.get("pharmacyName") or "valued pharmacy").strip()
    to_phone = str(params.get("to") or params.get("To") or "").strip()
    medicine = str(params.get("medicine") or "").strip()
    intent = str(params.get("intent") or "").strip().replace("_", " ")
    summary = str(params.get("summary") or "").strip()
    reason = str(params.get("reason") or "store conversation follow-up").strip()

    response = VoiceResponse()
    host = request.url.hostname
    normalized_phone = normalize_phone(to_phone)
    connect = Connect()
    stream = connect.stream(url=f"wss://{host}/media-stream?phone_number={normalized_phone}")
    if normalized_phone:
        try:
            stream.parameter(name="phone_number", value=normalized_phone)
        except Exception:
            logger.exception("Failed to add trigger call stream parameter phone_number")
    for name, value in (
        ("call_type", "outbound"),
        ("call_mode", "trigger_follow_up"),
        ("pharmacy_name", pharmacy_name),
        ("medicine", medicine),
        ("intent", intent),
        ("summary", summary),
        ("reason", reason),
    ):
        if str(value or "").strip():
            try:
                stream.parameter(name=name, value=str(value))
            except Exception:
                logger.exception("Failed to add trigger call stream parameter %s", name)
    response.append(connect)
    return HTMLResponse(content=str(response), media_type="application/xml")


async def trigger_word_poller() -> None:
    await asyncio.sleep(2)
    while True:
        try:
            started_after = trigger_poller_started_at or now_est()
            recent_cutoff = now_est() - timedelta(seconds=max(TRIGGER_MAX_CALL_AGE_SECONDS, 5))
            pending = list(
                trigger_words.find(
                    {
                        "created_at": {
                            "$gte": max(started_after, recent_cutoff),
                        },
                        "$or": [
                            {"auto_call_status": {"$exists": False}},
                            {"auto_call_status": None},
                            {"auto_call_status": ""},
                        ]
                    }
                )
                .sort("created_at", 1)
                .limit(25)
            )

            for doc in pending:
                trigger_id = doc.get("_id")
                created_at = doc.get("created_at")
                try:
                    trigger_words.update_one(
                        {"_id": trigger_id, "$or": [{"auto_call_status": {"$exists": False}}, {"auto_call_status": None}, {"auto_call_status": ""}]},
                        {"$set": {"auto_call_status": "processing", "picked_at": now_est()}},
                    )
                    refreshed = trigger_words.find_one({"_id": trigger_id}) or {}
                    if refreshed.get("auto_call_status") != "processing":
                        continue

                    payload = {
                        "pharmacy_id": refreshed.get("pharmacy_id"),
                        "pharmacy_name": refreshed.get("pharmacy_name"),
                        "medicine": refreshed.get("medicine"),
                        "keyword": refreshed.get("medicine"),
                        "intent": refreshed.get("intent"),
                        "summary": refreshed.get("summary"),
                        "transcript": refreshed.get("transcript"),
                        "source": refreshed.get("source"),
                        "language": refreshed.get("language"),
                    }
                    logger.info(
                        "Trigger poller processing trigger_id=%s created_at=%s started_after=%s recent_cutoff=%s payload=%s",
                        trigger_id,
                        created_at,
                        started_after,
                        recent_cutoff,
                        payload,
                    )
                    result = place_trigger_follow_up_call_with_base(BASE_URL, payload)
                    latency_seconds = None
                    if isinstance(created_at, datetime):
                        latency_seconds = round((now_est() - created_at).total_seconds(), 2)

                    update_fields: Dict[str, Any] = {
                        "processed_at": now_est(),
                        "call_latency_seconds": latency_seconds,
                    }
                    if result.get("ok"):
                        update_fields.update(
                            {
                                "auto_call_status": "initiated",
                                "auto_call_sid": result.get("call_sid"),
                                "auto_call_to": result.get("to"),
                                "call_triggered_at": now_est(),
                                "auto_call_error": "",
                            }
                        )
                    else:
                        update_fields.update(
                            {
                                "auto_call_status": "failed",
                                "auto_call_error": result.get("error") or "Unknown auto-call failure.",
                            }
                        )
                    trigger_words.update_one({"_id": trigger_id}, {"$set": update_fields})
                    logger.info(
                        "Trigger poller finished trigger_id=%s status=%s latency_seconds=%s",
                        trigger_id,
                        update_fields.get("auto_call_status"),
                        latency_seconds,
                    )
                except Exception as exc:
                    logger.exception("Trigger poller failed for trigger_id=%s: %s", trigger_id, exc)
                    trigger_words.update_one(
                        {"_id": trigger_id},
                        {
                            "$set": {
                                "auto_call_status": "failed",
                                "auto_call_error": str(exc),
                                "processed_at": now_est(),
                            }
                        },
                    )
        except Exception as exc:
            logger.exception("Trigger word poller loop failed: %s", exc)

        await asyncio.sleep(max(TRIGGER_POLL_SECONDS, 1))


@app.api_route("/api/twilio/trigger-call-script", methods=["GET", "POST"])
async def trigger_call_script(request: Request) -> HTMLResponse:
    return await _trigger_call_script_impl(request)


@app.api_route("/api/twilio/outbound-script", methods=["GET", "POST"])
async def outbound_trigger_call_script(request: Request) -> HTMLResponse:
    return await _trigger_call_script_impl(request)


def twiml_connect_voice(request: Request, client_phone: str) -> HTMLResponse:
    """TwiML: connect straight to the media stream so the OpenAI voice does the greeting."""
    response = VoiceResponse()
    host = request.url.hostname
    normalized_phone = normalize_phone(client_phone)
    connect = Connect()
    stream = connect.stream(url=f"wss://{host}/media-stream?phone_number={normalized_phone}")
    # Twilio forwards <Parameter> values in start.customParameters (more reliable than querystring alone).
    if normalized_phone:
        try:
            stream.parameter(name="phone_number", value=normalized_phone)
        except Exception:
            logger.exception("Failed to add Twilio stream parameter phone_number")
    response.append(connect)
    return HTMLResponse(content=str(response), media_type="application/xml")


@app.api_route("/twilio/incoming", methods=["GET", "POST"])
async def handle_incoming_call(request: Request):
    """
    Handle incoming call and return TwiML response
    to connect the call to the /media-stream WebSocket.
    """
    form_data = await request.form()
    caller_phone = str(form_data.get("From") or form_data.get("from") or "").strip()
    return twiml_connect_voice(request, caller_phone)


@app.get("/twilio/outgoing")
async def twilio_outgoing_voice(request: Request) -> HTMLResponse:
    """
    TwiML Twilio fetches when an outbound call is answered (url=.../twilio/outgoing).
    Lookup client by callee number (To).
    """
    to_phone = str(request.query_params.get("To") or request.query_params.get("to") or "").strip()
    return twiml_connect_voice(request, to_phone)


@app.post("/twilio/outgoing", response_model=None)
async def twilio_outgoing_call(request: Request):
    """
    Twilio may POST here to fetch TwiML (form: CallSid, To, â¦).
    Your app POSTs JSON or form with `to` to start an outbound call.
    """
    content_type = request.headers.get("content-type") or ""

    if "application/json" in content_type:
        try:
            body = await request.json()
        except Exception:
            body = {}
        to_number = str(body.get("to") or "").strip()
    else:
        try:
            form = await request.form()
        except Exception:
            form = {}
        if form.get("CallSid"):
            to_phone = str(form.get("To") or form.get("to") or "").strip()
            return twiml_connect_voice(request, to_phone)
        to_number = str(form.get("to") or "").strip()

    if not to_number:
        return JSONResponse({"ok": False, "error": "Missing 'to' (destination phone number)."}, status_code=400)

    if not twilio_client:
        return JSONResponse({"ok": False, "error": "Twilio credentials not configured."}, status_code=503)
    if not TWILIO_PHONE_NUMBER:
        return JSONResponse({"ok": False, "error": "TWILIO_PHONE_NUMBER not set in environment."}, status_code=503)

    base = str(request.base_url).rstrip("/")
    voice_url = f"{base}/twilio/outgoing"
    try:
        call = twilio_client.calls.create(
            to=to_number,
            from_=TWILIO_PHONE_NUMBER,
            url=voice_url,
        )
    except Exception as exc:
        logger.exception("Outbound call failed: %s", exc)
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=502)

    return JSONResponse({"ok": True, "call_sid": call.sid, "to": to_number, "from": TWILIO_PHONE_NUMBER})


@app.api_route("/twilio/status", methods=["GET", "POST"])
async def twilio_call_status(request: Request) -> Response:
    """Twilio statusCallback URL; body is ignored by Twilio, must return 2xx."""
    if request.method == "POST":
        try:
            form = await request.form()
            logger.info(
                "Twilio status callback CallSid=%s CallStatus=%s",
                form.get("CallSid"),
                form.get("CallStatus"),
            )
        except Exception:
            logger.exception("twilio/status: failed to parse form")
    return Response(status_code=200)


@app.websocket("/media-stream")
async def handle_media_stream(websocket: WebSocket):
    """
    Bridge audio between Twilio Media Streams and
    the OpenAI Realtime WebSocket API.
    """
    logger.info("Twilio client connected to /media-stream")
    await websocket.accept()
    phone_from_query = normalize_phone(str(websocket.query_params.get("phone_number") or ""))

    async with websockets.connect(
        f"wss://api.openai.com/v1/realtime?model=gpt-realtime&temperature={TEMPERATURE}",
        additional_headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
        ping_interval=20,
        ping_timeout=20,
    ) as openai_ws:
        call_context: Dict[str, Any] = {
            "stream_sid": None,
            "call_sid": None,
            "phone_number": phone_from_query,
            "pending_order": [],
            "tran_list": [],
            "conversation_type": "inbound",
            "trigger_context": {},
        }
        await send_session_update(openai_ws, call_context)
        stream_sid = None
        call_ended = asyncio.Event()
        tasks: List[asyncio.Task] = []

        async def terminate_call(reason: str) -> None:
            if call_ended.is_set():
                return
            call_ended.set()
            call_sid = call_context.get("call_sid")
            logger.info("Terminating call. reason=%s call_sid=%s", reason, call_sid)
            tran_list = call_context.get("tran_list", [])
            logger.info("Final Transcript list: %s", tran_list)
            if tran_list:
                try:
                    save_call_transcript(call_context, tran_list)
                except Exception as exc:
                    logger.exception("Failed to save final call transcript: %s", exc)

            if twilio_client and call_sid:
                try:
                    twilio_client.calls(call_sid).update(status="completed")
                    logger.info("Twilio call marked completed: %s", call_sid)
                except Exception as exc:
                    logger.exception("Failed to complete Twilio call via API: %s", exc)

            try:
                if openai_ws.state.name == "OPEN":
                    await openai_ws.close()
            except Exception as exc:
                logger.exception("Failed to close OpenAI websocket: %s", exc)

            try:
                await websocket.close()
            except Exception as exc:
                logger.exception("Failed to close Twilio websocket: %s", exc)

            current = asyncio.current_task()
            for t in tasks:
                if t is not current and not t.done():
                    t.cancel()

        async def receive_from_twilio():
            """Receive audio data from Twilio and send it to the OpenAI Realtime API."""
            nonlocal stream_sid
            try:
                async for message in websocket.iter_text():
                    if call_ended.is_set():
                        return
                    data = json.loads(message)
                    if data.get("event") == "media" and openai_ws.state.name == "OPEN":
                        audio_append = {
                            "type": "input_audio_buffer.append",
                            "audio": data["media"]["payload"],
                        }
                        await openai_ws.send(json.dumps(audio_append))
                    elif data.get("event") == "start":
                        stream_sid = data["start"]["streamSid"]
                        call_context["stream_sid"] = stream_sid
                        call_context["call_sid"] = (data.get("start") or {}).get("callSid")
                        custom_parameters = ((data.get("start") or {}).get("customParameters") or {})
                        parsed_phone = normalize_phone(
                            custom_parameters.get("phone_number")
                            or custom_parameters.get("from")
                            or custom_parameters.get("caller")
                            or ""
                        )
                        if parsed_phone:
                            call_context["phone_number"] = parsed_phone
                        call_context["conversation_type"] = (
                            str(custom_parameters.get("call_type") or call_context.get("conversation_type") or "inbound").strip()
                            or "inbound"
                        )
                        trigger_context = {
                            "pharmacy_name": str(custom_parameters.get("pharmacy_name") or "").strip(),
                            "medicine": str(custom_parameters.get("medicine") or "").strip(),
                            "intent": str(custom_parameters.get("intent") or "").strip(),
                            "summary": str(custom_parameters.get("summary") or "").strip(),
                            "reason": str(custom_parameters.get("reason") or "").strip(),
                            "call_mode": str(custom_parameters.get("call_mode") or "").strip(),
                        }
                        if any(trigger_context.values()):
                            call_context["trigger_context"] = trigger_context
                        logger.info(
                            "Twilio start stream_sid=%s call_sid=%s query_phone=%s custom_parameters=%s final_phone=%s",
                            stream_sid,
                            call_context.get("call_sid"),
                            phone_from_query,
                            custom_parameters,
                            call_context.get("phone_number"),
                        )
                        # Ensure pharmacist record exists for this caller and cache it
                        get_or_create_pharmacist(call_context)
                        if call_context.get("trigger_context"):
                            await send_session_update(openai_ws, call_context)
                        logger.info("Incoming stream has started %s", stream_sid)

                        # Ask the model to speak the greeting so the caller hears
                        # one consistent voice and, for trigger calls, use the detected context.
                        greeting_text = build_initial_greeting(call_context)
                        try:
                            await openai_ws.send(
                                json.dumps(
                                    {
                                        "type": "response.create",
                                        "response": {
                                            "output_modalities": ["audio"],
                                            "instructions": (
                                                "Greet the caller warmly using exactly this line, "
                                                f"then wait for them to speak: {greeting_text}"
                                            ),
                                        },
                                    }
                                )
                            )
                        except Exception:
                            logger.exception("Failed to trigger initial greeting")
            except asyncio.CancelledError:
                raise
            except WebSocketDisconnect:
                logger.info("Twilio client disconnected.")
            except RuntimeError as exc:
                # Raised by Starlette when the socket was closed from the other side (e.g. terminate_call).
                logger.info("receive_from_twilio: websocket closed (%s)", exc)
            except Exception:
                logger.exception("receive_from_twilio: unexpected error")
            finally:
                try:
                    if openai_ws.state.name == "OPEN":
                        await openai_ws.close()
                except Exception:
                    logger.exception("receive_from_twilio: failed closing OpenAI ws")

        async def send_to_twilio():
            """Receive events from the OpenAI Realtime API and send audio back to Twilio."""
            nonlocal stream_sid
            try:
                async for openai_message in openai_ws:
                    if call_ended.is_set():
                        return
                    response = json.loads(openai_message)

                    if response.get("type") in LOG_EVENT_TYPES:
                        logger.info("Received event: %s %s", response["type"], response)

                    if response.get("type") == "session.updated":
                        logger.info("Session updated successfully: %s", response)
                    elif response.get("type") == "response.done":
                        gpt_response_text = _extract_assistant_transcript_from_response_done(response)

                        if gpt_response_text:
                            call_context.setdefault("tran_list", []).append(f"Assistant: {gpt_response_text}\n")

                        if gpt_response_text:
                            logger.info("gpt_response_text: %s", gpt_response_text)
                        else:
                            logger.debug("response.done had no assistant transcript text")

                    if response.get("type") == "response.function_call_arguments.done":
                        tool_name = response.get("name", "")
                        call_id = response.get("call_id")
                        raw_args = response.get("arguments", "{}")
                        try:
                            parsed_args = json.loads(raw_args) if raw_args else {}
                        except json.JSONDecodeError:
                            parsed_args = {}
                        tool_output = handle_local_tool(tool_name, parsed_args, call_context)
                        logger.info("Tool call handled: %s -> %s", tool_name, tool_output)
                        if call_id:
                            await openai_ws.send(
                                json.dumps(
                                    {
                                        "type": "conversation.item.create",
                                        "item": {
                                            "type": "function_call_output",
                                            "call_id": call_id,
                                            "output": json.dumps(tool_output),
                                        },
                                    }
                                )
                            )
                            if not tool_output.get("end_call"):
                                await openai_ws.send(
                                    json.dumps(
                                        {
                                            "type": "response.create",
                                            "response": {"output_modalities": ["audio"]},
                                        }
                                    )
                                )
                        if tool_output.get("end_call"):
                            await terminate_call("tool:end_call")
                            return

                    if response.get("type") == "conversation.item.input_audio_transcription.failed":
                        logger.warning(
                            "Input transcription failed: %s",
                            response.get("error") or response,
                        )

                    # Print client speech when the input buffer is committed (if transcript is present on this event).
                    # OpenAI usually sends transcript text on conversation.item.input_audio_transcription.completed instead.
                    if response.get("type") == "input_audio_buffer.committed":
                        tt = _extract_transcript_text_from_realtime_event(response)
                        if tt:
                            if _handle_client_speech_transcript(
                                call_context,
                                tt,
                                "input_audio_buffer.committed",
                                str(response.get("item_id") or "") or None,
                            ):
                                await terminate_call("phrase_detected")
                                return
                        else:
                            logger.debug(
                                "input_audio_buffer.committed item_id=%s (no transcript_text on this event; wait for transcription.completed)",
                                response.get("item_id"),
                            )

                    if response.get("type") in (
                        "conversation.item.input_audio_transcription.completed",
                        "input_audio_buffer.transcription.completed",
                    ):
                        tt = _extract_transcript_text_from_realtime_event(response)
                        if tt and _handle_client_speech_transcript(
                            call_context,
                            tt,
                            response.get("type") or "transcription.completed",
                            str(response.get("item_id") or "") or None,
                        ):
                            await terminate_call("phrase_detected")
                            return

                    if (
                        response.get("type") == "response.output_audio.delta"
                        and response.get("delta")
                    ):
                        try:
                            # Re-encode the audio as base64 for Twilio
                            audio_payload = base64.b64encode(
                                base64.b64decode(response["delta"])
                            ).decode("utf-8")
                            audio_delta = {
                                "event": "media",
                                "streamSid": stream_sid,
                                "media": {"payload": audio_payload},
                            }
                            await websocket.send_json(audio_delta)
                        except Exception as exc:
                            logger.exception("Error processing audio data: %s", exc)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.exception("Error in send_to_twilio: %s", exc)
            finally:
                try:
                    await websocket.close()
                except Exception:
                    pass

        tasks.extend(
            [
                asyncio.create_task(receive_from_twilio()),
                asyncio.create_task(send_to_twilio()),
            ]
        )
        try:
            await asyncio.gather(*tasks, return_exceptions=True)
        except Exception:
            logger.exception("media-stream handler error")
        finally:
            if not call_ended.is_set():
                try:
                    await terminate_call("handler_exit")
                except Exception:
                    logger.exception("terminate_call during handler exit failed")


async def send_session_update(openai_ws, call_context: Dict[str, Any] | None = None):
    """Configure the Realtime session on the OpenAI WebSocket connection."""
    session_instructions = build_call_system_message(call_context or {})
    session_update = {
        "type": "session.update",
        "session": {
            "type": "realtime",
            "model": "gpt-realtime",
            "output_modalities": ["audio"],
            "audio": {
                "input": {
                    "format": {"type": "audio/pcmu"},
                    "turn_detection": {"type": "server_vad"},
                    # Without this, input_audio_buffer / conversation transcription events are not emitted.
                    # `prompt` biases Whisper toward catalog brand names so it won't
                    # transcribe "Crocin" as "Paracetamol", etc.
                    "transcription": {
                        "model": REALTIME_INPUT_TRANSCRIPTION_MODEL,
                        "language": "en",
                        "prompt": build_transcription_bias_prompt(),
                    },
                },
                "output": {
                    "format": {"type": "audio/pcmu"},
                    "voice": VOICE,
                },
            },
            "tools": [
                {
                    "type": "function",
                    "name": "validate_medicine_order",
                    "description": TOOL_VALIDATE_MEDICINE_ORDER_DESCRIPTION,
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "medicines": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Medicine names requested by caller.",
                            }
                        },
                        "required": ["medicines"],
                    },
                },
                {
                    "type": "function",
                    "name": "save_confirmed_order",
                    "description": TOOL_SAVE_CONFIRMED_ORDER_DESCRIPTION,
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "medicines": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Optional override medicines for final order.",
                            }
                            ,
                            "items": {
                                "description": TOOL_PROP_ITEMS_DESCRIPTION,
                                "oneOf": [
                                    {
                                        "type": "object",
                                        "properties": {
                                            "order_quantity": {"type": "string"},
                                            "unit_price": {"type": "number"},
                                            "medicine_id": {"type": "string"},
                                        },
                                        "required": ["order_quantity", "medicine_id"],
                                    },
                                    {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "order_quantity": {"type": "string"},
                                                "unit_price": {"type": "number"},
                                                "medicine_id": {"type": "string"},
                                            },
                                            "required": ["order_quantity", "medicine_id"],
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
                {
                    "type": "function",
                    "name": "end_call",
                    "description": TOOL_END_CALL_DESCRIPTION,
                    "parameters": {
                        "type": "object",
                        "properties": {},
                    },
                },
                {
                    "type": "function",
                    "name": "check_order_status",
                    "description": TOOL_CHECK_ORDER_STATUS_DESCRIPTION,
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "order_id": {
                                "type": "string",
                                "description": TOOL_PROP_ORDER_ID_DESCRIPTION,
                            }
                        },
                    },
                },
            ],
            "tool_choice": "auto",
            "instructions": session_instructions,
        },
    }
    logger.info("Sending session update: %s", json.dumps(session_update))
    await openai_ws.send(json.dumps(session_update))


if __name__ == "__main__":
    import uvicorn

    uvicorn_log_config = load_uvicorn_log_config()
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_config=uvicorn_log_config)
