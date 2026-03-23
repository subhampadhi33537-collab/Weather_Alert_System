from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List


def _read_json_array(path: Path) -> List[Dict[str, Any]]:
	if not path.exists():
		return []

	text = path.read_text(encoding="utf-8").strip()
	if not text:
		return []

	try:
		payload = json.loads(text)
	except json.JSONDecodeError:
		return []

	if not isinstance(payload, list):
		return []

	return [item for item in payload if isinstance(item, dict)]


def append_json_record(file_path: str, record: Dict[str, Any], max_records: int | None = None) -> List[Dict[str, Any]]:
	path = Path(file_path)
	path.parent.mkdir(parents=True, exist_ok=True)

	rows = _read_json_array(path)
	rows.append(record)
	if isinstance(max_records, int) and max_records > 0 and len(rows) > max_records:
		rows = rows[-max_records:]

	path.write_text(json.dumps(rows, separators=(",", ":")), encoding="utf-8")
	return rows


def write_json_records(file_path: str, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
	path = Path(file_path)
	path.parent.mkdir(parents=True, exist_ok=True)

	rows = [item for item in records if isinstance(item, dict)]
	path.write_text(json.dumps(rows, separators=(",", ":")), encoding="utf-8")
	return rows


def read_json_records(file_path: str) -> List[Dict[str, Any]]:
	return _read_json_array(Path(file_path))
