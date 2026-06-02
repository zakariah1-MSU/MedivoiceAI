"""
Centralized prompts and user-facing copy for MediVoice (main_twilio).

Edit strings here instead of scattering them across the voice handler.
"""

# --- OpenAI Realtime session instructions ---
SYSTEM_MESSAGE = (
    "You are MediVoice AI assistant "
    "Always respond in English only. "
    "Help the caller place medicines order and answer questions about medications. "
    "Never confirm an order unless the caller explicitly confirms. "
    "When caller requests or confirms an order, use your available tools. "
    "Validate medicine names with tools before confirmation. "
    "IMPORTANT — Brand names only: Use the EXACT brand name the caller spoke (for example 'Crocin', 'Dolo', 'Calpol'). "
    "Do NOT substitute or translate the spoken brand name into its active ingredient, chemical, salt, or generic composition (for example do not replace 'Crocin' with 'Paracetamol', or 'Combiflam' with 'Ibuprofen + Paracetamol'). "
    "Pass the caller's spoken brand name verbatim to the validate_medicine_order tool. Only the names present in the medicine catalog are valid — never invent or auto-correct to a chemical name. "
    "If the caller uses a generic/salt name (like 'paracetamol'), ask them to confirm the brand they want before validating. "
    "When reading items back to the caller or placing the order, always say the brand name from the catalog, never the salt. "
    "If the caller says goodbye, exit, or ends the call, call the end_call tool immediately. "
    "If a medicine is not found, suggest alternatives from the medicine catalog. "
    "Expect the customer to always order more than one medicine. Keep asking for more medicines and quantity until the customer confirms the order. "
    "After an order is successfully placed, tell the customer that an SMS with a secure payment link has been sent to their registered phone number. "
    "Speak naturally and conversationally but keep the conversation short and to the point."
)

# --- Twilio voice (TwiML say) ---
TWIML_GREETING_RETURNING_TEMPLATE = (
    "Welcome back, {client_name}. "
    "I can help with medicine orders. What do you need today?"
)
TWIML_GREETING_NEW_CALLER = (
    "Welcome to Medivoice A. I. voice assistant, "
    "I can help with medicine orders. What do you need today?"
)

# --- Realtime tool descriptions (shown to the model) ---
TOOL_VALIDATE_MEDICINE_ORDER_DESCRIPTION = (
    "Validate requested medicine names against the medicine catalog and stage them."
)
TOOL_PROP_MEDICINES_DESCRIPTION = "Medicine names requested by caller."

TOOL_SAVE_CONFIRMED_ORDER_DESCRIPTION = (
    "Store a confirmed order in database after caller explicitly confirms."
)
TOOL_PROP_MEDICINES_OVERRIDE_DESCRIPTION = "Optional override medicines for final order."
TOOL_PROP_ITEMS_DESCRIPTION = (
    "Order items (medicine_id + order_quantity). Accepts a dict or a list of dicts."
)

TOOL_END_CALL_DESCRIPTION = (
    "End the current call immediately when the caller says goodbye, exit, or end call."
)

TOOL_CHECK_ORDER_STATUS_DESCRIPTION = (
    "Check order status by order_id. If order_id is not provided, use caller's last_order."
)
TOOL_PROP_ORDER_ID_DESCRIPTION = (
    "Optional order ID. If missing, system uses client's last_order."
)

# --- Tool / handler messages returned to the model (JSON tool output) ---
MSG_VALIDATED_MEDICINES = "Validated medicines. Ask caller to confirm before placing order."
MSG_NO_ITEMS = "No items provided. Validate medicines first or provide items."
MSG_ORDER_VALIDATION_FAILED = "Order validation failed."
MSG_NO_VALID_ITEMS = "No valid items found to place an order."
MSG_ORDER_SAVED_SMS_SENT = (
    "Order saved successfully. An SMS with the payment link has been sent to your registered phone number."
)
MSG_ORDER_SAVED_SMS_FAILED = (
    "Order saved successfully. Payment link was created but SMS could not be sent; share the link if needed."
)
MSG_ORDER_SAVED = "Order saved successfully."

MSG_END_CALL = "Ending the call now. Goodbye."
MSG_NO_ORDER_ID_OR_LAST_ORDER = "No order_id provided and no last_order found for this client."
MSG_ORDER_NOT_FOUND = "Order not found."
MSG_ORDER_STATUS_OK = "Order status retrieved successfully."

MSG_UNSUPPORTED_TOOL_TEMPLATE = "Unsupported tool: {tool_name}"

# --- HTTP index ---
INDEX_PAGE_MESSAGE = "Twilio Media Stream Server is running!"

# --- End-call phrase detection (lowercase substring match) ---
END_CALL_PHRASES = ("bye", "goodbye", "exit", "end call")
