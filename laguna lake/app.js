const map = L.map("map").setView([14.35, 121.25], 11);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let stations = [];
let markers = [];
let currentParam = "do";
let currentMonth = 0;

// LOAD STATIONS
fetch("data/station.json")
  .then(r => r.json())
  .then(data => {
    stations = data;
    buildList();
    buildMobileDropdown();
    drawMarkers();
  });

// DESKTOP LIST
function buildList() {
  const ul = document.getElementById("stationList");
  ul.innerHTML = "";
  stations.forEach(st => {
    const li = document.createElement("li");
    li.textContent = st.name;
    li.onclick = () => selectStation(st);
    ul.appendChild(li);
  });
}

// MOBILE DROPDOWN
function buildMobileDropdown() {
  const dropdown = document.getElementById("stationDropdown");
  if (!dropdown) return;

  dropdown.innerHTML = "";
  stations.forEach(st => {
    const opt = document.createElement("option");
    opt.value = st.id;
    opt.textContent = st.name;
    dropdown.appendChild(opt);
  });

  dropdown.onchange = e => {
    const st = stations.find(s => s.id === e.target.value);
    if (st) selectStation(st);
  };
}

// MARKERS
function drawMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  stations.forEach(st => {
    const v = st.readings[currentMonth][currentParam];
    const m = L.circleMarker([st.lat, st.lng], {
      radius: 8,
      fillColor: getColor(v),
      fillOpacity: 0.9,
      color: "#000",
      weight: 1
    }).addTo(map).on("click", () => selectStation(st));

    markers.push(m);
  });
}

// SELECT STATION
function selectStation(st) {
  document.getElementById("stationName").textContent = st.name;

  document.getElementById("stationDetails").innerHTML =
    `<p><strong>${currentParam.toUpperCase()}</strong>: ${st.readings[currentMonth][currentParam]}</p>`;

  document.querySelectorAll("#stationList li").forEach(li => {
    li.classList.toggle("active", li.textContent === st.name);
  });

  const dropdown = document.getElementById("stationDropdown");
  if (dropdown) dropdown.value = st.id;

  map.setView([st.lat, st.lng], 12);
}

// CONTROLS
document.getElementById("parameterSelect").onchange = e => {
  currentParam = e.target.value;
  drawMarkers();
};

document.getElementById("monthSelect").onchange = e => {
  currentMonth = +e.target.value;
  drawMarkers();
};

// COLOR SCALE
function getColor(v) {
  if (v >= 8) return "#3fa796";
  if (v >= 6) return "#d9b44a";
  return "#d14c4c";
}

// INFO PANEL
document.getElementById("infoBtn").onclick = () =>
  document.getElementById("infoPanel").style.display = "block";
document.getElementById("infoClose").onclick = () =>
  document.getElementById("infoPanel").style.display = "none";
