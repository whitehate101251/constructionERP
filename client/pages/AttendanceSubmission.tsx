import { useEffect, useRef, useState } from "react";
import { useAuth } from "../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import GoogleTimePicker, { TimeValue } from "../components/GoogleTimePicker";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { CalendarDays, Users, CheckCircle } from "lucide-react";
import { Worker, AttendanceEntry, ApiResponse } from "@shared/api";

type EntryWithFormula = AttendanceEntry & { formulaX?: number; formulaY?: number; };
import { useToast } from "../components/ui/use-toast";

export default function AttendanceSubmission() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendanceEntries, setAttendanceEntries] = useState<EntryWithFormula[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasSubmittedForDate, setHasSubmittedForDate] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [globalInTime, setGlobalInTime] = useState<string>("");
  const [globalOutTime, setGlobalOutTime] = useState<string>("");
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<"X" | "Y">("X");
  const [selectedWorkerIndex, setSelectedWorkerIndex] = useState<number>(-1);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timeTarget, setTimeTarget] = useState<"in" | "out">("in");
  const [pickHour, setPickHour] = useState<number>(8);
  const [pickMinute, setPickMinute] = useState<number>(0);
  const [pickAmPm, setPickAmPm] = useState<"AM" | "PM">("AM");

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!user?.siteId) {
      setIsLoading(false);
      toast({ title: "Site not assigned", description: "Your account is not linked to any site. Please ask admin to assign a site.", variant: "destructive" });
      return;
    }
    if (!token) {
      setIsLoading(false);
      toast({ title: "Not authenticated", description: "Please sign in again.", variant: "destructive" });
      return;
    }
    fetchWorkers();
    checkSubmissionForDate(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.siteId]);

  const fetchWorkers = async () => {
    try {
      const siteId = user?.siteId;
      const token = localStorage.getItem("auth_token");
      if (!siteId || !token) {
        throw new Error("Missing site or auth");
      }
      const response = await fetch(`https://erp-backend-lm5c.onrender.com/api/workers/site/${siteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.message || `HTTP ${response.status}`);
        }
        const text = await response.text().catch(() => "");
        throw new Error(text || `HTTP ${response.status}`);
      }
      const result: ApiResponse<Worker[]> = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.message || "Request failed");
      }
      setWorkers(result.data);
      initializeAttendanceEntries(result.data);
    } catch (error: any) {
      const msg = typeof error?.message === 'string' ? error.message : 'Failed to fetch workers list';
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const checkSubmissionForDate = async (dateStr: string) => {
    try {
      const response = await fetch(`https://erp-backend-lm5c.onrender.com/api/attendance/check/${dateStr}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      const result: ApiResponse<boolean> = await response.json();

      if (result.success) {
        setHasSubmittedForDate(!!result.data);
      }
    } catch (error) {
      // Ignore error - assume not submitted
    }
  };

  const initializeAttendanceEntries = (workersList: Worker[]) => {
    const draftKey = getDraftKey(new Date(selectedDate));
    const stored = localStorage.getItem(draftKey);
    if (stored) {
      try {
        const parsed: EntryWithFormula[] = JSON.parse(stored);
        setAttendanceEntries(parsed);
        return;
      } catch {}
    }
    const entries: EntryWithFormula[] = workersList.map((worker) => ({
      workerId: worker.id,
      workerName: worker.name,
      designation: worker.designation,
      isPresent: false,
      hoursWorked: 0,
      overtime: 0,
      remarks: "",
      formulaX: 0,
      formulaY: 0,
    }));
    setAttendanceEntries(entries);
  };

  const updateAttendanceEntry = (workerId: string, field: keyof EntryWithFormula, value: any) => {
    setAttendanceEntries((prev) =>
      prev.map((entry) =>
        entry.workerId === workerId ? { ...entry, [field]: value } : entry
      )
    );
  };

  const toggleAllPresent = () => {
    const allPresent = attendanceEntries.every((entry) => entry.isPresent);
    setAttendanceEntries((prev) =>
      prev.map((entry) => ({ ...entry, isPresent: !allPresent }))
    );
  };

  const getDraftKey = (dateObj: Date) => `attendance_draft_${user?.id}_${user?.siteId}_${dateObj.toISOString().split('T')[0]}`;

  const saveDraft = () => {
    try {
      const draftKey = getDraftKey(new Date(selectedDate));
      localStorage.setItem(draftKey, JSON.stringify(attendanceEntries));
      toast({ title: "ड्राफ्ट सेव", description: "हाज़िरी ड्राफ्ट लोकली सेव हो गया" });
    } catch {
      toast({ title: "Error", description: "Failed to save draft", variant: "destructive" });
    }
  };

  const loadDraft = () => {
    try {
      const draftKey = getDraftKey(new Date(selectedDate));
      const stored = localStorage.getItem(draftKey);
      if (!stored) {
        toast({ title: "ड्राफ्ट नहीं मिला", description: "इस तारीख के लिए कोई सेव ड्राफ्ट उपलब्ध नहीं है" });
        return;
      }
      const parsed: EntryWithFormula[] = JSON.parse(stored);
      setAttendanceEntries(parsed);
      toast({ title: "ड्राफ्ट लोड हुआ", description: "पिछला सेव ड्राफ्ट लोड कर दिया गया" });
    } catch {
      toast({ title: "Error", description: "Failed to load draft", variant: "destructive" });
    }
  };

  const submitAttendance = async () => {
    const presentWorkers = attendanceEntries.filter((entry) => entry.isPresent);

    if (presentWorkers.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please mark at least one worker as present",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`https://erp-backend-lm5c.onrender.com/api/attendance/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          date: selectedDate,
          entries: attendanceEntries
            .filter((e) => e.isPresent)
            .map((e) => ({ ...e, hoursWorked: (e.formulaX || 0) * 8 + (e.formulaY || 0) })),
          inTime: globalInTime || undefined,
          outTime: globalOutTime || undefined,
        }),
      });

      const result: ApiResponse = await response.json();

      if (result.success) {
        toast({
          title: "Attendance Submitted",
          description: "Attendance has been submitted for review",
        });
        setHasSubmittedForDate(true);
        // Clear draft and reset inputs
        const draftKey = getDraftKey(new Date(selectedDate));
        localStorage.removeItem(draftKey);
        setAttendanceEntries(workers.map((worker) => ({
          workerId: worker.id,
          workerName: worker.name,
          designation: worker.designation,
          isPresent: false,
          hoursWorked: 0,
          overtime: 0,
          remarks: "",
          formulaX: 0,
          formulaY: 0,
        })));
        setGlobalInTime("");
        setGlobalOutTime("");
        setConfirmSend(false);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit attendance",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const presentCount = attendanceEntries.filter((entry) => entry.isPresent).length;
  const totalCount = attendanceEntries.length;

  const parseTime = (t: string) => {
    const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return { h: 8, m: 0, ap: "AM" as const };
    return { h: Math.max(1, Math.min(12, Number(m[1]))), m: Math.max(0, Math.min(59, Number(m[2]))), ap: (m[3].toUpperCase() as "AM"|"PM") };
  };
  const formatTime = (h: number, m: number, ap: "AM"|"PM") => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ap}`;
  const openTimePicker = (target: "in"|"out") => {
    setTimeTarget(target);
    const src = target === "in" ? globalInTime : globalOutTime;
    const { h, m, ap } = parseTime(src);
    setPickHour(h); setPickMinute(m); setPickAmPm(ap);
    setTimePickerOpen(true);
  };
  const applyPickedTime = () => {
    const val = formatTime(pickHour, pickMinute, pickAmPm);
    if (timeTarget === "in") setGlobalInTime(val); else setGlobalOutTime(val);
    setTimePickerOpen(false);
  };

  const openFormulaDialog = (workerId: string, field: "X" | "Y") => {
    const idx = attendanceEntries.findIndex(e => e.workerId === workerId);
    if (idx !== -1) setSelectedWorkerIndex(idx);
    setFocusedField(field);
    setFormulaOpen(true);
  };

  const getPresentIndices = () => attendanceEntries.map((e, i) => e.isPresent ? i : -1).filter(i => i !== -1);
  const goNextPresent = () => {
    const present = getPresentIndices();
    const pos = present.indexOf(selectedWorkerIndex);
    const nextIdx = present[Math.min(pos + 1, present.length - 1)] ?? selectedWorkerIndex;
    setSelectedWorkerIndex(nextIdx);
  };
  const goPrevPresent = () => {
    const present = getPresentIndices();
    const pos = present.indexOf(selectedWorkerIndex);
    const prevIdx = present[Math.max(pos - 1, 0)] ?? selectedWorkerIndex;
    setSelectedWorkerIndex(prevIdx);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading workers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">हाज़िरी प्रबंधन</h1>
          <p className="text-gray-600">प्रत्येक श्रमिक के लिए उपस्थिति और घंटे भरें</p>
        </div>
        <div className="flex items-center space-x-2">
          <CalendarDays className="h-5 w-5 text-gray-400" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); checkSubmissionForDate(e.target.value); }}
            max={new Date().toISOString().split('T')[0]}
            className="w-auto"
          />
        </div>
      </div>

      {hasSubmittedForDate && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
आज के लिए हाज़िरी भेजी जा चुकी है। आप ड्राफ्ट देख/बदल सकते हैं।
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">कुल मज़दूर</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">आज उपस्थित</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">उपस्थिति दर</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <div className="space-y-3 flex flex-col">
            <div className="flex items-center justify-between mx-auto text-center">
              <div className="flex flex-col">
                <CardTitle className="text-2xl font-semibold tracking-tight">Attendance Records</CardTitle>
                <CardDescription className="text-sm leading-5 font-normal">इन टाइम, आउट टाइम और काम के घंट��</CardDescription>
                <div className="mt-2">
                  <Button variant="secondary" size="sm" onClick={loadDraft}>Load Draft</Button>
                </div>
              </div>
            </div>
            <div>
              <div className="flex gap-5 md:flex-row flex-col md:items-stretch md:gap-5">
                <div className="flex flex-col w-full md:w-1/2">
                  <Label className="text-sm mx-auto">इन टाइम</Label>
                  <Button variant="outline" className="w-full" onClick={() => openTimePicker("in")}>
                    {globalInTime || "-- : -- AM/PM"}
                  </Button>
                </div>
                <div className="flex flex-col w-full md:w-1/2 md:ml-5">
                  <Label className="text-sm mx-auto">आउट टाइम</Label>
                  <Button variant="outline" className="w-full" onClick={() => openTimePicker("out")}>
                    {globalOutTime || "-- : -- AM/PM"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 pl-[19px] pr-4">P/A</TableHead>
                  <TableHead className="pr-[15px] pl-[41px]">नाम</TableHead>
                  <TableHead className="pr-4 pl-8">पिता का नाम</TableHead>
                  <TableHead className="w-20 px-4 text-center">X</TableHead>
                  <TableHead className="w-12 px-0 text-center">P</TableHead>
                  <TableHead className="w-20 px-4 text-center">Y</TableHead>
                  <TableHead className="w-20 pr-[25px] pl-4">घंटे</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceEntries.map((entry) => {
                  const hours = (entry.formulaX || 0) * 8 + (entry.formulaY || 0);
                  return (
                    <TableRow key={entry.workerId}>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={entry.isPresent ? "secondary" : "destructive"}
                          className={entry.isPresent ? "bg-green-500 hover:bg-green-600 text-white" : "bg-rose-500 hover:bg-rose-600 text-white"}
                          onClick={() => updateAttendanceEntry(entry.workerId, "isPresent", !entry.isPresent)}
                        >
                          {entry.isPresent ? "P" : "A"}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium mr-[-1px] p-4">{entry.workerName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{workers.find(w => w.id === entry.workerId)?.fatherName || ""}</Badge>
                      </TableCell>
                      <TableCell className="pr-0 pl-4">
                        <Button variant="outline" className="w-16 mx-auto" disabled={!entry.isPresent} onClick={() => openFormulaDialog(entry.workerId, "X")}>
                          {entry.formulaX ?? 0}
                        </Button>
                      </TableCell>
                      <TableCell className="px-0 text-center text-xs text-muted-foreground">P</TableCell>
                      <TableCell className="pl-4">
                        <Button variant="outline" className="w-16 mx-auto" disabled={!entry.isPresent} onClick={() => openFormulaDialog(entry.workerId, "Y")}>
                          {entry.formulaY ?? 0}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium pr-[18px] pl-4">{hours}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation & Action */}
      <div className="space-y-3 mt-6 flex flex-col">
        <label className="flex items-start gap-2 text-sm mx-auto">
          <Checkbox checked={confirmSend} onCheckedChange={(c)=>setConfirmSend(!!c)} />
          <span>मैं पुष्टि करता/करती हूं कि यह रिकॉर्ड सही है। साइट इंचार्ज को भेजें।</span>
        </label>
        <div className="flex justify-center">
          <Button onClick={() => (confirmSend ? submitAttendance() : saveDraft())} disabled={isSubmitting || (hasSubmittedForDate && confirmSend)}>
            {confirmSend ? (isSubmitting ? "भेजा जा रहा है..." : "भेजें") : "ड्राफ्ट सेव करें"}
          </Button>
        </div>
      </div>

      <Dialog open={formulaOpen} onOpenChange={setFormulaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {attendanceEntries[selectedWorkerIndex]?.workerName || ""}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center gap-6 py-2">
            <Input
              value={attendanceEntries[selectedWorkerIndex]?.formulaX ?? ""}
              onChange={(e) => {
                const x = Number(e.target.value || 0);
                const id = attendanceEntries[selectedWorkerIndex]?.workerId;
                if (!id) return;
                setAttendanceEntries(prev => prev.map(p => p.workerId === id ? { ...p, formulaX: x, hoursWorked: x*8 + (p.formulaY||0) } : p));
                setFocusedField('X');
              }}
              placeholder="X"
              inputMode="numeric"
              pattern="[0-9]*"
              className={`w-16 h-16 text-2xl text-center ${focusedField === 'X' ? 'ring-2 ring-blue-500' : ''}`}
            />
            <div className="text-xl font-semibold">P</div>
            <Input
              type="number"
              min={0}
              max={7}
              step={1}
              value={attendanceEntries[selectedWorkerIndex]?.formulaY ?? ""}
              onChange={(e) => {
                let y = Number(e.target.value);
                if (Number.isNaN(y)) y = 0;
                y = Math.max(0, Math.min(7, Math.floor(y)));
                const id = attendanceEntries[selectedWorkerIndex]?.workerId;
                if (!id) return;
                setAttendanceEntries(prev => prev.map(p => p.workerId === id ? { ...p, formulaY: y, hoursWorked: (p.formulaX||0)*8 + y } : p));
                setFocusedField('Y');
              }}
              placeholder="Y"
              inputMode="numeric"
              pattern="[0-9]*"
              className={`w-16 h-16 text-2xl text-center ${focusedField === 'Y' ? 'ring-2 ring-blue-500' : ''}`}
            />
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={goPrevPresent}>पीछे</Button>
            <Button onClick={() => setFormulaOpen(false)}>ठीक है</Button>
            <Button variant="outline" onClick={goNextPresent}>आगे</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={timePickerOpen} onOpenChange={setTimePickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-center">
            <DialogTitle className="text-sm text-gray-500">समय चुनें</DialogTitle>
          </DialogHeader>
          <GoogleTimePicker
            value={{ hours: pickHour, minutes: pickMinute, period: pickAmPm }}
            onChange={(t: TimeValue) => { setPickHour(t.hours); setPickMinute(t.minutes); setPickAmPm(t.period); }}
          />
          <div className="flex justify-between gap-2 mt-3">
            <Button variant="outline" onClick={()=>setTimePickerOpen(false)}>रद्द करें</Button>
            <Button onClick={applyPickedTime}>ठीक है</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
