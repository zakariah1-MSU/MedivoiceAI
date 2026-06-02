import logging
import os
from pathlib import Path

import stripe
from dotenv import load_dotenv
from twilio.rest import Client

PROJECT_ROOT = Path(__file__).resolve().parent
load_dotenv(PROJECT_ROOT / ".env")

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
logger.propagate = False
logger.handlers.clear()
app_file_handler = logging.FileHandler("stripe_payment.log", mode="a", encoding="utf-8")
app_file_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
logger.addHandler(app_file_handler)

stripe.api_key = os.getenv("STRIPE_API_KEY")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "").strip()



def generate_payment_link_and_sms(
    order_id: str,
    line_items: list[dict],
    phone_e164: str,
) -> tuple[str | None, bool]:
    """
    Create a Stripe Payment Link and text it to the client.

    line_items: [{"name": str, "unit_amount_cents": int, "quantity": int}, ...]
    unit_amount_cents: USD smallest unit (cents) per unit, after any discount.

    Returns (payment_url | None, sms_sent).
    """
    if not stripe.api_key:
        logger.warning("STRIPE_API_KEY not set; skipping payment link.")
        return None, False
    if not line_items:
        return None, False

    try:
        stripe_line_items = []
        for item in line_items:
            name = str(item.get("name") or "Item")[:120]
            unit_cents = max(1, int(item.get("unit_amount_cents") or 1))
            qty = max(1, int(item.get("quantity") or 1))
            stripe_line_items.append(
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {"name": name},
                        "unit_amount": unit_cents,
                    },
                    "quantity": qty,
                }
            )

        payment_link = stripe.PaymentLink.create(line_items=stripe_line_items)
        link_url = payment_link.url
        logger.info("Stripe Payment Link created for order_id=%s", order_id)
    except Exception as exc:
        logger.exception("Stripe PaymentLink failed: %s", exc)
        return None, False

    sms_ok = False
    if phone_e164:
        sms_ok = send_payment_link_via_sms(link_url, phone_e164, order_id=order_id)
    else:
        logger.warning("No phone number; payment link created but SMS not sent.")

    return link_url, sms_ok


def send_payment_link_via_sms(payment_link: str, phone_number: str, order_id: str = "") -> bool:
    """Send the Stripe payment URL to the client's phone via Twilio SMS."""
    if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER):
        logger.warning("Twilio not fully configured; skipping payment SMS.")
        return False
    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        prefix = f"Order {order_id}. " if order_id else ""
        body = f"{prefix}Pay securely here: {payment_link}"
        logger.info(f"Sending payment_link: {payment_link} to {phone_number}: {body}")
        client.messages.create(
            to=phone_number,
            from_=TWILIO_PHONE_NUMBER,
            body=body,
        )
        logger.info("Payment link SMS queued for %s", phone_number)
        return True
    except Exception as exc:
        logger.exception("SMS failed: %s", exc)
        return False
