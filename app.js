const app = document.querySelector(".app");
const scanScreen = document.querySelector(".scan-screen");
const video = document.querySelector("#cameraFeed");
const frozenFrame = document.querySelector("#frozenFrame");
const canvas = document.querySelector("#scanCanvas");
const scanFrame = document.querySelector("#scanFrame");
const scanHint = document.querySelector("#scanHint");
const codeInput = document.querySelector("#missionCode");
const missionError = document.querySelector("#missionError");
const todayLabel = document.querySelector("#todayLabel");
const npcDialogue = document.querySelector("#npcDialogue");
const npcDialogueTextNode = document.querySelector("#npcDialogueText");
const kakaoMapElement = document.querySelector("#kakaoMap");
const kakaoFallback = document.querySelector("#kakaoFallback");
const classSearch = document.querySelector("#classSearch");
const classGrid = document.querySelector("#classGrid");
const myLocationButton = document.querySelector("#showMyLocation");
const collectionSeason = document.querySelector("#collectionSeason");
const collectionModel = document.querySelector("#collectionModel");
const collectionPrevPreview = document.querySelector("#collectionPrevPreview");
const collectionNextPreview = document.querySelector("#collectionNextPreview");
const collectionName = document.querySelector("#collectionName");
const collectionTitle = document.querySelector("#collectionTitle");
const mapSpotSheet = document.querySelector("#mapSpotSheet");
const mapSpotName = document.querySelector("#mapSpotName");
const mapSpotStatus = document.querySelector("#mapSpotStatus");
const mapSpotMembers = document.querySelector("#mapSpotMembers");
const mapSpotReward = document.querySelector("#mapSpotReward");
const eventSpotName = document.querySelector("#eventSpotName");
const eventSpotMeta = document.querySelector("#eventSpotMeta");
const eventTimer = document.querySelector("#eventTimer");
const scanTitle = document.querySelector("#scanTitle");
const completeBirdEventButton = document.querySelector("#completeBirdEvent");
const birdGuide = document.querySelector("#birdGuide");
const npcDialogueText = "지도 앞까지 왔구나. 오늘의 캠퍼스 퀘스트를 받을 준비 됐어?";
const dialogueStartMs = 4300;
const typingIntervalMs = 46;
const sejongCenter = { lat: 37.550944, lng: 127.073765 };
const defaultUserLocation = { lat: 37.497952, lng: 127.027619 };
const eventDurationMs = 5 * 60 * 1000;
const eventReachRadiusMeters = 40;
const campusEventSpots = [
  { name: "대양AI센터", lat: 37.550944, lng: 127.073765 },
  { name: "학생회관 앞", lat: 37.54992, lng: 127.07436 },
  { name: "중앙광장", lat: 37.55054, lng: 127.07508 },
  { name: "도서관 길목", lat: 37.55134, lng: 127.07456 },
  { name: "세종관 산책로", lat: 37.5511, lng: 127.07298 },
];
const personalBeaconMarkup = `
  <span class="personal-beacon" aria-hidden="true">
    <span class="beacon-pulse beacon-pulse-a"></span>
    <span class="beacon-pulse beacon-pulse-b"></span>
    <span class="beacon-ring beacon-ring-a"></span>
    <span class="beacon-ring beacon-ring-b"></span>
    <span class="beacon-core"></span>
    <span class="beacon-shadow"></span>
  </span>
  <strong>내 위치</strong>
`;
const mapCrewPoints = [
  { name: "피닉스", lat: 37.550944, lng: 127.073765, sigil: "P", status: "점령 중", members: 18, reward: "시계탑 정령 단서" },
  { name: "오로라", lat: 37.55135, lng: 127.07432, sigil: "A", status: "경합 중", members: 12, reward: "카페 라운지 쿠폰" },
  { name: "노바", lat: 37.55052, lng: 127.07318, sigil: "N", status: "미점령", members: 7, reward: "도감 조각" },
];
const mapZoomScaleByLevel = {
  1: 2.25,
  2: 1.78,
  3: 1.24,
  4: 0.92,
  5: 0.68,
  6: 0.5,
  7: 0.38,
};
const collectionModels = [
  { season: "황금말 시즌", name: "세종 기린", title: "시계탑 정령", unlocked: true, src: "./sejongGF.glb" },
  { season: "황금말 시즌", name: "달빛 여우", title: "야간 탐험 보상", unlocked: false, src: "" },
  { season: "황금말 시즌", name: "도서관 부엉이", title: "스터디 미션 보상", unlocked: false, src: "" },
  { season: "벚꽃 시즌", name: "봄길 사슴", title: "지난 시즌 기록", unlocked: true, src: "./sejongGF.glb" },
];

