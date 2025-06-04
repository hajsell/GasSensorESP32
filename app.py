import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template, jsonify, send_from_directory
from flask_socketio import SocketIO
import paho.mqtt.client as mqtt
import json
import os
from datetime import datetime, timedelta
import threading
import time

# --- Konfiguracja ---
MQTT_BROKER = "broker.hivemq.com"
MQTT_TOPIC = "home/sensors/all"
DATA_FILE = "data.json"

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

# --- Globalne ---
last_saved_data = None
last_saved_time = None

# --- Flask routes ---
@app.route('/')
def index():
    return render_template("dashboard.html")

@app.route('/data')
def get_data():
    if not os.path.exists(DATA_FILE):
        return jsonify([])
    try:
        with open(DATA_FILE, "r") as f:
            content = f.read().strip()
            return jsonify(json.loads(content) if content else [])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Usuwanie starych danych ---
def remove_old_data():
    while True:
        time.sleep(60)
        if not os.path.exists(DATA_FILE):
            continue
        try:
            with open(DATA_FILE, "r") as f:
                data = json.load(f)
            cutoff = datetime.now() - timedelta(hours=24)
            new_data = [entry for entry in data if datetime.strptime(entry["timestamp"], "%Y-%m-%d %H:%M:%S") > cutoff]
            with open(DATA_FILE, "w") as f:
                json.dump(new_data, f, indent=2)
        except Exception as e:
            print(f"[Błąd czyszczenia danych] {e}")

threading.Thread(target=remove_old_data, daemon=True).start()

# --- Funkcja zapisu warunkowego ---
def should_save(new, last, last_time):
    if last_time is None:
        return True
    dt_new = datetime.strptime(new["timestamp"], "%Y-%m-%d %H:%M:%S")
    if (dt_new - last_time).total_seconds() >= 300:
        return True
    if abs(new["temperature"] - last["temperature"]) > 1:
        return True
    if abs(new["humidity"] - last["humidity"]) > 20:
        return True
    if abs(new["mq2"] - last["mq2"]) > 1000 or abs(new["mq7"] - last["mq7"]) > 1000:
        return True
    return False

# --- MQTT obsługa ---
def on_connect(client, userdata, flags, rc):
    print("Połączono z MQTT, kod:", rc)
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    global last_saved_data, last_saved_time
    try:
        payload = msg.payload.decode()
        data = json.loads(payload)

        # Emituj dane przez WebSocket
        socketio.emit("new_data", data)

        # Zapisz, jeśli warto
        if should_save(data, last_saved_data, last_saved_time):
            existing = []
            if os.path.exists(DATA_FILE):
                try:
                    with open(DATA_FILE, "r") as f:
                        content = f.read().strip()
                        if content:
                            existing = json.loads(content)
                except:
                    pass
            existing.append(data)
            with open(DATA_FILE, "w") as f:
                json.dump(existing, f, indent=2)

            socketio.emit('data_saved')
            last_saved_data = data
            last_saved_time = datetime.strptime(data["timestamp"], "%Y-%m-%d %H:%M:%S")
            print(f"[Zapisano] {data}")
        else:
            print(f"[Pominięto] {data}")

    except Exception as e:
        print(f"[Błąd MQTT] {e}")

# --- Uruchom MQTT ---
def start_mqtt():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, 1883, 60)
    client.loop_forever()

threading.Thread(target=start_mqtt, daemon=True).start()

# --- Start serwera ---
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
