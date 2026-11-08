"""
NASA Earth Information Jukebox - FastAPI REST Microservice
Module 2: High-performance asynchronous API layer serving normalized climate sonification payloads,
geographic resolution, comparative endpoints, and static application hosting.
"""

import os
from typing import Optional, List
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from backend.data_service import (
    get_earth_data,
    PRESET_CITIES,
    PARAMETERS_METADATA,
    CACHE_DIR
)

app = FastAPI(
    title="NASA Earth Information Jukebox API",
    description="Transforms NASA Earth Observation meteorological telemetry into musical sonification data.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for decoupled frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))


# --- Pydantic Data Models ---
class CityMetadata(BaseModel):
    name: str
    lat: float
    lon: float
    country: str
    climate: str
    description: str


class InsightsModel(BaseModel):
    min: float
    max: float
    mean: float
    std: float
    peak_record: dict
    trough_record: dict
    total_days: int


class EarthDataResponse(BaseModel):
    status: str
    city: str
    identifier: str
    location: dict
    data_type: str
    parameter_code: str
    parameter_name: str
    unit: str
    year: int
    dates: List[str]
    values: List[float]
    normalized: List[float]
    insights: dict
    narrative: str
    data_source: str
    cached: bool


# --- API Routes ---

@app.get("/api/health", tags=["System"])
def health_check():
    """Verify backend status and cached datasets count."""
    cached_files = [f for f in os.listdir(CACHE_DIR) if f.endswith(".json")] if os.path.exists(CACHE_DIR) else []
    return {
        "status": "healthy",
        "service": "Earth Information Jukebox Microservice",
        "version": "1.0.0",
        "cached_datasets_count": len(cached_files),
        "supported_parameters": list(PARAMETERS_METADATA.keys())
    }


@app.get("/api/cities", response_model=List[CityMetadata], tags=["Geography"])
def list_preset_cities():
    """Return all curated NASA Earth observation preset locations."""
    cities = []
    for name, data in PRESET_CITIES.items():
        cities.append(CityMetadata(
            name=name,
            lat=data["lat"],
            lon=data["lon"],
            country=data["country"],
            climate=data["climate"],
            description=data["description"]
        ))
    return cities


@app.get("/api/data", response_model=EarthDataResponse, tags=["Sonification Data"])
def get_climate_data(
    city: Optional[str] = Query(None, description="Preset city name (e.g., Karachi, London, New York)"),
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Custom latitude"),
    lon: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Custom longitude"),
    type: str = Query("temperature", description="Data parameter: 'temperature', 'rainfall', or 'wind'"),
    year: int = Query(2024, ge=1981, le=2024, description="Target calendar year (1981-2024)"),
    force_refresh: bool = Query(False, description="Bypass cache and re-query NASA POWER")
):
    """
    Fetch, clean, and normalize one year of Earth observation telemetry for sonification.
    Returns synchronized dates, raw measurements, and 0-1 scaled values mapped for audio synthesis.
    """
    if type.lower() not in PARAMETERS_METADATA:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid parameter '{type}'. Available: {list(PARAMETERS_METADATA.keys())}"
        )

    try:
        data = get_earth_data(
            city=city,
            lat=lat,
            lon=lon,
            data_type=type,
            year=year,
            force_refresh=force_refresh
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data pipeline error: {str(e)}")


@app.get("/api/compare", tags=["Sonification Data"])
def compare_two_cities(
    city1: str = Query("Karachi", description="First city"),
    city2: str = Query("London", description="Second city"),
    type: str = Query("temperature", description="Parameter to compare"),
    year: int = Query(2024, description="Year")
):
    """
    Compare two climate time-series simultaneously for dual-channel sonification or comparative analysis.
    """
    data1 = get_earth_data(city=city1, data_type=type, year=year)
    data2 = get_earth_data(city=city2, data_type=type, year=year)

    return {
        "status": "success",
        "track1": data1,
        "track2": data2,
        "comparison": {
            "mean_difference": round(data1["insights"]["mean"] - data2["insights"]["mean"], 2),
            "higher_mean": city1 if data1["insights"]["mean"] > data2["insights"]["mean"] else city2,
            "unit": data1["unit"]
        }
    }


# Static frontend hosting (if frontend directory exists)
if os.path.exists(FRONTEND_DIR):
    # Mount frontend files at root with html=True so index.html, style.css, audio.js, etc. are served cleanly
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
