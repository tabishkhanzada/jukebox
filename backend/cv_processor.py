"""
NASA Earth Information Jukebox - Computer Vision & Image Processing Module
Module 8: OpenCV-powered multi-spectral satellite frame analysis:
- Perceptual luminance & brightness profiling (ITU-R BT.709)
- Color space conversion (BGR -> HSV, LAB, RGB)
- Spatial column binning & latitude band discretization
- Thermal / aerosol feature density & anomaly segmentation
- Parameter-to-pitch mathematical sonification mapping
"""

import os
import cv2
import numpy as np
from typing import Dict, List, Any, Optional

EIC_FRAMES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "assets", "eic_frames"))

EIC_FRAMES_METADATA = {
    "sst": {
        "id": "sst",
        "title": "Sea Surface Temperature & Coral Thermal Stress",
        "mission": "NASA EIC • MODIS / VIIRS Sensor Blend",
        "file_name": "sst_thermal_stress.png",
        "parameter": "Sea Surface Temperature Anomaly",
        "unit": "°C",
        "range": "0°C to +32°C",
        "description": "Equatorial Pacific warm pool anomaly, Kuroshio current thermal plumes, and high coral bleaching risk zones."
    },
    "sea_level": {
        "id": "sea_level",
        "title": "Dynamic Sea Level Rise & Ocean Mass Variations",
        "mission": "NASA EIC • GRACE-FO & Jason-3 Radar Altimetry",
        "file_name": "sea_level_anomaly.png",
        "parameter": "Dynamic Ocean Mass Anomaly",
        "unit": "cm",
        "range": "-10 cm to +25 cm",
        "description": "Western Pacific water column expansion and Indian Ocean mass redistribution captured via satellite gravimetry."
    },
    "wildfire": {
        "id": "wildfire",
        "title": "Wildfire Smoke & Aerosol Optical Depth (AOD)",
        "mission": "NASA EIC • Aqua MODIS & OMPS Atmospheric Sensors",
        "file_name": "wildfire_aerosol.png",
        "parameter": "Aerosol Optical Depth",
        "unit": "AOD",
        "range": "0.0 to 2.0 AOD",
        "description": "Intense boreal smoke corridors across Canada and Siberia, Amazon basin biomass burning, and trans-oceanic drift."
    },
    "arctic": {
        "id": "arctic",
        "title": "Polar Cryosphere & Arctic Sea Ice Minimum",
        "mission": "NASA EIC • ICESat-2 Spaceborne Lidar",
        "file_name": "arctic_cryosphere.png",
        "parameter": "Sea Ice Thickness & Extent",
        "unit": "% Pack Ice",
        "range": "0% (Open Ocean) to 100% (Glacial Pack)",
        "description": "September Arctic minimum pack ice margins, multi-year glacial ice cap, and Antarctic shelf thermal dynamics."
    },
    "night_lights": {
        "id": "night_lights",
        "title": "Change in Night Lights (2012–2023)",
        "mission": "NASA SVS #5313 • Suomi NPP VIIRS DNB",
        "file_name": "night_lights.jpg",
        "parameter": "Urban Radiant Light Intensity",
        "unit": "nW/(cm²·sr)",
        "range": "0 to >100 nW",
        "description": "Decadal shift in planetary urban illumination, high-contrast human footprint, and power grid evolution."
    },
    "ocean_currents": {
        "id": "ocean_currents",
        "title": "Global Sea Surface Currents & Temperature",
        "mission": "NASA SVS #3912 • ECCO2 Modeling",
        "file_name": "ocean_currents.jpg",
        "parameter": "Current Flow Velocity & Thermal Gradients",
        "unit": "m/s, °C",
        "range": "-2°C to +32°C",
        "description": "Continuous fluid movement of Earth's ocean currents coupled with thermal gradients and dynamic kinetic vortices."
    },
    "geos_aerosols": {
        "id": "geos_aerosols",
        "title": "GEOS Aerosols: Dust, Smoke & Sulfate Plumes",
        "mission": "NASA SVS #5669 • Goddard Earth Observing System",
        "file_name": "geos_aerosols.jpg",
        "parameter": "Aerosol Speciation & Optical Thickness",
        "unit": "AOD",
        "range": "0.0 to 3.5 AOD",
        "description": "Multi-spectral tracking of trans-continental wildfire smoke, Saharan dust plumes, and industrial sea-salt sulfates."
    },
    "co2_flux": {
        "id": "co2_flux",
        "title": "DYAMOND Global Carbon Dioxide (CO2)",
        "mission": "NASA SVS #5196 • High-Res Earth System Model",
        "file_name": "co2_flux.jpg",
        "parameter": "Atmospheric CO2 Concentration",
        "unit": "PPM",
        "range": "395 to 430 PPM",
        "description": "Ultra-high-resolution simulation of global CO2 plumes, seasonal terrestrial biosphere respiration, and emissions."
    },
    "iss_lightning": {
        "id": "iss_lightning",
        "title": "Lightning Events Detected from the ISS",
        "mission": "NASA SVS #5011 • ISS Lightning Imaging Sensor (LIS)",
        "file_name": "iss_lightning.jpg",
        "parameter": "Optical Flash Radiance Density",
        "unit": "Flashes/km²/yr",
        "range": "0 to 150 Flashes",
        "description": "Orbital spaceborne recording of global lightning flash geography, tropical convection centers, and convective storm hubs."
    },
    "atmospheric_river": {
        "id": "atmospheric_river",
        "title": "Atmospheric River Moisture Transport",
        "mission": "NASA SVS #4960 • Earth System Modeling",
        "file_name": "atmospheric_river.jpg",
        "parameter": "Integrated Vapor Transport (IVT)",
        "unit": "kg/(m·s)",
        "range": "0 to 1200 kg/(m·s)",
        "description": "Extratropical filamentary moisture corridors conveying immense atmospheric water vapor across planetary oceanic basins."
    },
    "gedi_forest": {
        "id": "gedi_forest",
        "title": "GEDI Global Forest Canopy Height",
        "mission": "NASA SVS #4950 • GEDI Spaceborne Lidar",
        "file_name": "gedi_forest.jpg",
        "parameter": "Forest Canopy Top Height (RH98)",
        "unit": "Meters",
        "range": "0 m to 65 m",
        "description": "Spaceborne lidar profiling of planetary 3D forest vertical canopy architecture, biomass density, and carbon storage."
    },
    "perpetual_ocean": {
        "id": "perpetual_ocean",
        "title": "Perpetual Ocean: Western Boundary Currents",
        "mission": "NASA SVS #5425 • ECCO2 High-Resolution",
        "file_name": "perpetual_ocean.jpg",
        "parameter": "Kinetic Streamflow & Boundary Eddies",
        "unit": "cm/s",
        "range": "0 to 200 cm/s",
        "description": "High-contrast western boundary currents, mesoscale eddies, and Gulf Stream / Kuroshio kinetic streamflows."
    },
    "air_quality": {
        "id": "air_quality",
        "title": "Air Quality Atmospheric Model Runs",
        "mission": "NASA SVS #5533 • SVS Atmospheric Chemistry",
        "file_name": "air_quality.jpg",
        "parameter": "Ground-Level Particulate Concentration",
        "unit": "µg/m³",
        "range": "0 to 180 µg/m³",
        "description": "High-resolution air quality forecasts capturing particulate density, urban nitrogen dioxide plumes, and ozone precursors."
    }
}

