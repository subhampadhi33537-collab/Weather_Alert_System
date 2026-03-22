# Weather Alert System

Weather Alert System is a full-stack weather intelligence platform for farmers and weather-aware operations.
It combines:

- real-time weather fetch from external APIs,
- rule-based + ML anomaly detection,
- alert persistence in PostgreSQL,
- dashboard visualization (map, graph, alerts, advisory),
- authentication (register/login/profile update).

The backend is built with Flask and the frontend is a React + Vite app.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Setup and Run](#local-setup-and-run)
- [Model Initialization and Training](#model-initialization-and-training)
- [API Reference](#api-reference)
- [How Data Flows](#how-data-flows)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [Future Improvements](#future-improvements)

## Features

- User authentication
	- Register user with email, password, location
	- Login with secure hash verification (scrypt/pbkdf2 compatible)
	- Update user location from profile
- Live weather integration
	- Fetch current weather for a city from OpenWeatherMap or WeatherAPI.com
	- Geocoding endpoint for map coordinates
- Alerts and anomaly detection
	- Rule-based alerts (temperature, wind, pressure thresholds)
	- ML anomaly detection using Isolation Forest
	- Combined alert list stored in database
- Dashboard and analytics
	- Recent weather logs and alerts
	- Aggregated report summary (avg/min/max temp, total logs, total alerts)
	- Advisory endpoint with weather-based recommendations
- Notification utilities
	- Twilio SMS (optional)
	- Gmail SMTP alert email (optional)

## Tech Stack

Backend:

- Python 3.10+
- Flask + flask-cors
- psycopg2 (PostgreSQL)
- requests
- scikit-learn + joblib
- python-dotenv

Frontend:

- React 19
- Vite 8
- react-router-dom
- recharts
- leaflet
- framer-motion

Data/Infra:

- PostgreSQL (required)
- Supabase (optional connectivity)

## Architecture Overview

1. Frontend calls `/api/*` routes (proxied by Vite to Flask backend).
2. Backend fetches weather from external provider.
3. Backend runs rules + ML prediction for anomaly detection.
4. Results are:
	 - appended to JSON logs (`data/weather_logs.json`, `data/anomoly_result.json`),
	 - persisted to PostgreSQL tables (`weather_logs`, `alerts`), when DB is available.
5. Frontend visualizes dashboard, maps, alerts, advisories, and reports.

## Project Structure

```text
WEATHER_ALERT_SYSTEM/
├── app.py                      # Flask app entrypoint
├── config.py                   # Environment variable loading and app settings
├── init_model.py               # Trains model if missing
├── requirements.txt            # Python dependencies
├── backend/
│   ├── routes.py               # REST API endpoints
│   ├── weather_service.py      # Weather provider integration
│   ├── data_storage.py         # DB CRUD and table initialization
│   └── scheduler.py            # Weather scan + detection cycle
├── database/
│   ├── db.py                   # PostgreSQL and Supabase clients
│   ├── queries.py              # Connection health helpers
│   └── supabase_users_setup.sql
├── model/
│   ├── train.py                # Isolation Forest training
│   ├── predict.py              # Inference utilities
│   └── pipeline.py             # End-to-end train + run-cycle script
├── utils/
│   ├── alert.py                # Rule-based alerts + SMS/email senders
│   └── helpers.py              # JSON read/write helpers
├── data/
│   ├── weatherHistory.csv      # Historical weather dataset (training source)
│   ├── weather_logs.json       # Runtime weather records
│   └── anomoly_result.json     # Runtime anomaly records
└── frontend/
		├── package.json
		├── vite.config.js          # /api proxy -> Flask backend
		└── src/                    # React app pages/components/context
```

## Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher (Node 20 recommended)
- npm
- PostgreSQL database

## Environment Variables

Create `.env` in project root.

Start from template:

```bash
copy .env.example .env
```

### Required

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### Recommended for local PostgreSQL

```env
DB_SSLMODE=disable
```

### Weather API (required for live weather endpoints)

Use either provider style. Default base URL targets OpenWeatherMap.

```env
WEATHER_API_KEY=your_api_key
WEATHER_API_BASE_URL=https://api.openweathermap.org/data/2.5/weather
```

Alternative (WeatherAPI.com):

```env
WEATHER_API_BASE_URL=https://api.weatherapi.com/v1/current.json
```

### Optional integrations

```env
SUPABASE_URL=
SUPABASE_KEY=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

GMAIL_SENDER_EMAIL=
GMAIL_APP_PASSWORD=
```

## Local Setup and Run

### 1. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 2. Start backend

```bash
python app.py
```

Backend runs at:

- `http://127.0.0.1:5000`
- health check: `http://127.0.0.1:5000/health`

### 3. Start frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

- `http://127.0.0.1:5173`

Vite proxy forwards `/api/*` requests to backend on port `5000`.

## Model Initialization and Training

### Initialize model if missing

```bash
python init_model.py
```

Behavior:

- tries training from `data/weather_logs.json`,
- if insufficient data, falls back to `data/weatherHistory.csv`.

### Run full pipeline (train + sample scans)

```bash
python -m model.pipeline --location Dhenkanal --samples 120 --delay 0 --contamination 0.015
```

Output includes:

- model path,
- number of training rows,
- number of tested detections,
- anomaly ratio.

## API Reference

Base URL: `http://127.0.0.1:5000`

### System

- `GET /`
	- basic backend message
- `GET /health`
	- postgres and supabase connectivity status

### Authentication and Profile

- `POST /api/register`
	- body: `{ "email": "...", "password": "...", "location": "..." }`
- `POST /api/login`
	- body: `{ "email": "...", "password": "..." }`
- `PATCH /api/profile`
	- body: `{ "user_id": 1, "location": "New City" }`

### Weather and Geocoding

- `GET /api/weather/current?city=Delhi`
- `GET /api/geocode?city=Delhi`
- `GET /api/weather/check-key?city=Dhenkanal`

### Detection and Scheduler

- `POST /api/anomaly/check`
	- body: `{ "temp": 35, "humidity": 72, "pressure": 1002, "wind": 4.2 }`
- `POST /api/scheduler/run`
	- body: `{ "city": "Dhenkanal", "user_id": 1, "phone": "+91...", "reset_scan_files": false }`

### Dashboard and Reports

- `GET /api/dashboard?location=Dhenkanal`
- `GET /api/advisory?location=Dhenkanal`
- `GET /api/reports?location=Dhenkanal`

### Alert Testing

- `POST /api/alerts/test-email`
	- body: `{ "email": "user@example.com" }`

## How Data Flows

For each weather scan (`/api/scheduler/run`):

1. Fetch weather by city.
2. Create a normalized weather record.
3. Append record to `data/weather_logs.json`.
4. Attempt to insert into `public.weather_logs`.
5. Run ML prediction + rule-based checks.
6. Append detection record to `data/anomoly_result.json`.
7. Store alerts in `public.alerts`.
8. Optionally send SMS/email alerts when configured.

This means the JSON files can still capture scan history even if the DB is temporarily unavailable.

## Troubleshooting

### Missing DATABASE_URL

Error:

- `Missing required environment variable: DATABASE_URL`

Fix:

- set `DATABASE_URL` in `.env`.

### PostgreSQL connection failure

Fix checks:

- verify credentials/host/port in `DATABASE_URL`,
- for local DB add `DB_SSLMODE=disable`,
- confirm database is running and reachable.

### Weather endpoint errors

If weather calls fail:

- ensure `WEATHER_API_KEY` is valid,
- verify `WEATHER_API_BASE_URL` matches provider,
- test with `GET /api/weather/check-key`.

### Frontend cannot reach backend

Verify:

- backend running on `127.0.0.1:5000`,
- frontend running with Vite,
- proxy config in `frontend/vite.config.js` unchanged.

### Model not found / no anomaly predictions

Run:

```bash
python init_model.py
```

Or execute:

```bash
python -m model.pipeline --location Dhenkanal --samples 60
```

## Security Notes

- Never commit `.env` to git.
- Use app passwords for Gmail SMTP.
- Restrict Twilio usage to approved phone numbers in trial mode.
- Use HTTPS and strong DB credentials in production.
- Consider replacing client-side-only auth persistence with server-side token/session validation for production.

## Future Improvements

- Add JWT/session authentication and route guards for all private pages.
- Add scheduler/cron worker for automatic periodic scans.
- Add migration tooling (Alembic) for database schema versioning.
- Add test suite (unit + integration + API contract tests).
- Add Docker Compose for one-command local startup.
