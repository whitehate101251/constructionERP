import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useAuth } from "../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Users,
  ClipboardList,
  CheckSquare,
  Shield,
  TrendingUp,
  Clock,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { DashboardStats, AttendanceRecord, ApiResponse } from "@shared/api";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isAdmin = user?.role === 'admin';

  const didFetchRef = useRef(false);
  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const [statsResponse, attendanceResponse] = await Promise.all([
        fetch("/api/dashboard/stats", { headers }),
        fetch("/api/attendance/recent", { headers }),
      ]);

      // Parse each response exactly once
      const [statsResult, attendanceResult] = await Promise.all([
        statsResponse.json() as Promise<ApiResponse<DashboardStats>>,
        attendanceResponse.json() as Promise<ApiResponse<AttendanceRecord[]>>,
      ]);

      if (statsResponse.status === 401 || attendanceResponse.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      if (statsResponse.ok && statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      } else if (!statsResponse.ok) {
        console.error("Stats request failed:", statsResult);
      }

      if (attendanceResponse.ok && attendanceResult.success && attendanceResult.data) {
        setRecentAttendance(attendanceResult.data);
      } else if (!attendanceResponse.ok) {
        console.error("Attendance request failed:", attendanceResult);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = isAdmin ? {
      submitted: { label: "Submitted", variant: "secondary" as const },
      incharge_reviewed: { label: "Reviewed", variant: "default" as const },
      admin_approved: { label: "Approved", variant: "default" as const },
      rejected: { label: "Rejected", variant: "destructive" as const },
    } : {
      submitted: { label: "जमा", variant: "secondary" as const },
      incharge_reviewed: { label: "समीक्षित", variant: "default" as const },
      admin_approved: { label: "स्वीकृत", variant: "default" as const },
      rejected: { label: "अस्वीकृत", variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.submitted;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getQuickActions = () => {
    switch (user?.role) {
      case "foreman":
        return (
          <div className="space-y-4">
            <Link to="/attendance/submit">
              <Button size="lg" className="w-full">
                <ClipboardList className="mr-2 h-5 w-5" />
                आज की हाज़िरी जमा करें
              </Button>
            </Link>
          </div>
        );

      case "site_incharge":
        return (
          <div className="space-y-4">
            <Link to="/attendance/review">
              <Button size="lg" className="w-full">
                <CheckSquare className="mr-2 h-5 w-5" />
                लंबित हाज़िरी की समीक्षा करें
              </Button>
            </Link>
            <Link to="/workers">
              <Button variant="outline" size="lg" className="w-full">
                <Users className="mr-2 h-5 w-5" />
                श्रमिक प्रबंधन
              </Button>
            </Link>
          </div>
        );

      case "admin":
        return (
          <div className="space-y-4">
            <Link to="/attendance/admin">
              <Button size="lg" className="w-full">
                <Shield className="mr-2 h-5 w-5" />
                Admin Approvals
              </Button>
            </Link>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/workers">
                <Button variant="outline" size="lg" className="w-full">
                  <Users className="mr-2 h-4 w-4" />
                  Workers
                </Button>
              </Link>
              <Link to="/sites">
                <Button variant="outline" size="lg" className="w-full">
                  <Building2 className="mr-2 h-4 w-4" />
                  Sites
                </Button>
              </Link>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">{isAdmin ? 'Loading dashboard...' : 'डैशबोर्ड लोड हो रहा है...'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAdmin ? `Welcome back, ${user?.name}!` : `वापसी पर स्वागत है, ${user?.name}!`}
        </h1>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{isAdmin ? 'Total Sites' : 'कुल साइटें'}</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSites}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{isAdmin ? 'Total Workers' : 'कुल श्रमिक'}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWorkers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{isAdmin ? 'Pending Approvals' : 'लंबित स्वीकृतियाँ'}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            </CardContent>
          </Card>

        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{isAdmin ? 'Quick Actions' : 'तुरंत क्रियाएँ'}</CardTitle>
            <CardDescription>{isAdmin ? 'Common tasks for your role' : 'आपकी भूमिका के सामान्य कार्य'}</CardDescription>
          </CardHeader>
          <CardContent>{getQuickActions()}</CardContent>
        </Card>

        {/* Recent Attendance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{isAdmin ? 'Recent Attendance Records' : 'हाल की हाज़िरी रिकॉर्ड'}</CardTitle>
            <CardDescription>{isAdmin ? 'Latest attendance submissions and their status' : 'नवीनतम जमा की गई हाज़िरी और उनकी स्थिति'}</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAttendance.length > 0 ? (
              <div className="space-y-4">
                {recentAttendance.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{record.siteName}</h4>
                      <p className="text-sm text-gray-600">
                        {isAdmin ? `By ${record.foremanName} • ${new Date(record.date).toLocaleDateString()}` : `द्वारा ${record.foremanName} • ${new Date(record.date).toLocaleDateString()}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {isAdmin ? `${record.presentWorkers}/${record.totalWorkers} workers present` : `${record.presentWorkers}/${record.totalWorkers} श्रमिक उपस्थित`}
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(record.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {isAdmin ? 'No recent attendance records found' : 'कोई हाल की हाज़िरी रिकॉर्ड नहीं मिला'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
