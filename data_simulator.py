import requests
import random
import time
import json

# Adres API, np. lokalny Flask
API_URL = "http://localhost:5000/data"

def generate_fake_data():
    return {
        "temperature": round(random.uniform(20.0, 30.0), 2),
        "humidity": round(random.uniform(40.0, 60.0), 2)
    }

def send_data():
    data = generate_fake_data()
    try:
        response = requests.post(API_URL, json=data)
        if response.status_code == 200:
            print(f"[OK] Wysłano: {data}")
        else:
            print(f"[BŁĄD {response.status_code}] Odpowiedź: {response.text}")
    except Exception as e:
        print(f"[BŁĄD] Nie udało się wysłać danych: {e}")

if __name__ == "__main__":
    while True:
        send_data()
        time.sleep(5)  # co 5 sekund
