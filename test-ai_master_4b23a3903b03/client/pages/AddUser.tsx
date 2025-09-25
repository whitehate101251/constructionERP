import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { ApiResponse, Site, User } from "@shared/api";

export default function AddUser() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [sites, setSites] = useState<Site[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const params = new URLSearchParams(window.location.search);
  const roleParam = params.get("role");
  const [form, setForm] = useState({
    role: (roleParam === "foreman" ? "foreman" : "site_incharge") as "site_incharge" | "foreman",
    name: "",
    fatherName: "",
    username: "",
    password: "",
    siteId: "",
  });

  useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem("auth_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const load = async () => {
      const [s, u] = await Promise.all([
        fetch("/api/sites", { headers }).then(
          (r) => r.json() as Promise<ApiResponse<Site[]>>,
        ),
        fetch("/api/admin/users", { headers }).then(
          (r) => r.json() as Promise<ApiResponse<User[]>>,
        ),
      ]);
      if (s.success && s.data) setSites(s.data);
      if (u.success && u.data) setUsers(u.data);
    };
    load();
  }, [isAdmin]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const token = localStorage.getItem("auth_token");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(form),
    });
    const data: ApiResponse<{ user: User }> = await res.json();
    if (res.ok && data.success && data.data) {
      setUsers([data.data.user, ...users]);
      setForm({ role: "site_incharge", name: "", fatherName: "", username: "", password: "", siteId: "" });
    } else {
      console.error("Create user failed", data);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Add User</h1>
        <p className="text-gray-600">Only admins can add users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add User</h1>
        <p className="text-gray-600">Create Site Incharge or Foreman accounts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create User</CardTitle>
          <CardDescription>Admins can create Site Incharges and Foremen</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                className="border rounded-md h-10 px-3 w-full"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as any })}
              >
                <option value="site_incharge">Site Incharge</option>
                <option value="foreman">Foreman</option>
              </select>
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="fatherName">Father Name (optional)</Label>
              <Input id="fatherName" value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Create User</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
