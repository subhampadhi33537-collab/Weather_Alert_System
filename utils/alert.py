from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import List

from config import GMAIL_APP_PASSWORD, GMAIL_SENDER_EMAIL, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER


def rule_based_alert(temp: float, wind: float, pressure: float) -> List[str]:
	alerts: List[str] = []

	if temp > 40:
		alerts.append("High Temperature Alert")
	if wind > 50:
		alerts.append("Strong Wind Alert")
	if pressure < 980:
		alerts.append("Storm Risk Alert")

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
