from __future__ import annotations

import time
from datetime import datetime, timezone
from threading import Lock

from flask import Blueprint, jsonify, request

from backend.data_storage import (
	get_recent_alerts,
	get_recent_weather,
	login_user,
	register_user,
	update_user_location,
)
from backend.scheduler import evaluate_weather_reading, run_cycle, run_cycle_for_all_users, test_ml_email_alert_for_user
from backend.weather_service import check_weather_api_key, get_weather
from config import ANOMALY_RESULT_PATH, WEATHER_LOGS_PATH
from utils.helpers import read_json_records, write_json_records

api_bp = Blueprint("api", __name__, url_prefix="/api")


LIVE_REFRESH_MINUTES = 10
LIVE_REFRESH_COOLDOWN_SECONDS = 20
_LIVE_REFRESH_GUARD = Lock()
_LAST_LIVE_REFRESH: dict[str, float] = {}


def _parse_iso_timestamp(value: str | None) -> datetime | None:
	if not value:
		return None
	try:
		return datetime.fromisoformat(value.replace("Z", "+00:00"))
	except ValueError:
		return None


def _to_int(value):
	try:
		return int(value)
	except (TypeError, ValueError):
		return None


def _normalize_location(value: str | None) -> str:
	text = str(value or "").strip().lower()
	if not text:
		return ""
	parts = [part.strip() for part in text.split(",") if part.strip()]
	return parts[0] if parts else text


def _try_acquire_refresh_slot(location_key: str, force_refresh: bool = False) -> bool:
	if force_refresh:
		return True
	now = time.time()
	with _LIVE_REFRESH_GUARD:
		last_refresh = float(_LAST_LIVE_REFRESH.get(location_key, 0.0))
		if now - last_refresh < LIVE_REFRESH_COOLDOWN_SECONDS:
			return False
		_LAST_LIVE_REFRESH[location_key] = now
		return True


def _should_refresh_for_location(location: str, force_refresh: bool = False) -> bool:
	if force_refresh:
		return True

	try:
		recent = get_recent_weather(limit=1, location=location)
	except Exception:
		return True
	if not recent:
		normalized = _normalize_location(location)
		if normalized and normalized != str(location).strip().lower():
			try:
				recent = get_recent_weather(limit=1, location=normalized)
			except Exception:
				return True
	if not recent:
		return True

	last_timestamp = _parse_iso_timestamp(recent[0].get("timestamp"))
	if not last_timestamp:
		return True

	now_utc = datetime.now(timezone.utc)
	delta_seconds = (now_utc - last_timestamp.astimezone(timezone.utc)).total_seconds()
	return delta_seconds >= LIVE_REFRESH_MINUTES * 60


def _row_location(row: dict) -> str:
	if not isinstance(row, dict):
		return ""
	loc = str(row.get("location") or "").strip()
	if loc:
		return loc
	input_loc = row.get("input") if isinstance(row.get("input"), dict) else {}
	return str(input_loc.get("location") or "").strip()


def _keep_only_location(file_path: str, location: str) -> None:
	target = _normalize_location(location)
	if not target:
		return
	rows = read_json_records(file_path)
	filtered = [row for row in rows if _normalize_location(_row_location(row)) == target]
	write_json_records(file_path, filtered)


def _sync_json_files_to_location(location: str) -> None:
	_keep_only_location(WEATHER_LOGS_PATH, location)
	_keep_only_location(ANOMALY_RESULT_PATH, location)


def _infer_alert_severity(message: str) -> str:
	text = str(message or "").strip().lower()
	if any(token in text for token in ("storm", "cyclone", "extreme", "high", "very low", "unusual")):
		return "High"
	if any(token in text for token in ("medium", "moderate", "risk", "humid", "dry")):
		return "Medium"
	return "Low"


