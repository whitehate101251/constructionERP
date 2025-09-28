import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { ApiResponse, AttendanceRecord, User } from "@shared/api";

export default function AttendanceRecords() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const url = new URL(window.location.href);
  const qpForemanId = url.searchParams.get("foremanId") || "";
  const qpForemanName = url.searchParams.get("name") || "";

  const [foremen, setForemen] = useState<User[]>([]);
  const [selectedForemanId, setSelectedForemanId] =
    useState<string>(qpForemanId);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(
    null,
  );

  useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem("auth_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`https://erp-backend-lm5c.onrender.com/api/admin/users?role=foreman`, { headers })
      .then((r) => r.json() as Promise<ApiResponse<User[]>>)
      .then((d) => {
        if (d.success && d.data) setForemen(d.data);
      });
  }, [isAdmin]);

  const selectedForemanName = useMemo(() => {
    if (qpForemanName) return qpForemanName;
    const f = foremen.find((x) => x.id === selectedForemanId);
    return f?.name || "";
  }, [qpForemanName, foremen, selectedForemanId]);

  const fetchRecords = async () => {
    if (!selectedForemanId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`https://erp-backend-lm5c.onrender.com/api/attendance/foreman/${selectedForemanId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data: ApiResponse<AttendanceRecord[]> = await res.json();
      if (data.success && data.data) {
        const now = new Date();
        const startAnchor = new Date();
        startAnchor.setHours(5, 30, 0, 0);
        let windowStart = new Date(startAnchor);
        if (now < startAnchor) {
          windowStart = new Date(startAnchor.getTime() - 24 * 60 * 60 * 1000);
        }
        const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
        const filtered = data.data
          .filter((r) => r.status === "admin_approved")
          .filter((r) => {
            const approvedAt = r.approvedAt
              ? new Date(r.approvedAt)
              : new Date(r.date);
            // older than current window, within last 40 days
            return approvedAt < windowStart && approvedAt >= fortyDaysAgo;
          })
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
        setRecords(filtered);
      } else {
        setRecords([]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1>
        <p className="text-gray-600">Only admins can view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1>
      <p className="text-gray-600">
        Pick a date and foreman to view attendance
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="foreman">Foreman</Label>
              <select
                id="foreman"
                className="border rounded-md h-10 px-3 w-full"
                value={selectedForemanId}
                onChange={(e) => setSelectedForemanId(e.target.value)}
              >
                <option value="">Select</option>
                {foremen.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Button
                className="mt-6"
                onClick={fetchRecords}
                disabled={!selectedForemanId || loading}
              >
                Fetch
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div>
          {records.length === 0 ? (
            <div className="text-gray-500">No records.</div>
          ) : (
            <div className="space-y-3">
              {records.map((rec) => (
                <button
                  key={rec.id}
                  className="w-full border rounded-md p-3 flex items-center justify-between hover:bg-muted/50 text-left"
                  onClick={() => {
                    setSelectedRecord(rec);
                    setViewOpen(true);
                  }}
                >
                  <div>
                    <div className="font-medium">
                      {new Date(rec.date).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {rec.presentWorkers}/{rec.totalWorkers} present •{" "}
                      {rec.siteName}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedForemanName}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attendance Details</DialogTitle>
            <DialogDescription>
              {selectedForemanName
                ? `Attendance for ${selectedForemanName}`
                : "Attendance Details"}
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">
                      {selectedRecord.totalWorkers}
                    </div>
                    <p className="text-sm text-gray-600">Total Workers</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedRecord.presentWorkers}
                    </div>
                    <p className="text-sm text-gray-600">Present</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">
                      {selectedRecord.inTime || "-"}
                    </div>
                    <p className="text-sm text-gray-600">In Time</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">
                      {selectedRecord.outTime || "-"}
                    </div>
                    <p className="text-sm text-gray-600">Out Time</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Attendance Table</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Worker Name</TableHead>
                          <TableHead>Designation</TableHead>
                          <TableHead className="w-40 relative px-4" colSpan={2}>
                            <div className="grid grid-cols-2 place-items-center h-8">
                              <span className="text-[13px]">X</span>
                              <span className="text-[13px]">Y</span>
                            </div>
                            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[14px] text-muted-foreground">
                              P
                            </span>
                          </TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRecord.entries.map((entry, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              {entry.isPresent ? (
                                <Badge
                                  variant="default"
                                  className="bg-green-100 text-green-800"
                                >
                                  Present
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="bg-red-100 text-red-800"
                                >
                                  Absent
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {entry.workerName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {entry.designation}
                              </Badge>
                            </TableCell>
                            <TableCell className="relative px-4" colSpan={2}>
                              <div className="grid grid-cols-2 place-items-center h-8">
                                <span>
                                  {entry.isPresent
                                    ? (entry.formulaX ??
                                        Math.floor(
                                          (entry.hoursWorked || 0) / 8,
                                        )) ||
                                      0
                                    : "-"}
                                </span>
                                <span>
                                  {entry.isPresent
                                    ? (entry.formulaY ??
                                        (entry.hoursWorked || 0) % 8) ||
                                      0
                                    : "-"}
                                </span>
                              </div>
                              <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[14px] text-muted-foreground">
                                P
                              </span>
                            </TableCell>
                            <TableCell>
                              {entry.isPresent
                                ? ((entry.formulaX ??
                                    Math.floor((entry.hoursWorked || 0) / 8)) ||
                                    0) *
                                    8 +
                                  ((entry.formulaY ??
                                    (entry.hoursWorked || 0) % 8) ||
                                    0)
                                : "-"}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {entry.remarks || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
