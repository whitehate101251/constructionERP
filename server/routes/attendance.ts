import type { RequestHandler } from "express";
import { ApiResponse, AttendanceRecord, AttendanceEntry } from "@shared/api";
import { database } from "../database/connection.js";
import { getUserFromToken } from "./auth.js";

export const handleSubmitAttendance: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || user.role !== "foreman") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const { date, entries, inTime, outTime } = req.body as {
      date: string;
      entries: AttendanceEntry[];
      inTime?: string;
      outTime?: string;
    };

    if (!date || !entries || entries.length === 0) {
      const response: ApiResponse = { success: false, message: "Missing required fields" };
      return res.status(400).json(response);
    }

    // Check if already submitted for this date
    const attendanceCollection = await database.attendanceRecords();
    const existingRecord = await attendanceCollection.findOne({
      foremanId: user.id,
      date: date,
    });

    if (existingRecord) {
      const response: ApiResponse = { success: false, message: "Attendance already submitted for this date" };
      return res.status(400).json(response);
    }

    const sitesCollection = await database.sites();
    const site = await sitesCollection.findOne({ id: user.siteId });

    const attendanceRecord: AttendanceRecord = {
      id: `attendance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date,
      siteId: user.siteId!,
      siteName: site?.name || "Unknown Site",
      foremanId: user.id,
      foremanName: user.name,
      entries,
      status: "submitted",
      submittedAt: new Date(),
      inTime,
      outTime,
      totalWorkers: entries.length,
      presentWorkers: entries.filter(e => e.isPresent).length,
      createdBy: user.id,
    };

    await attendanceCollection.insertOne(attendanceRecord);

    const response: ApiResponse<AttendanceRecord> = { success: true, data: attendanceRecord };
    res.json(response);
  } catch (error) {
    console.error("Submit attendance error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleSaveDraft: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || user.role !== "foreman") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    // For now, just return success (drafts could be stored separately)
    const response: ApiResponse = { success: true, message: "Draft saved successfully" };
    res.json(response);
  } catch (error) {
    console.error("Save draft error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleCheckSubmission: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || user.role !== "foreman") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const { date } = req.params;
    const attendanceCollection = await database.attendanceRecords();

    const hasSubmitted = await attendanceCollection.findOne({
      foremanId: user.id,
      date: date,
    });

    const response: ApiResponse<{ hasSubmitted: boolean }> = {
      success: true,
      data: { hasSubmitted: !!hasSubmitted }
    };
    res.json(response);
  } catch (error) {
    console.error("Check submission error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handlePendingReview: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || user.role !== "site_incharge") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const attendanceCollection = await database.attendanceRecords();
    const pendingRecords = await attendanceCollection
      .find({ siteId: user.siteId, status: "submitted" })
      .sort({ submittedAt: -1 })
      .toArray();

    const response: ApiResponse<AttendanceRecord[]> = { success: true, data: pendingRecords };
    res.json(response);
  } catch (error) {
    console.error("Pending review error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleReviewAttendance: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || user.role !== "site_incharge") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const { id } = req.params;
    const { entries, comments } = req.body as {
      entries: AttendanceEntry[];
      comments?: string;
    };

    if (!entries) {
      const response: ApiResponse = { success: false, message: "Missing entries" };
      return res.status(400).json(response);
    }

    const attendanceCollection = await database.attendanceRecords();
    const record = await attendanceCollection.findOne({ id });

    if (!record || record.siteId !== user.siteId) {
      const response: ApiResponse = { success: false, message: "Record not found" };
      return res.status(404).json(response);
    }

    const updateData = {
      entries,
      status: "incharge_reviewed" as const,
      reviewedAt: new Date(),
      reviewedBy: user.id,
      inchargeComments: comments,
      presentWorkers: entries.filter(e => e.isPresent).length,
    };

    await attendanceCollection.updateOne({ id }, { $set: updateData });

    const response: ApiResponse = { success: true, message: "Attendance reviewed successfully" };
    res.json(response);
  } catch (error) {
    console.error("Review attendance error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handlePendingAdmin: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || user.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const attendanceCollection = await database.attendanceRecords();
    const result = await attendanceCollection.find({ status: "incharge_reviewed" });
    const pendingRecords = await result.sort().limit(50).toArray();

    const response: ApiResponse<AttendanceRecord[]> = { success: true, data: pendingRecords };
    res.json(response);
  } catch (error) {
    console.error("Pending admin error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleAdminApprove: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || user.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const { id } = req.params;
    const { comments } = req.body as { comments?: string };

    const attendanceCollection = await database.attendanceRecords();
    const record = await attendanceCollection.findOne({ id });

    if (!record) {
      const response: ApiResponse = { success: false, message: "Record not found" };
      return res.status(404).json(response);
    }

    const updateData = {
      status: "admin_approved" as const,
      approvedAt: new Date(),
      approvedBy: user.id,
      adminComments: comments,
    };

    await attendanceCollection.updateOne({ id }, { $set: updateData });

    const response: ApiResponse = { success: true, message: "Attendance approved successfully" };
    res.json(response);
  } catch (error) {
    console.error("Admin approve error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleAdminUpdateAttendance: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || user.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const { id } = req.params;
    const attendanceCollection = await database.attendanceRecords();
    const record = await attendanceCollection.findOne({ id });

    if (!record) {
      const response: ApiResponse = { success: false, message: "Record not found" };
      return res.status(404).json(response);
    }

    const { entries, inTime, outTime, adminComments } = req.body;
    const updateData: any = {};

    if (entries) {
      updateData.entries = entries;
      updateData.presentWorkers = entries.filter((e: AttendanceEntry) => e.isPresent).length;
    }
    if (inTime) updateData.inTime = inTime;
    if (outTime) updateData.outTime = outTime;
    if (adminComments) updateData.adminComments = adminComments;

    await attendanceCollection.updateOne({ id }, { $set: updateData });

    const response: ApiResponse = { success: true, message: "Attendance updated successfully" };
    res.json(response);
  } catch (error) {
    console.error("Admin update attendance error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleApprovedRecords: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || user.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const attendanceCollection = await database.attendanceRecords();
    const result = await attendanceCollection.find({ status: "admin_approved" });
    const approvedRecords = await result.sort().limit(50).toArray();

    const response: ApiResponse<AttendanceRecord[]> = { success: true, data: approvedRecords };
    res.json(response);
  } catch (error) {
    console.error("Approved records error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleAttendanceByForeman: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || user.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const { foremanId } = req.params;
    const attendanceCollection = await database.attendanceRecords();

    const records = await attendanceCollection
      .find({ foremanId })
      .sort({ submittedAt: -1 })
      .toArray();

    const response: ApiResponse<AttendanceRecord[]> = { success: true, data: records };
    res.json(response);
  } catch (error) {
    console.error("Attendance by foreman error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};