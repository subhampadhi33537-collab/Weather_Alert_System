from __future__ import annotations

from typing import Dict, List, Optional

import psycopg2
from werkzeug.security import check_password_hash, generate_password_hash

from database.db import get_pg_connection


def init_tables() -> None:
	queries = [
		"""
		CREATE TABLE IF NOT EXISTS public.users (
			id BIGSERIAL PRIMARY KEY,
			email TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			location TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		""",
		"""
		CREATE TABLE IF NOT EXISTS public.weather_logs (
			id BIGSERIAL PRIMARY KEY,
			temp DOUBLE PRECISION NOT NULL,
			humidity DOUBLE PRECISION NOT NULL,
			pressure DOUBLE PRECISION NOT NULL,
			wind DOUBLE PRECISION NOT NULL,
			location VARCHAR(160) NOT NULL,
			timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		""",
		"""
		CREATE TABLE IF NOT EXISTS public.alerts (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
			message TEXT NOT NULL,
			location VARCHAR(160) NOT NULL,
			timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		""",
	]

	with get_pg_connection() as conn:
		with conn.cursor() as cursor:
			for query in queries:
				cursor.execute(query)
		conn.commit()


def register_user(email: str, password: str, location: str) -> Dict:
	password_hash = generate_password_hash(password, method="scrypt")
	query = """
	INSERT INTO public.users (email, password, location)
	VALUES (%s, %s, %s)
	RETURNING id, email, location, created_at;
	"""
	with get_pg_connection() as conn:
		with conn.cursor() as cursor:
			try:
				cursor.execute(query, (email, password_hash, location))
				row = cursor.fetchone()
			except psycopg2.IntegrityError:
				conn.rollback()
				raise ValueError("Email already registered")
		conn.commit()

	return {
		"id": row[0],
		"email": row[1],
		"location": row[2],
		"created_at": row[3].isoformat(),
	}


def _is_hashed(password: str) -> bool:
	return password.startswith("scrypt:") or password.startswith("pbkdf2:")


def login_user(email: str, password: str) -> Optional[Dict]:
	query = """
	SELECT id, email, password, location, created_at
	FROM public.users
	WHERE email = %s;
	"""
	with get_pg_connection() as conn:
		with conn.cursor() as cursor:
			cursor.execute(query, (email,))
			row = cursor.fetchone()

			if not row:
				return None

			user_id, _, stored_password, location, created_at = row
			valid = False
			if _is_hashed(stored_password):
				valid = check_password_hash(stored_password, password)
			else:
				valid = stored_password == password
				if valid:
					_hash = generate_password_hash(password, method="scrypt")
					cursor.execute(
						"UPDATE public.users SET password = %s WHERE id = %s",
						(_hash, user_id),
					)
					conn.commit()

			if not valid:
				return None

			return {
				"id": user_id,
				"email": row[1],
				"location": location,
				"created_at": created_at.isoformat(),
			}


def update_user_location(user_id: int, location: str) -> Optional[Dict]:
	"""Update user location and return updated user data."""
	query = """
	UPDATE public.users SET location = %s WHERE id = %s
	RETURNING id, email, location, created_at;
	"""
	with get_pg_connection() as conn:
		with conn.cursor() as cursor:
			cursor.execute(query, (location.strip(), user_id))
			row = cursor.fetchone()
		conn.commit()

	if not row:
		return None

	return {
		"id": row[0],
		"email": row[1],
		"location": row[2],
		"created_at": row[3].isoformat(),
	}


def get_user_by_email(email: str) -> Optional[Dict]:
	query = """
	SELECT id, email, location, created_at
	FROM public.users
	WHERE email = %s;
	"""
	with get_pg_connection() as conn:
		with conn.cursor() as cursor:
			cursor.execute(query, (email,))
			row = cursor.fetchone()

	if not row:
		return None

	return {
		"id": row[0],
		"email": row[1],
		"location": row[2],
		"created_at": row[3].isoformat(),
	}


