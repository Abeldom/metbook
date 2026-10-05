@echo off
rem phone.bat - starts Metbook so you can open it on your phone (same Wi-Fi).
rem Double-click it, or run it in the terminal. Stop it with Ctrl+C.
rem For normal work on the computer, keep using:  .venv\Scripts\python app.py

cd /d "%~dp0"
set METBOOK_PHONE=1
.venv\Scripts\python app.py
pause
