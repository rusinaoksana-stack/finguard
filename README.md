# FinGuard

Automated FinTech dispute and compliance platform scaffold.

## Structure

- `backend/` - Express + TypeScript API server with OpenAI integration and JWT auth.
- `frontend/` - React + Vite TypeScript client with Tailwind CSS.

## Run locally

1. Install dependencies
   ```bash
   npm install
   ```

2. Copy environment examples
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. Start backend
   ```bash
   npm run dev:backend
   ```

4. Start frontend
   ```bash
   npm run dev:frontend
   ```

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
npm audit --omit=dev
```

## Assets

Used frontend images are generated as WebP files for production builds.

```bash
npm run optimize:images
```

## Notes

- Keep production secrets out of git and set a strong `JWT_SECRET`.
- Run Prisma migrations before starting a fresh database.
- The backend includes sample routes for auth, transactions, disputes, and AI integrations.
- The frontend includes a dashboard and chat UI skeleton.
- Test customer: customer.demo@finguard.ai / Password123
- Test auditor: auditor@finguard.ai / Password123
