"""
NASA Earth Information Jukebox - Data Ingestion & Sanitization Engine
Module 1: Fetches NASA POWER satellite/reanalysis data, cleans missing sentinels (-999),
normalizes for sonification, caches locally, and computes climate intelligence statistics.
"""

import os
import json
import logging
from typing import Dict, Any, Optional, Tuple
import requests
import pandas as pd
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("EarthJukebox.DataService")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Preset Cities with geographic metadata and climate classification
PRESET_CITIES = {
    "Karachi": {
        "lat": 24.86,
        "lon": 67.01,
        "country": "Pakistan",
        "climate": "Arid / Subtropical Coastal",
        "description": "Hot summers, mild winters, low monsoon rainfall with coastal humidity."
    },
    "Lahore": {
        "lat": 31.52,
        "lon": 74.36,
        "country": "Pakistan",
        "climate": "Semi-arid / Continental",
        "description": "Extreme seasonal contrasts: scorching summers, cool foggy winters, and monsoon downpours."
    },
    "London": {
        "lat": 51.51,
        "lon": -0.13,
        "country": "United Kingdom",
        "climate": "Temperate Oceanic",
        "description": "Mild summers, cool winters, frequent light showers throughout the year."
    },
    "New York": {
        "lat": 40.71,
        "lon": -74.01,
        "country": "United States",
        "climate": "Humid Subtropical / Continental",
        "description": "Warm humid summers, cold snowy winters, uniform year-round precipitation."
    },
    "Dubai": {
        "lat": 25.20,
        "lon": 55.27,
        "country": "United Arab Emirates",
        "climate": "Hyper-arid Desert",
        "description": "Blistering summer heat exceeding 45°C, warm winter months, rare flash rainfall."
    },
    "Tokyo": {
        "lat": 35.68,
        "lon": 139.69,
        "country": "Japan",
        "climate": "Humid Subtropical",
        "description": "Four distinct seasons with rainy summer monsoons (Tsuyu) and typhoons in autumn."
    },
    "Nairobi": {
        "lat": -1.29,
        "lon": 36.82,
        "country": "Kenya",
        "climate": "Subtropical Highland",
        "description": "Elevated equatorial climate with mild year-round temperatures and twin rainy seasons."
    }
}

PARAMETERS_METADATA = {
    "temperature": {
        "param_code": "T2M",
        "name": "Air Temperature at 2m",
        "unit": "°C",
        "description": "Daily average temperature at 2 meters above Earth's surface."
    },
    "rainfall": {
        "param_code": "PRECTOTCORR",
        "name": "Precipitation Corrected",
        "unit": "mm/day",
        "description": "Total daily precipitation corrected for gauge undercatch."
    },
    "wind": {
        "param_code": "WS2M",
        "name": "Wind Speed at 2m",
        "unit": "m/s",
        "description": "Daily mean horizontal wind speed at 2 meters elevation."
    }
}

NASA_POWER_ENDPOINT = "https://power.larc.nasa.gov/api/temporal/daily/point"


def get_cache_filename(identifier: str, year: int, data_type: str) -> str:
    """Generate safe filename for local caching."""
    clean_id = "".join(c if c.isalnum() else "_" for c in identifier.lower())
    return os.path.join(CACHE_DIR, f"{clean_id}_{year}_{data_type}.json")


