from __future__ import annotations

from typing import Dict

TEMP_MIN_C = 10.0
TEMP_MAX_C = 40.0

WIND_MIN_KMH = 1.0
WIND_MAX_KMH = 60.0
WIND_MIN_MS = WIND_MIN_KMH / 3.6
WIND_MAX_MS = WIND_MAX_KMH / 3.6

PRESSURE_MIN_HPA = 980.0
PRESSURE_MAX_HPA = 1050.0

HUMIDITY_MIN_PCT = 20.0
HUMIDITY_MAX_PCT = 90.0


def evaluate_threshold_flags(temp: float, humidity: float, pressure: float, wind_ms: float) -> Dict[str, bool]:
	return {
		"temperature": bool(temp < TEMP_MIN_C or temp > TEMP_MAX_C),
		"humidity": bool(humidity < HUMIDITY_MIN_PCT or humidity > HUMIDITY_MAX_PCT),
		"pressure": bool(pressure < PRESSURE_MIN_HPA or pressure > PRESSURE_MAX_HPA),
		"wind": bool(wind_ms < WIND_MIN_MS or wind_ms > WIND_MAX_MS),
	}


def is_threshold_anomaly(temp: float, humidity: float, pressure: float, wind_ms: float) -> bool:
	flags = evaluate_threshold_flags(temp=temp, humidity=humidity, pressure=pressure, wind_ms=wind_ms)
	return any(flags.values())
