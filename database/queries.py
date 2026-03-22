from __future__ import annotations

from typing import Tuple

from database.db import test_postgres_connection, test_supabase_connection


def check_connections() -> Tuple[Tuple[bool, str], Tuple[bool, str]]:
	pg_status = test_postgres_connection()
	supabase_status = test_supabase_connection()
	return pg_status, supabase_status
