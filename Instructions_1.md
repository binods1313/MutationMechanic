Task: Fix backend Prisma startup crash and verify environment, DB, and integrations
Goal: Get the backend running locally without the Prisma client crash, ensure DATABASE_URL is loaded at runtime, regenerate Prisma client, and verify basic API and integration health. Deliver fixes on a feature branch and report results.

Ready-to-paste prompt for your coder
Code
Task: Diagnose and fix Prisma client crash; validate env, DB, and basic integrations

Context
- Repo: MutationMechanic (you have full access).
- Problem: Backend crashes at startup when `new PrismaClient()` is called. Error shows Prisma client instantiation failure and nodemon restarts.
- Objective: Ensure backend sees DATABASE_URL at runtime, load .env correctly, regenerate Prisma client, start backend successfully, and verify a few endpoints and integrations (AlphaFold/MedGemma fallbacks).

Requirements (apply in order)

1) Create a feature branch
- Branch name: fix/prisma-env-startup
- Commit small, focused changes with clear messages.

2) Ensure dotenv is loaded before PrismaClient
- Open the backend entry file referenced in the crash (likely `backend/src/server.ts` or `backend/src/index.ts`).
- **Add at the very top** (before any other imports that might import Prisma):
  ```ts
  // MUST be first
  import 'dotenv/config';
or:

ts
import dotenv from 'dotenv';
dotenv.config();
Confirm import 'dotenv/config' runs before import { PrismaClient } from '@prisma/client' and before any code that instantiates Prisma.

Confirm .env location and DATABASE_URL presence

Identify which .env the backend expects (backend/.env or project root .env). If multiple, document which one is used in dev.

Ensure the backend .env contains a DATABASE_URL= line. Example formats:

Postgres: DATABASE_URL="postgresql://user:pass@localhost:5432/dbname?schema=public"

SQLite: DATABASE_URL="file:./dev.db"

Fix formatting issues: remove stray quotes/spaces/CRLF problems.

Do NOT commit secrets. If missing, add instructions in README for how to set the variable locally.

Make sure dev script loads env (if needed)

Inspect backend/package.json scripts.dev. If it runs node or ts-node without -r dotenv/config, update dev script to ensure env is loaded:

json
"dev": "ts-node -r dotenv/config src/server.ts"
or ensure nodemon uses -r dotenv/config:

json
"dev": "nodemon --watch src -r dotenv/config --exec ts-node src/server.ts"
If you prefer not to change scripts, ensure import 'dotenv/config' is present in the entry file (step 2).

Regenerate Prisma client

From backend folder run:

Code
npx prisma generate
If engine download errors occur, try:

PowerShell:

Code
$env:PRISMA_CLIENT_ENGINE_TYPE="library"
npx prisma generate
Or set the same env var in your dev environment.

Start backend and capture logs

Start backend:

Code
npm run dev
(from backend folder; or follow repo README if different)

If it still crashes, start with debug logs:

PowerShell:

Code
$env:DEBUG="*"
$env:PRISMA_LOG_LEVEL="info"
npm run dev
Copy any Prisma-related error lines and paste them into the report.

Verify DATABASE_URL visibility (quick check)

In backend PowerShell before starting server:

Code
if ($env:DATABASE_URL) { "DATABASE_URL is set" } else { "DATABASE_URL is NOT set" }
If NOT set, set it temporarily to test:

Code
$env:DATABASE_URL="your_database_url_here"
npm run dev
(Replace with a valid connection string for testing only; do not commit.)

Verify basic endpoints

Once backend runs, test these endpoints and record responses:

Health: GET http://localhost:<backend-port>/api/health (or /api/status)

Example data endpoint used by frontend: e.g., GET /api/variants or GET /api/presets

AlphaFold proxy (if present): POST /api/alphafold with a minimal payload

MedGemma proxy (if present): POST /api/medgemma/interpret (use mock token if needed)

Use curl or Postman and include required headers. Record status codes and sample JSON.

Confirm Prisma DB connectivity

Run:

Code
npx prisma -v
npx prisma generate
npx prisma db pull
If using migrations:

Code
npx prisma migrate status
Report any errors.

Mock/fallback behavior

Simulate backend or external API failure (stop backend or block endpoint) and confirm frontend fallback behavior if applicable. Document which mock data files are used and whether UI shows fallback messages.

Logging and fixes

If you make code/config changes beyond dotenv import, include minimal, well-documented edits and tests.

Add defensive logging around Prisma instantiation to surface missing env var:

ts
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
Re-run npm run dev and confirm backend starts without crash.

Deliverables

Branch: fix/prisma-env-startup with commits for changes.

File edits: list of files changed and short rationale.

Diagnostics doc: docs/diagnostics/prisma-env-startup.md containing:

Commands run and outputs (prisma generate, prisma -v, npm run dev logs)

Health endpoint responses (status + sample JSON)

Any errors encountered and how they were fixed

If any env vars are missing, list the exact env var names and example formats (do not include secrets)

If external APIs (AlphaFold/MedGemma) are unreachable, include recommended config steps and sample mock payloads.

Acceptance criteria

npm run dev in backend starts without Prisma client crash.

if ($env:DATABASE_URL) prints DATABASE_URL is set in the backend shell when started normally (i.e., env loaded from .env or dev script).

npx prisma generate runs successfully and node_modules/@prisma/client exists.

Health endpoint returns 200 and expected JSON.

Short diagnostics doc committed to the branch.

Notes and constraints

Do not commit secrets or real credentials to the repo.

If Node engine/binary errors persist and point to Node v22 incompatibility, document that and test with Node 18 or 20 (use nvm) and report results.

Keep changes minimal and reversible; prefer adding import 'dotenv/config' over changing many scripts unless necessary.

Report back here with:

Branch name and commit summary

npx prisma -v and npx prisma generate outputs

npm run dev logs (if still failing, paste Prisma error lines)

Result of health endpoint and any sample responses

Any remaining blockers or recommended next steps