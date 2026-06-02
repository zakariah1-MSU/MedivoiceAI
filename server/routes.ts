import type { Express } from "express";
import { createServer, type Server } from "http";
import { connectMongoDB, isMongoConnected, mongoose } from "./db/mongoose";
import { Pharmacy } from "./models/Pharmacy";
import { Dealer } from "./models/Dealer";
import { Medicine } from "./models/Medicine";
import { Inventory } from "./models/Inventory";
import { Conversation } from "./models/Conversation";
import { StockRequest } from "./models/StockRequest";
import { Offer } from "./models/Offer";
import { Personalization } from "./models/Personalization";
import { Schedule } from "./models/Schedule";
import { TriggerWord } from "./models/TriggerWord";
import twilio from "twilio";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID || "",
  process.env.TWILIO_AUTH_TOKEN || ""
);
function getOpenAI(): OpenAI {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured. Set OPENAI_API_KEY in your .env file.");
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

function normalizePhoneNumber(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.length === 10) return `+1${cleaned}`;
  return cleaned;
}

function buildKeywordCallReason(payload: {
  medicine?: string;
  intent?: string;
  summary?: string;
  transcript?: string;
}) {
  const medicine = String(payload.medicine || "").trim();
  const intent = String(payload.intent || "").trim().replace(/_/g, " ");
  const summary = String(payload.summary || "").trim();
  const transcript = String(payload.transcript || "").trim();

  const parts = [
    medicine ? `medicine mention: ${medicine}` : "",
    intent ? `intent: ${intent}` : "",
    summary || transcript ? `store conversation follow-up needed` : "",
  ].filter(Boolean);

  return parts.join(", ") || "store conversation follow-up";
}

