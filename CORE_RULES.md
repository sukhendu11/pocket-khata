MD SYNC RULE (CRITICAL)

- FIX_LOG.md and SESSION_STATE.md must be updated after every meaningful change
- Agent MUST write to FIX_LOG.md whenever a fix is applied
- Agent MUST update SESSION_STATE.md after every completed or partial task
- FIX_LOG.md is the source of truth for all fixes
- SESSION_STATE.md reflects current system state only

STRICT RULE:
- If code changes happen, FIX_LOG.md MUST be updated in the same step
- If state changes happen, SESSION_STATE.md MUST be updated immediately
- No exception allowed