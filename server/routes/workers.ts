import type { RequestHandler } from "express";
import { ApiResponse, CreateWorkerRequest, Worker } from "@shared/api";
import { database } from "../database/connection.js";
import { getUserFromToken } from "./auth.js";

export const handleCreateWorker: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || user.role !== 'foreman') {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const body: CreateWorkerRequest = req.body;
    const { name, fatherName, designation = "Helper", dailyWage, phone, aadhar } = body;

    if (!name || !fatherName || !dailyWage) {
      const response: ApiResponse = { success: false, message: "Missing required fields" };
      return res.status(400).json(response);
    }

    const newWorker: Worker = {
      id: `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      fatherName,
      designation,
      dailyWage,
      siteId: user.siteId!,
      phone,
      aadhar,
    };

    const workersCollection = await database.workers();
    await workersCollection.insertOne(newWorker);

    const response: ApiResponse<Worker> = { success: true, data: newWorker };
    res.json(response);
  } catch (error) {
    console.error("Create worker error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleUpdateWorker: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || (user.role !== 'foreman' && user.role !== 'admin')) {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const { id } = req.params;
    const workersCollection = await database.workers();
    const worker = await workersCollection.findOne({ id });
    
    if (!worker || (user.role === 'foreman' && worker.siteId !== user.siteId)) {
      const response: ApiResponse = { success: false, message: "Worker not found" };
      return res.status(404).json(response);
    }

    const { name, fatherName, designation, dailyWage, phone, aadhar } = req.body;
    const updateData: Partial<Worker> = {};
    
    if (name) updateData.name = name;
    if (fatherName) updateData.fatherName = fatherName;
    if (designation) updateData.designation = designation;
    if (dailyWage) updateData.dailyWage = dailyWage;
    if (phone) updateData.phone = phone;
    if (aadhar) updateData.aadhar = aadhar;

    await workersCollection.updateOne({ id }, { $set: updateData });
    
    const updatedWorker = await workersCollection.findOne({ id });
    const response: ApiResponse<Worker> = { success: true, data: updatedWorker! };
    res.json(response);
  } catch (error) {
    console.error("Update worker error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleDeleteWorker: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || (user.role !== 'foreman' && user.role !== 'admin')) {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const { id } = req.params;
    const workersCollection = await database.workers();
    
    const query = user.role === 'admin' 
      ? { id } 
      : { id, siteId: user.siteId };
    
    const result = await workersCollection.deleteOne(query);
    
    if (result.deletedCount === 0) {
      const response: ApiResponse = { success: false, message: "Worker not found" };
      return res.status(404).json(response);
    }

    const response: ApiResponse = { success: true, message: "Worker deleted successfully" };
    res.json(response);
  } catch (error) {
    console.error("Delete worker error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleGetWorkers: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const { siteId } = req.params;

    // Authorization checks
    if (user.role === 'foreman' && user.siteId !== siteId) {
      const response: ApiResponse = { success: false, message: "Access denied" };
      return res.status(403).json(response);
    }

    if (user.role === 'site_incharge' && user.siteId !== siteId) {
      const response: ApiResponse = { success: false, message: "Access denied" };
      return res.status(403).json(response);
    }

    const workersCollection = await database.workers();
    const siteWorkers = await workersCollection.find({ siteId }).toArray();

    const response: ApiResponse<Worker[]> = { success: true, data: siteWorkers };
    res.json(response);
  } catch (error) {
    console.error("Get workers error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};