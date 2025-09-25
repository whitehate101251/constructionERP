import { RequestHandler } from "express";
import { Worker, ApiResponse } from "@shared/api";
import { getUserFromToken } from "./auth.js";
import { database } from "../database/connection.js";

export const handleCreateWorker: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== 'foreman') {
      const response: ApiResponse = { success: false, message: 'Unauthorized' };
      return res.status(401).json(response);
    }

    const { name, fatherName, designation, dailyWage, phone, aadhar } = req.body as Partial<Worker> & { dailyWage?: number };
    if (!name || !fatherName || typeof dailyWage !== 'number') {
      const response: ApiResponse = { success: false, message: 'Missing required fields' };
      return res.status(400).json(response);
    }

    const id = `worker_${Date.now()}`;
    const newWorker: Worker = {
      id,
      name,
      fatherName,
      designation: typeof designation === 'string' ? designation.trim() : "",
      dailyWage,
      siteId: user.siteId!,
      ...(phone ? { phone } : {}),
      ...(aadhar ? { aadhar } : {}),
    } as Worker;

    database.workers.push(newWorker);

    const response: ApiResponse<Worker> = { success: true, data: newWorker };
    return res.status(201).json(response);
  } catch (error) {
    console.error('Create worker error:', error);
    const response: ApiResponse = { success: false, message: 'Internal server error' };
    return res.status(500).json(response);
  }
};

export const handleUpdateWorker: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || (user.role !== 'foreman' && user.role !== 'admin')) {
      const response: ApiResponse = { success: false, message: 'Unauthorized' };
      return res.status(401).json(response);
    }
    const { id } = req.params as { id: string };
    const worker = database.workers.find(w => w.id === id);
    if (!worker || (user.role === 'foreman' && worker.siteId !== user.siteId)) {
      const response: ApiResponse = { success: false, message: 'Worker not found or access denied' };
      return res.status(404).json(response);
    }
    const { name, fatherName, designation, dailyWage, phone, aadhar } = req.body as Partial<Worker> & { dailyWage?: number };
    if (typeof name === 'string') worker.name = name;
    if (typeof fatherName === 'string') (worker as any).fatherName = fatherName;
    if (typeof designation === 'string') worker.designation = designation;
    if (typeof dailyWage === 'number') worker.dailyWage = dailyWage;
    if (typeof phone === 'string') (worker as any).phone = phone;
    if (typeof aadhar === 'string') (worker as any).aadhar = aadhar;
    const response: ApiResponse<Worker> = { success: true, data: worker };
    return res.json(response);
  } catch (error) {
    console.error('Update worker error:', error);
    const response: ApiResponse = { success: false, message: 'Internal server error' };
    return res.status(500).json(response);
  }
};

export const handleDeleteWorker: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || (user.role !== 'foreman' && user.role !== 'admin')) {
      const response: ApiResponse = { success: false, message: 'Unauthorized' };
      return res.status(401).json(response);
    }
    const { id } = req.params as { id: string };
    const index = database.workers.findIndex(w => w.id === id && (user.role === 'admin' || w.siteId === user.siteId));
    if (index === -1) {
      const response: ApiResponse = { success: false, message: 'Worker not found or access denied' };
      return res.status(404).json(response);
    }
    database.workers.splice(index, 1);
    const response: ApiResponse = { success: true };
    return res.json(response);
  } catch (error) {
    console.error('Delete worker error:', error);
    const response: ApiResponse = { success: false, message: 'Internal server error' };
    return res.status(500).json(response);
  }
};

export const handleGetWorkers: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    
    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: "Unauthorized",
      };
      return res.status(401).json(response);
    }

    const { siteId } = req.params;

    // Check if user has access to this site
    if (user.role === 'foreman' && user.siteId !== siteId) {
      const response: ApiResponse = {
        success: false,
        message: "Access denied to this site",
      };
      return res.status(403).json(response);
    }

    if (user.role === 'site_incharge' && user.siteId !== siteId) {
      const response: ApiResponse = {
        success: false,
        message: "Access denied to this site",
      };
      return res.status(403).json(response);
    }

    // Filter workers by site
    const siteWorkers = database.workers.filter(worker => worker.siteId === siteId);

    const response: ApiResponse<Worker[]> = {
      success: true,
      data: siteWorkers,
    };

    res.json(response);
  } catch (error) {
    console.error("Get workers error:", error);
    const response: ApiResponse = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};
