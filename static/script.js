function updateData() {
  fetch('/data')
    .then(response => response.json())
    .then(data => {
      document.getElementById('temp').textContent = data.temperature !== null ? `${data.temperature} °C` : '--';
      document.getElementById('hum').textContent = data.humidity !== null ? `${data.humidity} %` : '--';
    })
    .catch(error => console.error('Błąd pobierania danych:', error));
}

setInterval(updateData, 5000);
updateData(); // pierwszy raz od razu
