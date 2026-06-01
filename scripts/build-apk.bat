@echo off
REM ==============================================================================
REM Pocket Khata — Deterministic APK Build Pipeline
REM ==============================================================================
REM Ensures web assets are always fresh in the APK.
REM Run from the project root directory.
REM
REM Usage: scripts\build-apk.bat
REM ==============================================================================

echo ===== Pocket Khata APK Build Pipeline =====
echo.

REM Step 0: Auto-increment versionCode in version.properties
powershell -Command "
  $content = Get-Content 'version.properties' -Encoding UTF8
  $newContent = $content | ForEach-Object {
    if ($_ -match '^versionCode=(\d+)$') {
      $newCode = [int]$matches[1] + 1
      'versionCode=' + $newCode
    } else { $_ }
  }
  $newContent | Set-Content 'version.properties' -Encoding UTF8
"
if %ERRORLEVEL% neq 0 (
    echo [FAILED] Failed to increment versionCode. Aborting.
    exit /b 1
)
echo [OK] versionCode incremented.
echo.

REM Step 1: Run test suite (pre-build gate)
echo [1/5] Running test suite...
call npx vitest run
if %ERRORLEVEL% neq 0 (
    echo [FAILED] Tests failed. Fix failing tests before building.
    exit /b 1
)
echo [OK] All tests passed.
echo.

REM Step 2: Build JS bundle
echo [2/5] Building JS bundle with Vite...
call npx vite build
if %ERRORLEVEL% neq 0 (
    echo [FAILED] Vite build failed. Aborting.
    exit /b 1
)
echo [OK] JS build complete.
echo.

REM Step 3: Sync web assets to Android project
echo [3/5] Syncing web assets to Android project...
call npx cap copy android
if %ERRORLEVEL% neq 0 (
    echo [FAILED] Cap sync failed. Aborting.
    exit /b 1
)
echo [OK] Assets synced to android/app/src/main/assets/public/
echo.

REM Step 4: Build debug APK
echo [4/5] Building debug APK...
cd android
call .\gradlew clean assembleDebug
if %ERRORLEVEL% neq 0 (
    echo [FAILED] APK build failed. Aborting.
    exit /b 1
)
cd ..
echo [OK] APK built successfully.
echo.

REM Output path
echo ===== Pipeline Complete =====
echo APK: android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo Install with:
echo   adb install -r android\app\build\outputs\apk\debug\app-debug.apk
echo.
