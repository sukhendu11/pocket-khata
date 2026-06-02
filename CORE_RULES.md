1. SINGLE SOURCE OF TRUTH  
All UI must derive from one validated application state.

2. SAFE DATA LAYER  
All stored data must be validated + migrated before use. Never trust raw storage.

3. FAILURE ISOLATION  
One module failure must never crash the entire app.

4. UPDATE CONSISTENCY  
New build always overrides old behavior and stale state must never control UI.

Purpose:
Defines global behavior rules for the agent.

Includes:
- stability rules (no crashes, no regressions)
- update consistency rules
- no unsafe changes to app logic

BUILD EXECUTION RULE

- Do NOT run APK build commands automatically (gradlew, assembleDebug, assembleRelease, clean)
- Do NOT trigger long-running build/install processes

- Always instruct the user to run build commands manually in CMD/PowerShell
- Provide exact command and APK output path
- Wait for user confirmation before continuing

Goal:
- Prevent timeouts
- Keep workflow fast
- Avoid unnecessary heavy operations