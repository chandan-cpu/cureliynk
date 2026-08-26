import { fireEvent } from "@testing-library/react-native";
import { Linking } from "react-native";

import { DoctorListItem } from "@/components/dashboard/doctor-list-item";
import type { Doctor } from "@/lib/doctors";

import { renderWithProviders } from "@/test/dashboard-test-utils";

const baseDoctor: Doctor = {
  name: "Dr. Asha Verma",
  address: "12 MG Road, Guwahati",
  rating: 4.5,
  reviewsCount: 128,
  distanceKm: 2.3,
  placeId: "place-1",
  mapsUrl: "https://maps.google.com/?q=place-1",
};

describe("DoctorListItem", () => {
  let openURLSpy: jest.SpyInstance;

  beforeEach(() => {
    openURLSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
  });

  afterEach(() => {
    openURLSpy.mockRestore();
  });

  it("renders the doctor's name, rating, and distance", async () => {
    const { getByText } = await renderWithProviders(<DoctorListItem doctor={baseDoctor} />);

    expect(getByText("Dr. Asha Verma")).toBeTruthy();
    expect(getByText("12 MG Road, Guwahati")).toBeTruthy();
    expect(getByText("4.5 (128 reviews)")).toBeTruthy();
    expect(getByText("2.3 km away")).toBeTruthy();
  });

  it("opens the doctor's maps URL when pressed", async () => {
    const { getByText } = await renderWithProviders(<DoctorListItem doctor={baseDoctor} />);

    fireEvent.press(getByText("Dr. Asha Verma"));

    expect(openURLSpy).toHaveBeenCalledWith(baseDoctor.mapsUrl);
  });

  it("omits rating and distance when the data is unavailable", async () => {
    const doctor: Doctor = { ...baseDoctor, rating: null, distanceKm: null };
    const { queryByText } = await renderWithProviders(<DoctorListItem doctor={doctor} />);

    expect(queryByText(/reviews/)).toBeNull();
    expect(queryByText(/km away/)).toBeNull();
  });
});