def _alerts_from_anomaly_logs(location: str | None, limit: int = 20):
	target = _normalize_location(location)
	rows = read_json_records(ANOMALY_RESULT_PATH)
	items = []

	for row in rows:
		if not isinstance(row, dict):
			continue
		row_location = _row_location(row)
		if target and _normalize_location(row_location) != target:
			continue
		messages = row.get("alerts") if isinstance(row.get("alerts"), list) else []
		if not messages and bool(row.get("anomaly")):
			messages = ["Unusual Weather Pattern Detected"]
		if not messages:
			continue
		timestamp = str(row.get("timestamp") or "")
		for idx, message in enumerate(messages):
			if not str(message).strip():
				continue
			items.append(
				{
					"id": f"json-{timestamp}-{idx}",
					"user_id": None,
					"message": str(message),
					"location": row_location or "Unknown",
					"timestamp": timestamp,
					"severity": _infer_alert_severity(str(message)),
				}
			)

	items.sort(key=lambda item: str(item.get("timestamp") or ""), reverse=True)
	return items[: max(1, limit)]


@api_bp.post("/register")
def api_register():
	payload = request.get_json(silent=True) or {}
	email = (payload.get("email") or "").strip().lower()
	password = (payload.get("password") or "").strip()
	location = (payload.get("location") or "").strip()

	if not (email and password and location):
		return jsonify({"error": "email, password and location are required"}), 400

	try:
		user = register_user(email=email, password=password, location=location)
		_sync_json_files_to_location(location)
		return jsonify({"message": "registered", "user": user}), 201
	except ValueError as exc:
		return jsonify({"error": str(exc)}), 400


@api_bp.post("/login")
def api_login():
	payload = request.get_json(silent=True) or {}
	email = (payload.get("email") or "").strip().lower()
	password = (payload.get("password") or "").strip()

	if not (email and password):
		return jsonify({"error": "email and password are required"}), 400

	user = login_user(email=email, password=password)
	if not user:
		return jsonify({"error": "invalid credentials"}), 401

	_sync_json_files_to_location(str(user.get("location") or ""))

	return jsonify({"message": "login successful", "user": user}), 200



@api_bp.get("/weather/current")
def api_weather_current():
	city = (request.args.get("city") or "").strip()
	if not city:
		return jsonify({"error": "city is required"}), 400
	try:
		payload = get_weather(city)
		return jsonify(payload), 200
	except Exception as exc:
		return jsonify({"error": str(exc)}), 502


@api_bp.get("/geocode")
def api_geocode():
	import requests
	city = (request.args.get("city") or "").strip()
	if not city:
		return jsonify({"error": "city is required"}), 400
	
	try:
		# Use nominatim with proper user-agent to avoid browser CORS/rate limiting issues
		headers = {"User-Agent": "WeatherAlertApp/1.0 (local@example.com)"}
		res = requests.get(f"https://nominatim.openstreetmap.org/search?format=json&q={city}", headers=headers, timeout=10)
		res.raise_for_status()
		data = res.json()
		if data and len(data) > 0:
			return jsonify({"lat": float(data[0]["lat"]), "lon": float(data[0]["lon"])}), 200
		return jsonify({"error": "Not found"}), 404
	except Exception as exc:
		return jsonify({"error": str(exc)}), 502


@api_bp.get("/weather/check-key")
def api_weather_key_check():
	city = (request.args.get("city") or "").strip() or "Dhenkanal"
	ok, message = check_weather_api_key(test_city=city)
	status = 200 if ok else 500
	return jsonify({"ok": ok, "message": message}), status


@api_bp.post("/anomaly/check")
def api_anomaly_check():
	payload = request.get_json(silent=True) or {}
	location = (payload.get("location") or "").strip() or None

	try:
		temp = float(payload.get("temp"))
		humidity = float(payload.get("humidity"))
		pressure = float(payload.get("pressure"))
		wind = float(payload.get("wind"))
	except (TypeError, ValueError):
		return jsonify({"error": "temp, humidity, pressure and wind must be numeric"}), 400

	result = evaluate_weather_reading(temp=temp, humidity=humidity, pressure=pressure, wind=wind, location=location)
	return jsonify({
		"alerts": result["alerts"],
		"anomaly": result["anomaly"],
		"ml_result": result["ml_result"],
		"metric_flags": result["metric_flags"],
		"threshold_anomaly": result["threshold_anomaly"],
	}), 200


