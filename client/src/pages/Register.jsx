import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  signupUser,
  signupDoctor,
  clearError,
  clearSuccess,
  selectAuthLoading,
  selectAuthError,
  selectAuthSuccess,
} from "../redux/auth/authSlice";

// ─── Eye Icon ──────────────────────────────────────────────────────────────────
const EyeIcon = ({ open }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
    ) : (
      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
    )}
  </svg>
);

// ─── Reusable Field ────────────────────────────────────────────────────────────
const Field = ({ id, label, type = "text", name, value, onChange, placeholder, error, icon, hint, required }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div style={s.fieldGroup}>
      <label htmlFor={id} style={s.label}>
        {label}
        {required && <span style={s.required}> *</span>}
      </label>
      <div style={s.inputWrapper}>
        {icon && <span style={s.inputIcon}>{icon}</span>}
        <input
          id={id}
          name={name}
          type={isPassword && !show ? "password" : isPassword ? "text" : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          style={{
            ...s.input,
            paddingLeft: icon ? "42px" : "13px",
            paddingRight: isPassword ? "44px" : "13px",
            ...(error ? s.inputError : {}),
          }}
          autoComplete={isPassword ? "new-password" : undefined}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow((p) => !p)} style={s.eyeBtn} aria-label="Toggle password">
            <EyeIcon open={show} />
          </button>
        )}
      </div>
      {error && <span style={s.errorMsg}>{error}</span>}
      {hint && !error && <span style={s.hint}>{hint}</span>}
    </div>
  );
};

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
const icons = {
  user: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  email: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  phone: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  lock: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  steth: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" /><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" /><circle cx="20" cy="10" r="2" /></svg>,
  id: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="14" y2="14" /></svg>,
};

// ─── User Form ─────────────────────────────────────────────────────────────────
function UserForm() {
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const success = useSelector(selectAuthSuccess);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    phone: "", dateOfBirth: "", gender: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (success) setTimeout(() => navigate("/login"), 2000);
  }, [success, navigate]);

  const handle = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((p) => ({ ...p, [name]: "" }));
    if (error) dispatch(clearError());
  };

  const validate = () => {
    const err = {};
    if (!form.name.trim()) err.name = "Name is required";
    else if (form.name.trim().length < 2) err.name = "At least 2 characters";
    if (!form.email.trim()) err.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) err.email = "Enter a valid email";
    if (!form.password) err.password = "Password is required";
    else if (form.password.length < 8) err.password = "At least 8 characters";
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^])/.test(form.password))
      err.password = "Must have uppercase, lowercase, number & special char";
    if (!form.confirmPassword) err.confirmPassword = "Please confirm password";
    else if (form.password !== form.confirmPassword) err.confirmPassword = "Passwords do not match";
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone))
      err.phone = "Enter valid 10-digit Indian number";
    return err;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) return setFieldErrors(errs);
    const { confirmPassword, ...payload } = form;
    const clean = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== ""));
    dispatch(signupUser(clean));
  };

  return (
    <form onSubmit={handleSubmit} noValidate style={s.form}>
      {error && <div style={s.alertError}><span>⚠️</span> {error}</div>}
      {success && <div style={s.alertSuccess}><span>✅</span> {success}</div>}

      <div style={s.twoCol}>
        <Field id="u-name" label="Full Name" name="name" value={form.name} onChange={handle} placeholder="John Doe" error={fieldErrors.name} icon={icons.user} required />
        <Field id="u-email" label="Email Address" type="email" name="email" value={form.email} onChange={handle} placeholder="you@example.com" error={fieldErrors.email} icon={icons.email} required />
      </div>
      <div style={s.twoCol}>
        <Field id="u-password" label="Password" type="password" name="password" value={form.password} onChange={handle} placeholder="Min 8 chars" error={fieldErrors.password} icon={icons.lock} required hint="Uppercase, lowercase, number & special char (@$!%*?&#^)" />
        <Field id="u-confirm" label="Confirm Password" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handle} placeholder="Repeat password" error={fieldErrors.confirmPassword} icon={icons.lock} required />
      </div>
      <div style={s.twoCol}>
        <Field id="u-phone" label="Phone (Optional)" name="phone" value={form.phone} onChange={handle} placeholder="10-digit mobile" error={fieldErrors.phone} icon={icons.phone} />
        <Field id="u-dob" label="Date of Birth (Optional)" type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handle} />
      </div>

      {/* Gender */}
      <div style={s.fieldGroup}>
        <label style={s.label}>Gender (Optional)</label>
        <div style={s.genderRow}>
          {["male", "female", "other"].map((g) => (
            <label key={g} htmlFor={`gender-${g}`} style={{ ...s.genderOpt, ...(form.gender === g ? s.genderOptActive : {}) }}>
              <input id={`gender-${g}`} type="radio" name="gender" value={g} checked={form.gender === g} onChange={handle} style={{ display: "none" }} />
              {g === "male" ? "Male" : g === "female" ? "Female" : "Other"}
            </label>
          ))}
        </div>
      </div>

      <button id="user-register-btn" type="submit" disabled={loading}
        style={{ ...s.submitBtn, opacity: loading ? 0.8 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <span style={s.loadingRow}><span style={s.spinner} /> Creating Account...</span> : "Create Account"}
      </button>
    </form>
  );
}

