from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

import os
import random
import time
import pickle
import sqlite3
import threading
import warnings
import numpy as np


app = Flask(__name__)
CORS(app)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = BASE_DIR


# database lives in your user folder, outside the project,
# so Live Server never sees it change (this stops the page reloading)
DB_PATH = os.path.join(os.path.expanduser("~"), "twin.db")

TICK_SECONDS = 2.0              # how often the simulated sensors update
data_lock = threading.RLock()   # protects sensor_data / stabilizer state
db_lock = threading.Lock()      # serializes SQLite writes


# ============================================================
# LOAD TRAINED MODEL
# ============================================================

# MUST match the feature columns and order used in train_model.py
FEATURES = ["co2", "temperature", "humidity", "airQuality"]

# Only used if your model predicts numbers instead of text labels
INT_LABELS = {0: "NORMAL", 1: "MEDIUM", 2: "HIGH"}


def find_model():
    for folder in (BASE_DIR, os.path.dirname(BASE_DIR), os.getcwd()):
        path = os.path.join(folder, "decision_tree_model.pkl")
        if os.path.exists(path):
            return path
    return None


model = None
model_path = find_model()

if model_path:
    try:
        try:
            with open(model_path, "rb") as f:
                model = pickle.load(f)
        except Exception:
            # file may have been saved with joblib instead of pickle
            import joblib
            model = joblib.load(model_path)
        print("Model loaded:", type(model).__name__, "| classes:", model.classes_)
    except Exception as e:
        model = None
        print("Model load failed, using rule-based fallback:", e)
else:
    print("decision_tree_model.pkl not found, using rule-based fallback")


# ============================================================
# DATABASE (SQLite)
# ============================================================

def connect():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def query(sql, args=(), write=False):
    if write:
        with db_lock:
            conn = connect()
            try:
                conn.execute(sql, args)
                conn.commit()
                return []
            finally:
                conn.close()

    conn = connect()
    try:
        return conn.execute(sql, args).fetchall()
    finally:
        conn.close()


def safe_write(sql, args=()):
    """Write that never raises, so a DB problem cannot break the live feed."""
    try:
        query(sql, args, write=True)
    except Exception as e:
        print("DB write skipped:", e)


def init_db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
    except Exception as e:
        print("WAL mode not enabled:", e)

    conn.executescript("""
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts REAL NOT NULL,
            co2 REAL,
            temperature REAL,
            humidity REAL,
            air_quality REAL,
            fan REAL,
            prediction TEXT,
            confidence REAL
        );

        CREATE INDEX IF NOT EXISTS idx_readings_ts ON readings(ts);

        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts REAL NOT NULL,
            severity TEXT NOT NULL,
            prediction TEXT,
            co2 REAL,
            temperature REAL,
            confidence REAL,
            message TEXT
        );
    """)
    conn.commit()
    conn.close()


init_db()

reading_counter = 0


def save_reading():
    global reading_counter

    d = sensor_data

    safe_write(
        """INSERT INTO readings
           (ts, co2, temperature, humidity, air_quality, fan, prediction, confidence)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (d["timestamp"], d["co2"], d["temperature"], d["humidity"],
         d["airQuality"], d["fan"], d["prediction"], d["confidence"])
    )

    # keep only the last 24 hours of readings
    reading_counter += 1
    if reading_counter % 500 == 0:
        safe_write("DELETE FROM readings WHERE ts < ?", (time.time() - 86400,))


# ============================================================
# ALERT LOGIC
# ============================================================

SEVERITY = {"HIGH": "CRITICAL", "MEDIUM": "WARNING", "NORMAL": "INFO"}

MESSAGES = {
    "HIGH": "High CO2 condition. Increase fan speed and monitor the capture unit.",
    "MEDIUM": "CO2 level moderately elevated. Monitor absorber efficiency.",
    "NORMAL": "System returned to normal operation.",
}

alert_state = {"current": None}


def log_alert(prev, label):
    d = sensor_data

    safe_write(
        """INSERT INTO alerts
           (ts, severity, prediction, co2, temperature, confidence, message)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (time.time(), SEVERITY[label], label, d["co2"], d["temperature"],
         d["confidence"], f"{prev} -> {label}: {MESSAGES[label]}")
    )


def track_state(label):
    # label is already stabilized, so log a change as soon as it happens
    prev = alert_state["current"]

    if prev is None:
        alert_state["current"] = label
        return

    if label != prev:
        alert_state["current"] = label
        log_alert(prev, label)


