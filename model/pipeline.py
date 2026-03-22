from __future__ import annotations

import argparse
import csv
import json
import time
from pathlib import Path
from typing import Dict, List

from backend.scheduler import run_cycle
from config import ANOMALY_RESULT_PATH, WEATHER_LOGS_PATH
from model.train import train_model
from utils.helpers import read_json_records

HISTORY_CSV_PATH = Path("data/weatherHistory.csv")
WEATHER_LOGS_JSON_PATH = Path(WEATHER_LOGS_PATH)
ANOMALY_RESULTS_PATH = Path(ANOMALY_RESULT_PATH)


def load_history_features(csv_path: Path) -> List[List[float]]:
    if not csv_path.exists():
        raise FileNotFoundError(f"Training CSV not found: {csv_path}")

    rows: List[List[float]] = []
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for item in reader:
            try:
                temp = float(item["Temperature (C)"])
                humidity_fraction = float(item["Humidity"])
                pressure = float(item["Pressure (millibars)"])
                wind_kmh = float(item["Wind Speed (km/h)"])
            except (KeyError, TypeError, ValueError):
                continue

            # Convert units to match runtime API data format.
            humidity = humidity_fraction * 100.0
            wind_ms = wind_kmh / 3.6
            rows.append([temp, humidity, pressure, wind_ms])

    if not rows:
        raise ValueError("No valid training rows found in weatherHistory.csv")
    return rows


def run_pipeline(location: str, samples: int, delay_seconds: float, contamination: float) -> Dict:
    training_rows = load_history_features(HISTORY_CSV_PATH)
    model_path = train_model(training_rows, contamination=contamination)

    cycle_results: List[Dict] = []
    for i in range(max(0, samples)):
        cycle_results.append(run_cycle(city=location))
        if delay_seconds > 0 and i < samples - 1:
            time.sleep(delay_seconds)

    weather_logs = read_json_records(str(WEATHER_LOGS_JSON_PATH))
    detection_logs = read_json_records(str(ANOMALY_RESULTS_PATH))
    relevant_detections = [row for row in detection_logs if str(row.get("location", "")).lower() == location.lower()]
    anomaly_count = sum(1 for row in relevant_detections if bool(row.get("anomaly")))

    result = {
        "model_path": model_path,
        "training_rows": len(training_rows),
        "weather_logs_path": str(WEATHER_LOGS_JSON_PATH),
        "weather_logs_rows": len(weather_logs),
        "anomoly_result_path": str(ANOMALY_RESULTS_PATH),
        "prediction_runs": len(cycle_results),
        "location": location,
        "report": {
            "total_tested": len(relevant_detections),
            "anomaly_count": anomaly_count,
            "anomaly_ratio": (anomaly_count / len(relevant_detections)) if relevant_detections else 0.0,
        },
    }

    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train model from weatherHistory.csv and test on weather_logs.json")
    parser.add_argument("--location", type=str, default="Dhenkanal", help="Single location used for weather API fetching")
    parser.add_argument("--samples", type=int, default=120, help="Number of weather rows to fetch into weather_logs.json")
    parser.add_argument("--delay", type=float, default=0.0, help="Delay in seconds between API calls")
    parser.add_argument("--contamination", type=float, default=0.015, help="IsolationForest contamination")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = run_pipeline(
        location=args.location,
        samples=args.samples,
        delay_seconds=args.delay,
        contamination=args.contamination,
    )

    print(
        "Training + prediction done. "
        f"rows={result['training_rows']} | location={result['location']} | "
        f"tested={result['report']['total_tested']} | anomalies={result['report']['anomaly_count']} | "
        f"model={result['model_path']}"
    )


if __name__ == "__main__":
    main()
