// Zmienne globalne
let socket;

// Inicjalizacja połączenia WebSocket
function initWebSocket() {
  socket = io();

  socket.on('connect', () => {
    console.log('Połączono z WebSocketem');
  });

  // Bieżące dane – aktualizuj wartości i wykres wilgotności
  socket.on('new_data', (data) => {
    updateCurrentValues(data);
  });

  // Nowe dane zapisane do pliku – odśwież wykres temperatury
  socket.on('data_saved', () => {
    reloadTempChart();
    reloadGasCharts();
  });
}

//  Aktualizuje tylko liczby
function updateCurrentValues(data) {
  if (!data) return;

  const tempEl = document.getElementById('temp');
  const humEl = document.getElementById('hum');
  const mq2El = document.getElementById('mq2Current');
  const mq7El = document.getElementById('mq7Current');
  const maxEl = document.getElementById('temp-max');
  const minEl = document.getElementById('temp-min');
  const maxHumEL = document.getElementById('hum-max');
  const minHumEL = document.getElementById('hum-min');

  if (tempEl) tempEl.textContent = data.temperature !== null ? `${data.temperature} °C` : '--';
  if (humEl) humEl.textContent = data.humidity !== null ? `${data.humidity} %` : '--';
  if (mq2El) mq2El.textContent = data.mq2 !== null ? data.mq2 : '--';
  if (mq7El) mq7El.textContent = data.mq7 !== null ? data.mq7 : '--';

  // Aktualizacja max i min temperatury
  if (data.temperature !== null) {
    if (maxEl) {
      const currentMax = parseFloat(maxEl.textContent.split(' ')[0]);
      if (data.temperature > currentMax || isNaN(currentMax)) {
        maxEl.textContent = `${data.temperature.toFixed(1)} °C`;
      }
    }

    if (minEl) {
      const currentMin = parseFloat(minEl.textContent.split(' ')[0]);
      if (data.temperature < currentMin || isNaN(currentMin)) {
        minEl.textContent = `${data.temperature.toFixed(1)} °C`;
      }
    }
  }

  // Aktualizacja max i min wilgotnosci
  if (data.humidity !== null) {
    if (maxHumEL) {
       const currentMax = parseFloat(maxHumEL.textContent.split(' ')[0]);
       if (data.humidity > currentMax || isNaN(currentMax)) {
         maxHumEL.textContent = `${data.humidity.toFixed(1)} %`;
       }
    }

    if (minHumEL) {
       const currentMax = parseFloat(minHumEL.textContent.split(' ')[0]);
       if (data.humidity < currentMax || isNaN(currentMax)) {
         minHumEL.textContent = `${data.humidity.toFixed(1)} %`;
       }
    }
  }

  // Uaktualnij tylko wilgotnościowy wykres (doughnut)
  if (typeof updateHumidityChart === 'function') {
    updateHumidityChart(data.humidity);
  }
}

// 🟢 Inicjalizacja dashboardu
function initDashboard() {
  fetch('/data')
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data)) return;

      const last = data[data.length - 1];
      updateCurrentValues(last);
      
      // Inicjalizacja wykresów (funkcje z charts.js)
      if (typeof initCharts === 'function') {
        initCharts(data);
      }
    })
    .catch(error => console.error('Błąd ładowania danych początkowych:', error));
}

// Start aplikacji
document.addEventListener('DOMContentLoaded', () => {
  initWebSocket();
  initDashboard();
});