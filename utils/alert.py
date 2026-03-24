from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import List

from config import GMAIL_APP_PASSWORD, GMAIL_SENDER_EMAIL, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
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
	if not (GMAIL_SENDER_EMAIL and GMAIL_APP_PASSWORD and to_email):
		return False

	msg = EmailMessage()
	msg["From"] = GMAIL_SENDER_EMAIL
	msg["To"] = to_email
	msg["Subject"] = subject
	msg.set_content(body)

	try:
		with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=20) as smtp:
			smtp.login(GMAIL_SENDER_EMAIL, GMAIL_APP_PASSWORD)
			smtp.send_message(msg)
		return True
	except Exception:
		return False
