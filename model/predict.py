from __future__ import annotations

import os
from typing import Iterable, List, Sequence

import joblib

from config import MODEL_PATH


def model_exists() -> bool:
	return os.path.exists(MODEL_PATH)


def _normalize_prediction(value: int) -> int:
	# Keep public convention: -1 means anomaly, 1 means normal.
	if value in (-1, 1):
		return int(value)
	return -1 if int(value) == 1 else 1


def ml_predict(new_data: Sequence[float]) -> int:
	if not model_exists():
		return 1

	model = joblib.load(MODEL_PATH)
	result = model.predict([list(new_data)])
	return _normalize_prediction(int(result[0]))


def ml_predict_batch(batch_data: Iterable[Sequence[float]]) -> List[int]:
	if not model_exists():
		return []

	rows = [list(row) for row in batch_data]
	if not rows:
		return []

	model = joblib.load(MODEL_PATH)
	results = model.predict(rows)
	return [_normalize_prediction(int(item)) for item in results]
