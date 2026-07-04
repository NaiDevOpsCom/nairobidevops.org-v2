You are diagnosing a bug in the NDC (Nairobi DevOps Community) website.

## Bug report

- **Description:** {{bug_description}}
- **Steps to reproduce:** {{reproduction_steps}}
- **Expected:** {{expected_behavior}}
- **Actual:** {{actual_behavior}}
- **Environment:** {{environment}} (e.g., staging, production, local)
- **Console/error output:** {{error_output}}

## Investigation

1. Identify the likely layer (frontend routing, API endpoint, database query, deploy config)
2. Trace the request/component path using the project structure:
   - Frontend pages: `client/src/pages/`
   - API endpoints: `backend/endpoints/`
   - Database schema: `backend/schema.sql`
3. Check recent changes in `git log --oneline -20`
4. Check if related business rules apply: `.ai/knowledge/business-rules.md`

## Output

- **Root cause:** File, line, and explanation
- **Fix:** Exact code change (or migration if schema-related)
- **Test:** How to verify the fix — existing test to run or new test to write
- **Prevention:** What guard/code review rule would have caught this?
