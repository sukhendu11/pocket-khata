
FIX VALIDATION RULE (CRITICAL)

- No fix is considered complete unless BOTH conditions are met:
  1. Technical verification (code is updated and logic is applied correctly)
  2. User confirmation (user explicitly approves the fix)

- Agent MUST mark fixes as:
  - TECH_DONE → code fixed but NOT user confirmed
  - DONE → ONLY after user confirmation

- Agent must NEVER assume a fix is completed without:
  - verifying code change exists
  - checking expected behavior in context
  - awaiting user confirmation

- SESSION_STATE.md and FIX_LOG.md must always reflect this distinction