let map = L.map("map").setView([14.35, 121.25], 10);
let markers = {};
let chart;
let currentParam = "do"; // default parameter
let selectedStation = null;

// BASE MAP
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© WITM Project 2026"
}).addTo(map);

// LOAD BOUNDARY
fetch("data/boundary.geojson")
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, { style: { color: "blue", weight: 2, fillOpacity: 0.05 } }).addTo(map);
  });

// COLOR FUNCTION
function getColor(value, param) {
  if (param === "do") {
    if (value >= 6) return "green";
    if (value >= 4) return "orange";
    return "red";
  }
  if (param === "bod") {
    if (value <= 2) return "green";
    if (value <= 5) return "orange";
    return "red";
  }
  if (param === "fecal_coliform") {
    if (value <= 50) return "green";
    if (value <= 100) return "orange";
    return "red";
  }
  if (param === "ph") {
    if (value >= 6 && value <= 9) return "green";
    return "red";
  }
  if (param === "tss") {
    if (value <= 30) return "green";
    if (value <= 100) return "orange";
    return "red";
  }
  return "gray";
}

// CREATE POPUP
function createPopup(station, reading) {
  return `
    <strong>${station.name}</strong><br>
    DO: ${reading.do}<br>
    pH: ${reading.ph}<br>
    BOD: ${reading.bod}<br>
    COD: ${reading.fecal_coliform}<br>
  `;
}

// LOAD STATIONS
fetch("data/station.json")
  .then(res => res.json())
  .then(data => {
    const stationList = document.getElementById("stationList");
    const paramSelect = document.getElementById("paramSelect");

    data.forEach(station => {
      // Add marker
      const latest = station.readings[station.readings.length - 1];
      const marker = L.circleMarker([station.lat, station.lng], {
        radius: 8,
        color: getColor(latest[currentParam], currentParam),
        fillOpacity: 0.8
      }).addTo(map).bindPopup(createPopup(station, latest));

      markers[station.id] = { marker, station };

      // Add station to sidebar list
      const li = document.createElement("li");
      li.textContent = station.name;
      li.addEventListener("click", () => {
        selectedStation = station;
        map.setView([station.lat, station.lng], 12);
        marker.openPopup();
        updateChart(station);
        updateTable(station);
      });
      stationList.appendChild(li);
    });

    // PARAMETER SELECT EVENT
    paramSelect.addEventListener("change", () => {
      currentParam = paramSelect.value;
      updateMarkers();
      updateLegend();
      if (selectedStation) updateChart(selectedStation);
    });

    addLegend();
  });

// UPDATE MARKERS COLOR
function updateMarkers() {
  Object.values(markers).forEach(({ marker, station }) => {
    const latest = station.readings[station.readings.length - 1];
    marker.setStyle({ color: getColor(latest[currentParam], currentParam) });
    marker.setPopupContent(createPopup(station, latest));
  });
}

// CHART FUNCTION
function updateChart(station) {
  const labels = station.readings.map(r => r.date);
  const data = station.readings.map(r => r[currentParam]);

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: `${currentParam.toUpperCase()} History`,
        data,
        borderWidth: 2,
        tension: 0.3,
        borderColor: "blue",
        backgroundColor: "rgba(0,0,255,0.1)"
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

// TABLE FUNCTION
function updateTable(station) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";
  station.readings.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.do}</td>
      <td>${r.bod}</td>
      <td>${r.fecal_coliform}</td>
      <td>${r.ph}</td>
      <td>${r.tss}</td>
    `;
    tbody.appendChild(tr);
  });
}

// LEGEND
let legend;
function addLegend() {
  legend = L.control({ position: "bottomright" });
  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = "<h4>Legend</h4>";
    return div;
  };
  legend.addTo(map);
  updateLegend();
}

function updateLegend() {
  if (!legend) return;
  const div = document.querySelector(".legend");
  let ranges = [];

  if (currentParam === "do") ranges = ["≥6 (green)", "4–5.9 (orange)", "<4 (red)"];
  else if (currentParam === "bod") ranges = ["≤2 (green)", "3–5 (orange)", ">5 (red)"];
  else if (currentParam === "fecal_coliform") ranges = ["≤50 (green)", "51–100 (orange)", ">100 (red)"];
  else if (currentParam === "ph") ranges = ["6–9 (green)", "<6 or >9 (red)"];
  else if (currentParam === "tss") ranges = ["≤30 (green)", "31–100 (orange)", ">100 (red)"];

  div.innerHTML = `<h4>Legend (${currentParam.toUpperCase()})</h4>` + ranges.map(r => `<div>${r}</div>`).join("");
}
