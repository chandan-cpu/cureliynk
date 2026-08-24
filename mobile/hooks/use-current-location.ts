import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";

import { getPermissionGranted } from "@/lib/permissions";

type LocationState =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "error" }
  | { status: "granted"; coords: { lat: number; lng: number } };

/**
 * Reads the device's current position for the nearby-doctors search.
 * Location permission is already requested during onboarding, so this only
 * checks the current grant — it deliberately does not re-prompt a user who
 * denied it (that's a poor pattern); `retry()` re-checks after they've
 * enabled it manually in Settings.
 */
export function useCurrentLocation() {
  const [state, setState] = useState<LocationState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });

    const granted = await getPermissionGranted("location");
    if (!granted) {
      setState({ status: "denied" });
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({});
      setState({
        status: "granted",
        coords: { lat: position.coords.latitude, lng: position.coords.longitude },
      });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { state, retry: load };
}
