"""
Unit Tests for Module 1: NASA Data Ingestion & Sanitization Engine
"""

import unittest
import pandas as pd
import numpy as np
from backend.data_service import (
    clean_and_normalize_data,
    get_earth_data,
    generate_synthetic_backup,
    PRESET_CITIES,
    PARAMETERS_METADATA
)

class TestDataService(unittest.TestCase):

    def test_preset_cities_integrity(self):
        self.assertIn("Karachi", PRESET_CITIES)
        self.assertIn("London", PRESET_CITIES)
        self.assertIn("New York", PRESET_CITIES)
        for city, meta in PRESET_CITIES.items():
            self.assertIn("lat", meta)
            self.assertIn("lon", meta)
            self.assertTrue(-90 <= meta["lat"] <= 90)
            self.assertTrue(-180 <= meta["lon"] <= 180)

    def test_missing_value_interpolation(self):
        # Create data with NASA -999 sentinels
        raw_df = pd.DataFrame({
            "date": ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04"],
            "value": [20.0, -999.0, -999.0, 26.0]
        })
        cleaned_df, insights = clean_and_normalize_data(raw_df, "T2M")
        
        # Check that -999 was removed and interpolated smoothly
        self.assertNotIn(-999.0, cleaned_df["value"].values)
        self.assertEqual(cleaned_df.loc[1, "value"], 22.0)
        self.assertEqual(cleaned_df.loc[2, "value"], 24.0)
        self.assertEqual(insights["min"], 20.0)
        self.assertEqual(insights["max"], 26.0)

    def test_normalization_bounds(self):
        raw_df = pd.DataFrame({
            "date": ["2024-01-01", "2024-01-02", "2024-01-03"],
            "value": [10.0, 20.0, 30.0]
        })
        cleaned_df, _ = clean_and_normalize_data(raw_df, "T2M")
        norms = cleaned_df["normalized"].tolist()
        self.assertEqual(norms[0], 0.0)
        self.assertEqual(norms[1], 0.5)
        self.assertEqual(norms[2], 1.0)

    def test_synthetic_backup_generation(self):
        synth = generate_synthetic_backup(
            "TestCity",
            {"lat": 30.0, "lon": 70.0},
            "temperature",
            2024,
            PARAMETERS_METADATA["temperature"]
        )
        self.assertEqual(synth["status"], "fallback")
        self.assertEqual(len(synth["dates"]), 366)
        self.assertEqual(len(synth["values"]), 366)
        self.assertEqual(len(synth["normalized"]), 366)

    def test_cached_fetch(self):
        # Karachi was just fetched and cached
        res = get_earth_data(city="Karachi", data_type="temperature", year=2024)
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["cached"], True)
        self.assertEqual(len(res["dates"]), 366)

if __name__ == "__main__":
    unittest.main()

