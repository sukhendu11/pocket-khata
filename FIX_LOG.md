
# 🐛 FIX LOG — Pocket Khata

## STATUS FLOW
PENDING → IN_PROGRESS → TECH_DONE → DONE (USER_CONFIRMED)

---

## RULES
- Agent manages ACTIVE FIXES automatically
- User only confirms final DONE state
- TECH_DONE = code fixed but waiting for user confirmation
- DONE = user confirmed working

---

## ACTIVE FIXES
- Managed dynamically by agent during session
- No manual listing required here
- Must always sync with real codebase state