let stream = null;
let raf = null;
let foundFrames = 0;
let canOpenMission = false;
let arMode = "marker";
let birdLocked = false;
let activeEventIndex = 0;
let eventEndsAt = Date.now() + eventDurationMs;
let eventReached = false;
let eventCompleted = false;
let missionReadyTimer = null;
let dialogueStartTimer = null;
let dialogueTypingTimer = null;
let kakaoMapLoaded = false;
let classDragMode = "add";
let mapMenuOpen = false;
let collectionIndex = 0;
let kakaoMapInstance = null;
let mapSpotOverlays = [];
let mapClusterOverlay = null;
let eventMarkerOverlay = null;
let mapRenderDebounce = null;
let myLocationOverlay = null;
let interactionCircle = null;
let locationWatchId = null;
let currentUserLocation = defaultUserLocation;
let lastLocationRequestAt = 0;

todayLabel.textContent = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "short",
}).format(new Date());

function getDistanceMeters(from, to) {
  const earthRadius = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getBearingLabel(from, to) {
  const toRad = (value) => (value * Math.PI) / 180;
  const toDeg = (value) => (value * 180) / Math.PI;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return ["북", "북동", "동", "남동", "남", "남서", "서", "북서"][Math.round(bearing / 45) % 8];
}

function formatEventTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const mapScanButton = document.querySelector("#startScanMap");
function beginScanFromMap(event) {
  event?.preventDefault();
  if (!eventReached) return;
  setMapMenuOpen(false);
  if (app.dataset.step === "scan") return;
  beginScan("bird");
}
mapScanButton?.addEventListener("pointerdown", beginScanFromMap);
mapScanButton?.addEventListener("touchstart", beginScanFromMap, { passive: false });
mapScanButton?.addEventListener("click", beginScanFromMap);
function requestMyLocationFromMap(event) {
  event?.preventDefault();
  requestMyLocation();
}
myLocationButton?.addEventListener("pointerdown", requestMyLocationFromMap);
myLocationButton?.addEventListener("touchstart", requestMyLocationFromMap, { passive: false });
myLocationButton?.addEventListener("click", requestMyLocationFromMap);
document.querySelector("#startScanExplore")?.addEventListener("click", beginScan);
document.querySelector("#startScanExploreAlt")?.addEventListener("click", beginScan);
document.querySelector("#collectionPrev")?.addEventListener("click", () => {
  collectionIndex = (collectionIndex + collectionModels.length - 1) % collectionModels.length;
  renderCollection();
});
document.querySelector("#collectionNext")?.addEventListener("click", () => {
  collectionIndex = (collectionIndex + 1) % collectionModels.length;
  renderCollection();
});
renderCollection();
document.querySelector("#closeSettings").addEventListener("click", () => setStep("map"));
document.querySelectorAll(".open-settings").forEach((button) => {
  button.addEventListener("click", () => setStep("settings"));
});
document.querySelectorAll(".signup-next").forEach((button) => {
  button.addEventListener("click", () => {
    const requiredGroup = button.dataset.requires;
    if (requiredGroup) {
      const hasSelection = Boolean(document.querySelector(`[data-choice="${requiredGroup}"].is-selected`));
      const error = document.querySelector(`[data-error="${requiredGroup}"]`);
      if (!hasSelection) {
        if (error) error.textContent = requiredGroup === "interest" ? "관심사를 1개 이상 선택해주세요." : "취미를 1개 이상 선택해주세요.";
        return;
      }
      if (error) error.textContent = "";
    }
    setStep(button.dataset.next);
  });
});
document.querySelectorAll("[data-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("is-selected");
    button.setAttribute("aria-pressed", button.classList.contains("is-selected") ? "true" : "false");
    const group = button.dataset.choice;
    const error = document.querySelector(`[data-error="${group}"]`);
    if (document.querySelector(`[data-choice="${group}"].is-selected`) && error) error.textContent = "";
  });
});
document.querySelectorAll(".class-preset").forEach((button) => {
  button.addEventListener("click", () => {
    button.dataset.slots.split(",").forEach((slot) => {
      const cell = document.querySelector(`[data-slot="${slot}"]`);
      if (!cell) return;
      cell.classList.add("is-class");
      cell.textContent = button.dataset.short;
    });
  });
});
classSearch?.addEventListener("input", () => {
  const query = classSearch.value.trim();
  document.querySelectorAll(".class-preset").forEach((button) => {
    button.hidden = query && !button.dataset.name.includes(query);
  });
});
classGrid?.addEventListener("pointerdown", (event) => {
  if (!event.target.matches("[data-slot]")) return;
  classDragMode = event.target.classList.contains("is-class") ? "remove" : "add";
  paintClassCell(event.target);
});
classGrid?.addEventListener("pointerover", (event) => {
  if (event.buttons !== 1 || !event.target.matches("[data-slot]")) return;
  paintClassCell(event.target);
});
document.querySelectorAll(".tab-link").forEach((button) => {
  button.addEventListener("click", () => setStep(button.dataset.tab));
});
document.querySelectorAll("[data-menu-step]").forEach((button) => {
  button.addEventListener("click", () => {
    setMapMenuOpen(false);
    setStep(button.dataset.menuStep);
  });
});
document.querySelector(".map-menu-trigger")?.addEventListener("click", () => {
  setMapMenuOpen(!mapMenuOpen);
});
document.querySelector("#closeScan").addEventListener("click", () => {
  stopCamera();
  setStep("map");
});
document.querySelector("#openMission").addEventListener("click", () => {
  if (!canOpenMission) return;
  stopCamera();
  setStep("mission");
});
document.querySelector("#restartDemo").addEventListener("click", () => {
  codeInput.value = "";
  missionError.textContent = "";
  setStep("map");
});
completeBirdEventButton?.addEventListener("click", () => {
  if (!birdLocked) return;
  stopCamera();
  eventCompleted = true;
  eventReached = false;
  birdLocked = false;
  completeBirdEventButton.classList.remove("is-locked");
  renderEventMarker();
  updateEventReach();
  setStep("success");
});
document.querySelector("#closeMapSpot")?.addEventListener("click", () => {
  mapSpotSheet?.classList.remove("is-visible");
});

