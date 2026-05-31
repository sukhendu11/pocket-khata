# 🧠 Pocket Khata — Project Rules (CORE SYSTEM)

---

# 1. SYSTEM DEFINITION

Pocket Khata is:
- React 18 + Vite 5 app
- Fully client-side (no backend)
- Offline-first finance system
- Uses localStorage as persistence
- Schema version: v5

---

# 2. ARCHITECTURE (STRICT LAYERS)

## Core (db.js)
- ONLY layer allowed to access localStorage
- Handles persistence, migration, backup

## State (business logic)
- financial logic + validation
- NO direct storage access

## Features
- UI + user interaction orchestration
- calls state only

## Components
- pure UI only
- no logic, no side effects

## Utils
- pure functions only

---

# 3. DATA FLOW (ABSOLUTE)

User → Feature → State → Core → localStorage → State → UI

> No bypass allowed.

---

# 4. FINANCIAL RULES (CRITICAL)

- All transactions must be atomic (all-or-nothing)
- Transfers update BOTH accounts
- No UI-side balance calculations
- No silent failures allowed
- No partial writes

---

# 5. BACKUP SYSTEM

- Auto-backup BEFORE every write
- Max 3 snapshots
- Dedup window: 3 seconds

Restore priority:
1. Auto-backups
2. JSON import
3. Default state

---

# 6. DATA INTEGRITY

- schema version MUST exist (v5)
- missing/corrupt data MUST NOT crash app
- each module must recover independently
- invalid imports must be rejected or safely repaired

---

# 7. FAILURE HANDLING

- NEVER crash UI
- isolate corrupted module only
- fallback to safe default state
- log only to console

---

# 8. STATE RULE

- React state is runtime truth
- localStorage is persistence only
- no duplicate sources of truth allowed

---

# 9. TEST RULES

- ALL tests must pass before completion
- no regression allowed in financial logic
- partial fixes that break tests are forbidden

Priority:
Financial > Integration > UI

---

# 10. CHANGE RULES

- One feature per change cycle
- minimal diff required
- no full rewrites unless necessary
- no multi-feature commits

---

# 11. RISK LEVELS

LOW: UI only  
MEDIUM: feature/state logic  
HIGH: db.js / migration / financial logic

High-risk changes require full verification.

---

# 12. PRIORITY ORDER

1. Financial correctness
2. Data integrity
3. Test stability
4. Architecture rules
5. UI consistency
6. Performance

---

# 13. SESSION SYSTEM (EXTERNAL ONLY)

Session files are NOT part of runtime:

- SESSION_START.md → boot context
- SESSION_STATE.md → live snapshot
- SESSION_END.md → handover

Must always reflect real Git state.

---

# 14. CORE PRINCIPLE

> If financial correctness is uncertain, DO NOT proceed.