from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config.settings import settings


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    description=(
        "AI-powered medical care navigation assistant "
        "for identifying appropriate medical specialties "
        "and doctor types."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes

app.include_router(router)

# Health Check

@app.get("/",tags=["Health"],)
def root():

    return {
        "message": "AI Medical Assistant API is running",
        "version": settings.API_VERSION,
    }


@app.get("/health",tags=["Health"],)
def health():

    return {"status": "healthy"}