# Musical Scale Degrees across 3 octaves (C3 to C6 Pentatonic Major)
HARMONIC_PENTATONIC_SCALE = [
    "C3", "D3", "E3", "G3", "A3",
    "C4", "D4", "E4", "G4", "A4",
    "C5", "D5", "E5", "G5", "A5", "C6"
]

FREQUENCY_MAP = {
    "C3": 130.81, "D3": 146.83, "E3": 164.81, "G3": 196.00, "A3": 220.00,
    "C4": 261.63, "D4": 293.66, "E4": 329.63, "G4": 392.00, "A4": 440.00,
    "C5": 523.25, "D5": 587.33, "E5": 659.25, "G5": 783.99, "A5": 880.00, "C6": 1046.50
}


def get_all_frames_metadata() -> List[Dict[str, Any]]:
    """Returns metadata for all available curated NASA EIC visual frames."""
    frames = []
    for key, meta in EIC_FRAMES_METADATA.items():
        file_path = os.path.join(EIC_FRAMES_DIR, meta["file_name"])
        exists = os.path.exists(file_path)
        frames.append({
            **meta,
            "available": exists,
            "url": f"/assets/eic_frames/{meta['file_name']}"
        })
    return frames


def analyze_image_with_opencv(img_bgr: np.ndarray, num_cols: int = 128, num_bins: int = 16) -> Dict[str, Any]:
    """
    Core Computer Vision analysis engine using OpenCV.
    Processes satellite image array, computing brightness, color distributions,
    feature density, anomaly hotspots, and column-wise spatial sonification profiles.
    """
    if img_bgr is None or img_bgr.size == 0:
        raise ValueError("Invalid image buffer passed to OpenCV processor.")

    h, w = img_bgr.shape[:2]

    # 1. Color Space Conversions via OpenCV
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

    # 2. Perceptual Luminance Map (ITU-R BT.709 colorimetric formula)
    # 0.2126 * R + 0.7152 * G + 0.0722 * B
    weights = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    luminance_map = np.dot(img_rgb.astype(np.float32), weights) / 255.0  # Normalized [0.0, 1.0]

    # Global Brightness Statistics
    mean_brightness = float(np.mean(luminance_map))
    max_brightness = float(np.max(luminance_map))
    min_brightness = float(np.min(luminance_map))

    # 3. Anomaly & Active Feature Density Extraction via OpenCV Thresholding
    # Dynamic Noise Gate: Filter out background deep space & dark open ocean (< 8% luminance)
    active_mask = (luminance_map > 0.08).astype(np.uint8) * 255
    active_pixel_count = int(np.count_nonzero(active_mask))
    total_pixels = h * w
    global_feature_density_pct = round((active_pixel_count / total_pixels) * 100.0, 2)

    # Hotspot Detection: Locate peak optical/thermal coordinate
    min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(luminance_map)
    peak_x, peak_y = max_loc
    peak_lat = round(90.0 - (peak_y / h) * 180.0, 2)
    peak_lon = round((peak_x / w) * 360.0 - 180.0, 2)

    # 4. Color Spectrum Histogram via OpenCV
    hist_h = cv2.calcHist([img_hsv], [0], None, [12], [0, 180])
    hist_h = [round(float(val[0]) / total_pixels * 100.0, 2) for val in hist_h]

    # 5. Spatial Column Binning & Sonification Profile
    # Resize image to analytical grid (num_cols x (num_bins * 4)) for fast column profiling
    resized_rgb = cv2.resize(img_rgb, (num_cols, num_bins * 4), interpolation=cv2.INTER_AREA)
    grid_h = num_bins * 4
    bin_height = grid_h // num_bins

    column_profiles = []

    for c in range(num_cols):
        col_slice = resized_rgb[:, c, :]
        lon_deg = round((c / (num_cols - 1)) * 360.0 - 180.0, 1)

        # Column mean brightness
        col_lum = (0.2126 * col_slice[:, 0] + 0.7152 * col_slice[:, 1] + 0.0722 * col_slice[:, 2]) / 255.0
        col_mean_lum = float(np.mean(col_lum))

        # Column active feature density
        col_active_count = np.count_nonzero(col_lum > 0.08)
        col_density_pct = round((col_active_count / grid_h) * 100.0, 1)

        # Dominant color of the column
        mean_r = int(np.mean(col_slice[:, 0]))
        mean_g = int(np.mean(col_slice[:, 1]))
        mean_b = int(np.mean(col_slice[:, 2]))

        # Calculate dominant latitude bins for audio notes
        bin_notes = []
        for b in range(num_bins):
            b_start = b * bin_height
            b_end = (b + 1) * bin_height
            b_lum = float(np.mean(col_lum[b_start:b_end]))

            if b_lum > 0.08:
                # Bin 0 (North Pole = top) to Bin 15 (South Pole = bottom)
                scale_idx = (num_bins - 1) - b
                note_name = HARMONIC_PENTATONIC_SCALE[scale_idx]
                freq = FREQUENCY_MAP.get(note_name, 440.0)
                gain = round(min(1.0, max(0.1, (b_lum - 0.08) / 0.92)), 2)
                bin_notes.append({
                    "bin": b,
                    "note": note_name,
                    "frequency_hz": freq,
                    "brightness": round(b_lum, 3),
                    "gain": gain
                })

        # Limit to top 4 consonant voices for clean playback
        bin_notes.sort(key=lambda x: x["brightness"], reverse=True)
        active_chords = bin_notes[:4]

        column_profiles.append({
            "column_index": c,
            "longitude": lon_deg,
            "mean_brightness": round(col_mean_lum, 3),
            "density_pct": col_density_pct,
            "dominant_rgb": [mean_r, mean_g, mean_b],
            "active_notes": [n["note"] for n in active_chords],
            "active_voices": active_chords
        })

    return {
        "dimensions": {"width": w, "height": h},
        "optical_metrics": {
            "mean_brightness_pct": round(mean_brightness * 100.0, 1),
            "max_brightness_pct": round(max_brightness * 100.0, 1),
            "min_brightness_pct": round(min_brightness * 100.0, 1),
            "active_feature_density_pct": global_feature_density_pct,
            "active_pixels": active_pixel_count,
            "total_pixels": total_pixels
        },
        "hotspot": {
            "pixel_x": peak_x,
            "pixel_y": peak_y,
            "latitude": peak_lat,
            "longitude": peak_lon,
            "peak_brightness_pct": round(max_val * 100.0, 1)
        },
        "spectral_distribution": {
            "hue_histogram_pct": hist_h
        },
        "spatial_columns_count": num_cols,
        "columns": column_profiles
    }


def analyze_frame_by_key(frame_key: str) -> Dict[str, Any]:
    """Loads and executes OpenCV analysis on a curated NASA EIC frame by key."""
    if frame_key not in EIC_FRAMES_METADATA:
        raise ValueError(f"Unknown NASA EIC frame key: '{frame_key}'. Valid keys: {list(EIC_FRAMES_METADATA.keys())}")

    meta = EIC_FRAMES_METADATA[frame_key]
    file_path = os.path.join(EIC_FRAMES_DIR, meta["file_name"])

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"NASA EIC image frame not found at: {file_path}")

    img_bgr = cv2.imread(file_path)
    analysis = analyze_image_with_opencv(img_bgr)

    return {
        "frame_metadata": meta,
        "computer_vision_analysis": analysis
    }

