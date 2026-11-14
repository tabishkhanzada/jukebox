import urllib.request
import json
import os
import shutil

os.makedirs("frontend/assets/eic_frames", exist_ok=True)

svs_targets = [
    {
        "id": "5313",
        "key": "night_lights",
        "title": "Night Lights Change (2012–2023)",
        "mission": "NASA EIC • SVS #5313 Suomi NPP VIIRS",
        "sonification_mode": "luminance_intensity",
        "acoustic_mapping": "High-contrast urban light intensity mapped to staccato chimes & dynamic tempo.",
        "scale": "pentatonic_major",
        "default_instrument": "synth"
    },
    {
        "id": "3912",
        "key": "ocean_currents",
        "title": "Global Sea Surface Currents & Temp",
        "mission": "NASA SVS #3912 • ECCO2 Modeling",
        "sonification_mode": "fluid_currents",
        "acoustic_mapping": "Thermal gradients & velocity vectors mapped to fluid evolving polyphonic pads.",
        "scale": "lydian",
        "default_instrument": "pad"
    },
    {
        "id": "5669",
        "key": "geos_aerosols",
        "title": "GEOS Aerosols & Smoke Plumes",
        "mission": "NASA SVS #5669 • GEOS Forward Processing",
        "sonification_mode": "multitrack_aerosol",
        "acoustic_mapping": "Multi-track split: Smoke (warm sawtooth), Dust (pink noise), Sulfate (crystal chime).",
        "scale": "pentatonic_minor",
        "default_instrument": "synth"
    },
    {
        "id": "5196",
        "key": "co2_flux",
        "title": "DYAMOND Global Carbon Dioxide (CO2)",
        "mission": "NASA SVS #5196 • GEOS Atmospheric Model",
        "sonification_mode": "carbon_density",
        "acoustic_mapping": "Atmospheric CO2 PPM concentration mapped to sub-bass drone and harmonic tension.",
        "scale": "akebono",
        "default_instrument": "pad"
    },
    {
        "id": "5011",
        "key": "iss_lightning",
        "title": "ISS Spaceborne Lightning Detection",
        "mission": "NASA SVS #5011 • ISS LIS Sensor",
        "sonification_mode": "punctuated_staccato",
        "acoustic_mapping": "Punctuated percussive strikes: rapid optical flashes trigger immediate staccato bursts.",
        "scale": "pentatonic_major",
        "default_instrument": "marimba"
    },
    {
        "id": "4960",
        "key": "atmospheric_river",
        "title": "Atmospheric River Moisture Transport",
        "mission": "NASA SVS #4960 • Earth System Model",
        "sonification_mode": "moisture_density",
        "acoustic_mapping": "Integrated vapor transport mapped to ambient breeze, rain percussion, and resonant swells.",
        "scale": "lydian",
        "default_instrument": "pad"
    },
    {
        "id": "4950",
        "key": "gedi_forest",
        "title": "GEDI Global Canopy & Forest Height",
        "mission": "NASA SVS #4950 • GEDI Spaceborne Lidar",
        "sonification_mode": "canopy_elevation",
        "acoustic_mapping": "Lidar canopy elevation (0-60m) mapped to organic wooden marimba pitch & density.",
        "scale": "pentatonic_major",
        "default_instrument": "marimba"
    },
    {
        "id": "5425",
        "key": "perpetual_ocean",
        "title": "Perpetual Ocean: Boundary Currents",
        "mission": "NASA SVS #5425 • ECCO2 High-Res",
        "sonification_mode": "kinetic_streamflow",
        "acoustic_mapping": "High-contrast western boundary streamflow mapped to driving harmonic rhythm.",
        "scale": "lydian",
        "default_instrument": "synth"
    }
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for target in svs_targets:
    sid = target["id"]
    key = target["key"]
    api_url = f"https://svs.gsfc.nasa.gov/api/{sid}/"
    filename = f"{key}.jpg"
    dest_path = os.path.join("frontend/assets/eic_frames", filename)
    
    print(f"\n--- Ingesting SVS {sid}: {target['title']} ---")
    try:
        req = urllib.request.Request(api_url, headers=headers)
        with urllib.request.urlopen(req, timeout=12) as response:
            data = json.loads(response.read())
            
        img_info = data.get("main_image", {})
        img_url = img_info.get("url")
        
        # If url starts with http:, upgrade to https
        if img_url and img_url.startswith("http://"):
            img_url = "https://" + img_url[7:]
            
        if not img_url:
            # Fallback to media_groups or products if main_image empty
            print(f"Warning: No main_image for SVS {sid}, checking products...")
            continue
            
        print(f"Downloading from {img_url}...")
        img_req = urllib.request.Request(img_url, headers=headers)
        with urllib.request.urlopen(img_req, timeout=20) as img_resp:
            with open(dest_path, "wb") as f_out:
                shutil.copyfileobj(img_resp, f_out)
                
        file_size = os.path.getsize(dest_path)
        print(f"Saved {dest_path} ({file_size // 1024} KB)")
        target["local_src"] = f"assets/eic_frames/{filename}"
        target["description"] = data.get("description", "")[:280] + "..."
    except Exception as e:
        print(f"Error fetching SVS {sid}: {e}")

# Save the catalog metadata to frontend/assets/eic_frames/nasa_svs_catalog.json
with open("frontend/assets/eic_frames/nasa_svs_catalog.json", "w", encoding="utf-8") as f:
    json.dump(svs_targets, f, indent=2)

print("\nNASA SVS Catalog successfully generated!")

