import { RequestHandler } from "express";
import { AttendanceRecord, AttendanceEntry, ApiResponse } from "@shared/api";
import { getUserFromToken } from "./auth.js";
import { database } from "../database/connection.js";

// Helper function to generate unique IDs
function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Mock sites data
const mockSites = {
  site_1: "Downtown Construction Site",
  site_2: "Highway Bridge Project",
  site_3: "Residential Complex",
};

export const handleSubmitAttendance: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);

    if (!user || user.role !== "foreman") {
      const response: ApiResponse = {
        success: false,
        message: "Unauthorized - Only foremen can submit attendance",
      };
      return res.status(401).json(response);
    }

    const {
      date,
      entries,
      inTime,
      outTime,
    }: {
      date: string;
      entries: AttendanceEntry[];
      inTime?: string;
      outTime?: string;
    } = req.body;

    // Validate input
    if (!date || !entries || !Array.isArray(entries)) {
      const response: ApiResponse = {
        success: false,
        message: "Invalid attendance data",
      };
      return res.status(400).json(response);
    }

    // Check if already submitted for this date
    const existingRecord = database.attendanceRecords.find(
      (r) => r.foremanId === user.id && r.date === date,
    );

    if (existingRecord) {
      const response: ApiResponse = {
        success: false,
        message: "Attendance already submitted for this date",
      };
      return res.status(400).json(response);
    }

    // Create attendance record
    const site = database.sites.find((s) => s.id === user.siteId);
    const attendanceRecord: AttendanceRecord = {
      id: generateId(),
      date,
      siteId: user.siteId!,
      siteName: site?.name || "Unknown Site",
      foremanId: user.id,
      foremanName: user.name,
      entries,
      status: "submitted",
      ...(inTime ? { inTime } : {}),
      ...(outTime ? { outTime } : {}),
      submittedAt: new Date(),
      totalWorkers: entries.length,
      presentWorkers: entries.filter((e) => e.isPresent).length,
      createdBy: user.id,
    };

    database.attendanceRecords.push(attendanceRecord);

    const response: ApiResponse<AttendanceRecord> = {
      success: true,
      data: attendanceRecord,
      message: "Attendance submitted successfully",
    };

    res.json(response);
  } catch (error) {
    console.error("Submit attendance error:", error);
    const response: ApiResponse = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};

export const handleSaveDraft: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);

    if (!user || user.role !== "foreman") {
      const response: ApiResponse = {
        success: false,
        message: "Unauthorized",
      };
      return res.status(401).json(response);
    }

    // For now, just return success (in production, save to database)
    const response: ApiResponse = {
      success: true,
      message: "Draft saved successfully",
    };

    res.json(response);
  } catch (error) {
    console.error("Save draft error:", error);
    const response: ApiResponse = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};

export const handleCheckSubmission: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);

    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: "Unauthorized",
      };
      return res.status(401).json(response);
    }

    const { date } = req.params;

    const hasSubmitted = database.attendanceRecords.some(
      (r) => r.foremanId === user.id && r.date === date,
    );

    const response: ApiResponse<boolean> = {
      success: true,
      data: hasSubmitted,
    };

    res.json(response);
  } catch (error) {
    console.error("Check submission error:", error);
    const response: ApiResponse = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};

export const handlePendingReview: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);

    if (!user || user.role !== "site_incharge") {
      const response: ApiResponse = {
        success: false,
        message: "Unauthorized - Only site incharges can review attendance",
      };
      return res.status(401).json(response);
    }

    // Get pending records for this site incharge's site
    const pendingRecords = database.attendanceRecords
      .filter((r) => r.siteId === user.siteId && r.status === "submitted")
      .map((r) => ({
        ...r,
        foremanName:
          database.users.find((u) => u.id === r.foremanId)?.name ||
          r.foremanName,
      }));

    const response: ApiResponse<AttendanceRecord[]> = {
      success: true,
      data: pendingRecords,
    };

    res.json(response);
  } catch (error) {
    console.error("Pending review error:", error);
    const response: ApiResponse = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};

export const handleReviewAttendance: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);

    if (!user || user.role !== "site_incharge") {
      const response: ApiResponse = {
        success: false,
        message: "Unauthorized",
      };
      return res.status(401).json(response);
    }

    const { id } = req.params;
    const {
      action,
      entries,
      inchargeComments,
      checkedEntries,
    }: {
      action: "approve" | "reject";
      entries: AttendanceEntry[];
      inchargeComments: string;
      checkedEntries: string[];
    } = req.body;

    const recordIndex = database.attendanceRecords.findIndex(
      (r) => r.id === id,
    );

    if (recordIndex === -1) {
      const response: ApiResponse = {
        success: false,
        message: "Attendance record not found",
      };
      return res.status(404).json(response);
    }

    const record = database.attendanceRecords[recordIndex];

    // Update the record
    record.entries = entries; // Updated entries with any edits
    record.inchargeComments = inchargeComments;
    record.reviewedAt = new Date();
    record.reviewedBy = user.id;
    record.status = action === "approve" ? "incharge_reviewed" : "rejected";

    database.attendanceRecords[recordIndex] = record;

    const response: ApiResponse = {
      success: true,
      message: `Attendance ${action}d successfully`,
    };

    res.json(response);
  } catch (error) {
    console.error("Review attendance error:", error);
    const response: ApiResponse = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};

