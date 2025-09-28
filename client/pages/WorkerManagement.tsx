import { useEffect, useRef, useState } from "react";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components/ui/card";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Building2,
  ChevronRight,
  Shield,
} from "lucide-react";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { ApiResponse, Worker, Site, User } from "@shared/api";

export default function WorkerManagement() {
  const { user } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [selectedForemanId, setSelectedForemanId] = useState<string | null>(
    null,
  );
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    fatherName: "",
    designation: "",
    dailyWage: "",
    phone: "",
    aadhar: "",
  });
  const [form, setForm] = useState({
    name: "",
    fatherName: "",
    designation: "",
    phone: "",
    aadhar: "",
  });
  const isForeman = user?.role === "foreman";
  const isAdmin = user?.role === "admin";

  const didFetchRef = useRef(false);
  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    if (!isForeman) return;
    const loadWorkers = async () => {
      if (!user?.siteId) return;
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`https://erp-backend-lm5c.onrender.com/api/workers/site/${user.siteId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data: ApiResponse<Worker[]> = await res.json();
        if (data.success && data.data) setWorkers(data.data);
      } finally {
        setLoading(false);
      }
    };
    loadWorkers();
  }, [user?.siteId, isForeman]);

  useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem("auth_token");
    const load = async () => {
      setLoading(true);
      try {
        const [u, s] = await Promise.all([
          fetch(`https://erp-backend-lm5c.onrender.com/api/admin/users`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }).then((r) => r.json()) as Promise<ApiResponse<User[]>>,
          fetch(`https://erp-backend-lm5c.onrender.com/api/sites`).then((r) => r.json()) as Promise<
            ApiResponse<Site[]>
          >,
        ]);
        if (u.success && u.data) setUsersList(u.data);
        if (s.success && s.data) setSites(s.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !selectedSiteId) return;
    const token = localStorage.getItem("auth_token");
    const loadWorkers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://erp-backend-lm5c.onrender.com/api/workers/site/${selectedSiteId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data: ApiResponse<Worker[]> = await res.json();
        if (data.success && data.data) setWorkers(data.data);
      } finally {
        setLoading(false);
      }
    };
    loadWorkers();
  }, [isAdmin, selectedSiteId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isForeman) return;
    const token = localStorage.getItem("auth_token");
    const designation = form.designation.trim();
    const payload = {
      name: form.name.trim(),
      fatherName: form.fatherName.trim(),
      ...(designation ? { designation } : {}),
      dailyWage: 0,
      phone: form.phone ? form.phone.trim() : undefined,
      aadhar: form.aadhar ? form.aadhar.trim() : undefined,
    };
    const res = await fetch(`https://erp-backend-lm5c.onrender.com/api/workers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data: ApiResponse<Worker> = await res.json();
    if (res.ok && data.success && data.data) {
      setWorkers([data.data, ...workers]);
      setForm({
        name: "",
        fatherName: "",
        designation: "",
        phone: "",
        aadhar: "",
      });
    } else {
      console.error("Add worker failed", data);
    }
  };

  const startEdit = (w: Worker) => {
    setEditingId(w.id);
    setEditForm({
      name: w.name,
      fatherName: w.fatherName,
      designation: w.designation,
      dailyWage: String(w.dailyWage),
      phone: w.phone || "",
      aadhar: w.aadhar || "",
    });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    const token = localStorage.getItem("auth_token");
    const payload = {
      name: editForm.name.trim(),
      fatherName: editForm.fatherName.trim(),
      designation: editForm.designation.trim(),
      dailyWage: Number(editForm.dailyWage),
      phone: editForm.phone ? editForm.phone.trim() : undefined,
      aadhar: editForm.aadhar ? editForm.aadhar.trim() : undefined,
    };
    const res = await fetch(`https://erp-backend-lm5c.onrender.com/api/workers/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data: ApiResponse<Worker> = await res.json();
    if (res.ok && data.success && data.data) {
      setWorkers(workers.map((w) => (w.id === id ? data.data : w)));
      setEditingId(null);
    } else {
      console.error("Update worker failed", data);
    }
  };

  const deleteWorker = async (id: string) => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`https://erp-backend-lm5c.onrender.com/api/workers/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      setWorkers(workers.filter((w) => w.id !== id));
    } else {
      console.error("Delete worker failed");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isAdmin ? "Manage Workers" : "श्रमिक जोड़ें"}
        </h1>
        <p className="text-gray-600">
          {isAdmin
            ? "Browse sites and foremen to manage workers"
            : "श्रमिक विवरण जोड़ें/संपादित करें"}
        </p>
      </div>

      {isForeman && (
        <Card>
          <CardContent className="p-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full h-12 text-base rounded-xl">
                  श्रमिक जोड़ें
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle className="text-lg">
                    नया श्रमिक जोड़ें
                  </DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={onSubmit}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <Label htmlFor="name">नाम</Label>
                    <Input
                      id="name"
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="fatherName">पिता का नाम</Label>
                    <Input
                      id="fatherName"
                      required
                      value={form.fatherName}
                      onChange={(e) =>
                        setForm({ ...form, fatherName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="designation">पद (वैकल्पिक)</Label>
                    <Input
                      id="designation"
                      placeholder="उदा. Mason, Helper"
                      value={form.designation}
                      onChange={(e) =>
                        setForm({ ...form, designation: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">फोन (वैकल्पिक)</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="aadhar">आधार (वैकल्पिक)</Label>
                    <Input
                      id="aadhar"
                      value={form.aadhar}
                      onChange={(e) =>
                        setForm({ ...form, aadhar: e.target.value })
                      }
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit">सेव करें</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Sites
            </CardTitle>
            <CardDescription>
              Select a foreman to view site workers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sites.map((site) => {
                const incharge = usersList.find(
                  (u) => u.id === site.inchargeId,
                );
                const foremen = usersList.filter(
                  (u) => u.role === "foreman" && u.siteId === site.id,
                );
                return (
                  <div key={site.id} className="border rounded-md p-3">
                    <div className="font-medium flex items-center gap-2">
                      {site.name}{" "}
                      <span className="text-sm text-gray-500">
                        ({site.location})
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Incharge: {incharge?.name || "-"}
                    </div>
                    <div className="mt-2 space-y-1">
                      {foremen.length === 0 ? (
                        <div className="text-sm text-gray-500">No foremen</div>
                      ) : (
                        foremen.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => {
                              setSelectedForemanId(f.id);
                              setSelectedSiteId(site.id);
                            }}
                            className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 ${selectedForemanId === f.id ? "bg-gray-100" : ""}`}
                          >
                            <div className="flex items-center gap-2">
                              <ChevronRight className="h-3 w-3" /> {f.name}{" "}
                              <span className="text-xs text-gray-500">
                                (@{f.username})
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />{" "}
            {isAdmin ? "Workers List" : "श्रमिक सूची"}
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? "Workers for selected foreman’s site"
              : "आपकी साइट के श्रमिक"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : workers.length === 0 ? (
            <div className="text-gray-500">No workers found.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAdmin ? "Name" : "नाम"}</TableHead>
                    <TableHead>
                      {isAdmin ? "Father's Name" : "पिता का नाम"}
                    </TableHead>
                    <TableHead>{isAdmin ? "Phone" : "फोन"}</TableHead>
                    <TableHead className="w-40 text-right">
                      {isAdmin ? "Actions" : "एक्शन"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((w) => (
                    <TableRow key={w.id}>
                      {editingId === w.id ? (
                        <>
                          <TableCell>
                            <Input
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  name: e.target.value,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editForm.fatherName}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  fatherName: e.target.value,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editForm.phone}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  phone: e.target.value,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <ConfirmDialog
                              title={
                                isAdmin ? "Save changes?" : "परिवर्तन सहेजें?"
                              }
                              description={
                                isAdmin
                                  ? "Do you want to save changes for this worker?"
                                  : "क्या आप इस श्रमिक के बदलाव सहेजना चाहते हैं?"
                              }
                              confirmText={isAdmin ? "Save" : "सेव करें"}
                              cancelText={isAdmin ? "Cancel" : "रद्द कर���ं"}
                              onConfirm={() => saveEdit(w.id)}
                              trigger={
                                <Button size="sm">
                                  {isAdmin ? "Save" : "सेव"}
                                </Button>
                              }
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                            >
                              {isAdmin ? "Cancel" : "रद्द करें"}
                            </Button>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="font-medium">
                            {w.name}
                          </TableCell>
                          <TableCell>{w.fatherName}</TableCell>
                          <TableCell>
                            {isAdmin
                              ? w.phone || "N/A"
                              : w.phone || "उपलब्ध नहीं"}
                          </TableCell>
                          <TableCell className="text-right space-x-3">
                            {(isForeman || isAdmin) && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl px-2"
                                  onClick={() => startEdit(w)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <ConfirmDialog
                                  title={
                                    isAdmin ? "Delete worker?" : "श्रमिक हटाएं?"
                                  }
                                  description={
                                    isAdmin
                                      ? "Are you sure you want to delete this worker? This action cannot be undone."
                                      : "क्या आप इस श्रमिक को हटाना चाहते हैं? यह क्रिया वापस नहीं ली जा सकती।"
                                  }
                                  confirmText={isAdmin ? "Delete" : "���टाएं"}
                                  cancelText={isAdmin ? "Cancel" : "रद्द करें"}
                                  onConfirm={() => deleteWorker(w.id)}
                                  trigger={
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="rounded-xl px-2"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  }
                                />
                              </>
                            )}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
