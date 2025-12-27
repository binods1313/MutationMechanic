# Secure environment variable instructions

This file previously requested secrets to be copied into messages or committed. **Do not share secrets in public channels or commit them to the repository.**

If you need to configure environment variables for deployment, please follow these secure options:

- Use your hosting provider's secret storage (e.g., Vercel Environment Variables, GitHub Actions Secrets, Azure Key Vault).
- Use a `.env.local` (or `backend/.env`) file on your local machine only — do not commit it.
- Share environment variables only via an encrypted/separate channel to the person who will configure the deployment (not via PR comments or issue comments).

Example (safe template only — replace the values in your deployment UI, not in repo):

```
DATABASE_URL=postgresql://username:password@host:5432/dbname
NEXTAUTH_SECRET=replace-with-a-secure-random-value
NEXTAUTH_URL=https://your-production-url.example
VITE_GEMINI_API_KEY=sk-xxxx
VITE_ALPHAGENOME_API_KEY=ak-xxxx
```

If you'd like, I can prepare a `.env.example` file with these placeholders and remove any tracked `.env` from the repository to avoid leaks.

---

**Note:** If you believe real secrets were committed, you must rotate those secrets immediately and we can scan and scrub git history if needed.