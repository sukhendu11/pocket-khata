
PROJECT RULES

# SYSTEM TYPE
- React + Vite offline-first app
- localStorage based persistence

# ARCHITECTURE

CORE (db.js)
- only storage access layer

STATE LAYER
- business logic only

FEATURE LAYER
- UI + interaction logic

UI LAYER
- pure rendering only

UTILS
- pure functions only

---

# DATA FLOW (STRICT)

User → Feature → State → Core → Storage → State → UI

No bypass allowed.

---

# DEVELOPMENT FLOW

1. Identify issue
2. Locate exact file
3. Apply minimal fix
4. Verify UI/logic change
5. Update SESSION_STATE.md
6. Update CHANGELOG.md if needed

---

# RULES

- No guessing APIs or structure
- No full rewrites unless required
- One change per cycle