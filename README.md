# FinGuard

FinGuard is an AI-assisted payment risk review workspace for digital banking, fintech, fraud, support, and compliance teams.

It brings suspicious transactions, dispute cases, customer context, evidence summaries, and audit-ready decisions into one secure product experience.

## Structure

- `backend/` - Express + TypeScript API with OpenAI integration, JWT auth, Prisma, and review workflow routes.
- `frontend/` - React + Vite TypeScript client with Tailwind CSS, public product pages, reviewer workspaces, and support chat.

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
npm run test
npm run build
npm audit --omit=dev
```

## Assets

Used frontend images are generated as WebP files for production builds.

```bash
npm run optimize:images
```

## Product Notes

- Keep production secrets out of git and set a strong `JWT_SECRET`.
- Enable `VITE_ENABLE_PREVIEW_ACCESS=true` only for guided product walkthrough environments.
- Run Prisma migrations before starting a fresh database.
- The backend includes routes for auth, accounts, transactions, disputes, support, and AI-assisted review.
- The frontend includes public positioning, role-aware workspaces, transaction review, dispute evidence export, and support chat.
- Guided access profiles are available from the login screen for product walkthroughs.
