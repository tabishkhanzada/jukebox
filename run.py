"""
The Earth Information Jukebox - One-Click Launcher
NASA Space Apps Challenge
Launches the FastAPI backend microservice and automatically launches the web UI in default browser.
"""

import sys
import os
import time
import socket
import subprocess
import webbrowser
import uvicorn

def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

def free_port(port: int):
    """Safely terminates any lingering zombie process holding the port on Windows."""
    try:
        output = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True, text=True, stderr=subprocess.DEVNULL)
        for line in output.strip().split("\n"):
            parts = line.strip().split()
            if len(parts) >= 5 and "LISTENING" in parts:
                pid = int(parts[-1])
                if pid > 0 and pid != os.getpid():
                    print(f"Port {port} is occupied by stale process (PID {pid}). Freeing port...")
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
                    time.sleep(0.8)
    except Exception:
        pass

def main():
    print("=" * 65)
    print("       THE EARTH INFORMATION JUKEBOX (NASA SPACE APPS)")
    print("=" * 65)

    port = 8000
    if is_port_in_use(port):
        free_port(port)

    # If still in use, fallback to 8001
    if is_port_in_use(port):
        port = 8001
        print(f"Note: Port 8000 is still busy, switching to alternate port {port}...")

    print(f"Starting FastAPI Backend Server on http://127.0.0.1:{port} ...")
    print("Live Telemetry & Sonification Engine online.")
    print("Press Ctrl+C to terminate the server.\n")

    # Launch browser after a brief delay so server starts
    def open_browser():
        time.sleep(1.2)
        print(f"Launching Earth Information Jukebox in browser (http://127.0.0.1:{port}/)...")
        webbrowser.open(f"http://127.0.0.1:{port}/")

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    # Run uvicorn server serving backend and static frontend
    uvicorn.run("backend.main:app", host="127.0.0.1", port=port, reload=False)

if __name__ == "__main__":
    main()

