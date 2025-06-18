import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template, jsonify, send_from_directory
from flask_socketio import SocketIO
import paho.mqtt.client as mqtt
import json
import os
from datetime import datetime, timedelta
import threading
import smtplib
from email.mime.text import MIMEText

# --- Konfiguracja ---
MQTT_BROKER = "7d195151bce44ede9285bd5b8dcc8abe.s1.eu.hivemq.cloud"
MQTT_PORT = 8883
MQTT_TOPIC = "home/sensors/all"
CLIENT_ID = "clientId-CMkPtKbWUjfe"
CLIENT_USERNAME = "serwer"
CLIENT_PASSWORD = "Paluszki1"

DATA_FILE = "data.json"

# --- Konfiguracja email ---
EMAIL_SENDER = ""
EMAIL_PASSWORD = ""
EMAIL_RECIPIENT = ""

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

# --- Funkcja wysyłki e-mail ---
def send_email_alert(subject, body):
    def _send():
        try:
            msg = MIMEText(body)
            msg["Subject"] = subject
            msg["From"] = EMAIL_SENDER
            msg["To"] = EMAIL_RECIPIENT

            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(EMAIL_SENDER, EMAIL_PASSWORD)
                server.sendmail(EMAIL_SENDER, EMAIL_RECIPIENT, msg.as_string())
            print("[EMAIL] Wysłano alert!")
        except Exception as e:
            print(f"[EMAIL Błąd] {e}")

    threading.Thread(target=_send).start()


# --- MQTT obsługa ---
def on_connect(client, userdata, flags, rc):
    result, mid = client.subscribe("home/sensors/all")


def on_message(client, userdata, msg):
    global last_saved_data, last_saved_time
    try:
        payload = msg.payload.decode()
        data = json.loads(payload)

        # Emituj dane przez WebSocket
        socketio.emit("new_data", data)

        # Sprawdź gwałtowną zmianę MQ2/MQ7 i wyślij alert
        if last_saved_data:
            mq2_diff = abs(data["mq2"] - last_saved_data["mq2"])
            mq7_diff = abs(data["mq7"] - last_saved_data["mq7"])
            if data["mq2"] > 3000 or data["mq7"] > 3000:
                body = (
                    f"Wykryto gwałtowną zmianę wartości MQ:\n"
                    f"MQ2: {last_saved_data['mq2']} → {data['mq2']} (Δ {mq2_diff})\n"
                    f"MQ7: {last_saved_data['mq7']} → {data['mq7']} (Δ {mq7_diff})\n"
                    f"Czas: {data['timestamp']}"
                )
                print("[EMAIL] Przygotowuję wiadomość...")
                send_email_alert("ALERT: Gwałtowna zmiana MQ2/MQ7", body)
                print("[EMAIL] Funkcja została wywołana.")

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
    client = mqtt.Client(client_id=CLIENT_ID)
    client.username_pw_set(CLIENT_USERNAME, CLIENT_PASSWORD)
    client.tls_set()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_forever()


threading.Thread(target=start_mqtt, daemon=True).start()

# --- Start serwera ---
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
