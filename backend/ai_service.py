"""
NASA Earth Information Jukebox - Climatological Intelligence Engine
Computes authentic meteorological analyses from NASA POWER observations.
Optionally integrates with Groq LLM if GROQ_API_KEY is configured in the environment.
"""

import os
import logging
from typing import Dict, Any

logger = logging.getLogger("EarthJukebox.Climatology")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def generate_climate_analysis(
    city: str,
    year: int,
    data_type: str,
    insights: Dict[str, Any],
    location_meta: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Produces authentic climatological analysis based on real NASA POWER data.
    If GROQ_API_KEY is provided, uses Groq Llama-3.1 for atmospheric summary.
    Otherwise, computes an authentic data-driven meteorological analysis.
    """
    # 1. Real Groq API Call if Key is Configured
    if GROQ_API_KEY:
        try:
            import requests
            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            prompt = (
                f"You are a NASA atmospheric scientist. Analyze the following authentic NASA POWER {data_type} data for {city} in {year}.\n"
                f"Climate Zone: {location_meta.get('climate', 'Standard Station')}\n"
                f"Annual Mean: {insights.get('mean')} {insights.get('unit', '')}\n"
                f"Maximum Peak: {insights.get('max')} on {insights.get('peak_record', {}).get('date')}\n"
                f"Minimum Trough: {insights.get('min')} on {insights.get('trough_record', {}).get('date')}\n"
                f"Days > 35C: {insights.get('days_above_35c', 'N/A')}, Days < 0C: {insights.get('days_below_0c', 'N/A')}\n"
                f"Total Rain: {insights.get('total_rainfall', 'N/A')} mm, Dry Spell: {insights.get('longest_dry_spell_days', 'N/A')} days\n"
                f"Provide a concise 3-4 sentence scientific breakdown of seasonal transitions, climate anomalies, "
                f"and how listeners hear these shifts in the musical sonification."
            )
            payload = {
                "model": "llama-3.1-8b-instant",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 220
            }
            res = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=8)
            if res.ok:
                ai_text = res.json()["choices"][0]["message"]["content"].strip()
                return {
                    "source": "Groq Llama-3.1 (NASA Data)",
                    "summary": ai_text
                }
        except Exception as e:
            logger.warning(f"Groq API connection unavailable ({e}); utilizing authentic scientific analysis engine.")

    # 2. Authentic Meteorological Rules Engine (100% Calculated from Real NASA Observations)
    mean_val = insights.get("mean", 0)
    max_val = insights.get("max", 0)
    min_val = insights.get("min", 0)
    peak_date = insights.get("peak_record", {}).get("date", "N/A")
    trough_date = insights.get("trough_record", {}).get("date", "N/A")

    if data_type == "temperature":
        swing = round(max_val - min_val, 1)
        heat_days = insights.get("days_above_35c", 0)
        freeze_days = insights.get("days_below_0c", 0)

        climate_notes = []
        if heat_days > 0:
            climate_notes.append(f"{heat_days} days exceeded extreme heat thresholds (>35°C)")
        if freeze_days > 0:
            climate_notes.append(f"{freeze_days} days registered freezing conditions (<0°C)")
        if not climate_notes:
            climate_notes.append("temperatures remained within moderate temperate limits throughout the year")

        summary = (
            f"Authentic NASA observations for {city} in {year} reveal an annual thermal range of {swing}°C "
            f"(mean: {mean_val}°C). The warmest event occurred on {peak_date} peaking at {max_val}°C, "
            f"producing the highest melodic pitch in playback. The annual trough was recorded on {trough_date} at {min_val}°C. "
            f"Station telemetry confirms {'; '.join(climate_notes)}."
        )
    elif data_type == "rainfall":
        total = insights.get("total_rainfall", 0)
        rain_days = insights.get("rain_days_count", 0)
        heavy_days = insights.get("heavy_rain_days", 0)
        dry_spell = insights.get("longest_dry_spell_days", 0)

        summary = (
            f"Hydrological observations from NASA POWER indicate {total} mm of precipitation across {rain_days} active rain days in {year}. "
            f"The single heaviest downpour struck on {peak_date} measuring {max_val} mm, triggering the most resonant drum strike. "
            f"The year featured a sustained dry spell of {dry_spell} consecutive dry days, and {heavy_days} heavy precipitation events (>15 mm/day)."
        )
    else:
        summary = (
            f"Mean surface wind velocity at 2m was recorded at {mean_val} m/s in {city} for {year}, "
            f"with maximum daily velocity reaching {max_val} m/s on {peak_date}."
        )

    return {
        "source": "NASA POWER Scientific Analysis Engine",
        "summary": summary
    }
