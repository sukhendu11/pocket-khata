@echo off
REM ==============================================================================
REM Pocket Khata — Smart APK Build Pipeline
REM ==============================================================================
REM Tiered build strategy to minimize unnecessary full rebuilds:
REM
REM   --sync    (fast)   vite build + cap copy android   [web asset changes]
REM   --full    (medium) vite build + cap copy + assembleDebug   [native changes]
REM   --clean   (slow)   full rebuild from clean state   [cache issues / deps change]
REM   (no flag) default to --full
REM
REM Usage: scripts\build-apk.bat [--sync | --full | --clean]
REM Run from the project root directory.
REM ==============================================================================

setlocal enabledelayedexpansion

set MODE=full
if /I "%1"=="--sync" set MODE=sync
if /I "%1"=="--full" set MODE=full
if /I "%1"=="--clean" set MODE=clean

echo ===== Pocket Khata APK Build Pipeline =====
echo Mode: %MODE%
echo.

REM ===== PRE-BUILD: Version increment & tests (skip for --sync) =====
if not "%MODE%"=="sync" (
    REM Auto-increment versionCode in version.properties
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

    REM Run test suite (pre-build gate)
    echo [1/*] Running test suite...
    call npx vitest run
    if %ERRORLEVEL% neq 0 (
        echo [FAILED] Tests failed. Fix failing tests before building.
        exit /b 1
    )
    echo [OK] All tests passed.
    echo.
)

REM ===== STEP 1: Build JS bundle =====
echo [1/3] Building JS bundle with Vite...
call npx vite build
if %ERRORLEVEL% neq 0 (
    echo [FAILED] Vite build failed. Aborting.
    exit /b 1
)
echo [OK] JS build complete.
echo.

REM ===== STEP 2: Sync web assets to Android project =====
echo [2/3] Syncing web assets to Android project...
call npx cap copy android
if %ERRORLEVEL% neq 0 (
    echo [FAILED] Cap sync failed. Aborting.
    exit /b 1
)
echo [OK] Assets synced to android/app/src/main/assets/public/
echo.

REM ===== STEP 3: Build APK (skip for --sync mode) =====
if "%MODE%"=="sync" goto :done

echo [3/3] Building debug APK...
cd android

if "%MODE%"=="clean" (
    echo   (clean rebuild — removing build cache)
    call .\gradlew clean assembleDebug
) else (
    echo   (incremental rebuild — preserving build cache)
    call .\gradlew assembleDebug
)

if %ERRORLEVEL% neq 0 (
    echo [FAILED] APK build failed. Aborting.
    exit /b 1
)
cd ..
echo [OK] APK built successfully.
echo.

:done
echo ===== Pipeline Complete =====
if "%MODE%"=="sync" (
    echo Assets synced. No APK built (--sync mode).
    echo Deploy with: adb shell am start -n com.pocketkhata.app/.MainActivity
) else (
    echo APK: android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo Install with:
    echo   adb install -r android\app\build\outputs\apk\debug\app-debug.apk
)
echo.
