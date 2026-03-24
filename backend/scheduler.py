from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.data_storage import get_all_users, get_user_by_email, insert_alert, insert_weather_log
from backend.weather_service import get_weather
from config import ANOMALY_RESULT_PATH, WEATHER_LOGS_PATH
from model.predict import ml_predict
from utils.anomaly_rules import evaluate_threshold_flags
from utils.alert import rule_based_alert, send_gmail_alert, send_sms
from utils.helpers import append_json_record, write_json_records


def evaluate_weather_reading(
	temp: float,
	humidity: float,
	pressure: float,
	wind: float,
	location: Optional[str] = None,
) -> Dict[str, Any]:
	_ = location
	ml_result = ml_predict([temp, humidity, pressure, wind])
	metric_flags = evaluate_threshold_flags(temp=temp, humidity=humidity, pressure=pressure, wind_ms=wind)
	threshold_anomaly = any(metric_flags.values())
	alerts = rule_based_alert(temp=temp, humidity=humidity, wind=wind, pressure=pressure)

	if ml_result == -1:
		alerts.append("Unusual Weather Pattern Detected")

	return {
		"ml_result": int(ml_result),
		"alerts": alerts,
		"anomaly": bool(ml_result == -1 or threshold_anomaly),
		"metric_flags": metric_flags,
		"threshold_anomaly": threshold_anomaly,
	}


def detect_anomaly(temp: float, humidity: float, pressure: float, wind: float, location: Optional[str] = None) -> List[str]:
	result = evaluate_weather_reading(temp=temp, humidity=humidity, pressure=pressure, wind=wind, location=location)
	return result["alerts"]


def build_weather_recommendations(temp: float, humidity: float, pressure: float, wind: float) -> List[str]:
	recommendations: List[str] = []

	if temp > 40:
		recommendations.append("Extreme heat: increase irrigation and avoid midday field work.")
	elif temp > 35:
		recommendations.append("Heat stress risk: irrigate early morning and monitor crop stress.")
	elif temp < 15:
		recommendations.append("Cold spell: protect frost-sensitive crops and consider row covers.")

	if humidity > 85:
		recommendations.append("High humidity: fungal risk is higher; improve airflow and avoid overhead irrigation.")
	elif humidity < 40:
		recommendations.append("Low humidity: prefer evening irrigation to reduce evaporation.")

	if wind > 15:
		recommendations.append("Strong wind: secure temporary structures and avoid aerial spraying.")
	elif wind > 8:
		recommendations.append("Moderate wind: prefer spraying during calmer hours.")

	if pressure < 1000:
		recommendations.append("Low pressure: possible storm development; prepare drainage and secure loose items.")

	if not recommendations:
		recommendations.append("Weather is within normal range. Continue regular monitoring.")

	return recommendations


def run_cycle(
	city: str,
	user_id: Optional[int] = None,
	phone: Optional[str] = None,
	reset_scan_files: bool = False,
) -> Dict:
	weather = get_weather(city)
	timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
	requested_location = str(city or "").strip()
	fetched_city = str(weather.get("city") or requested_location).strip() or requested_location
	location = requested_location or fetched_city

	weather_record = {
		"temp": float(weather["temp"]),
		"humidity": float(weather["humidity"]),
		"pressure": float(weather["pressure"]),
		"wind": float(weather["wind"]),
		"location": location,
		"fetched_city": fetched_city,
		"timestamp": timestamp,
	}

	evaluation = evaluate_weather_reading(
		temp=weather_record["temp"],
		humidity=weather_record["humidity"],
		pressure=weather_record["pressure"],
		wind=weather_record["wind"],
		location=location,
	)

	# weather_logs.json acts as prediction input dataset and stores only fetched location data.
	if reset_scan_files:
		write_json_records(WEATHER_LOGS_PATH, [weather_record])
	else:
		append_json_record(WEATHER_LOGS_PATH, weather_record, max_records=1000)
	try:
		insert_weather_log(
			temp=weather["temp"],
			humidity=weather["humidity"],
			pressure=weather["pressure"],
			wind=weather["wind"],
			location=location,
		)
	except Exception:
		# JSON log remains the source-of-truth prediction dataset when DB is unavailable.
		pass

	ml_result = int(evaluation["ml_result"])
	alerts = list(evaluation["alerts"])
	anomaly = bool(evaluation["anomaly"])
	alerts_for_log = alerts if alerts else ["No anomaly detected"]

	detection_record = {
		"timestamp": timestamp,
		"location": location,
		"input": weather_record,
		"ml_result": int(ml_result),
		"anomaly": anomaly,
		"metric_flags": evaluation["metric_flags"],
		"threshold_anomaly": evaluation["threshold_anomaly"],
		"alerts": alerts_for_log,
	}
	if reset_scan_files:
		write_json_records(ANOMALY_RESULT_PATH, [detection_record])
	else:
		append_json_record(ANOMALY_RESULT_PATH, detection_record, max_records=1000)

	stored_alerts = []
	for message in alerts:
		try:
			stored = insert_alert(message=message, location=location, user_id=user_id)
			stored_alerts.append(stored)
		except Exception:
			pass
		if phone:
			send_sms(message=message, phone=phone)

	return {
		"weather": weather_record,
		"ml_result": int(ml_result),
		"anomaly": anomaly,
		"alerts": alerts,
		"metric_flags": evaluation["metric_flags"],
		"threshold_anomaly": evaluation["threshold_anomaly"],
		"stored_alerts": stored_alerts,
		"detection_record": detection_record,
	}


