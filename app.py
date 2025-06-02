from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

# Przechowywanie ostatnich danych
last_data = {"temperature": None, "humidity": None}

@app.route('/')
def dashboard():
    return render_template('dashboard.html')

@app.route('/data', methods=['GET', 'POST'])
def data():
    global last_data
    if request.method == 'POST':
        last_data = request.get_json()
        return "OK", 200
    else:
        return jsonify(last_data)

if __name__ == '__main__':
    app.run(debug=True)
