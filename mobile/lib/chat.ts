import type { Department } from "@/lib/doctors";
import { medicalRequest } from "@/lib/medical-api";

/**
 * The Ask AI chat, backed by the Python medical assistant
 * (`CureliynkMedical/backend`, POST /api/v1/medical/query).
 *
 * The backend does the triage: it decides the specialty, the urgency and the
 * wording of the answer. This module's job is to translate its response into
 * the shape the chat components render, and to keep every value the UI
 * branches on — urgency, department — machine-readable rather than
 * language-dependent.
 */

/** Drives the colour of the answer: only `emergency` shows the red banner. */
export type ChatUrgency = "routine" | "soon" | "urgent" | "emergency";

/** The three prompts offered on the empty state, in the design's order. */
export const EXAMPLE_SCENARIOS = ["cardiac", "headache", "pediatric"] as const;

/** One provider from the answer. Everything but the name may be missing. */
export type SuggestedDoctor = {
  /** Stable list key. `place_id` when the maps search found it, else the name. */
  id: string;
  name: string;
  /** e.g. "Cardiologist", already in the user's language. */
  doctorType: string;
  /** Kilometres from the user; absent for local-database results. */
  distanceKm: number | null;
  /** Street address, or the facility name for local-database results. */
  location: string;
  /** Opens the place in the device's maps app, when the backend supplied it. */
  mapsUrl: string | null;
};

export type AssistantAnswer = {
  /** The backend's own explanation — the body of the reply. */
  reason: string;
  /** Localised specialty name, for display. */
  specialty: string;
  /** Localised doctor type, for display. */
  doctorType: string;
  urgency: ChatUrgency;
  /** Canonical English specialty mapped onto a doctor-search department. */
  department: Department;
  doctors: SuggestedDoctor[];
  /** Quoted in a bug report; the backend logs the same id. */
  requestId: string | null;
};

export type ChatMessage =
  | { id: string; role: "user"; text: string; viaVoice?: boolean }
  | { id: string; role: "assistant"; answer: AssistantAnswer }
  /** A failed turn, shown in place of an answer with a retry affordance. */
  | { id: string; role: "error"; messageKey: string; canRetry: boolean };

// ---------------------------------------------------------------------------
// Wire format
// ---------------------------------------------------------------------------

type NearbySpecialistPayload = {
  name: string;
  speciality: string;
  doctor_type: string;
  distance: number | null;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  maps_url?: string | null;
  place_id?: string | null;
};

type MedicalQueryResponse = {
  query: string;
  medical_specialty: string;
  specialty_code: string;
  doctor_type: string;
  urgency: string;
  reason: string;
  confidence: number;
  nearby_specialists: NearbySpecialistPayload[];
  request_id: string | null;
};

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

const URGENCY_VALUES: ChatUrgency[] = ["routine", "soon", "urgent", "emergency"];

/**
 * The backend routes to a far finer set of specialties than the doctor search
 * offers (it can return "Cardiac Electrophysiology" or "Pediatric
 * Neurology"), so subspecialties collapse onto the nearest department the
 * Places search actually knows how to look for.
 *
 * Keys are the canonical English `specialty_code`, lowercased — never the
 * translated display name.
 */
const DEPARTMENT_BY_SPECIALTY: Record<string, Department> = {
  cardiology: "Cardiology",
  "cardiac electrophysiology": "Cardiology",
  "pediatric cardiology": "Pediatrics",
  pediatrics: "Pediatrics",
  "pediatric neurology": "Pediatrics",
  dermatology: "Dermatology",
  ophthalmology: "Ophthalmology",
  "otolaryngology (ent)": "ENT",
  otolaryngology: "ENT",
  ent: "ENT",
  orthopedics: "Orthopedics",
  "obstetrics & gynecology": "Gynecology",
  "obstetrics and gynecology": "Gynecology",
  gynecology: "Gynecology",
  psychiatry: "Psychiatry",
  dentistry: "Dentistry",
  "emergency medicine": "Emergency Medicine",
  "general medicine": "General Medicine",
  "internal medicine": "General Medicine",
  // No department of their own in the doctor search: a general physician is
  // the right first stop for all of them.
  neurology: "General Medicine",
  gastroenterology: "General Medicine",
  nephrology: "General Medicine",
  urology: "General Medicine",
  pulmonology: "General Medicine",
  endocrinology: "General Medicine",
  "infectious diseases": "General Medicine",
};

function toDepartment(specialtyCode: string): Department {
  return DEPARTMENT_BY_SPECIALTY[specialtyCode.trim().toLowerCase()] ?? "General Medicine";
}

function toUrgency(value: string): ChatUrgency {
  const normalized = value?.trim().toLowerCase();
  // An unrecognised value must never be treated as an emergency, and must
  // never suppress one either — `routine` is the safe, non-alarming default.
  return URGENCY_VALUES.includes(normalized as ChatUrgency)
    ? (normalized as ChatUrgency)
    : "routine";
}

function toDoctor(payload: NearbySpecialistPayload, index: number): SuggestedDoctor {
  return {
    id: payload.place_id || `${payload.name}-${index}`,
    name: payload.name,
    doctorType: payload.doctor_type || payload.speciality,
    distanceKm: typeof payload.distance === "number" ? payload.distance : null,
    location: payload.location,
    mapsUrl: payload.maps_url ?? null,
  };
}

/** How many providers the answer shows before the "show all nearby" link. */
export const MAX_SUGGESTED_DOCTORS = 3;

export function toAssistantAnswer(payload: MedicalQueryResponse): AssistantAnswer {
  return {
    reason: payload.reason,
    specialty: payload.medical_specialty,
    doctorType: payload.doctor_type,
    urgency: toUrgency(payload.urgency),
    department: toDepartment(payload.specialty_code || payload.medical_specialty),
    doctors: (payload.nearby_specialists ?? [])
      .slice(0, MAX_SUGGESTED_DOCTORS)
      .map(toDoctor),
    requestId: payload.request_id ?? null,
  };
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export type AskOptions = {
  /** Omitted when the user declined location — the answer just has no doctors. */
  coords?: { lat: number; lng: number } | null;
  /** The app's current language, so the backend answers in it. */
  language: string;
  /** Wired to the composer's stop button. */
  signal?: AbortSignal;
};

/** Sends one question to the medical assistant. */
export async function askMedicalAssistant(
  query: string,
  { coords, language, signal }: AskOptions,
): Promise<AssistantAnswer> {
  const payload = await medicalRequest<MedicalQueryResponse>(
    "/api/v1/medical/query",
    {
      query,
      // The backend rejects unknown fields, and treats absent coordinates as
      // "no location shared" rather than an error.
      ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
      language,
    },
    { signal },
  );

  return toAssistantAnswer(payload);
}
