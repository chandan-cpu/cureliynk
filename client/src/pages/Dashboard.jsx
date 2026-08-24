import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Sunrise, Sun, Moon, Droplet, Salad, Footprints, Flower2,
  ClipboardList, FlaskConical, CheckCircle2, Pill,
  Stethoscope, Video, FolderOpen, Siren,
  Calendar, Clock, Hospital, HeartPulse,
} from "lucide-react";
import { selectUser } from "../redux/auth/authSlice";
import { useLang } from "../i18n/LanguageContext";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";

// ── Greeting based on time ──────────────────────────────────────────────────
function getGreetingKey() {
  const h = new Date().getHours();
  if (h < 12) return "goodMorning";
  if (h < 17) return "goodAfternoon";
  return "goodEvening";
}

// ── Greeting icon ───────────────────────────────────────────────────────────
function getGreetingIcon() {
  const h = new Date().getHours();
  if (h < 12) return { Icon: Sunrise, color: "#f59e0b" };
  if (h < 17) return { Icon: Sun, color: "#eab308" };
  return { Icon: Moon, color: "#6366f1" };
}

// ── Mock data ───────────────────────────────────────────────────────────────
const APPOINTMENTS = [
  {
    id: 1,
    doctor: "Dr. Priya Sharma",
    specialty: "Cardiologist",
    date: "Today",
    time: "10:30 AM",
    type: "online",
    status: "confirmed",
    avatar: "PS",
    avatarBg: "#16a34a",
  },
  {
    id: 2,
    doctor: "Dr. Rajan Bora",
    specialty: "Dermatologist",
    date: "Tomorrow",
    time: "02:00 PM",
    type: "offline",
    status: "pending",
    avatar: "RB",
    avatarBg: "#2563eb",
  },
  {
    id: 3,
    doctor: "Dr. Mita Das",
    specialty: "Pediatrician",
    date: "12 Jul",
    time: "11:00 AM",
    type: "online",
    status: "confirmed",
    avatar: "MD",
    avatarBg: "#7c3aed",
  },
];

const HEALTH_TIPS = [
  { icon: Droplet, tip: { en: "Drink at least 8 glasses of water daily to stay hydrated.", as: "প্ৰতিদিনে কমেও ৮ গিলাছ পানী পান কৰক।" } },
  { icon: Salad, tip: { en: "Eat more fruits and vegetables for a balanced diet.", as: "সুষম আহাৰৰ বাবে অধিক ফল আৰু শাক-পাচলি খাওক।" } },
  { icon: Footprints, tip: { en: "Walk at least 30 minutes every day to stay active.", as: "সক্ৰিয় থাকিবলৈ প্ৰতিদিনে কমেও ৩০ মিনিট খোজ কাঢ়ক।" } },
  { icon: Moon, tip: { en: "Get 7–8 hours of quality sleep every night.", as: "প্ৰতি ৰাতি ৭–৮ ঘণ্টা মানসম্পন্ন টোপনি লওক।" } },
  { icon: Flower2, tip: { en: "Practice meditation or yoga to reduce stress.", as: "মানসিক চাপ কমাবলৈ ধ্যান বা যোগ অভ্যাস কৰক।" } },
];

const ACTIVITY = [
  { icon: ClipboardList, text: { en: "Prescription uploaded by Dr. Priya Sharma", as: "ডা. প্ৰিয়া শৰ্মাই প্ৰেছক্ৰিপচন আপলোড কৰিলে" }, time: "2h ago" },
  { icon: FlaskConical, text: { en: "Lab test results available", as: "লেব পৰীক্ষাৰ ফলাফল উপলব্ধ" }, time: "5h ago" },
  { icon: CheckCircle2, text: { en: "Appointment confirmed with Dr. Rajan Bora", as: "ডা. ৰাজন বৰাৰ সৈতে অ্যাপয়েন্টমেণ্ট নিশ্চিত হ'ল" }, time: "1d ago" },
  { icon: Pill, text: { en: "Medicine reminder: Take Metformin 500mg", as: "দৰবৰ সোঁৱৰণি: মেটফৰমিন ৫০০মিগ্ৰা গ্ৰহণ কৰক" }, time: "1d ago" },
];

