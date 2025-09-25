import { useEffect, useState } from "react";
import { useAuth } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useToast } from "../components/ui/use-toast";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setUsername(user?.username || "");
  }, [user?.id]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/users/${user?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({ name: name.trim(), username: username.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update profile");
      }
      updateUser({ name: data.data.user.name, username: data.data.user.username });
      toast({ title: "प्रोफाइल अपडेट", description: "आपकी प्रोफाइल जानकारी सेव कर दी गई है" });
    } catch (err: any) {
      toast({ title: "त्रुटि", description: err.message || "अपडेट असफल रहा", variant: "destructive" });
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "त्रुटि", description: "कृपया सभी पासवर्ड फ़ील्ड भरें", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "त्रुटि", description: "नया पासवर्ड मेल नहीं खा रहा", variant: "destructive" });
      return;
    }
    if (newPassword.length < 4) {
      toast({ title: "त्रुटि", description: "पासवर्ड कम से कम 4 अक्षरों का होना चाहिए", variant: "destructive" });
      return;
    }
    try {
      setIsSavingPassword(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update password");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "पासवर्ड बदला गया", description: "आपका पासवर्ड सफलतापूर्वक अपडेट कर दिया गया है" });
    } catch (err: any) {
      toast({ title: "त्रुटि", description: err.message || "पासवर्ड अपडेट नहीं हो सका", variant: "destructive" });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>मेरी प्रोफाइल</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="space-y-4">
            <div>
              <Label htmlFor="name">नाम</Label>
              <Input id="name" value={name} onChange={(e)=>setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="username">यूज़रनेम</Label>
              <Input id="username" value={username} onChange={(e)=>setUsername(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button type="submit">सेव करें</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>पासवर्ड बदलें</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">पुराना पासवर्ड</Label>
              <Input id="currentPassword" type="password" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="newPassword">नया पासवर्ड</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="confirmPassword">नया पासवर्ड (दोबारा)</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSavingPassword}>{isSavingPassword ? "कृपया प्रतीक्षा करें..." : "अपडेट पासवर्ड"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
