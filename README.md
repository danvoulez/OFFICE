<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15T2pd4lN3af4AVyDn1ghf91V5qeNGTuk

## Run locally (frontend + backend)

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`

2. (Optional, but recommended) Set `GEMINI_API_KEY` for the backend.
   - Preferred: create `server/.env.local` and set `GEMINI_API_KEY=...`
   - Also works: set it in `.env.local` (the backend loads it too)
   - This enables real agent replies (`/api/messages` will auto-reply when an agent is in the conversation).

3. Run **backend + frontend** together:
   `npm run dev:full`

   - Frontend: http://localhost:3000
   - Backend:  http://localhost:8787

### Run only one side

- Backend only:
  `npm run server`

- Frontend only:
  `npm run dev`

### API base URL

- In dev, the Vite proxy forwards `/api/*` to the backend automatically.
- If you deploy frontend + backend separately, set `VITE_API_BASE_URL` (e.g. `https://your-backend.example.com`) in the frontend environment.
