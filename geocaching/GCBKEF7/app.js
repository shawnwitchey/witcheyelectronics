const START_LAT = 41.1788333333;
const START_LNG = -85.1033166667;
const START_ZOOM = 14;
const SOLVE_DISTANCE_FEET = 100;
const SOLVE_DISTANCE_METERS = SOLVE_DISTANCE_FEET / 3.28084;
const PUZZLE_ID = ((window.location.pathname.match(/\/geocaching\/([^/]+)/) || [])[1] || "default").toLowerCase();
const STORAGE_KEY = `geocache_${PUZZLE_ID}_state_v1`;

// NOTE: client-side secret; this is puzzle-only security, not real security.
const SECRET_ENCODED = "NDEuMTcwMDE2NjY2NywtODUuMTA3NjMzMzMzMw==";

const map = L.map("map").setView([START_LAT, START_LNG], START_ZOOM);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let guessMarker = null;
let selectedLat = null;
let selectedLng = null;
let isSubmitting = false;
let state = {
  attempt: 0,
  bestDistance: null,
  previousDistance: null,
  solved: false,
  history: []
};

const selectedLatEl = document.getElementById("selected-lat");
const selectedLngEl = document.getElementById("selected-lng");
const newGameBtn = document.getElementById("newGameBtn");
const statusEl = document.getElementById("status");

const attemptValueEl = document.getElementById("attemptValue");
const bestDistanceValueEl = document.getElementById("bestDistanceValue");
const solveDistanceValueEl = document.getElementById("solveDistanceValue");
const distanceValueEl = document.getElementById("distanceValue");
const hintValueEl = document.getElementById("hintValue");
const solvedValueEl = document.getElementById("solvedValue");
const finalCoordsRowEl = document.getElementById("finalCoordsRow");
const finalCoordsValueEl = document.getElementById("finalCoordsValue");
const historyListEl = document.getElementById("historyList");

function getHiddenCoordinates() {
  const raw = atob(SECRET_ENCODED);
  const [latStr, lngStr] = raw.split(",");
  return {
    lat: parseFloat(latStr),
    lng: parseFloat(lngStr)
  };
}

function formatDistance(valueMeters) {
  if (typeof valueMeters !== "number" || Number.isNaN(valueMeters)) {
    return "-";
  }

  const miles = valueMeters / 1609.344;
  if (miles < 0.1) {
    const feet = Math.round(valueMeters * 3.28084);
    return `${feet} ft`;
  }

  const roundedMiles = Math.round(miles * 10) / 10;
  let milesText = roundedMiles.toFixed(1);
  if (roundedMiles < 1) {
    milesText = milesText.replace(/^0/, "");
  }

  return `${milesText} miles`;
}

function formatGeocacheCoordinate(value, isLatitude) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  const hemisphere = isLatitude ? (value >= 0 ? "N" : "S") : (value >= 0 ? "E" : "W");
  const abs = Math.abs(value);
  let degrees = Math.floor(abs);
  let minutes = (abs - degrees) * 60;

  // Guard against rare floating-point rollovers (e.g. 59.999999 -> 60.000).
  if (minutes >= 60) {
    degrees += 1;
    minutes = 0;
  }

  const degreeWidth = isLatitude ? 2 : 3;
  const degreesText = String(degrees).padStart(degreeWidth, "0");
  const minutesText = minutes.toFixed(3).padStart(6, "0");
  return `${hemisphere} ${degreesText}\u00B0 ${minutesText}'`;
}

function formatGeocachePair(lat, lng) {
  return `${formatGeocacheCoordinate(lat, true)} ${formatGeocacheCoordinate(lng, false)}`;
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;

  const toRad = (value) => (value * Math.PI) / 180;
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return;
    }

    state = {
      attempt: Number(parsed.attempt) || 0,
      bestDistance:
        typeof parsed.bestDistance === "number" && Number.isFinite(parsed.bestDistance)
          ? parsed.bestDistance
          : null,
      previousDistance:
        typeof parsed.previousDistance === "number" && Number.isFinite(parsed.previousDistance)
          ? parsed.previousDistance
          : null,
      solved: Boolean(parsed.solved),
      history: Array.isArray(parsed.history)
        ? parsed.history.map((item) => ({
            attempt: Number(item.attempt) || 0,
            distance: typeof item.distance === "string" ? item.distance : "-",
            hint: typeof item.hint === "string" ? item.hint : "-"
          }))
        : []
    };
  } catch (error) {
    console.error("Failed to load local state", error);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save local state", error);
  }
}

function updateSubmitAvailability() {
  // Kept for shared state management; no submit button in auto-submit mode.
}

function renderHistory() {
  historyListEl.innerHTML = "";

  if (state.history.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No guesses yet.";
    historyListEl.appendChild(li);
    return;
  }

  for (const item of state.history) {
    const li = document.createElement("li");
    li.textContent = `Guess ${item.attempt}: ${item.distance} (${formatHintText(item.hint)})`;
    historyListEl.appendChild(li);
  }
}

function setStatus(message) {
  statusEl.textContent = message;
}

function recenterMap() {
  map.setView([START_LAT, START_LNG], START_ZOOM);
  setStatus("Map recentered.");
}

function formatHintText(hint) {
  if (hint === "Warmer") {
    return "Warmer :)";
  }
  if (hint === "Colder") {
    return "Colder :(";
  }
  return hint || "-";
}

