// MAP
const map = L.map("map").setView([14.35, 121.25], 11);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
setTimeout(() => map.invalidateSize(), 300);
window.addEventListener("resize", () => setTimeout(() => map.invalidateSize(), 200));

function updateLegend() {
  const legend = document.getElementById("legend");
  legend.innerHTML = `
    <div class="legend-item">
      <span class="legend-dot good"></span> Good
    </div>
    <div class="legend-item">
      <span class="legend-dot moderate"></span> Moderate
    </div>
    <div class="legend-item">
      <span class="legend-dot poor"></span> Poor
    </div>
  `;
}

// call once on load
updateLegend();

// STATE
let stations = [];
let markers = [];
let selectedStation = null;
let highlight = null;
let currentParam = "do";
let currentMonth = 0;
let paramChart = null;
let nutrientChart = null;

// DROPDOWNS
const paramHTML = `
<option value="do">Dissolved Oxygen</option>
<option value="ph">pH</option>
<option value="bod">BOD</option>
<option value="cod">COD</option>
<option value="turbidity">Turbidity</option>
<option value="temp">Temperature</option>
`;

const monthHTML = `
<option value="0">January 2025</option>
<option value="1">February 2025</option>
<option value="2">March 2025</option>
`;

parameterSelect.innerHTML = paramHTML;
monthSelect.innerHTML = monthHTML;
parameterSelectMobile.innerHTML = paramHTML;
monthSelectMobile.innerHTML = monthHTML;

// LEGEND
legend.innerHTML = `
<div class="legend-item"><span class="legend-dot good"></span>Good</div>
<div class="legend-item"><span class="legend-dot moderate"></span>Moderate</div>
<div class="legend-item"><span class="legend-dot poor"></span>Poor</div>
`;

// LOAD BOUNDARY
fetch("data/boundary.geojson")
  .then(r => r.json())
  .then(g => L.geoJSON(g, {
    style: { color:"#2563eb", weight:2, fillOpacity:0.15 }
  }).addTo(map));

// LOAD STATIONS
fetch("data/station.json")
  .then(r => r.json())
  .then(data => {
    stations = data;
    buildList();
    buildMobileDropdown();
    drawMarkers();
  });

// STATION LIST
function buildList() {
  stationList.innerHTML = "";
  stations.forEach(s => {
    const li = document.createElement("li");
    li.textContent = s.name;
    li.onclick = () => selectStation(s);
    stationList.appendChild(li);
  });
}

// MOBILE STATION DROPDOWN
function buildMobileDropdown() {
  stationSelect.innerHTML = "<option>Select station</option>";
  stations.forEach(s => {
    const o = document.createElement("option");
    o.value = s.name;
    o.textContent = s.name;
    stationSelect.appendChild(o);
  });

  stationSelect.onchange = () => {
    const s = stations.find(x => x.name === stationSelect.value);
    if (s) selectStation(s);
  };
}

// MARKERS
function drawMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  stations.forEach(s => {
    const v = s.readings[currentMonth][currentParam];
    const m = L.circleMarker([s.lat, s.lng], {
      radius: 7,
      fillColor: color(v),
      color: "#000",
      fillOpacity: 0.9
    }).addTo(map).on("click", () => selectStation(s));
    markers.push(m);
  });
}

// SELECT STATION
function selectStation(s) {
  selectedStation = s;
  const r = s.readings[currentMonth];

  stationName.textContent = s.name;

  if (highlight) map.removeLayer(highlight);
  highlight = L.circle([s.lat, s.lng], {
    radius: 2500,
    color: "#2563eb",
    fillOpacity: 0.25
  }).addTo(map);

  map.setView([s.lat, s.lng], 12);

  stationDetails.innerHTML = `
    <div class="section-title">Water Parameters</div>
    <div class="metric-grid">
      ${metric("💧","DO",r.do)}
      ${metric("🧪","pH",r.ph)}
      ${metric("🧬","BOD",r.bod)}
      ${metric("🔥","COD",r.cod)}
      ${metric("🌫️","Turbidity",r.turbidity)}
      ${metric("🌡️","Temperature",r.temp)}
    </div>

    <div class="section-title">Water Quality Trend</div>
    <div class="trend-box"><canvas id="paramChart"></canvas></div>

    <div class="section-title">Nutrients</div>
    <div class="metric-grid">
      ${metric("🌿","Nitrate",r.nitrate)}
      ${metric("🧫","Phosphate",r.phosphate)}
    </div>

    <div class="section-title">Nutrient Trend</div>
    <div class="trend-box"><canvas id="nutrientChart"></canvas></div>
  `;

  renderCharts(s);

  document.querySelectorAll("#stationList li").forEach(li =>
    li.classList.toggle("active", li.textContent === s.name)
  );
}

// CHARTS
function renderCharts(s) {
  if (paramChart) paramChart.destroy();
  if (nutrientChart) nutrientChart.destroy();

  paramChart = new Chart(document.getElementById("paramChart"), {
    type: "line",
    data: {
      labels: s.readings.map(r => r.date),
      datasets: [
        { label:"DO", data:s.readings.map(r=>r.do) },
        { label:"pH", data:s.readings.map(r=>r.ph) },
        { label:"BOD", data:s.readings.map(r=>r.bod) },
        { label:"COD", data:s.readings.map(r=>r.cod) },
        { label:"Turbidity", data:s.readings.map(r=>r.turbidity) },
        { label:"Temp", data:s.readings.map(r=>r.temp) }
      ]
    },
    options:{ responsive:true, maintainAspectRatio:false }
  });

  nutrientChart = new Chart(document.getElementById("nutrientChart"), {
    type: "line",
    data: {
      labels: s.readings.map(r => r.date),
      datasets: [
        { label:"Nitrate", data:s.readings.map(r=>r.nitrate) },
        { label:"Phosphate", data:s.readings.map(r=>r.phosphate) }
      ]
    },
    options:{ responsive:true, maintainAspectRatio:false }
  });
}

// EVENTS
parameterSelect.onchange =
parameterSelectMobile.onchange = e => {
  currentParam = e.target.value;
  drawMarkers();
  if (selectedStation) selectStation(selectedStation);
};

monthSelect.onchange =
monthSelectMobile.onchange = e => {
  currentMonth = +e.target.value;
  drawMarkers();
  if (selectedStation) selectStation(selectedStation);
};

// HELPERS
function metric(icon,label,val){
  return `<div class="metric-card">
    <div class="metric-icon">${icon}</div>
    <small>${label}</small>
    <strong>${val}</strong>
  </div>`;
}

function color(v){
  if(v >= 8) return "#16a34a";
  if(v >= 6) return "#f59e0b";
  return "#dc2626";
}
