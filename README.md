# 🌦️ Weather Alert System

### 🤖 AI-Powered Weather Monitoring & Alert Platform

A full-stack **weather intelligence platform** that combines **real-time weather data, Machine Learning anomaly detection, rule-based alerts, PostgreSQL, and an interactive React dashboard**.

Built for **farmers, agriculture, and weather-aware operations** 🌾🚜

---

## ✨ Features

* 🌤️ **Real-Time Weather** — OpenWeatherMap / WeatherAPI integration
* 🤖 **ML Anomaly Detection** — Isolation Forest
* 🚨 **Smart Alerts** — Rule-based + ML detection
* 📊 **Analytics Dashboard** — Charts, reports & weather trends
* 🗺️ **Interactive Maps** — Location & geocoding support
* 🌱 **Weather Advisory** — Weather-based recommendations
* 🔐 **Authentication** — Register, login & profile management
* 🗄️ **PostgreSQL** — Persistent weather & alert storage
* 📩 **Notifications** — Optional Gmail & Twilio integration

---

## 🛠️ Tech Stack

### Backend

🐍 Python • Flask • Flask-CORS • Scikit-learn • Joblib • Requests

### Frontend

⚛️ React 19 • Vite • React Router • Recharts • Leaflet • Framer Motion

### Database & Services

🐘 PostgreSQL • Supabase • OpenWeatherMap / WeatherAPI • Twilio • Gmail SMTP

---

## 🏗️ Architecture

```text
👤 User
   ↓
⚛️ React + Vite
   ↓
🐍 Flask REST API
   ↓
┌───────────────┬───────────────┐
↓               ↓               ↓
🌤️ Weather    🤖 ML Model     🔐 Auth
API            Isolation
               Forest
↓               ↓
└───────→ 🚨 Alert Engine
                 ↓
        🗄️ PostgreSQL
                 ↓
        📊 Dashboard
```

---

## 📁 Project Structure

```text
WEATHER_ALERT_SYSTEM/
├── app.py
├── config.py
├── init_model.py
├── requirements.txt
│
├── backend/
│   ├── routes.py
│   ├── weather_service.py
│   ├── data_storage.py
│   └── scheduler.py
│
├── database/
│   ├── db.py
│   └── queries.py
│
├── model/
│   ├── train.py
│   ├── predict.py
│   └── pipeline.py
│
├── utils/
│   ├── alert.py
│   └── helpers.py
│
├── data/
│   ├── weatherHistory.csv
│   ├── weather_logs.json
│   └── anomoly_result.json
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
```

---

## ⚙️ Requirements

* 🐍 Python 3.10+
* 🟢 Node.js 18+
* 📦 npm
* 🐘 PostgreSQL
* 🌤️ Weather API Key

---

## 🚀 Installation

### 1. Clone Repository

```bash
git clone <your-repository-url>
cd WEATHER_ALERT_SYSTEM
```

### 2. Backend Setup

```bash
pip install -r requirements.txt
```

Create `.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_SSLMODE=disable

WEATHER_API_KEY=your_api_key
WEATHER_API_BASE_URL=https://api.openweathermap.org/data/2.5/weather
```

### 3. Initialize ML Model

```bash
python init_model.py
```

### 4. Start Backend

```bash
python app.py
```

Backend:

```text
http://127.0.0.1:5000
```

### 5. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://127.0.0.1:5173
```

---

## 🤖 ML Pipeline

The system uses **Isolation Forest** to detect unusual weather conditions.

```text
🌤️ Weather Data
      ↓
🧹 Preprocessing
      ↓
🤖 Isolation Forest
      ↓
🔍 Anomaly Detection
      ↓
🚨 Alert Generation
      ↓
📊 Dashboard
```

Run the complete pipeline:

```bash
python -m model.pipeline --location Dhenkanal --samples 120 --delay 0 --contamination 0.015
```

---

## 🔌 API Endpoints

| Method  | Endpoint               | Description         |
| ------- | ---------------------- | ------------------- |
| `GET`   | `/health`              | ❤️ System health    |
| `POST`  | `/api/register`        | 👤 Register         |
| `POST`  | `/api/login`           | 🔐 Login            |
| `PATCH` | `/api/profile`         | ✏️ Update profile   |
| `GET`   | `/api/weather/current` | 🌤️ Current weather |
| `GET`   | `/api/geocode`         | 📍 Geocoding        |
| `POST`  | `/api/anomaly/check`   | 🤖 ML detection     |
| `POST`  | `/api/scheduler/run`   | ⏰ Weather scan      |
| `GET`   | `/api/dashboard`       | 📊 Dashboard data   |
| `GET`   | `/api/advisory`        | 🌱 Weather advisory |
| `GET`   | `/api/reports`         | 📈 Reports          |

---

## 🔄 Data Flow

```text
🌤️ Fetch Weather
      ↓
📄 Store Weather Log
      ↓
🤖 ML + Rule Detection
      ↓
🚨 Generate Alert
      ↓
🗄️ PostgreSQL
      ↓
📊 React Dashboard
      ↓
📩 Email / SMS
```

---

## 🔒 Security

* 🔑 Never commit `.env`
* 🔐 Use strong database credentials
* 📧 Use Gmail App Passwords
* 🛡️ Validate API inputs
* 🔒 Use HTTPS in production
* 🎟️ Add JWT/session authentication for production

---

## 🚀 Future Improvements

* 🔐 JWT authentication & protected routes
* ⏰ Automated background scheduler
* 🧠 Advanced weather forecasting models
* 📈 Time-series / LSTM forecasting
* 🧪 Unit & integration testing
* 🐳 Docker Compose
* 🔄 CI/CD pipeline
* ☁️ Cloud deployment & monitoring

---

## ⭐ Project Highlights

**Weather Alert System** demonstrates practical experience in:

`Python` • `Flask` • `React` • `Machine Learning` • `Isolation Forest` • `PostgreSQL` • `REST APIs` • `Data Visualization` • `AI-powered Alerts`

---

<p align="center">

🌦️ **Turning weather data into intelligent, actionable alerts.**

⭐ If you like this project, consider giving the repository a star!

</p>