async function findPharmacyRecord(payload: {
  pharmacyId?: string;
  pharmacyName?: string;
}) {
  const pharmacyId = String(payload.pharmacyId || "").trim();
  const pharmacyName = String(payload.pharmacyName || "").trim();

  console.log("[auto-call] pharmacy lookup start", {
    pharmacyId,
    pharmacyName,
  });

  if (pharmacyId) {
    if (mongoose.isValidObjectId(pharmacyId)) {
      const byObjectId = await Pharmacy.findById(pharmacyId).lean();
      if (byObjectId) {
        console.log("[auto-call] pharmacy found by _id", {
          pharmacyId,
          name: (byObjectId as any)?.name,
          contact: (byObjectId as any)?.contact,
        });
        return byObjectId;
      }
    }

    const byBusinessId = await Pharmacy.findOne({ pharmacy_id: pharmacyId }).lean();
    if (byBusinessId) {
      console.log("[auto-call] pharmacy found by pharmacy_id", {
        pharmacyId,
        name: (byBusinessId as any)?.name,
        contact: (byBusinessId as any)?.contact,
      });
      return byBusinessId;
    }
  }

  if (pharmacyName) {
    const escaped = pharmacyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const byName = await Pharmacy.findOne({
      name: { $regex: `^${escaped}$`, $options: "i" },
    }).lean();
    if (byName) {
      console.log("[auto-call] pharmacy found by name", {
        pharmacyName,
        contact: (byName as any)?.contact,
      });
      return byName;
    }
  }

  console.log("[auto-call] pharmacy lookup failed", {
    pharmacyId,
    pharmacyName,
  });
  return null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  connectMongoDB().catch(() => {});

  function requireMongo(res: any): boolean {
    if (!isMongoConnected()) {
      res.status(503).json({ error: "Database not connected. Please add MONGODB_URI to secrets." });
      return false;
    }
    return true;
  }

  async function placeKeywordFollowUpCall(payload: {
    pharmacyId?: string;
    pharmacyName?: string;
    medicine?: string;
    intent?: string;
    summary?: string;
    transcript?: string;
  }) {
    const twilio_sid = process.env.TWILIO_ACCOUNT_SID;
    const twilio_token = process.env.TWILIO_AUTH_TOKEN;
    const twilio_number = process.env.TWILIO_PHONE_NUMBER;

    console.log("[auto-call] placeKeywordFollowUpCall start", {
      pharmacyId: payload.pharmacyId,
      pharmacyName: payload.pharmacyName,
      medicine: payload.medicine,
      intent: payload.intent,
      hasSummary: !!payload.summary,
      hasTranscript: !!payload.transcript,
      hasTwilioSid: !!twilio_sid,
      hasTwilioToken: !!twilio_token,
      twilioNumber: twilio_number || "",
      baseUrl: process.env.BASE_URL || "",
    });

    if (!twilio_sid || !twilio_token || !twilio_number) {
      console.log("[auto-call] twilio config missing");
      return { ok: false, error: "Twilio not configured." };
    }

    const pharmacy: any = await findPharmacyRecord(payload);

    if (!pharmacy) {
      console.log("[auto-call] aborting because pharmacy was not found");
      return { ok: false, error: "Pharmacy not found for auto-call." };
    }

    const toNumber = normalizePhoneNumber((pharmacy as any).contact);
    if (!toNumber) {
      console.log("[auto-call] aborting because pharmacy contact is missing", {
        pharmacyName: (pharmacy as any)?.name,
        rawContact: (pharmacy as any)?.contact,
      });
      return { ok: false, error: "Pharmacy contact number is missing." };
    }

    const { default: twilioLib } = await import("twilio");
    const twilioClient = twilioLib(twilio_sid, twilio_token);
    const reason = buildKeywordCallReason(payload);
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      console.log("[auto-call] aborting because BASE_URL is missing");
      return { ok: false, error: "BASE_URL is required for outbound call webhooks." };
    }

    const outboundUrl = `${baseUrl}/api/twilio/outbound-script?reason=${encodeURIComponent(reason)}&pharmacyName=${encodeURIComponent((pharmacy as any).name || payload.pharmacyName || "Pharmacy")}&medicine=${encodeURIComponent(String(payload.medicine || ""))}&intent=${encodeURIComponent(String(payload.intent || ""))}&summary=${encodeURIComponent(String(payload.summary || ""))}`;

    console.log("[auto-call] creating twilio call", {
      to: toNumber,
      from: twilio_number,
      pharmacyName: (pharmacy as any).name || payload.pharmacyName || "Pharmacy",
      outboundUrl,
    });

    let call;
    try {
      call = await twilioClient.calls.create({
        to: toNumber,
        from: twilio_number,
        url: outboundUrl,
      });
    } catch (error: any) {
      console.error("[auto-call] twilio call create failed", {
        message: error?.message || "Unknown error",
        code: error?.code,
        status: error?.status,
        moreInfo: error?.moreInfo,
      });
      return {
        ok: false,
        error: error?.message || "Twilio failed to create outbound call.",
      };
    }

    console.log("[auto-call] twilio call created", {
      callSid: call.sid,
      to: toNumber,
    });

    const conversation = new Conversation({
      pharmacy_name: (pharmacy as any).name || payload.pharmacyName || "Pharmacy",
      timestamp: new Date(),
      type: "outbound",
      status: "initiated",
      call_sid: call.sid,
      pharmacist_text: payload.transcript || "",
      ai_response: payload.summary || `Outbound call started for ${reason}.`,
    });
    await conversation.save();

    return {
      ok: true,
      callSid: call.sid,
      pharmacyName: (pharmacy as any).name || payload.pharmacyName || "Pharmacy",
      to: toNumber,
      conversationId: conversation._id,
      pharmacyId: String((pharmacy as any)._id || ""),
    };
  }

  // ─── HEALTH CHECK ──────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", mongoConnected: isMongoConnected() });
  });

  // ─── DEBUG: LIST COLLECTIONS ─────────────────────────────────────
  app.get("/api/debug/collections", async (_req, res) => {
    if (!isMongoConnected()) return res.status(503).json({ error: "Not connected" });
    try {
      const { mongoose } = await import("./db/mongoose");
      const collections = await mongoose.connection.db!.listCollections().toArray();
      const result: Record<string, number> = {};
      for (const col of collections) {
        const count = await mongoose.connection.db!.collection(col.name).countDocuments();
        result[col.name] = count;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/debug/sample", async (req, res) => {
    if (!isMongoConnected()) return res.status(503).json({ error: "Not connected" });
    const col = req.query.col as string;
    if (!col) return res.status(400).json({ error: "col param required" });
    try {
      const { mongoose } = await import("./db/mongoose");
      const docs = await mongoose.connection.db!.collection(col).find({}).limit(2).toArray();
      res.json(docs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── DASHBOARD STATS ───────────────────────────────────────────────
  app.get("/api/stats", async (req, res) => {
    if (!isMongoConnected()) {
      return res.json({ pharmacies: 0, dealers: 0, conversations: 0, pendingOrders: 0, lowStock: 0, offers: 0, recentCalls: [], ordersByStatus: {}, inventoryByStatus: {}, topPharmacies: [] });
    }
    try {
      const [pharmacies, dealers, conversations, pendingOrders, offers] = await Promise.all([
        Pharmacy.countDocuments({}),
        Dealer.countDocuments({}),
        Conversation.countDocuments({}),
        StockRequest.countDocuments({ status: "Pending" }),
        Offer.countDocuments({ status: "Active" }),
      ]);
      const lowStock = await Inventory.countDocuments({ status: { $in: ["low_stock", "out_of_stock"] } });

      const [recentCalls, orderStatusAgg, inventoryStatusAgg, pharmacyCallAgg] = await Promise.all([
        Conversation.find({}).sort({ timestamp: -1 }).limit(5).lean(),
        StockRequest.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Inventory.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Conversation.aggregate([
          { $group: { _id: "$pharmacy_name", count: { $sum: 1 } } },
          { $match: { _id: { $ne: null } } },
          { $sort: { count: -1 } },
          { $limit: 6 },
        ]),
      ]);

      const ordersByStatus: Record<string, number> = {};
      for (const r of orderStatusAgg) if (r._id) ordersByStatus[r._id] = r.count;

      const inventoryByStatus: Record<string, number> = {};
      for (const r of inventoryStatusAgg) if (r._id) inventoryByStatus[r._id] = r.count;

      const topPharmacies = pharmacyCallAgg.map((r: any) => ({ name: r._id, count: r.count }));

      res.json({ pharmacies, dealers, conversations, pendingOrders, lowStock, offers, recentCalls, ordersByStatus, inventoryByStatus, topPharmacies });
    } catch (err) {
      console.error("Stats error:", err);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ─── PHARMACIES (collection: pharmacists) ───────────────────────────
  app.get("/api/pharmacies", async (req, res) => {
    if (!isMongoConnected()) return res.json([]);
    try {
      const { search } = req.query;
      const filter: any = search ? { $or: [{ name: { $regex: search, $options: "i" } }, { location: { $regex: search, $options: "i" } }] } : {};
      const pharmacies = await Pharmacy.find(filter).sort({ name: 1 }).lean();
      res.json(pharmacies);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch pharmacies" });
    }
  });

  app.get("/api/pharmacies/:id", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const pharmacy = await Pharmacy.findById(req.params.id).lean();
      if (!pharmacy) return res.status(404).json({ error: "Pharmacy not found" });
      res.json(pharmacy);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch pharmacy" });
    }
  });

  app.post("/api/pharmacies", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const pharmacy = new Pharmacy(req.body);
      await pharmacy.save();
      res.status(201).json(pharmacy);
    } catch (err) {
      res.status(400).json({ error: "Failed to create pharmacy" });
    }
  });

  app.put("/api/pharmacies/:id", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const pharmacy = await Pharmacy.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!pharmacy) return res.status(404).json({ error: "Pharmacy not found" });
      res.json(pharmacy);
    } catch (err) {
      res.status(400).json({ error: "Failed to update pharmacy" });
    }
  });

  // ─── DEALERS ────────────────────────────────────────────────────────
  app.get("/api/dealers", async (req, res) => {
    if (!isMongoConnected()) return res.json([]);
    try {
      const dealers = await Dealer.find({ isActive: true }).sort({ createdAt: -1 }).lean();
      res.json(dealers);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch dealers" });
    }
  });

  app.get("/api/dealers/:id", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const dealer = await Dealer.findById(req.params.id).lean();
      if (!dealer) return res.status(404).json({ error: "Dealer not found" });
      res.json(dealer);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch dealer" });
    }
  });

  app.post("/api/dealers", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const dealer = new Dealer(req.body);
      await dealer.save();
      res.status(201).json(dealer);
    } catch (err) {
      res.status(400).json({ error: "Failed to create dealer" });
    }
  });

  app.put("/api/dealers/:id", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const dealer = await Dealer.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!dealer) return res.status(404).json({ error: "Dealer not found" });
      res.json(dealer);
    } catch (err) {
      res.status(400).json({ error: "Failed to update dealer" });
    }
  });

  // ─── MEDICINES (collection: Medicines) ──────────────────────────────
  app.get("/api/medicines", async (req, res) => {
    if (!isMongoConnected()) return res.json([]);
    try {
      const { search, category } = req.query;
      const filter: any = {};
      if (search) filter.name = { $regex: search, $options: "i" };
      if (category) filter.category = category;
      const medicines = await Medicine.find(filter).sort({ name: 1 }).lean();
      res.json(medicines);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch medicines" });
    }
  });

  app.post("/api/medicines", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const medicine = new Medicine(req.body);
      await medicine.save();
      res.status(201).json(medicine);
    } catch (err) {
      res.status(400).json({ error: "Failed to create medicine" });
    }
  });

  app.put("/api/medicines/:id", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!medicine) return res.status(404).json({ error: "Medicine not found" });
      res.json(medicine);
    } catch (err) {
      res.status(400).json({ error: "Failed to update medicine" });
    }
  });

  // ─── INVENTORY (collection: Inventory — dealer warehouse stock) ──────
  app.get("/api/inventory", async (req, res) => {
    if (!isMongoConnected()) return res.json([]);
    try {
      const { search, status } = req.query;
      const filter: any = {};
      if (search) filter.medicine_name = { $regex: search, $options: "i" };
      if (status) filter.status = status;
      const inventory = await Inventory.find(filter).sort({ medicine_name: 1 }).lean();
      res.json(inventory);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/low-stock", async (req, res) => {
    if (!isMongoConnected()) return res.json([]);
    try {
      const items = await Inventory.find({ status: { $in: ["low_stock", "out_of_stock"] } })
        .sort({ stock_quantity: 1 })
        .lean();
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch low stock items" });
    }
  });

  app.post("/api/inventory", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const item = new Inventory(req.body);
      await item.save();
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ error: "Failed to create inventory item" });
    }
  });

  app.put("/api/inventory/:id", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!item) return res.status(404).json({ error: "Inventory item not found" });
      res.json(item);
    } catch (err) {
      res.status(400).json({ error: "Failed to update inventory" });
    }
  });

  // ─── CONVERSATIONS (collection: Live_Conversations) ──────────────────
  app.get("/api/conversations", async (req, res) => {
    if (!isMongoConnected()) return res.json({ conversations: [], total: 0, page: 1, totalPages: 0 });
    try {
      const { pharmacy, type, page = 1, limit = 20 } = req.query;
      const filter: any = {};
      if (pharmacy) filter.pharmacy_name = { $regex: pharmacy, $options: "i" };
      if (type && type !== "all") filter.type = type;
      const skip = (Number(page) - 1) * Number(limit);
      const [conversations, total] = await Promise.all([
        Conversation.find(filter)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(Number(limit))
          .select("-audio_bytes")
          .lean(),
        Conversation.countDocuments(filter),
      ]);
      res.json({ conversations, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const conversation = await Conversation.findById(req.params.id).select("-audio_bytes").lean();
      if (!conversation) return res.status(404).json({ error: "Conversation not found" });
      res.json(conversation);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const conversation = new Conversation(req.body);
      await conversation.save();
      res.status(201).json(conversation);
    } catch (err) {
      res.status(400).json({ error: "Failed to create conversation" });
    }
  });

  // ─── ORDERS (collection: Orders) ─────────────────────────────────────
  app.get("/api/stock-requests", async (req, res) => {
    if (!isMongoConnected()) return res.json([]);
    try {
      const { status, pharmacist_id } = req.query;
      const filter: any = {};
      if (status) filter.status = status;
      if (pharmacist_id) filter.pharmacist_id = pharmacist_id;
      const requests = await StockRequest.find(filter).sort({ order_timestamp: -1 }).lean();
      res.json(requests);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/stock-requests/:id", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const request = await StockRequest.findById(req.params.id).lean();
      if (!request) return res.status(404).json({ error: "Order not found" });
      res.json(request);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.post("/api/stock-requests", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const request = new StockRequest(req.body);
      await request.save();
      res.status(201).json(request);
    } catch (err) {
      res.status(400).json({ error: "Failed to create order" });
    }
  });

  app.put("/api/stock-requests/:id/status", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const { status } = req.body;
      const request = await StockRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
      if (!request) return res.status(404).json({ error: "Order not found" });
      res.json(request);
    } catch (err) {
      res.status(400).json({ error: "Failed to update order" });
    }
  });

  // ─── OFFERS (collection: Offers) ─────────────────────────────────────
  app.get("/api/offers", async (req, res) => {
    if (!isMongoConnected()) return res.json([]);
    try {
      const { status } = req.query;
      const filter: any = status ? { status } : {};
      const offers = await Offer.find(filter).sort({ valid_from: -1 }).lean();
      res.json(offers);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch offers" });
    }
  });

  app.post("/api/offers", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const offer = new Offer(req.body);
      await offer.save();
      res.status(201).json(offer);
    } catch (err) {
      res.status(400).json({ error: "Failed to create offer" });
    }
  });

  app.put("/api/offers/:id", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!offer) return res.status(404).json({ error: "Offer not found" });
      res.json(offer);
    } catch (err) {
      res.status(400).json({ error: "Failed to update offer" });
    }
  });

  // ─── PERSONALIZATION ─────────────────────────────────────────────────
  app.get("/api/personalization", async (req, res) => {
    if (!isMongoConnected()) return res.json([]);
    try {
      const { pharmacist_id } = req.query;
      const filter = pharmacist_id ? { pharmacist_id } : {};
      const data = await Personalization.find(filter).lean();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch personalization data" });
    }
  });

  app.get("/api/personalization/:pharmacist_id", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const data = await Personalization.findOne({ pharmacist_id: req.params.pharmacist_id }).lean();
      if (!data) return res.status(404).json({ error: "Personalization not found" });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch personalization" });
    }
  });

  // ─── SCHEDULES ────────────────────────────────────────────────────────
  app.get("/api/schedules", async (req, res) => {
    if (!isMongoConnected()) return res.json([]);
    try {
      const { pharmacist_id, status } = req.query;
      const filter: any = {};
      if (pharmacist_id) filter.pharmacist_id = pharmacist_id;
      if (status) filter.status = status;
      const schedules = await Schedule.find(filter).sort({ next_execution: 1 }).lean();
      res.json(schedules);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  app.post("/api/schedules", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const schedule = new Schedule(req.body);
      await schedule.save();
      res.status(201).json(schedule);
    } catch (err) {
      res.status(400).json({ error: "Failed to create schedule" });
    }
  });

  // ─── TRIGGER WORDS ────────────────────────────────────────────────────
app.get("/api/trigger-words", async (req, res) => {
  if (!requireMongo(res)) return;
  try {
    const page   = parseInt(req.query.page as string)  || 1;
    const limit  = parseInt(req.query.limit as string) || 50;
    const intent = req.query.intent as string;
    const search = req.query.search as string;

    const filter: any = {};
    if (intent) filter.intent = intent;
    if (search) {
      filter.$or = [
        { medicine:      { $regex: search, $options: "i" } },
        { summary:       { $regex: search, $options: "i" } },
        { transcript:    { $regex: search, $options: "i" } },
        { pharmacy_name: { $regex: search, $options: "i" } },
      ];
    }

    const total = await TriggerWord.countDocuments(filter);
    const items = await TriggerWord.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

  app.post("/api/trigger-words", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const {
        pharmacyId,
        pharmacy_id,
        pharmacyName,
        pharmacy_name,
        medicine,
        intent,
        summary,
        transcript,
        language,
        source,
        autoCall = true,
      } = req.body || {};

      console.log("[trigger-words] incoming payload", {
        pharmacyId,
        pharmacy_id,
        pharmacyName,
        pharmacy_name,
        medicine,
        intent,
        source,
        language,
        autoCall,
      });

      const resolvedPharmacyId = String(pharmacyId || pharmacy_id || "").trim();
      const resolvedPharmacyName = String(pharmacyName || pharmacy_name || "").trim();

      if (!resolvedPharmacyId && !resolvedPharmacyName) {
        return res.status(400).json({ error: "pharmacyId or pharmacyName is required." });
      }

      const pharmacy: any = await findPharmacyRecord({
        pharmacyId: resolvedPharmacyId,
        pharmacyName: resolvedPharmacyName,
      });

      const triggerWord = await new TriggerWord({
        pharmacy_id: String((pharmacy as any)?.pharmacy_id || (pharmacy as any)?._id || resolvedPharmacyId || "").trim() || undefined,
        pharmacy_name: String((pharmacy as any)?.name || resolvedPharmacyName || "").trim() || undefined,
        medicine: String(medicine || "").trim() || undefined,
        intent: String(intent || "").trim() || undefined,
        summary: String(summary || "").trim() || undefined,
        transcript: String(transcript || "").trim() || undefined,
        language: String(language || "").trim() || "en",
        source: String(source || "").trim() || "raspberry_pi",
        created_at: new Date(),
      }).save();

      let autoCallResult: any = {
        ok: false,
        skipped: true,
        error: "Auto-call disabled.",
      };

      if (autoCall !== false) {
        try {
          autoCallResult = await placeKeywordFollowUpCall({
            pharmacyId: String((pharmacy as any)?._id || resolvedPharmacyId || ""),
            pharmacyName: String((pharmacy as any)?.name || resolvedPharmacyName || ""),
            medicine,
            intent,
            summary,
            transcript,
          });
        } catch (err: any) {
          autoCallResult = {
            ok: false,
            error: err.message || "Failed to start owner follow-up call.",
          };
        }
      }

      if (autoCallResult.ok) {
        await TriggerWord.findByIdAndUpdate(triggerWord._id, {
          auto_call_status: "initiated",
          auto_call_sid: autoCallResult.callSid,
          auto_call_to: autoCallResult.to,
          auto_call_conversation_id: autoCallResult.conversationId,
          call_triggered_at: new Date(),
        });
      } else {
        await TriggerWord.findByIdAndUpdate(triggerWord._id, {
          auto_call_status: autoCallResult.skipped ? "skipped" : "failed",
          auto_call_error: autoCallResult.error || "",
        });
      }

      const saved = await TriggerWord.findById(triggerWord._id).lean();
      console.log("[trigger-words] stored trigger word result", {
        id: String(triggerWord._id),
        autoCallResult,
      });
      res.status(201).json({
        success: true,
        item: saved,
        autoCall: autoCallResult,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to store trigger word." });
    }
  });

  app.post("/api/store-trigger", async (req, res) => {
    if (!requireMongo(res)) return;
    try {
      const {
        pharmacyId,
        pharmacy_id,
        pharmacyName,
        pharmacy_name,
        keyword,
        medicine,
        intent,
        summary,
        transcript,
        text,
        source,
        language,
        autoCall = true,
      } = req.body || {};

      console.log("[store-trigger] incoming payload", {
        pharmacyId,
        pharmacy_id,
        pharmacyName,
        pharmacy_name,
        keyword,
        medicine,
        intent,
        source,
        language,
        autoCall,
      });

      const resolvedMedicine = String(medicine || keyword || "").trim();
      const resolvedTranscript = String(transcript || text || "").trim();
      const resolvedPharmacyId = String(pharmacyId || pharmacy_id || "").trim();
      const resolvedPharmacyName = String(pharmacyName || pharmacy_name || "").trim();

      if (!resolvedPharmacyId && !resolvedPharmacyName) {
        return res.status(400).json({ error: "pharmacyId or pharmacyName is required." });
      }

      const pharmacy: any = await findPharmacyRecord({
        pharmacyId: resolvedPharmacyId,
        pharmacyName: resolvedPharmacyName,
      });

      const triggerWord = await new TriggerWord({
        pharmacy_id: String((pharmacy as any)?.pharmacy_id || (pharmacy as any)?._id || resolvedPharmacyId || "").trim() || undefined,
        pharmacy_name: String((pharmacy as any)?.name || resolvedPharmacyName || "").trim() || undefined,
        medicine: resolvedMedicine || undefined,
        intent: String(intent || "customer_request").trim(),
        summary: String(summary || "").trim() || undefined,
        transcript: resolvedTranscript || undefined,
        language: String(language || "en").trim(),
        source: String(source || "raspberry_pi").trim(),
        created_at: new Date(),
      }).save();

      let autoCallResult: any = {
        ok: false,
        skipped: true,
        error: "Auto-call disabled.",
      };

      if (autoCall !== false) {
        try {
          autoCallResult = await placeKeywordFollowUpCall({
            pharmacyId: resolvedPharmacyId,
            pharmacyName: String((pharmacy as any)?.name || resolvedPharmacyName || ""),
            medicine: resolvedMedicine,
            intent: String(intent || "customer_request").trim(),
            summary: String(summary || "").trim(),
            transcript: resolvedTranscript,
          });
        } catch (err: any) {
          autoCallResult = {
            ok: false,
            error: err.message || "Failed to start owner follow-up call.",
          };
        }
      }

      if (autoCallResult.ok) {
        await TriggerWord.findByIdAndUpdate(triggerWord._id, {
          pharmacy_id: String((pharmacy as any)?.pharmacy_id || autoCallResult.pharmacyId || resolvedPharmacyId || "").trim() || undefined,
          pharmacy_name: autoCallResult.pharmacyName || (pharmacy as any)?.name || resolvedPharmacyName || undefined,
          auto_call_status: "initiated",
          auto_call_sid: autoCallResult.callSid,
          auto_call_to: autoCallResult.to,
          auto_call_conversation_id: autoCallResult.conversationId,
          call_triggered_at: new Date(),
        });
      } else {
        await TriggerWord.findByIdAndUpdate(triggerWord._id, {
          auto_call_status: autoCallResult.skipped ? "skipped" : "failed",
          auto_call_error: autoCallResult.error || "",
        });
      }

      const saved = await TriggerWord.findById(triggerWord._id).lean();
      console.log("[store-trigger] stored trigger result", {
        id: String(triggerWord._id),
        autoCallResult,
      });
      res.status(201).json({
        success: true,
        item: saved,
        autoCall: autoCallResult,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to store trigger event." });
    }
  });

  // ─── TWILIO STATUS ────────────────────────────────────────────────────
  app.get("/api/twilio/status", (_req, res) => {
    const configured = !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    );
    res.json({
      configured,
      phoneNumber: configured ? process.env.TWILIO_PHONE_NUMBER : null,
    });
  });

  // ─── AI CHAT (Inbound call simulation) ──────────────────────────────
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, pharmacyId, conversationHistory = [] } = req.body;

      let pharmacy = null;
      if (pharmacyId) {
        pharmacy = await Pharmacy.findById(pharmacyId).populate("dealerId").lean();
      }

      const p = pharmacy as any;
      const systemPrompt = pharmacy
        ? `You are MediVoice AI, a friendly and professional pharmacy assistant bot. You are talking to ${p.name} pharmacy located in ${p.location || "your area"}. Their discount tier is ${p.discount_tier || "Standard"}. Preferred brands: ${(p.preferred_brands || []).join(", ") || "any"}. You help with stock checks, medicine inquiries, and reorder requests. Be concise and helpful. If they mention low stock or reorder needs, ask for specific medicine names and quantities.`
        : `You are MediVoice AI, a pharmacy assistant bot. Help pharmacists with stock inquiries, medicine availability, and reorder requests. Be concise and friendly.`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...conversationHistory,
        { role: "user" as const, content: message },
      ];

      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 300,
      });

      const reply = response.choices[0]?.message?.content || "I'm here to help. Could you please repeat that?";
      res.json({ reply, usage: response.usage });
    } catch (err) {
      console.error("AI chat error:", err);
      res.status(500).json({ error: "AI service unavailable" });
    }
  });

  // ─── TWILIO WEBHOOK (Inbound call handler) ───────────────────────────
  app.post("/api/twilio/inbound", async (req, res) => {
    const callerNumber = req.body?.From || "Unknown";

    // Try to find the pharmacy by contact number
    let pharmacyName = "Caller";
    try {
      const pharmacy = await Pharmacy.findOne({ contact: callerNumber }).lean() as any;
      if (pharmacy) pharmacyName = pharmacy.name;
    } catch {}

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Welcome to MediVoice AI. Hello ${pharmacyName}! I can help you with stock availability, medicine pricing, and active promotional offers. Please describe your requirements after the beep.</Say>
  <Record maxLength="45" action="${baseUrl}/api/twilio/process-recording" transcribe="true" transcribeCallback="${baseUrl}/api/twilio/transcription" playBeep="true" />
</Response>`;
    res.type("text/xml").send(twiml);
  });

  app.post("/api/twilio/process-recording", async (req, res) => {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you! I have received your request and our team will process it shortly. You will receive a confirmation. Goodbye!</Say>
  <Hangup />
</Response>`;
    res.type("text/xml").send(twiml);
  });

  // ─── TWILIO TRANSCRIPTION CALLBACK ────────────────────────────────────
  app.post("/api/twilio/transcription", async (req, res) => {
    try {
      const { TranscriptionText, From, CallSid } = req.body;
      if (!TranscriptionText) return res.sendStatus(200);

      // Look up pharmacy by caller number
      let pharmacyName = From || "Unknown Caller";
      let pharmacyId: string | null = null;
      try {
        const pharmacy = await Pharmacy.findOne({ contact: From }).lean() as any;
        if (pharmacy) { pharmacyName = pharmacy.name; pharmacyId = String(pharmacy._id); }
      } catch {}

      // Generate AI response to the transcribed speech
      let aiResponse = "Thank you for your request. We will process it shortly.";
      try {
        const medicines = await Medicine.find({ stock_quantity: { $gt: 0 } }).select("name price_per_unit stock_quantity discount").limit(10).lean() as any[];
        const offers = await Offer.find({ status: "Active" }).select("offer_name discount_percent target_group").limit(5).lean() as any[];
        const medicineList = medicines.map((m: any) => `${m.name} ($${m.price_per_unit}, ${m.stock_quantity} units${m.discount ? `, ${m.discount}% off` : ""})`).join("; ");
        const offerList = offers.map((o: any) => `${o.offer_name}: ${o.discount_percent}% off`).join("; ");

        const completion = await getOpenAI().chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are MediVoice AI. A pharmacist just called and said: "${TranscriptionText}". Reply in 1-2 sentences addressing their request. Available stock: ${medicineList}. Active offers: ${offerList}. Be helpful and specific.`
            },
            { role: "user", content: TranscriptionText }
          ],
          max_tokens: 200,
        });
        aiResponse = completion.choices[0]?.message?.content || aiResponse;
      } catch (err) {
        console.error("AI transcription response error:", err);
      }

      // Save the conversation to MongoDB
      if (isMongoConnected()) {
        const conversation = new Conversation({
          pharmacy_name: pharmacyName,
          pharmacist_text: TranscriptionText,
          ai_response: aiResponse,
          timestamp: new Date(),
          type: "inbound",
          call_sid: CallSid,
          status: "transcribed",
        });
        await conversation.save();
      }

      res.sendStatus(200);
    } catch (err) {
      console.error("Transcription callback error:", err);
      res.sendStatus(200);
    }
  });

  // ─── OUTBOUND CALL TRIGGER ───────────────────────────────────────────
  app.post("/api/twilio/outbound", async (req, res) => {
    try {
      const { pharmacyId, reason, to: directNumber, pharmacyName: directName } = req.body;
      const twilio_sid = process.env.TWILIO_ACCOUNT_SID;
      const twilio_token = process.env.TWILIO_AUTH_TOKEN;
      const twilio_number = process.env.TWILIO_PHONE_NUMBER;

      if (!twilio_sid || !twilio_token || !twilio_number) {
        return res.status(503).json({ error: "Twilio not configured." });
      }

      let toNumber = directNumber;
      let resolvedName = directName || "Pharmacist";

      if (!toNumber && pharmacyId) {
        const pharmacy = await Pharmacy.findById(pharmacyId);
        if (!pharmacy) return res.status(404).json({ error: "Pharmacy not found" });
        toNumber = (pharmacy as any).contact;
        resolvedName = (pharmacy as any).name;
      }

      if (!toNumber) return res.status(400).json({ error: "No phone number provided." });

      const { default: twilioLib } = await import("twilio");
      const twilio = twilioLib(twilio_sid, twilio_token);

      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
      const call = await twilio.calls.create({
        to: toNumber,
        from: twilio_number,
        url: `${baseUrl}/api/twilio/outbound-script?reason=${encodeURIComponent(reason || "stock check and medicine enquiry")}&pharmacyName=${encodeURIComponent(resolvedName)}`,
      });

      const conversation = new Conversation({
        pharmacy_name: resolvedName,
        timestamp: new Date(),
        type: "outbound",
        status: "initiated",
      });
      await conversation.save();

      res.json({ success: true, callSid: call.sid, conversationId: conversation._id });
    } catch (err: any) {
      console.error("Outbound call error:", err);
      res.status(500).json({ error: err.message || "Failed to initiate call" });
    }
  });

  app.get("/api/twilio/outbound-script", async (req, res) => {
    const { pharmacyName, reason, medicine, intent, summary } = req.query as Record<string, string>;
    const name = pharmacyName || "valued pharmacy";
    const followUpDetails = [
      medicine ? `The medicine mentioned was ${medicine}.` : "",
      intent ? `The detected store intent was ${intent.replace(/_/g, " ")}.` : "",
      summary ? `Store summary: ${summary}.` : "",
    ].filter(Boolean).join(" ");
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! This is MediVoice AI, your automated pharmacy assistant. I am calling ${name} regarding a ${reason || "stock check and medicine enquiry"}. ${followUpDetails} Please tell me what order, stock check, or follow-up action you would like to place after the beep, and I will assist you right away.</Say>
  <Record maxLength="60" action="/api/twilio/process-recording" transcribe="true" transcribeCallback="/api/twilio/transcription" playBeep="true" />
</Response>`;
    res.type("text/xml").send(twiml);
  });

  // ─── SCHEDULE CALL ────────────────────────────────────────────
  app.post("/api/schedule-call", async (req, res) => {
    try {
      const { date, time, note, pharmacyName } = req.body;
      if (!date || !time) return res.status(400).json({ error: "date and time are required" });
      if (isMongoConnected()) {
        await new Conversation({
          pharmacy_name: pharmacyName || "Unknown",
          pharmacist_text: note || "Scheduled callback",
          ai_response: `Call scheduled for ${date} at ${time}.`,
          timestamp: new Date(),
          type: "scheduled",
          status: "scheduled",
        }).save();
      }
      res.json({ success: true, date, time });
    } catch (err) {
      console.error("Schedule call error:", err);
      res.status(500).json({ error: "Failed to schedule call" });
    }
  });

  // ─── SIMPLE TEST CALL ROUTE (ADDED) ───────────────────────────
app.post("/api/call", async (req, res) => {
  console.log("CALL API HIT");

  try {
    const call = await client.calls.create({
      to: "+12014928255", // your phone
      from: "+12015846019", // Twilio number
      url: "https://berta-triste-cason.ngrok-free.dev/twilio/incoming"
    });

    res.json({ success: true, sid: call.sid });
  } catch (error) {
    console.error("CALL ERROR:", error);
    res.status(500).json({ error: "Failed" });
  }
});
  return httpServer;
}
