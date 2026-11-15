REFERENCE DSP (Python/numpy) - the exact recipes behind the approved demos.
They are REFERENCES to port to JavaScript, not the final app.
- Paths inside the scripts are hard-coded to the author's sandbox (f_*.png = frames at 4 fps, 512x256 or 512x288). Change them if you run them.
- air_quality_scan.py : Air Quality (pm25) video  -> demo "scan_nature_demo.mp4"
- weather_scan.py     : Weather (near-surface wind) video -> demo "weather_wind_demo.mp4"
- co2_rule.py + co2_scan.py : CO2 video -> demo "co2_demo3.mp4" (rule file is imported by co2_scan.py)
- legend_table_sst_rain.csv : 64-point colour ramps (value,R,G,B) read from Worldview legends (SST 0-32 C, rain 0.1-53 mm/hr; rain assumed linear = approximate).
The author could not HEAR the audio. Spectrum numbers (energy above 3 kHz, peak) were the only automatic checks.
