# SeatSentinel — final project summary (Team Kyro · PS 26263)

**Problem.** AICTE receives student-level data only from PGDM institutions; others report totals. Excess enrolment, duplicate enrolment and invalid IDs go unseen, although APAAR ID now exists as a national academic identity.

**Solution.** An enrolment integrity engine, not just a database: validate, reconcile, explain, correct, decide, verify.

**Why it is different**
1. Seat rules by category: regular seats against intake, FN/OCI/PIO/CIWGC against a separate 15% cap, NRI shown separately. "Enrolment > intake" alone would raise false alarms.
2. Transfers are cleared, not flagged: duplicate logic uses dates and status.
3. Evidence-first alerts: rule, calculation, records, suggested check.
4. Fix before flag: institution corrects first; only unresolved items reach an officer who records a named decision.
5. Correction loop with before/after replay: upload, fix, re-upload, see what improved (fixed / still open / new, quality score).
6. Data Quality Passport: transparent 0–100 reliability score (completeness 40, uniqueness 25, reconciliation 25, correction history 10). Not a compliance verdict.
7. Risk-ranked inspection queue and policy simulator: where to inspect first, and what a rule change (for example cap 15% to 10%) would do.
8. Consent-first verification: yes/no only, Ed25519-signed receipt. Hash-chained audit log gives tamper evidence without blockchain.

**Built (prototype).** Government-portal style web app with login, four roles, nine screens, Hindi toggle, accessibility controls; Python API with SQLite, JWT, role checks, signed receipts, server-side audit chain; 1,438 synthetic students with seven planted cases.

**Not built / planned.** Engine on the server reading the rules table, Node/Postgres/FastAPI production stack, graph view, ML anomaly layer (Isolation Forest only if real history supports it), live APAAR adapter. No accuracy numbers are claimed.

**Planted test cases (synthetic):** one college 14 regular seats over intake; one over the supernumerary cap; one with invalid and missing IDs; five simultaneous enrolments across two colleges; three valid transfers cleared; two near-duplicate names with missing ID; one enrolment jump.

**Likely judge questions.** Real vs mock: everything except APAAR lookup and AICTE integration (adapters). Why not blockchain: hash-chained signed logs give tamper evidence without public-ledger privacy cost. How to game it: identity matching, shared signals, named approver for every override. What did AI write: state your own split honestly.
