import { RequestHandler } from "express";
import { ApiResponse } from "@shared/api";
import cors from "cors";

// Rate limiting store (in-memory for simplicity)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Simple rate limiting middleware
export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000): RequestHandler => {
  return (req, res, next) => {
    const clientId = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    const clientData = rateLimitStore.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      // Reset or initialize
      rateLimitStore.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      const response: ApiResponse = {
        success: false,
        message: "Too many requests. Please try again later."
      };
      return res.status(429).json(response);
    }
    
    clientData.count++;
    next();
  };
};

// Input validation middleware
export const validateRequired = (fields: string[]): RequestHandler => {
  return (req, res, next) => {
    const missing = fields.filter(field => !req.body[field]);
    
    if (missing.length > 0) {
      const response: ApiResponse = {
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      };
      return res.status(400).json(response);
    }
    
    next();
  };
};

// Sanitize input middleware
export const sanitizeInput: RequestHandler = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        // Basic XSS prevention
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .trim();
      }
    }
  }
  next();
};

// CORS configuration for production
// security.ts
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // ✅ Always allow if no origin (server-side / Postman)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'https://construction-erp-henna.vercel.app',
      'https://construction-joic96bc4-nomnoms-projects-a2cfdc41.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ];

    // ✅ Match exact OR any vercel.app subdomain
    if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    console.warn('❌ Blocked by CORS:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};