// ─── Doctor Form ───────────────────────────────────────────────────────────────
function DoctorForm() {
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const success = useSelector(selectAuthSuccess);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    phone: "", specialization: "", licenseNumber: "",
    experience: "", qualifications: "", clinicAddress: "",
    consultationFee: "", about: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (success) setTimeout(() => navigate("/login"), 2500);
  }, [success, navigate]);

  const handle = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((p) => ({ ...p, [name]: "" }));
    if (error) dispatch(clearError());
  };

  const validate = () => {
    const err = {};
    if (!form.name.trim()) err.name = "Name is required";
    if (!form.email.trim()) err.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) err.email = "Enter a valid email";
    if (!form.password) err.password = "Password is required";
    else if (form.password.length < 8) err.password = "At least 8 characters";
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^])/.test(form.password))
      err.password = "Must have uppercase, lowercase, number & special char";
    if (!form.confirmPassword) err.confirmPassword = "Confirm your password";
    else if (form.password !== form.confirmPassword) err.confirmPassword = "Passwords do not match";
    if (!form.phone) err.phone = "Phone is required";
    else if (!/^[6-9]\d{9}$/.test(form.phone)) err.phone = "Enter valid 10-digit Indian number";
    if (!form.specialization.trim()) err.specialization = "Specialization is required";
    if (!form.licenseNumber.trim()) err.licenseNumber = "License number is required";
    if (form.experience === "") err.experience = "Experience is required";
    else if (isNaN(form.experience) || Number(form.experience) < 0) err.experience = "Enter valid years";
    if (!form.qualifications.trim()) err.qualifications = "At least one qualification required";
    return err;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) return setFieldErrors(errs);
    const { confirmPassword, qualifications, experience, consultationFee, ...rest } = form;
    const payload = {
      ...rest,
      experience: Number(experience),
      qualifications: qualifications.split(",").map((q) => q.trim()).filter(Boolean),
      ...(consultationFee !== "" ? { consultationFee: Number(consultationFee) } : {}),
    };
    const clean = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== "" && v !== undefined));
    dispatch(signupDoctor(clean));
  };

  return (
    <form onSubmit={handleSubmit} noValidate style={s.form}>
      {error && <div style={s.alertError}><span>⚠️</span> {error}</div>}
      {success && <div style={s.alertSuccess}><span>✅</span> {success} Redirecting to login...</div>}

      <div style={s.sectionLabel}>Personal Information</div>
      <div style={s.twoCol}>
        <Field id="d-name" label="Full Name" name="name" value={form.name} onChange={handle} placeholder="Dr. John Doe" error={fieldErrors.name} icon={icons.user} required />
        <Field id="d-email" label="Email Address" type="email" name="email" value={form.email} onChange={handle} placeholder="doctor@example.com" error={fieldErrors.email} icon={icons.email} required />
      </div>
      <div style={s.twoCol}>
        <Field id="d-password" label="Password" type="password" name="password" value={form.password} onChange={handle} placeholder="Min 8 chars" error={fieldErrors.password} icon={icons.lock} required />
        <Field id="d-confirm" label="Confirm Password" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handle} placeholder="Repeat password" error={fieldErrors.confirmPassword} icon={icons.lock} required />
      </div>
      <div style={s.twoCol}>
        <Field id="d-phone" label="Phone" name="phone" value={form.phone} onChange={handle} placeholder="10-digit mobile" error={fieldErrors.phone} icon={icons.phone} required />
        <Field id="d-exp" label="Years of Experience" type="number" name="experience" value={form.experience} onChange={handle} placeholder="e.g. 5" error={fieldErrors.experience} required />
      </div>

      <div style={s.sectionLabel}>Professional Information</div>
      <div style={s.twoCol}>
        <Field id="d-spec" label="Specialization" name="specialization" value={form.specialization} onChange={handle} placeholder="e.g. Cardiologist" error={fieldErrors.specialization} icon={icons.steth} required />
        <Field id="d-lic" label="Medical License No." name="licenseNumber" value={form.licenseNumber} onChange={handle} placeholder="e.g. MCI12345" error={fieldErrors.licenseNumber} icon={icons.id} required />
      </div>
      <Field id="d-qual" label="Qualifications" name="qualifications" value={form.qualifications} onChange={handle} placeholder="MBBS, MD, DNB (comma-separated)" error={fieldErrors.qualifications} required hint="Separate multiple qualifications with commas" />
      <div style={s.twoCol}>
        <Field id="d-fee" label="Consultation Fee (₹)" type="number" name="consultationFee" value={form.consultationFee} onChange={handle} placeholder="e.g. 500" />
        <Field id="d-clinic" label="Clinic Address" name="clinicAddress" value={form.clinicAddress} onChange={handle} placeholder="City, State" />
      </div>

      <div style={s.fieldGroup}>
        <label htmlFor="d-about" style={s.label}>About (Optional)</label>
        <textarea id="d-about" name="about" value={form.about} onChange={handle}
          placeholder="Brief description about your practice..." rows={3} style={s.textarea} />
      </div>

      <div style={s.noticeBox}>
        <span style={{ fontSize: "15px", flexShrink: 0 }}>ℹ️</span>
        <span>Doctor accounts require admin approval before activation. You&apos;ll receive a confirmation once reviewed.</span>
      </div>

      <button id="doctor-register-btn" type="submit" disabled={loading}
        style={{ ...s.submitBtn, opacity: loading ? 0.8 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <span style={s.loadingRow}><span style={s.spinner} /> Submitting...</span> : "Submit Registration"}
      </button>
    </form>
  );
}

