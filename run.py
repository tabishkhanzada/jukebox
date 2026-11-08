"""
The Earth Information Jukebox - One-Click Launcher
NASA Space Apps Challenge
Launches the FastAPI backend microservice and automatically launches the web UI in default browser.
"""

import sys
import os
import time
import webbrowser
import uvicorn

def main():
    print("=" * 65)
    print("       THE EARTH INFORMATION JUKEBOX (NASA SPACE APPS)")
    print("=" * 65)
    print("Starting FastAPI Backend Server on http://127.0.0.1:8000 ...")
    print("Live Telemetry & Sonification Engine online.")
    print("Press Ctrl+C to terminate the server.\n")

    # Launch browser after a brief delay so server starts
    def open_browser():
        time.sleep(1.2)
        print("Launching Earth Information Jukebox in browser...")
        webbrowser.open("http://127.0.0.1:8000/")

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    # Run uvicorn server serving backend and static frontend
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=False)

if __name__ == "__main__":
    main()

