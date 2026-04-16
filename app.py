import os
import re

from flask import Flask, jsonify
from flask_cors import CORS

from backend.data_storage import init_tables
from backend.routes import api_bp
from database.queries import check_connections

app = Flask(__name__)


def _origin_rule(value: str):
	origin = str(value or "").strip()
	if not origin:
		return None
	if origin.startswith("^"):
		return re.compile(origin)
	if "*" in origin:
		escaped = re.escape(origin).replace(r"\*", r"[^/]+")
		return re.compile(f"^{escaped}$")
	return origin


def _cors_origins():
	raw = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
	if raw:
		candidates = [part.strip() for part in raw.split(",") if part.strip()]
	else:
		candidates = [
			"http://localhost:3000",
			"http://127.0.0.1:3000",
			"http://localhost:5173",
			"http://127.0.0.1:5173",
			"https://*.vercel.app",
		]

	resolved = []
	for item in candidates:
		rule = _origin_rule(item)
		if rule is not None:
			resolved.append(rule)
	return resolved


CORS(
	app,
	origins=_cors_origins(),
	supports_credentials=False,
	allow_headers=["Content-Type", "Authorization"],
	methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
app.register_blueprint(api_bp)

try:
	init_tables()
except Exception as e:
	print(f"Warning: Failed to initialize tables on startup: {e}")


@app.route("/")
def index():
	return jsonify({"message": "Smart Farmer Weather + Anomaly Alert Backend"}), 200


@app.route("/health")
def health():
	pg_status, supabase_status = check_connections()
	overall_ok = pg_status[0] and supabase_status[0]
	status_code = 200 if overall_ok else 500

	return (
		jsonify(
			{
				"postgres": {"ok": pg_status[0], "message": pg_status[1]},
				"supabase": {"ok": supabase_status[0], "message": supabase_status[1]},
			}
		),
		status_code,
	)


if __name__ == "__main__":
	app.run(host="127.0.0.1", port=5000, debug=True)
