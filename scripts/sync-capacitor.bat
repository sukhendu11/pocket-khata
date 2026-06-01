@echo off
REM ==============================================================================
REM Pocket Khata — Fast Web-Only Sync
REM ==============================================================================
REM For UI-only changes (React/CSS/logic) that don't touch native Android code.
REM Rebuilds JS and syncs to Capacitor without a full APK build.
REM
REM This is the fastest path for iterating on the web layer.
REM After syncing, restart the app on device to see changes:
REM   adb shell am start -n com.pocketkhata.app/.MainActivity
REM
REM Usage: scripts\sync-capacitor.bat
REM Run from the project root directory.
REM ==============================================================================

echo ===== Pocket Khata — Fast Capacitor Sync =====
echo.

echo [1/2] Building JS bundle with Vite...
call npx vite build
if %ERRORLEVEL% neq 0 (
    echo [FAILED] Vite build failed. Aborting.
    exit /b 1
)
echo [OK] JS build complete.
echo.

echo [2/2] Copying web assets to Android project...
call npx cap copy android
if %ERRORLEVEL% neq 0 (
    echo [FAILED] Cap copy failed. Aborting.
    exit /b 1
)
echo [OK] Assets synced to android/app/src/main/assets/public/
echo.

echo ===== Sync Complete =====
echo No APK was built (web-only sync).
echo To see changes on device, restart the app:
echo   adb shell am start -n com.pocketkhata.app/.MainActivity
echo.
