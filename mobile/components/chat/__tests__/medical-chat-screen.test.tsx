import { act, fireEvent, waitFor } from "@testing-library/react-native";

import { MedicalChatScreen } from "@/components/chat/medical-chat-screen";
import { MedicalApiError } from "@/lib/medical-api";
import { renderWithProviders } from "@/test/dashboard-test-utils";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// `@/i18n` initialises i18next against AsyncStorage and expo-localization at
// import time; the tests render against their own instance instead.
jest.mock("@/i18n", () => ({
  SUPPORTED_LANGUAGES: ["en", "hi", "bn", "as"],
  setAppLanguage: jest.fn(),
  default: {},
}));

// Stubbed so importing the real `lib/chat` (and through it `lib/api`) does not
// pull in the native secure-storage modules.
jest.mock("@/lib/auth-storage", () => ({
  getAccessToken: jest.fn().mockResolvedValue("a-valid-token"),
}));

const mockAsk = jest.fn();
jest.mock("@/lib/chat", () => ({
  EXAMPLE_SCENARIOS: ["cardiac", "headache", "pediatric"],
  MAX_SUGGESTED_DOCTORS: 3,
  askMedicalAssistant: (...args: unknown[]) => mockAsk(...args),
}));

const mockLocation = jest.fn();
jest.mock("@/hooks/use-current-location", () => ({
  useCurrentLocation: () => mockLocation(),
}));

// The real hook imports `expo-speech-recognition`, a native module Jest has
// nothing to run against; these tests don't exercise voice input.
jest.mock("@/hooks/use-voice-input", () => ({
  useVoiceInput: () => ({
    state: { status: "idle" },
    isSupported: false,
    start: jest.fn(),
    stop: jest.fn(),
  }),
}));

const GRANTED = { state: { status: "granted", coords: { lat: 26.14, lng: 91.73 } }, retry: jest.fn() };
const DENIED = { state: { status: "denied" }, retry: jest.fn() };

function answer(overrides = {}) {
  return {
    reason: "Exertional chest tightness needs a cardiac review.",
    specialty: "Cardiology",
    doctorType: "Cardiologist",
    urgency: "urgent" as const,
    department: "Cardiology" as const,
    doctors: [
      {
        id: "place-1",
        name: "Nemcare Superspeciality",
        doctorType: "cardiologist",
        distanceKm: 2.4,
        location: "Bhangagarh, Guwahati",
        mapsUrl: "https://maps.google.com/?cid=1",
      },
    ],
    requestId: "req-1",
    ...overrides,
  };
}

type Screen = Awaited<ReturnType<typeof renderWithProviders>>;

/**
 * Types a question into the composer and taps send.
 *
 * The wait is not incidental: the composer only enables its send button once
 * the draft state has flushed, and that does not happen within `changeText`
 * here. Pressing sooner silently does nothing.
 */
async function ask(screen: Screen, text: string) {
  fireEvent.changeText(screen.getByPlaceholderText("Type your symptoms…"), text);

  await waitFor(() =>
    expect(screen.getByLabelText("Send").props.accessibilityState.disabled).toBe(false),
  );

  // Pressing kicks off the request; act() flushes the promise continuation
  // that delivers the answer, so its state updates land inside the test.
  await act(async () => {
    fireEvent.press(screen.getByLabelText("Send"));
  });
}

