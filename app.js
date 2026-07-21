const app = document.querySelector("#app");
const screens = [...document.querySelectorAll("[data-screen]")];
const reachRadiusMeters = 20;
const clueRevealRadiusMeters = 10;
const witnessReachRadiusMeters = 10;
const missionTarget = { lat: 37.55041617275794, lng: 127.07381801425053 };
const investigationMarkerSrc = "./investigation-marker-v2.png";
const witnesses = [
  {
    id: "A",
    name: "기록 03",
    recordTitle: "익명 게시판의 목격담",
    place: "잔디밭 남서쪽",
    location: { lat: 37.55009418972363, lng: 127.0736196575354 },
    photo: "./gfPhoto_03.png",
    piece: "FE",
    correctDirection: "N",
    point: { x: 21.31, y: 80.35 },
  },
  {
    id: "B",
    name: "기록 02",
    recordTitle: "동아리 회지의 삽화",
    place: "북쪽 보행로",
    location: { lat: 37.55143211168644, lng: 127.07371716568217 },
    photo: "./gfPhoto_02.png",
    piece: "AF",
    correctDirection: "SE",
    point: { x: 25.93, y: 15.65 },
  },
  {
    id: "C",
    name: "기록 01",
    recordTitle: "오래된 학생수첩의 낙서",
    place: "동쪽 진입로",
    location: { lat: 37.550652047104954, lng: 127.0748310833212 },
    photo: "./gfPhoto_01.png",
    piece: "GIR",
    correctDirection: "NW",
    point: { x: 78.69, y: 53.37 },
  },
];
const correctWitnessOrder = ["C", "B", "A"];
const dropLinkBriefings = [
  "사용자 인증 완료. 임시 현장 조사원으로 등록합니다. 사건 번호 CD-SJ-01, 사건명 시계탑 대형 생물 목격 사건.",
  "세종대학교에는 오래된 소문이 하나 있습니다. 시계탑 꼭대기에는 기린이 산다. 본부는 목격 신고 7건을 근거로 현장 조사가 필요하다고 판단했습니다.",
];
const clueTransmissionBriefings = [
  "증거물 전송이 완료되었습니다.",
  "확보된 노란 털의 주인을 특정할 수 없습니다.",
  "시계탑 주변에서 접수된 과거 기록을 조회합니다.",
  "CAMPUSDROP 기록 저장소 분석 중...",
  "서로 다른 시기에 작성된 관련 기록 세 건이 발견되었습니다.",
  "일부 정보가 손상되어 기록의 정확한 순서를 확인할 수 없습니다.",
  "에너지 반응이 강한 지점 3곳을 지도상에 표시했습니다. 각 목적지 반경 10m 안에 진입해 현장 자료 이미지를 확보하세요.",
];
const witnessArrangeBriefings = [
  "자료 이미지 3건이 모두 확보됐습니다.",
  "[CAMPUSDROP 기록 분석 지시] 획득한 세 건의 기록을 분석하십시오.",
  "기록의 형태와 내용을 확인하고, 오래된 기록부터 순서대로 배치하십시오.",
];
const posterCopy = {
  student_hall: "학생회관 포스터를 통해 접속했습니다. 창문 뒤로 긴 그림자를 봤다는 제보가 남아 있습니다.",
  library: "학술정보원 포스터를 통해 접속했습니다. 새벽 시간대 시계탑 꼭대기 목격 신고가 반복됐습니다.",
  gate: "정문 포스터를 통해 접속했습니다. 최근 30일 동안 같은 소문과 관련된 신고가 7건 접수됐습니다.",
};
let messageStep = 0;
let dropLinkTyper = null;
let dropLinkLine = 0;
let dropLinkMode = "case";
let evidenceSending = false;
let evidenceProgress = 0;
let evidenceTimer = null;
let missionMapReady = false;
let witnessMapReady = false;
let locationRefreshTimer = null;
let locationInReach = false;
let witnessRefreshTimer = null;
let activeWitnessId = "A";
let visitedWitnesses = { A: false, B: false, C: false };
let witnessOrder = ["A", "C", "B"];
let selectedOrderCardId = null;
let witnessOrderSubmitted = false;
let witnessOrderFeedback = "기록을 오래된 순서대로 배치한 뒤 분석을 요청하세요.";
let witnessWordAnswer = "";
let witnessAnswerFeedback = "기록 배열이 확인되면 보고 입력창이 열립니다.";
let witnessAnswerSubmitted = false;
let draggedWitnessId = null;
let cameraStream = null;
let cameraWatch = null;
let cameraFoundTimer = null;
let arrangeBriefingQueued = false;

