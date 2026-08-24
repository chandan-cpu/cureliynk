import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import Dashboard from "./pages/Dashboard";
import AIHealthAssistant from "./pages/AIHealthAssistant";
import Login from "./pages/Login";
import Register from "./pages/Register";
import {
  selectIsAuthenticated,
  selectUserRole,
  selectInitializing,
  fetchCurrentUser,
} from "./redux/auth/authSlice";

// ─── Full-screen loader ─────────────────────────────────────────────────────
const FullPageLoader = () => (
  <div style={{
    minHeight: "100vh", display: "flex", alignItems: "center",
    justifyContent: "center", background: "#f5f7fa",
    fontFamily: "Inter, 'Segoe UI', sans-serif",
  }}>
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: "44px", height: "44px",
        border: "3px solid #e2e8f0",
        borderTopColor: "#16a34a",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        margin: "0 auto 14px",
      }} />
      <p style={{ color: "#64748b", fontSize: "14px", fontWeight: "500", margin: 0 }}>
        Loading...
      </p>
    </div>
  </div>
);

// ─── Route Guards ───────────────────────────────────────────────────────────

// Show loader while app is resolving session on boot.
// Once initializing=false, guard normally.
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const initializing    = useSelector(selectInitializing);

  if (initializing) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role         = useSelector(selectUserRole);
  const initializing = useSelector(selectInitializing);

  if (initializing) return <FullPageLoader />;
  if (!isAuthenticated) return children;

  const roleRoutes = { user: "/dashboard", doctor: "/doctor/dashboard", admin: "/admin/dashboard" };
  return <Navigate to={roleRoutes[role] || "/dashboard"} replace />;
};

const RoleRoute = ({ children, allowedRole }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role         = useSelector(selectUserRole);
  const initializing = useSelector(selectInitializing);

  if (initializing) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role !== allowedRole) {
    const roleRoutes = { user: "/dashboard", doctor: "/doctor/dashboard", admin: "/admin/dashboard" };
    return <Navigate to={roleRoutes[role] || "/dashboard"} replace />;
  }
  return children;
};

// ─── Placeholder dashboards ─────────────────────────────────────────────────
const cardStyle = {
  minHeight: "100vh", display: "flex", alignItems: "center",
  justifyContent: "center", fontFamily: "Inter, sans-serif", background: "#f5f7fa",
};
const innerCard = {
  background: "white", borderRadius: "20px", padding: "48px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center",
  maxWidth: "440px", width: "100%",
};

const DoctorDashboardPlaceholder = () => (
  <div style={cardStyle}><div style={innerCard}>
    <div style={{ fontSize: "48px", marginBottom: "16px" }}>👨‍⚕️</div>
    <h1 style={{ color: "#0f172a", fontSize: "24px", fontWeight: "800", margin: "0 0 8px" }}>Doctor Dashboard</h1>
    <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>Welcome, Doctor! Your dashboard is coming soon.</p>
  </div></div>
);

const AdminDashboardPlaceholder = () => (
  <div style={cardStyle}><div style={innerCard}>
    <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛡️</div>
    <h1 style={{ color: "#0f172a", fontSize: "24px", fontWeight: "800", margin: "0 0 8px" }}>Admin Dashboard</h1>
    <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>Welcome, Admin! Your dashboard is coming soon.</p>
  </div></div>
);

// ─── Root App ───────────────────────────────────────────────────────────────
const App = () => {
  const dispatch        = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role            = useSelector(selectUserRole);

  // On app boot: if token exists but role not in memory, fetch profile.
  // This covers the page-refresh / new-tab scenario.
  useEffect(() => {
    if (isAuthenticated && !role) {
      dispatch(fetchCurrentUser());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Patient dashboard */}
        <Route path="/dashboard"
          element={<RoleRoute allowedRole="user"><Dashboard /></RoleRoute>} />

        {/* AI chat */}
        <Route path="/chat"
          element={<RoleRoute allowedRole="user"><AIHealthAssistant onBack={() => window.history.back()} /></RoleRoute>} />

        {/* Doctor dashboard */}
        <Route path="/doctor/dashboard"
          element={<RoleRoute allowedRole="doctor"><DoctorDashboardPlaceholder /></RoleRoute>} />

        {/* Admin dashboard */}
        <Route path="/admin/dashboard"
          element={<RoleRoute allowedRole="admin"><AdminDashboardPlaceholder /></RoleRoute>} />

        {/* Fallback */}
        <Route path="/"  element={<Navigate to="/login" replace />} />
        <Route path="*"  element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;