import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { User } from "@shared/api";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AttendanceSubmission from "./pages/AttendanceSubmission";
import AttendanceReview from "./pages/AttendanceReview";
import AdminApproval from "./pages/AdminApproval";
import WorkerManagement from "./pages/WorkerManagement";
import SiteManagement from "./pages/SiteManagement";
import Sites from "./pages/Sites";
import AddUser from "./pages/AddUser";
import AttendanceRecords from "./pages/AttendanceRecords";
import Layout from "./components/Layout";
import { Toaster } from "./components/ui/toaster";
import Profile from "./pages/Profile";

interface AuthContextType {
  user: User | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth token on app start
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("user_data");

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_data");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (user: User, token: string) => {
  const camelUser = {
    ...user,
    siteId: user.site_id,
    inchargeId: user.incharge_id,
    // optionally remove snake_case to avoid confusion
    // site_id: undefined,
    // incharge_id: undefined,
  };

  localStorage.setItem("auth_token", token);
  localStorage.setItem("user_data", JSON.stringify(camelUser));
  setUser(camelUser);
};
  const updateUser = (partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev as any;
      const next = { ...prev, ...partial } as User;
      localStorage.setItem("user_data", JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, updateUser, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole?: string[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !requiredRole.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/attendance/submit"
            element={
              <ProtectedRoute requiredRole={["foreman"]}>
                <AttendanceSubmission />
              </ProtectedRoute>
            }
          />

          <Route
            path="/attendance/review"
            element={
              <ProtectedRoute requiredRole={["site_incharge"]}>
                <AttendanceReview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/attendance/admin"
            element={
              <ProtectedRoute requiredRole={["admin"]}>
                <AdminApproval />
              </ProtectedRoute>
            }
          />

          <Route
            path="/workers"
            element={
              <ProtectedRoute
                requiredRole={["admin", "site_incharge", "foreman"]}
              >
                <WorkerManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sites"
            element={
              <ProtectedRoute requiredRole={["admin"]}>
                <SiteManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sites/overview"
            element={
              <ProtectedRoute requiredRole={["admin"]}>
                <Sites />
              </ProtectedRoute>
            }
          />

          <Route
            path="/attendance"
            element={
              <ProtectedRoute requiredRole={["admin"]}>
                <Sites />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users/add"
            element={
              <ProtectedRoute requiredRole={["admin"]}>
                <AddUser />
              </ProtectedRoute>
            }
          />

          <Route
            path="/attendance/records"
            element={
              <ProtectedRoute requiredRole={["admin"]}>
                <AttendanceRecords />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
