# Smart Weather Anomaly Alert System

Weather intelligence dashboard with anomaly detection, live maps, alerts, and crop advisory.

## Quick Start

**1. Set up environment:**
```bash
# Copy env template
copy .env.example .env

# Edit .env - set DATABASE_URL (PostgreSQL connection string)
# For local Postgres: add DB_SSLMODE=disable
```

**2. Install and run:**

**Option A – Use start.bat (Windows):**
```bash
start.bat
```

**Option B – Manual:**
```bash
# Terminal 1 - Backend
pip install -r requirements.txt
python app.py

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

**3. Open http://localhost:3000** (frontend proxies /api to backend)

## Project Structure

```
weather_system_clone/
├── app.py              # Flask entry
├── backend/            # API routes, data storage, weather service
├── database/           # Postgres connection
├── frontend/           # React app (Vite)
├── model/              # ML anomaly detection
├── utils/              # Helpers, alerts
├── data/               # Weather logs, training data
          # Run both servers
```

## Database (Login & Signup)

Users stored in **PostgreSQL**. Tables created on first run:

- `users` – email, hashed password, location
- `farmers`, `weather_logs`, `alerts`

`SUPABASE_URL` / `SUPABASE_KEY` are optional.

## API

- `POST /api/register` – Sign up
- `POST /api/login` – Sign in
- `GET /api/dashboard` – Weather logs, alerts
- `GET /api/weather/current?city=...` – Current weather
# Weather_Alert_System
