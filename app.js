const app = document.querySelector("#app");
const screens = [...document.querySelectorAll("[data-screen]")];
const reachRadiusMeters = 20;
const clueRevealRadiusMeters = 10;
const witnessReachRadiusMeters = 10;
const missionTarget = { lat: 37.55041617275794, lng: 127.07381801425053 };
const investigationMarkerSrc = "./investigation-marker-v2.png";
const directionOptions = [
  { key: "N", label: "북쪽" },
  { key: "NE", label: "북동쪽" },
  { key: "E", label: "동쪽" },
  { key: "SE", label: "남동쪽" },
  { key: "S", label: "남쪽" },
  { key: "SW", label: "남서쪽" },
  { key: "W", label: "서쪽" },
  { key: "NW", label: "북서쪽" },
];
const directionVectors = {
  N: { x: 0, y: -1 },
  NE: { x: 0.7, y: -0.7 },
  E: { x: 1, y: 0 },
  SE: { x: 0.7, y: 0.7 },
  S: { x: 0, y: 1 },
  SW: { x: -0.7, y: 0.7 },
  W: { x: -1, y: 0 },
  NW: { x: -0.7, y: -0.7 },
};
const witnesses = [
  {
    id: "A",
    name: "목격자 A",
    location: { lat: 37.55009418972363, lng: 127.0736196575354 },
    photo: "./gfPhoto_03.png",
    statement: "분명히 위쪽이었습니다. 나무보다 훨씬 높은 곳에서 긴 그림자가 시계탑 쪽으로 움직였어요.",
    correctDirection: "N",
    point: { x: 21.31, y: 80.35 },
  },
  {
    id: "B",
    name: "목격자 B",
    location: { lat: 37.55143211168644, lng: 127.07371716568217 },
    photo: "./gfPhoto_02.png",
    statement: "대양타워 쪽을 내려다보는 것 같았어요. 창문 위로 노란 무늬가 잠깐 스쳤습니다.",
    correctDirection: "SE",
    point: { x: 25.93, y: 15.65 },
  },
  {
    id: "C",
    name: "목격자 C",
    location: { lat: 37.550652047104954, lng: 127.0748310833212 },
    photo: "./gfPhoto_01.png",
    statement: "처음엔 조형물인 줄 알았는데, 고개가 천천히 북서쪽으로 돌아갔습니다.",
    correctDirection: "NW",
    point: { x: 78.69, y: 53.37 },
  },
];
const dropLinkBriefings = [
  "사용자 인증 완료. 임시 현장 조사원으로 등록합니다. 사건 번호 CD-SJ-01, 사건명 시계탑 대형 생물 목격 사건.",
  "세종대학교에는 오래된 소문이 하나 있습니다. 시계탑 꼭대기에는 기린이 산다. 본부는 목격 신고 7건을 근거로 현장 조사가 필요하다고 판단했습니다.",
];
const posterCopy = {
  student_hall: "학생회관 포스터를 통해 접속했습니다. 창문 뒤로 긴 그림자를 봤다는 제보가 남아 있습니다.",
  library: "학술정보원 포스터를 통해 접속했습니다. 새벽 시간대 시계탑 꼭대기 목격 신고가 반복됐습니다.",
  gate: "정문 포스터를 통해 접속했습니다. 최근 30일 동안 같은 소문과 관련된 신고가 7건 접수됐습니다.",
};
let messageStep = 0;
let dropLinkTyper = null;
let dropLinkLine = 0;
let missionMapReady = false;
let locationRefreshTimer = null;
let locationInReach = false;
let witnessRefreshTimer = null;
let activeWitnessId = "A";
let visitedWitnesses = { A: false, B: false, C: false };
let witnessDirections = { A: null, B: null, C: null };
let cameraStream = null;
let cameraWatch = null;
let cameraFoundTimer = null;

function triggerDropLinkVibration() {
  if (typeof navigator.vibrate !== "function") return;
  navigator.vibrate([70, 45, 110]);
}

