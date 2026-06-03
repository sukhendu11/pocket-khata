
SESSION END

FINAL CHECK BEFORE COMPLETION:

1. Verify code changes exist
2. Verify UI/logic actually changed
3. Verify SESSION_STATE matches reality
4. Ensure no unfinished hidden work

ONLY THEN:
- commit changes
- update SESSION_STATE
- update CHANGELOG if needed

RULE:
No mismatch allowed between code and state