@api_bp.post("/scheduler/run")
def api_scheduler_run():
	payload = request.get_json(silent=True) or {}
	city = (payload.get("city") or "").strip()
	if not city:
		return jsonify({"error": "city is required"}), 400
	user_id = payload.get("user_id")
	phone = (payload.get("phone") or "").strip() or None
	reset_scan_files = bool(payload.get("reset_scan_files", False))

	try:
		result = run_cycle(city=city, user_id=user_id, phone=phone, reset_scan_files=reset_scan_files)
		result["weather_logs_path"] = WEATHER_LOGS_PATH
		result["anomoly_result_path"] = ANOMALY_RESULT_PATH
		return jsonify(result), 200
	except Exception as exc:
		return jsonify({"error": str(exc)}), 500


@api_bp.post("/scheduler/run-users")
def api_scheduler_run_users():
	payload = request.get_json(silent=True) or {}
	limit = _to_int(payload.get("limit"))

	try:
		result = run_cycle_for_all_users(user_limit=limit)
		return jsonify(result), 200
	except Exception as exc:
		return jsonify({"error": str(exc)}), 500


@api_bp.get("/dashboard")
def api_dashboard_data():
	location = (request.args.get("location") or "").strip() or None
	weather = []
	alerts = []
	normalized_location = _normalize_location(location) if location else None

	try:
		weather = get_recent_weather(limit=20, location=location)
	except Exception:
		weather = []

	if location and not weather and normalized_location and normalized_location != location.lower():
		try:
			weather = get_recent_weather(limit=20, location=normalized_location)
		except Exception:
			weather = []

	try:
		alerts = get_recent_alerts(limit=20, location=location)
	except Exception:
		alerts = []

	if location and not alerts and normalized_location and normalized_location != location.lower():
		try:
			alerts = get_recent_alerts(limit=20, location=normalized_location)
		except Exception:
			alerts = []

	if not alerts:
		alerts = _alerts_from_anomaly_logs(location=location, limit=20)
		if not alerts and normalized_location and normalized_location != (location or "").lower():
			alerts = _alerts_from_anomaly_logs(location=normalized_location, limit=20)
	return jsonify({"weather_logs": weather, "alerts": alerts}), 200


@api_bp.get("/anomaly/live")
def api_live_anomaly_data():
	try:
		location = (request.args.get("location") or "").strip()
		if not location:
			return jsonify({"error": "location is required"}), 400
		location_key = _normalize_location(location)

		user_id = _to_int(request.args.get("user_id"))
		limit = _to_int(request.args.get("limit")) or 300
		limit = max(1, min(limit, 1000))
		force_refresh = (request.args.get("force_refresh") or "").strip().lower() == "true"
		auto_refresh = (request.args.get("auto_refresh") or "true").strip().lower() != "false"

		refresh_triggered = False
		if auto_refresh and _should_refresh_for_location(location=location, force_refresh=force_refresh):
			if _try_acquire_refresh_slot(location_key=location_key, force_refresh=force_refresh):
				try:
					run_cycle(city=location, user_id=user_id)
					refresh_triggered = True
				except Exception as exc:
					return jsonify({"error": f"auto refresh failed: {exc}"}), 502

		rows = read_json_records(ANOMALY_RESULT_PATH)
		filtered_rows = [
			row
			for row in rows
			if _normalize_location(_row_location(row)) == location_key
		]
		filtered_rows.sort(key=lambda row: str(row.get("timestamp") or ""), reverse=True)

		return (
			jsonify(
				{
					"location": location,
					"refresh_interval_minutes": LIVE_REFRESH_MINUTES,
					"refresh_triggered": refresh_triggered,
					"anomaly_logs": filtered_rows[:limit],
				}
			),
			200,
		)
	except Exception as exc:
		return jsonify({"error": f"live anomaly failed: {exc}"}), 500


