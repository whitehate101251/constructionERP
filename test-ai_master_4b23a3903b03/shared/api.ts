// User roles and authentication
export interface User {
  id: string;
  username: string;
  role: "foreman" | "site_incharge" | "admin";
  name: string;
  fatherName?: string;
  email?: string;
  siteId?: string;
  createdAt: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Attendance system
export interface Worker {
  id: string;
  name: string;
  fatherName: string;
  designation: string;
  dailyWage: number;
  siteId: string;
  assignedForemanId?: string;
  phone?: string;
  aadhar?: string;
}

export interface AttendanceEntry {
  workerId: string;
  workerName: string;
  designation: string;
  isPresent: boolean;
  // Universal hours format X*(P=8)+Y
  formulaX?: number; // number of 8-hour periods
  formulaY?: number; // remaining hours (0-7)
  hoursWorked?: number; // derived: formulaX*8 + formulaY
  overtime?: number; // kept for compatibility if used elsewhere
  remarks?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  siteId: string;
  siteName: string;
  foremanId: string;
  foremanName: string;
  entries: AttendanceEntry[];
  status: "submitted" | "incharge_reviewed" | "admin_approved" | "rejected";
  submittedAt: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  inchargeComments?: string;
  adminComments?: string;
  inTime?: string;
  outTime?: string;
  totalWorkers: number;
  presentWorkers: number;
  createdBy: string;
  reviewedBy?: string;
  approvedBy?: string;
}

export interface Site {
  id: string;
  name: string;
  location: string;
  inchargeId: string;
  inchargeName: string;
  isActive: boolean;
}

// Admin/User management
export type UserRole = "foreman" | "site_incharge" | "admin";

export interface CreateUserRequest {
  role: Exclude<UserRole, "admin">; // admin creates only foreman or site_incharge
  name: string;
  fatherName?: string;
  username: string;
  password: string;
  siteId?: string; // optional assignment at creation
}

export interface CreateUserResponse {
  user: User;
}

export interface CreateWorkerRequest {
  name: string;
  fatherName: string;
  designation?: string;
  dailyWage: number;
  phone?: string;
  aadhar?: string;
}

export interface CreateSiteRequest {
  name: string;
  location: string;
  inchargeId?: string;
  foremanIds?: string[];
}

// API Responses
export interface AttendanceListResponse {
  records: AttendanceRecord[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DashboardStats {
  totalSites: number;
  totalWorkers: number;
  pendingApprovals: number;
  todayAttendance: number;
  weeklyStats: {
    day: string;
    present: number;
    total: number;
  }[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface DemoResponse {
  message: string;
}
