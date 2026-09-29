from app.providers.geoapify_laboratory_provider import (
    GeoapifyLaboratoryProvider
)


class LaboratoryService:

    def __init__(self, provider=None):
        self.provider = (
            provider
            or GeoapifyLaboratoryProvider()
        )

    def find_nearby(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 10.0,
        limit: int = 10,
    ):

        return self.provider.find_nearby_laboratories(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            limit=limit,
        )