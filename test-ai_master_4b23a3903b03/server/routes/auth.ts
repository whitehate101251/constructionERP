import { RequestHandler } from "express";
import { LoginRequest, LoginResponse, User, ApiResponse } from "@shared/api";
import { database } from "../database/connection.js";
import crypto from "crypto";

// Stateless auth using HMAC-signed tokens (suitable for serverless)
const SECRET = process.env.AUTH_SECRET || "dev-secret";

// In-memory password store keyed by username
export const userPasswords = new Map<string, string>([
  ["demo_foreman", "demo123"],
  ["demo_site_incharge", "demo123"],
  ["demo_admin", "demo123"],
]);

export function setUserPassword(username: string, password: string) {
  userPasswords.set(username, password);
}

function sign(payload: object): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(b64).digest("hex");
  return `${b64}.${sig}`;
}

function verify(token?: string): { id: string; username: string } | null {
  if (!token) return null;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(b64).digest("hex");
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
    if (payload && payload.id && payload.username) return payload;
  } catch {}
  return null;
}

export const handleLogin: RequestHandler = (req, res) => {
  try {
    const { username, password }: LoginRequest = req.body;

    // Find user by username
    const user = database.users.find(u => u.username === username);

    const expectedPassword = user ? userPasswords.get(user.username) ?? "demo123" : undefined;
    if (!user || expectedPassword !== password) {
      const response: ApiResponse = {
        success: false,
        message: "Invalid username or password",
      };
      return res.status(401).json(response);
    }

    // Generate token (stateless)
    const token = sign({ id: user.id, username: user.username });

    const response: ApiResponse<LoginResponse> = {
      success: true,
      data: {
        user,
        token,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Login error:", error);
    const response: ApiResponse = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};

export const handleUserAuth: RequestHandler = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: "No token provided",
      };
      return res.status(401).json(response);
    }

    const payload = verify(token);
    const user = payload ? database.users.find(u => u.id === payload.id) : undefined;

    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: "Invalid token",
      };
      return res.status(401).json(response);
    }

    const response: ApiResponse<User> = {
      success: true,
      data: user,
    };

    res.json(response);
  } catch (error) {
    console.error("Auth error:", error);
    const response: ApiResponse = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};

// Helper function to get user from request
export function getUserFromToken(authHeader?: string): User | null {
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  const payload = verify(token);
  if (!payload) return null;
  return database.users.find(u => u.id === payload.id) || null;
}

// Change password for logged-in user
export const handleChangePassword: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) {
      const response: ApiResponse = { success: false, message: "Missing required fields" };
      return res.status(400).json(response);
    }

    const existing = userPasswords.get(user.username) ?? "demo123";
    if (existing !== currentPassword) {
      const response: ApiResponse = { success: false, message: "Current password is incorrect" };
      return res.status(400).json(response);
    }

    if (newPassword.length < 4) {
      const response: ApiResponse = { success: false, message: "Password must be at least 4 characters" };
      return res.status(400).json(response);
    }

    setUserPassword(user.username, newPassword);

    const response: ApiResponse = { success: true, message: "Password updated successfully" };
    return res.json(response);
  } catch (error) {
    console.error("Change password error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    return res.status(500).json(response);
  }
};
