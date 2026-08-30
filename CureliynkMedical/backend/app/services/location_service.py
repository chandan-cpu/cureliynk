from math import sin,radians,cos,sqrt,atan2

class Locationservices:
    @staticmethod
    def calculate_distance(latitude1:float,longitude1:float,latitude2:float,longitude2:float):

        lat1 = radians(latitude1)
        lat2= radians(latitude2)

        delta_lat=radians(latitude2-latitude1)
        delta_long = radians(longitude1-longitude2)

        earth_radius_km = 6371.0

        a = sin(delta_lat/2)**2 + cos(lat1)*cos(lat2)*sin(delta_long/2)**2

        c = 2*atan2(sqrt(a),sqrt(1-a))

        distances = earth_radius_km*c

        return distances