document.querySelector("#codeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (codeInput.value === "428") {
    missionError.textContent = "";
    setStep("success");
    window.setTimeout(() => setStep("coupon"), 1700);
    return;
  }
  missionError.textContent = "코드가 맞지 않아요. 단서를 다시 살펴보세요.";
});

codeInput.addEventListener("input", () => {
  codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 3);
  missionError.textContent = "";
});

function setStep(step) {
  if (step !== "map") setMapMenuOpen(false);
  app.dataset.step = step;
  if (step === "map") initKakaoMap();
}

function setMapMenuOpen(open) {
  mapMenuOpen = open;
  const menu = document.querySelector(".map-action-menu");
  const trigger = document.querySelector(".map-menu-trigger");
  const panel = document.querySelector(".map-menu-panel");
  menu?.classList.toggle("is-open", mapMenuOpen);
  trigger?.setAttribute("aria-expanded", mapMenuOpen ? "true" : "false");
  panel?.setAttribute("aria-hidden", mapMenuOpen ? "false" : "true");
}

function renderCollection() {
  const active = collectionModels[collectionIndex];
  const previous = collectionModels[(collectionIndex + collectionModels.length - 1) % collectionModels.length];
  const next = collectionModels[(collectionIndex + 1) % collectionModels.length];
  if (!active || !collectionModel) return;
  collectionSeason.textContent = active.season;
  collectionName.textContent = active.unlocked ? active.name : "미발견 모델";
  collectionTitle.textContent = active.title;
  collectionModel.innerHTML = active.unlocked
    ? `<model-viewer src="${active.src}" camera-orbit="90deg 76deg 3.2m" field-of-view="28deg" exposure="1.1" auto-rotate interaction-prompt="none" disable-zoom alt="${active.name}"></model-viewer>`
    : `<div class="locked-model">??</div>`;
  collectionPrevPreview.innerHTML = previous.unlocked
    ? `<model-viewer src="${previous.src}" camera-orbit="90deg 76deg 3.2m" field-of-view="28deg" exposure="1" auto-rotate interaction-prompt="none" disable-zoom alt=""></model-viewer>`
    : `<div class="locked-model small">??</div>`;
  collectionNextPreview.innerHTML = next.unlocked
    ? `<model-viewer src="${next.src}" camera-orbit="90deg 76deg 3.2m" field-of-view="28deg" exposure="1" auto-rotate interaction-prompt="none" disable-zoom alt=""></model-viewer>`
    : `<div class="locked-model small">??</div>`;
}

