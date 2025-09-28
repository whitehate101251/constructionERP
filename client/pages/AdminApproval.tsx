import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../App";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Building2,
  Eye,
  FileText,
  TrendingUp,
} from "lucide-react";
import { AttendanceRecord, ApiResponse } from "@shared/api";
import { useToast } from "../components/ui/use-toast";

export default function AdminApproval() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingRecords, setPendingRecords] = useState<AttendanceRecord[]>([]);
  const [approvedRecords, setApprovedRecords] = useState<AttendanceRecord[]>(
    [],
  );
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(
    null,
  );
  const [adminComments, setAdminComments] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editableEntries, setEditableEntries] = useState<any[]>([]);
  const [editableInTime, setEditableInTime] = useState<string | undefined>(
    undefined,
  );
  const [editableOutTime, setEditableOutTime] = useState<string | undefined>(
    undefined,
  );

  const didFetchRef = useRef(false);

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    fetchAttendanceRecords();
  }, []);

  const fetchAttendanceRecords = async () => {
    try {
      const [pendingResponse, approvedResponse] = await Promise.all([
        fetch(`https://erp-backend-lm5c.onrender.com/api/attendance/pending-admin`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }),
        fetch(`https://erp-backend-lm5c.onrender.com/api/attendance/approved`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }),
      ]);

      const pendingResult: ApiResponse<AttendanceRecord[]> =
        await pendingResponse.json();
      const approvedResult: ApiResponse<AttendanceRecord[]> =
        await approvedResponse.json();

      if (pendingResult.success && pendingResult.data) {
        setPendingRecords(pendingResult.data);
      }

      if (approvedResult.success && approvedResult.data) {
        setApprovedRecords(approvedResult.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch attendance records",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openRecordForApproval = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setAdminComments("");
    setEditMode(false);
    setEditableEntries(record.entries.map((e) => ({ ...e })));
    setEditableInTime(record.inTime);
    setEditableOutTime(record.outTime);
  };

  const processRecord = async (action: "approve" | "reject") => {
    if (!selectedRecord) return;

    setIsProcessing(true);

    try {
      const response = await fetch(`https://erp-backend-lm5c.onrender.com/api/attendance/admin-approve/${selectedRecord.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
          body: JSON.stringify({
            action,
            adminComments,
          }),
        },
      );

      const result: ApiResponse = await response.json();

      if (result.success) {
        toast({
          title: action === "approve" ? "Approved" : "Rejected",
          description: `Attendance record has been ${action}d successfully`,
        });

        setSelectedRecord(null);
        setAdminComments("");
        fetchAttendanceRecords();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} attendance record`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      submitted: { label: "Submitted", variant: "secondary" as const },
      incharge_reviewed: {
        label: "Site Incharge Reviewed",
        variant: "default" as const,
      },
      admin_approved: { label: "Admin Approved", variant: "default" as const },
      rejected: { label: "Rejected", variant: "destructive" as const },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.submitted;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateTotalHours = (entries: any[]) => {
    return entries
      .filter((entry) => entry.isPresent)
      .reduce((total, entry) => {
        const x =
          (entry.formulaX ?? Math.floor((entry.hoursWorked || 0) / 8)) || 0;
        const y = (entry.formulaY ?? (entry.hoursWorked || 0) % 8) || 0;
        return total + (x * 8 + y);
      }, 0);
  };

  const AttendanceRecordCard = ({
    record,
    showActions = false,
  }: {
    record: AttendanceRecord;
    showActions?: boolean;
  }) => (
    <div className="p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <h4 className="font-medium">{record.siteName}</h4>
          {getStatusBadge(record.status)}
        </div>
        <div className="text-sm text-gray-500">
          {new Date(record.date).toLocaleDateString()}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
        <div>
          <p className="text-gray-600">Foreman</p>
          <p className="font-medium">{record.foremanName}</p>
        </div>
        <div>
          <p className="text-gray-600">Workers Present</p>
          <p className="font-medium">
            {record.presentWorkers}/{record.totalWorkers}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Total Hours</p>
          <p className="font-medium">
            {calculateTotalHours(record.entries)} hrs
          </p>
        </div>
        <div>
          <p className="text-gray-600">Submitted</p>
          <p className="font-medium">
            {new Date(record.submittedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {record.inchargeComments && (
        <div className="mb-3 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-gray-600 mb-1">Site Incharge Comments:</p>
          <p className="text-sm">{record.inchargeComments}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Dialog
          open={selectedRecord?.id === record.id}
          onOpenChange={(open) => {
            if (open) {
              openRecordForApproval(record);
            } else {
              setSelectedRecord(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant={showActions ? "default" : "outline"}>
              <Eye className="mr-2 h-4 w-4" />
              {showActions ? "Review & Approve" : "View Details"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="sr-only">Admin Approval</DialogTitle>
            <DialogHeader>
              <DialogTitle>Admin Approval - {record.siteName}</DialogTitle>
              <DialogDescription>
                Submitted by {record.foremanName} • Reviewed by Site Incharge •
                Date: {new Date(record.date).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>

            {selectedRecord && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
                      <div className="text-2xl font-bold text-blue-600">
                        {calculateTotalHours(selectedRecord.entries)}
                      </div>
                      <p className="text-sm text-gray-600">Total Hours</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {Math.round(
                          (selectedRecord.presentWorkers /
                            selectedRecord.totalWorkers) *
                            100,
                        )}
                        %
                      </div>
                      <p className="text-sm text-gray-600">Attendance Rate</p>
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

                {/* Workflow Status */}
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    This record has been reviewed and approved by the site
                    incharge. Final admin approval is required.
                  </AlertDescription>
                </Alert>

                {/* Site Incharge Comments */}
                {selectedRecord.inchargeComments && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Site Incharge Comments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700">
                        {selectedRecord.inchargeComments}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Attendance Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Details</CardTitle>
                    <CardDescription>
                      Date: {new Date(selectedRecord.date).toLocaleDateString()}
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
                            <TableHead
                              className="w-40 relative px-4"
                              colSpan={2}
                            >
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
                          {(editMode
                            ? editableEntries
                            : selectedRecord.entries
                          ).map((entry, index) => (
                            <TableRow key={index}>
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
                                {editMode ? (
                                  <div className="grid grid-cols-2 place-items-center h-8 gap-2">
                                    <input
                                      type="number"
                                      className="w-12 border rounded px-1 text-center"
                                      min={0}
                                      value={
                                        entry.formulaX ??
                                        (Math.floor(
                                          (entry.hoursWorked || 0) / 8,
                                        ) ||
                                          0)
                                      }
                                      onChange={(e) => {
                                        const val = parseInt(
                                          e.target.value || "0",
                                          10,
                                        );
                                        setEditableEntries((prev) =>
                                          prev.map((en, i) =>
                                            i === index
                                              ? {
                                                  ...en,
                                                  formulaX: isNaN(val)
                                                    ? 0
                                                    : val,
                                                  isPresent: true,
                                                }
                                              : en,
                                          ),
                                        );
                                      }}
                                    />
                                    <input
                                      type="number"
                                      className="w-12 border rounded px-1 text-center"
                                      min={0}
                                      max={7}
                                      value={
                                        entry.formulaY ??
                                        ((entry.hoursWorked || 0) % 8 || 0)
                                      }
                                      onChange={(e) => {
                                        const val = parseInt(
                                          e.target.value || "0",
                                          10,
                                        );
                                        setEditableEntries((prev) =>
                                          prev.map((en, i) =>
                                            i === index
                                              ? {
                                                  ...en,
                                                  formulaY: Math.max(
                                                    0,
                                                    Math.min(
                                                      7,
                                                      isNaN(val) ? 0 : val,
                                                    ),
                                                  ),
                                                  isPresent: true,
                                                }
                                              : en,
                                          ),
                                        );
                                      }}
                                    />
                                  </div>
                                ) : (
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
                                )}
                                <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[14px] text-muted-foreground">
                                  P
                                </span>
                              </TableCell>
                              <TableCell>
                                {entry.isPresent
                                  ? ((entry.formulaX ??
                                      Math.floor(
                                        (entry.hoursWorked || 0) / 8,
                                      )) ||
                                      0) *
                                      8 +
                                    ((entry.formulaY ??
                                      (entry.hoursWorked || 0) % 8) ||
                                      0)
                                  : "-"}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {editMode ? (
                                  <input
                                    className="w-full border rounded px-2 py-1"
                                    value={entry.remarks || ""}
                                    onChange={(e) =>
                                      setEditableEntries((prev) =>
                                        prev.map((en, i) =>
                                          i === index
                                            ? { ...en, remarks: e.target.value }
                                            : en,
                                        ),
                                      )
                                    }
                                  />
                                ) : (
                                  entry.remarks || "-"
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* In/Out editable when editMode */}
                {editMode && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">In Time</label>
                      <input
                        className="w-full border rounded px-2 py-1"
                        value={editableInTime || ""}
                        onChange={(e) => setEditableInTime(e.target.value)}
                        placeholder="HH:MM"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Out Time</label>
                      <input
                        className="w-full border rounded px-2 py-1"
                        value={editableOutTime || ""}
                        onChange={(e) => setEditableOutTime(e.target.value)}
                        placeholder="HH:MM"
                      />
                    </div>
                  </div>
                )}

                {/* Admin Comments */}
                {showActions && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Admin Comments (Optional)
                    </label>
                    <Textarea
                      placeholder="Add any final comments or observations..."
                      value={adminComments}
                      onChange={(e) => setAdminComments(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}

                {/* Edit Controls */}
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {editMode ? "Editing enabled" : "View only"}
                  </div>
                  <div className="flex gap-2">
                    {!editMode ? (
                      <Button
                        variant="outline"
                        onClick={() => setEditMode(true)}
                      >
                        Edit
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditMode(false);
                            setEditableEntries(
                              selectedRecord.entries.map((e) => ({ ...e })),
                            );
                            setEditableInTime(selectedRecord.inTime);
                            setEditableOutTime(selectedRecord.outTime);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={async () => {
                            try {
                              const resp = await fetch(`https://erp-backend-lm5c.onrender.com/api/attendance/${selectedRecord.id}`,
                                {
                                  method: "PUT",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                                  },
                                  body: JSON.stringify({
                                    entries: editableEntries,
                                    inTime: editableInTime ?? null,
                                    outTime: editableOutTime ?? null,
                                  }),
                                },
                              );
                              const result: ApiResponse<AttendanceRecord> =
                                await resp.json();
                              if (result.success && result.data) {
                                setSelectedRecord(result.data);
                                setEditMode(false);
                                toast({
                                  title: "Updated",
                                  description:
                                    "Attendance updated successfully",
                                });
                                fetchAttendanceRecords();
                              } else {
                                throw new Error(result.message);
                              }
                            } catch {
                              toast({
                                title: "Error",
                                description: "Failed to update attendance",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Save
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {showActions && (
                  <div className="flex justify-end space-x-4">
                    <Button
                      variant="destructive"
                      onClick={() => processRecord("reject")}
                      disabled={isProcessing}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => processRecord("approve")}
                      disabled={isProcessing}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {isProcessing ? "Processing..." : "Final Approval"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading attendance records...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Approval</h1>
        <p className="text-gray-600">
          Final approval for attendance records reviewed by site incharges
        </p>
      </div>

      {/* Tabs for Pending and Approved */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Approval ({pendingRecords.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Approved Records ({approvedRecords.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Admin Approval</CardTitle>
              <CardDescription>
                Attendance records that have been reviewed by site incharges and
                need final approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRecords.length > 0 ? (
                <div className="space-y-4">
                  {pendingRecords.map((record) => (
                    <AttendanceRecordCard
                      key={record.id}
                      record={record}
                      showActions={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    All Caught Up!
                  </h3>
                  <p className="text-gray-600">
                    No pending attendance records for approval
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Approved Records</CardTitle>
              <CardDescription>
                Recently approved attendance records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {approvedRecords.length > 0 ? (
                <div className="space-y-4">
                  {approvedRecords.map((record) => (
                    <AttendanceRecordCard
                      key={record.id}
                      record={record}
                      showActions={false}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Approved Records
                  </h3>
                  <p className="text-gray-600">
                    Approved attendance records will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
