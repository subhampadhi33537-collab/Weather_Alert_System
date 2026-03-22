from __future__ import annotations

from typing import Dict, Tuple

import requests

from config import WEATHER_API_BASE_URL, WEATHER_API_KEY

WEATHERAPI_CURRENT_URL = "https://api.weatherapi.com/v1/current.json"


def _parse_weatherapi_payload(data: Dict, city: str) -> Dict:
	current = data.get("current", {})
	location = data.get("location", {})
	return {
		"city": location.get("name", city),
		"temp": float(current["temp_c"]),
		"humidity": float(current["humidity"]),
		"pressure": float(current["pressure_mb"]),
		"wind": round(float(current["wind_kph"]) / 3.6, 2),
		"lat": float(location.get("lat", 0)),
		"lon": float(location.get("lon", 0)),
	}


def get_weather(city: str) -> Dict:
	if not WEATHER_API_KEY:
		raise ValueError("WEATHER_API_KEY is missing")

	base = WEATHER_API_BASE_URL.lower()
	if "weatherapi.com" in base:
		params = {
			"q": city,
			"key": WEATHER_API_KEY,
			"aqi": "no",
		}
	else:
		params = {
			"q": city,
			"appid": WEATHER_API_KEY,
			"units": "metric",
		}

	response = requests.get(WEATHER_API_BASE_URL, params=params, timeout=15)
	if response.status_code == 401 and "weatherapi.com" not in base:
		fallback = requests.get(
			WEATHERAPI_CURRENT_URL,
			params={"q": city, "key": WEATHER_API_KEY, "aqi": "no"},
			timeout=15,
		)
		fallback.raise_for_status()
		return _parse_weatherapi_payload(fallback.json(), city)

	response.raise_for_status()
	data = response.json()

	if "weatherapi.com" in base:
		return _parse_weatherapi_payload(data, city)

	return {
		"city": data.get("name", city),
		"temp": float(data["main"]["temp"]),
		"humidity": float(data["main"]["humidity"]),
		"pressure": float(data["main"]["pressure"]),
		"wind": round(float(data["wind"]["speed"]), 2),
		"lat": float(data.get("coord", {}).get("lat", 0)),
		"lon": float(data.get("coord", {}).get("lon", 0)),
	}


def check_weather_api_key(test_city: str = "Dhenkanal") -> Tuple[bool, str]:
	if not WEATHER_API_KEY:
		return False, "WEATHER_API_KEY is missing in .env"

	try:
		payload = get_weather(test_city)
		return True, f"Weather API key is valid (sample city: {payload['city']})"
	except requests.HTTPError as exc:
		status = exc.response.status_code if exc.response is not None else "unknown"
		return False, f"Weather API HTTP error: {status}"
	except Exception as exc:
		return False, f"Weather API check failed: {exc}"