function setHintDisplay(hint) {
  hintValueEl.textContent = formatHintText(hint);
  hintValueEl.className = "hint-badge hint-neutral";

  if (hint === "Warmer") {
    hintValueEl.className = "hint-badge hint-hot";
  } else if (hint === "Colder") {
    hintValueEl.className = "hint-badge hint-cold";
  }
}

function applyMarkerPosition(lat, lng) {
  selectedLat = lat;
  selectedLng = lng;
  selectedLatEl.textContent = formatGeocacheCoordinate(lat, true);
  selectedLngEl.textContent = formatGeocacheCoordinate(lng, false);

  if (guessMarker) {
    guessMarker.setLatLng([lat, lng]);
  } else {
    guessMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
    guessMarker.on("dragend", () => {
      const pos = guessMarker.getLatLng();
      applyMarkerPosition(pos.lat, pos.lng);
      setStatus("Marker moved. Auto-submitting guess...");
      submitGuess();
    });
  }

  updateSubmitAvailability();
}

function clearMarkerAndSelection() {
  if (guessMarker) {
    map.removeLayer(guessMarker);
    guessMarker = null;
  }

  selectedLat = null;
  selectedLng = null;
  selectedLatEl.textContent = "None";
  selectedLngEl.textContent = "None";
  updateSubmitAvailability();
}

function resetState() {
  state = {
    attempt: 0,
    bestDistance: null,
    previousDistance: null,
    solved: false,
    history: []
  };
  saveState();
}

function renderState() {
  attemptValueEl.textContent = String(state.attempt);
  bestDistanceValueEl.textContent = formatDistance(state.bestDistance);
  solveDistanceValueEl.textContent = formatDistance(SOLVE_DISTANCE_METERS);
  const latestHint = state.history.length > 0 ? state.history[state.history.length - 1].hint : "-";
  setHintDisplay(latestHint);

  if (state.solved) {
    const final = getHiddenCoordinates();
    solvedValueEl.textContent = "Solved";
    solvedValueEl.className = "value solved";
    finalCoordsRowEl.classList.remove("hidden");
    finalCoordsValueEl.textContent = formatGeocachePair(final.lat, final.lng);
  } else {
    solvedValueEl.textContent = "Not solved";
    solvedValueEl.className = "value unsolved";
    finalCoordsRowEl.classList.add("hidden");
    finalCoordsValueEl.textContent = "";
  }

  renderHistory();
  updateSubmitAvailability();
}

function submitGuess() {
  if (selectedLat === null || selectedLng === null || state.solved || isSubmitting) {
    return;
  }

  isSubmitting = true;
  updateSubmitAvailability();

  try {
    const hidden = getHiddenCoordinates();
    const distance = haversineMeters(selectedLat, selectedLng, hidden.lat, hidden.lng);

    let hint = "First guess";
    if (typeof state.previousDistance === "number") {
      if (distance < state.previousDistance) {
        hint = "Warmer";
      } else if (distance > state.previousDistance) {
        hint = "Colder";
      } else {
        hint = "Same distance";
      }
    }

    state.attempt += 1;
    state.previousDistance = distance;
    state.bestDistance =
      typeof state.bestDistance === "number" ? Math.min(state.bestDistance, distance) : distance;
    state.solved = distance <= SOLVE_DISTANCE_METERS;

    const distanceText = formatDistance(distance);
    distanceValueEl.textContent = distanceText;
    setHintDisplay(hint);

    state.history.push({
      attempt: state.attempt,
      distance: distanceText,
      hint
    });

    saveState();
    renderState();

    if (state.solved) {
      setStatus("Solved. Final coordinates unlocked.");
    } else {
      setStatus("Guess submitted. Use distance and hint to refine your next guess.");
    }
  } catch (error) {
    console.error(error);
    setStatus("An error occurred while evaluating your guess.");
  } finally {
    isSubmitting = false;
    updateSubmitAvailability();
  }
}

map.on("click", (event) => {
  if (state.solved) {
    return;
  }

  applyMarkerPosition(event.latlng.lat, event.latlng.lng);
  setStatus("Marker placed. Auto-submitting guess...");
  submitGuess();
});

const RecenterControl = L.Control.extend({
  options: {
    position: "topleft"
  },
  onAdd() {
    const container = L.DomUtil.create(
      "div",
      "leaflet-bar leaflet-control leaflet-control-recenter"
    );
    const button = L.DomUtil.create("a", "leaflet-control-recenter-btn", container);
    button.href = "#";
    button.setAttribute("role", "button");
    button.setAttribute("aria-label", "Recenter map");
    button.title = "Recenter map";
    button.innerHTML = "⌖";

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.on(button, "click", L.DomEvent.stop);
    L.DomEvent.on(button, "click", recenterMap);
    return container;
  }
});

map.addControl(new RecenterControl());

newGameBtn.addEventListener("click", () => {
  clearMarkerAndSelection();
  resetState();
  distanceValueEl.textContent = "-";
  setHintDisplay("-");
  renderState();
  setStatus("New game started. Place a marker on the map to begin.");
});

loadState();
renderState();

if (state.solved) {
  setStatus("Session already solved. Click New Game to play again.");
} else {
  setStatus("Place a marker on the map to begin.");
}
