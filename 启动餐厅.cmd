@echo off
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0启动餐厅.ps1"
