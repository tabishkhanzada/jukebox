@echo off
title The Earth Information Jukebox - NASA Space Apps
echo ========================================================
echo    THE EARTH INFORMATION JUKEBOX (NASA SPACE APPS)
echo ========================================================
echo Starting Application...
py -3.10 run.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Trying fallback Python command...
    python run.py
)
pause

