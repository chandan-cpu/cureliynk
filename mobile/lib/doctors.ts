import { apiRequest } from "@/lib/api";

export type Department =
  | "Cardiology"
  | "Dermatology"
  | "Dentistry"
  | "Ophthalmology"
  | "ENT"
  | "Orthopedics"
  | "Gynecology"
  | "Pediatrics"
  | "Psychiatry"
  | "Emergency Medicine"
  | "General Medicine";

export type Doctor = {
  name: string;
  address: string;
  rating: number | null;
  reviewsCount: number;
  distanceKm: number | null;
  placeId: string;
  mapsUrl: string;
};

export type DoctorSearchResult = {
  department: string;
  specialty: string;
  location: { lat: number; lng: number };
  doctors: Doctor[];
};

/** Public route (no auth) — Google Places search behind the backend, scoped by department. */
export async function findNearbyDoctors(
  department: Department,
  location: { lat: number; lng: number },
  limit?: number,
): Promise<DoctorSearchResult> {
  return apiRequest<DoctorSearchResult>("/api/v1/chat/doctors", {
    method: "POST",
    body: { department, location, limit },
  });
}
