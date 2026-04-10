from __future__ import annotations

import logging
import smtplib
import threading
import time
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Tuple

from config import ALERT_COOLDOWN_SECONDS, ANOMALY_RESULT_PATH, EMAIL_HOST, EMAIL_PASS, EMAIL_PORT, EMAIL_USER, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
from utils.anomaly_rules import (
	HUMIDITY_MAX_PCT,
	HUMIDITY_MIN_PCT,
	PRESSURE_MAX_HPA,
	PRESSURE_MIN_HPA,
	TEMP_MAX_C,
	TEMP_MIN_C,
	WIND_MAX_KMH,
	WIND_MAX_MS,
	WIND_MIN_KMH,
	WIND_MIN_MS,
)
from utils.helpers import append_json_record


logger = logging.getLogger(__name__)

_cooldown_guard = threading.Lock()
_last_sent_by_user: Dict[str, float] = {}
_last_signature_by_user: Dict[str, str] = {}


def _as_float(data: Dict[str, Any], key: str, fallback_key: str | None = None) -> float:
	if key in data:
		return float(data[key])
	if fallback_key and fallback_key in data:
		return float(data[fallback_key])
	raise ValueError(f"Missing numeric field: {key}")


def _severity_color(level: str) -> str:
	if level == "HIGH":
		return "#B71C1C"
	if level == "MEDIUM":
		return "#E65100"
	return "#1B5E20"


def _build_email_html(subject: str, lines: List[str], data: Dict[str, float], severity: str) -> str:
	color = _severity_color(severity)
	alert_items = "".join(f"<li>{line}</li>" for line in lines)
	return f"""
<html>
  <body style=\"font-family:Arial,sans-serif;background:#f6f8fa;padding:20px;\">
    <div style=\"max-width:640px;margin:auto;background:#ffffff;border:1px solid #e6e9ef;border-radius:10px;overflow:hidden;\">
      <div style=\"background:{color};color:#fff;padding:14px 18px;font-size:18px;font-weight:700;\">{subject}</div>
      <div style=\"padding:16px 18px;color:#1f2937;line-height:1.5;\">
        <p style=\"margin-top:0;\">Please review the latest weather anomalies detected for your configured location.</p>
        <p><b>Current values</b></p>
        <table style=\"border-collapse:collapse;width:100%;margin-bottom:10px;\">
          <tr><td style=\"padding:6px 0;\">Temperature</td><td style=\"padding:6px 0;text-align:right;\">{data['temperature']:.2f} C</td></tr>
          <tr><td style=\"padding:6px 0;\">Humidity</td><td style=\"padding:6px 0;text-align:right;\">{data['humidity']:.2f} %</td></tr>
          <tr><td style=\"padding:6px 0;\">Wind Speed</td><td style=\"padding:6px 0;text-align:right;\">{data['windspeed']:.2f} m/s</td></tr>
          <tr><td style=\"padding:6px 0;\">Pressure</td><td style=\"padding:6px 0;text-align:right;\">{data['pressure']:.2f} hPa</td></tr>
        </table>
        <p><b>Triggered alerts</b></p>
        <ul>{alert_items}</ul>
        <p style=\"color:#6b7280;font-size:12px;margin-bottom:0;\">Generated at {datetime.now(timezone.utc).isoformat()} UTC</p>
      </div>
    </div>
  </body>
</html>
""".strip()


def _send_email_sync(to_email: str, subject: str, html_message: str) -> bool:
	if not (EMAIL_HOST and EMAIL_PORT and EMAIL_USER and EMAIL_PASS and to_email):
		logger.warning("Email not sent: missing SMTP configuration or recipient.")
		return False

	msg = MIMEMultipart("alternative")
	msg["From"] = EMAIL_USER
	msg["To"] = to_email
	msg["Subject"] = subject
	msg.attach(MIMEText(html_message, "html"))

	try:
		with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=20) as smtp:
			smtp.ehlo()
			smtp.starttls()
			smtp.ehlo()
			smtp.login(EMAIL_USER, EMAIL_PASS)
			smtp.sendmail(EMAIL_USER, [to_email], msg.as_string())
		logger.info("Email alert sent to %s", to_email)
		return True
	except Exception as exc:
		logger.exception("Failed to send email alert to %s: %s", to_email, exc)
		return False


def send_email_alert(to_email: str, subject: str, message: str) -> bool:
	return _send_email_sync(to_email=to_email, subject=subject, html_message=message)


def _send_email_worker(to_email: str, subject: str, message: str, user_email: str | None = None, signature: str | None = None) -> None:
	sent = _send_email_sync(to_email=to_email, subject=subject, html_message=message)
	if sent:
		_append_alert_log(
			{
				"timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
				"source": "email_alert",
				"email": to_email,
				"status": "sent",
			}
		)
		return

	_append_alert_log(
		{
			"timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
			"source": "email_alert",
			"email": to_email,
			"status": "failed",
		}
	)

	# Release cooldown on failure so next anomaly cycle can retry quickly.
	if user_email:
		with _cooldown_guard:
			current_signature = _last_signature_by_user.get(user_email)
			if signature is None or current_signature == signature:
				_last_sent_by_user.pop(user_email, None)
				_last_signature_by_user.pop(user_email, None)


def send_email_alert_async(to_email: str, subject: str, message: str, user_email: str | None = None, signature: str | None = None) -> None:
	worker = threading.Thread(
		target=_send_email_worker,
		kwargs={
			"to_email": to_email,
			"subject": subject,
			"message": message,
			"user_email": user_email,
			"signature": signature,
		},
		daemon=True,
	)
	worker.start()


