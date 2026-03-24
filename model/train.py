from __future__ import annotations

import os
from typing import Iterable, Sequence

import joblib
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler

from config import MODEL_PATH
from utils.anomaly_rules import is_threshold_anomaly


def train_model(data: Iterable[Sequence[float]], contamination: float = 0.015) -> str:
	_ = contamination
	rows = list(data)
	if not rows:
		raise ValueError("No training data provided")

	labels = [
		1 if is_threshold_anomaly(temp=row[0], humidity=row[1], pressure=row[2], wind_ms=row[3]) else 0
		for row in rows
	]

	if len(set(labels)) < 2:
		model = DummyClassifier(strategy="constant", constant=labels[0])
		model.fit(rows, labels)
		trained = model
	else:
		trained = Pipeline(
			steps=[
				("scaler", RobustScaler()),
				(
					"rf",
					RandomForestClassifier(
						n_estimators=300,
						max_depth=10,
						min_samples_leaf=2,
						random_state=42,
					),
				),
			]
		)
		trained.fit(rows, labels)

	os.makedirs(os.path.dirname(MODEL_PATH) or ".", exist_ok=True)
	joblib.dump(trained, MODEL_PATH)
	return MODEL_PATH
