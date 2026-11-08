from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

# 1. Root index.html check
r_root = client.get("/")
assert r_root.status_code == 200, f"Root failed: {r_root.status_code}"
assert "The Earth Information Jukebox" in r_root.text
print("✓ Root index.html served correctly")

# 2. Static files check at root path
for asset in ["style.css", "audio.js", "chart.js", "app.js"]:
    r_asset = client.get(f"/{asset}")
    assert r_asset.status_code == 200, f"Asset /{asset} failed: {r_asset.status_code}"
    print(f"✓ Static asset /{asset} loaded ({len(r_asset.text)} bytes)")

# 3. API health check
r_health = client.get("/api/health")
assert r_health.status_code == 200
print("✓ Health endpoint OK:", r_health.json())

# 4. API data check (Karachi, 2024, temperature)
r_data = client.get("/api/data?city=Karachi&type=temperature&year=2024")
assert r_data.status_code == 200
payload = r_data.json()
assert len(payload["dates"]) == 366
assert len(payload["values"]) == 366
assert len(payload["normalized"]) == 366
print(f"✓ Temperature Data OK: {payload['city']} {payload['year']} ({len(payload['dates'])} days, Peak: {payload['insights']['max']}°C)")

# 5. API data check (Rainfall)
r_rain = client.get("/api/data?city=Karachi&type=rainfall&year=2024")
assert r_rain.status_code == 200
payload_rain = r_rain.json()
print(f"✓ Rainfall Data OK: Total {payload_rain['insights']['total_rainfall']} mm over {payload_rain['insights']['rain_days_count']} rain days")

# 6. API export check
r_csv = client.get("/api/export?city=Karachi&year=2024&format=csv")
assert r_csv.status_code == 200
assert "Temperature_C" in r_csv.text
print(f"✓ CSV Export OK: {len(r_csv.text.splitlines())} lines")

# 7. API AI explain check
r_explain = client.get("/api/explain?city=Karachi&year=2024&type=temperature")
assert r_explain.status_code == 200
exp = r_explain.json()["explanation"]
print(f"✓ AI Climate Brief OK ({exp['source']}): {exp['summary'][:60]}...")

print("\n🚀 ALL 5 MODULES FULL-STACK INTEGRATION TEST PASSED PERFECTLY!")
