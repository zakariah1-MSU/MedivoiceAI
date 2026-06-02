import mongoose from "mongoose";

function getMongoUri(): string | undefined {
  let uri = process.env.MONGODB_URI;
  if (!uri) return undefined;
  uri = uri.trim();
  uri = uri.replace(/^export\s+\w+=["']?/, "").replace(/["']$/, "");
  uri = uri.trim();
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    console.error("MONGODB_URI does not look like a valid connection string. Got prefix:", uri.substring(0, 30));
    return undefined;
  }
  return uri;
}

const MONGODB_URI = getMongoUri();

if (!MONGODB_URI) {
  console.warn("MONGODB_URI not set or invalid. App running without database connection.");
}

let isConnected = false;

export function isMongoConnected() {
  return isConnected;
}

export async function connectMongoDB() {
  if (isConnected) return;
  if (!MONGODB_URI) return;

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

export { mongoose };
