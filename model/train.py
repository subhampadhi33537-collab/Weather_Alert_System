from __future__ import annotations

import os
from typing import Iterable, Sequence

import joblib
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler

from config import MODEL_PATH


def train_model(data: Iterable[Sequence[float]], contamination: float = 0.015) -> str:
	rows = list(data)
	if not rows:
		raise ValueError("No training data provided")

	model = Pipeline(
		steps=[
			("scaler", RobustScaler()),
			(
				"iforest",
				IsolationForest(
					contamination=contamination,
					n_estimators=400,
					bootstrap=True,
					random_state=42,
				),
			),
		]
	)
	model.fit(rows)

	os.makedirs(os.path.dirname(MODEL_PATH) or ".", exist_ok=True)
	joblib.dump(model, MODEL_PATH)
	return MODEL_PATH
