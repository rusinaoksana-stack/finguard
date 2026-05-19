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

2. Start backend
   ```bash
   npm run dev:backend
   ```

3. Start frontend
   ```bash
   npm run dev:frontend
   ```

## Notes

- Add `.env` files in `backend/` and `frontend/` for secrets and environment configuration.
- The backend includes sample routes for auth, transactions, disputes, and AI integrations.
- The frontend includes a dashboard and chat UI skeleton.
- For testing email: compliance@finguard.ai and password: Password123