// ─── Main Register Page ────────────────────────────────────────────────────────
export default function Register() {
  const [activeTab, setActiveTab] = useState("user");
  const dispatch = useDispatch();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    dispatch(clearError());
    dispatch(clearSuccess());
  };

  return (
    <div style={s.page}>
      <div style={s.topAccent} />

      <div style={s.wrapper}>
        {/* Header */}
        <div style={s.header}>
          <Link to="/login" style={s.backBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12,19 5,12 12,5" />
            </svg>
            Back to Login
          </Link>
          <div style={s.logoRow}>
            <div style={s.logoIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span style={s.logoText}>CureLiynk</span>
          </div>
        </div>

        {/* Card */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h1 style={s.cardTitle}>Create your account</h1>
            <p style={s.cardSubtitle}>Join thousands of patients and doctors on CureLiynk</p>
          </div>

          {/* Tabs */}
          <div style={s.tabRow}>
            <button id="tab-patient" onClick={() => handleTabChange("user")}
              style={{ ...s.tab, ...(activeTab === "user" ? s.tabActive : {}) }} aria-selected={activeTab === "user"}>
              Patient
            </button>
            <button id="tab-doctor" onClick={() => handleTabChange("doctor")}
              style={{ ...s.tab, ...(activeTab === "doctor" ? s.tabActive : {}) }} aria-selected={activeTab === "doctor"}>
              Doctor
            </button>
          </div>

          <div style={s.tabDesc}>
            {activeTab === "user"
              ? "Register as a patient to book appointments, manage health records and consult doctors."
              : "Register as a doctor. Your profile will be reviewed by our admin team before going live."}
          </div>

          {activeTab === "user" ? <UserForm /> : <DoctorForm />}

          <p style={s.switchText}>
            Already have an account?{" "}
            <Link to="/login" style={s.switchLink}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fa",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "32px 16px 56px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    position: "relative",
  },
  topAccent: {
    position: "fixed",
    top: 0, left: 0, right: 0,
    height: "4px",
    background: "linear-gradient(90deg, #16a34a, #22c55e, #4ade80)",
    zIndex: 100,
  },
  wrapper: {
    width: "100%",
    maxWidth: "820px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    color: "#64748b",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "600",
    padding: "8px 14px",
    background: "white",
    borderRadius: "9px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    transition: "all 0.18s",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoIcon: {
    width: "38px",
    height: "38px",
    background: "linear-gradient(135deg, #16a34a, #15803d)",
    borderRadius: "11px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(22,163,74,0.3)",
  },
  logoText: {
    color: "#0f172a",
    fontSize: "19px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
  },
  card: {
    background: "#ffffff",
    borderRadius: "20px",
    border: "1px solid #e8edf3",
    boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
    padding: "40px 40px 36px",
    display: "flex",
    flexDirection: "column",
    gap: "22px",
  },
  cardHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: "24px",
    fontWeight: "800",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  cardSubtitle: {
    color: "#64748b",
    fontSize: "14px",
    margin: 0,
  },
  tabRow: {
    display: "flex",
    gap: "8px",
    background: "#f1f5f9",
    padding: "5px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },
  tab: {
    flex: 1,
    padding: "11px 20px",
    background: "transparent",
    border: "none",
    borderRadius: "9px",
    color: "#94a3b8",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.18s ease",
    fontFamily: "inherit",
  },
  tabActive: {
    background: "#ffffff",
    color: "#16a34a",
    boxShadow: "0 1px 6px rgba(0,0,0,0.1)",
  },
  tabDesc: {
    color: "#64748b",
    fontSize: "13.5px",
    background: "#f8fafc",
    border: "1px solid #e8edf3",
    borderRadius: "10px",
    padding: "12px 16px",
    lineHeight: 1.6,
    marginTop: "-8px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  sectionLabel: {
    color: "#16a34a",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    borderBottom: "1px solid #dcfce7",
    paddingBottom: "8px",
    marginTop: "4px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    color: "#374151",
    fontSize: "13px",
    fontWeight: "600",
  },
  required: {
    color: "#dc2626",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "13px",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    pointerEvents: "none",
    zIndex: 1,
  },
  input: {
    width: "100%",
    padding: "11px 13px",
    background: "#f8fafc",
    border: "1.5px solid #e2e8f0",
    borderRadius: "10px",
    color: "#0f172a",
    fontSize: "13.5px",
    outline: "none",
    transition: "all 0.18s ease",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  inputError: {
    borderColor: "#fca5a5",
    background: "#fef2f2",
  },
  eyeBtn: {
    position: "absolute",
    right: "11px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    padding: "4px",
    borderRadius: "6px",
    zIndex: 1,
  },
  errorMsg: {
    color: "#dc2626",
    fontSize: "11.5px",
  },
  hint: {
    color: "#94a3b8",
    fontSize: "11px",
    lineHeight: 1.4,
  },
  genderRow: {
    display: "flex",
    gap: "10px",
  },
  genderOpt: {
    flex: 1,
    textAlign: "center",
    padding: "10px",
    background: "#f8fafc",
    border: "1.5px solid #e2e8f0",
    borderRadius: "10px",
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.18s",
    userSelect: "none",
  },
  genderOptActive: {
    background: "#f0fdf4",
    borderColor: "#86efac",
    color: "#16a34a",
    fontWeight: "600",
  },
  textarea: {
    width: "100%",
    padding: "11px 13px",
    background: "#f8fafc",
    border: "1.5px solid #e2e8f0",
    borderRadius: "10px",
    color: "#0f172a",
    fontSize: "13.5px",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    transition: "all 0.18s",
    boxSizing: "border-box",
    minHeight: "78px",
  },
  noticeBox: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "10px",
    padding: "12px 14px",
    color: "#3b82f6",
    fontSize: "13px",
    lineHeight: 1.6,
  },
  alertError: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "11px 14px",
    color: "#dc2626",
    fontSize: "13px",
  },
  alertSuccess: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "10px",
    padding: "11px 14px",
    color: "#16a34a",
    fontSize: "13px",
  },
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
    boxShadow: "0 4px 16px rgba(22,163,74,0.28)",
    marginTop: "4px",
    fontFamily: "inherit",
    letterSpacing: "0.2px",
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  spinner: {
    width: "17px",
    height: "17px",
    border: "2.5px solid rgba(255,255,255,0.35)",
    borderTopColor: "white",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 0.8s linear infinite",
  },
  switchText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "13px",
    margin: 0,
    paddingTop: "4px",
  },
  switchLink: {
    color: "#16a34a",
    textDecoration: "none",
    fontWeight: "600",
  },
};
