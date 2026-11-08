"""
NASA Earth Information Jukebox - AI Climate Intelligence Engine
Provides in-depth climate narratives, extreme event analysis, and optional
Groq LLM integration with automatic rule-based climatological fallback.
"""

import os
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("EarthJukebox.AIService")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def generate_ai_climate_analysis(
    city: str,
    year: int,
    data_type: str,
    insights: Dict[str, Any],
    location_meta: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generates an intelligent climate anomaly brief.
    If GROQ_API_KEY is present, queries Groq (Llama-3/Mixtral) for rich meteorological commentary.
    Otherwise, generates an expert rule-based atmospheric analysis.
    """
    # 1. Check if Groq API is available
    if GROQ_API_KEY:
        try:
            import requests
            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            prompt = (
                f"You are a NASA atmospheric scientist. Analyze the following {data_type} dataset for {city} in {year}.\n"
                f"Climate Zone: {location_meta.get('climate', 'Unknown')}\n"
                f"Annual Mean: {insights.get('mean')} {insights.get('unit', '')}\n"
                f"Maximum Peak: {insights.get('max')} on {insights.get('peak_record', {}).get('date')}\n"
                f"Minimum Trough: {insights.get('min')} on {insights.get('trough_record', {}).get('date')}\n"
                f"Provide a concise, 3-4 sentence scientific breakdown of seasonal transitions, extreme weather anomalies, "
                f"and how this reflects in audio pitch or rhythm."
            )
            payload = {
                "model": "llama-3.1-8b-instant",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.4,
                "max_tokens": 200
            }
            res = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=8)
            if res.ok:
                ai_text = res.json()["choices"][0]["message"]["content"].strip()
                return {
                    "source": "Groq AI (Llama-3.1)",
                    "summary": ai_text
                }
        except Exception as e:
            logger.warning(f"Groq API call failed or timed out: {e}. Falling back to rule-based engine.")

    # 2. Expert Rule-Based Climatological Engine (Zero Dependency / Offline Guaranteed)
    mean_val = insights.get("mean", 0)
    max_val = insights.get("max", 0)
    min_val = insights.get("min", 0)
    peak_date = insights.get("peak_record", {}).get("date", "N/A")
    trough_date = insights.get("trough_record", {}).get("date", "N/A")

    if data_type == "temperature":
        swing = round(max_val - min_val, 1)
        if swing > 25:
            seasonality = "severe continental temperature volatility"
        elif swing > 15:
            seasonality = "moderate seasonal temperature swings"
        else:
            seasonality = "equatorial thermal stability"

        summary = (
            f"Meteorological analysis for {city} ({year}) indicates {seasonality} with an annual range of {swing}°C. "
            f"The peak thermal event reached {max_val}°C on {peak_date}, creating the apex frequency in the sonification scale. "
            f"Conversely, minimum cooling bottomed out at {min_val}°C on {trough_date}. "
            f"Listeners can clearly detect seasonal transitions as smooth ascending pitch glides during spring and rapid descent in autumn."
        )
    elif data_type == "rainfall":
        total = insights.get("total_rainfall", 0)
        rain_days = insights.get("rain_days_count", 0)
        heavy_days = insights.get("heavy_rain_days", 0)

        summary = (
            f"Hydrological analysis indicates {city} experienced {total} mm of precipitation across {rain_days} active rain events in {year}. "
            f"The season included {heavy_days} heavy downpour events (>15mm/day), with the most concentrated deluge striking on {peak_date} ({max_val} mm). "
            f"In the audio sonification, these precipitation anomalies trigger high-velocity percussive impacts contrasting with long periods of harmonic silence."
        )
    else:
        summary = (
            f"Atmospheric wind patterns in {city} for {year} maintained a mean speed of {mean_val} m/s, "
            f"reaching peak gust velocity of {max_val} m/s on {peak_date}."
        )

    return {
        "source": "NASA Earth Science Rules Engine",
        "summary": summary
    }
