# SeatSentinel — APAAR-based Enrolment Integrity Platform (SIH 2026 · PS 26263 · Team Kyro)

> PROTOTYPE with **synthetic data only**. Not an official AICTE portal. The APAAR registry is a **mock adapter**. Seat rules are prototype assumptions pending confirmation against the current AICTE Approval Process Handbook.

Institutions submit student-level data keyed on APAAR ID. The platform applies category-aware seat rules, finds cross-college conflicts with date logic, explains every alert with its evidence, lets the institution fix first, and leaves the final decision to a named AICTE officer.

## Structure
```
frontend/   index.html · css/style.css · js/app.js (rules engine + all screens) · js/api.js · js/config.js
backend/    server.py (HTTP API, SQLite, JWT, Ed25519) · seed.py · students_seed.json · requirements.txt
docs/       PROJECT_SUMMARY.md
```
Frontend and backend are separate folders. Host them together (`python backend/server.py` serves both) or apart (frontend on GitHub Pages, backend elsewhere; set `API_BASE` in `frontend/js/config.js`). If no backend is reachable the frontend falls back to an in-browser synthetic dataset, so the demo never shows a blank page.

## Run
```
pip install -r backend/requirements.txt
python backend/seed.py        # builds backend/seatsentinel.db (1,438 synthetic students, users, rules)
python backend/server.py      # http://localhost:8000
```
Demo logins (password `demo123`): `analyst`, `officer`, `institution` (Pune Institute), `verifier`.

## What is implemented
| Feature | Where |
|---|---|
| Category-aware seat checks (regular vs 15% supernumerary, NRI separate) | `frontend/js/app.js` `evaluateRules` |
| Date-aware duplicate detection, valid transfers auto-cleared | same |
| Evidence-first alerts and fix-before-flag workflow (open → institution → corrected or escalated → officer decision) | alerts screen |
| Correction loop with before/after replay, file SHA-256 | Submit data screen |
| Data Quality Passport (0–100, visible weights, never a compliance verdict) | passport screen |
| Risk-ranked inspection queue and policy simulator | queue and simulator screens |
| Role-based views, login, JWT, server-side role check on student data | `backend/server.py` |
| Consent-gated verification with Ed25519-signed receipt (public key at `/api/pubkey`) | `/api/verify` |
| Hash-chained audit log, verified server-side at `/api/audit/verify` | `/api/audit*` |
| Rules table with version and handbook year | `/api/rules` |

## Honest gaps (what is not done yet)
- The rules engine runs in the browser and still reads rule values from constants; the `rules` table and API exist but are not yet wired into it (planned: engine moves to the backend and reads the table, which makes the simulator fully rule-driven).
- Backend is Python standard library + SQLite for the prototype. The planned production stack is Node/Express + Prisma + PostgreSQL, a FastAPI checks service (RapidFuzz, NetworkX, scikit-learn) and React/Tailwind. Fuzzy matching is currently edit-distance 1; no trained ML model is used.
- The institution view still receives all colleges' records because cross-college checks run client-side; production would run the checks server-side and return only the institution's own data.
- Passwords are salted PBKDF2 hashes, but secrets default to development values. Set `JWT_SECRET` and `HMAC_KEY` for any real deployment. No real APAAR or DigiLocker integration.
