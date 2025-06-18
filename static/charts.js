// Zmienne wykresów
let tempChart, humidityChart, mq2Chart, mq7Chart;

// Aktualizuje wykres wilgotności na bieżaco co sekundę
function updateHumidityChart(humidity) {
  if (humidityChart) {
    humidityChart.data.datasets[0].data = [humidity, 100 - humidity];
    humidityChart.update();
  }
}

// Aktualizuje wykres temperatury po dodaniu nowej wartości do pliku data.json
function reloadTempChart() {
  fetch('/data')
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data)) return;

      if (tempChart) {
        tempChart.data.datasets[0].data = data.map(entry => ({
          x: entry.timestamp,
          y: entry.temperature
        }));
        tempChart.update();
      }
    });
}

// Aktualizuje wykresy gazowe po dodaniu nowej wartości do pliku data.json
function reloadGasCharts() {
  fetch('/data')
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data)) return;

      const mq2Data = data.map(entry => ({ x: entry.timestamp, y: entry.mq2 }));
      const mq7Data = data.map(entry => ({ x: entry.timestamp, y: entry.mq7 }));

      if (mq2Chart) {
        mq2Chart.data.datasets[0].data = mq2Data;
        mq2Chart.update();
      }

      if (mq7Chart) {
        mq7Chart.data.datasets[0].data = mq7Data;
        mq7Chart.update();
      }
    });
}

// Inicjalizacja wszystkich wykresów
function initCharts(data) {
  if (!Array.isArray(data)) return;

  const temperatures = data.map(entry => entry.temperature).filter(temp => typeof temp === "number");
  const maxTemp = Math.max(...temperatures);
  const minTemp = Math.min(...temperatures);

  // Ustaw wartości w DOM
  const maxEl = document.getElementById('temp-max');
  const minEl = document.getElementById('temp-min');
  if (maxEl) maxEl.textContent = `${maxTemp.toFixed(1)} °C`;
  if (minEl) minEl.textContent = `${minTemp.toFixed(1)} °C`;

  const humidities = data.map(entry => entry.humidity).filter(h => typeof h === "number");
  const maxHum = Math.max(...humidities);
  const minHum = Math.min(...humidities);

  // Ustaw w DOM
  const maxHumEl = document.getElementById('hum-max');
  const minHumEl = document.getElementById('hum-min');
  if (maxHumEl) maxHumEl.textContent = `${maxHum.toFixed(1)} %`;
  if (minHumEl) minHumEl.textContent = `${minHum.toFixed(1)} %`;

  const last = data[data.length - 1];
  initHumidityChart(last.humidity);
  initTempChart(data);
  initGasCharts(data);
}

// Inicjalizacja wykresu wilgotności
function initHumidityChart(humidity) {
  const humCtx = document.getElementById("humidityChart").getContext("2d");
  humidityChart = new Chart(humCtx, {
    type: "doughnut",
    data: {
      datasets: [{
        data: [humidity, 100 - humidity],
        backgroundColor: ["rgba(54, 162, 235, 0.7)", "rgba(200, 200, 200, 0.2)"],
        borderColor: ["rgba(54, 162, 235, 1)", "rgba(200, 200, 200, 0.3)"],
        borderWidth: 2
      }]
    },
    options: {
      cutout: "80%",
      plugins: {
        legend: {
          display: true,
          labels: { color: "#ffffff" }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.label || "Humidity"}: ${context.parsed.toFixed(1)}%`;
            }
          }
        }
      }
    }
  });
}

// Inicjalizacja wykresu temperatury
function initTempChart(data) {
  const ctx = document.getElementById('tempChart').getContext('2d');
  if (tempChart) tempChart.destroy();

  tempChart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [{
        label: "Temperature (°C)",
        data: data.map(entry => ({
          x: entry.timestamp,
          y: entry.temperature
        })),
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: "time",
          time: {
            parser: "yyyy-MM-dd HH:mm:ss",
            unit: "minute",
            displayFormats: {
              minute: "HH:mm"
            },
            tooltipFormat: "HH:mm"
          },
          ticks: {
            color: "#898d99",
            maxTicksLimit: 8,
            autoSkip: true,
            maxRotation: 0
          },
          grid: { display: false },
          title: {
            display: true,
            text: "Time",
            color: "#898d99"
          }
        },
        y: {
          title: {
            display: true,
            text: "Temperature (°C)",
            color: "#898d99"
          },
          ticks: { color: "#898d99" },
          grid: { color: "#898d99" }
        }
      },
      plugins: {
        legend: { labels: { color: "#898d99" } },
        tooltip: {
          bodyColor: "#ffffff",
          backgroundColor: "#1c202c"
        }
      }
    }
  });
}

// Inicjalizacja wykresów gazów
function initGasCharts(data) {
  const mq2Data = data.map(entry => ({ x: entry.timestamp, y: entry.mq2 }));
  const mq7Data = data.map(entry => ({ x: entry.timestamp, y: entry.mq7 }));

  // MQ-2
  const mq2Ctx = document.getElementById("mq2Chart").getContext("2d");
  mq2Chart = new Chart(mq2Ctx, {
    type: "line",
    data: {
      datasets: [{
        label: "MQ-2",
        data: mq2Data,
        borderColor: "#ff9f40",
        backgroundColor: "rgba(255, 159, 64, 0.2)",
        fill: true,
        tension: 0.4,
        pointRadius: 1
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: { labels: { color: "#ffffff" } }
      },
      scales: {
        x: {
          type: "time",
          time: {
            parser: "yyyy-MM-dd HH:mm:ss",
            unit: "minute",
            displayFormats: { minute: "HH:mm" },
            tooltipFormat: "HH:mm"
          },
          ticks: { color: "#ccc", maxTicksLimit: 8, maxRotation: 0, autoSkip: true },
          grid: { display: false }
        },
        y: {
          ticks: { color: "#ccc" },
          grid: { color: "#444" }
        }
      }
    }
  });

  // MQ-7
  const mq7Ctx = document.getElementById("mq7Chart").getContext("2d");
  mq7Chart = new Chart(mq7Ctx, {
    type: "line",
    data: {
      datasets: [{
        label: "MQ-7",
        data: mq7Data,
        borderColor: "#36a2eb",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        fill: true,
        tension: 0.4,
        pointRadius: 1
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: { labels: { color: "#ffffff" } }
      },
      scales: {
        x: {
          type: "time",
          time: {
            parser: "yyyy-MM-dd HH:mm:ss",
            unit: "minute",
            displayFormats: { minute: "HH:mm" },
            tooltipFormat: "HH:mm"
          },
          ticks: { color: "#ccc", maxTicksLimit: 8, maxRotation: 0, autoSkip: true },
          grid: { display: false }
        },
        y: {
          ticks: { color: "#ccc" },
          grid: { color: "#444" }
        }
      }
    }
  });
}