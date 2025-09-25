import { useState, useEffect } from "react";
import { useAuth } from "../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
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
  CheckSquare,
  Edit,
  Send,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { AttendanceRecord, AttendanceEntry, ApiResponse } from "@shared/api";
import { useToast } from "../components/ui/use-toast";

export default function AttendanceReview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingRecords, setPendingRecords] = useState<AttendanceRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [checkedEntries, setCheckedEntries] = useState<Set<string>>(new Set());
  const [editedEntries, setEditedEntries] = useState<Map<string, AttendanceEntry>>(new Map());
  const [inchargeComments, setInchargeComments] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    fetchPendingRecords();
  }, []);

  const fetchPendingRecords = async () => {
    try {
      const response = await fetch("/api/attendance/pending-review", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      const result: ApiResponse<AttendanceRecord[]> = await response.json();

      if (result.success && result.data) {
        setPendingRecords(result.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch pending records",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openRecordForReview = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setCheckedEntries(new Set());
    setEditedEntries(new Map());
    setInchargeComments("");
  };

  const toggleEntryCheck = (workerId: string) => {
    const newChecked = new Set(checkedEntries);
    if (newChecked.has(workerId)) {
      newChecked.delete(workerId);
    } else {
      newChecked.add(workerId);
    }
    setCheckedEntries(newChecked);
  };

  const toggleAllChecked = () => {
    if (!selectedRecord) return;

    const presentIds = selectedRecord.entries
      .filter(e => (editedEntries.get(e.workerId)?.isPresent ?? e.isPresent))
      .map(entry => entry.workerId);
    const allChecked = presentIds.length > 0 && presentIds.every(id => checkedEntries.has(id));

    if (allChecked) {
      setCheckedEntries(new Set());
    } else {
      setCheckedEntries(new Set(presentIds));
    }
  };

  const updateEntry = (workerId: string, field: keyof AttendanceEntry, value: any) => {
    if (!selectedRecord) return;

    const originalEntry = selectedRecord.entries.find(e => e.workerId === workerId);
    if (!originalEntry) return;

    const currentEdited = editedEntries.get(workerId) || { ...originalEntry };
    const updatedEntry = { ...currentEdited, [field]: value };
    
    const newEditedEntries = new Map(editedEntries);
    newEditedEntries.set(workerId, updatedEntry);
    setEditedEntries(newEditedEntries);
  };

  const submitReview = async (action: 'approve' | 'reject') => {
    if (!selectedRecord) return;

    const presentIds = selectedRecord.entries
      .filter(e => (editedEntries.get(e.workerId)?.isPresent ?? e.isPresent))
      .map(e => e.workerId);
    const allChecked = presentIds.length > 0 && presentIds.every(id => checkedEntries.has(id));

    if (action === 'approve' && !allChecked) {
      toast({
        title: "Review Required",
        description: "Please review all present workers before approving",
        variant: "destructive",
      });
      return;
    }

    setIsReviewing(true);

    try {
      // Merge original entries with edited ones
      let finalEntries = selectedRecord.entries.map(entry => {
        const edited = editedEntries.get(entry.workerId);
        const merged = { ...entry, ...(edited || {}) } as AttendanceEntry;
        const x = (merged.formulaX ?? Math.floor((merged.hoursWorked || 0)/8)) || 0;
        const y = (merged.formulaY ?? ((merged.hoursWorked || 0)%8)) || 0;
        merged.hoursWorked = x * 8 + y;
        merged.formulaX = x;
        merged.formulaY = Math.min(7, Math.max(0, y));
        return merged;
      });
      // For approval, forward only present workers
      if (action === 'approve') {
        finalEntries = finalEntries.filter(e => e.isPresent);
      }

      const response = await fetch(`/api/attendance/review/${selectedRecord.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          action,
          entries: finalEntries,
          inchargeComments,
          checkedEntries: Array.from(checkedEntries),
        }),
      });

      const result: ApiResponse = await response.json();

      if (result.success) {
        toast({
          title: action === 'approve' ? "Approved" : "Rejected",
          description: `Attendance record has been ${action}d and ${action === 'approve' ? 'forwarded to admin' : 'sent back to foreman'}`,
        });
        
        setSelectedRecord(null);
        fetchPendingRecords();
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
      setIsReviewing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      submitted: { label: "Pending Review", variant: "secondary" as const },
      incharge_reviewed: { label: "Reviewed", variant: "default" as const },
      admin_approved: { label: "Approved", variant: "default" as const },
      rejected: { label: "Rejected", variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.submitted;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading pending reviews...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Review Attendance</h1>
        <p className="text-gray-600">Review and approve attendance submissions from foremen</p>
      </div>

      {/* Pending Records List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Reviews ({pendingRecords.length})
          </CardTitle>
          <CardDescription>
            Attendance records waiting for your review and approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRecords.length > 0 ? (
            <div className="space-y-4">
              {pendingRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{record.siteName}</h4>
                      {getStatusBadge(record.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 gap-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {record.foremanName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(record.date).toLocaleDateString()}
                      </div>
                      <div>
                        {record.presentWorkers}/{record.totalWorkers} workers present
                      </div>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button onClick={() => openRecordForReview(record)}>
                        <CheckSquare className="mr-2 h-4 w-4" />
                        Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] sm:max-w-3xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
                      <DialogTitle className="sr-only">Review Attendance</DialogTitle>
                      <DialogHeader>
                        <DialogTitle>Review Attendance - {record.siteName}</DialogTitle>
                        <DialogDescription>
                          Submitted by {record.foremanName} on {new Date(record.date).toLocaleDateString()} {record.inTime || record.outTime ? `• In: ${record.inTime || '--'} • Out: ${record.outTime || '--'}` : ''}
                        </DialogDescription>
                      </DialogHeader>

                      {selectedRecord && (
                        <div className="space-y-6">
                          {/* Review Instructions */}
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              Please review each worker entry by checking the boxes. Make any necessary edits before approving.
                            </AlertDescription>
                          </Alert>

                          {/* Progress */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-blue-50 rounded-lg">
                            <div>
                              <p className="font-medium">Review Progress</p>
                              <p className="text-sm text-gray-600">
                                {checkedEntries.size} of {selectedRecord.entries.filter(e => (editedEntries.get(e.workerId)?.isPresent ?? e.isPresent)).length} present entries reviewed
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              onClick={toggleAllChecked}
                              size="sm"
                              className="w-full sm:w-auto"
                            >
                              {selectedRecord.entries.filter(e => (editedEntries.get(e.workerId)?.isPresent ?? e.isPresent)).every(entry => checkedEntries.has(entry.workerId))
                                ? "Uncheck All"
                                : "Check All Present"}
                            </Button>
                          </div>

                          {/* Attendance Table */}
                          <div className="rounded-md border">
                            <Table className="min-w-[900px]">
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12">Reviewed</TableHead>
                                  <TableHead className="w-12">P/A</TableHead>
                                  <TableHead>Worker Name</TableHead>
                                  <TableHead>Designation</TableHead>
                                  <TableHead className="w-20 px-4 text-center">X</TableHead>
                                  <TableHead className="w-12 px-0 text-center">P</TableHead>
                                  <TableHead className="w-20 px-4 text-center">Y</TableHead>
                                  <TableHead className="w-20">Total</TableHead>
                                  <TableHead className="min-w-[200px]">Remarks</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedRecord.entries.map((entry) => {
                                  const editedEntry = editedEntries.get(entry.workerId) || entry;
                                  const isChecked = checkedEntries.has(entry.workerId);

                                  return (
                                    <TableRow key={entry.workerId} className={isChecked ? "bg-green-50" : ""}>
                                      <TableCell>
                                        <Checkbox
                                          checked={isChecked}
                                          onCheckedChange={() => toggleEntryCheck(entry.workerId)}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          size="sm"
                                          variant={editedEntry.isPresent ? "secondary" : "destructive"}
                                          className={editedEntry.isPresent ? "bg-green-500 hover:bg-green-600 text-white" : "bg-rose-500 hover:bg-rose-600 text-white"}
                                          onClick={() => updateEntry(entry.workerId, "isPresent", !editedEntry.isPresent)}
                                        >
                                          {editedEntry.isPresent ? "P" : "A"}
                                        </Button>
                                      </TableCell>
                                      <TableCell className="font-medium">{entry.workerName}</TableCell>
                                      <TableCell>
                                        <Badge variant="secondary">{entry.designation}</Badge>
                                      </TableCell>
                                      <TableCell className="pr-0 pl-4">
                                        <Input
                                          type="number"
                                          min={0}
                                          value={(editedEntry.formulaX ?? Math.floor((editedEntry.hoursWorked || 0)/8)) || 0}
                                          onChange={(e)=> updateEntry(entry.workerId, 'formulaX', Number(e.target.value))}
                                          disabled={!editedEntry.isPresent}
                                          className="w-20"
                                        />
                                      </TableCell>
                                      <TableCell className="px-0 text-center text-xs text-muted-foreground">P</TableCell>
                                      <TableCell className="pl-4">
                                        <Input
                                          type="number"
                                          min={0}
                                          max={7}
                                          value={(editedEntry.formulaY ?? ((editedEntry.hoursWorked || 0)%8)) || 0}
                                          onChange={(e)=> updateEntry(entry.workerId, 'formulaY', Number(e.target.value))}
                                          disabled={!editedEntry.isPresent}
                                          className="w-20"
                                        />
                                      </TableCell>
                                      <TableCell className="font-medium">{(editedEntry.formulaX ?? Math.floor((editedEntry.hoursWorked || 0)/8)) * 8 + (editedEntry.formulaY ?? ((editedEntry.hoursWorked || 0)%8))}</TableCell>
                                      <TableCell>
                                        <Input
                                          placeholder="Add remarks..."
                                          value={editedEntry.remarks || ""}
                                          onChange={(e) =>
                                            updateEntry(entry.workerId, "remarks", e.target.value)
                                          }
                                          className="min-w-[180px]"
                                        />
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Comments */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Comments for Admin</label>
                            <Textarea
                              placeholder="Add any comments or concerns for the admin..."
                              value={inchargeComments}
                              onChange={(e) => setInchargeComments(e.target.value)}
                              rows={3}
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                            <Button
                              onClick={() => submitReview('approve')}
                              disabled={isReviewing || checkedEntries.size === 0}
                              className="w-full sm:w-auto"
                            >
                              <Send className="mr-2 h-4 w-4" />
                              {isReviewing ? "Submitting..." : "Approve & Submit to Admin"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
              <p className="text-gray-600">No pending attendance records to review</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
