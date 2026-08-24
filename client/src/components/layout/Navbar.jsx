import { useState, useRef, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Menu, Search, MapPin, Bell, MessageSquare,
  Bot, X, Navigation, Loader2, ChevronDown, Check,
} from "lucide-react";
import { setLocation, setLocationError } from "../../redux/chatbot/chatbotSlice";
import { searchLocationSuggestions } from "../../services/locationService";
import { selectUser } from "../../redux/auth/authSlice";
import { useLang } from "../../i18n/LanguageContext";
import LanguageSwitcher from "../common/LanguageSwitcher";

// ── Notification badge ─────────────────────────────────────────────────────
const Badge = ({ count }) =>
  count > 0 ? (
    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
      {count > 9 ? "9+" : count}
    </span>
  ) : null;

const IconBtn = ({ children, onClick, label, badge = 0, className = "" }) => (
  <button type="button" onClick={onClick} aria-label={label}
    className={`relative flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white ${className}`}>
    {children}
    <Badge count={badge} />
  </button>
);

// ── Location Dropdown ──────────────────────────────────────────────────────
function LocationDropdown({ onClose }) {
  const dispatch = useDispatch();
  const { t } = useLang();
  const [locQuery, setLocQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isGPSLoading, setIsGPSLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const fetchSuggestions = useCallback(async (q) => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    setIsFetching(true);
    try {
      const results = await searchLocationSuggestions(q, 6);
      setSuggestions(results);
    } catch { setSuggestions([]); }
    finally { setIsFetching(false); }
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setLocQuery(val);
    setActiveIdx(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const handleSelect = (suggestion) => {
    dispatch(setLocation({
      location: { lat: suggestion.lat, lng: suggestion.lng },
      label: suggestion.shortLabel || suggestion.label.split(",").slice(0, 2).join(","),
      source: "manual",
    }));
    onClose();
  };

  const handleGPS = () => {
    if (!navigator.geolocation) {
      dispatch(setLocationError("GPS not supported in this browser."));
      return;
    }
    setIsGPSLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lng = Number(pos.coords.longitude.toFixed(4));
        const acc = Math.max(1, Math.round(pos.coords.accuracy));
        dispatch(setLocation({
          location: { lat, lng },
          label: `Current location · ±${acc}m`,
          source: "gps",
        }));
        setIsGPSLoading(false);
        onClose();
      },
      () => {
        dispatch(setLocationError("Allow location access or search manually."));
        setIsGPSLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleKey = (e) => {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); handleSelect(suggestions[activeIdx]); }
    else if (e.key === "Escape") onClose();
  };

  const typeIcon = (type) =>
    ({ city: "🏙️", town: "🏘️", village: "🏡", road: "🛣️", hospital: "🏥", administrative: "🗺️" })[type] || "📍";

  return (
    <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-slate-700 bg-[#1e293b] shadow-2xl shadow-black/40 z-50 overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPin size={15} className="text-emerald-400" />
          <p className="text-sm font-semibold text-white">{t("setLocation")}</p>
        </div>
        <button type="button" onClick={onClose}
          className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white transition">
          <X size={15} />
        </button>
      </div>

      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/10 focus-within:ring-emerald-400 transition">
          {isFetching
            ? <Loader2 size={15} className="shrink-0 animate-spin text-emerald-400" />
            : <Search size={15} className="shrink-0 text-slate-400" />}
          <input
            ref={inputRef} type="text" value={locQuery} onChange={handleInput}
            onKeyDown={handleKey} placeholder={t("searchCity")}
            autoComplete="off"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
          />
          {locQuery && (
            <button type="button" onClick={() => { setLocQuery(""); setSuggestions([]); inputRef.current?.focus(); }}
              className="text-slate-400 hover:text-white transition">
              <X size={13} />
            </button>
          )}
        </div>

        {suggestions.length > 0 && (
          <ul className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#0f172a]">
            {suggestions.map((s, i) => (
              <li key={s.placeId || i}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2.5 transition border-b border-white/5 last:border-0 ${i === activeIdx ? "bg-emerald-600/20" : "hover:bg-white/5"}`}>
                <span className="shrink-0 text-base">{typeIcon(s.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${i === activeIdx ? "text-emerald-400" : "text-white"}`}>
                    {s.shortLabel || s.label.split(",")[0]}
                  </p>
                  <p className="truncate text-xs text-slate-500">{s.label}</p>
                </div>
                {i === activeIdx && <Check size={13} className="shrink-0 text-emerald-400" />}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-2 px-4 py-1">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] text-slate-500 uppercase tracking-wider">{t("or")}</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="px-3 pb-3">
        <button type="button" onClick={handleGPS} disabled={isGPSLoading}
          className="flex w-full items-center gap-3 rounded-xl bg-emerald-600/10 px-4 py-3 text-left transition hover:bg-emerald-600/20 disabled:opacity-60">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            {isGPSLoading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{t("useCurrentLocation")}</p>
            <p className="text-xs text-slate-400">{t("detectViaGPS")}</p>
          </div>
        </button>
      </div>
    </div>
  );
}

// ── Main Navbar ────────────────────────────────────────────────────────────
export default function Navbar({ onMenuClick, onChatClick }) {
  const dispatch = useDispatch();
  const { t } = useLang();
  const { locationLabel, locationSource } = useSelector((s) => s.chatbot);
  const user = useSelector(selectUser);

  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const locationRef = useRef(null);

  const userName = user?.name?.split(" ")[0] || "User";
  const notifCount = 5;
  const messageCount = 2;
  const locationBadge = locationSource === "ip" ? "≈" : locationSource === "gps" ? "●" : "";

  useEffect(() => {
    if (!locationOpen) return;
    const handler = (e) => {
      if (locationRef.current && !locationRef.current.contains(e.target)) setLocationOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [locationOpen]);

  return (
    <header id="main-navbar" className="sticky top-0 z-40 w-full"
      style={{ background: "linear-gradient(90deg, #0f172a 0%, #1e293b 100%)" }}>

      {/* ── Main row ── */}
      <div className="flex h-[68px] items-center gap-3 px-4 md:px-6">

        {/* LEFT */}
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" id="sidebar-toggle" onClick={onMenuClick} aria-label="Toggle sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white md:hidden">
            <Menu size={20} />
          </button>
          <div className="leading-tight">
            <p className="text-[14px] font-bold text-white">{t("greeting")}, {userName}! 👋</p>
            <p className="hidden sm:block text-[11px] text-slate-400">{t("greetingSubtitle")}</p>
          </div>
        </div>

        {/* CENTER: Search bar — desktop */}
        <div className="relative mx-auto hidden md:block w-full max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input id="navbar-search" type="text" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-full bg-white/10 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-400 outline-none ring-1 ring-white/10 transition focus:bg-white/15 focus:ring-2 focus:ring-emerald-400" />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition">
              <X size={14} />
            </button>
          )}
        </div>

        {/* RIGHT: Icons */}
        <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">

          {/* Language Switcher */}
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>

          {/* Search icon — mobile only */}
          <IconBtn label="Search" className="md:hidden" onClick={() => setMobileSearchOpen((v) => !v)}>
            <Search size={19} />
          </IconBtn>

          {/* Location — desktop */}
          <div className="relative hidden md:block" ref={locationRef}>
            <button type="button" onClick={() => setLocationOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-slate-300 cursor-pointer hover:text-white transition hover:bg-white/10">
              <MapPin size={15} className="shrink-0" />
              <span className="font-medium whitespace-nowrap max-w-[130px] truncate">
                {locationBadge && <span className="mr-1 text-slate-400">{locationBadge}</span>}
                {locationLabel}
              </span>
              <ChevronDown size={13} className={`transition-transform ${locationOpen ? "rotate-180" : ""}`} />
            </button>
            {locationOpen && <LocationDropdown onClose={() => setLocationOpen(false)} />}
          </div>

          {/* Notifications */}
          <IconBtn label={t("notifications")} badge={notifCount}><Bell size={19} /></IconBtn>

          {/* Messages */}
          <IconBtn label={t("messages")} badge={messageCount}><MessageSquare size={19} /></IconBtn>

          {/* Chat AI — desktop */}
          {onChatClick && (
            <button type="button" id="chat-ai-btn" onClick={onChatClick}
              className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-emerald-600 active:scale-95 ml-1">
              <Bot size={14} />{t("chatAI")}
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile expandable search ── */}
      {mobileSearchOpen && (
        <div className="flex items-center gap-2 border-t border-white/10 px-4 py-2 md:hidden">
          <Search size={15} className="shrink-0 text-slate-400" />
          <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-400 outline-none" />
          <button type="button" onClick={() => { setSearchQuery(""); setMobileSearchOpen(false); }}
            className="text-slate-400 hover:text-white transition"><X size={14} /></button>
        </div>
      )}

      {/* ── Mobile bottom strip ── */}
      {!mobileSearchOpen && (
        <div className="flex items-center gap-1.5 border-t border-white/5 px-4 py-1.5 md:hidden" ref={locationRef}>
          <button type="button" onClick={() => setLocationOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition">
            <MapPin size={12} className="text-emerald-400 shrink-0" />
            <span className="font-medium truncate max-w-[140px]">
              {locationBadge && <span className="mr-0.5">{locationBadge}</span>}
              {locationLabel}
            </span>
            <ChevronDown size={11} className={`transition-transform ${locationOpen ? "rotate-180" : ""}`} />
          </button>

          {locationOpen && (
            <div className="absolute left-2 right-2 top-full mt-1 z-50">
              <LocationDropdown onClose={() => setLocationOpen(false)} />
            </div>
          )}

          {/* Mobile language switcher */}
          <div className="ml-2">
            <LanguageSwitcher compact />
          </div>

          {onChatClick && (
            <button type="button" onClick={onChatClick}
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 whitespace-nowrap">
              <Bot size={12} />{t("chatAI")}
            </button>
          )}
        </div>
      )}
    </header>
  );
}