def _detect_anomalies(data: Dict[str, float]) -> List[Tuple[str, str]]:
	issues: List[Tuple[str, str]] = []
	temp = data["temperature"]
	humidity = data["humidity"]
	wind = data["windspeed"]
	pressure = data["pressure"]

	if temp < TEMP_MIN_C:
		issues.append(("Temperature", f"Temperature dropped below {TEMP_MIN_C:.0f}C ({temp:.2f}C)."))
	elif temp > TEMP_MAX_C:
		issues.append(("Temperature", f"Temperature exceeded {TEMP_MAX_C:.0f}C ({temp:.2f}C)."))

	if humidity < HUMIDITY_MIN_PCT:
		issues.append(("Humidity", f"Humidity is below safe range ({humidity:.2f}%)."))
	elif humidity > HUMIDITY_MAX_PCT:
		issues.append(("Humidity", f"Humidity is above safe range ({humidity:.2f}%)."))

	if wind > WIND_MAX_MS:
		issues.append(("Wind", f"Wind speed is too high ({wind:.2f} m/s)."))

	if pressure < PRESSURE_MIN_HPA:
		issues.append(("Pressure", f"Pressure is abnormally low ({pressure:.2f} hPa)."))
	elif pressure > PRESSURE_MAX_HPA:
		issues.append(("Pressure", f"Pressure is abnormally high ({pressure:.2f} hPa)."))

	return issues


def _cooldown_and_dedup_allows_send(user_email: str, signature: str) -> bool:
	now = time.time()
	with _cooldown_guard:
		last_sent = _last_sent_by_user.get(user_email, 0.0)
		last_signature = _last_signature_by_user.get(user_email, "")
		if now - last_sent < ALERT_COOLDOWN_SECONDS:
			if signature == last_signature:
				return False
			return False

		_last_sent_by_user[user_email] = now
		_last_signature_by_user[user_email] = signature
		return True


def _build_signature(data: Dict[str, float], issue_keys: List[str]) -> str:
	parts = [
		"|".join(sorted(issue_keys)),
		f"T:{round(data['temperature'], 1)}",
		f"H:{round(data['humidity'], 1)}",
		f"W:{round(data['windspeed'], 1)}",
		f"P:{round(data['pressure'], 1)}",
	]
	return "::".join(parts)


def _append_alert_log(record: Dict[str, Any]) -> None:
	try:
		append_json_record(ANOMALY_RESULT_PATH, record, max_records=1000)
	except Exception as exc:
		logger.warning("Failed to append anomaly email log: %s", exc)


def check_and_send_alert(data: Dict[str, Any], user_email: str) -> bool:
	if not user_email:
		logger.warning("Alert check skipped: missing user email.")
		return False

	try:
		normalized = {
			"temperature": _as_float(data, "temperature", fallback_key="temp"),
			"humidity": _as_float(data, "humidity"),
			"windspeed": _as_float(data, "windspeed", fallback_key="wind"),
			"pressure": _as_float(data, "pressure"),
		}
	except (TypeError, ValueError) as exc:
		logger.error("Alert check failed due to bad input payload: %s", exc)
		return False

	issues = _detect_anomalies(normalized)
	if not issues:
		return False

	issue_titles = [item[0] for item in issues]
	issue_messages = [item[1] for item in issues]
	signature = _build_signature(normalized, issue_titles)

	main_issue = issue_titles[0]
	subject = f"[Weather Alert] {main_issue} Anomaly"
	severity = "HIGH" if len(issues) > 1 else "MEDIUM"
	html_message = _build_email_html(subject=subject, lines=issue_messages, data=normalized, severity=severity)

	send_email_alert_async(
		to_email=user_email,
		subject=subject,
		message=html_message,
		user_email=user_email,
		signature=signature,
	)
	_append_alert_log(
		{
			"timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
			"source": "email_alert",
			"email": user_email,
			"status": "queued",
			"issues": issue_titles,
			"input": normalized,
		}
	)
	return True


def rule_based_alert(temp: float, humidity: float, wind: float, pressure: float) -> List[str]:
	alerts: List[str] = []

	if temp < TEMP_MIN_C:
		alerts.append(f"Low Temperature Alert (<{int(TEMP_MIN_C)}C)")
	elif temp > TEMP_MAX_C:
		alerts.append(f"High Temperature Alert (>{int(TEMP_MAX_C)}C)")

	if wind < WIND_MIN_MS:
		alerts.append(f"Very Low Wind Alert (<{int(WIND_MIN_KMH)} km/h)")
	elif wind > WIND_MAX_MS:
		alerts.append(f"Strong Wind Alert (>{int(WIND_MAX_KMH)} km/h)")

	if pressure < PRESSURE_MIN_HPA:
		alerts.append(f"Low Pressure Alert (<{int(PRESSURE_MIN_HPA)} hPa)")
	elif pressure > PRESSURE_MAX_HPA:
		alerts.append(f"High Pressure Alert (>{int(PRESSURE_MAX_HPA)} hPa)")

	if humidity < HUMIDITY_MIN_PCT:
		alerts.append(f"Very Dry Air Alert (<{int(HUMIDITY_MIN_PCT)}%)")
	elif humidity > HUMIDITY_MAX_PCT:
		alerts.append(f"Very Humid Air Alert (>{int(HUMIDITY_MAX_PCT)}%)")

	return alerts


def send_sms(message: str, phone: str) -> bool:
	if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER):
		return False

	try:
		from twilio.rest import Client

		client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
		client.messages.create(body=message, from_=TWILIO_FROM_NUMBER, to=phone)
		return True
	except Exception:
		return False


def send_gmail_alert(to_email: str, subject: str, body: str) -> bool:
	# Backward-compatible wrapper used by scheduler tests.
	html_body = f"<html><body><pre style='font-family:Arial,sans-serif'>{body}</pre></body></html>"
	return send_email_alert(to_email=to_email, subject=subject, message=html_body)
