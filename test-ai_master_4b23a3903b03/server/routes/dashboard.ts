import { RequestHandler } from "express";
import { DashboardStats, AttendanceRecord, ApiResponse } from "@shared/api";
import { getUserFromToken } from "./auth.js";
import { database } from "../database/connection.js";

// Generate mock dashboard stats
function generateMockStats(): DashboardStats {
  const today = new Date();
  const weeklyStats = [];
  
  // Generate last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    
    weeklyStats.push({
      day: dayName,
      present: Math.floor(Math.random() * 20) + 15, // 15-35 workers
      total: 35,
    });
  }

  return {
    totalSites: database.sites.length,
    totalWorkers: database.workers.length,
    pendingApprovals: database.attendanceRecords.filter(r =>
      r.status === 'submitted' || r.status === 'incharge_reviewed'
    ).length,
    todayAttendance: Math.floor(Math.random() * 25) + 20, // 20-45 workers
    weeklyStats,
  };
}

export const handleDashboardStats: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    
    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: "Unauthorized",
      };
      return res.status(401).json(response);
    }

    const stats = generateMockStats();
    
    const response: ApiResponse<DashboardStats> = {
      success: true,
      data: stats,
    };

    res.json(response);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    const response: ApiResponse = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};

export const handleRecentAttendance: RequestHandler = (req, res) => {
  try {
    const user = getUserFromToken(req.headers.authorization);
    
    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: "Unauthorized",
      };
      return res.status(401).json(response);
    }

    // Filter records based on user role
    let filteredRecords = [...database.attendanceRecords];

    if (user.role === 'foreman') {
      // Foremen dashboard should be cleared after submit
      filteredRecords = [];
    } else if (user.role === 'site_incharge') {
      // Site incharges see records from their site
      filteredRecords = database.attendanceRecords.filter(r => r.siteId === user.siteId);
    }
    // Admins see all records

    // Sort by most recent and limit to 10
    const recentRecords = filteredRecords
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 10);

    const response: ApiResponse<AttendanceRecord[]> = {
      success: true,
      data: recentRecords,
    };

    res.json(response);
  } catch (error) {
    console.error("Recent attendance error:", error);
    const response: ApiResponse = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};

// Note: attendanceRecords are now managed through the centralized database
