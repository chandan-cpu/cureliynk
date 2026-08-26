import requests

from app.config.settings import settings
from app.providers.specialist_provider import SpecialistProvider


class GeoapifySpecialistProvider(SpecialistProvider):

    BASE_URL = "https://api.geoapify.com/v2/places"

    def search_specialists(
        self,
        specialty: str,
        latitude: float,
        longitude: float,
        radius_km: float = 10.0,
    ):

        category_map = {
            "cardiology":
                "healthcare.clinic_or_praxis.cardiology",

            "pediatrics":
                "healthcare.clinic_or_praxis.paediatrics",
        }

        category = category_map.get(
            specialty.lower()
        )

        if not category:
            return []

        radius_meters = int(
            radius_km * 1000
        )

        params = {
            "categories": category,

            "filter": (
                f"circle:"
                f"{longitude},"
                f"{latitude},"
                f"{radius_meters}"
            ),

            "bias": (
                f"proximity:"
                f"{longitude},{latitude}"
            ),

            "limit": 20,

            "apiKey": settings.GEOAPIFY_API_KEY,
        }

        response = requests.get(
            self.BASE_URL,
            params=params,
            timeout=60,
        )

        response.raise_for_status()

        data = response.json()

        features = data.get("features",[])

        result = []

        for place in features:

            properties = place.get(
                "properties",
                {}
            )

            result.append({
                "name": properties.get(
                    "name",
                    "Unknown Provider"
                ),

                "specialty": specialty,

                "doctor_type": specialty,

                "distance": properties.get(
                    "distance",
                    0.0
                ),

                "address": properties.get(
                    "formatted",
                    "Address unavailable"
                ),

                "latitude": properties.get(
                    "lat"
                ),

                "longitude": properties.get(
                    "lon"
                ),
            })

        return result