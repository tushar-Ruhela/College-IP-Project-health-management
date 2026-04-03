@echo off
echo Starting Simple Translation Service...
cd /d "%~dp0"
echo.
echo Installing dependencies (if needed)...
pip install flask flask-cors openai-whisper google-generativeai gtts
echo.
echo Starting server...
python simple_translation_server.py
pause
