from flask import Flask, jsonify
from flask_cors import CORS

from backend.data_storage import init_tables
from backend.routes import api_bp
from database.queries import check_connections

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"], supports_credentials=True)
app.register_blueprint(api_bp)

init_tables()


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
