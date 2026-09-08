"""
Specialist search.

Turns a raw provider result into the narrow, client-facing shape defined by
`app.api.schemas.NearbySpecialist` - and drops everything else the maps API
returned, so nothing unexpected leaks into a response.
"""

import logging

from app.services.location_service import Locationservices


logger = logging.getLogger(__name__)


class Specialist_Service:

    def __init__(self, provider):
        self.provider = provider

        # One instance instead of one per result row; it holds no state.
        self.location = Locationservices()

    def find_nearby_specialist(
        self,
        specialty: str,
        latitude: float,
        longitude: float,
        distance_km: float,
    ):
        """
        Providers of `specialty` within `distance_km` of the user, nearest
        first.

        The maps API biases its search by location but does not guarantee a
        radius, so results are filtered by real distance here.
        """

        places = self.provider.search_specialists(
            specialty,
            latitude,
            longitude,
            distance_km,
        )

        results = []

        for item in places or []:
            place_latitude = item.get("latitude")
            place_longitude = item.get("longitude")

            # A result with no coordinates cannot be distance-checked, and an
            # unchecked result could be in another city.
            if place_latitude is None or place_longitude is None:
                continue

            try:
                distance = self.location.calculate_distance(
                    latitude1=latitude,
                    longitude1=longitude,
                    latitude2=place_latitude,
                    longitude2=place_longitude,
                )

            except (TypeError, ValueError):
                logger.warning(
                    "Skipped a provider result with unusable coordinates."
                )

                continue

            if distance > distance_km:
                continue

            results.append({
                "name": item.get("name") or "Unknown Provider",

                "speciality": item.get("specialty") or specialty,

                "doctor_type": item.get("doctor_type") or specialty,

                "distance": round(distance, 2),

                "location": item.get("address") or "Address unavailable",

                "latitude": place_latitude,

                "longitude": place_longitude,

                # Lets the app open the place in the user's maps app instead
                # of only being able to show its name.
                "maps_url": item.get("google_maps_url"),

                "place_id": item.get("place_id"),
            })

        # Nearest first - the chat screen only shows the top few.
        results.sort(key=lambda provider: provider["distance"])

        return results
