# MediV3 Setup Guide (Twilio + ngrok + OpenAI Realtime)

This guide explains how to set up and run the `main_twilio.py` voice assistant end-to-end on Windows, including:

- local Python environment
- MongoDB setup requirements
- Twilio phone/webhook setup
- ngrok tunneling for public HTTPS
- inbound and outbound call testing
- how the full system works during a call

## 1) What this project does

`MediV3` is a voice-first medicine ordering assistant.

When someone calls your Twilio number (or when you trigger an outbound call), Twilio streams the call audio to your FastAPI server. The server forwards audio to OpenAI Realtime (`gpt-realtime`) and sends generated speech back to the caller through Twilio.

During the conversation, the assistant can call local tools to:

- validate medicines against MongoDB `Medicines`
- save confirmed orders to MongoDB `Orders`
- check order status
- end the call

After an order is created, Stripe payment link generation + SMS sending is attempted (via existing project logic).

## 2) Prerequisites

- Windows 10/11
- Python `3.12+`
- Twilio account and a voice-capable Twilio phone number
- OpenAI API key with Realtime API access
- MongoDB (Atlas or local)
- ngrok account (free tier is enough for development)

############### Ngrok Setup ############################

- Install ngrok on Windows using Microsift Store Installer
- Run the following command to add your authtoken to the default ngrok.yml configuration file.
   ngrok config add-authtoken "auth token" (Get your auth token from dashboard.ngrok.com/get-started/setup/windows)
- In command line run command "ngrok http 8080"
   Here 8080 is the port number. you can change it if 8080 is consumed
- Go to your dev domain to see your app!

###################### Twilio Setup ############################

- Create Twilio account
- Go to Develop -> # Phone numbers -> Manage -> Active numbers
- Click on the active number
- Go to voice configuration
- In 'Configure with' select 'Webhook, TwiML bin, Function, Studio Flow, Proxy Service' from the drop down
- In 'A call comes in' select Webhook. 
- URL: (dev domain from nGrok) + '/twilio/incoming'
- HTTP: HTTP POST


## 3) Clone and install

From project root (`\Workspace\MediV3`):

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -U pip setuptools wheel
.\.venv\Scripts\python.exe -m pip install -e .
```

If PowerShell blocks activate scripts, either continue using `.\.venv\Scripts\python.exe` directly or run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## 4) Environment variables (`.env`)

Create or update `.env` in the project root with your own values:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-realtime

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
MONGODB_DB_NAME=medivoice_ai

# Will be set after ngrok starts
PUBLIC_BASE_URL=https://your-subdomain.ngrok-free.dev

STRIPE_API_KEY=your_stripe_secret_key
PORT=8000
TEMPERATURE=0.8
LOG_LEVEL=INFO
```

### Required collection names (from `db.py`)

The code expects these exact collections in `MONGODB_DB_NAME`:

- `Pharmacies`
- `Conversations`
- `Orders`
- `Medicines`

### Required medicine fields

Each document in `Medicines` should include:

- `medicine_id` (string)
- `name` (string)
- `price_per_unit` (number)
- `stock_quantity` (number)
- `discount` (number; percent)

## 5) Start the FastAPI server

Run from project root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main_twilio:app --host 0.0.0.0 --port 8000 --reload
```

Quick checks:

- `http://127.0.0.1:8000/health` -> `{"status":"ok"}`
- `http://127.0.0.1:8000/` -> service message

## 6) ngrok setup (required for Twilio webhooks)

Twilio cannot call `localhost` directly. You must expose your local server with HTTPS.

### Install + authenticate ngrok

```powershell
ngrok config add-authtoken <your_ngrok_authtoken>
```

### Start tunnel to local FastAPI port

```powershell
ngrok http 8000
```

Copy the HTTPS forwarding URL shown by ngrok, for example:

`https://abc12345.ngrok-free.dev`

Set/update in `.env`:

```env
PUBLIC_BASE_URL=https://abc12345.ngrok-free.dev
```

Note: `main_twilio.py` builds TwiML stream host from the incoming request host, so Twilio hitting the ngrok URL is enough for stream routing. `PUBLIC_BASE_URL` is still useful operationally when making requests and documenting webhook base URL.

## 7) Twilio setup

Open Twilio Console -> Phone Numbers -> Active numbers -> select your number.

Configure **Voice** webhook:

