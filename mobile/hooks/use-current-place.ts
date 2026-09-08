import { useEffect, useState } from "react";
import * as Location from "expo-location";

import { useCurrentLocation } from "@/hooks/use-current-location";

type PlaceState =
  | { status: "loading" }
  /** Permission denied, lookup failed, or the coordinates had no known address. */
  | { status: "unavailable" }
  | { status: "ready"; label: string };

/**
 * Turns the device's coordinates into a short "City, State" label.
 *
 * `reverseGeocodeAsync` runs against the platform's own geocoder (Android
 * Geocoder / iOS CLGeocoder), so this needs no API key and no backend call.
 */
function formatPlace(address: Location.LocationGeocodedAddress): string | null {
  // `city` is empty in plenty of Indian localities, so fall back through the
  // progressively broader fields the geocoder does fill in.
  const locality = address.city ?? address.district ?? address.subregion ?? address.name;
  const area = address.region;

  if (!locality) return area ?? null;
  if (!area || area === locality) return locality;
  return `${locality}, ${area}`;
}

export function useCurrentPlace() {
  const { state: locationState, retry } = useCurrentLocation();
  const [place, setPlace] = useState<PlaceState>({ status: "loading" });

  useEffect(() => {
    if (locationState.status === "loading") {
      setPlace({ status: "loading" });
      return;
    }

    if (locationState.status !== "granted") {
      setPlace({ status: "unavailable" });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: locationState.coords.lat,
          longitude: locationState.coords.lng,
        });

        const label = address ? formatPlace(address) : null;
        if (!cancelled) {
          setPlace(label ? { status: "ready", label } : { status: "unavailable" });
        }
      } catch {
        if (!cancelled) setPlace({ status: "unavailable" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [locationState]);

  return { place, retry };
}
