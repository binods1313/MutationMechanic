# Environment Variables (ENV) 📁

This file lists the environment variables the project uses, where to put them, and example snippets. Add your real keys to `.env.local` (frontend) or `backend/.env` and do **not** commit secrets to git.

---

## Frontend (Vite) ⚙️

Recommended file: `.env.local` in the project root.

Required / useful variables:

- **VITE_GEMINI_API_KEY** — Google GenAI / Gemini API key. This is mapped into the frontend as `process.env.API_KEY` in `vite.config.ts` so components and services check `process.env.API_KEY`.
- **VITE_ALPHAGENOME_API_KEY** — AlphaGenome API key (used by genomic services).
- **VITE_ALPHAGENOME_API_URL** or `REACT_APP_ALPHAGENOME_API_URL` — AlphaGenome base URL (the code reads `REACT_APP_ALPHAGENOME_API_URL` in some services).
- Optional: **REACT_APP_ALPHAGENOME_API_KEY**, **REACT_APP_ALPHAFOLD3_API_URL**, **ALPHAFOLD_API_KEY** — kept for compatibility with older code paths.

Example `.env.local`:

```
# Live AI (Gemini)
VITE_GEMINI_API_KEY=sk-...your-gemini-key-here

# AlphaGenome
VITE_ALPHAGENOME_API_KEY=ak-...your-alphagenome-key-here
VITE_ALPHAGENOME_API_URL=https://api.alphagenome.example

# Optional (AlphaFold proxy endpoint)
REACT_APP_ALPHAFOLD3_API_URL=https://api.esmatlas.com/foldSequence/v1/pdb/
```

Notes:
- Vite requires `VITE_` prefix for variables exposed to client-side code.
- The project also contains some `REACT_APP_*` usages for compatibility; setting both `VITE_` and `REACT_APP_` variants is safe.
- The UI enters "Simulation Mode" when the Gemini key is not present (many components check `process.env.API_KEY`).

---

## Backend (.env) 🧩

Recommended file: `backend/.env` (copy `backend/.env.example` as a starting point).

Required variables (see `backend/.env.example`):

- **DATABASE_URL** — PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/dbname`).
- **FRONTEND_URL** — Frontend origin for CORS (e.g. `http://localhost:3000`).
- **PORT** — Backend port (e.g. `5000`).
- **JWT_SECRET** — Secret for JWT signing.

Example `backend/.env`:

```
DATABASE_URL="postgresql://username:password@localhost:5432/mutationmechanic"
FRONTEND_URL=http://localhost:3000
PORT=5000
JWT_SECRET=your-super-secret-jwt-key
```

---

## Security & Best Practices 🔒

- **Do not commit** `.env` or `.env.local` to version control. Use your platform's secret manager (Vercel, GitHub Actions secrets, Azure Key Vault, etc.) for deployments.
- Add `.env`/`.env.local` to `.gitignore` if not already ignored.
- Restart the dev server after changing environment variables.

---

## Quick Troubleshooting 💡

- If the UI shows "Simulation Mode", confirm `VITE_GEMINI_API_KEY` is set and restart Vite.
- If AlphaGenome lookups return `null`, set `VITE_ALPHAGENOME_API_URL` and `VITE_ALPHAGENOME_API_KEY` (or `REACT_APP_ALPHAGENOME_*`).
- For backend DB issues, verify `DATABASE_URL` and run `npx prisma db push` / `npx prisma migrate dev` as needed.

---

## Detected environment variables (scan results) ✅

I scanned the codebase and found these environment-variable usages (file locations shown):

- **VITE_GEMINI_API_KEY** → mapped to `process.env.API_KEY` in `vite.config.ts`. Used by Gemini clients: `services/geminiService.ts`, `services/medgemmaClient.ts`, and the UI (`components/Header.tsx`) to enable live AI features.
- **process.env.API_KEY** → runtime check for Gemini/Google GenAI usage in `services/geminiService.ts`, `services/medgemmaClient.ts`, `components/Header.tsx` and other AI-related files.
- **VITE_ALPHAGENOME_API_KEY** / **REACT_APP_ALPHAGENOME_API_KEY** → used by `services/genomicAnnotationService.ts` to call AlphaGenome (reads `REACT_APP_ALPHAGENOME_API_KEY`).
- **VITE_ALPHAGENOME_API_URL** / **REACT_APP_ALPHAGENOME_API_URL** → AlphaGenome base URL (referenced in `services/genomicAnnotationService.ts`).
- **REACT_APP_ALPHAFOLD3_API_URL** → AlphaFold proxy endpoint (used in `utils/alphafoldClient.ts`, defaults to `https://api.esmatlas.com/...`).
- **ALPHAFOLD_API_KEY** / **process.env.ALPHAFOLD_API_KEY** → compatibility fallback checked in `services/alphaGenomeClient/index.ts`.
- **GEMINI_API_KEY** (localStorage key) → client-side override stored in `localStorage.getItem('GEMINI_API_KEY')` in `services/alphaGenomeClient/index.ts`.
- **VITE_BACKEND_URL** → used by frontend services to locate backend (e.g., `services/backendService.ts`, `utils/alphafoldClient.ts` read `import.meta.env.VITE_BACKEND_URL`).
- **DATABASE_URL**, **FRONTEND_URL**, **PORT**, **JWT_SECRET** → backend configuration suggested in `backend/.env.example` and referenced in `Instructions.md` and backend code.
- **NODE_ENV** → used for logging and environment checks (e.g., `utils/logger.ts`).
- **REACT_APP_GEMINI_API_KEY** and other `REACT_APP_*` vars appear in `README.md` / legacy docs — they are supported for compatibility but prefer `VITE_` prefixed vars for Vite.

Notes:
- Many client-side checks rely on `process.env.API_KEY` because `vite.config.ts` defines it from `VITE_GEMINI_API_KEY`; prefer setting `VITE_GEMINI_API_KEY` in `.env.local`.
- Local overrides: code sometimes falls back to `localStorage` (key `GEMINI_API_KEY`) or `process.env.*` compatibility names; setting both `VITE_` and `REACT_APP_` variants is safe when migrating.

---

If you'd like, I can:
1) Add a short link from `README.md` to this `docs/ENV.md`, and
2) Open a small PR that updates `README.md` and ensures `.env`/`.env.local` are ignored in `.gitignore` (if not already).

Tell me which and I'll proceed. ✅