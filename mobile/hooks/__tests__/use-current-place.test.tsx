import { renderHook, waitFor } from "@testing-library/react-native";

import { useCurrentPlace } from "@/hooks/use-current-place";

const mockReverseGeocode = jest.fn();
jest.mock("expo-location", () => ({
  reverseGeocodeAsync: (...args: unknown[]) => mockReverseGeocode(...args),
}));

const mockUseCurrentLocation = jest.fn();
jest.mock("@/hooks/use-current-location", () => ({
  useCurrentLocation: () => mockUseCurrentLocation(),
}));

const GRANTED = { state: { status: "granted", coords: { lat: 26.14, lng: 91.73 } }, retry: jest.fn() };

/** A geocoder result with every field null unless the test fills one in. */
function address(fields: Record<string, string | null>) {
  return {
    city: null,
    district: null,
    subregion: null,
    region: null,
    name: null,
    street: null,
    streetNumber: null,
    country: null,
    postalCode: null,
    isoCountryCode: null,
    timezone: null,
    formattedAddress: null,
    ...fields,
  };
}

/** Resolves the geocoder to one address and returns the hook's place state. */
async function placeFor(fields: Record<string, string | null> | null) {
  mockReverseGeocode.mockResolvedValue(fields === null ? [] : [address(fields)]);
  const { result } = await renderHook(() => useCurrentPlace());
  await waitFor(() => expect(result.current.place.status).not.toBe("loading"));
  return result.current.place;
}

describe("useCurrentPlace", () => {
  beforeEach(() => {
    mockReverseGeocode.mockReset();
    mockUseCurrentLocation.mockReturnValue(GRANTED);
  });

  it("formats the label as City, State", async () => {
    expect(await placeFor({ city: "Guwahati", region: "Assam" })).toEqual({
      status: "ready",
      label: "Guwahati, Assam",
    });
  });

  // `city` comes back empty in plenty of Indian localities.
  it("falls back to district when city is missing", async () => {
    expect(await placeFor({ district: "Beltola", region: "Assam" })).toEqual({
      status: "ready",
      label: "Beltola, Assam",
    });
  });

  it("falls back to subregion when city and district are missing", async () => {
    expect(await placeFor({ subregion: "Kamrup", region: "Assam" })).toEqual({
      status: "ready",
      label: "Kamrup, Assam",
    });
  });

  it("does not repeat the name when locality and region match", async () => {
    expect(await placeFor({ city: "Delhi", region: "Delhi" })).toEqual({
      status: "ready",
      label: "Delhi",
    });
  });

  it("uses the region alone when there is no locality", async () => {
    expect(await placeFor({ region: "Assam" })).toEqual({ status: "ready", label: "Assam" });
  });

  it("uses the locality alone when there is no region", async () => {
    expect(await placeFor({ city: "Guwahati" })).toEqual({ status: "ready", label: "Guwahati" });
  });

  it("reports unavailable when the geocoder returns nothing", async () => {
    expect(await placeFor(null)).toEqual({ status: "unavailable" });
  });

  it("reports unavailable when the address has no usable fields", async () => {
    expect(await placeFor({})).toEqual({ status: "unavailable" });
  });

  it("reports unavailable when the geocoder throws", async () => {
    mockReverseGeocode.mockRejectedValue(new Error("no geocoder"));

    const { result } = await renderHook(() => useCurrentPlace());

    await waitFor(() => expect(result.current.place).toEqual({ status: "unavailable" }));
  });

  it("reports unavailable without geocoding when location permission is denied", async () => {
    mockUseCurrentLocation.mockReturnValue({ state: { status: "denied" }, retry: jest.fn() });

    const { result } = await renderHook(() => useCurrentPlace());

    await waitFor(() => expect(result.current.place).toEqual({ status: "unavailable" }));
    expect(mockReverseGeocode).not.toHaveBeenCalled();
  });

  it("stays loading while the device position is still being read", async () => {
    mockUseCurrentLocation.mockReturnValue({ state: { status: "loading" }, retry: jest.fn() });

    const { result } = await renderHook(() => useCurrentPlace());

    expect(result.current.place).toEqual({ status: "loading" });
    expect(mockReverseGeocode).not.toHaveBeenCalled();
  });
});
