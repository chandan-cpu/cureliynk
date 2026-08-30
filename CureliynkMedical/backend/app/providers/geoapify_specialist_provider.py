import requests

from app.config.settings import settings
from app.providers.specialist_provider import SpecialistProvider


class GeoapifySpecialistProvider(SpecialistProvider):

    BASE_URL = "https://places.googleapis.com/v1/places:searchText"

    def search_specialists(
        self,
        specialty: str,
        latitude: float,
        longitude: float,
        radius_km: float = 10.0,
    ):

        # The LLM decides the specialist.
        # We only convert the LLM output into a
        # Google search query.

        specialist_queries = {

            "cardiology":
                "cardiologist",

            "cardiologist":
                "cardiologist",

            "pediatrics":
                "pediatrician",

            "pediatrician":
                "pediatrician",

            "general medicine":
                "general physician",

            "general physician":
                "general physician",

            "internal medicine":
                "internal medicine doctor",

            "dermatology":
                "dermatologist",

            "dermatologist":
                "dermatologist",

            "neurology":
                "neurologist",

            "neurologist":
                "neurologist",

            "orthopedics":
                "orthopedic doctor",

            "orthopedic":
                "orthopedic doctor",
        }

        search_term = specialist_queries.get(
            specialty.lower().strip(),
            specialty
        )

        radius_meters = min(
            int(radius_km * 1000),
            50000
        )

        headers = {
            "Content-Type": "application/json",

            "X-Goog-Api-Key":
                settings.GOOGLE_MAPS_API_KEY,

            "X-Goog-FieldMask": (
                "places.id,"
                "places.displayName,"
                "places.formattedAddress,"
                "places.location,"
                "places.googleMapsUri,"
                "places.primaryType,"
                "places.types"
            ),
        }

        payload = {

            "textQuery": search_term,

            "locationBias": {
                "circle": {

                    "center": {
                        "latitude": latitude,
                        "longitude": longitude,
                    },

                    "radius": radius_meters,
                }
            },

            "maxResultCount": 20,
        }

        response = requests.post(
            self.BASE_URL,
            headers=headers,
            json=payload,
            timeout=30,
        )

        response.raise_for_status()

        data = response.json()

        places = data.get(
            "places",
            []
        )

        results = []

        for place in places:

            display_name = place.get(
                "displayName",
                {}
            )

            location = place.get(
                "location",
                {}
            )

            results.append({

                "name": display_name.get(
                    "text",
                    "Unknown Provider"
                ),

                "specialty": specialty,

                "doctor_type": search_term,

                "distance": 0.0,

                "address": place.get(
                    "formattedAddress",
                    "Address unavailable"
                ),

                "latitude": location.get(
                    "latitude"
                ),

                "longitude": location.get(
                    "longitude"
                ),

                "place_id": place.get(
                    "id"
                ),

                "google_maps_url": place.get(
                    "googleMapsUri"
                ),

                "primary_type": place.get(
                    "primaryType"
                ),

                "types": place.get(
                    "types",
                    []
                ),
            })

        return results