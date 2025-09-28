import type { RequestHandler } from "express";
import { ApiResponse, DashboardStats, AttendanceRecord } from "@shared/api";
import { database } from "../database/connection.js";
import { getUserFromToken } from "./auth.js";

export const handleDashboardStats: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const sitesCollection = await database.sites();
    const workersCollection = await database.workers();
    const attendanceCollection = await database.attendanceRecords();

    const totalSites = await sitesCollection.countDocuments();
    const totalWorkers = await workersCollection.countDocuments();
    
    const pendingApprovals = await attendanceCollection.countDocuments({
      status: { $in: ["submitted", "incharge_reviewed"] }
    });

    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await attendanceCollection.countDocuments({ date: today });

    // Generate weekly stats (simplified)
    const weeklyStats = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        present: Math.floor(Math.random() * 50) + 10, // Mock data
        total: Math.floor(Math.random() * 60) + 40,   // Mock data
      };
    }).reverse();

    const stats: DashboardStats = {
      totalSites,
      totalWorkers,
      pendingApprovals,
      todayAttendance,
      weeklyStats,
    };

    const response: ApiResponse<DashboardStats> = { success: true, data: stats };
    res.json(response);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};

export const handleRecentAttendance: RequestHandler = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      const response: ApiResponse = { success: false, message: "Unauthorized" };
      return res.status(401).json(response);
    }

    const attendanceCollection = await database.attendanceRecords();
    let query = {};

    // Filter based on user role
    if (user.role === 'foreman') {
      query = { foremanId: user.id };
    } else if (user.role === 'site_incharge') {
      query = { siteId: user.siteId };
    }

    const result = await attendanceCollection.find(query);
    const recentRecords = await result.sort().limit(10).toArray();

    const response: ApiResponse<AttendanceRecord[]> = { success: true, data: recentRecords };
    res.json(response);
  } catch (error) {
    console.error("Recent attendance error:", error);
    const response: ApiResponse = { success: false, message: "Internal server error" };
    res.status(500).json(response);
  }
};