function paintClassCell(cell) {
  if (classDragMode === "add") {
    cell.classList.add("is-class");
    cell.textContent = "수업";
    return;
  }
  cell.classList.remove("is-class");
  cell.textContent = "";
}

function getKakaoKey() {
  const params = new URLSearchParams(window.location.search);
  const keyFromQuery = params.get("kakaoKey");
  if (keyFromQuery) window.localStorage.setItem("campusDropKakaoKey", keyFromQuery);
  return keyFromQuery || window.localStorage.getItem("campusDropKakaoKey") || "";
}

function initKakaoMap() {
  if (kakaoMapLoaded || !kakaoMapElement) return;
  const kakaoKey = getKakaoKey();
  if (!kakaoKey) return;

  const renderMap = () => {
    if (!window.kakao) return;
    window.kakao.maps.load(() => {
      const center = new window.kakao.maps.LatLng(sejongCenter.lat, sejongCenter.lng);
      const map = new window.kakao.maps.Map(kakaoMapElement, { center, level: 3 });
      kakaoMapInstance = map;
      kakaoMapLoaded = true;
      kakaoFallback?.classList.add("is-hidden");
      kakaoMapElement.closest(".kakao-map-shell")?.classList.add("is-kakao-ready");
      renderUserRadar(defaultUserLocation.lat, defaultUserLocation.lng, map);
      renderEventMarker(map);
      const syncMapPointScale = () => {
        const zoomLevel = Math.max(1, Math.min(7, map.getLevel()));
        const scale = mapZoomScaleByLevel[zoomLevel] ?? 0.32;
        kakaoMapElement.closest(".kakao-map-shell")?.style.setProperty("--map-zoom-scale", scale.toFixed(3));
        kakaoMapElement.style.setProperty("--map-zoom-scale", scale.toFixed(3));
      };
      const scheduleVisibleSpotRender = () => {
        if (mapRenderDebounce) window.clearTimeout(mapRenderDebounce);
        mapRenderDebounce = window.setTimeout(() => renderVisibleMapSpots(map), 160);
      };
      syncMapPointScale();
      renderVisibleMapSpots(map);
      window.kakao.maps.event.addListener(map, "dragend", scheduleVisibleSpotRender);
      window.kakao.maps.event.addListener(map, "zoom_changed", () => {
        syncMapPointScale();
        scheduleVisibleSpotRender();
      });
      startLocationWatch();
    });
  };

  const existingScript = document.querySelector("script[data-campus-drop-kakao]");
  if (existingScript) {
    renderMap();
    return;
  }

  const script = document.createElement("script");
  script.dataset.campusDropKakao = "true";
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(kakaoKey)}&autoload=false`;
  script.async = true;
  script.onload = renderMap;
  document.head.appendChild(script);
}

function renderMapSpotPanel(spot) {
  if (!mapSpotSheet) return;
  mapSpotName.textContent = spot.name;
  mapSpotStatus.textContent = spot.status;
  mapSpotMembers.textContent = `${spot.members}명`;
  mapSpotReward.textContent = `보상 신호: ${spot.reward}`;
  mapSpotSheet.classList.add("is-visible");
}

function clearMapSpotOverlays() {
  mapSpotOverlays.forEach((overlay) => overlay.setMap(null));
  mapSpotOverlays = [];
  if (mapClusterOverlay) {
    mapClusterOverlay.setMap(null);
    mapClusterOverlay = null;
  }
}

function createSpotOverlay(crew, map) {
  const content = document.createElement("button");
  content.type = "button";
  content.className = "kakao-crew-overlay";
  content.setAttribute("aria-label", `${crew.name} 거점 상세 보기`);
  content.innerHTML = `
    <span class="crew-marker">
      <span class="crew-marker-ping animate-ping" aria-hidden="true"></span>
      <span class="crew-marker-core" aria-hidden="true">
        <span class="crew-marker-sigil">${crew.sigil}</span>
      </span>
      <span class="crew-marker-shadow" aria-hidden="true"></span>
    </span>
    <strong>${crew.name}</strong>
  `;
  content.addEventListener("click", () => renderMapSpotPanel(crew));
  const overlay = new window.kakao.maps.CustomOverlay({
    position: new window.kakao.maps.LatLng(crew.lat, crew.lng),
    content,
    xAnchor: 0.5,
    yAnchor: 1,
    zIndex: 12,
  });
  overlay.setMap(map);
  mapSpotOverlays.push(overlay);
}

function renderClusterOverlay(visibleSpots, map) {
  const lat = visibleSpots.reduce((sum, spot) => sum + spot.lat, 0) / visibleSpots.length;
  const lng = visibleSpots.reduce((sum, spot) => sum + spot.lng, 0) / visibleSpots.length;
  const cluster = document.createElement("button");
  cluster.type = "button";
  cluster.className = "kakao-cluster-overlay";
  cluster.setAttribute("aria-label", `${visibleSpots.length}개 거점 보기`);
  cluster.innerHTML = `<span>${visibleSpots.length}</span><strong>거점</strong>`;
  cluster.addEventListener("click", () => {
    const center = new window.kakao.maps.LatLng(lat, lng);
    map.setLevel(Math.max(3, map.getLevel() - 2));
    if (map.panTo) map.panTo(center);
    else map.setCenter(center);
  });
  mapClusterOverlay = new window.kakao.maps.CustomOverlay({
    position: new window.kakao.maps.LatLng(lat, lng),
    content: cluster,
    xAnchor: 0.5,
    yAnchor: 0.5,
    zIndex: 18,
  });
  mapClusterOverlay.setMap(map);
}

function renderVisibleMapSpots(map) {
  const bounds = map.getBounds();
  const visibleSpots = mapCrewPoints.filter((crew) =>
    bounds.contain(new window.kakao.maps.LatLng(crew.lat, crew.lng)),
  );
  clearMapSpotOverlays();
  const countLabel = document.querySelector("#visibleSpotCount");
  if (countLabel) countLabel.textContent = String(visibleSpots.length);
  if (map.getLevel() >= 5 && visibleSpots.length > 1) {
    renderClusterOverlay(visibleSpots, map);
    return;
  }
  visibleSpots.forEach((crew) => createSpotOverlay(crew, map));
}

function renderEventMarker(map = kakaoMapInstance) {
  if (!window.kakao || !map) return;
  if (eventMarkerOverlay) eventMarkerOverlay.setMap(null);
  const spot = campusEventSpots[activeEventIndex];
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = `event-red-marker${eventCompleted ? " is-complete" : ""}`;
  marker.setAttribute("aria-label", `${spot.name} AR 탐색 이벤트`);
  marker.innerHTML = `<span></span><strong>${eventCompleted ? "완료" : "AR"}</strong>`;
  marker.addEventListener("click", () => {
    const center = new window.kakao.maps.LatLng(spot.lat, spot.lng);
    if (map.panTo) map.panTo(center);
    else map.setCenter(center);
  });
  eventMarkerOverlay = new window.kakao.maps.CustomOverlay({
    position: new window.kakao.maps.LatLng(spot.lat, spot.lng),
    content: marker,
    xAnchor: 0.5,
    yAnchor: 1,
    zIndex: 30,
  });
  eventMarkerOverlay.setMap(map);
}

function updateEventReach(userLocation = currentUserLocation) {
  const spot = campusEventSpots[activeEventIndex];
  const distance = getDistanceMeters(userLocation, spot);
  const bearing = getBearingLabel(userLocation, spot);
  eventReached = distance <= eventReachRadiusMeters && !eventCompleted;
  if (eventSpotName) eventSpotName.textContent = spot.name;
  if (eventSpotMeta) {
    eventSpotMeta.textContent = eventCompleted
      ? "이번 좌표 완료. 다음 이동을 기다려주세요."
      : eventReached
        ? "도달 완료. 파랑새 AR을 열 수 있어요."
        : `${Math.round(distance)}m · ${bearing}쪽`;
  }
  mapScanButton?.classList.toggle("is-ready", eventReached);
  mapScanButton?.classList.toggle("is-locked", !eventReached);
  if (mapScanButton) {
    mapScanButton.disabled = !eventReached;
    mapScanButton.setAttribute("aria-label", eventReached ? "파랑새 AR 탐색 시작" : "이벤트 좌표에 도달해야 합니다");
    const label = mapScanButton.querySelector("span");
    if (label) label.textContent = eventReached ? "BIRD" : "LOCK";
  }
}

function moveEventMarker() {
  activeEventIndex = (activeEventIndex + 2) % campusEventSpots.length;
  eventEndsAt = Date.now() + eventDurationMs;
  eventReached = false;
  eventCompleted = false;
  birdLocked = false;
  canOpenMission = false;
  renderEventMarker();
  updateEventReach();
}

window.setInterval(() => {
  const remaining = eventEndsAt - Date.now();
  if (remaining <= 0) {
    moveEventMarker();
    return;
  }
  if (eventTimer) eventTimer.textContent = `이동까지 ${formatEventTime(remaining)}`;
}, 1000);

function renderUserRadar(lat, lng, map = kakaoMapInstance) {
  if (!window.kakao || !map) return;
  currentUserLocation = { lat, lng };
  updateEventReach(currentUserLocation);
  const latLng = new window.kakao.maps.LatLng(lat, lng);
  const marker = document.createElement("div");
  marker.className = "my-location-marker";
  marker.innerHTML = personalBeaconMarkup;
  if (myLocationOverlay) myLocationOverlay.setMap(null);
  if (interactionCircle) interactionCircle.setMap(null);
  interactionCircle = null;
  myLocationOverlay = new window.kakao.maps.CustomOverlay({
    position: latLng,
    content: marker,
    xAnchor: 0.5,
    yAnchor: 0.5,
    zIndex: 20,
  });
  myLocationOverlay.setMap(map);
}

function startLocationWatch() {
  if (!navigator.geolocation || locationWatchId !== null) return;
  locationWatchId = navigator.geolocation.watchPosition(
    (position) => {
      if (!window.kakao || !kakaoMapInstance) return;
      renderUserRadar(position.coords.latitude, position.coords.longitude);
      const label = myLocationButton?.querySelector("em");
      if (label) label.textContent = "실시간 위치 추적 중";
    },
    () => {
      const label = myLocationButton?.querySelector("em");
      if (label) label.textContent = "위치 권한 필요";
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
  );
}

function requestMyLocation() {
  const now = Date.now();
  if (now - lastLocationRequestAt < 900) return;
  lastLocationRequestAt = now;
  const label = myLocationButton?.querySelector("em");
  if (!navigator.geolocation) {
    if (label) label.textContent = "위치 사용 불가";
    return;
  }
  if (label) label.textContent = "위치 확인 중";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      if (!window.kakao || !kakaoMapInstance) {
        if (label) label.textContent = "지도 준비 필요";
        return;
      }
      const latLng = new window.kakao.maps.LatLng(position.coords.latitude, position.coords.longitude);
      kakaoMapInstance.setLevel(3);
      if (kakaoMapInstance.panTo) kakaoMapInstance.panTo(latLng);
      else kakaoMapInstance.setCenter(latLng);
      renderUserRadar(position.coords.latitude, position.coords.longitude);
      startLocationWatch();
      if (label) label.textContent = "내 위치 표시됨";
    },
    () => {
      if (label) label.textContent = "위치 권한 필요";
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
  );
}

async function beginScan(mode = "marker") {
  arMode = mode;
  setStep("scan");
  foundFrames = 0;
  canOpenMission = false;
  birdLocked = false;
  resetDialogue();
  frozenFrame.removeAttribute("src");
  frozenFrame.classList.remove("is-visible");
  scanScreen.classList.remove("is-found");
  scanScreen.classList.toggle("is-bird", arMode === "bird");
  scanFrame.classList.remove("is-found");
  scanTitle.textContent = arMode === "bird" ? "파랑새 AR 탐색" : "캠퍼스 드랍 스캔";
  scanHint.querySelector("strong").textContent = "카메라를 준비하고 있어요";
  scanHint.querySelector("p").textContent = "권한 요청이 뜨면 카메라 접근을 허용해주세요.";

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    if (arMode === "bird") {
      scanScreen.classList.add("is-found");
      scanFrame.classList.add("is-found");
      scanHint.querySelector("strong").textContent = "주변을 천천히 둘러보세요";
      scanHint.querySelector("p").textContent = "파랑새를 중앙에 1~2초 붙잡은 뒤 터치하세요.";
      window.setTimeout(() => {
        birdLocked = true;
        completeBirdEventButton?.classList.add("is-locked");
        birdGuide?.classList.add("is-ready");
        birdGuide.querySelector("strong").textContent = "파랑새 포착!";
        birdGuide.querySelector("p").textContent = "파랑새를 터치해 이벤트를 완료하세요.";
      }, 1600);
      return;
    }
    scanHint.querySelector("strong").textContent = "지도 안내판이나 포스터를 중앙에 맞춰주세요";
    scanHint.querySelector("p").textContent =
      "세종대 지도 안내판의 낮/야간 지도 영역 또는 전용 포스터의 초록/노랑 표식이 프레임 안에 들어오면 기린이 나타납니다.";
    scanForMarker();
  } catch {
    scanHint.querySelector("strong").textContent = "카메라를 열 수 없어요";
    scanHint.querySelector("p").textContent =
      "카메라 권한을 허용한 뒤 HTTPS 주소에서 다시 실행해주세요.";
  }
}

function stopCamera() {
  if (raf) cancelAnimationFrame(raf);
  raf = null;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  video.srcObject = null;
}

function freezeCameraFrame() {
  const snapshot = document.createElement("canvas");
  snapshot.width = video.videoWidth;
  snapshot.height = video.videoHeight;
  const snapshotContext = snapshot.getContext("2d");
  if (!snapshotContext) return;
  snapshotContext.drawImage(video, 0, 0, snapshot.width, snapshot.height);
  frozenFrame.src = snapshot.toDataURL("image/jpeg", 0.86);
  frozenFrame.classList.add("is-visible");
}

function scanForMarker() {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const tick = () => {
    if (!video.videoWidth || !video.videoHeight) {
      raf = requestAnimationFrame(tick);
      return;
    }
    canvas.width = 120;
    canvas.height = 120;
    context.drawImage(video, 0, 0, 120, 120);
    const posterImage = context.getImageData(18, 18, 60, 60).data;
    const fixtureImage = context.getImageData(20, 35, 80, 60).data;
    const dayFixtureImage = context.getImageData(6, 28, 108, 68).data;
    let green = 0;
    let yellow = 0;
    let dark = 0;
    let cyan = 0;
    let pink = 0;
    let bright = 0;
    let fixtureDark = 0;
    let dayCyan = 0;
    let dayPink = 0;
    let dayParchment = 0;
    let dayInk = 0;
    let dayCyanLeft = 0;
    let dayCyanRight = 0;
    let dayPinkLeft = 0;
    let dayPinkRight = 0;
    let skinTone = 0;
    for (let i = 0; i < posterImage.length; i += 4) {
      const r = posterImage[i];
      const g = posterImage[i + 1];
      const b = posterImage[i + 2];
      if (g > 95 && g > r * 1.1 && g > b * 1.15) green += 1;
      if (r > 150 && g > 120 && b < 95) yellow += 1;
      if (r < 55 && g < 70 && b < 80) dark += 1;
    }
    for (let i = 0; i < fixtureImage.length; i += 4) {
      const r = fixtureImage[i];
      const g = fixtureImage[i + 1];
      const b = fixtureImage[i + 2];
      if (b > 100 && g > 95 && r < 180 && b > r * 1.03) cyan += 1;
      if (r > 135 && b > 85 && g < 125 && r > g * 1.15) pink += 1;
      if (r > 165 && g > 145 && b > 110) bright += 1;
      if (r < 58 && g < 58 && b < 68) fixtureDark += 1;
    }
    for (let i = 0; i < dayFixtureImage.length; i += 4) {
      const pixelIndex = i / 4;
      const x = pixelIndex % 108;
      const r = dayFixtureImage[i];
      const g = dayFixtureImage[i + 1];
      const b = dayFixtureImage[i + 2];
      const isDayCyan = g > 100 && b > 88 && r < 168 && g > r * 1.06 && b > r * 0.9;
      const isDayPink = r > 142 && b > 82 && g < 128 && r > g * 1.2 && b > g * 0.74;
      const isSkinTone =
        r > 118 &&
        g > 70 &&
        b > 48 &&
        r > g * 1.12 &&
        g > b * 1.08 &&
        r - b > 42;
      if (isDayCyan) {
        dayCyan += 1;
        if (x < 54) dayCyanLeft += 1;
        else dayCyanRight += 1;
      }
      if (isDayPink) {
        dayPink += 1;
        if (x < 54) dayPinkLeft += 1;
        else dayPinkRight += 1;
      }
      if (r > 122 && g > 104 && b > 70 && r > b * 1.04 && g > b * 0.96) dayParchment += 1;
      if (r < 118 && g < 112 && b < 118) dayInk += 1;
      if (isSkinTone) skinTone += 1;
    }
    const posterDetected = green > 130 && yellow > 70 && dark > 60;
    const fixtureDetected =
      cyan > 260 &&
      pink > 80 &&
      bright > 1350 &&
      fixtureDark > 900 &&
      cyan + pink + bright + fixtureDark > 3300;
    const daylightFixtureDetected =
      skinTone < 760 &&
      dayCyan > 1180 &&
      dayPink > 150 &&
      dayParchment > 1300 &&
      dayInk > 340 &&
      dayParchment < 5200 &&
      dayCyanLeft > 390 &&
      dayCyanRight > 390 &&
      dayPinkLeft > 36 &&
      dayPinkRight > 36 &&
      dayCyan + dayPink > 1380 &&
      dayCyan + dayPink + dayParchment + dayInk > 3600;
    const detected = posterDetected || fixtureDetected || daylightFixtureDetected;
    const requiredFrames = daylightFixtureDetected && !posterDetected && !fixtureDetected ? 18 : 10;
    foundFrames = detected ? foundFrames + 1 : 0;
    if (foundFrames > requiredFrames) {
      freezeCameraFrame();
      stopCamera();
      revealObject();
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  tick();
}

function revealObject() {
  scanScreen.classList.add("is-found");
  scanFrame.classList.add("is-found");
  canOpenMission = false;
  resetDialogue();
  let index = 0;
  dialogueStartTimer = window.setTimeout(() => {
    npcDialogue.classList.add("is-typing");
    dialogueTypingTimer = window.setInterval(() => {
      index += 1;
      npcDialogueTextNode.textContent = npcDialogueText.slice(0, index);
      if (index >= npcDialogueText.length) {
        window.clearInterval(dialogueTypingTimer);
        dialogueTypingTimer = null;
        npcDialogue.classList.remove("is-typing");
        npcDialogue.classList.add("is-complete");
        missionReadyTimer = window.setTimeout(() => {
          canOpenMission = true;
        }, 260);
      }
    }, typingIntervalMs);
  }, dialogueStartMs);
}

function resetDialogue() {
  canOpenMission = false;
  if (missionReadyTimer) window.clearTimeout(missionReadyTimer);
  if (dialogueStartTimer) window.clearTimeout(dialogueStartTimer);
  if (dialogueTypingTimer) window.clearInterval(dialogueTypingTimer);
  missionReadyTimer = null;
  dialogueStartTimer = null;
  dialogueTypingTimer = null;
  npcDialogueTextNode.textContent = "";
  npcDialogue.classList.remove("is-typing", "is-complete");
}
