let tempChart, humidityChart;

// ⏱ Aktualizuje tylko liczby
function updateCurrentValues(data) {
  if (!data) return;
  const tempEl = document.getElementById('temp');
  const humEl = document.getElementById('hum');

  if (tempEl) tempEl.textContent = data.temperature !== null ? `${data.temperature} °C` : '--';
  if (humEl) humEl.textContent = data.humidity !== null ? `${data.humidity} %` : '--';

  // Uaktualnij tylko wilgotnościowy wykres (doughnut)
  if (humidityChart) {
    humidityChart.data.datasets[0].data = [data.humidity, 100 - data.humidity];
    humidityChart.update();
  }
}

// 🔄 Aktualizuje wykres wilgotności
function updateHumidityChart(humidity) {
  if (humidityChart) {
    humidityChart.data.datasets[0].data = [humidity, 100 - humidity];
    humidityChart.update();
  }
}

function reloadTempChart() {
  fetch('/data')
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data)) return;

      const ctx = document.getElementById('tempChart').getContext('2d');
      if (tempChart) tempChart.destroy(); // usuń poprzedni wykres

      tempChart = new Chart(ctx, {
        type: "line",
        data: {
          datasets: [{
            label: "Temperatura (°C)",
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
          animation: false, // ← wyłącz animację
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
                color: "#898d99"
              },
              grid: { display: false },
              title: {
                display: true,
                text: "Godzina",
                color: "#898d99"
              }
            },
            y: {
              title: {
                display: true,
                text: "Temperatura (°C)",
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
    });
}

// 🟢 Inicjalizacja dashboardu
fetch('/data')
  .then(res => res.json())
  .then(data => {
    if (!Array.isArray(data)) return;

    const last = data[data.length - 1];
    updateCurrentValues(last);
    updateHumidityChart(last.humidity);
    reloadTempChart();

    // Inicjalizuj doughnut raz
    const humCtx = document.getElementById("humidityChart").getContext("2d");
    humidityChart = new Chart(humCtx, {
      type: "doughnut",
      data: {
        datasets: [{
          data: [last.humidity, 100 - last.humidity],
          backgroundColor: ["rgba(54, 162, 235, 0.7)", "rgba(200, 200, 200, 0.2)"],
          borderColor: ["rgba(54, 162, 235, 1)", "rgba(200, 200, 200, 0.3)"],
          borderWidth: 0.5
        }]
      },
      options: {
        plugins: {
          legend: {
            display: true,
            labels: { color: "#ffffff" }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.label || "Wilgotność"}: ${context.parsed.toFixed(1)}%`;
              }
            }
          }
        }
      }
    });
  })
  .catch(error => console.error('Błąd ładowania danych początkowych:', error));

const socket = io();

socket.on('connect', () => {
  console.log('Połączono z WebSocketem');
});

// Bieżące dane – aktualizuj wartości i wykres wilgotności
socket.on('new_data', (data) => {
  console.log('Nowe dane z MQTT:', data);
  updateCurrentValues(data);
});

// Nowe dane zapisane do pliku – odśwież wykres temperatury
socket.on('data_saved', () => {
  console.log('Zapisano dane – odśwież wykres temperatury');
  reloadTempChart();
});