function triggerEvidenceVibration() {
  if (typeof navigator.vibrate !== "function") return;
  navigator.vibrate([45, 35, 70, 45, 130]);
}

function stopCameraScan() {
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  if (cameraWatch !== null) {
    navigator.geolocation.clearWatch(cameraWatch);
    cameraWatch = null;
  }
  if (cameraFoundTimer !== null) {
    window.clearTimeout(cameraFoundTimer);
    cameraFoundTimer = null;
  }
}

function showScreen(name) {
  if (app.classList.contains("scene-camera") && name !== "camera") {
    stopCameraScan();
  }
  screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === name);
  });
  app.className = `case-app scene-${name}`;
  window.scrollTo({ top: 0, behavior: "instant" });

  if (name === "incident") {
    const message = document.querySelector("#unknownMessage");
    messageStep = 0;
    message.classList.remove("is-visible");
    window.setTimeout(() => {
      message.classList.add("is-visible");
      triggerDropLinkVibration();
    }, 5200);
  }

  if (name === "mission") {
    initMissionMap();
    startMissionLocationUpdates();
  } else {
    stopMissionLocationUpdates();
  }

  if (name === "witness") {
    initWitnessScene();
    startWitnessLocationUpdates();
  } else {
    stopWitnessLocationUpdates();
  }
}

function initMissionMap() {
  if (missionMapReady) return;
  const shell = document.querySelector("#missionMap");
  const loading = document.querySelector("#mapLoading");
  const key = new URLSearchParams(window.location.search).get("kakaoKey");
  if (!shell || !key) return;

  missionMapReady = true;
  shell.querySelector("iframe")?.remove();
  const canvas = document.createElement("div");
  canvas.className = "real-map-canvas";
  canvas.setAttribute("aria-label", "농동로 209 잔디밭 실제 지도");
  shell.prepend(canvas);
  if (loading) loading.textContent = "지도 불러오는 중...";

  const renderMap = () => {
    if (!window.kakao?.maps) return;
    window.kakao.maps.load(() => {
      const center = new window.kakao.maps.LatLng(missionTarget.lat, missionTarget.lng);
      const map = new window.kakao.maps.Map(canvas, { center, level: 3 });
      const markerSize = new window.kakao.maps.Size(48, 60);
      const markerOffset = new window.kakao.maps.Point(24, 60);
      const markerImage = new window.kakao.maps.MarkerImage(investigationMarkerSrc, markerSize, { offset: markerOffset });
      new window.kakao.maps.Marker({ position: center, title: "농동로 209 잔디밭", image: markerImage }).setMap(map);
      new window.kakao.maps.Circle({
        center,
        radius: reachRadiusMeters,
        strokeWeight: 2,
        strokeColor: "#73f2df",
        strokeOpacity: 0.9,
        fillColor: "#00b8a9",
        fillOpacity: 0.14,
      }).setMap(map);
      if (loading) loading.hidden = true;
    });
  };

  if (window.kakao?.maps) {
    renderMap();
    return;
  }

  const existingScript = document.querySelector("#kakao-map-sdk");
  if (existingScript) {
    existingScript.addEventListener("load", renderMap, { once: true });
    return;
  }

  const script = document.createElement("script");
  script.id = "kakao-map-sdk";
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
  script.async = true;
  script.onload = renderMap;
  script.onerror = () => {
    missionMapReady = false;
    if (loading) loading.textContent = "지도를 불러오지 못했습니다. Kakao JavaScript 키를 확인해 주세요.";
  };
  document.head.appendChild(script);
}