- **A call comes in**: `Webhook`
- **HTTP method**: `POST`
- **URL**: `https://<your-ngrok-domain>/twilio/incoming`

Optional status callback (if you want lifecycle logs):

- `https://<your-ngrok-domain>/twilio/status`

### Why this matters

- `/twilio/incoming` returns TwiML greeting + `<Connect><Stream>`
- Twilio then opens WebSocket to: `wss://<same-host>/media-stream`
- Your app bridges Twilio audio <-> OpenAI Realtime audio

## 8) Inbound call test

1. Ensure server is running on `8000`.
2. Ensure `ngrok http 8000` is running.
3. Ensure Twilio number webhook points to ngrok `/twilio/incoming`.
4. Call your Twilio number from any phone.

Expected behavior:

- greeting is spoken
- conversation continues naturally
- medicine validation/order flows trigger tools
- order data is written to MongoDB when confirmed

## 9) Outbound call test

The project supports app-triggered outbound calls via `POST /twilio/outgoing`.

Use PowerShell:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "https://<your-ngrok-domain>/twilio/outgoing" `
  -ContentType "application/json" `
  -Body '{"to":"+1XXXXXXXXXX"}'
```

Expected JSON success response:

- `ok: true`
- `call_sid`
- `to`
- `from` (your `TWILIO_PHONE_NUMBER`)

When the callee answers, Twilio requests `GET /twilio/outgoing` for TwiML and the same realtime media flow starts.

## 10) How the project works (end-to-end flow)

### A) Inbound flow

1. Caller dials your Twilio number.
2. Twilio sends webhook to `/twilio/incoming`.
3. App responds with TwiML:
   - personalized greeting (if `Pharmacies.contact` matches caller)
   - `<Connect><Stream>` to `/media-stream`
4. Twilio opens media stream WebSocket.
5. App opens OpenAI Realtime WebSocket and sends `session.update` with:
   - instructions (`prompts.py`)
   - tool schemas (`validate_medicine_order`, `save_confirmed_order`, `check_order_status`, `end_call`)
6. Audio is relayed both directions:
   - Twilio media -> OpenAI input buffer
   - OpenAI output audio delta -> Twilio media
7. If tool calls happen, app executes local logic and sends tool output back to Realtime API.
8. On end intent/tool, app terminates call and closes sockets.

### B) Order flow

1. Assistant validates medicine names against `Medicines`.
2. On confirmation, order save logic:
   - validates `medicine_id` and quantity
   - enforces stock limits
   - computes discounted totals
   - inserts into `Orders`
   - updates `Pharmacies.last_order`
3. Payment flow tries to:
   - generate Stripe payment link
   - send link via Twilio SMS
   - persist `payment_link` in order (when created)

### C) Order status flow

- If caller gives `order_id`, app checks `Orders`.
- If not provided, app uses `Pharmacies.last_order` fallback.

## 11) Useful endpoints

- `GET /` - service message
- `GET /health` - health check
- `GET/POST /twilio/incoming` - inbound call TwiML
- `GET /twilio/outgoing` - outbound answered-call TwiML
- `POST /twilio/outgoing` - start outbound call
- `GET/POST /twilio/status` - optional Twilio status callback
- `WS /media-stream` - Twilio/OpenAI realtime bridge

## 12) Logs and debugging

- App + uvicorn logs: `logs.log`
- Payment/SMS related logs: `stripe_payment.log`

If calls are not reaching your app:

1. verify ngrok is running and URL is current
2. verify Twilio webhook URL exactly matches current ngrok domain
3. verify `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
4. check `logs.log` for webhook and stream events

## 13) Common issues

### `uvicorn` not recognized

Use:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main_twilio:app --host 0.0.0.0 --port 8000 --reload
```

### Twilio webhook works but no audio conversation

- Confirm `/media-stream` is reachable as `wss://<ngrok-domain>/media-stream`
- Confirm your OpenAI key has Realtime access
- Check for websocket/auth errors in `logs.log`

### Outbound call request returns Twilio config error

- Ensure all are set in `.env` and app restarted:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER`

## 14) Security checklist (important)

- Do not commit real `.env` secrets.
- Rotate keys immediately if any secret was exposed.
- Restrict Twilio and Stripe credentials to least privilege where possible.
- Use HTTPS webhook URLs only (ngrok or production reverse proxy).
