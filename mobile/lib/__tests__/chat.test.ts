import { askMedicalAssistant, toAssistantAnswer } from "@/lib/chat";

const mockMedicalRequest = jest.fn();
jest.mock("@/lib/medical-api", () => ({
  medicalRequest: (...args: unknown[]) => mockMedicalRequest(...args),
}));

/** A backend response with sensible defaults, overridable per test. */
function response(overrides: Record<string, unknown> = {}) {
  return {
    query: "chest feels tight when I climb stairs",
    medical_specialty: "Cardiology",
    specialty_code: "Cardiology",
    doctor_type: "Cardiologist",
    urgency: "urgent",
    reason: "Exertional chest tightness needs a cardiac review.",
    confidence: 0.82,
    nearby_specialists: [],
    request_id: "abc123",
    ...overrides,
  };
}

function specialist(overrides: Record<string, unknown> = {}) {
  return {
    name: "Nemcare Superspeciality",
    speciality: "Cardiology",
    doctor_type: "cardiologist",
    distance: 2.4,
    location: "Bhangagarh, Guwahati",
    latitude: 26.15,
    longitude: 91.77,
    maps_url: "https://maps.google.com/?cid=1",
    place_id: "place-1",
    ...overrides,
  };
}

describe("toAssistantAnswer", () => {
  it("uses the backend's reason as the reply body", () => {
    const answer = toAssistantAnswer(response());
    expect(answer.reason).toBe("Exertional chest tightness needs a cardiac review.");
  });

  it("keeps all four urgency levels", () => {
    for (const urgency of ["routine", "soon", "urgent", "emergency"]) {
      expect(toAssistantAnswer(response({ urgency })).urgency).toBe(urgency);
    }
  });

  it("falls back to routine for an urgency it does not recognise", () => {
    // A translated or misspelled value must not accidentally read as an
    // emergency, which would show the red banner and the ambulance button.
    expect(toAssistantAnswer(response({ urgency: "आपातकालीन" })).urgency).toBe("routine");
    expect(toAssistantAnswer(response({ urgency: "" })).urgency).toBe("routine");
  });

  it("maps a subspecialty onto a department the doctor search knows", () => {
    const cases: [string, string][] = [
      ["Cardiology", "Cardiology"],
      ["Cardiac Electrophysiology", "Cardiology"],
      ["Pediatric Cardiology", "Pediatrics"],
      ["Otolaryngology (ENT)", "ENT"],
      ["Obstetrics & Gynecology", "Gynecology"],
      // No department of its own — a general physician is the right first stop.
      ["Nephrology", "General Medicine"],
      ["Something The App Has Never Heard Of", "General Medicine"],
    ];

    for (const [specialtyCode, department] of cases) {
      expect(toAssistantAnswer(response({ specialty_code: specialtyCode })).department).toBe(
        department,
      );
    }
  });

  it("maps the department from the canonical code, not the translated name", () => {
    // A Hindi answer translates `medical_specialty` but never `specialty_code`.
    const answer = toAssistantAnswer(
      response({ medical_specialty: "हृदय रोग विज्ञान", specialty_code: "Cardiology" }),
    );

    expect(answer.department).toBe("Cardiology");
    expect(answer.specialty).toBe("हृदय रोग विज्ञान");
  });

  it("shows at most three clinics", () => {
    const answer = toAssistantAnswer(
      response({
        nearby_specialists: Array.from({ length: 8 }, (_, index) =>
          specialist({ name: `Clinic ${index}`, place_id: `place-${index}` }),
        ),
      }),
    );

    expect(answer.doctors).toHaveLength(3);
  });

  it("handles a local-database result with no distance or maps link", () => {
    const answer = toAssistantAnswer(
      response({
        nearby_specialists: [
          specialist({ distance: null, maps_url: null, place_id: null, latitude: null }),
        ],
      }),
    );

    expect(answer.doctors[0].distanceKm).toBeNull();
    expect(answer.doctors[0].mapsUrl).toBeNull();
    // Still needs a stable list key.
    expect(answer.doctors[0].id).toBeTruthy();
  });

  it("survives a response with no nearby specialists at all", () => {
    const answer = toAssistantAnswer(response({ nearby_specialists: undefined as never }));
    expect(answer.doctors).toEqual([]);
  });
});

describe("askMedicalAssistant", () => {
  beforeEach(() => {
    mockMedicalRequest.mockReset();
    mockMedicalRequest.mockResolvedValue(response());
  });

  it("sends the question, the coordinates and the language", async () => {
    await askMedicalAssistant("my chest hurts", {
      coords: { lat: 26.14, lng: 91.73 },
      language: "hi",
    });

    expect(mockMedicalRequest).toHaveBeenCalledWith(
      "/api/v1/medical/query",
      { query: "my chest hurts", latitude: 26.14, longitude: 91.73, language: "hi" },
      expect.anything(),
    );
  });

  it("omits the coordinates entirely when location was not shared", async () => {
    await askMedicalAssistant("my chest hurts", { coords: null, language: "en" });

    // The backend rejects unknown fields and treats absent coordinates as
    // "no location" — sending nulls would be a 422.
    const [, body] = mockMedicalRequest.mock.calls[0];
    expect(body).toEqual({ query: "my chest hurts", language: "en" });
  });

  it("passes the abort signal through so the stop button works", async () => {
    const controller = new AbortController();
    await askMedicalAssistant("hello", { language: "en", signal: controller.signal });

    const [, , options] = mockMedicalRequest.mock.calls[0];
    expect(options.signal).toBe(controller.signal);
  });
});
