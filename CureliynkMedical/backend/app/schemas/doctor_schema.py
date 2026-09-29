from pydantic import BaseModel


class DoctorCreate(BaseModel):

    doctor_name: str

    specialty: str

    source_specialty: str

    district: str

    facility: str

    state: str

    source: str

    source_year: int

    source_file: str

    source_sl_no: int

    source_page: int