function triggerDropLinkVibration() {
  if (typeof navigator.vibrate !== "function") return;
  navigator.vibrate([70, 45, 110]);
}

function triggerEvidenceVibration() {
  if (typeof navigator.vibrate !== "function") return;
  navigator.vibrate([45, 35, 70, 45, 130]);
}

function getActiveDropLinkBriefings() {
  if (dropLinkMode === "case") return dropLinkBriefings;
  if (dropLinkMode === "clue") return clueTransmissionBriefings;
  return witnessArrangeBriefings;
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
  shell.querySelectorAll(".mission-fallback-overlay").forEach((item) => item.remove());
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
  initWitnessMap();
  updateWitnessUi();
}

function initWitnessMap() {
  if (witnessMapReady) return;
  const shell = document.querySelector("#witnessMap");
  const loading = document.querySelector("#witnessMapLoading");
  const key = new URLSearchParams(window.location.search).get("kakaoKey");
  if (!shell || !key) return;

  witnessMapReady = true;
  shell.querySelector("iframe")?.remove();
  shell.querySelector("#witnessLines")?.remove();
  shell.querySelector(".tower-target-marker")?.remove();
  shell.querySelectorAll("[data-witness-map]").forEach((item) => item.remove());
  shell.querySelector("#witnessUserMarker")?.remove();
  shell.querySelector(".witness-map-panel")?.remove();
  const canvas = document.createElement("div");
  canvas.className = "real-map-canvas";
  canvas.setAttribute("aria-label", "에너지 지점 실제 지도");
  shell.prepend(canvas);
  if (loading) loading.textContent = "지도 불러오는 중...";

  const renderMap = () => {
    if (!window.kakao?.maps) return;
    window.kakao.maps.load(() => {
      const center = new window.kakao.maps.LatLng(37.55106257128708, 127.07392616012359);
      const map = new window.kakao.maps.Map(canvas, { center, level: 3 });
      witnesses.forEach((witness) => {
        const marker = document.createElement("button");
        marker.type = "button";
        marker.className = `witness-map-marker${activeWitnessId === witness.id ? " is-active" : ""}${visitedWitnesses[witness.id] ? " is-visited" : ""}`;
        marker.dataset.witnessOverlay = witness.id;
        marker.textContent = witness.id;
        marker.setAttribute("aria-label", `${witness.name} 위치`);
        marker.addEventListener("click", () => selectWitness(witness.id));
        const position = new window.kakao.maps.LatLng(witness.location.lat, witness.location.lng);
        new window.kakao.maps.CustomOverlay({ position, content: marker, xAnchor: 0.5, yAnchor: 0.5 }).setMap(map);
      });
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
    witnessMapReady = false;
    if (loading) loading.textContent = "지도를 불러오지 못했습니다. Kakao JavaScript 키를 확인해 주세요.";
  };
  document.head.appendChild(script);
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
    acquireWitnessEvidence(arrived.id, options);
    return;
  }

  if (!options.silent) document.querySelector("#witnessStatus").textContent = "가장 가까운 에너지 지점으로 이동하세요. 반경 10m 안에서 자료 이미지가 열립니다.";
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

function acquireWitnessEvidence(id, options = {}) {
  const witness = witnesses.find((item) => item.id === id);
  if (!witness) return;
  activeWitnessId = witness.id;
  if (visitedWitnesses[witness.id]) {
    if (!options.silent) document.querySelector("#witnessStatus").textContent = `${witness.name} 자료 이미지는 이미 확보했습니다. 자료 이미지를 확인하고 순서를 배열하세요.`;
    updateWitnessUi();
    return;
  }

  visitedWitnesses[witness.id] = true;
  triggerEvidenceVibration();
  document.querySelector("#witnessStatus").textContent = `${witness.name} 자료 이미지를 확보했습니다. 획득 자료를 확인하세요.`;
  openWitnessAcquisition(witness);
  if (witnesses.every((item) => visitedWitnesses[item.id])) arrangeBriefingQueued = true;
  updateWitnessUi();
}

function openWitnessAcquisition(witness) {
  const modal = document.querySelector("#witnessAcquisitionModal");
  const title = document.querySelector("#witnessAcquisitionTitle");
  const photo = document.querySelector("#witnessAcquisitionPhoto");
  if (!modal || !title || !photo) return;
  title.textContent = `${witness.name} 자료 이미지 획득`;
  photo.style.backgroundImage = `url(${witness.photo})`;
  photo.setAttribute("aria-label", `${witness.name} 자료 이미지`);
  modal.hidden = false;
}

function closeWitnessAcquisition() {
  const modal = document.querySelector("#witnessAcquisitionModal");
  if (modal) modal.hidden = true;
  if (!arrangeBriefingQueued) return;
  arrangeBriefingQueued = false;
  window.setTimeout(() => {
    dropLinkMode = "arrange";
    dropLinkLine = 0;
    document.querySelector("#dropLinkModal").hidden = false;
    startDropLinkTyping();
    triggerDropLinkVibration();
  }, 260);
}

function markActiveWitnessArrived() {
  acquireWitnessEvidence(activeWitnessId, { admin: true });
}

function updateWitnessUi() {
  witnesses.forEach((witness) => {
    document.querySelector(`[data-witness-card="${witness.id}"]`)?.classList.toggle("is-active", activeWitnessId === witness.id);
    document.querySelector(`[data-witness-card="${witness.id}"]`)?.classList.toggle("is-visited", visitedWitnesses[witness.id]);
    document.querySelector(`[data-witness-map="${witness.id}"]`)?.classList.toggle("is-active", activeWitnessId === witness.id);
    document.querySelector(`[data-witness-map="${witness.id}"]`)?.classList.toggle("is-visited", visitedWitnesses[witness.id]);
    document.querySelector(`[data-witness-overlay="${witness.id}"]`)?.classList.toggle("is-active", activeWitnessId === witness.id);
    document.querySelector(`[data-witness-overlay="${witness.id}"]`)?.classList.toggle("is-visited", visitedWitnesses[witness.id]);
    const photo = document.querySelector(`[data-witness-photo="${witness.id}"]`);
    if (photo) {
      photo.classList.toggle("is-open", visitedWitnesses[witness.id]);
      photo.classList.toggle("is-locked", !visitedWitnesses[witness.id]);
      photo.querySelector("img")?.toggleAttribute("hidden", !visitedWitnesses[witness.id]);
      photo.querySelector("span")?.toggleAttribute("hidden", visitedWitnesses[witness.id]);
    }
    const title = document.querySelector(`[data-witness-title="${witness.id}"]`);
    if (title) title.textContent = visitedWitnesses[witness.id] ? witness.recordTitle : witness.place;
    const name = document.querySelector(`[data-witness-name="${witness.id}"]`);
    if (name) name.textContent = witness.name;
  });

  document.querySelector("#visitedWitnessText").textContent = `${Object.values(visitedWitnesses).filter(Boolean).length}/3`;
  document.querySelector("#directionWitnessText").textContent = witnessOrderSubmitted ? "완료" : `${witnessOrder.filter((id) => visitedWitnesses[id]).length}/3`;
  renderOrderQuiz();
  updateWitnessConclusion();
}

function renderOrderQuiz() {
  const panel = document.querySelector("#orderQuizPanel");
  const zone = document.querySelector("#orderDropzone");
  if (!panel || !zone) return;
  const allVisited = witnesses.every((witness) => visitedWitnesses[witness.id]);
  panel.hidden = !allVisited;
  if (!allVisited) return;
  zone.innerHTML = witnessOrder.map((id, index) => {
    const witness = witnesses.find((item) => item.id === id);
    return `<article class="order-card${selectedOrderCardId === id ? " is-selected" : ""}${witnessOrderSubmitted ? " is-locked" : ""}" draggable="${witnessOrderSubmitted ? "false" : "true"}" data-order-card="${id}"><span>${String(index + 1).padStart(2, "0")}</span><div style="background-image:url(${witness.photo})" role="img" aria-label="${witness.name} 자료 이미지"></div><strong>${witness.name}</strong><small>${witness.recordTitle}</small><button type="button" data-preview-witness="${id}">확대</button></article>`;
  }).join("");
  document.querySelector("#letterChain").hidden = !witnessOrderSubmitted;
  document.querySelector("#letterChain").innerHTML = witnessOrder.map((id, index) => {
    const witness = witnesses.find((item) => item.id === id);
    return `<span>${witness.piece}${index < witnessOrder.length - 1 ? "<b>+</b>" : ""}</span>`;
  }).join("");
  document.querySelector("#submitOrderButton").disabled = witnessOrderSubmitted;
  const wordPanel = document.querySelector("#wordReportPanel");
  wordPanel.hidden = !witnessOrderSubmitted;
  const input = document.querySelector("#witnessWordAnswer");
  if (input && input.value !== witnessWordAnswer) input.value = witnessWordAnswer;
  document.querySelector("#orderFeedback").textContent = witnessOrderFeedback;
  document.querySelector("#orderFeedback").classList.toggle("is-correct", witnessOrderSubmitted);
  document.querySelector("#answerFeedback").textContent = witnessAnswerFeedback;
  document.querySelector("#answerFeedback").classList.toggle("is-correct", witnessAnswerSubmitted);
  document.querySelector("#submitAnswerButton").disabled = witnessAnswerSubmitted;
}

function resetWitnessAnalysis() {
  witnessOrderSubmitted = false;
  witnessAnswerSubmitted = false;
  witnessWordAnswer = "";
  witnessAnswerFeedback = "기록 배열이 확인되면 보고 입력창이 열립니다.";
  witnessOrderFeedback = "기록을 오래된 순서대로 배치한 뒤 분석을 요청하세요.";
}

function swapWitnessOrder(sourceId, targetId) {
  if (sourceId === targetId || witnessOrderSubmitted) return;
  resetWitnessAnalysis();
  const next = [...witnessOrder];
  const sourceIndex = next.indexOf(sourceId);
  const targetIndex = next.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
  witnessOrder = next;
}

function selectOrderCard(id) {
  if (witnessOrderSubmitted) return;
  if (!selectedOrderCardId) {
    selectedOrderCardId = id;
    witnessOrderFeedback = "교환할 두 번째 기록 카드를 선택하세요.";
    updateWitnessUi();
    return;
  }
  swapWitnessOrder(selectedOrderCardId, id);
  selectedOrderCardId = null;
  updateWitnessUi();
}

function submitWitnessOrder() {
  if (!witnesses.every((witness) => visitedWitnesses[witness.id])) return;
  if (witnessOrder.join("") !== correctWitnessOrder.join("")) {
    witnessOrderFeedback = "기록 사이의 시간적 연결을 확인할 수 없습니다. 증거물의 형태와 기록 방식을 다시 분석하십시오.";
    updateWitnessUi();
    return;
  }
  witnessOrderSubmitted = true;
  selectedOrderCardId = null;
  witnessOrderFeedback = "기록의 시간적 배열이 확인되었습니다. 각 기록에 포함된 식별 문자를 연결하십시오.";
  witnessAnswerFeedback = "세 기록에 공통으로 등장하는 생물을 영문으로 보고하십시오.";
  updateWitnessUi();
}

function submitWitnessAnswer() {
  if (!witnessOrderSubmitted) return;
  const normalized = witnessWordAnswer.trim().toUpperCase();
  if (witnessWordAnswer.trim() === "기린") {
    witnessAnswerFeedback = "국제 생물 분류 기록을 위해 영문 명칭이 필요합니다.";
    updateWitnessUi();
    return;
  }
  if (normalized !== "GIRAFFE") {
    witnessAnswerFeedback = "보고된 명칭이 확보된 증거물과 일치하지 않습니다.";
    updateWitnessUi();
    return;
  }
  witnessAnswerSubmitted = true;
  witnessAnswerFeedback = "분석 결과가 등록되었습니다.";
  updateWitnessUi();
}

function openEvidencePreview(id) {
  const witness = witnesses.find((item) => item.id === id);
  if (!witness) return;
  document.querySelector("#evidencePreviewTitle").textContent = witness.name;
  document.querySelector("#evidencePreviewSubtitle").textContent = witness.recordTitle;
  const photo = document.querySelector("#evidencePreviewPhoto");
  photo.style.backgroundImage = `url(${witness.photo})`;
  photo.setAttribute("aria-label", `${witness.name} 확대 이미지`);
  document.querySelector("#evidencePreviewModal").hidden = false;
}

function updateWitnessConclusion() {
  const allVisited = witnesses.every((witness) => visitedWitnesses[witness.id]);
  const conclusion = document.querySelector("#witnessConclusion");
  conclusion.classList.toggle("is-open", witnessAnswerSubmitted);
  conclusion.querySelector("span").textContent = witnessAnswerSubmitted ? "조사 결과 갱신" : "운영본부 분석 대기";
  conclusion.querySelector("strong").textContent = witnessAnswerSubmitted ? "시계탑의 기린은 최근에 처음 나타난 존재가 아닐 가능성이 있습니다." : allVisited ? "자료 이미지를 오래된 순서대로 배열하세요." : "세 지점의 자료 이미지를 모두 확보하세요.";
  conclusion.querySelector("p").textContent = witnessAnswerSubmitted
    ? "분석 결과가 등록되었습니다. 확인된 생물: GIRAFFE. 세 기록은 서로 다른 시기에 작성되었고, 작성자 사이의 직접적인 연관성은 확인되지 않습니다. 그러나 모든 기록에는 시계탑 상부에 나타난 긴 목의 기린이 묘사되어 있습니다."
    : allVisited ? "배열이 확인되기 전에는 생물명 보고 입력창이 열리지 않습니다." : "각 에너지 지점 반경 10m 안에 들어가야 자료 이미지가 열립니다.";
}

function updateEvidenceTransmissionUi() {
  const modal = document.querySelector("#transmissionModal");
  const progressBar = document.querySelector("#evidenceProgressBar");
  const progressText = document.querySelector("#evidenceProgressText");
  const title = document.querySelector("#transmissionModalTitle");
  const copy = document.querySelector("#transmissionModalCopy");
  if (modal) modal.hidden = !evidenceSending;
  if (title) title.textContent = evidenceProgress >= 100 ? "본부 수신 완료" : "표본을 운영본부로 전송 중";
  if (copy) copy.textContent = evidenceProgress >= 100 ? "분석 채널을 연결합니다." : "노란 털 표본 이미지와 위치 기록을 묶어 보안 전송합니다.";
  if (progressBar) progressBar.style.width = `${evidenceProgress}%`;
  if (progressText) progressText.textContent = `${evidenceProgress}%`;
  document.querySelectorAll("[data-transmission-step]").forEach((step) => {
    const threshold = Number(step.dataset.transmissionStep);
    if (threshold === 100) step.textContent = evidenceProgress >= 100 ? "수신 확인" : evidenceSending ? "전송 중" : "대기";
    else step.textContent = evidenceProgress >= threshold ? "완료" : "대기";
  });
  const button = document.querySelector("#sendEvidenceButton");
  if (button) {
    button.disabled = evidenceSending;
    button.textContent = evidenceSending ? "표본 전송 중..." : "표본 전송하기";
  }
}

function startEvidenceTransmission() {
  if (evidenceSending) return;
  triggerDropLinkVibration();
  evidenceSending = true;
  evidenceProgress = 0;
  updateEvidenceTransmissionUi();
  if (evidenceTimer !== null) window.clearInterval(evidenceTimer);
  evidenceTimer = window.setInterval(() => {
    evidenceProgress = Math.min(100, evidenceProgress + 1);
    updateEvidenceTransmissionUi();
    if (evidenceProgress >= 100) {
      window.clearInterval(evidenceTimer);
      evidenceTimer = null;
      window.setTimeout(() => {
        evidenceSending = false;
        updateEvidenceTransmissionUi();
        showScreen("witness");
        dropLinkMode = "clue";
        dropLinkLine = 0;
        document.querySelector("#dropLinkModal").hidden = false;
        startDropLinkTyping();
        triggerDropLinkVibration();
      }, 2000);
    }
  }, 50);
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

  const activeBriefings = getActiveDropLinkBriefings();
  const currentBriefing = activeBriefings[dropLinkLine];
  nextButton.textContent = dropLinkLine < activeBriefings.length - 1 ? "다음" : dropLinkMode === "case" ? "사건 개요 수신" : dropLinkMode === "arrange" ? "배열 미션 시작" : "2장으로 이동";

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

document.addEventListener("dragstart", (event) => {
  const card = event.target.closest("[data-order-card]");
  if (!card || witnessOrderSubmitted) return;
  draggedWitnessId = card.dataset.orderCard;
  card.classList.add("is-dragging");
});

document.addEventListener("dragover", (event) => {
  if (event.target.closest("[data-order-card]")) event.preventDefault();
});

document.addEventListener("drop", (event) => {
  const card = event.target.closest("[data-order-card]");
  if (!card || !draggedWitnessId || draggedWitnessId === card.dataset.orderCard) return;
  const next = witnessOrder.filter((id) => id !== draggedWitnessId);
  next.splice(next.indexOf(card.dataset.orderCard), 0, draggedWitnessId);
  witnessOrder = next;
  draggedWitnessId = null;
  updateWitnessUi();
});

document.addEventListener("dragend", () => {
  draggedWitnessId = null;
  document.querySelectorAll(".order-card.is-dragging").forEach((card) => card.classList.remove("is-dragging"));
});

document.addEventListener("input", (event) => {
  if (event.target.matches("#witnessWordAnswer")) {
    witnessWordAnswer = event.target.value;
    updateWitnessUi();
  }
});

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

  const previewButton = event.target.closest("[data-preview-witness]");
  if (previewButton) {
    openEvidencePreview(previewButton.dataset.previewWitness);
    return;
  }

  if (event.target.closest("#closeEvidencePreview")) {
    document.querySelector("#evidencePreviewModal").hidden = true;
    return;
  }

  if (event.target.closest("#submitOrderButton")) {
    submitWitnessOrder();
    return;
  }

  if (event.target.closest("#submitAnswerButton")) {
    submitWitnessAnswer();
    return;
  }

  const orderCard = event.target.closest("[data-order-card]");
  if (orderCard && !event.target.closest("[data-preview-witness]")) {
    selectOrderCard(orderCard.dataset.orderCard);
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

  if (event.target.closest("#sendEvidenceButton")) {
    startEvidenceTransmission();
    return;
  }

  if (event.target.closest("#closeWitnessAcquisition")) {
    closeWitnessAcquisition();
    return;
  }

  const closeDropLinkModal = event.target.closest("#closeDropLinkModal");
  if (closeDropLinkModal) {
    if (closeDropLinkModal.disabled) return;
    const activeBriefings = getActiveDropLinkBriefings();
    if (dropLinkLine < activeBriefings.length - 1) {
      dropLinkLine += 1;
      startDropLinkTyping();
      return;
    }

    const modal = document.querySelector("#dropLinkModal");
    window.clearInterval(dropLinkTyper);
    closeDropLinkModal.disabled = true;
    if (dropLinkMode === "clue") {
      modal.hidden = true;
      messageStep = 0;
      dropLinkLine = 0;
      dropLinkMode = "case";
      closeDropLinkModal.disabled = false;
      showScreen("witness");
      return;
    }
    modal.classList.add("is-transfer");
    window.setTimeout(() => {
      modal.hidden = true;
      modal.classList.remove("is-transfer");
      messageStep = 0;
      dropLinkLine = 0;
      showScreen(dropLinkMode === "case" ? "mission" : "witness");
      dropLinkMode = "case";
      closeDropLinkModal.disabled = false;
    }, 1500);
    return;
  }

  const unknownMessage = event.target.closest("#unknownMessage");
  if (unknownMessage) {
    if (messageStep === 0) {
      dropLinkMode = "case";
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
