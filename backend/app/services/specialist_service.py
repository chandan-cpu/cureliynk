from app.services.location_service import Locationservices

class Specialist_Service:
    def __init__(self,provider):

        self.provider = provider

    def find_nearby_specialist(self,specialty:str,latitude:float,longitude:float,distance_km:float):
        specialty = self.provider.search_specialists(specialty,latitude,longitude,distance_km)
        result =[]
        for item in specialty:
            Loca = Locationservices()

            distance = Loca.calculate_distance(latitude1=latitude,longitude1=longitude,latitude2=item['latitude'],longitude2=item['longitude'])

            if distance<=distance_km:
                result.append({"name":item["name"],"speciality":item["specialty"],"doctor_type":item["doctor_type"],"distance":distance,"location":item["address"]})
        return result

