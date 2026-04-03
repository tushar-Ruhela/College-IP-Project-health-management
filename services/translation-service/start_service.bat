@echo off
echo Starting Translation Service...
cd /d "%~dp0"
python translation_server.py
pause
