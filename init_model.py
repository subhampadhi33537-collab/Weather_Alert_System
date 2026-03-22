"""Initialize ML model from weather_logs.json or weatherHistory.csv if model does not exist."""
from pathlib import Path

from model.train import train_model
from utils.helpers import read_json_records

MODEL_PATH = Path("model/isolation_model.pkl")
WEATHER_LOGS = Path("data/weather_logs.json")
WEATHER_HISTORY_CSV = Path("data/weatherHistory.csv")


def train_from_json() -> bool:
    if not WEATHER_LOGS.exists():
        return False
    records = read_json_records(str(WEATHER_LOGS))
    rows = []
    for r in records:
        try:
            rows.append([
                float(r.get("temp", 0)),
                float(r.get("humidity", 0)),
                float(r.get("pressure", 0)),
                float(r.get("wind", 0)),
            ])
        except (TypeError, ValueError):
            continue
    if len(rows) < 5:
        return False
    train_model(rows)
    return True


def train_from_csv() -> bool:
    if not WEATHER_HISTORY_CSV.exists():
        return False
    import csv
    rows = []
    with WEATHER_HISTORY_CSV.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for item in reader:
            try:
                temp = float(item.get("Temperature (C)", 0))
                humidity = float(item.get("Humidity", 0)) * 100
                pressure = float(item.get("Pressure (millibars)", 0))
                wind_kmh = float(item.get("Wind Speed (km/h)", 0))
                wind_ms = wind_kmh / 3.6
                rows.append([temp, humidity, pressure, wind_ms])
            except (KeyError, TypeError, ValueError):
                continue
    if len(rows) < 5:
        return False
    train_model(rows)
    return True


if __name__ == "__main__":
    if MODEL_PATH.exists():
        print(f"Model already exists at {MODEL_PATH}")
        exit(0)
    if train_from_json():
        print(f"Model trained from {WEATHER_LOGS}")
    elif train_from_csv():
        print(f"Model trained from {WEATHER_HISTORY_CSV}")
    else:
        print("No training data found. Run a weather scan first or add weatherHistory.csv")
