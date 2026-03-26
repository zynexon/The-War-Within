# Zynexon - The War Within

Full-stack starter using React (Vite) + Django with Supabase for auth and database.

## Stack

- Frontend: React + Vite + `@supabase/supabase-js`
- Backend: Django
- Auth/DB: Supabase

## Environment Setup

1. Frontend env
   - Copy `frontend/.env.example` to `frontend/.env`
   - Set:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

2. Backend env
   - Copy `backend/.env.example` to `backend/.env`
   - Set:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`

## Run Locally

1. Start backend

```powershell
cd backend
.\.venv\Scripts\python manage.py runserver 8000
```

2. Start frontend in a second terminal

```powershell
cd frontend
npm run dev
```

## Implemented Endpoints

- `GET /api/hello/` basic health response
- `GET /api/me/` validates a Supabase bearer token and returns user profile fields

## Frontend Auth Flow

- Sign up with email/password
- Sign in with email/password
- Sign out
- Verify current access token against Django `/api/me/`
