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

/**
 * Google Places search behind the backend, scoped by department.
 *
 * Private: the backend guards the whole /api/v1/chat router with `authenticate`
 * because each call spends money on a Places text search. Without the token
 * every search came back 401 and the results screen showed only "Try again".
 */
export async function findNearbyDoctors(
  department: Department,
  location: { lat: number; lng: number },
  limit?: number,
): Promise<DoctorSearchResult> {
  return apiRequest<DoctorSearchResult>("/api/v1/chat/doctors", {
    method: "POST",
    body: { department, location, limit },
    authenticated: true,
  });
}
