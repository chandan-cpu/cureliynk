import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  login,
  clearError,
  clearSuccess,
  selectAuthLoading,
  selectAuthError,
  selectAuthSuccess,
  selectIsAuthenticated,
  selectUserRole,
} from "../redux/auth/authSlice";

const EyeIcon = ({ open }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
    ) : (
      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
    )}
  </svg>
);

// Role → dashboard route mapping
const ROLE_ROUTES = {
  user: "/dashboard",
  doctor: "/doctor/dashboard",
  admin: "/admin/dashboard",
};

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const success = useSelector(selectAuthSuccess);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const userRole = useSelector(selectUserRole);

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Redirect after login based on role
  useEffect(() => {
    if (isAuthenticated && userRole) {
      const route = ROLE_ROUTES[userRole] || "/dashboard";
      navigate(route, { replace: true });
    }
  }, [isAuthenticated, userRole, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearSuccess());
    };
  }, [dispatch]);

  const validate = () => {
    const errors = {};
    if (!form.email.trim()) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = "Enter a valid email";
    if (!form.password) errors.password = "Password is required";
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    if (error) dispatch(clearError());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) return setFieldErrors(errors);
    dispatch(login(form));
  };

  return (
    <div style={styles.page}>
      <div style={styles.topAccent} />

      <div style={styles.container}>
        {/* ── Left Panel ── */}
        <div style={styles.leftPanel}>
          <div style={styles.leftContent}>
            <div style={styles.logoRow}>
              <div style={styles.logoIcon}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <span style={styles.logoText}>CureLiynk</span>
            </div>

            <div style={styles.leftMain}>
              <h1 style={styles.leftTitle}>Your Health,<br />Our Priority</h1>
              <p style={styles.leftSubtitle}>
                Connect with certified doctors, manage appointments, and access
                your health records — all in one secure platform.
              </p>

              <div style={styles.featureList}>
                {[
                  "Book appointments instantly",
                  "Secure & encrypted health data",
                  "Digital prescriptions & records",
                  "AI-powered health assistant",
                ].map((feat) => (
                  <div key={feat} style={styles.featureItem}>
                    <span style={styles.featureDot} />
                    <span style={styles.featureText}>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.leftFooter}>
              <div style={styles.statsRow}>
                {[
                  { num: "50K+", label: "Patients" },
                  { num: "2K+", label: "Doctors" },
                  { num: "4.9★", label: "Rating" },
                ].map((stat) => (
                  <div key={stat.label} style={styles.stat}>
                    <span style={styles.statNum}>{stat.num}</span>
                    <span style={styles.statLabel}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div style={styles.rightPanel}>
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <h2 style={styles.formTitle}>Welcome back</h2>
              <p style={styles.formSubtitle}>
                Sign in with your email and password — your role is detected automatically.
              </p>
            </div>

            {/* Error / Success */}
            {error && (
              <div style={styles.alertError}>
                <span style={styles.alertIcon}>⚠️</span>
                {error}
              </div>
            )}
            {success && (
              <div style={styles.alertSuccess}>
                <span style={styles.alertIcon}>✅</span>
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate style={styles.form}>
              {/* Email */}
              <div style={styles.fieldGroup}>
                <label htmlFor="login-email" style={styles.label}>
                  Email Address
                </label>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    style={{ ...styles.input, ...(fieldErrors.email ? styles.inputError : {}) }}
                    autoComplete="email"
                  />
                </div>
                {fieldErrors.email && <span style={styles.errorMsg}>{fieldErrors.email}</span>}
              </div>

              {/* Password */}
              <div style={styles.fieldGroup}>
                <div style={styles.labelRow}>
                  <label htmlFor="login-password" style={styles.label}>Password</label>
                  <a href="#" style={styles.forgotLink}>Forgot password?</a>
                </div>
                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    style={{ ...styles.input, paddingRight: "48px", ...(fieldErrors.password ? styles.inputError : {}) }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    style={styles.eyeBtn}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                {fieldErrors.password && <span style={styles.errorMsg}>{fieldErrors.password}</span>}
              </div>

              {/* Submit */}
              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                style={{ ...styles.submitBtn, opacity: loading ? 0.8 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              >
                {loading ? (
                  <span style={styles.loadingRow}>
                    <span style={styles.spinner} />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Info note */}
            <div style={styles.infoNote}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: "1px" }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Your dashboard will open automatically based on your registered role (Patient, Doctor, or Admin).
            </div>

            <p style={styles.switchText}>
              Don&apos;t have an account?{" "}
              <Link to="/register" style={styles.switchLink}>Create one free</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fa",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  topAccent: {
    position: "fixed",
    top: 0, left: 0, right: 0,
    height: "4px",
    background: "linear-gradient(90deg, #16a34a, #22c55e, #4ade80)",
    zIndex: 100,
  },
  container: {
    display: "flex",
    width: "100%",
    maxWidth: "960px",
    minHeight: "540px",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 8px 48px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.07)",
    flexWrap: "wrap",
  },

  /* Left */
  leftPanel: {
    flex: "1 1 360px",
    background: "linear-gradient(160deg, #16a34a 0%, #15803d 45%, #14532d 100%)",
    padding: "48px 40px",
    display: "flex",
    flexDirection: "column",
  },
  leftContent: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    gap: "32px",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logoIcon: {
    width: "46px", height: "46px",
    background: "rgba(255,255,255,0.18)",
    borderRadius: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "white",
    fontSize: "22px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
  },
  leftMain: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  leftTitle: {
    color: "white",
    fontSize: "34px",
    fontWeight: "800",
    lineHeight: 1.15,
    letterSpacing: "-1px",
    margin: 0,
  },
  leftSubtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: "14.5px",
    lineHeight: 1.7,
    margin: 0,
  },
  featureList: {
    display: "flex",
    flexDirection: "column",
    gap: "11px",
    marginTop: "4px",
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  featureDot: {
    width: "7px", height: "7px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.7)",
    flexShrink: 0,
  },
  featureText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: "14px",
    fontWeight: "500",
  },
  leftFooter: {
    borderTop: "1px solid rgba(255,255,255,0.18)",
    paddingTop: "24px",
  },
  statsRow: { display: "flex", gap: "32px" },
  stat: { display: "flex", flexDirection: "column", gap: "2px" },
  statNum: { color: "white", fontSize: "22px", fontWeight: "800" },
  statLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  /* Right */
  rightPanel: {
    flex: "1 1 360px",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 44px",
  },
  formCard: {
    width: "100%",
    maxWidth: "380px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  formHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  formTitle: {
    color: "#0f172a",
    fontSize: "26px",
    fontWeight: "800",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  formSubtitle: {
    color: "#64748b",
    fontSize: "13.5px",
    margin: 0,
    lineHeight: 1.6,
  },

  /* Alerts */
  alertError: {
    display: "flex", alignItems: "center", gap: "10px",
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: "10px", padding: "11px 14px",
    color: "#dc2626", fontSize: "13px", lineHeight: 1.5,
  },
  alertSuccess: {
    display: "flex", alignItems: "center", gap: "10px",
    background: "#f0fdf4", border: "1px solid #bbf7d0",
    borderRadius: "10px", padding: "11px 14px",
    color: "#16a34a", fontSize: "13px", lineHeight: 1.5,
  },
  alertIcon: { fontSize: "15px", flexShrink: 0 },

  /* Form */
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "7px" },
  label: { color: "#374151", fontSize: "13px", fontWeight: "600" },
  labelRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  forgotLink: { color: "#16a34a", fontSize: "12.5px", textDecoration: "none", fontWeight: "500" },
  inputWrapper: { position: "relative", display: "flex", alignItems: "center" },
  inputIcon: {
    position: "absolute", left: "13px",
    color: "#94a3b8",
    display: "flex", alignItems: "center",
    pointerEvents: "none", zIndex: 1,
  },
  input: {
    width: "100%",
    padding: "12px 14px 12px 42px",
    background: "#f8fafc",
    border: "1.5px solid #e2e8f0",
    borderRadius: "11px",
    color: "#0f172a",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.18s ease",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  inputError: { borderColor: "#fca5a5", background: "#fef2f2" },
  eyeBtn: {
    position: "absolute", right: "12px",
    background: "transparent", border: "none",
    cursor: "pointer", color: "#94a3b8",
    display: "flex", alignItems: "center",
    padding: "4px", borderRadius: "6px", zIndex: 1,
  },
  errorMsg: { color: "#dc2626", fontSize: "12px" },
  submitBtn: {
    width: "100%",
    padding: "13px",
    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
    border: "none",
    borderRadius: "11px",
    color: "white",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.18s ease",
    letterSpacing: "0.2px",
    boxShadow: "0 4px 16px rgba(22,163,74,0.28)",
    marginTop: "2px",
    fontFamily: "inherit",
  },
  loadingRow: {
    display: "flex", alignItems: "center",
    justifyContent: "center", gap: "10px",
  },
  spinner: {
    width: "17px", height: "17px",
    border: "2.5px solid rgba(255,255,255,0.35)",
    borderTopColor: "white",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 0.8s linear infinite",
  },
  infoNote: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "10px",
    padding: "11px 14px",
    color: "#15803d",
    fontSize: "12.5px",
    lineHeight: 1.6,
  },
  switchText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "13px",
    margin: 0,
  },
  switchLink: {
    color: "#16a34a",
    textDecoration: "none",
    fontWeight: "600",
  },
};
