import requests
from app.config.settings import settings

class GeoapifyGeocondingProvider:

        url = "https://nominatim.openstreetmap.org/reverse"

        def get_location(self,latitude:float,longitude:float):

                params={
                        "lat":latitude,
                        "lon":longitude,
                        "format": "jsonv2",
                         "addressdetails": 1
                }

                headers = {
                        "User-Agent": "AI-Medical-Assistant/1.0"
                    }

                
                response = requests.get(
                        url=self.url,
                        params=params,
                        headers=headers,
                        timeout=30)

                response.raise_for_status()

                data =response.json()

                return data.get("address", {}).get("state_district")