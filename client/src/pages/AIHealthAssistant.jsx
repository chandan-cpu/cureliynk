import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft,
  Bot,
  Mic,
  MoreVertical,
  Send,
  MapPin,
  HeartPulse,
  Sparkles,
  Search,
  Navigation,
  Globe,
  ChevronDown,
  X,
  Loader2,
  Check,
  Stethoscope,
  Phone,
} from "lucide-react";
import {
  clearLocationError,
  clearGeocodeError,
  fetchIPLocation,
  fetchNearbyDoctors,
  setLocation,
  setLocationError,
  submitChatMessage,
} from "../redux/chatbot/chatbotSlice";
import { searchLocationSuggestions } from "../services/locationService";

const quickReplies = [
  "I have a headache and fever",
  "Suggest a doctor near me",
  "What medicines for cold?",
  "My Health Score",
];

const getUrgencyTone = (urgency = "") => {
  const value = urgency.toLowerCase();

  if (value.includes("high") || value.includes("emergency")) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  if (value.includes("medium") || value.includes("urgent")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-emerald-50 text-emerald-700 border-emerald-200";
};

const formatDepartment = (department = "") =>
  department.replace(" / ", " · ");

const getPrimarySpecialty = (department = "") =>
  department.split("/")[0].split("·")[0].trim();

const BotResponseCard = ({ response }) => {
  const urgencyTone = getUrgencyTone(response?.urgencyLevel);
  const isEmergency = (response?.urgencyLevel || "").toLowerCase().includes("high") ||
    (response?.urgencyLevel || "").toLowerCase().includes("emergency");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {response?.recommendedDepartment && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {formatDepartment(response.recommendedDepartment)}
          </span>
        )}

        {response?.urgencyLevel && (
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${urgencyTone}`}>
            {response.urgencyLevel}
          </span>
        )}
      </div>

      {response?.possibleCondition && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Possible condition
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            {response.possibleCondition}
          </p>
        </div>
      )}

      {response?.message && (
        <div
          className={`rounded-2xl border p-4 ${
            isEmergency
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Advice
          </p>
          <p className="mt-1 text-sm leading-6">{response.message}</p>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {response?.recommendedDepartment && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Recommended department
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {formatDepartment(response.recommendedDepartment)}
            </p>
          </div>
        )}

        {response?.urgencyLevel && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Urgency
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {response.urgencyLevel}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Location Picker Dropdown ─────────────────────────────────────── */
const LocationPicker = ({
  isOpen,
  onClose,
  onGPS,
  onIPDetect,
  locationLabel,
  locationSource,
  geocodeError,
  ipLocationStatus,
  dispatch,
}) => {
  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setAddressQuery("");
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isIPLoading = ipLocationStatus === "loading";

  const sourceIcon = {
    gps: "📍",
    manual: "🔍",
    ip: "🌐",
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setAddressQuery(val);
    setActiveIndex(-1);
    if (geocodeError) dispatch(clearGeocodeError());

    clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsFetching(true);
      try {
        const results = await searchLocationSuggestions(val, 7);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsFetching(false);
      }
    }, 350);
  };

  const handleSelectSuggestion = (suggestion) => {
    dispatch(
      setLocation({
        location: { lat: suggestion.lat, lng: suggestion.lng },
        label: suggestion.shortLabel || suggestion.label.split(",").slice(0, 2).join(","),
        source: "manual",
      })
    );
    setAddressQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || !suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) handleSelectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  const getTypeIcon = (type) => {
    const icons = { city: "🏙️", town: "🏘️", village: "🏡", suburb: "🏘️", road: "🛣️", hospital: "🏥", administrative: "🗺️" };
    return icons[type] || "📍";
  };

  return (
    <div className="absolute bottom-full left-0 z-50 mb-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in slide-in-from-bottom-2">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-800">Set your location</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search input with live suggestions */}
      <div className="border-b border-slate-100 px-3 py-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition">
          {isFetching ? (
            <Loader2 size={15} className="shrink-0 animate-spin text-emerald-500" />
          ) : (
            <Search size={15} className="shrink-0 text-slate-400" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={addressQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type city or address..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            autoComplete="off"
          />
          {addressQuery && (
            <button
              type="button"
              onClick={() => { setAddressQuery(""); setSuggestions([]); setShowSuggestions(false); inputRef.current?.focus(); }}
              className="shrink-0 rounded-full p-0.5 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {suggestions.map((s, i) => (
              <li
                key={s.placeId || i}
                onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s); }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2.5 transition ${
                  i === activeIndex ? "bg-emerald-50" : "hover:bg-slate-50"
                } ${i < suggestions.length - 1 ? "border-b border-slate-100" : ""}`}
              >
                <span className="shrink-0 text-base">{getTypeIcon(s.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${
                    i === activeIndex ? "text-emerald-700" : "text-slate-800"
                  }`}>
                    {s.shortLabel || s.label.split(",")[0]}
                  </p>
                  <p className="truncate text-xs text-slate-400">{s.label}</p>
                </div>
                {i === activeIndex && (
                  <span className="shrink-0 text-xs font-bold text-emerald-500">›</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {geocodeError && (
          <p className="mt-2 text-xs font-medium text-rose-500">{geocodeError}</p>
        )}
      </div>

      {/* Quick actions */}
      <div className="space-y-1 px-2 py-2">
        <button
          type="button"
          onClick={onGPS}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-slate-50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Navigation size={15} />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Use current location</p>
            <p className="text-xs text-slate-500">High accuracy via GPS</p>
          </div>
        </button>

        <button
          type="button"
          onClick={onIPDetect}
          disabled={isIPLoading}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            {isIPLoading ? <Loader2 size={15} className="animate-spin" /> : <Globe size={15} />}
          </div>
          <div>
            <p className="font-semibold text-slate-800">Detect from IP</p>
            <p className="text-xs text-slate-500">Approximate city-level</p>
          </div>
        </button>
      </div>

      {/* Current location display */}
      {locationSource && (
        <div className="border-t border-slate-100 px-3 py-3">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5">
            <Check size={14} className="shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-emerald-800">
                {sourceIcon[locationSource] || "📍"} {locationLabel}
              </p>
              <p className="text-[11px] text-emerald-600">
                via {locationSource === "gps" ? "GPS" : locationSource === "manual" ? "address search" : "IP detection"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Main Page Component ──────────────────────────────────────────── */
const AIHealthAssistant = ({ onBack }) => {
  const dispatch = useDispatch();
  const chatBottomRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showDoctorPanel, setShowDoctorPanel] = useState(false);

  const {
    messages,
    locationLabel,
    locationError,
    location,
    locationSource,
    status,
    error,
    doctorSuggestions,
    doctorStatus,
    doctorError,
    doctorDepartment,
    geocodeStatus,
    geocodeError,
    ipLocationStatus,
  } = useSelector((state) => state.chatbot);

  const latestDoctorRecommendation = [...messages]
    .reverse()
    .find((chatMessage) => chatMessage.role === "bot" && chatMessage.extra?.recommendedDepartment);

  const activeDepartment =
    doctorDepartment || latestDoctorRecommendation?.extra?.recommendedDepartment || "General Medicine";

  // ── Auto-detect location via IP on mount ──
  useEffect(() => {
    if (!location) {
      dispatch(fetchIPLocation());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close location picker after successful geocode ──
  useEffect(() => {
    if (geocodeStatus === "succeeded") {
      setShowLocationPicker(false);
    }
  }, [geocodeStatus]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Close picker on click outside ──
  const pickerContainerRef = useRef(null);
  useEffect(() => {
    if (!showLocationPicker) return;

    const handleClickOutside = (e) => {
      if (pickerContainerRef.current && !pickerContainerRef.current.contains(e.target)) {
        setShowLocationPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLocationPicker]);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      dispatch(setLocationError("Location is not supported in this browser."));
      return;
    }

    dispatch(clearLocationError());

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(4));
        const lng = Number(position.coords.longitude.toFixed(4));
        const accuracyInMeters = Math.max(1, Math.round(position.coords.accuracy));

        dispatch(
          setLocation({
            location: { lat, lng },
            label: `Current location · ±${accuracyInMeters}m`,
            source: "gps",
          })
        );
        setShowLocationPicker(false);
      },
      () => {
        dispatch(
          setLocationError("Please allow location access or use manual search below.")
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleIPDetect = () => {
    dispatch(fetchIPLocation());
  };

  const handleSendMessage = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || status === "loading") {
      return;
    }

    dispatch(
      submitChatMessage({
        message: trimmedMessage,
        language: "en",
        meta: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        ...(location ? { location } : {}),
      })
    );
    setMessage("");
  };

  const handleConnectDoctor = () => {
    if (!location) {
      dispatch(setLocationError("Please set your location first so we can find doctors near you."));
      setShowLocationPicker(true);
      return;
    }
    if (showDoctorPanel) {
      setShowDoctorPanel(false);
      return;
    }
    setShowDoctorPanel(true);
    dispatch(
      fetchNearbyDoctors({
        department: "General Medicine",
        location,
        limit: 5,
      })
    );
  };

  const handleQuickReply = (text) => {
    if (status === "loading") return;
    dispatch(
      submitChatMessage({
        message: text,
        language: "en",
        meta: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ...(location ? { location } : {}),
      })
    );
  };

  // ── Location chip props ──
  const locationChipColor = location
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-white text-slate-600 border-slate-200";

  const locationSourceBadge = locationSource === "ip" ? "≈" : locationSource === "gps" ? "●" : "";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 w-full border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft size={18} />
            Dashboard
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
              <Bot size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none text-slate-900">
                Chat with AI
              </h1>
              <p className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Curelink AI is online
              </p>
            </div>
          </div>

          <button
            type="button"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="More options"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {messages.map((chatMessage) => (
          <section
            key={chatMessage.id}
            className={`flex max-w-[95%] flex-col gap-3 ${
              chatMessage.role === "user" ? "self-end" : "self-start"
            }`}
          >
            <div
              className={`rounded-3xl p-5 shadow-sm ${
                chatMessage.role === "user"
                  ? "rounded-tr-none bg-emerald-600 text-white"
                  : "rounded-tl-none border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {chatMessage.role === "bot" && chatMessage.extra ? (
                <BotResponseCard response={chatMessage.extra} />
              ) : (
                <p className="text-base leading-7">{chatMessage.content}</p>
              )}
            </div>
            <span
              className={`text-xs font-medium text-slate-500 ${
                chatMessage.role === "user" ? "self-end" : "ml-1"
              }`}
            >
              {chatMessage.meta}
            </span>
          </section>
        ))}

        {status === "loading" && (
          <div className="flex max-w-[90%] flex-col gap-3 self-start">
            <div className="rounded-3xl rounded-tl-none border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* ── "Connect with Doctor" floating button — appears after first bot reply ── */}
        {messages.some((m) => m.role === "bot") && status !== "loading" && (
          <div className="flex flex-col items-end gap-3 pb-2 animate-in slide-in-from-bottom-4 duration-500">
            <button
              type="button"
              onClick={handleConnectDoctor}
              className="group relative flex items-center gap-2.5 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700 hover:shadow-emerald-200 hover:shadow-xl active:scale-95"
            >
              {/* Pulsing ring — only when panel is closed */}
              {!showDoctorPanel && (
                <span className="absolute -inset-0.5 rounded-full animate-ping bg-emerald-400 opacity-30 group-hover:opacity-0" />
              )}
              <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <Stethoscope size={14} />
              </span>
              <span className="relative">
                {showDoctorPanel ? "Hide Doctors" : "Connect with Doctor"}
              </span>
              <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                {showDoctorPanel ? <X size={12} /> : <Phone size={11} />}
              </span>
            </button>

            {/* ── Doctor results panel ── */}
            {showDoctorPanel && (
              <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden animate-in slide-in-from-top-2 duration-300">
                {/* Panel header */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                      <Stethoscope size={14} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Nearest Doctors</p>
                      <p className="text-xs text-slate-500">{locationLabel}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDoctorPanel(false)}
                    className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Loading */}
                {doctorStatus === "loading" && (
                  <div className="flex flex-col gap-2 p-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                    ))}
                  </div>
                )}

                {/* Error */}
                {doctorStatus === "failed" && doctorError && (
                  <div className="p-4">
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {doctorError}
                    </div>
                  </div>
                )}

                {/* Empty */}
                {doctorStatus === "succeeded" && doctorSuggestions.length === 0 && (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No doctors found nearby. Try updating your location.
                  </div>
                )}

                {/* Doctor cards */}
                {doctorSuggestions.length > 0 && (
                  <ul className="divide-y divide-slate-100">
                    {doctorSuggestions.map((doctor, idx) => (
                      <li key={doctor.placeId || idx} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition">
                        {/* Avatar */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
                          {doctor.name?.charAt(0) || "D"}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{doctor.name}</p>
                          <p className="truncate text-xs text-slate-500">{doctor.address}</p>
                          <div className="mt-1 flex items-center gap-2">
                            {doctor.rating && (
                              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-500">
                                ★ {doctor.rating}
                                <span className="font-normal text-slate-400">({doctor.reviewsCount || 0})</span>
                              </span>
                            )}
                            {doctor.distanceKm != null && (
                              <span className="text-xs text-slate-400">{doctor.distanceKm} km away</span>
                            )}
                          </div>
                        </div>
                        {/* Direction link */}
                        <a
                          href={doctor.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 self-center rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                        >
                          Directions
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Welcome / empty state shown only when no messages yet ── */}
        {messages.length === 0 && status !== "loading" && (
          <section className="flex flex-col items-center gap-6 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <Bot size={32} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Hi, I&apos;m Curelink AI</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ask me about symptoms, medicines, or finding a doctor near you.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {quickReplies.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleQuickReply(item)}
                  disabled={status === "loading"}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                >
                  <Sparkles size={14} className="text-emerald-500" />
                  {item}
                </button>
              ))}
            </div>
          </section>
        )}

        <div ref={chatBottomRef} />
      </main>

      <footer className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
            {/* ── Location chip with dropdown picker ── */}
            <div className="relative" ref={pickerContainerRef}>
              <button
                type="button"
                onClick={() => setShowLocationPicker((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm transition hover:shadow-md ${locationChipColor}`}
                aria-label="Set location"
              >
                <MapPin size={14} className={location ? "text-emerald-600" : "text-slate-400"} />
                <span className="max-w-[120px] truncate">
                  {locationSourceBadge && <span className="mr-1">{locationSourceBadge}</span>}
                  {locationLabel}
                </span>
                <ChevronDown size={12} className={`transition-transform ${showLocationPicker ? "rotate-180" : ""}`} />
              </button>

              <LocationPicker
                isOpen={showLocationPicker}
                onClose={() => setShowLocationPicker(false)}
                onGPS={handleCurrentLocation}
                onIPDetect={handleIPDetect}
                locationLabel={locationLabel}
                locationSource={locationSource}
                geocodeError={geocodeError}
                ipLocationStatus={ipLocationStatus}
                dispatch={dispatch}
              />
            </div>

            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSendMessage();
                }
              }}
              className="w-full border-0 bg-transparent text-base outline-none placeholder:text-slate-400"
              placeholder="Type your health worry here..."
              type="text"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsListening((current) => !current)}
            className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 ${
              isListening ? "bg-rose-500" : "bg-emerald-600"
            }`}
            aria-label="Voice input"
          >
            <Mic size={26} />
          </button>

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={status === "loading"}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label="Send message"
          >
            <Send size={22} />
          </button>
        </div>
      </footer>

      {locationError && (
        <div className="mx-auto -mt-2 max-w-3xl px-4 pb-2 sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-rose-600">{locationError}</p>
        </div>
      )}

      {error && (
        <div className="mx-auto -mt-1 max-w-3xl px-4 pb-2 sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-rose-600">{error}</p>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-24 right-6 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-lg md:block">
        {location ? (
          <>
            Location set · {locationSource === "ip" ? "approximate" : "accurate"}
            <div className="mt-1 flex items-center gap-1 text-emerald-600">
              <HeartPulse size={14} />
              Doctor matching ready
            </div>
          </>
        ) : (
          <>
            Set location to find doctors nearby
            <div className="mt-1 flex items-center gap-1 text-slate-400">
              <HeartPulse size={14} />
              Click the location chip below
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AIHealthAssistant;
