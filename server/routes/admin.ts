import bcrypt from "bcryptjs";
import type { RequestHandler } from "express";
import { ApiResponse, CreateSiteRequest, CreateUserRequest, Site, User } from "@shared/api";
import { database } from "../database/connection.js";
import { getUserFromToken } from "./auth.js";

export const handleCreateUser: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || user.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const body: CreateUserRequest = req.body;
    const { role, name, fatherName, username, password, siteId } = body;

    if (!role || !name || !username || !password) {
      const response: ApiResponse = { success: false, message: "Missing required fields" };
      return res.status(400).json(response);
    }

    // Check if username already exists
    const usersCollection = await database.users();
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      const response: ApiResponse = { success: false, message: "Username already exists" };
      return res.status(400).json(response);
    }

    // ✅ Hash the password before saving
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username,
      role,
      name,
      fatherName,
      siteId,
      password_hash: hashedPassword, // ✅ save the hash
      createdAt: new Date(),
    };

    await usersCollection.insertOne(newUser);

    const response: ApiResponse<User> = { success: true, data: newUser };
    res.json(response);
  } catch (error) {
    console.error("Create user error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleListUsers: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || user.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const { role } = req.query;
    const usersCollection = await database.users();
    
    const query = role && typeof role === 'string' ? { role: role as "foreman" | "site_incharge" | "admin" } : {};
    const users = await usersCollection.find(query);

    const response: ApiResponse<User[]> = { success: true, data: users };
    res.json(response);
  } catch (error) {
    console.error("List users error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleUpdateUser: RequestHandler = async (req, res) => {
  try {
    const admin = await getUserFromToken(req.headers.authorization);
    if (!admin || admin.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const { id } = req.params;
    const usersCollection = await database.users();
    const user = await usersCollection.findOne({ id });
    
    if (!user) {
      const response: ApiResponse = { success: false, message: "User not found" };
      return res.status(404).json(response);
    }

    const { username, name, fatherName, siteId, incharge_id } = req.body;
    
    // Check if new username conflicts
    if (username && username !== user.username) {
      const existingUser = await usersCollection.findOne({ username });
      if (existingUser) {
        const response: ApiResponse = { success: false, message: "Username already exists" };
        return res.status(400).json(response);
      }
    }

    const updateData: Partial<User> = {};
    if (username) updateData.username = username;
    if (name) updateData.name = name;
    if (fatherName) updateData.fatherName = fatherName;
    if (siteId) updateData.siteId = siteId;
    if (incharge_id) updateData.incharge_id = incharge_id;

    await usersCollection.updateOne({ id }, { $set: updateData });
    
    const updatedUser = await usersCollection.findOne({ id });
    const response: ApiResponse<User> = { success: true, data: updatedUser! };
    res.json(response);
  } catch (error) {
    console.error("Update user error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleDeleteUser: RequestHandler = async (req, res) => {
  try {
    const admin = await getUserFromToken(req.headers.authorization);
    if (!admin || admin.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const { id } = req.params;
    const usersCollection = await database.users();
    const user = await usersCollection.findOne({ id });
    
    if (!user) {
      const response: ApiResponse = { success: false, message: "User not found" };
      return res.status(404).json(response);
    }

    await usersCollection.deleteOne({ id });

    // Update related records
    const sitesCollection = await database.sites();
    await sitesCollection.updateMany(
      { inchargeId: id },
      { $unset: { inchargeId: "", inchargeName: "" } }
    );

    const response: ApiResponse = { success: true, message: "User deleted successfully" };
    res.json(response);
  } catch (error) {
    console.error("Delete user error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleCreateSite: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || user.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const body: CreateSiteRequest = req.body;
    const { name, location, inchargeId } = body;

    if (!name || !location) {
      const response: ApiResponse = { success: false, message: "Missing required fields" };
      return res.status(400).json(response);
    }

    const usersCollection = await database.users();
    const inchargeUser = inchargeId ? await usersCollection.findOne({ id: inchargeId }) : undefined;
    
    if (inchargeId && !inchargeUser) {
      const response: ApiResponse = { success: false, message: "Incharge user not found" };
      return res.status(400).json(response);
    }

    const newSite: Site = {
      id: `site_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      location,
      inchargeId: inchargeId || "",
      inchargeName: inchargeUser?.name || "",
      isActive: true,
    };

    const sitesCollection = await database.sites();
    await sitesCollection.insertOne(newSite);

    const response: ApiResponse<Site> = { success: true, data: newSite };
    res.json(response);
  } catch (error) {
    console.error("Create site error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleListSites: RequestHandler = async (req, res) => {
  try {
    const sitesCollection = await database.sites();
    const result = await sitesCollection.find({});
    const sites = await result.toArray();
    
    const response: ApiResponse<Site[]> = { success: true, data: sites };
    res.json(response);
  } catch (error) {
    console.error("List sites error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleUpdateSite: RequestHandler = async (req, res) => {
  try {
    const admin = await getUserFromToken(req.headers.authorization);
    if (!admin || admin.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const { id } = req.params;
    const sitesCollection = await database.sites();
    const site = await sitesCollection.findOne({ id });
    
    if (!site) {
      const response: ApiResponse = { success: false, message: "Site not found" };
      return res.status(404).json(response);
    }

    const { name, location, inchargeId, isActive } = req.body;
    const updateData: Partial<Site> = {};
    
    if (name) updateData.name = name;
    if (location) updateData.location = location;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    
    if (inchargeId !== undefined) {
      if (inchargeId) {
        const usersCollection = await database.users();
        const newIncharge = await usersCollection.findOne({ id: inchargeId });
        if (!newIncharge) {
          const response: ApiResponse = { success: false, message: "Incharge user not found" };
          return res.status(400).json(response);
        }
        updateData.inchargeId = inchargeId;
        updateData.inchargeName = newIncharge.name;
      } else {
        updateData.inchargeId = "";
        updateData.inchargeName = "";
      }
    }

    await sitesCollection.updateOne({ id }, { $set: updateData });
    
    const updatedSite = await sitesCollection.findOne({ id });
    const response: ApiResponse<Site> = { success: true, data: updatedSite! };
    res.json(response);
  } catch (error) {
    console.error("Update site error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleDeleteSite: RequestHandler = async (req, res) => {
  try {
    const admin = await getUserFromToken(req.headers.authorization);
    if (!admin || admin.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const { id } = req.params;
    const sitesCollection = await database.sites();
    const site = await sitesCollection.findOne({ id });
    
    if (!site) {
      const response: ApiResponse = { success: false, message: "Site not found" };
      return res.status(404).json(response);
    }

    // Update related records
    const usersCollection = await database.users();
    await usersCollection.updateMany({ siteId: id }, { $unset: { siteId: "" } });

    const workersCollection = await database.workers();
    await workersCollection.deleteMany({ siteId: id });

    await sitesCollection.deleteOne({ id });

    const response: ApiResponse = { success: true, message: "Site deleted successfully" };
    res.json(response);
  } catch (error) {
    console.error("Delete site error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};