@api_bp.get("/advisory")
def api_advisory():
	"""Weather-based crop advisories. Requires current weather from /weather/current."""
	location = (request.args.get("location") or "").strip()
	if not location:
		return jsonify({"error": "location is required"}), 400
	try:
		weather = get_weather(location)
	except Exception as exc:
		return jsonify({"error": str(exc)}), 502

	temp = float(weather.get("temp", 0))
	humidity = float(weather.get("humidity", 0))
	pressure = float(weather.get("pressure", 0))
	wind = float(weather.get("wind", 0))

	advisories = []
	if temp > 40:
		advisories.append({"title": "High Temperature Alert", "description": "Extreme heat. Provide shade, increase irrigation frequency, avoid midday fieldwork.", "icon": "🌡️", "severity": "high"})
	elif temp > 35:
		advisories.append({"title": "Heat stress risk", "description": "Temperature elevated. Schedule irrigation for early morning, monitor crop water stress.", "icon": "🌡️", "severity": "medium"})
	elif temp < 15:
		advisories.append({"title": "Cold spell advisory", "description": "Low temperatures. Protect frost-sensitive crops, consider row covers.", "icon": "❄️", "severity": "high"})
	elif 20 <= temp <= 28 and 60 <= humidity <= 80:
		advisories.append({"title": "Optimal growing conditions", "description": "Temperature and humidity ideal for most crops. Good period for sowing and transplanting.", "icon": "🌾", "severity": "success"})

	if humidity > 85:
		advisories.append({"title": "High humidity - disease risk", "description": "Fungal diseases favored. Ensure good airflow, avoid overhead irrigation.", "icon": "💧", "severity": "medium"})
	elif humidity < 40:
		advisories.append({"title": "Irrigation recommendation", "description": "Low humidity. Schedule irrigation for evening hours to reduce evaporation.", "icon": "💧", "severity": "low"})

	if wind > 15:
		advisories.append({"title": "Wind advisory", "description": "Strong winds expected. Secure temporary structures, avoid aerial spraying.", "icon": "💨", "severity": "medium"})
	elif wind > 8:
		advisories.append({"title": "Moderate wind", "description": "Wind may affect spraying. Prefer early morning or late evening for field operations.", "icon": "💨", "severity": "low"})

	if pressure < 1000:
		advisories.append({"title": "Storm risk", "description": "Low pressure may indicate incoming weather. Prepare drainage, secure loose items.", "icon": "⛈️", "severity": "high"})

	if not advisories:
		advisories.append({"title": "Normal conditions", "description": "Weather within typical range. Continue regular monitoring.", "icon": "✅", "severity": "success"})

	return jsonify({"advisories": advisories, "weather": weather}), 200


@api_bp.get("/reports")
def api_reports():
	"""Aggregated weather and anomaly report data."""
	location = (request.args.get("location") or "").strip() or None
	weather = get_recent_weather(limit=50, location=location)
	alerts = get_recent_alerts(limit=50, location=location)

	temps = [w["temp"] for w in weather]
	summary = {
		"total_logs": len(weather),
		"total_alerts": len(alerts),
		"avg_temp": round(sum(temps) / len(temps), 1) if temps else 0,
		"min_temp": min(temps) if temps else 0,
		"max_temp": max(temps) if temps else 0,
	}

	return jsonify({"summary": summary, "weather_logs": weather, "alerts": alerts}), 200


@api_bp.patch("/profile")
def api_update_profile():
	payload = request.get_json(silent=True) or {}
	user_id = payload.get("user_id")
	location = (payload.get("location") or "").strip()

	if not user_id:
		return jsonify({"error": "user_id is required"}), 400
	if not location:
		return jsonify({"error": "location is required"}), 400

	try:
		user_id = int(user_id)
	except (TypeError, ValueError):
		return jsonify({"error": "user_id must be a number"}), 400

	user = update_user_location(user_id=user_id, location=location)
	if not user:
		return jsonify({"error": "User not found"}), 404

	_sync_json_files_to_location(location)

	return jsonify({"message": "Profile updated", "user": user}), 200


@api_bp.post("/alerts/test-email")
def api_test_email_alert():
	payload = request.get_json(silent=True) or {}
	email = (payload.get("email") or "subham33537@gmail.com").strip().lower()

	try:
		result = test_ml_email_alert_for_user(email=email)
		return jsonify(result), 200
	except Exception as exc:
		return jsonify({"error": str(exc)}), 500
