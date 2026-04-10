import os

from dotenv import load_dotenv

load_dotenv()


def get_required_env(name: str) -> str:
		value = os.getenv(name, "").strip()
		if not value:
			return ""
		return value


DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
DB_SSLMODE = os.getenv("DB_SSLMODE", "require").strip() or "require"
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()

WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "").strip()
WEATHER_API_BASE_URL = os.getenv("WEATHER_API_BASE_URL", "https://api.openweathermap.org/data/2.5/weather").strip()

MODEL_PATH = os.getenv("MODEL_PATH", "model/isolation_model.pkl").strip()
WEATHER_LOGS_PATH = os.getenv("WEATHER_LOGS_PATH", "data/weather_logs.json").strip()
ANOMALY_RESULT_PATH = os.getenv("ANOMALY_RESULT_PATH", "data/anomoly_result.json").strip()

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "").strip()

GMAIL_SENDER_EMAIL = os.getenv("GMAIL_SENDER_EMAIL", "").strip()
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "").strip()

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com").strip() or "smtp.gmail.com"
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587").strip() or "587")
EMAIL_USER = (os.getenv("EMAIL_USER", "").strip() or GMAIL_SENDER_EMAIL)
EMAIL_PASS = (os.getenv("EMAIL_PASS", "").strip() or GMAIL_APP_PASSWORD)

ALERT_COOLDOWN_SECONDS = int(os.getenv("ALERT_COOLDOWN_SECONDS", "300").strip() or "300")
