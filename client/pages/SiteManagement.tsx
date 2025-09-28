import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import ConfirmDialog from "../components/ConfirmDialog";
import { Badge } from "../components/ui/badge";
import { ApiResponse, Site, User } from "@shared/api";
import {
  Building2,
  Users,
  User as UserIcon,
  Plus,
  Pencil,
  Trash2,
  RefreshCcw,
  Search,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export default function SiteManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [totalWorkers, setTotalWorkers] = useState<number>(0);

  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<{ open: boolean; site?: Site }>({
    open: false,
  });
  const [addForemanOpen, setAddForemanOpen] = useState<{
    open: boolean;
    siteId?: string;
  }>({ open: false });
  const [selectedForemanId, setSelectedForemanId] = useState<string>("");

  const [siteForm, setSiteForm] = useState({
    name: "",
    location: "",
    inchargeId: "",
  });

  const siteIncharges = useMemo(
    () => users.filter((u) => u.role === "site_incharge"),
    [users],
  );
  const foremen = useMemo(
    () => users.filter((u) => u.role === "foreman"),
    [users],
  );
  const unassignedForemen = useMemo(
    () => foremen.filter((f) => !f.siteId),
    [foremen],
  );

  const assignedForemenCount = useMemo(
    () => foremen.filter((f) => !!f.siteId).length,
    [foremen],
  );

  const fetchAll = async () => {
    if (!isAdmin) return;
    const token = localStorage.getItem("auth_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const [u, s, d] = await Promise.all([
      fetch(`https://erp-backend-lm5c.onrender.com/api/admin/users`, { headers }).then(
        (r) => r.json() as Promise<ApiResponse<User[]>>,
      ),
      fetch(`https://erp-backend-lm5c.onrender.com/api/sites`, { headers }).then(
        (r) => r.json() as Promise<ApiResponse<Site[]>>,
      ),
      fetch(`https://erp-backend-lm5c.onrender.com/api/dashboard/stats`, { headers })
        .then((r) => r.json() as Promise<ApiResponse<{ totalWorkers: number }>>)
        .catch(() => ({ success: true, data: { totalWorkers: 0 } }) as any),
    ]);
    if (u.success && u.data) setUsers(u.data);
    if (s.success && s.data) setSites(s.data);
    if (d && d.success && d.data)
      setTotalWorkers((d.data as any).totalWorkers ?? 0);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Site Management</h1>
        <p className="text-gray-600">Only admins can manage sites.</p>
      </div>
    );
  }

  const filteredSites = sites.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()),
  );

  const beginCreate = () => {
    setSiteForm({ name: "", location: "", inchargeId: "" });
    setCreateOpen(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`https://erp-backend-lm5c.onrender.com/api/sites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...siteForm }),
    });
    const data: ApiResponse<Site> = await res.json();
    if (res.ok && data.success && data.data) {
      setSites([data.data, ...sites]);
      setCreateOpen(false);
    }
  };

  const openEdit = (site: Site) => {
    setSiteForm({
      name: site.name,
      location: site.location,
      inchargeId: site.inchargeId,
    });
    setEditOpen({ open: true, site });
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOpen.site) return;
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`https://erp-backend-lm5c.onrender.com/api/sites/${editOpen.site.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...siteForm }),
    });
    const data: ApiResponse<Site> = await res.json();
    if (res.ok && data.success && data.data) {
      setSites((prev) =>
        prev.map((s) => (s.id === data.data!.id ? data.data! : s)),
      );
      setEditOpen({ open: false });
    }
  };

  const deleteSite = async (site: Site) => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`https://erp-backend-lm5c.onrender.com/api/sites/${site.id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      setSites((prev) => prev.filter((s) => s.id !== site.id));
      fetchAll();
    }
  };

  const addForemanToSite = async () => {
    if (!addForemanOpen.siteId || !selectedForemanId) return;
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`https://erp-backend-lm5c.onrender.com/api/admin/users/${selectedForemanId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ siteId: addForemanOpen.siteId }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedForemanId
            ? { ...u, siteId: addForemanOpen.siteId! }
            : u,
        ),
      );
      setSelectedForemanId("");
      setAddForemanOpen({ open: false });
    }
  };

  const removeForeman = async (foremanId: string) => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`https://erp-backend-lm5c.onrender.com/api/admin/users/${foremanId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ siteId: "" }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === foremanId ? { ...u, siteId: "" } : u)),
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Construction Sites
          </h1>
          <p className="text-gray-600">
            Manage your construction site locations and assigned foremen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={beginCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Site
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/10 border-blue-100/60 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
            <Building2 className="h-4 w-4 text-blue-700/80 dark:text-blue-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sites.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/10 border-emerald-100/60 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Site Incharge</CardTitle>
            <UserIcon className="h-4 w-4 text-emerald-700/80 dark:text-emerald-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{siteIncharges.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/10 border-amber-100/60 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Foremen</CardTitle>
            <Users className="h-4 w-4 text-amber-700/80 dark:text-amber-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedForemenCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-sky-50 to-sky-100 dark:from-sky-950/40 dark:to-sky-900/10 border-sky-100/60 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workers</CardTitle>
            <Users className="h-4 w-4 text-sky-700/80 dark:text-sky-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWorkers}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search sites..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button variant="outline" onClick={fetchAll}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sites</CardTitle>
          <CardDescription>
            Click a site to view details and assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSites.length === 0 ? (
            <div className="text-gray-500">No sites found.</div>
          ) : (
            <div className="divide-y border rounded-md">
              <div className="grid grid-cols-[2fr_3fr_3fr_1.5fr_120px] gap-2 p-3 text-xs font-medium uppercase tracking-wide text-gray-500 bg-muted/50">
                <div>Site Incharge</div>
                <div>Name</div>
                <div>Location</div>
                <div>Total Foremen</div>
                <div className="text-right">Actions</div>
              </div>
              {filteredSites.map((s) => {
                const incharge = siteIncharges.find(
                  (u) => u.id === s.inchargeId,
                );
                const siteForemen = foremen.filter((f) => f.siteId === s.id);
                const expanded = expandedId === s.id;
                return (
                  <div key={s.id} className="">
                    <div
                      role="button"
                      tabIndex={0}
                      className="grid grid-cols-[2fr_3fr_3fr_1.5fr_120px] gap-2 w-full p-3 hover:bg-muted/50 items-center"
                      onClick={() => setExpandedId(expanded ? null : s.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedId(expanded ? null : s.id);
                        }
                      }}
                    >
                      <div className="text-left flex items-center gap-2">
                        <UserIcon className="h-4 w-4" /> {incharge?.name || "-"}
                      </div>
                      <div className="text-left font-medium flex items-center gap-2">
                        {expanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        {s.name}
                      </div>
                      <div className="text-left">{s.location}</div>
                      <div className="text-left">{siteForemen.length}</div>
                      <div className="text-right">
                        <div className="flex justify-end items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(s);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <ConfirmDialog
                            title="Delete this site?"
                            description="This action cannot be undone."
                            confirmText="Delete"
                            cancelText="Cancel"
                            onConfirm={() => deleteSite(s)}
                            trigger={
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {expanded && (
                      <div className="bg-muted/30 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="border rounded-md p-3">
                            <div className="text-sm text-gray-600 mb-2">
                              Site Incharge
                            </div>
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4" />
                              <div>
                                <div className="font-medium">
                                  {incharge?.name || "Not assigned"}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {incharge?.id || ""}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="border rounded-md p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm text-gray-600">
                                Site Foremen
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setAddForemanOpen({
                                    open: true,
                                    siteId: s.id,
                                  });
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" /> Add Foremen
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {siteForemen.length === 0 && (
                                <div className="text-sm text-gray-500">
                                  Click on a foreman to view their attendance
                                  records
                                </div>
                              )}
                              {siteForemen.map((f) => (
                                <Badge
                                  key={f.id}
                                  variant="secondary"
                                  className="gap-2"
                                >
                                  {f.name}
                                  <ConfirmDialog
                                    title="Remove this foreman from site?"
                                    confirmText="Remove"
                                    cancelText="Cancel"
                                    onConfirm={() => removeForeman(f.id)}
                                    trigger={
                                      <button
                                        className="ml-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                        }}
                                      >
                                        ×
                                      </button>
                                    }
                                  />
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Site */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Site</DialogTitle>
            <DialogDescription>
              Assign a Site Incharge and Foremen. A foreman cannot be assigned
              to multiple sites.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  required
                  value={siteForm.name}
                  onChange={(e) =>
                    setSiteForm({ ...siteForm, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  required
                  value={siteForm.location}
                  onChange={(e) =>
                    setSiteForm({ ...siteForm, location: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="incharge">Site Incharge</Label>
                <select
                  id="incharge"
                  className="border rounded-md h-10 px-3 w-full"
                  value={siteForm.inchargeId}
                  onChange={(e) =>
                    setSiteForm({ ...siteForm, inchargeId: e.target.value })
                  }
                >
                  <option value="">-- None --</option>
                  {siteIncharges.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Create Site</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Site */}
      <Dialog
        open={editOpen.open}
        onOpenChange={(o) => setEditOpen({ open: o, site: editOpen.site })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Site</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="siteName2">Site Name</Label>
                <Input
                  id="siteName2"
                  required
                  value={siteForm.name}
                  onChange={(e) =>
                    setSiteForm({ ...siteForm, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="location2">Location</Label>
                <Input
                  id="location2"
                  required
                  value={siteForm.location}
                  onChange={(e) =>
                    setSiteForm({ ...siteForm, location: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="incharge2">Site Incharge</Label>
                <select
                  id="incharge2"
                  className="border rounded-md h-10 px-3 w-full"
                  value={siteForm.inchargeId}
                  onChange={(e) =>
                    setSiteForm({ ...siteForm, inchargeId: e.target.value })
                  }
                >
                  <option value="">-- None --</option>
                  {siteIncharges.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Foreman */}
      <Dialog
        open={addForemanOpen.open}
        onOpenChange={(o) =>
          setAddForemanOpen({ open: o, siteId: addForemanOpen.siteId })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Foreman</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="foremanSelect">Select a manager</Label>
            <select
              id="foremanSelect"
              className="border rounded-md h-10 px-3 w-full"
              value={selectedForemanId}
              onChange={(e) => setSelectedForemanId(e.target.value)}
            >
              <option value="">Select a manager</option>
              {unassignedForemen.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} (@{f.username})
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAddForemanOpen({ open: false })}
              >
                Cancel
              </Button>
              <Button onClick={addForemanToSite} disabled={!selectedForemanId}>
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
