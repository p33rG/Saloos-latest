import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleGenerateVariations, uploadMiddleware } from "./routes/generate-variations";
import { handleImageDownload } from "./routes/download-image";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Image generation endpoint
  app.post("/api/generate-variations", uploadMiddleware, handleGenerateVariations);

  // Image download proxy endpoint
  app.get("/api/download-image", handleImageDownload);

  return app;
}
