import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../App";
import { AttendanceRecord } from "@shared/api";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { ApiResponse, Site, User } from "@shared/api";

export default function Sites() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [expandedSites, setExpandedSites] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [selectedForemanName, setSelectedForemanName] = useState<string>("");
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});

  const siteIncharges = useMemo(
    () => users.filter((u) => u.role === "site_incharge"),
    [users],
  );
  const foremen = useMemo(
    () => users.filter((u) => u.role === "foreman"),
    [users],
  );

  useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem("auth_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const load = async () => {
      const [u, s] = await Promise.all([
        fetch(`https://erp-backend-lm5c.onrender.com/api/admin/users`, { headers }).then(
          (r) => r.json() as Promise<ApiResponse<User[]>>,
        ),
        fetch(`https://erp-backend-lm5c.onrender.com/api/sites`, { headers }).then(
          (r) => r.json() as Promise<ApiResponse<Site[]>>,
        ),
      ]);
      if (u.success && u.data) setUsers(u.data);
      if (s.success && s.data) setSites(s.data);
    };
    load();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-600">Only admins can view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-600">
          Browse sites and view attendance per foreman
        </p>
      </div>

      <div className="max-w-md">
        <input
          placeholder="Search sites..."
          className="border rounded-md h-10 px-3 w-full"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
          <CardDescription>
            Tap a site to expand and view foremen; click a foreman to view
            attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sites.length === 0 ? (
            <div className="text-gray-500">No sites found.</div>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-2 p-3 text-sm text-gray-600 bg-muted/50 rounded-t-md">
                <div className="col-span-3">Site Incharge</div>
                <div className="col-span-3">Name</div>
                <div className="col-span-4">Location</div>
                <div className="col-span-2">Total Foremen</div>
              </div>
              <Accordion
                type="multiple"
                value={expandedSites}
                onValueChange={(v) => setExpandedSites(v as string[])}
              >
                {sites
                  .filter((site) =>
                    site.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((site) => {
                    const incharge = siteIncharges.find(
                      (u) => u.id === site.inchargeId,
                    );
                    const siteForemen = foremen.filter(
                      (f) => f.siteId === site.id,
                    );
                    return (
                      <AccordionItem key={site.id} value={site.id}>
                        <AccordionTrigger
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem("auth_token");
                              const resPromises = siteForemen.map(async (f) => {
                                if (statusMap[f.id]) return;
                                const res = await fetch(`https://erp-backend-lm5c.onrender.com/api/attendance/foreman/${f.id}`,
                                  {
                                    headers: token
                                      ? { Authorization: `Bearer ${token}` }
                                      : {},
                                  },
                                );
                                const data: ApiResponse<AttendanceRecord[]> = await res.json();
                                let status = "attendance not taken";
                                if (
                                  data.success &&
                                  data.data &&
                                  data.data.length
                                ) {
                                  const latest = data.data[0];
                                  if (latest.status === "submitted")
                                    status = "attendance submitted";
                                  else if (
                                    latest.status === "incharge_reviewed"
                                  )
                                    status = "attendance not approved";
                                  else if (latest.status === "admin_approved")
                                    status = "approved";
                                  else if (latest.status === "rejected")
                                    status = "rejected";
                                }
                                setStatusMap((prev) => ({
                                  ...prev,
                                  [f.id]: status,
                                }));
                              });
                              await Promise.all(resPromises);
                            } catch {}
                          }}
                        >
                          <div className="grid grid-cols-12 gap-2 w-full text-left">
                            <div className="col-span-3 flex items-center gap-2">
                              <span className="font-medium">
                                {incharge?.name || "-"}
                              </span>
                            </div>
                            <div className="col-span-3 font-medium">
                              {site.name}
                            </div>
                            <div className="col-span-4 text-gray-600">
                              {site.location}
                            </div>
                            <div className="col-span-2">
                              {siteForemen.length}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="border rounded-md">
                            <div className="grid grid-cols-12 gap-2 p-3 text-sm text-gray-600 bg-muted/30">
                              <div className="col-span-6">Site Foremen</div>
                              <div className="col-span-6 text-right">
                                Status
                              </div>
                            </div>
                            <div className="p-3 space-y-2">
                              {siteForemen.length === 0 ? (
                                <div className="text-gray-500">
                                  No foremen assigned.
                                </div>
                              ) : (
                                siteForemen.map((f) => (
                                  <div
                                    key={f.id}
                                    className="grid grid-cols-12 items-center gap-2"
                                  >
                                    <div className="col-span-6 flex items-center gap-2">
                                      <div className="h-6 w-6 rounded-sm bg-gray-100 flex items-center justify-center text-xs">
                                        {f.name.charAt(0)}
                                      </div>
                                      <span className="font-medium">
                                        {f.name}
                                      </span>
                                    </div>
                                    <div className="col-span-4 text-right">
                                      <span className="text-xs px-2 py-1 rounded bg-muted">
                                        {statusMap[f.id] || "Loading..."}
                                      </span>
                                    </div>
                                    <div className="col-span-2 text-right">
                                      <button
                                        className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm"
                                        onClick={async () => {
                                          setSelectedRecord(null);
                                          setSelectedForemanName(f.name);
                                          setViewOpen(true);
                                          setViewLoading(true);
                                          try {
                                            const token =
                                              localStorage.getItem(
                                                "auth_token",
                                              );
                                            const res = await fetch(`https://erp-backend-lm5c.onrender.com/api/attendance/foreman/${f.id}`,
                                              {
                                                headers: token
                                                  ? {
                                                      Authorization: `Bearer ${token}`,
                                                    }
                                                  : {},
                                              },
                                            );
                                            const data: ApiResponse<AttendanceRecord[]> = await res.json();
                                            if (data.success && data.data) {
                                              const now = new Date();
                                              const startAnchor = new Date();
                                              startAnchor.setHours(5, 30, 0, 0);
                                              let windowStart = new Date(
                                                startAnchor,
                                              );
                                              if (now < startAnchor) {
                                                windowStart = new Date(
                                                  startAnchor.getTime() -
                                                    24 * 60 * 60 * 1000,
                                                );
                                              }
                                              const windowEnd = new Date(
                                                windowStart.getTime() +
                                                  24 * 60 * 60 * 1000,
                                              );
                                              const rec =
                                                data.data.find(
                                                  (r) =>
                                                    r.status ===
                                                      "admin_approved" &&
                                                    r.approvedAt &&
                                                    new Date(r.approvedAt) >=
                                                      windowStart &&
                                                    new Date(r.approvedAt) <
                                                      windowEnd,
                                                ) || null;
                                              setSelectedRecord(rec);
                                            }
                                          } finally {
                                            setViewLoading(false);
                                          }
                                        }}
                                      >
                                        View
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
              </Accordion>
            </>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-gray-600">Showing {sites.length} sites</div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attendance Details</DialogTitle>
            <DialogDescription>
              {selectedForemanName
                ? `Latest approved attendance for ${selectedForemanName} (last 24 hours window)`
                : "Latest approved attendance (last 24 hours window)"}
            </DialogDescription>
          </DialogHeader>

          {viewLoading ? (
            <div className="text-gray-500">Loading...</div>
          ) : !selectedRecord ? (
            <div className="text-gray-500">
              No approved attendance found in the current 24-hour window.
            </div>
          ) : (
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
                  <CardDescription>
                    Same format as submission and admin view
                  </CardDescription>
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