def get_all_users() -> List[Dict]:
	query = """
	SELECT id, email, location, created_at
	FROM public.users
	ORDER BY id ASC;
	"""

	with get_pg_connection() as conn:
		with conn.cursor() as cursor:
			cursor.execute(query)
			rows = cursor.fetchall()

	return [
		{
			"id": row[0],
			"email": row[1],
			"location": row[2],
			"created_at": row[3].isoformat(),
		}
		for row in rows
	]



def insert_weather_log(temp: float, humidity: float, pressure: float, wind: float, location: str) -> Dict:
	query = """
	INSERT INTO public.weather_logs (temp, humidity, pressure, wind, location)
	VALUES (%s, %s, %s, %s, %s)
	RETURNING id, temp, humidity, pressure, wind, location, timestamp;
	"""
	with get_pg_connection() as conn:
		with conn.cursor() as cursor:
			cursor.execute(query, (temp, humidity, pressure, wind, location))
			row = cursor.fetchone()
		conn.commit()

	return {
		"id": row[0],
		"temp": row[1],
		"humidity": row[2],
		"pressure": row[3],
		"wind": row[4],
		"location": row[5],
		"timestamp": row[6].isoformat(),
	}


def insert_alert(message: str, location: str, user_id: Optional[int] = None) -> Dict:
	query = """
	INSERT INTO public.alerts (user_id, message, location)
	VALUES (%s, %s, %s)
	RETURNING id, user_id, message, location, timestamp;
	"""
	with get_pg_connection() as conn:
		with conn.cursor() as cursor:
			cursor.execute(query, (user_id, message, location))
			row = cursor.fetchone()
		conn.commit()

	return {
		"id": row[0],
		"user_id": row[1],
		"message": row[2],
		"location": row[3],
		"timestamp": row[4].isoformat(),
	}


def get_recent_weather(limit: int = 20, location: Optional[str] = None) -> List[Dict]:
	if location:
		query = """
		SELECT id, temp, humidity, pressure, wind, location, timestamp
		FROM public.weather_logs
		WHERE LOWER(location) = LOWER(%s)
		   OR LOWER(split_part(location, ',', 1)) = LOWER(split_part(%s, ',', 1))
		ORDER BY timestamp DESC
		LIMIT %s;
		"""
		params = (location, location, limit)
	else:
		query = """
		SELECT id, temp, humidity, pressure, wind, location, timestamp
		FROM public.weather_logs
		ORDER BY timestamp DESC
		LIMIT %s;
		"""
		params = (limit,)

	with get_pg_connection() as conn:
		with conn.cursor() as cursor:
			cursor.execute(query, params)
			rows = cursor.fetchall()

	return [
		{
			"id": row[0],
			"temp": row[1],
			"humidity": row[2],
			"pressure": row[3],
			"wind": row[4],
			"location": row[5],
			"timestamp": row[6].isoformat(),
		}
		for row in rows
	]


def _infer_alert_severity(message: str) -> str:
	text = str(message or "").strip().lower()
	if any(token in text for token in ("storm", "cyclone", "extreme", "high", "very low", "unusual")):
		return "High"
	if any(token in text for token in ("medium", "moderate", "risk", "humid", "dry")):
		return "Medium"
	return "Low"


def get_recent_alerts(limit: int = 20, location: Optional[str] = None) -> List[Dict]:
	if location:
		query = """
		SELECT id, user_id, message, location, timestamp
		FROM public.alerts
		WHERE LOWER(location) = LOWER(%s)
		   OR LOWER(split_part(location, ',', 1)) = LOWER(split_part(%s, ',', 1))
		ORDER BY timestamp DESC
		LIMIT %s;
		"""
		params = (location, location, limit)
	else:
		query = """
		SELECT id, user_id, message, location, timestamp
		FROM public.alerts
		ORDER BY timestamp DESC
		LIMIT %s;
		"""
		params = (limit,)

	with get_pg_connection() as conn:
		with conn.cursor() as cursor:
			cursor.execute(query, params)
			rows = cursor.fetchall()

	return [
		{
			"id": row[0],
			"user_id": row[1],
			"message": row[2],
			"location": row[3],
			"timestamp": row[4].isoformat(),
			"severity": _infer_alert_severity(str(row[2] or "")),
		}
		for row in rows
	]
