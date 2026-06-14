// src/components/Sidebar.jsx

import { useState } from "react";
import {
  Home,
  ChevronDown,
  Stethoscope,
  Leaf,
  Baby,
  UserRound,
  BriefcaseMedical,
  FlaskConical,
  FileText,
  CalendarDays,
  Pill,
  Bot,
  MessageSquare,
  Gift,
  ShieldCheck,
  Settings,
  Crown,
  X,
} from "lucide-react";

const HEALTH_CARE_ITEMS = [
  { icon: <Stethoscope size={17} />, label: "Allopathy" },
  { icon: <Leaf size={17} />, label: "Homeopathy" },
  { icon: <Leaf size={17} />, label: "Ayurvedic" },
];

const MENU_SECTIONS = [
  {
    id: "dashboard",
    items: [{ icon: <Home size={18} />, label: "Dashboard" }],
  },
  {
    id: "health-care",
    title: "Health Care",
    icon: <BriefcaseMedical size={18} />,
    collapsible: true,
    items: HEALTH_CARE_ITEMS,
  },
  {
    id: "main",
    items: [
      { icon: <Baby size={18} />, label: "Child Care" },
      { icon: <UserRound size={18} />, label: "Elder Care" },
      { icon: <BriefcaseMedical size={18} />, label: "Medical Products" },
      { icon: <FlaskConical size={18} />, label: "Lab Tests" },
      { icon: <FileText size={18} />, label: "Health Records" },
      { icon: <CalendarDays size={18} />, label: "Appointments" },
      { icon: <Pill size={18} />, label: "Prescriptions" },
      {
        icon: <Bot size={18} />,
        label: "AI Health Assistant",
        badge: "New",
      },
      {
        icon: <MessageSquare size={18} />,
        label: "Messages",
        count: 2,
      },
      { icon: <Gift size={18} />, label: "Offers & Rewards" },
      { icon: <ShieldCheck size={18} />, label: "Insurance" },
      { icon: <Settings size={18} />, label: "Settings" },
    ],
  },
];

export default function Sidebar({ isOpen = true, onClose }) {
  const [openSections, setOpenSections] = useState({
    "health-care": true,
  });
  const [activeLabel, setActiveLabel] = useState("Dashboard");

  const handleSelect = (label) => {
    setActiveLabel(label);
    if (onClose) {
      onClose();
    }
  };

  const toggleSection = (sectionId) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  return (
    <aside
      className={`w-[260px] border-r border-gray-200 bg-white flex flex-col justify-between p-4 min-h-screen z-40 transform transition-transform duration-200 fixed inset-y-0 left-0 md:static md:translate-x-0 md:z-auto ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      
      {/* TOP */}
      <div>
        
        {/* LOGO */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center shadow-sm">
            <span className="text-white text-2xl font-bold">+</span>
          </div>

          <div>
            <h2 className="text-sm font-semibold leading-4 text-gray-800">
              Globalis tajlot.
            </h2>
            <p className="text-2xl font-bold text-gray-900">100X.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-auto p-2 text-gray-500 hover:text-gray-700 md:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {MENU_SECTIONS.map((section) => {
          if (section.id === "health-care") {
            const isOpen = Boolean(openSections[section.id]);

            return (
              <div key={section.id} className="mt-5">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-2 py-2 text-gray-700 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {section.icon}
                    <span className="font-medium">{section.title}</span>
                  </div>

                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      isOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="ml-8 mt-3 space-y-4">
                    {section.items.map((item) => (
                      <SubMenuItem
                        key={item.label}
                        icon={item.icon}
                        label={item.label}
                        isActive={activeLabel === item.label}
                        onSelect={() => handleSelect(item.label)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              key={section.id}
              className={section.id === "dashboard" ? "" : "mt-4 space-y-2"}
            >
              {section.items.map((item) => {
                const isActive = activeLabel === item.label;
                const isDashboard = section.id === "dashboard";

                return (
                  <div
                    key={item.label}
                    onClick={() => handleSelect(item.label)}
                    className={
                      isDashboard
                        ? `flex items-center gap-3 px-4 py-3 rounded-xl font-medium cursor-pointer transition ${
                            isActive
                              ? "bg-green-50 text-green-700"
                              : "text-gray-700 hover:bg-gray-100"
                          }`
                        : `flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer transition ${
                            isActive
                              ? "bg-green-50 text-green-700"
                              : "hover:bg-gray-100"
                          }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="bg-green-100 text-green-600 text-[10px] px-2 py-1 rounded-full font-semibold">
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
          );
        })}
      </div>

      {/* PREMIUM CARD */}
      <div className="bg-green-50 rounded-2xl p-5 mt-6">
        <h3 className="text-gray-900 font-semibold text-lg">
          Upgrade to Premium
        </h3>

        <p className="text-sm text-gray-500 mt-2 leading-5">
          Unlock exclusive benefits and priority support.
        </p>

        <button className="mt-5 w-full bg-green-500 hover:bg-green-600 transition text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium shadow-sm">
          <Crown size={18} />
          Upgrade Now
        </button>
      </div>
    </aside>
  );
}

/* SUB MENU ITEM */
function SubMenuItem({ icon, label, isActive, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 cursor-pointer transition ${
        isActive ? "text-green-600" : "text-gray-600 hover:text-green-600"
      }`}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </div>
  );
}