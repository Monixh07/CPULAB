@echo off
REM CPU Load Balancing Simulator - build script for Windows (MinGW-w64 gcc)
REM Usage:  build.bat
gcc -std=c99 -Wall -Wextra -O2 -o cpulb.exe src\*.c
if %errorlevel% neq 0 (
    echo BUILD FAILED - is gcc installed and on PATH? Try: gcc --version
    exit /b 1
)
echo Build OK: cpulb.exe
echo Run it with: cpulb.exe
