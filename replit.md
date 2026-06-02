# MediVoice AI — Replit Project Guide

## Overview

MediVoice AI is a pharmacy intelligence platform split into **two separate portals** accessible from a landing page. It connects pharmacies and medicine dealers, handles AI-powered voice conversations, tracks orders, and manages inventory.

### Portal Architecture
- **Landing page** (`/`) — Portal selection screen with two cards
- **Dealer Portal** (`/dealer/*`) — For medicine dealers/distributors
  - Manage pharmacies, medicine catalogue, warehouse inventory, orders, offers
  - View all AI call logs
- **Pharmacist Portal** (`/pharmacy/*`) — For pharmacy staff
  - View pharmacy profile, browse medicine catalogue, track orders
  - Chat with MediVoice AI assistant in real-time
  - View personal call history

Key features:
- Landing page with portal selector
- Separate sidebars, layouts, and navigation per portal
- AI voice chat interface for pharmacists (text-based with OpenAI)
- Real MongoDB Atlas data across all pages
- Outbound call flow via Twilio + Raspberry Pi keyword detection

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React + Vite)

- **Framework**: React 18 with TypeScript, bundled with Vite
- **Routing**: `wouter` (lightweight client-side router)
- **State/Data fetching**: TanStack React Query — all API calls use a shared `queryClient` with a custom default query function that supports query-key-as-URL patterns and query params
- **UI components**: shadcn/ui (New York style) built on Radix UI primitives, styled with Tailwind CSS
- **Theme**: Custom CSS variable-based theming with dark mode support via a `ThemeProvider` context
- **Forms**: react-hook-form + @hookform/resolvers + zod validation
- **Voice/Audio**: Replit integration utilities in `client/replit_integrations/audio/` — handles recording (MediaRecorder API), PCM16 playback (AudioWorklet), and SSE streaming

Directory layout:
```
client/src/
  pages/           # Route-level page components
  components/      # App-level and shadcn/ui components
  hooks/           # Custom React hooks
  lib/             # queryClient, utils
```

### Backend (Express + Node.js)

- **Framework**: Express 5 with TypeScript, run via `tsx`
- **Primary database**: MongoDB Atlas via Mongoose (`server/db/mongoose.ts`)
  - Mongoose is used for all business data: pharmacies, dealers, medicines, inventory, conversations, stock requests, offers
  - Connection is optional at startup — the app degrades gracefully if `MONGODB_URI` is not set: list/read endpoints return empty arrays/objects, write endpoints return 503. Dashboard shows a banner prompting the user to add `MONGODB_URI`.
- **Secondary database**: PostgreSQL via Drizzle ORM
  - Used by the Replit AI integration layer (chat storage: conversations + messages tables)
  - Schema defined in `shared/models/chat.ts`, config in `drizzle.config.ts`
  - `drizzle-kit push` for schema management
- **AI integration**: OpenAI via `server/replit_integrations/` — modular chat, audio (voice/TTS/STT), image, and batch utilities
- **Build**: esbuild bundles the server to `dist/index.cjs`; Vite builds the client to `dist/public/`

Server entry: `server/index.ts` → `registerRoutes()` in `server/routes.ts`

### Data Models (Mongoose — Actual Atlas Schema)

These match the real MongoDB Atlas `medivoice_ai` database collection structure.

| Model | Collection | Key fields |
|---|---|---|
| Pharmacy | `pharmacists` | pharmacy_id, name, contact, location, language_preference, business_type, preferred_brands[], discount_tier (Gold/Silver/Bronze), last_order_date |
| Dealer | `dealers` | name, companyName, phone, isActive |
| Medicine | `Medicines` | medicine_id, name, category, manufacturer, price_per_unit, stock_quantity, expiry_date, discount, seasonal_demand[], description |
| Inventory | `Inventory` | inventory_id, medicine_id, medicine_name, stock_quantity, warehouse_location, status (in_stock/low_stock/out_of_stock), order_limit, next_restock_due |
| Conversation | `Live_Conversations` | pharmacy_name, pharmacist_text, ai_response, timestamp, transcript, summary, type, status |
| StockRequest | `Orders` | order_id, pharmacist_id, conversation_id, items[{medicine_name, quantity, unit_price}], total_amount, status (Pending/Processing/Delivered/Cancelled), payment_status, mode_of_payment, order_timestamp, delivery_date |
| Offer | `Offers` | offer_id, offer_name, description, valid_from, valid_to, applicable_medicines[], discount_percent, target_group, promotion_channel[], status |
| Personalization | `Personalization` | pharmacist_id, ... |
| Schedule | `Schedules` | pharmacist_id, next_execution, status, ... |

### API Structure

All routes are prefixed with `/api/`. Key endpoints:
- `GET /api/health` — MongoDB connection status
- `GET /api/stats` — Dashboard aggregate counts
- `GET/POST /api/pharmacies` — CRUD for pharmacies
- `GET/POST /api/dealers` — CRUD for dealers
- `GET/POST /api/medicines` — CRUD for medicines
- `GET/POST /api/inventory` — Inventory management
- `GET /api/conversations`, `GET /api/conversations/:id` — Conversation list and detail
- `GET/POST /api/stock-requests`, `PUT /api/stock-requests/:id/status` — Order lifecycle
- `GET/POST /api/offers` — Dealer offers

Note: The Replit AI integration (`server/replit_integrations/`) also registers routes for `/api/conversations` for the chat/voice subsystem — there is a naming conflict with the MongoDB-backed conversations in `server/routes.ts`. The main app routes in `routes.ts` take precedence as they are registered first.

### Shared Code

- `shared/schema.ts` — Basic Zod schema for `User` type
- `shared/models/chat.ts` — Drizzle table definitions for the AI chat subsystem (conversations + messages), exported for both server and client via `@shared/*` alias

## External Dependencies

### Databases
- **MongoDB Atlas** — Primary data store for all business entities. Requires `MONGODB_URI` environment variable.
- **PostgreSQL** — Used by the Drizzle-based AI chat integration. Requires `DATABASE_URL` environment variable. Schema pushed with `npm run db:push`.

### AI / OpenAI
- **OpenAI API** — Accessed via Replit AI Integrations proxy.
  - `AI_INTEGRATIONS_OPENAI_API_KEY` — API key
  - `AI_INTEGRATIONS_OPENAI_BASE_URL` — Base URL (Replit proxy)
  - Used for: chat completions, voice (TTS, STT), image generation, batch processing

### NPM Packages of Note
- `mongoose` — MongoDB ODM
- `drizzle-orm` + `drizzle-kit` — PostgreSQL ORM and migration tool
- `openai` — Official OpenAI SDK
- `express` v5 — Web server
- `@tanstack/react-query` — Client-side data fetching
- `wouter` — Lightweight React router
- `@radix-ui/*` + `shadcn/ui` — UI component primitives
- `tailwindcss` — Utility-first CSS
- `zod` — Schema validation (shared between client and server)
- `connect-pg-simple` — PostgreSQL session store (available but not confirmed active)
- `p-limit` + `p-retry` — Concurrency and retry logic for batch AI processing

### Replit-Specific
- `@replit/vite-plugin-runtime-error-modal` — Error overlay in dev
- `@replit/vite-plugin-cartographer` — Dev-only code navigation
- `@replit/vite-plugin-dev-banner` — Dev banner