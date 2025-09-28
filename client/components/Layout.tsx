import { ReactNode } from "react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetClose,
} from "./ui/sheet";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Building2,
  Users,
  ClipboardList,
  CheckSquare,
  Shield,
  Settings,
  LogOut,
  Menu,
  Bell,
} from "lucide-react";
import { cn } from "../lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [lang, setLang] = useState<string>(
    () => localStorage.getItem("app_lang") || "hi",
  );
  const t = (en: string, hi: string) => (lang === "en" ? en : hi);

  const getNavigationItems = () => {
    if (!user) return [];

    const items = [
      {
        label: t("Home", "होम"),
        href: "/dashboard",
        icon: Building2,
        roles: ["foreman", "site_incharge", "admin"],
      },
    ];

    if (user.role === "foreman") {
      items.push(
        {
          label: t("Attendance", "हाज़िरी"),
          href: "/attendance/submit",
          icon: ClipboardList,
          roles: ["foreman"],
        },
        {
          label: t("Workers", "श्रमिक जोड़ें"),
          href: "/workers",
          icon: Users,
          roles: ["foreman"],
        },
      );
    }

    if (user.role === "site_incharge") {
      items.push(
        {
          label: "Review Attendance",
          href: "/attendance/review",
          icon: CheckSquare,
          roles: ["site_incharge"],
        },
        {
          label: "Manage Workers",
          href: "/workers",
          icon: Users,
          roles: ["site_incharge"],
        },
      );
    }

    if (user.role === "admin") {
      items.push(
        {
          label: "Admin Approval",
          href: "/attendance/admin",
          icon: Shield,
          roles: ["admin"],
        },
        {
          label: "Manage Sites",
          href: "/sites",
          icon: Settings,
          roles: ["admin"],
        },
        {
          label: "Add User",
          href: "/users/add",
          icon: Users,
          roles: ["admin"],
        },
        {
          label: "Attendance",
          href: "/attendance",
          icon: Building2,
          roles: ["admin"],
        },
        {
          label: "Attendance Records",
          href: "/attendance/records",
          icon: ClipboardList,
          roles: ["admin"],
        },
      );
    }

    return items.filter((item) => item.roles.includes(user.role));
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo, hamburger and brand */}
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button aria-label="Open menu" variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 sm:w-96">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <div className="space-y-6 mt-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {user?.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-base font-semibold">
                          {user?.name || user?.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user?.role.replace("_", " ")}
                        </p>
                      </div>
                    </div>

                    <nav className="space-y-1">
                      {navigationItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <SheetClose asChild key={item.href}>
                            <Link
                              to={item.href}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                                location.pathname === item.href
                                  ? "bg-blue-100 text-blue-700"
                                  : "hover:bg-gray-100",
                              )}
                            >
                              <Icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          </SheetClose>
                        );
                      })}
                      <SheetClose asChild>
                        <Link
                          to="/profile"
                          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-gray-100"
                        >
                          <Settings className="h-4 w-4" />
                          <span>{t("Profile", "प्रोफाइल")}</span>
                        </Link>
                      </SheetClose>
                    </nav>

                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-muted-foreground">
                        Language
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant={lang === "en" ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setLang("en");
                            localStorage.setItem("app_lang", "en");
                          }}
                        >
                          EN
                        </Button>
                        <Button
                          variant={lang === "hi" ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setLang("hi");
                            localStorage.setItem("app_lang", "hi");
                          }}
                        >
                          HI
                        </Button>
                      </div>
                    </div>
                    <div className="pt-2">
                      <SheetClose asChild>
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={handleLogout}
                        >
                          {t("Log out", "लॉग आउट")}
                        </Button>
                      </SheetClose>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Building2 className="h-8 w-8 text-blue-600" />
              <div className="ml-1">
                <h1 className="text-xl font-bold text-gray-900">
                  ConstructERP
                </h1>
                <p className="text-xs text-gray-500">
                  Attendance Management System
                </p>
              </div>
            </div>

            {/* User menu */}
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user?.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">
                      {user?.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.role.replace("_", " ").toUpperCase()}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-5 px-3 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