function getDistanceMeters(from, to) {
  const radius = 6371000;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function updateScanStartButton() {
  const button = document.querySelector("#startCameraScan");
  if (!button) return;
  button.disabled = !locationInReach;
  button.classList.toggle("is-ready", locationInReach);
  button.classList.toggle("is-locked", !locationInReach);
  button.textContent = locationInReach ? "카메라로 노란털 조사 시작" : "20m 안에서 조사 시작 가능";
}


function applyMissionLocation(position, options = {}) {
  const location = { lat: position.coords.latitude, lng: position.coords.longitude };
  const distance = getDistanceMeters(location, missionTarget);
  document.querySelector("#distanceText").textContent = `${distance}m`;
  document.querySelector("#locationUpdatedText").textContent = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  locationInReach = distance <= reachRadiusMeters;
  updateScanStartButton();

  if (options.silent) return;
  const status = document.querySelector("#locationStatus");
  status.textContent = locationInReach
    ? "잔디밭 조사 범위에 진입했습니다. 카메라 조사를 시작할 수 있습니다."
    : "아직 조사 범위 밖입니다. 지정된 잔디밭 쪽으로 이동하세요.";
}

function requestMissionLocation(options = {}) {
  const status = document.querySelector("#locationStatus");
  if (!navigator.geolocation) {
    if (!options.silent) status.textContent = "이 브라우저에서는 위치 확인을 사용할 수 없습니다.";
    return;
  }
  if (!options.silent) status.textContent = "현재 위치 확인 중...";
  navigator.geolocation.getCurrentPosition(
    (position) => applyMissionLocation(position, options),
    () => {
      if (!options.silent) status.textContent = "위치 권한을 허용하면 잔디밭 도착 여부를 확인할 수 있습니다.";
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

function startMissionLocationUpdates() {
  if (locationRefreshTimer !== null) return;
  requestMissionLocation({ silent: document.querySelector("#distanceText").textContent !== "위치 확인 필요" });
  locationRefreshTimer = window.setInterval(() => requestMissionLocation({ silent: true }), 10000);
}

function stopMissionLocationUpdates() {
  if (locationRefreshTimer === null) return;
  window.clearInterval(locationRefreshTimer);
  locationRefreshTimer = null;
}

function initWitnessScene() {
  renderDirectionPickers();
  updateWitnessUi();
}

function renderDirectionPickers() {
  witnesses.forEach((witness) => {
    const picker = document.querySelector(`[data-direction-picker="${witness.id}"]`);
    if (!picker || picker.childElementCount) return;
    picker.innerHTML = directionOptions
      .map((direction) => `<button type="button" data-witness-direction="${witness.id}:${direction.key}" disabled>${direction.label}</button>`)
      .join("");
  });
}

function applyWitnessLocation(position, options = {}) {
  const location = { lat: position.coords.latitude, lng: position.coords.longitude };
  document.querySelector("#locationUpdatedText")?.replaceChildren(document.createTextNode(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })));
  const marker = document.querySelector("#witnessUserMarker");
  if (marker) {
    const bounds = { lngMin: 127.0731696575354, lngMax: 127.0752810833212, latMin: 37.54974418972363, latMax: 37.55178211168644 };
    const x = Math.min(94, Math.max(6, ((location.lng - bounds.lngMin) / (bounds.lngMax - bounds.lngMin)) * 100));
    const y = Math.min(94, Math.max(6, (1 - (location.lat - bounds.latMin) / (bounds.latMax - bounds.latMin)) * 100));
    marker.style.left = `${x}%`;
    marker.style.top = `${y}%`;
    marker.hidden = false;
  }

  let arrived = null;
  witnesses.forEach((witness) => {
    const distance = getDistanceMeters(location, witness.location);
    const distanceEl = document.querySelector(`[data-witness-distance="${witness.id}"]`);
    if (distanceEl) distanceEl.textContent = `${distance}m`;
    if (distance <= witnessReachRadiusMeters) arrived = witness;
  });

  if (arrived) {
    activeWitnessId = arrived.id;
    visitedWitnesses[arrived.id] = true;
    if (!options.silent) document.querySelector("#witnessStatus").textContent = `${arrived.name} 위치에 도착했습니다. 진술을 확인하고 바라본 방향을 표시하세요.`;
    updateWitnessUi();
    return;
  }

  if (!options.silent) document.querySelector("#witnessStatus").textContent = "가장 가까운 목격 지점으로 이동하세요. 반경 10m 안에서 진술이 열립니다.";
  updateWitnessUi();
}

function requestWitnessLocation(options = {}) {
  if (!navigator.geolocation) {
    if (!options.silent) document.querySelector("#witnessStatus").textContent = "이 브라우저에서는 위치 확인을 사용할 수 없습니다.";
    return;
  }
  if (!options.silent) document.querySelector("#witnessStatus").textContent = "현재 위치 확인 중...";
  navigator.geolocation.getCurrentPosition(
    (position) => applyWitnessLocation(position, options),
    () => {
      if (!options.silent) document.querySelector("#witnessStatus").textContent = "위치 권한을 허용하면 목격 지점 도착 여부를 확인할 수 있습니다.";
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

function startWitnessLocationUpdates() {
  if (witnessRefreshTimer !== null) return;
  requestWitnessLocation({ silent: true });
  witnessRefreshTimer = window.setInterval(() => requestWitnessLocation({ silent: true }), 10000);
}

function stopWitnessLocationUpdates() {
  if (witnessRefreshTimer === null) return;
  window.clearInterval(witnessRefreshTimer);
  witnessRefreshTimer = null;
}

function selectWitness(id) {
  activeWitnessId = id;
  updateWitnessUi();
}

function markActiveWitnessArrived() {
  visitedWitnesses[activeWitnessId] = true;
  const witness = witnesses.find((item) => item.id === activeWitnessId);
  document.querySelector("#witnessStatus").textContent = `${witness?.name ?? "목격자"} 위치를 관리자 권한으로 도착 처리했습니다.`;
  updateWitnessUi();
}

function chooseWitnessDirection(id, direction) {
  if (!visitedWitnesses[id]) return;
  witnessDirections[id] = direction;
  updateWitnessUi();
}

function updateWitnessUi() {
  witnesses.forEach((witness) => {
    document.querySelector(`[data-witness-card="${witness.id}"]`)?.classList.toggle("is-active", activeWitnessId === witness.id);
    document.querySelector(`[data-witness-card="${witness.id}"]`)?.classList.toggle("is-visited", visitedWitnesses[witness.id]);
    document.querySelector(`[data-witness-map="${witness.id}"]`)?.classList.toggle("is-active", activeWitnessId === witness.id);
    document.querySelector(`[data-witness-map="${witness.id}"]`)?.classList.toggle("is-visited", visitedWitnesses[witness.id]);
    const statement = document.querySelector(`[data-witness-statement="${witness.id}"]`);
    if (statement) statement.textContent = visitedWitnesses[witness.id] ? witness.statement : "현장 반경 10m 안에 들어가면 목격자의 진술과 사진 자료를 확인할 수 있습니다.";
    const photo = document.querySelector(`[data-witness-photo="${witness.id}"]`);
    if (photo) {
      photo.classList.toggle("is-open", visitedWitnesses[witness.id]);
      photo.classList.toggle("is-locked", !visitedWitnesses[witness.id]);
      photo.querySelector("img")?.toggleAttribute("hidden", !visitedWitnesses[witness.id]);
      photo.querySelector("span")?.toggleAttribute("hidden", visitedWitnesses[witness.id]);
    }
    document.querySelectorAll(`[data-witness-direction^="${witness.id}:"]`).forEach((button) => {
      const direction = button.dataset.witnessDirection.split(":")[1];
      button.disabled = !visitedWitnesses[witness.id];
      button.classList.toggle("is-selected", witnessDirections[witness.id] === direction);
    });
  });

  document.querySelector("#visitedWitnessText").textContent = `${Object.values(visitedWitnesses).filter(Boolean).length}/3`;
  document.querySelector("#directionWitnessText").textContent = `${Object.values(witnessDirections).filter(Boolean).length}/3`;
  drawWitnessLines();
  updateWitnessConclusion();
}

function drawWitnessLines() {
  const layer = document.querySelector("#witnessLines");
  if (!layer) return;
  layer.innerHTML = "";
  witnesses.forEach((witness) => {
    const direction = witnessDirections[witness.id];
    if (!direction) return;
    const vector = directionVectors[direction];
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", witness.point.x);
    line.setAttribute("y1", witness.point.y);
    line.setAttribute("x2", witness.point.x + vector.x * 42);
    line.setAttribute("y2", witness.point.y + vector.y * 42);
    if (direction === witness.correctDirection) line.classList.add("is-correct");
    layer.appendChild(line);
  });
}

function updateWitnessConclusion() {
  const solved = witnesses.every((witness) => witnessDirections[witness.id] === witness.correctDirection);
  const conclusion = document.querySelector("#witnessConclusion");
  conclusion.classList.toggle("is-open", solved);
  conclusion.querySelector("span").textContent = solved ? "분석 완료" : "운영본부 분석 대기";
  conclusion.querySelector("strong").textContent = solved ? "세 방향선이 대양타워 상부에서 교차합니다." : "세 목격자의 위치와 방향을 모두 표시하세요.";
  conclusion.querySelector("p").textContent = solved
    ? "세 목격자는 서로 다른 것을 본 게 아니었습니다. 모두 시계탑 상부에서 잔디밭을 내려다보던, 목이 긴 존재를 본 것입니다. 사건 분류를 ‘미확인 생명체 조사’로 전환합니다."
    : "현장 관찰을 바탕으로 목격자가 바라본 방향을 선택하면 지도 위에 추정선이 표시됩니다.";
}

function checkLocation() {
  requestMissionLocation();
}

function completeCameraScan() {
  if (cameraFoundTimer !== null) return;
  const cameraScreen = document.querySelector('[data-screen="camera"]');
  const status = document.querySelector("#cameraStatus");
  cameraScreen?.classList.add("is-found");
  triggerEvidenceVibration();
  if (status) status.textContent = "신호 고정 완료. 노란털 표본을 증거로 확보합니다.";
  cameraFoundTimer = window.setTimeout(() => {
    stopCameraScan();
    showScreen("arrival");
  }, 2600);
}

function updateCameraDistance(position) {
  const distance = getDistanceMeters(
    { lat: position.coords.latitude, lng: position.coords.longitude },
    missionTarget,
  );
  const distanceText = document.querySelector("#distanceText");
  const scanDistanceText = document.querySelector("#scanDistanceText");
  const status = document.querySelector("#cameraStatus");
  if (distanceText) distanceText.textContent = `${distance}m`;
  if (scanDistanceText) scanDistanceText.textContent = `${distance}m / ${clueRevealRadiusMeters}m`;

  if (distance <= clueRevealRadiusMeters) {
    completeCameraScan();
    return;
  }

  if (status) status.textContent = `현재 조사 지점까지 ${distance}m. 10m 안으로 접근하면 노란털 신호가 보입니다.`;
}

async function startCameraScan(options = {}) {
  const status = document.querySelector("#locationStatus");
  const cameraStatus = document.querySelector("#cameraStatus");
  const cameraScreen = document.querySelector('[data-screen="camera"]');
  const video = document.querySelector("#cameraFeed");

  if (!options.adminOverride && !locationInReach) {
    status.textContent = "조사 지점 반경 20m 안에 들어오면 카메라 조사를 시작할 수 있습니다.";
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    status.textContent = "이 브라우저에서는 카메라 조사를 사용할 수 없습니다.";
    return;
  }
  if (!navigator.geolocation && !options.adminOverride) {
    status.textContent = "위치 확인을 사용할 수 없어 조사 범위 판정을 할 수 없습니다.";
    return;
  }

  stopCameraScan();
  cameraScreen?.classList.remove("is-found");
  if (cameraStatus) cameraStatus.textContent = "카메라 권한을 요청하는 중...";
  const scanDistanceText = document.querySelector("#scanDistanceText");
  if (scanDistanceText) scanDistanceText.textContent = "측정 중";
  showScreen("camera");

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    video.srcObject = cameraStream;
    await video.play();
    if (cameraStatus) {
      cameraStatus.textContent = options.adminOverride
        ? "관리자 권한으로 AR 카메라를 실행했습니다. 단서 발견 버튼으로 결과를 확인할 수 있습니다."
        : "잔디밭 아래쪽을 천천히 비춰 주세요. 10m 안으로 접근하면 신호가 반응합니다.";
    }
    if (navigator.geolocation) {
      cameraWatch = navigator.geolocation.watchPosition(
        updateCameraDistance,
        () => {
          if (cameraStatus) cameraStatus.textContent = "위치 권한을 허용하면 노란털 신호를 감지할 수 있습니다.";
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
      );
    }
  } catch {
    stopCameraScan();
    status.textContent = "카메라 권한을 허용하면 잔디밭 조사 화면을 열 수 있습니다.";
    showScreen("mission");
  }
}

function startDropLinkTyping() {
  const typeTarget = document.querySelector("#dropLinkType");
  const nextButton = document.querySelector("#closeDropLinkModal");
  window.clearInterval(dropLinkTyper);
  typeTarget.textContent = "";
  const cursor = document.createElement("i");
  cursor.setAttribute("aria-hidden", "true");
  typeTarget.appendChild(cursor);
  nextButton.disabled = true;

  const currentBriefing = dropLinkBriefings[dropLinkLine];
  nextButton.textContent = dropLinkLine < dropLinkBriefings.length - 1 ? "다음" : "사건 개요 수신";

  let index = 0;
  dropLinkTyper = window.setInterval(() => {
    index += 1;
    typeTarget.textContent = currentBriefing.slice(0, index);
    typeTarget.appendChild(cursor);
    if (index >= currentBriefing.length) {
      window.clearInterval(dropLinkTyper);
      nextButton.disabled = false;
    }
  }, 34);
}

document.addEventListener("click", (event) => {
  const goButton = event.target.closest("[data-go]");
  if (goButton) {
    showScreen(goButton.dataset.go);
    return;
  }

  if (event.target.closest("#checkLocation")) {
    checkLocation();
    return;
  }

  if (event.target.closest("#checkWitnessLocation")) {
    requestWitnessLocation();
    return;
  }

  if (event.target.closest("#adminArriveWitness")) {
    markActiveWitnessArrived();
    return;
  }

  const witnessSelect = event.target.closest("[data-select-witness], [data-witness-map]");
  if (witnessSelect) {
    selectWitness(witnessSelect.dataset.selectWitness || witnessSelect.dataset.witnessMap);
    return;
  }

  const witnessDirection = event.target.closest("[data-witness-direction]");
  if (witnessDirection) {
    const [id, direction] = witnessDirection.dataset.witnessDirection.split(":");
    chooseWitnessDirection(id, direction);
    return;
  }

  if (event.target.closest("#startCameraScan")) {
    startCameraScan();
    return;
  }

  if (event.target.closest("#adminStartCameraScan")) {
    startCameraScan({ adminOverride: true });
    return;
  }

  if (event.target.closest("#adminFindClue")) {
    completeCameraScan();
    return;
  }

  const closeDropLinkModal = event.target.closest("#closeDropLinkModal");
  if (closeDropLinkModal) {
    if (closeDropLinkModal.disabled) return;
    if (dropLinkLine < dropLinkBriefings.length - 1) {
      dropLinkLine += 1;
      startDropLinkTyping();
      return;
    }

    const modal = document.querySelector("#dropLinkModal");
    window.clearInterval(dropLinkTyper);
    closeDropLinkModal.disabled = true;
    modal.classList.add("is-transfer");
    window.setTimeout(() => {
      modal.hidden = true;
      modal.classList.remove("is-transfer");
      messageStep = 0;
      dropLinkLine = 0;
      showScreen("mission");
    }, 1500);
    return;
  }

  const unknownMessage = event.target.closest("#unknownMessage");
  if (unknownMessage) {
    if (messageStep === 0) {
      dropLinkLine = 0;
      document.querySelector("#dropLinkModal").hidden = false;
      startDropLinkTyping();
    } else {
      showScreen("mission");
    }
    return;
  }
});

const posterId = new URLSearchParams(window.location.search).get("poster_id") ?? "student_hall";
document.querySelector("#posterSource").textContent = posterCopy[posterId] ?? posterCopy.student_hall;
showScreen("entry");
