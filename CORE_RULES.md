
CORE RULES

1. EXECUTION OVER TALK
- No task is valid without real code change

2. SINGLE SOURCE OF TRUTH
- SESSION_STATE.md is the only runtime truth

3. STATE AFTER EXECUTION ONLY
- Never update state before verifying code change

4. NO DUAL SYSTEMS
- One feature = one implementation only

5. NO FAKE COMPLETION
A task is DONE only if:
- code is modified
- UI/logic behavior changes
- SESSION_STATE updated AFTER verification

6. STABILITY RULE
- One feature failure must not break entire app


MANUAL HELP ESCALATION RULE

The agent must request user help ONLY when:

1. The issue cannot be resolved after one correct implementation attempt
2. Multiple logical solutions exist but outcome cannot be verified safely
3. External system behavior (Android OS / device permission / native API) blocks progress
4. Debugging reaches uncertainty after code + log inspection

STRICT RULE:
- Do NOT repeatedly attempt complex solutions
- Do NOT over-engineer or loop on the same problem
- If confidence is low OR progress is unclear → ask user immediately

ESCALATION FORMAT:
- Clearly state what was tried
- Clearly state what is blocking progress
- Ask for user decision or confirmation

CHANGELOG RULE:
- CHANGELOG.md is write-only and append-only
- It can only be updated after SESSION_END validation
- It must reflect real executed code changes only