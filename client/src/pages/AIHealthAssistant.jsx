import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft,
  Bot,
  Mic,
  MoreVertical,
  Send,
  MapPin,
  Stethoscope,
  Pill,
  HeartPulse,
  Sparkles,
} from "lucide-react";
import {
  clearLocationError,
  fetchNearbyDoctors,
  setLocation,
  setLocationError,
  submitChatMessage,
} from "../redux/chatbot/chatbotSlice";

const quickReplies = ["Family health", "My Health Score", "Emergency"];

const careOptions = [
  {
    title: "Suggest a doctor",
    subtitle: "Find clinics in your local area",
    icon: Stethoscope,
    accent: "bg-green-50 text-green-700",
  },
  {
    title: "Medicine help",
    subtitle: "Guidelines for fever relief",
    icon: Pill,
    accent: "bg-emerald-50 text-emerald-700",
  },
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

const AIHealthAssistant = ({ onBack }) => {
  const dispatch = useDispatch();
  const chatBottomRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState("");
  const [showDoctorSuggestions, setShowDoctorSuggestions] = useState(false);

  const {
    messages,
    locationLabel,
    locationError,
    location,
    status,
    error,
    doctorSuggestions,
    doctorStatus,
    doctorError,
    doctorDepartment,
  } = useSelector((state) => state.chatbot);

  const latestDoctorRecommendation = [...messages]
    .reverse()
    .find((chatMessage) => chatMessage.role === "bot" && chatMessage.extra?.recommendedDepartment);

  const activeDepartment =
    doctorDepartment || latestDoctorRecommendation?.extra?.recommendedDepartment || "General Medicine";

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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
          })
        );
      },
      () => {
        dispatch(
          setLocationError("Please allow location access to use current location.")
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
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

  const handleSuggestDoctor = () => {
    if (!location) {
      dispatch(setLocationError("Please tap Current Location first so we can find doctors near you."));
      return;
    }

    setShowDoctorSuggestions(true);

    dispatch(
      fetchNearbyDoctors({
        department: activeDepartment,
        location,
        limit: 5,
      })
    );
  };

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
              <p className="text-base leading-7 text-slate-500">Typing...</p>
            </div>
          </div>
        )}

        <section className="flex justify-center">
          <div className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-500 shadow-sm">
            Ask about medicine, symptoms, or finding a doctor
          </div>
        </section>

        <section className="flex max-w-[95%] flex-col gap-4 self-start">
          <div className="rounded-3xl rounded-tl-none border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-4 text-base leading-7 text-slate-700">
              I&apos;m sorry to hear that. Rest is very important. To help you
              better, would you like to check for doctors nearby or learn more
              about these symptoms?
            </p>

            <div className="grid gap-3">
              {careOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <button
                    key={option.title}
                    type="button"
                    onClick={option.title === "Suggest a doctor" ? handleSuggestDoctor : undefined}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:bg-slate-100"
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full ${option.accent}`}
                    >
                      <Icon size={22} />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {option.title}
                      </p>
                      <p className="text-sm text-slate-500">{option.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {showDoctorSuggestions && (
          <section className="flex max-w-[95%] flex-col gap-4 self-start">
            <div className="rounded-3xl rounded-tl-none border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Suggested doctors
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">
                    {formatDepartment(activeDepartment)}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Based on your current location: {locationLabel}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDoctorSuggestions(false)}
                  className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Close
                </button>
              </div>

              {doctorStatus === "loading" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Searching Google Maps for doctors near you...
                </div>
              )}

              {doctorError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {doctorError}
                </div>
              )}

              {doctorStatus === "succeeded" && doctorSuggestions.length === 0 && !doctorError && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No doctors were found near this location. Try a larger area or update your current location.
                </div>
              )}

              <div className="grid gap-3">
                {doctorSuggestions.map((doctor) => (
                  <div
                    key={doctor.placeId || `${doctor.name}-${doctor.address}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">
                          {doctor.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {doctor.address}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">
                          {doctor.distanceKm != null ? `${doctor.distanceKm} km from you` : "Distance unavailable"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {doctor.rating ? `${doctor.rating}★` : "No rating"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {doctor.reviewsCount || 0} reviews
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <a
                        href={doctor.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                      >
                        Get directions
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="flex flex-wrap gap-3 pb-28">
          {quickReplies.map((item) => (
            <button
              key={item}
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
            >
              <Sparkles size={15} className="text-emerald-600" />
              {item}
            </button>
          ))}
        </section>

        <div ref={chatBottomRef} />
      </main>

      <footer className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
            <button
              type="button"
              onClick={handleCurrentLocation}
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
              aria-label="Use current location"
            >
              <MapPin size={16} className="text-emerald-600" />
              {locationLabel}
            </button>

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
        Allow location to find doctors nearby
        <div className="mt-1 flex items-center gap-1 text-emerald-600">
          <HeartPulse size={14} />
          Local doctor matching enabled next
        </div>
      </div>
    </div>
  );
};

export default AIHealthAssistant;