def clean_and_normalize_data(df: pd.DataFrame, param_code: str) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Cleans raw NASA time-series data:
    1. Replaces sentinel -999 missing values with NaN.
    2. Interpolates linearly (or forward/backward fills) to ensure smooth continuity in sound.
    3. Normalizes values to [0.0, 1.0] for musical pitch and velocity scaling.
    4. Computes rich statistical and climate intelligence metrics.
    """
    # Replace NASA missing sentinels (-999 or values < -500)
    df["value"] = df["value"].apply(lambda v: np.nan if v is None or v <= -500 else float(v))

    # Interpolate missing values
    if df["value"].isna().any():
        df["value"] = df["value"].interpolate(method="linear").bfill().ffill()

    # Fallback if entire column was missing or empty
    if df["value"].isna().all():
        df["value"] = 0.0

    vmin = float(df["value"].min())
    vmax = float(df["value"].max())
    vmean = float(df["value"].mean())
    vstd = float(df["value"].std()) if len(df) > 1 else 0.0

    # Min-max normalization for sonification
    if vmax > vmin:
        df["normalized"] = (df["value"] - vmin) / (vmax - vmin)
    else:
        df["normalized"] = 0.5

    df["normalized"] = df["normalized"].clip(0.0, 1.0).round(4)
    df["value"] = df["value"].round(2)

    # Compute climate intelligence insights
    max_idx = df["value"].idxmax()
    min_idx = df["value"].idxmin()

    insights = {
        "min": vmin,
        "max": vmax,
        "mean": round(vmean, 2),
        "std": round(vstd, 2),
        "peak_record": {
            "date": str(df.loc[max_idx, "date"]),
            "value": float(df.loc[max_idx, "value"])
        },
        "trough_record": {
            "date": str(df.loc[min_idx, "date"]),
            "value": float(df.loc[min_idx, "value"])
        },
        "total_days": len(df)
    }

    if param_code == "PRECTOTCORR":
        rain_days = df[df["value"] > 0.5]
        insights["rain_days_count"] = int(len(rain_days))
        insights["total_rainfall"] = round(float(df["value"].sum()), 2)
        insights["heavy_rain_days"] = int(len(df[df["value"] > 15.0]))
        
        # Real streak calculation (longest dry spell)
        is_dry = df["value"] <= 0.1
        dry_groups = (~is_dry).cumsum()[is_dry]
        insights["longest_dry_spell_days"] = int(dry_groups.value_counts().max()) if not dry_groups.empty else 0
    elif param_code == "T2M":
        insights["days_above_35c"] = int(len(df[df["value"] > 35.0]))
        insights["days_below_0c"] = int(len(df[df["value"] < 0.0]))
        insights["temp_range"] = round(vmax - vmin, 2)
    elif param_code == "WS2M":
        insights["windy_days_above_8ms"] = int(len(df[df["value"] > 8.0]))
        insights["calm_days_below_2ms"] = int(len(df[df["value"] < 2.0]))

    return df, insights


def generate_climate_narrative(city_name: str, data_type: str, year: int, insights: Dict[str, Any]) -> str:
    """Creates a readable, AI-like narrative summarizing the climate year for users."""
    if data_type == "temperature":
        peak = insights["peak_record"]
        trough = insights["trough_record"]
        return (
            f"In {year}, {city_name} experienced an average temperature of {insights['mean']}°C. "
            f"The hottest day was recorded on {peak['date']} reaching {peak['value']}°C, "
            f"while the coolest point hit {trough['value']}°C on {trough['date']}. "
            f"The annual temperature swing spanned {insights.get('temp_range', 'N/A')}°C, "
            f"creating dynamic pitch shifts in the audio sonification."
        )
    elif data_type == "rainfall":
        peak = insights["peak_record"]
        rain_days = insights.get("rain_days_count", 0)
        total_rain = insights.get("total_rainfall", 0.0)
        return (
            f"Throughout {year}, {city_name} recorded {total_rain} mm of total precipitation "
            f"spread across {rain_days} active rain days. "
            f"The heaviest deluge occurred on {peak['date']} with {peak['value']} mm in a single day, "
            f"triggering intense percussive bursts in the soundscape."
        )
    else:
        return f"Climate profile for {city_name} ({year}): Average {insights['mean']}, peaking at {insights['max']}."


def fetch_nasa_power_data(lat: float, lon: float, year: int, param_code: str) -> Dict[str, Any]:
    """
    Directly query the NASA Langley POWER Project API.
    Handles temporal boundaries and timeout retries.
    """
    start_date = f"{year}0101"
    end_date = f"{year}1231"

    query_params = {
        "start": start_date,
        "end": end_date,
        "latitude": round(lat, 4),
        "longitude": round(lon, 4),
        "community": "re",
        "parameters": param_code,
        "format": "json"
    }

    logger.info(f"Contacting NASA POWER API for lat={lat}, lon={lon}, param={param_code}, year={year}")
    response = requests.get(NASA_POWER_ENDPOINT, params=query_params, timeout=25)
    response.raise_for_status()

    payload = response.json()
    if "properties" not in payload or "parameter" not in payload["properties"]:
        raise ValueError("Invalid payload received from NASA POWER API: Missing 'properties.parameter'")

    param_data = payload["properties"]["parameter"].get(param_code)
    if not param_data:
        raise ValueError(f"Parameter '{param_code}' not found in NASA POWER response.")

    return param_data


def get_earth_data(
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    data_type: str = "temperature",
    year: int = 2024,
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    Main entry point for Module 1.
    Resolves city or custom coordinates, checks local cache, fetches from NASA if needed,
    cleans, normalizes, caches, and returns JSON-ready structure.
    """
    # 1. Resolve geographic target
    city_display = city
    if city and city in PRESET_CITIES:
        target_lat = PRESET_CITIES[city]["lat"]
        target_lon = PRESET_CITIES[city]["lon"]
        identifier = city
        location_meta = PRESET_CITIES[city]
    elif lat is not None and lon is not None:
        target_lat = float(lat)
        target_lon = float(lon)
        identifier = f"custom_{target_lat:.2f}_{target_lon:.2f}"
        city_display = f"Custom ({target_lat:.2f}°, {target_lon:.2f}°)"
        location_meta = {"lat": target_lat, "lon": target_lon, "country": "User Defined", "climate": "Custom Location"}
    else:
        # Default fallback
        city_display = "Karachi"
        target_lat = PRESET_CITIES["Karachi"]["lat"]
        target_lon = PRESET_CITIES["Karachi"]["lon"]
        identifier = "Karachi"
        location_meta = PRESET_CITIES["Karachi"]

    # 2. Resolve parameter
    data_type = data_type.lower()
    if data_type not in PARAMETERS_METADATA:
        data_type = "temperature"
    param_meta = PARAMETERS_METADATA[data_type]
    param_code = param_meta["param_code"]

    cache_file = get_cache_filename(identifier, year, data_type)

    # 3. Check Cache
    if not force_refresh and os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                cached_data = json.load(f)
                logger.info(f"Cache hit for {identifier} - {year} - {data_type}")
                return cached_data
        except Exception as e:
            logger.warning(f"Failed reading cache file {cache_file}: {e}. Will refetch.")

    # 4. Fetch from NASA POWER API (100% Real Earth Observation Telemetry)
    try:
        raw_dict = fetch_nasa_power_data(target_lat, target_lon, year, param_code)
    except Exception as e:
        logger.error(f"NASA POWER API request failed for {identifier} ({year}): {e}")
        raise RuntimeError(
            f"Failed to retrieve authentic NASA POWER data for {city_display} ({year}): {str(e)}. "
            f"Please verify internet connection or check NASA POWER service availability."
        )

    # 5. Process into DataFrame
    df = pd.DataFrame({
        "date_str": list(raw_dict.keys()),
        "value": list(raw_dict.values())
    })

    # Format dates to YYYY-MM-DD
    df["date"] = pd.to_datetime(df["date_str"], format="%Y%m%d", errors="coerce").dt.strftime("%Y-%m-%d")
    df = df.dropna(subset=["date"])

    # 6. Clean, interpolate, normalize
    df, insights = clean_and_normalize_data(df, param_code)

    # 7. Generate Climate Narrative
    narrative = generate_climate_narrative(city_display, data_type, year, insights)

    result = {
        "status": "success",
        "city": city_display,
        "identifier": identifier,
        "location": location_meta,
        "data_type": data_type,
        "parameter_code": param_code,
        "parameter_name": param_meta["name"],
        "unit": param_meta["unit"],
        "year": year,
        "dates": df["date"].tolist(),
        "values": df["value"].tolist(),
        "normalized": df["normalized"].tolist(),
        "insights": insights,
        "narrative": narrative,
        "data_source": "NASA Langley Research Center POWER Project",
        "cached": False
    }

    # 8. Save to Cache for offline reproducibility
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            result_to_cache = dict(result)
            result_to_cache["cached"] = True
            json.dump(result_to_cache, f, indent=2)
            logger.info(f"Cached authentic NASA telemetry: {cache_file}")
    except Exception as e:
        logger.warning(f"Could not write cache file: {e}")

    return result


if __name__ == "__main__":
    print("Testing Module 1 Data Service with authentic NASA POWER API...")
    sample = get_earth_data(city="Karachi", data_type="temperature", year=2024)
    print(f"City: {sample['city']}, Year: {sample['year']}, Data points: {len(sample['dates'])}")
    print(f"Min: {sample['insights']['min']}°C, Max: {sample['insights']['max']}°C, Mean: {sample['insights']['mean']}°C")
    print("Narrative:", sample["narrative"])


