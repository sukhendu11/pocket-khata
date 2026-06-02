
# 🧠 CORE RULES — Pocket Khata Agent

## SYSTEM PRINCIPLES

1. SINGLE SOURCE OF TRUTH
- All UI must derive from one validated application state only

2. SAFE DATA LAYER
- Never trust raw storage
- Validate + migrate before use

3. FAILURE ISOLATION
- One module failure must not crash entire app

4. UPDATE CONSISTENCY
- Latest build always overrides old behavior

---

## LOCAL-FIRST ARCHITECTURE

- No web APIs or external services
- Fully offline-first app

NOTIFICATIONS:
- Use ONLY native Android notification system
- Must trigger Android system permission prompt (Android 13+)
- All reminders handled locally

ANALYTICS:
- Fully computed on-device only
- No cloud or tracking

---

## BUILD RULE

- NEVER run build commands automatically
- Always instruct user to run manually (CMD/PowerShell)
- Provide exact command + output path