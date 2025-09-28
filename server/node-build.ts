import { fileURLToPath } from "url";
import { dirname } from "path";
import { createServer } from "./index.js";
import express from "express";
import { initializeDatabase } from "./database/connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startProductionServer() {
  try {
    // Initialize database first
    await initializeDatabase();
    
    const app = createServer();
    const port = process.env.PORT || 3000;

    // 🔥 Frontend serving removed - handled by Vercel
    // API-only backend server
    
    // Handle 404 for non-API routes
    app.use((req: express.Request, res: express.Response) => {
      if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
        return res.status(404).json({ error: "API endpoint not found" });
      }
      // For non-API routes, return API info
      res.json({ 
        message: "ConstructERP API Server", 
        status: "running",
        frontend: "https://construction-erp-henna.vercel.app",
        api: "Use /api/* endpoints"
      });
    });

    app.listen(port, () => {
      console.log(`🚀 ConstructERP API Server running on port ${port}`);
      console.log(`🔧 API: http://localhost:${port}/api`);
      console.log(`📱 Frontend: https://construction-erp-henna.vercel.app`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("🛑 Received SIGTERM, shutting down gracefully");
      process.exit(0);
    });

    process.on("SIGINT", () => {
      console.log("🛑 Received SIGINT, shutting down gracefully");
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Failed to start production server:", error);
    process.exit(1);
  }
}

startProductionServer();
