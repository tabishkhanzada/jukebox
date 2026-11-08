"""Pre-cache top preset cities for offline and instant demo response."""
from backend.data_service import get_earth_data

cities = ["Lahore", "London", "New York", "Dubai", "Tokyo"]
params = ["temperature", "rainfall"]

print("Pre-warming NASA POWER telemetry cache...")
for city in cities:
    for p in params:
        try:
            res = get_earth_data(city=city, data_type=p, year=2024)
            print(f"✓ Cached {city} ({p}): {len(res['dates'])} days (mean: {res['insights']['mean']})")
        except Exception as e:
            print(f"✗ Failed {city} ({p}): {e}")

print("Pre-cache complete!")

