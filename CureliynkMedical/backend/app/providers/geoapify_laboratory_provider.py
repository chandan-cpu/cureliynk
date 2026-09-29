import requests

from app.config.settings import settings


class GeoapifyLaboratoryProvider:

    BASE_URL = "https://places.googleapis.com/v1/places:searchText"

    def find_nearby_laboratories(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 10.0,
        limit: int = 10,
    ):

        radius_meters = min(
            int(radius_km * 1000),
            50000,
        )

        headers = {
            "Content-Type": "application/json",

            "X-Goog-Api-Key": (
                settings.GOOGLE_MAPS_API_KEY
            ),

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

            "textQuery": "medical laboratory",

            "locationBias": {
                "circle": {

                    "center": {
                        "latitude": latitude,
                        "longitude": longitude,
                    },

                    "radius": radius_meters,
                }
            },

            "maxResultCount": min(limit, 20),
        }

        try:

            response = requests.post(
                self.BASE_URL,
                headers=headers,
                json=payload,
                timeout=30,
            )

            response.raise_for_status()

            data = response.json()

        except requests.RequestException as error:

            print(
                f"Google Places laboratory search failed: {error}"
            )

            return []

        places = data.get(
            "places",
            []
        )

        laboratories = []

        for place in places:

            display_name = place.get(
                "displayName",
                {}
            )

            location = place.get(
                "location",
                {}
            )

            laboratories.append({

                "name": display_name.get(
                    "text",
                    "Medical Laboratory"
                ),

                "type": "Laboratory",

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

        return laboratories[:limit]