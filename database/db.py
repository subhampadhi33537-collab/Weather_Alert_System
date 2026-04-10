from __future__ import annotations

from typing import Optional, Tuple

import psycopg2
from psycopg2.extensions import connection as PGConnection

try:
	from supabase import Client, create_client
except Exception:
	Client = object
	create_client = None

from config import DATABASE_URL, DB_SSLMODE, SUPABASE_KEY, SUPABASE_URL


def get_pg_connection() -> PGConnection:
	if not DATABASE_URL:
		raise ValueError("DATABASE_URL environment variable is not set")
	return psycopg2.connect(DATABASE_URL, connect_timeout=10, sslmode=DB_SSLMODE)


def get_supabase_client() -> Optional[Client]:
	if not SUPABASE_URL or not SUPABASE_KEY or create_client is None:
		return None
	return create_client(SUPABASE_URL, SUPABASE_KEY)


def test_postgres_connection() -> Tuple[bool, str]:
	try:
		with get_pg_connection() as conn:
			with conn.cursor() as cursor:
				cursor.execute("SELECT 1;")
				cursor.fetchone()
		return True, "PostgreSQL connection successful"
	except Exception as exc:
		return False, f"PostgreSQL connection failed: {exc}"


def test_supabase_connection(table_name: str = "users") -> Tuple[bool, str]:
	supabase = get_supabase_client()
	if not supabase:
		return True, "Supabase not configured (skipped)"
	try:
		supabase.table(table_name).select("id").limit(1).execute()
		return True, "Supabase connection successful"
	except Exception as exc:
		error_text = str(exc)
		if "PGRST205" in error_text or "does not exist" in error_text.lower():
			return True, "Supabase reachable"
		return False, f"Supabase query failed: {exc}"