def log_event(severity, message):
    with data_lock:
        d = dict(sensor_data)

    safe_write(
        """INSERT INTO alerts
           (ts, severity, prediction, co2, temperature, confidence, message)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (time.time(), severity, d["prediction"], d["co2"], d["temperature"],
         d["confidence"], message)
    )


# ============================================================
# OPERATOR CONTROL STATE
# ============================================================

control_state = {
    "mode": "auto",        # "auto" = TinyML decides fan, "manual" = operator decides
    "manualFan": 50.0,
    "simTarget": None      # None = natural drift, number = push CO2 toward it
}


# ============================================================
# SENSOR STATE
# ============================================================

sensor_data = {
    "co2": 420.0,
    "temperature": 30.0,
    "humidity": 80.0,
    "airQuality": 3.2,
    "fan": 40.0,
    "prediction": "NORMAL",
    "rawPrediction": "NORMAL",
    "confidence": 0.0,
    "captureEfficiency": 95.0,
    "systemHealth": "Excellent",
    "plantStatus": "Online",
    "fanMode": "AUTO",
    "simulating": False,
    "timestamp": time.time()
}

# momentum for smooth random walks (keeps values gliding, not jumping)
velocity = {"co2": 0.0, "temperature": 0.0, "humidity": 0.0, "airQuality": 0.0}

STATE_ACTIONS = {
    "NORMAL": {"fan": 40, "captureEfficiency": 95, "systemHealth": "Excellent"},
    "MEDIUM": {"fan": 70, "captureEfficiency": 88, "systemHealth": "Good"},
    "HIGH":   {"fan": 95, "captureEfficiency": 72, "systemHealth": "Needs Attention"},
}


def rule_based(co2):
    if co2 < 470:
        return "NORMAL"
    elif co2 < 680:
        return "MEDIUM"
    return "HIGH"


# ============================================================
# STATE STABILIZER (prevents flicker near thresholds)
# ============================================================

DISPLAY_CONFIRM = 3     # a new state must appear this many readings in a row
MIN_HOLD_SECONDS = 8    # a shown state stays at least this long

display_state = {"current": None, "candidate": None, "count": 0, "since": 0.0}


def stabilize(raw):
    s = display_state
    now = time.time()

    if s["current"] is None:
        s["current"] = raw
        s["since"] = now
        return raw

    if raw == s["current"]:
        s["candidate"] = None
        s["count"] = 0
        return raw

    if raw == s["candidate"]:
        s["count"] += 1
    else:
        s["candidate"] = raw
        s["count"] = 1

    held_long_enough = (now - s["since"]) >= MIN_HOLD_SECONDS

    if s["count"] >= DISPLAY_CONFIRM and held_long_enough:
        s["current"] = raw
        s["since"] = now
        s["candidate"] = None
        s["count"] = 0

    return s["current"]


# ============================================================
# MODEL HELPERS
# ============================================================

def find_file(name):
    for folder in (BASE_DIR, os.path.dirname(BASE_DIR), os.getcwd()):
        path = os.path.join(folder, name)
        if os.path.exists(path):
            return path
    return None


def label_of(value):
    if isinstance(value, (int, np.integer)):
        return INT_LABELS.get(int(value), str(value))
    return str(value).strip().upper()


# ============================================================
# UPDATE SENSOR DATA
# ============================================================

def walk(key, step, lo, hi, pull=0.0, target=None):
    """Smooth random walk with momentum; bounces softly off the limits."""
    v = velocity[key] * 0.85 + random.uniform(-step, step)
    if target is not None:
        v += (target - sensor_data[key]) * pull
    velocity[key] = v

    value = sensor_data[key] + v

    if value < lo:
        value = lo
        velocity[key] = abs(velocity[key]) * 0.5
    elif value > hi:
        value = hi
        velocity[key] = -abs(velocity[key]) * 0.5

    sensor_data[key] = value


def update_sensor_data():

    if control_state["simTarget"] is not None:
        # what-if simulation: CO2 glides toward the operator's target
        walk("co2", 2.0, 300, 900, pull=0.12, target=control_state["simTarget"])
    else:
        walk("co2", 2.5, 300, 900)

    walk("temperature", 0.06, 24, 45)
    walk("humidity", 0.2, 40, 95)
    walk("airQuality", 0.02, 0.5, 6.5)

    # PREDICTION (TinyML model, rule-based fallback)

    proba = None

    if model is not None:
        x = np.array([[sensor_data[k] for k in FEATURES]])

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            pred = model.predict(x)[0]
            proba = model.predict_proba(x)[0]

        raw_label = label_of(pred)
        if raw_label not in STATE_ACTIONS:
            raw_label = rule_based(sensor_data["co2"])
    else:
        raw_label = rule_based(sensor_data["co2"])

    previous_label = sensor_data.get("prediction")
    label = stabilize(raw_label)

    if proba is not None:
        names = [label_of(c) for c in model.classes_]
        conf = proba[names.index(label)] if label in names else np.max(proba)
        new_conf = float(conf) * 100

        # light smoothing while the state is unchanged
        if label == previous_label and sensor_data["confidence"] > 0:
            new_conf = sensor_data["confidence"] * 0.6 + new_conf * 0.4

        sensor_data["confidence"] = round(new_conf, 1)
    else:
        sensor_data["confidence"] = 0.0

    sensor_data["rawPrediction"] = raw_label
    sensor_data["prediction"] = label
    sensor_data.update(STATE_ACTIONS[label])

    # MANUAL FAN OVERRIDE
    if control_state["mode"] == "manual":
        fan = control_state["manualFan"]
        recommended = STATE_ACTIONS[label]["fan"]
        shortfall = max(0, recommended - fan)
        efficiency = max(40, STATE_ACTIONS[label]["captureEfficiency"] - shortfall * 0.4)

        sensor_data["fan"] = fan
        sensor_data["captureEfficiency"] = round(efficiency, 1)
        sensor_data["systemHealth"] = (
            "Needs Attention" if efficiency < 75
            else "Good" if efficiency < 90
            else "Excellent"
        )

    sensor_data["fanMode"] = control_state["mode"].upper()
    sensor_data["simulating"] = control_state["simTarget"] is not None
    sensor_data["timestamp"] = time.time()

    # PERSIST + ALERTS
    save_reading()
    track_state(label)


def sensor_loop():
    """Updates sensors on a fixed clock, independent of how many clients poll."""
    while True:
        try:
            with data_lock:
                update_sensor_data()
        except Exception as e:
            print("Sensor loop error:", e)
        time.sleep(TICK_SECONDS)


_loop_started = False


def start_sensor_loop():
    global _loop_started
    if _loop_started:
        return
    _loop_started = True

    # first reading immediately so the first request has real values
    with data_lock:
        update_sensor_data()

    threading.Thread(target=sensor_loop, daemon=True).start()


# ============================================================
# MODEL INFO
# ============================================================

def evaluate_model(names):
    csv_path = find_file("carbon_datasetori.csv")
    if not csv_path:
        return None

    try:
        import pandas as pd
        from sklearn.metrics import accuracy_score, confusion_matrix

        df = pd.read_csv(csv_path)

        def norm(text):
            return str(text).lower().replace(" ", "").replace("_", "")

        lookup = {norm(c): c for c in df.columns}

        cols = []
        for n in names:
            if norm(n) not in lookup:
                return {"error": f"CSV column for feature '{n}' not found. CSV columns: {list(df.columns)}"}
            cols.append(lookup[norm(n)])

        class_labels = [label_of(c) for c in model.classes_]

        label_col = None
        for c in df.columns:
            if c in cols:
                continue
            values = set(str(v).strip().upper() for v in df[c].dropna().unique())
            if values and values <= set(class_labels):
                label_col = c
                break

        if label_col is None:
            return {"error": f"Could not find a label column matching classes {class_labels}"}

        data = df[cols + [label_col]].dropna()
        X = data[cols].astype(float).values
        y = data[label_col].astype(str).str.strip().str.upper().tolist()

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            pred = [label_of(p) for p in model.predict(X)]

        matrix = confusion_matrix(y, pred, labels=class_labels)

        return {
            "accuracy": round(float(accuracy_score(y, pred)) * 100, 1),
            "samples": int(len(y)),
            "labels": class_labels,
            "matrix": matrix.tolist(),
            "label_column": str(label_col),
        }

    except Exception as e:
        return {"error": f"Evaluation failed: {e}"}


def build_model_info():
    info = {"available": model is not None}

    if model is None:
        return info

    info["algorithm"] = type(model).__name__
    info["classes"] = [label_of(c) for c in model.classes_]

    importances = getattr(model, "feature_importances_", None)
    names = list(getattr(model, "feature_names_in_", FEATURES))

    if importances is not None:
        if len(names) != len(importances):
            names = [f"feature_{i}" for i in range(len(importances))]
        info["features"] = [
            {"name": str(n), "importance": round(float(v) * 100, 1)}
            for n, v in zip(names, importances)
        ]

    if hasattr(model, "get_depth"):
        info["depth"] = int(model.get_depth())
        info["leaves"] = int(model.get_n_leaves())

    files = {}
    for fname in ("decision_tree_model.pkl", "carbon_capture_model.tflite", "model.h"):
        path = find_file(fname)
        if path:
            files[fname] = round(os.path.getsize(path) / 1024, 1)
    info["files_kb"] = files

    notes_path = find_file("model_info.txt")
    if notes_path:
        with open(notes_path, encoding="utf-8", errors="ignore") as f:
            info["notes"] = f.read()[:3000]

    info["evaluation"] = evaluate_model([str(n) for n in names])

    return info


model_info_cache = None


# ============================================================
# API ROUTES
# ============================================================

@app.after_request
def no_store_for_api(response):
    # API data must never come from the browser cache
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.route("/api/sensor", methods=["GET"])
def get_sensor_data():
    # read-only: the background thread produces the data
    with data_lock:
        snapshot = dict(sensor_data)
    return jsonify(snapshot)


@app.route("/api/history", methods=["GET"])
def get_history():
    minutes = max(1, min(request.args.get("minutes", 30, type=int), 1440))
    since = time.time() - minutes * 60

    try:
        rows = query(
            """SELECT ts, co2, temperature, humidity, air_quality
               FROM readings WHERE ts >= ? ORDER BY ts""",
            (since,)
        )
    except Exception as e:
        print("History read failed:", e)
        rows = []

    return jsonify([
        {
            "t": r["ts"] * 1000,
            "co2": r["co2"],
            "temperature": r["temperature"],
            "humidity": r["humidity"],
            "airQuality": r["air_quality"],
        }
        for r in rows
    ])


@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    limit = max(1, min(request.args.get("limit", 100, type=int), 500))
    severity = request.args.get("severity", "ALL").upper()

    counts = {"CRITICAL": 0, "WARNING": 0, "INFO": 0}

    try:
        if severity in ("CRITICAL", "WARNING", "INFO"):
            rows = query(
                "SELECT * FROM alerts WHERE severity = ? ORDER BY id DESC LIMIT ?",
                (severity, limit)
            )
        else:
            rows = query("SELECT * FROM alerts ORDER BY id DESC LIMIT ?", (limit,))

        for r in query("SELECT severity, COUNT(*) AS n FROM alerts GROUP BY severity"):
            counts[r["severity"]] = r["n"]
    except Exception as e:
        print("Alerts read failed:", e)
        rows = []

    return jsonify({
        "alerts": [dict(r) for r in rows],
        "counts": counts
    })


@app.route("/api/alerts/clear", methods=["POST"])
def clear_alerts():
    safe_write("DELETE FROM alerts")
    return jsonify({"status": "cleared"})


@app.route("/api/model", methods=["GET"])
def get_model_info():
    global model_info_cache
    if model_info_cache is None:
        model_info_cache = build_model_info()
    return jsonify(model_info_cache)


@app.route("/api/control", methods=["GET"])
def get_control():
    return jsonify(control_state)


@app.route("/api/control", methods=["POST"])
def set_control():
    data = request.get_json(silent=True) or {}

    if "mode" in data:
        mode = str(data["mode"]).lower()
        if mode in ("auto", "manual") and mode != control_state["mode"]:
            control_state["mode"] = mode
            log_event("INFO", f"Operator switched fan control to {mode.upper()}.")

    if "manualFan" in data:
        try:
            control_state["manualFan"] = max(0.0, min(100.0, float(data["manualFan"])))
        except (TypeError, ValueError):
            pass

    if "simTarget" in data:
        target = data["simTarget"]
        if target is None:
            if control_state["simTarget"] is not None:
                log_event("INFO", "Simulation stopped. Sensors drifting naturally.")
            control_state["simTarget"] = None
        else:
            try:
                control_state["simTarget"] = max(300.0, min(900.0, float(target)))
                log_event("INFO", f"Simulation started. CO2 target {round(control_state['simTarget'])} ppm.")
            except (TypeError, ValueError):
                pass

    return jsonify(control_state)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "message": "Carbon Capture Backend Running"
    })


# ============================================================
# DASHBOARD (optional: also served at http://127.0.0.1:5000/)
# ============================================================

def serve_frontend(filename):
    response = send_from_directory(FRONTEND_DIR, filename)
    response.headers["Cache-Control"] = "no-cache"
    return response


@app.route("/")
def home():
    return serve_frontend("index.html")


@app.route("/<path:filename>")
def site_files(filename):
    return serve_frontend(filename)


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    print("\n==============================================")
    print(" TinyML Carbon Capture Digital Twin Backend")
    print("==============================================\n")
    print("Dashboard  : http://127.0.0.1:5000/")
    print("Sensor API : http://127.0.0.1:5000/api/sensor")
    print("History API: http://127.0.0.1:5000/api/history")
    print("Alerts API : http://127.0.0.1:5000/api/alerts")
    print("Model API  : http://127.0.0.1:5000/api/model")
    print("Control API: http://127.0.0.1:5000/api/control")
    print("Database   :", DB_PATH)
    print("Frontend   :", FRONTEND_DIR)
    print("index.html found:", os.path.exists(os.path.join(FRONTEND_DIR, "index.html")), "\n")

    start_sensor_loop()

    # reloader off: it restarts the server on file changes and drops requests
    app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False, threaded=True)
