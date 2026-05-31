# 🧠 Pocket Khata — SESSION END (COMMIT + STATE SYNC)

> This file MUST be executed before ending any session.
> Its purpose is to prevent context drift and ensure SESSION_STATE.md reflects REAL system state.

---

# ⚠️ FINAL SYNC RULE

You are NOT allowed to end the session until:

- code changes are complete OR safely paused
- SESSION_STATE.md is fully updated
- no unfinished “hidden work” remains

---

# 📍 STEP 1 — VERIFY REAL STATE

Before writing SESSION_STATE.md:

Check:
- What was actually changed in code
- What is currently working
- What is partially implemented
- What is broken or untested

DO NOT rely on memory or assumptions.

Use:
- codebase inspection
- git diff
- test results

---

# 🧩 STEP 2 — STATE ALIGNMENT RULE

SESSION_STATE.md MUST match:

✔ actual modified files  
✔ actual working behavior  
✔ actual test results  
✔ actual last commit state  

If mismatch exists → FIX STATE FILE, not assumptions.

---

# 🧠 STEP 3 — SESSION_STATE.md UPDATE RULE

Update SESSION_STATE.md in this exact order:

## 1. CURRENT STATE
- last completed task
- current active task
- immediate next step
- active module
- current user flow
- risk zone

## 2. WORK COMPLETED
- only real completed changes
- no planned or partial work

## 3. CODE STATUS
- App.jsx state reality
- db.js state reality
- UI state reality

## 4. FILES MODIFIED
- ONLY files actually changed in this session

## 5. BUGS / ISSUES
- ONLY verified issues

## 6. TEST STATUS
- actual passing/failing count

## 7. GIT INFO
- last commit message
- commit hash (must match real repo)

## 8. NEXT STEP
- single atomic next action only

---

# 🚨 STEP 4 — DRIFT PREVENTION RULE

You MUST NOT include:

- planned future features
- speculative bugs
- imagined improvements
- unverified changes
- outdated session memory

SESSION_STATE.md is NOT planning.
It is REALITY ONLY.

---

# ⚙️ STEP 5 — COMMIT SYNC RULE

Before session ends:

- ensure git state is clean or intentionally staged
- commit message must match actual changes
- no undocumented code changes allowed

---

# 🧠 STEP 6 — FINAL CONSISTENCY CHECK

Before finishing:

Ask internally:

- Does SESSION_STATE.md match code 100%?
- Can another session resume instantly without guessing?
- Is NEXT STEP executable in one action?

If ANY answer is NO → fix before ending.

---

# 📦 COMPLETION CRITERIA

Session is ONLY complete when:

✔ SESSION_STATE.md updated  
✔ git state reflects changes  
✔ no untracked work remains  
✔ next step is clearly defined  
✔ system state is consistent  

---

# 🔒 GOLDEN RULE

> Never end a session with unresolved state mismatch.