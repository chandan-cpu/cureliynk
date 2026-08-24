import { useState } from "react";
import {
  Home, ChevronDown, Stethoscope, Leaf, Baby,
  UserRound, BriefcaseMedical, FlaskConical, FileText,
  CalendarDays, Pill, Bot, MessageSquare, Gift,
  ShieldCheck, Settings, Crown, X,
} from "lucide-react";
import { useLang } from "../../i18n/LanguageContext";

export default function Sidebar({ isOpen = true, onClose }) {
  const { t } = useLang();
  const [openSections, setOpenSections] = useState({ "health-care": true });
  const [activeLabel, setActiveLabel] = useState("dashboard");

  const handleSelect = (key) => {
    setActiveLabel(key);
    if (onClose) onClose();
  };

  const toggleSection = (id) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

  const HEALTH_CARE_ITEMS = [
    { key: "allopathy", icon: <Stethoscope size={17} /> },
    { key: "homeopathy", icon: <Leaf size={17} /> },
    { key: "ayurvedic",  icon: <Leaf size={17} /> },
  ];

  const MAIN_ITEMS = [
    { key: "childCare",         icon: <Baby size={18} /> },
    { key: "elderCare",         icon: <UserRound size={18} /> },
    { key: "medicalProducts",   icon: <BriefcaseMedical size={18} /> },
    { key: "labTests",          icon: <FlaskConical size={18} /> },
    { key: "healthRecords",     icon: <FileText size={18} /> },
    { key: "appointments",      icon: <CalendarDays size={18} /> },
    { key: "prescriptions",     icon: <Pill size={18} /> },
    { key: "aiHealthAssistant", icon: <Bot size={18} />, badge: "New" },
    { key: "messages",          icon: <MessageSquare size={18} />, count: 2 },
    { key: "offersRewards",     icon: <Gift size={18} /> },
    { key: "insurance",         icon: <ShieldCheck size={18} /> },
    { key: "settings",          icon: <Settings size={18} /> },
  ];

  const isHCOpen = Boolean(openSections["health-care"]);

  return (
    <aside
      className={`w-[260px] border-r border-gray-200 bg-white flex flex-col justify-between p-4 min-h-screen transform transition-transform duration-300 fixed inset-y-0 left-0 z-[60] md:static md:translate-x-0 md:z-auto ${
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      }`}
    >
      {/* TOP */}
      <div>
        {/* LOGO */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center shadow-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold leading-4 text-gray-800">CureLiynk</p>
            <p className="text-xs text-gray-500">Health Platform</p>
          </div>
          <button type="button" onClick={onClose}
            className="ml-auto p-2 text-gray-500 hover:text-gray-700 md:hidden" aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>

        {/* Dashboard */}
        <div
          onClick={() => handleSelect("dashboard")}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium cursor-pointer transition mb-2 ${
            activeLabel === "dashboard" ? "bg-green-50 text-green-700" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Home size={18} />
          <span className="text-sm font-medium">{t("dashboard")}</span>
        </div>

        {/* Health Care (collapsible) */}
        <div className="mt-3">
          <button type="button" onClick={() => toggleSection("health-care")}
            className="w-full flex items-center justify-between px-2 py-2 text-gray-700 cursor-pointer">
            <div className="flex items-center gap-3">
              <BriefcaseMedical size={18} />
              <span className="font-medium text-sm">{t("healthCare")}</span>
            </div>
            <ChevronDown size={16} className={`transition-transform ${isHCOpen ? "rotate-180" : "rotate-0"}`} />
          </button>

          {isHCOpen && (
            <div className="ml-8 mt-2 space-y-3">
              {HEALTH_CARE_ITEMS.map((item) => (
                <div key={item.key} onClick={() => handleSelect(item.key)}
                  className={`flex items-center gap-3 cursor-pointer transition text-sm ${
                    activeLabel === item.key ? "text-green-600 font-semibold" : "text-gray-600 hover:text-green-600"
                  }`}
                >
                  {item.icon}
                  <span>{t(item.key)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main items */}
        <div className="mt-4 space-y-1">
          {MAIN_ITEMS.map((item) => {
            const isActive = activeLabel === item.key;
            return (
              <div key={item.key} onClick={() => handleSelect(item.key)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition ${
                  isActive ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="text-sm font-medium">{t(item.key)}</span>
                </div>
                {item.badge && (
                  <span className="bg-green-100 text-green-600 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                    {item.badge}
                  </span>
                )}
                {item.count && (
                  <span className="bg-green-100 text-green-700 text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                    {item.count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* PREMIUM CARD */}
      <div className="bg-green-50 rounded-2xl p-5 mt-6 border border-green-100">
        <h3 className="text-gray-900 font-semibold text-base">{t("upgradePremium")}</h3>
        <p className="text-sm text-gray-500 mt-2 leading-5">{t("unlockBenefits")}</p>
        <button className="mt-4 w-full bg-green-500 hover:bg-green-600 transition text-white py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium shadow-sm text-sm">
          <Crown size={16} />
          {t("upgradeNow")}
        </button>
      </div>
    </aside>
  );
}