@echo off
rem float - one-click launcher: runs dsh --profile float in a hidden console,
rem so only the floating Electron window appears; exits when the window closes.
start "" powershell -NoProfile -WindowStyle Hidden -Command "dsh --profile float"
