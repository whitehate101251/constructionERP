import { RequestHandler } from "express";
import { LoginRequest, LoginResponse, User, ApiResponse } from "@shared/api";
import { database } from "../database/connection.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET || "dev-secret";

// Production-ready authentication - passwords stored in database

// Hash password utility
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password utility
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
function generateToken(payload: { id: string; username: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify JWT token
function verifyToken(token?: string): { id: string; username: string; role: string } | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.id && decoded.username && decoded.role) {
      return { id: decoded.id, username: decoded.username, role: decoded.role };
    }
  } catch (error) {
    console.error('Token verification failed:', error);
  }
  return null;
}

export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const { username, password }: LoginRequest = req.body;

    if (!username || !password) {
      const response: ApiResponse = {
        success: false,
        message: "Username and password are required",
      };
      return res.status(400).json(response);
    }

    // Find user by username
    const usersCollection = await database.users();
    const user = await usersCollection.findOne({ username });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: "Invalid username or password",
      };
      return res.status(401).json(response);
    }

    // Verify password against database hash
    const userWithPassword = user as User & { password_hash: string };
    if (!userWithPassword.password_hash) {
      const response: ApiResponse = {
        success: false,
        message: "Invalid username or password",
      };
      return res.status(401).json(response);
    }

    const isValidPassword = await verifyPassword(password, userWithPassword.password_hash);

    if (!isValidPassword) {
      const response: ApiResponse = {
        success: false,
        message: "Invalid username or password",
      };
      return res.status(401).json(response);
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role
    });

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

export const handleUserAuth: RequestHandler = async (req, res) => {
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

    const payload = verifyToken(token);
    if (!payload) {
      const response: ApiResponse = {
        success: false,
        message: "Invalid token",
      };
      return res.status(401).json(response);
    }

    // Find user in database
    const usersCollection = await database.users();
    const user = await usersCollection.findOne({ id: payload.id });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: "User not found",
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
export async function getUserFromToken(authHeader?: string): Promise<User | null> {
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  const payload = verifyToken(token);
  if (!payload) return null;

  const usersCollection = await database.users();
  return await usersCollection.findOne({ id: payload.id }) || null;
}

// Change password for logged-in user
export const handleChangePassword: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) {
      const response: ApiResponse = { success: false, message: "Missing required fields" };
      return res.status(400).json(response);
    }

    // Verify current password against database
    const userWithPassword = user as User & { password_hash: string };
    if (!userWithPassword.password_hash || !(await verifyPassword(currentPassword, userWithPassword.password_hash))) {
      const response: ApiResponse = { success: false, message: "Current password is incorrect" };
      return res.status(400).json(response);
    }

    if (newPassword.length < 4) {
      const response: ApiResponse = { success: false, message: "Password must be at least 4 characters" };
      return res.status(400).json(response);
    }

    // Hash new password and update in database
    const hashedPassword = await hashPassword(newPassword);
    const usersCollection = await database.users();
    await usersCollection.updateOne(
      { id: user.id },
      { $set: { password_hash: hashedPassword } }
    );

    const response: ApiResponse = { success: true, message: "Password updated successfully" };
    return res.json(response);
  } catch (error) {
    console.error("Change password error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    return res.status(500).json(response);
  }
};