const QUICK_ACTIONS = [
  { key: "findDoctor",      icon: Stethoscope, color: "#dcfce7", iconColor: "#16a34a" },
  { key: "orderMedicines",  icon: Pill,        color: "#eff6ff", iconColor: "#2563eb" },
  { key: "bookLabTest",     icon: FlaskConical,color: "#fdf4ff", iconColor: "#9333ea" },
  { key: "videoConsult",    icon: Video,       color: "#fff7ed", iconColor: "#ea580c" },
  { key: "viewRecords",     icon: FolderOpen,  color: "#f0fdf4", iconColor: "#059669" },
  { key: "emergencyHelp",   icon: Siren,       color: "#fef2f2", iconColor: "#dc2626" },
];

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, pulse }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `3px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ ...styles.statIcon, background: color + "30" }}>
          <Icon size={20} color={color} />
        </div>
        {pulse && (
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 0 3px rgba(34,197,94,0.25)", animation: "pulse 1.8s ease-in-out infinite" }} />
        )}
      </div>
      <div style={{ marginTop: "14px" }}>
        <div style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px", fontWeight: "500" }}>{label}</div>
        {sub && <div style={{ fontSize: "11.5px", color: color, fontWeight: "600", marginTop: "4px" }}>{sub}</div>}
      </div>
    </div>
  );
}

function AppointmentCard({ appt, t, lang }) {
  const statusColors = {
    confirmed: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
    pending:   { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
    cancelled: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  };
  const sc = statusColors[appt.status] || statusColors.confirmed;

  return (
    <div style={styles.apptCard}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: appt.avatarBg, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700", flexShrink: 0 }}>
          {appt.avatar}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{appt.doctor}</div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>{appt.specialty}</div>
        </div>
        <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, whiteSpace: "nowrap" }}>
          {t(appt.status)}
        </span>
      </div>
      <div style={{ display: "flex", gap: "16px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#475569" }}>
          <Calendar size={12} />
          <span>{appt.date === "Today" ? t("today") : appt.date === "Tomorrow" ? t("tomorrow") : appt.date}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#475569" }}>
          <Clock size={12} /><span>{appt.time}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: appt.type === "online" ? "#2563eb" : "#7c3aed" }}>
          {appt.type === "online" ? <Video size={12} /> : <Hospital size={12} />}
          <span>{t(appt.type)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────
const Dashboard = () => {
  const { t, lang } = useLang();
  const user = useSelector(selectUser);
  const userName = user?.name?.split(" ")[0] || "User";

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTipIdx, setCurrentTipIdx] = useState(0);
  const [animateTip, setAnimateTip] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen((p) => !p);
  const closeSidebar  = () => setIsSidebarOpen(false);

  // Rotate tips every 6 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setAnimateTip(false);
      setTimeout(() => {
        setCurrentTipIdx((p) => (p + 1) % HEALTH_TIPS.length);
        setAnimateTip(true);
      }, 300);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const currentTip = HEALTH_TIPS[currentTipIdx];
  const { Icon: GreetingIcon, color: greetingColor } = getGreetingIcon();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f7fa", position: "relative" }}>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <button type="button" aria-label="Close sidebar"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 55 }}
          onClick={closeSidebar}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Navbar onMenuClick={toggleSidebar} />

        {/* ── Main content ── */}
        <main style={{ flex: 1, padding: "24px 24px 40px", maxWidth: "1280px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>

          {/* ── Hero Banner ── */}
          <section style={styles.heroBanner}>
            <div style={styles.heroLeft}>
              <h1 style={{ ...styles.heroTitle, display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                {t(getGreetingKey())}, {userName}! <GreetingIcon size={26} color={greetingColor} />
              </h1>
              <p style={styles.heroSubtitle}>{t("heroSubtitle")}</p>
              <button style={styles.heroBtn}>{t("bookAppointment")}</button>
            </div>
            <div style={styles.heroRight}>
              <img src="/src/assets/images/side-image-hero.png"
                alt="Health illustration"
                style={{ width: "100%", maxWidth: "340px", objectFit: "contain" }}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            </div>
          </section>

          {/* ── Stats Row ── */}
          <section style={styles.statsGrid}>
            <StatCard icon={Calendar} label={t("upcomingAppointments")} value="3"  color="#16a34a" sub={t("viewAll")} pulse />
            <StatCard icon={Pill} label={t("activePrescriptions")}  value="5"  color="#2563eb" />
            <StatCard icon={HeartPulse} label={t("healthScore")}          value="87" color="#dc2626" sub={t("excellent")} />
            <StatCard icon={FlaskConical} label={t("labTestsDue")}           value="2"  color="#d97706" />
          </section>

          {/* ── Quick Actions ── */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>{t("quickActions")}</h2>
            <div style={styles.actionsGrid}>
              {QUICK_ACTIONS.map((a) => (
                <button key={a.key} type="button" style={{ ...styles.actionBtn, background: a.color }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <a.icon size={26} color={a.iconColor} />
                  <span style={{ fontSize: "12.5px", fontWeight: "600", color: a.iconColor, textAlign: "center", lineHeight: 1.3 }}>{t(a.key)}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Two-column: Appointments + Tip/Activity ── */}
          <div style={styles.twoCol}>

            {/* Appointments */}
            <section style={styles.section}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ ...styles.sectionTitle, margin: 0 }}>{t("yourAppointments")}</h2>
                <button style={styles.linkBtn}>{t("viewAll")} →</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {APPOINTMENTS.map((a) => (
                  <AppointmentCard key={a.id} appt={a} t={t} lang={lang} />
                ))}
              </div>
            </section>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

              {/* Health Tip Rotator */}
              <section style={styles.card}>
                <h2 style={styles.sectionTitle}>{t("healthTips")}</h2>
                <div style={{ ...styles.tipBox, opacity: animateTip ? 1 : 0, transform: animateTip ? "translateY(0)" : "translateY(8px)", transition: "all 0.3s ease" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
                    <currentTip.icon size={34} color="#16a34a" />
                  </div>
                  <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.7, fontWeight: "500" }}>
                    {currentTip.tip[lang] || currentTip.tip.en}
                  </p>
                </div>
                {/* Dot indicators */}
                <div style={{ display: "flex", gap: "6px", marginTop: "16px", justifyContent: "center" }}>
                  {HEALTH_TIPS.map((_, i) => (
                    <button key={i} type="button"
                      onClick={() => { setCurrentTipIdx(i); setAnimateTip(true); }}
                      style={{ width: i === currentTipIdx ? "20px" : "7px", height: "7px", borderRadius: "4px", border: "none", cursor: "pointer", background: i === currentTipIdx ? "#16a34a" : "#cbd5e1", transition: "all 0.25s ease", padding: 0 }}
                    />
                  ))}
                </div>
              </section>

              {/* Recent Activity */}
              <section style={styles.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h2 style={{ ...styles.sectionTitle, margin: 0 }}>{t("recentActivity")}</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {ACTIVITY.map((act, i) => (
                    <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <act.icon size={17} color="#475569" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "13px", color: "#374151", fontWeight: "500", lineHeight: 1.5, margin: 0 }}>
                          {act.text[lang] || act.text.en}
                        </p>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>{act.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  heroBanner: {
    background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 60%, #bbf7d0 100%)",
    borderRadius: "20px",
    padding: "36px 40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "24px",
    marginBottom: "24px",
    border: "1px solid #bbf7d0",
    overflow: "hidden",
    position: "relative",
  },
  heroLeft: { maxWidth: "420px", flex: 1 },
  heroTitle: { fontSize: "clamp(22px, 3vw, 32px)", fontWeight: "800", color: "#0f172a", margin: "0 0 10px", lineHeight: 1.2, letterSpacing: "-0.5px" },
  heroSubtitle: { fontSize: "14.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 20px" },
  heroBtn: {
    padding: "11px 24px",
    background: "linear-gradient(135deg, #16a34a, #15803d)",
    border: "none",
    borderRadius: "12px",
    color: "white",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(22,163,74,0.3)",
    fontFamily: "inherit",
    transition: "all 0.18s",
  },
  heroRight: { flexShrink: 0, display: "flex", justifyContent: "flex-end", alignItems: "center" },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  statCard: {
    background: "white",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
    border: "1px solid #f1f5f9",
    transition: "box-shadow 0.2s",
    cursor: "default",
  },
  statIcon: {
    width: "42px", height: "42px",
    borderRadius: "12px",
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  section: {
    background: "white",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
    border: "1px solid #f1f5f9",
    marginBottom: "0",
  },
  card: {
    background: "white",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
    border: "1px solid #f1f5f9",
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "16px",
  },

  actionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
  },
  actionBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "18px 10px",
    border: "none",
    borderRadius: "14px",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s ease",
  },

  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    alignItems: "start",
    marginTop: "24px",
  },

  apptCard: {
    background: "#fafafa",
    border: "1px solid #f1f5f9",
    borderRadius: "14px",
    padding: "14px",
    transition: "box-shadow 0.2s",
  },

  tipBox: {
    background: "#f0fdf4",
    borderRadius: "14px",
    padding: "20px",
    textAlign: "center",
    border: "1px solid #bbf7d0",
  },

  linkBtn: {
    background: "transparent",
    border: "none",
    color: "#16a34a",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "inherit",
  },
};

export default Dashboard;