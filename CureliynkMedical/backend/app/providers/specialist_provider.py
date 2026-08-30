from abc import ABC, abstractmethod

class SpecialistProvider(ABC):

    @abstractmethod
    def search_specialists(self,specialty:str,latitude:float,longitude:float,radius_km:float=10.0):
        """
        specialit:doctor required for the patient

        altitude:user altitude for location

        longitude:user longitude for location

        radius_km:distance for searching the medical
        """


        raise NotImplementedError