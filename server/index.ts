import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import dotenv from "dotenv";
import { initializeDatabase, getDatabase } from "./database/connection.js";
import { rateLimit, sanitizeInput, corsOptions } from "./middleware/security.js";
import { scheduleCleanup } from "./utils/cleanup.js";

// Import route handlers
import {
  handleLogin,
  handleUserAuth,
  handleChangePassword,
} from "./routes/auth.js";
import {
  handleDashboardStats,
  handleRecentAttendance,
} from "./routes/dashboard.js";
import {
  handleCreateUser,
  handleListUsers,
  handleUpdateUser,
  handleDeleteUser,
  handleCreateSite,
  handleListSites,
  handleUpdateSite,
  handleDeleteSite,
} from "./routes/admin.js";
import {
  handleSubmitAttendance,
  handleSaveDraft,
  handlePendingReview,
  handleReviewAttendance,
  handlePendingAdmin,
  handleAdminApprove,
  handleAdminUpdateAttendance,
  handleApprovedRecords,
  handleCheckSubmission,
  handleAttendanceByForeman,
} from "./routes/attendance.js";
import {
  handleGetWorkers,
  handleCreateWorker,
  handleUpdateWorker,
  handleDeleteWorker,
} from "./routes/workers.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isProduction = process.env.NODE_ENV === "production";

// Create Express app with all routes configured
export function createServer() {
  const app = express();
  // preflight
 app.use(cors(corsOptions)); // This handles all OPTIONS internally

// If you really need OPTIONS explicitly:
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});           // yaha pe end hogya
  // Security Middleware
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));
  app.use(sanitizeInput);
  app.use('/api/', rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

  // API Routes

  // Health check for Render
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Database test endpoint
  app.get("/api/test-db", async (req, res) => {
    try {
      console.log("Testing database connection...");
      const database = await getDatabase();
      const sitesCollection = database.sites;
      console.log("Got sites collection");

      const result = await sitesCollection.find({});
      console.log("Find result:", result);

      const sites = await result.toArray();
      console.log("Sites data:", sites);

      res.json({
        success: true,
        message: "Database test successful",
        count: sites.length,
        data: sites
      });
    } catch (error) {
      console.error("Database test error:", error);
      res.status(500).json({
        success: false,
        message: "Database test failed",
        error: error.message
      });
    }
  });

  // Authentication
  app.post("/api/auth/login", handleLogin);
  app.get("/api/auth/user", handleUserAuth);
  app.post("/api/auth/change-password", handleChangePassword);

  // Dashboard
  app.get("/api/dashboard/stats", handleDashboardStats);
  app.get("/api/attendance/recent", handleRecentAttendance);

  // Admin Management
  app.post("/api/admin/users", handleCreateUser);
  app.get("/api/admin/users", handleListUsers);
  app.put("/api/admin/users/:id", handleUpdateUser);
  app.delete("/api/admin/users/:id", handleDeleteUser);
  app.post("/api/sites", handleCreateSite);
  app.get("/api/sites", handleListSites);

  // Attendance Management
  app.post("/api/attendance/submit", handleSubmitAttendance);
  app.post("/api/attendance/save-draft", handleSaveDraft);
  app.get("/api/attendance/pending-review", handlePendingReview);
  app.post("/api/attendance/review/:id", handleReviewAttendance);
  app.get("/api/attendance/pending-admin", handlePendingAdmin);
  app.post("/api/attendance/admin-approve/:id", handleAdminApprove);
  app.put("/api/attendance/:id", handleAdminUpdateAttendance);
  app.get("/api/attendance/approved", handleApprovedRecords);
  app.get("/api/attendance/check/:date", handleCheckSubmission);
  app.get("/api/attendance/foreman/:foremanId", handleAttendanceByForeman);

  // Workers
  app.get("/api/workers/site/:siteId", handleGetWorkers);
  app.post("/api/workers", handleCreateWorker);
  app.put("/api/workers/:id", handleUpdateWorker);
  app.delete("/api/workers/:id", handleDeleteWorker);

  // Sites
  app.put("/api/sites/:id", handleUpdateSite);
  app.delete("/api/sites/:id", handleDeleteSite);

  return app;
}

// Main server setup for production and standalone running
async function startServer() {
  try {
    // Initialize database first
    await initializeDatabase();

    // Start cleanup scheduler (optional - uncomment to enable 40-day cleanup)
    // await scheduleCleanup();

    const app = createServer();

    // Production: API-only server (frontend is on Vercel)
    if (isProduction) {
      // Serve a simple message for root route
      app.get("/", (req, res) => {
        res.json({ 
          message: "ConstructERP API Server", 
          status: "running",
          frontend: "https://construction-erp-henna.vercel.app"
        });
      });
    } else {
      // Development: use Vite dev server (this is not used in Vite dev mode)
      // Vite will handle the frontend serving
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });

      app.use(vite.ssrFixStacktrace);
      app.use(vite.middlewares);
    }

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`🚀 ConstructERP Server running on port ${PORT}`);
      if (!isProduction) {
        console.log(`📱 Local: http://localhost:${PORT}`);
      }
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Only start server if this file is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((err) => {
    console.error("Error starting server:", err);
    process.exit(1);
  });
}