describe("MedicalChatScreen", () => {
  beforeEach(() => {
    mockAsk.mockReset();
    mockPush.mockReset();
    mockLocation.mockReturnValue(GRANTED);
  });

  afterEach(async () => {
    // Let a request the screen is still awaiting settle inside act(), so its
    // last setState does not land after the test has finished.
    await act(async () => {});
  });

  it("shows the backend's answer, not a canned one", async () => {
    mockAsk.mockResolvedValue(answer());

    const screen = await renderWithProviders(<MedicalChatScreen />);
    await ask(screen, "my chest feels tight");

    await waitFor(() =>
      expect(screen.getByText("Exertional chest tightness needs a cardiac review.")).toBeTruthy(),
    );

    expect(screen.getByText("See a Cardiologist.")).toBeTruthy();
    expect(screen.getByText("Nemcare Superspeciality")).toBeTruthy();
    expect(screen.getByText(/2\.4 km away/)).toBeTruthy();
  });

  it("sends the user's coordinates when location is available", async () => {
    mockAsk.mockResolvedValue(answer());

    const screen = await renderWithProviders(<MedicalChatScreen />);
    await ask(screen, "my chest feels tight");

    await waitFor(() => expect(mockAsk).toHaveBeenCalled());
    expect(mockAsk.mock.calls[0][1].coords).toEqual({ lat: 26.14, lng: 91.73 });
  });

  it("still asks the question when location was declined", async () => {
    mockLocation.mockReturnValue(DENIED);
    mockAsk.mockResolvedValue(answer({ doctors: [] }));

    const screen = await renderWithProviders(<MedicalChatScreen />);
    await ask(screen, "my head hurts");

    await waitFor(() => expect(mockAsk).toHaveBeenCalled());
    expect(mockAsk.mock.calls[0][1].coords).toBeNull();

    // And explains why there are no clinics listed.
    await waitFor(() =>
      expect(screen.getByText("Turn on location to see doctors near you.")).toBeTruthy(),
    );
  });

  it("shows the emergency banner and ambulance button only on emergencies", async () => {
    mockAsk.mockResolvedValue(answer({ urgency: "emergency" }));

    const screen = await renderWithProviders(<MedicalChatScreen />);
    await ask(screen, "crushing chest pain and I cannot breathe");

    await waitFor(() => expect(screen.getByText("Call 108 — ambulance")).toBeTruthy());
    expect(screen.getByText("This may be an emergency. Get help now.")).toBeTruthy();
  });

  it("does not show the emergency UI for an urgent answer", async () => {
    mockAsk.mockResolvedValue(answer({ urgency: "urgent" }));

    const screen = await renderWithProviders(<MedicalChatScreen />);
    await ask(screen, "my chest feels tight");

    await waitFor(() => expect(screen.getByText("See a Cardiologist.")).toBeTruthy());
    expect(screen.queryByText("Call 108 — ambulance")).toBeNull();
  });

  it("offers a retry after a network failure", async () => {
    mockAsk.mockRejectedValueOnce(new MedicalApiError(0, "offline"));

    const screen = await renderWithProviders(<MedicalChatScreen />);
    await ask(screen, "my head hurts");

    await waitFor(() =>
      expect(
        screen.getByText("Couldn't reach the assistant. Check your connection and try again."),
      ).toBeTruthy(),
    );

    mockAsk.mockResolvedValue(answer());
    await act(async () => {
      fireEvent.press(screen.getByText("Try again"));
    });

    await waitFor(() =>
      expect(screen.getByText("Exertional chest tightness needs a cardiac review.")).toBeTruthy(),
    );
    // The retry re-sends the same question rather than asking the user again.
    expect(mockAsk.mock.calls[1][0]).toBe("my head hurts");
  });

  it("does not offer a retry when the session has ended", async () => {
    mockAsk.mockRejectedValue(new MedicalApiError(401, "expired"));

    const screen = await renderWithProviders(<MedicalChatScreen />);
    await ask(screen, "my head hurts");

    await waitFor(() =>
      expect(screen.getByText("Your session has ended. Please sign in again.")).toBeTruthy(),
    );
    expect(screen.queryByText("Try again")).toBeNull();
  });

  it("hands the department to the doctor search when showing all nearby", async () => {
    mockAsk.mockResolvedValue(answer());

    const screen = await renderWithProviders(<MedicalChatScreen />);
    await ask(screen, "my chest feels tight");

    await waitFor(() => expect(screen.getByText("Show all Cardiology nearby")).toBeTruthy());
    fireEvent.press(screen.getByText("Show all Cardiology nearby"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/doctors-results",
      params: { department: "Cardiology", title: "Cardiology" },
    });
  });

  it("stops a request in flight without leaving an error behind", async () => {
    let abortSignal: AbortSignal | undefined;
    mockAsk.mockImplementation(
      (_text: string, options: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          abortSignal = options.signal;
          options.signal?.addEventListener("abort", () => {
            const error = new Error("Aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    );

    const screen = await renderWithProviders(<MedicalChatScreen />);
    await ask(screen, "my head hurts");

    await waitFor(() => expect(screen.getByLabelText("Stop")).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Stop"));
    });

    await waitFor(() => expect(abortSignal?.aborted).toBe(true));
    expect(screen.queryByText("Something went wrong. Please try again.")).toBeNull();
  });
});