export const handlePendingAdmin: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);

    if (!user || user.role !== "admin") {
      const response: ApiResponse = {
        success: false,
        message: "Unauthorized - Only admins can access this",
      };
      return res.status(401).json(response);
    }

    // Get records pending admin approval
    const pendingRecords = database.attendanceRecords
      .filter((r) => r.status === "incharge_reviewed")
      .map((r) => ({
        ...r,
        foremanName:
          database.users.find((u) => u.id === r.foremanId)?.name ||
          r.foremanName,
      }));

    const response: ApiResponse<AttendanceRecord[]> = {
      success: true,
      data: pendingRecords,
    };

    res.json(response);
  } catch (error) {
    console.error("Pending admin error:", error);
    const response: ApiResponse = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};

export const handleAdminApprove: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);

    if (!user || user.role !== "admin") {
      const response: ApiResponse = {
        success: false,
        message: "Unauthorized",
      };
      return res.status(401).json(response);
    }

    const { id } = req.params;
    const {
      action,
      adminComments,
    }: {
      action: "approve" | "reject";
      adminComments: string;
    } = req.body;

    const recordIndex = database.attendanceRecords.findIndex(
      (r) => r.id === id,
    );

    if (recordIndex === -1) {
      const response: ApiResponse = {
        success: false,
        message: "Attendance record not found",
      };
      return res.status(404).json(response);
    }

    const record = database.attendanceRecords[recordIndex];

    // Update the record
    record.adminComments = adminComments;
    record.approvedAt = new Date();
    record.approvedBy = user.id;
    record.status = action === "approve" ? "admin_approved" : "rejected";

    database.attendanceRecords[recordIndex] = record;

    const response: ApiResponse = {
      success: true,
      message: `Attendance ${action}d successfully`,
    };

    res.json(response);
  } catch (error) {
    console.error("Admin approve error:", error);
    const response: ApiResponse = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};

export const handleAdminUpdateAttendance: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== "admin") {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }
    const { id } = req.params as { id: string };
    const record = database.attendanceRecords.find((r) => r.id === id);
    if (!record) {
      const response: ApiResponse = {
        success: false,
        message: "Attendance record not found",
      };
      return res.status(404).json(response);
    }
    const { entries, inTime, outTime, date } =
      req.body as Partial<AttendanceRecord> & { entries?: AttendanceEntry[] };
    if (Array.isArray(entries)) {
      record.entries = entries as any;
      record.totalWorkers = entries.length;
      record.presentWorkers = entries.filter((e) => e.isPresent).length;
    }
    if (typeof inTime === "string" || inTime === null) {
      if (inTime === null) delete (record as any).inTime;
      else record.inTime = inTime;
    }
    if (typeof outTime === "string" || outTime === null) {
      if (outTime === null) delete (record as any).outTime;
      else record.outTime = outTime;
    }
    if (typeof date === "string") {
      record.date = date;
    }
    const response: ApiResponse<AttendanceRecord> = {
      success: true,
      data: record,
    };
    return res.json(response);
  } catch (error) {
    console.error("Admin update attendance error:", error);
    const response: ApiResponse = {
      success: false,
      message: "Internal server error",
    };
    return res.status(500).json(response);
  }
};

export const handleApprovedRecords: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);

    if (!user || user.role !== "admin") {
      const response: ApiResponse = {
        success: false,
        message: "Unauthorized",
      };
      return res.status(401).json(response);
    }

    // Get approved records
    const approvedRecords = database.attendanceRecords
      .filter((r) => r.status === "admin_approved")
      .sort(
        (a, b) =>
          new Date(b.approvedAt!).getTime() - new Date(a.approvedAt!).getTime(),
      )
      .slice(0, 20); // Last 20 approved records

    const response: ApiResponse<AttendanceRecord[]> = {
      success: true,
      data: approvedRecords,
    };

    res.json(response);
  } catch (error) {
    console.error("Approved records error:", error);
    const response: ApiResponse = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};

export const handleAttendanceByForeman: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);

    if (!user || user.role !== "admin") {
      const response: ApiResponse = {
        success: false,
        message: "Unauthorized - Only admins can access this",
      };
      return res.status(401).json(response);
    }

    const { foremanId } = req.params as { foremanId: string };

    const records = database.attendanceRecords
      .filter((r) => r.foremanId === foremanId)
      .map((r) => ({
        ...r,
        foremanName:
          database.users.find((u) => u.id === r.foremanId)?.name ||
          r.foremanName,
      }))
      .sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      );

    const response: ApiResponse<AttendanceRecord[]> = {
      success: true,
      data: records,
    };

    res.json(response);
  } catch (error) {
    console.error("Attendance by foreman error:", error);
    const response: ApiResponse = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};