def run_forever(city: str, interval_seconds: int = 900, user_id: Optional[int] = None, phone: Optional[str] = None) -> None:
	while True:
		run_cycle(city=city, user_id=user_id, phone=phone)
		time.sleep(interval_seconds)


def run_cycle_for_user(user: Dict[str, Any]) -> Dict[str, Any]:
	email = str(user.get("email") or "").strip().lower()
	location = str(user.get("location") or "").strip()
	user_id = user.get("id")

	if not email:
		raise ValueError("User email is required")
	if not location:
		raise ValueError(f"Location missing for user: {email}")

	cycle_result = run_cycle(city=location, user_id=user_id)
	is_anomaly = bool(cycle_result["anomaly"])
	email_sent = False
	weather = cycle_result["weather"]
	recommendations = build_weather_recommendations(
		temp=float(weather["temp"]),
		humidity=float(weather["humidity"]),
		pressure=float(weather["pressure"]),
		wind=float(weather["wind"]),
	)

	if is_anomaly:
		alerts = cycle_result.get("alerts") or ["Unusual Weather Pattern Detected"]
		body = (
			"Weather anomaly detected for your location.\n\n"
			f"User: {email}\n"
			f"Location: {location}\n"
			f"Temperature: {weather['temp']} C\n"
			f"Humidity: {weather['humidity']} %\n"
			f"Pressure: {weather['pressure']} hPa\n"
			f"Wind: {weather['wind']} m/s\n"
			f"ML Result: {cycle_result['ml_result']}\n"
			"Alerts:\n"
			+ "\n".join(f"- {message}" for message in alerts)
			+ "\n\nRecommendations:\n"
			+ "\n".join(f"- {item}" for item in recommendations)
		)

		subject = f"Weather Anomaly Alert - {location}"
		email_sent = send_gmail_alert(to_email=email, subject=subject, body=body)

	return {
		"user_id": user_id,
		"email": email,
		"location": location,
		"anomaly": is_anomaly,
		"alerts": cycle_result["alerts"],
		"recommendations": recommendations,
		"ml_result": cycle_result["ml_result"],
		"gmail_sent": email_sent,
		"weather": weather,
	}


def run_cycle_for_all_users(user_limit: Optional[int] = None) -> Dict[str, Any]:
	users = get_all_users()
	if isinstance(user_limit, int) and user_limit > 0:
		users = users[:user_limit]

	results: List[Dict[str, Any]] = []
	failures: List[Dict[str, Any]] = []

	for user in users:
		try:
			results.append(run_cycle_for_user(user))
		except Exception as exc:
			failures.append(
				{
					"user_id": user.get("id"),
					"email": user.get("email"),
					"error": str(exc),
				}
			)

	anomaly_count = sum(1 for item in results if bool(item.get("anomaly")))
	email_sent_count = sum(1 for item in results if bool(item.get("gmail_sent")))

	return {
		"processed_users": len(results),
		"failed_users": len(failures),
		"anomaly_users": anomaly_count,
		"emails_sent": email_sent_count,
		"results": results,
		"failures": failures,
	}


def run_forever_for_all_users(interval_seconds: int = 900, user_limit: Optional[int] = None) -> None:
	while True:
		run_cycle_for_all_users(user_limit=user_limit)
		time.sleep(interval_seconds)


def test_ml_email_alert_for_user(email: str = "subham33537@gmail.com") -> Dict:
	user = get_user_by_email(email)
	if not user:
		raise ValueError(f"User not found for email: {email}")

	location = str(user["location"]).strip()
	if not location:
		raise ValueError(f"Location missing for user: {email}")

	# For every scan, replace previous files with only this scan's data and prediction.
	cycle_result = run_cycle(city=location, reset_scan_files=True)
	weather = cycle_result["weather"]
	ml_result = int(cycle_result["ml_result"])
	is_anomaly = bool(cycle_result["anomaly"])

	status_text = "ANOMALY DETECTED" if is_anomaly else "No anomaly detected"
	recommendations = build_weather_recommendations(
		temp=float(weather["temp"]),
		humidity=float(weather["humidity"]),
		pressure=float(weather["pressure"]),
		wind=float(weather["wind"]),
	)
	body = (
		"Weather model test result\n\n"
		f"User: {user['email']}\n"
		f"Location: {location}\n"
		f"Temperature: {weather['temp']} C\n"
		f"Humidity: {weather['humidity']}\n"
		f"Pressure: {weather['pressure']}\n"
		f"Wind: {weather['wind']} m/s\n"
		f"ML Result: {ml_result}\n"
		f"Status: {status_text}\n"
		"\nRecommendations:\n"
		+ "\n".join(f"- {item}" for item in recommendations)
	)

	subject = f"Weather ML Alert Test - {location} - {status_text}"
	email_sent = send_gmail_alert(to_email=user["email"], subject=subject, body=body)

	return {
		"email": user["email"],
		"location": location,
		"weather": weather,
		"ml_result": ml_result,
		"anomaly": is_anomaly,
		"alerts": cycle_result["alerts"],
		"recommendations": recommendations,
		"gmail_sent": email_sent,
	}
