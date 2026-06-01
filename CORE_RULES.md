1. SINGLE SOURCE OF TRUTH  
All UI must derive from one validated application state.

2. SAFE DATA LAYER  
All stored data must be validated + migrated before use. Never trust raw storage.

3. FAILURE ISOLATION  
One module failure must never crash the entire app.

4. UPDATE CONSISTENCY  
New build always overrides old behavior and stale state must never control UI.