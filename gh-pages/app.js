const app = document.querySelector("#app");
const screens = [...document.querySelectorAll("[data-screen]")];
const reachRadiusMeters = 20;
const clueRevealRadiusMeters = 10;
const witnessReachRadiusMeters = 10;
const missionTarget = { lat: 37.55041617275794, lng: 127.07381801425053 };
const DEFAULT_KAKAO_JAVASCRIPT_KEY = "97b8390b5c4e8c53f8504d89c5a5c8f4";
const investigationMarkerSrc = "./investigation-marker-v2.png";
const witnesses = [
  {
    id: "A",
    name: "기록 03",
    recordTitle: "익명 게시판의 목격담",
    place: "잔디밭 남서쪽",
    location: { lat: 37.55009418972363, lng: 127.0736196575354 },
    photo: "./gfPhoto_03.png",
    emptyPhoto: "./gfPhoto_03-no-giraffe.png",
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
    emptyPhoto: "./gfPhoto_02-no-giraffe.png",
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
    emptyPhoto: "./gfPhoto_01-no-giraffe.png",
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
  "[DROPLINK] 증거물 전송이 완료되었습니다.",
  "[DROPLINK] 확보된 노란 털의 생물학적 분류를 확인할 수 없습니다.",
  "[DROPLINK] 시계탑 주변에서 접수된 과거 기록을 조회합니다.",
  "[DROPLINK] 기록 저장소 분석 중...",
  "[DROPLINK] 관련 가능성이 있는 기록 세 건을 확인했습니다.",
  "[DROPLINK] 기록의 작성 시점 정보가 일부 손상되어 있습니다.",
  "[운영본부] 세 기록의 형태와 내용을 비교해 시간적 순서를 복원하십시오.",
  "[DROPLINK] 에너지 반응이 강한 지점 3곳을 지도상에 표시했습니다. 각 목적지 반경 10m 안에 진입해 현장 자료 이미지를 확보하세요.",
];
const witnessArrangeBriefings = [
  "[DROPLINK] 자료 이미지 3건이 모두 확보되었습니다.",
  "[DROPLINK] [기록 분석 지시]",
  "[DROPLINK] 획득한 기록을 오래된 순서대로 배치하십시오.",
];
const chapterThreeBriefings = [
  "[DROPLINK] 분석 결과가 등록되었습니다.",
  "[DROPLINK] 확인된 생물: GIRAFFE",
  "[DROPLINK] 세 기록은 서로 다른 시기에 작성되었습니다.",
  "[DROPLINK] 기록 작성자 사이의 직접적인 연관성은 확인되지 않습니다.",
  "[운영본부] 모든 기록은 시계탑 상부에 나타난 긴 목의 기린을 묘사하고 있습니다.",
  "[운영본부] 해당 개체가 최근에 처음 나타난 것은 아닐 가능성이 있습니다.",
  "[운영본부] 기록 사이에 추가적인 차이가 있는지 계속 조사하십시오.",
  "[DROPLINK] [증거물 추가 분석 지시]",
  "[DROPLINK] 획득한 세 건의 증거물을 시간순으로 비교하십시오.",
  "[DROPLINK] 개체의 외형에서 달라진 점이나 특별한 특징이 발견된다면 해당 요소를 영문으로 보고하십시오.",
];
const chapterFourBriefings = [
  "강조 단어가 확인되었습니다.",
  "[DROPLINK] 최초 학생수첩의 기록은 일반적인 목격 보고와 형식이 다릅니다.",
  "[DROPLINK] 작성자는 탑을 바라보며 기린이 있는 모습을 떠올렸습니다.",
  "[DROPLINK] 이후 기록에서는 유사한 개체가 반복해서 나타납니다.",
  "[DROPLINK] 기록 사이의 관계는 확인되지 않았습니다.",
  "[운영본부] 최초 기록의 내용이 다른 학생들에게 전달되었을 가능성이 있습니다.",
  "[운영본부] 현재 자료만으로는 기록 사이의 관계를 확정할 수 없습니다.",
  "[DROPLINK] 증거물 상태 변화가 감지되었습니다.",
  "[DROPLINK] 기록 재호출 상태를 확인합니다.",
  "[DROPLINK] 배경과 문자 정보에는 변화가 없습니다.",
  "[DROPLINK] 개체로 분류된 영역에서만 정보 손실이 확인됩니다.",
  "[DROPLINK] 원인은 확인되지 않았습니다.",
];
const chapterFiveBriefings = [
  "[DROPLINK] 개체 정보가 다시 감소하고 있습니다.",
  "[DROPLINK] 현재 방식으로는 복원 상태를 유지할 수 없습니다.",

  "[DROPLINK] 잔류 패턴의 출처는 시계탑 인근으로 추정됩니다.",
  "[DROPLINK] 현장 추가 조사가 필요합니다.",
  "[DROPLINK] [현장 조사 지시]",
  "[DROPLINK] 시계탑 인근에서 잔류 패턴과 일치하는 이미지를 찾으십시오.",
  "[DROPLINK] 발견한 이미지를 DROPLINK 카메라로 조사하십시오.",
];
const chapterThreeRecords = correctWitnessOrder.map((id) => witnesses.find((witness) => witness.id === id));
const emptyRecordMasks = {
  C: { x: 32, y: 18, width: 40, height: 54, radius: 28 },
  B: { x: 24, y: 28, width: 42, height: 48, radius: 27 },
  A: { x: 35, y: 45, width: 34, height: 38, radius: 25 },
};
const giraffeQuestions = [
  { key: "origin", label: "너는 어디서 왔어?", answer: "처음에는 누군가 탑을 보다가 떠올린 작은 생각이었어. 그다음부터 여러 사람이 나를 조금씩 다르게 상상해줬어." },
  { key: "star", label: "별 모양은 어떻게 생긴 거야?", answer: "처음부터 있던 건 아니야. 누군가 나에게 별이 있으면 좋겠다고 생각했어. 그 뒤부터 정말로 생겼어." },
  { key: "fade", label: "왜 기록에서 사라졌어?", answer: "사람들이 더 이상 나를 떠올리지 않으면 내 모습도 흐려져. 그림 속에서도, 여기에서도 조금씩 보이지 않게 돼." },
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
let missionKakaoMap = null;
let witnessKakaoMap = null;
let missionUserLocationOverlay = null;
let witnessUserLocationOverlay = null;
let currentUserLocation = null;
let locationRefreshTimer = null;
let locationInReach = false;
let witnessRefreshTimer = null;
let activeWitnessId = "A";
let visitedWitnesses = { A: false, B: false, C: false };
let witnessOrder = ["A", "C", "B"];
let selectedOrderCardId = null;
let witnessOrderSubmitted = false;
let witnessOrderAnalyzing = false;
let witnessOrderFailed = false;
let witnessOrderFeedback = "기록을 오래된 순서대로 배치한 뒤 분석을 요청하세요.";
let witnessWordAnswer = "";
let witnessAnswerFeedback = "기록 배열이 확인되면 보고 입력창이 열립니다.";
let witnessAnswerSubmitted = false;
let witnessReportSending = false;
let witnessReportProgress = 0;
let witnessReportTimer = null;
let draggedWitnessId = null;
let orderPointerStart = null;
let cameraStream = null;
let cameraWatch = null;
let cameraFoundTimer = null;
let arrangeBriefingQueued = false;
let chapterThreePreviewIndex = 0;
let starAnswer = "";
let starSolved = false;
let starFeedback = "기록 속 개체의 외형에서 달라진 특징을 영문으로 보고하십시오.";
let restoreProgress = 0;
let restoreSolved = false;
let restoreTouchedPoints = new Set();
let imagineAnswer = "";
let imagineFeedback = "복원된 페이지에서 강조된 단어를 확인하십시오.";
let imagineSolved = false;
let emptyAutoProgress = 0;
let emptyAutoTimer = null;
let activeEmptyRecordId = "C";
let emptyRecordHits = { A: false, B: false, C: false };
let emptyRecordFeedback = "비어 있는 기록을 선택하고 기존 위치를 지정하세요.";
let emptyRecordComplete = false;
let finalScanStarted = false;
let finalScanProgress = 0;
let finalScanMatched = false;
let finalScanStatus = "잔류 패턴과 일치하는 특별 이미지를 찾아 카메라 중앙에 맞추세요.";
let finalScanTimer = null;
let answeredGiraffeQuestions = { origin: false, star: false, fade: false };
let activeGiraffeQuestion = null;
let observationText = "";
let observationSubmitted = false;
let finalResponse = "";

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
  if (dropLinkMode === "arrange") return witnessArrangeBriefings;
  if (dropLinkMode === "chapter3") return chapterThreeBriefings;
  if (dropLinkMode === "chapter4") return chapterFourBriefings;
  return chapterFiveBriefings;
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
  if (finalScanTimer !== null) {
    window.clearInterval(finalScanTimer);
    finalScanTimer = null;
  }
}

function getDropLinkNoticeText(mode) {
  if (mode === "clue") return "증거물 분석 결과가 도착했습니다.";
  if (mode === "arrange") return "기록 배열 지시가 도착했습니다.";
  if (mode === "chapter3") return "추가 분석 지시가 도착했습니다.";
  if (mode === "chapter4") return "증거물 상태 변화가 감지됐습니다.";
  if (mode === "chapter5") return "잔류 패턴 추적 지시가 도착했습니다.";
  return "사용자 인증 완료. CD-SJ-01 현장 조사에 임시 배정됐습니다.";
}

function openDropLinkNotice(mode) {
  dropLinkMode = mode;
  dropLinkLine = 0;
  const notice = document.querySelector("#dropLinkNotice");
  const noticeText = document.querySelector("#dropLinkNoticeText");
  if (noticeText) noticeText.textContent = getDropLinkNoticeText(mode);
  if (notice) {
    notice.hidden = false;
    notice.classList.add("is-visible");
  }
  triggerDropLinkVibration();
}

function openDropLinkModalFromNotice() {
  const notice = document.querySelector("#dropLinkNotice");
  if (notice) {
    notice.hidden = true;
    notice.classList.remove("is-visible");
  }
  const modal = document.querySelector("#dropLinkModal");
  modal.hidden = false;
  startDropLinkTyping();
  triggerDropLinkVibration();
}

function openDropLinkBriefing(mode) {
  openDropLinkNotice(mode);
}

function showScreen(name) {
  if ((app.classList.contains("scene-camera") && name !== "camera") || (app.classList.contains("scene-firstContact") && name !== "firstContact")) {
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

  if (name === "witnessOrder") {
    renderOrderQuiz();
    updateWitnessConclusion();
  }

  if (name === "imagination") {
    renderChapterThree();
  }

  if (name === "emptyRecord") {
    startEmptyRecordScene();
  } else if (emptyAutoTimer !== null) {
    window.clearInterval(emptyAutoTimer);
    emptyAutoTimer = null;
  }

  if (name === "firstContact") {
    renderFirstContactScene();
  }
}

function createUserLocationMarker() {
  const marker = document.createElement("div");
  marker.className = "user-location-marker";
  marker.innerHTML = "<i></i><b></b>";
  marker.setAttribute("aria-label", "내 현재 위치");
  return marker;
}

function updateUserLocationOverlay(map, overlayRefName) {
  if (!map || !currentUserLocation || !window.kakao?.maps) return null;
  const position = new window.kakao.maps.LatLng(currentUserLocation.lat, currentUserLocation.lng);
  let overlay = overlayRefName === "mission" ? missionUserLocationOverlay : witnessUserLocationOverlay;
  if (!overlay) {
    overlay = new window.kakao.maps.CustomOverlay({
      position,
      content: createUserLocationMarker(),
      xAnchor: 0.5,
      yAnchor: 0.5,
    });
    overlay.setMap(map);
    if (overlayRefName === "mission") missionUserLocationOverlay = overlay;
    else witnessUserLocationOverlay = overlay;
    return overlay;
  }
  overlay.setPosition?.(position);
  return overlay;
}

function updateAllUserLocationOverlays() {
  updateUserLocationOverlay(missionKakaoMap, "mission");
  updateUserLocationOverlay(witnessKakaoMap, "witness");
}

function initMissionMap() {
  if (missionMapReady) return;
  const shell = document.querySelector("#missionMap");
  const loading = document.querySelector("#mapLoading");
  const key = new URLSearchParams(window.location.search).get("kakaoKey") || DEFAULT_KAKAO_JAVASCRIPT_KEY;
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
      missionKakaoMap = map;
      updateUserLocationOverlay(missionKakaoMap, "mission");
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
  currentUserLocation = location;
  updateAllUserLocationOverlays();
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
  const key = new URLSearchParams(window.location.search).get("kakaoKey") || DEFAULT_KAKAO_JAVASCRIPT_KEY;
  if (!shell || !key) return;

  witnessMapReady = true;
  shell.querySelector("iframe")?.remove();
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
      witnessKakaoMap = map;
      updateUserLocationOverlay(witnessKakaoMap, "witness");
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
  currentUserLocation = location;
  updateAllUserLocationOverlays();
  document.querySelector("#locationUpdatedText")?.replaceChildren(document.createTextNode(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })));
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
  if (witnesses.every((item) => visitedWitnesses[item.id])) arrangeBriefingQueued = true;
  triggerEvidenceVibration();
  document.querySelector("#witnessStatus").textContent = `${witness.name} 자료 이미지를 확보했습니다. 획득 자료를 확인하세요.`;
  openWitnessAcquisition(witness);
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

function openArrangeBriefing() {
  arrangeBriefingQueued = false;
  dropLinkMode = "arrange";
  dropLinkLine = 0;
  document.querySelector("#dropLinkModal").hidden = false;
  startDropLinkTyping();
  triggerDropLinkVibration();
}

function closeWitnessAcquisition() {
  const modal = document.querySelector("#witnessAcquisitionModal");
  if (modal) modal.hidden = true;
  if (!arrangeBriefingQueued) return;
  window.setTimeout(openArrangeBriefing, 260);
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
    const adminButton = document.querySelector(`[data-admin-arrive-witness="${witness.id}"]`);
    if (adminButton) adminButton.hidden = visitedWitnesses[witness.id];
  });

  const visitedWitnessText = document.querySelector("#visitedWitnessText");
  if (visitedWitnessText) visitedWitnessText.textContent = `${Object.values(visitedWitnesses).filter(Boolean).length}/3`;
  const directionWitnessText = document.querySelector("#directionWitnessText");
  if (directionWitnessText) directionWitnessText.textContent = witnessOrderSubmitted ? "완료" : `${witnessOrder.filter((id) => visitedWitnesses[id]).length}/3`;
  const allVisited = witnesses.every((witness) => visitedWitnesses[witness.id]);
  const briefingPanel = document.querySelector("#nextWitnessBriefingPanel");
  if (briefingPanel) briefingPanel.hidden = !allVisited || witnessOrderSubmitted;
  const acquisitionButton = document.querySelector("#closeWitnessAcquisition");
  if (acquisitionButton) acquisitionButton.textContent = allVisited ? "자료 확인 완료 · 배열 지시 수신" : "자료 확인 완료";
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
    return `<article class="order-card${selectedOrderCardId === id ? " is-selected" : ""}${witnessOrderSubmitted ? " is-locked" : ""}${witnessOrderFailed ? " is-analysis-error" : ""}" draggable="${witnessOrderSubmitted || witnessOrderAnalyzing ? "false" : "true"}" data-order-card="${id}"><span>${String(index + 1).padStart(2, "0")}</span><div style="background-image:url(${witness.photo})" role="img" aria-label="${witness.name} 자료 이미지"></div><strong>${witness.name}</strong><small>${witness.recordTitle}</small><button type="button" data-order-select="${id}">순서 선택</button></article>`;
  }).join("");
  document.querySelector("#letterChain").hidden = !witnessOrderSubmitted;
  document.querySelector("#letterChain").innerHTML = witnessOrder.map((id, index) => {
    const witness = witnesses.find((item) => item.id === id);
    return `<span>${witness.piece}${index < witnessOrder.length - 1 ? "<b>+</b>" : ""}</span>`;
  }).join("");
  document.querySelector("#orderQuizPanel")?.classList.toggle("is-analysis-success", witnessOrderSubmitted);
  document.querySelector("#orderAnalysisModal")?.toggleAttribute("hidden", !witnessOrderAnalyzing);
  const submitOrderButton = document.querySelector("#submitOrderButton");
  if (submitOrderButton) submitOrderButton.disabled = witnessOrderSubmitted || witnessOrderAnalyzing;
  if (submitOrderButton) submitOrderButton.textContent = witnessOrderAnalyzing ? "분석 중..." : "분석 요청";
  const wordPanel = document.querySelector("#wordReportPanel");
  if (wordPanel) wordPanel.hidden = !witnessOrderSubmitted;
  const input = document.querySelector("#witnessWordAnswer");
  if (input && input.value !== witnessWordAnswer) input.value = witnessWordAnswer;
  const orderFeedback = document.querySelector("#orderFeedback");
  if (orderFeedback) orderFeedback.textContent = witnessOrderFeedback;
  if (orderFeedback) orderFeedback.classList.toggle("is-correct", witnessOrderSubmitted);
  if (orderFeedback) orderFeedback.classList.toggle("is-error", witnessOrderFailed);
  const answerFeedback = document.querySelector("#answerFeedback");
  if (answerFeedback) answerFeedback.textContent = witnessAnswerFeedback;
  if (answerFeedback) answerFeedback.classList.toggle("is-correct", witnessAnswerSubmitted);
  const submitAnswerButton = document.querySelector("#submitAnswerButton");
  if (submitAnswerButton) {
    submitAnswerButton.disabled = witnessAnswerSubmitted || witnessReportSending;
    submitAnswerButton.textContent = witnessReportSending && !witnessAnswerSubmitted ? "보고서 제출 중..." : "보고 제출";
  }
  updateWitnessReportTransmissionUi();
}

function resetWitnessAnalysis() {
  witnessOrderSubmitted = false;
  witnessAnswerSubmitted = false;
  witnessReportSending = false;
  witnessReportProgress = 0;
  if (witnessReportTimer !== null) {
    window.clearInterval(witnessReportTimer);
    witnessReportTimer = null;
  }
  witnessWordAnswer = "";
  witnessOrderAnalyzing = false;
  witnessOrderFailed = false;
  witnessAnswerFeedback = "기록 배열이 확인되면 보고 입력창이 열립니다.";
  witnessOrderFeedback = "기록을 오래된 순서대로 배치한 뒤 분석을 요청하세요.";
}


function moveWitnessBySwipe(id, direction) {
  if (witnessOrderSubmitted) return;
  resetWitnessAnalysis();
  const index = witnessOrder.indexOf(id);
  if (index < 0) return;
  const targetIndex = direction === "left" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= witnessOrder.length) return;
  const next = [...witnessOrder];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  witnessOrder = next;
  updateWitnessUi();
}

function handleOrderPointerUp(id, event) {
  const start = orderPointerStart;
  orderPointerStart = null;
  if (!start || start.id !== id || witnessOrderSubmitted) return;
  const dx = event.clientX - start.x;
  const dy = event.clientY - start.y;
  if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
  moveWitnessBySwipe(id, dx < 0 ? "left" : "right");
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
  if (!witnesses.every((witness) => visitedWitnesses[witness.id]) || witnessOrderSubmitted || witnessOrderAnalyzing) return;
  witnessOrderAnalyzing = true;
  witnessOrderFailed = false;
  witnessOrderFeedback = "CAMPUSDROP이 기록의 시간적 연결을 분석 중입니다...";
  updateWitnessUi();
  const orderSnapshot = witnessOrder.join("@");
  const isCorrectOrder = orderSnapshot === correctWitnessOrder.join("@");
  window.setTimeout(() => {
    witnessOrderAnalyzing = false;
    if (!isCorrectOrder) {
      witnessOrderFailed = true;
      witnessOrderFeedback = "분석 실패. 기록 사이의 시간적 연결을 확인할 수 없습니다. 기록 매체와 작성 방식을 다시 분석하십시오.";
      triggerEvidenceVibration();
      updateWitnessUi();
      return;
    }
    witnessOrderSubmitted = true;
    witnessOrderFailed = false;
    selectedOrderCardId = null;
    witnessOrderFeedback = "분석 성공. 기록의 시간적 배열이 확인되었습니다. 각 기록에 포함된 식별 문자를 연결하십시오.";
    witnessAnswerFeedback = "세 기록에 공통으로 등장하는 생물을 영문으로 보고하십시오.";
    triggerDropLinkVibration();
    updateWitnessUi();
  }, isCorrectOrder ? 2000 : 1000);
}

function updateWitnessReportTransmissionUi() {
  const modal = document.querySelector("#witnessReportModal");
  if (modal) modal.hidden = !(currentScreen === "witnessOrder" && witnessReportSending);
  const title = document.querySelector("#witnessReportModalTitle");
  if (title) title.textContent = witnessReportProgress >= 100 ? "보고서 수신 완료" : "보고서를 운영본부에 제출 중";
  const copy = document.querySelector("#witnessReportModalCopy");
  if (copy) copy.textContent = witnessReportProgress >= 100 ? "추가 분석 지시 채널을 연결합니다." : "식별 문자와 생물 명칭 보고를 묶어 보안 분석 서버로 전송합니다.";
  const progressBar = document.querySelector("#witnessReportProgressBar");
  if (progressBar) progressBar.style.width = `${witnessReportProgress}%`;
  const progressText = document.querySelector("#witnessReportProgressText");
  if (progressText) progressText.textContent = `${witnessReportProgress}%`;
  document.querySelectorAll("[data-report-step]").forEach((step) => {
    const threshold = Number(step.dataset.reportStep);
    if (threshold === 100) step.textContent = witnessReportProgress >= 100 ? "수신 확인" : witnessReportSending ? "전송 중" : "대기";
    else step.textContent = witnessReportProgress >= threshold ? "완료" : "대기";
  });
}

function startWitnessReportTransmission() {
  if (witnessReportSending || witnessAnswerSubmitted) return;
  triggerDropLinkVibration();
  witnessReportSending = true;
  witnessReportProgress = 0;
  witnessAnswerFeedback = "보고서를 운영본부로 제출합니다.";
  updateWitnessUi();
  if (witnessReportTimer !== null) window.clearInterval(witnessReportTimer);
  witnessReportTimer = window.setInterval(() => {
    witnessReportProgress = Math.min(100, witnessReportProgress + 1);
    updateWitnessReportTransmissionUi();
    updateWitnessUi();
    if (witnessReportProgress >= 100) {
      window.clearInterval(witnessReportTimer);
      witnessReportTimer = null;
      window.setTimeout(() => {
        witnessAnswerSubmitted = true;
        witnessAnswerFeedback = "분석 결과가 등록되었습니다.";
        updateWitnessUi();
        dropLinkMode = "chapter3";
        dropLinkLine = 0;
        document.querySelector("#dropLinkModal").hidden = false;
        startDropLinkTyping();
        triggerDropLinkVibration();
      }, 800);
    }
  }, 50);
}

function submitWitnessAnswer() {
  if (!witnessOrderSubmitted || witnessAnswerSubmitted || witnessReportSending) return;
  const normalized = witnessWordAnswer.trim().toUpperCase();
  if (witnessWordAnswer.trim() === "기린") {
    witnessAnswerFeedback = "국제 생물 분류 기록을 위해 영문 명칭이 필요합니다.";
    updateWitnessUi();
    return;
  }
  if (normalized !== "GIRAFFE") {
    witnessAnswerFeedback = "보고된 명칭이 증거물과 일치하지 않습니다.";
    updateWitnessUi();
    return;
  }
  startWitnessReportTransmission();
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
  const startChapterThree = document.querySelector("#startChapterThree");
  if (startChapterThree) startChapterThree.hidden = true;
  updateWitnessReportTransmissionUi();
}

function renderChapterThree() {
  const recordGrid = document.querySelector("#chapterThreeRecords");
  if (recordGrid) {
    recordGrid.classList.toggle("is-solved", starSolved);
    recordGrid.innerHTML = chapterThreeRecords.map((record, index) => `<button type="button" class="imagination-record-card" data-chapter-three-preview="${index}"><span>${String(index + 1).padStart(2, "0")}</span><div style="background-image:url(${record.photo})" role="img" aria-label="${record.recordTitle}"></div><strong>${record.recordTitle}</strong><small>${index === 0 ? "최초 기록" : index === 1 ? "중간 기록" : "최근 기록"}</small></button>`).join("");
  }
  const starInput = document.querySelector("#starAnswer");
  if (starInput) {
    starInput.value = starAnswer;
    starInput.disabled = starSolved;
  }
  document.querySelector("#submitStarAnswer").disabled = starSolved;
  document.querySelector("#starFeedback").textContent = starFeedback;
  document.querySelector("#starFeedback").classList.toggle("is-correct", starSolved);
  const featureSignal = document.querySelector("#featureSignalState");
  if (featureSignal) featureSignal.textContent = starSolved ? "FEATURE FOUND" : "FEATURE UNKNOWN";
  document.querySelector("#restorePanel").hidden = !starSolved;
  const board = document.querySelector("#restoreBoard");
  board?.classList.toggle("is-restored", restoreSolved);
  const damage = document.querySelector("#restoreDamageLayer");
  if (damage) damage.style.opacity = String(Math.max(0.18, 0.9 - restoreProgress / 100));
  const note = document.querySelector("#restoreNoteText");
  if (note) note.setAttribute("aria-hidden", restoreSolved ? "false" : "true");
  document.querySelector("#restoreProgressBar").style.width = `${restoreProgress}%`;
  document.querySelector("#restoreProgressText").textContent = `${restoreProgress}%`;
  document.querySelector("#completeRestoreButton").hidden = restoreSolved;
  document.querySelector("#imaginePanel").hidden = !restoreSolved;
  const imagineInput = document.querySelector("#imagineAnswer");
  if (imagineInput) {
    imagineInput.value = imagineAnswer;
    imagineInput.disabled = imagineSolved;
  }
  document.querySelector("#submitImagineAnswer").disabled = imagineSolved;
  document.querySelector("#imagineFeedback").textContent = imagineFeedback;
  document.querySelector("#imagineFeedback").classList.toggle("is-correct", imagineSolved);
  const conclusion = document.querySelector("#imaginationConclusion");
  conclusion.classList.toggle("is-open", imagineSolved);
  conclusion.querySelector("span").textContent = imagineSolved ? "3장 조사 완료" : "분석 대기";
  conclusion.querySelector("strong").textContent = imagineSolved ? "상상과 이후 기록 사이의 관계는 확정되지 않았습니다." : "정답 입력 전에는 3장을 완료할 수 없습니다.";
  conclusion.querySelector("p").textContent = imagineSolved ? "복원 결과가 저장되었습니다. 다음 상태 변화를 확인하세요." : "세 기록의 차이를 확인한 뒤 복원 단계가 열립니다.";
  const startChapterFour = document.querySelector("#startChapterFour");
  if (startChapterFour) startChapterFour.hidden = !imagineSolved;
}

function submitStarAnswer() {
  const normalized = starAnswer.trim().toUpperCase();
  if (starAnswer.trim() === "별") {
    starFeedback = "분석 보고는 영문으로 입력하십시오.";
  } else if (normalized !== "STAR") {
    starFeedback = "보고된 특징을 증거물에서 확인할 수 없습니다.";
  } else {
    starSolved = true;
    starFeedback = "STAR 확인. 증거물 01의 미복원 페이지가 열렸습니다.";
  }
  renderChapterThree();
}

function markRestorePoint(clientX, clientY) {
  if (!starSolved || restoreSolved) return;
  const board = document.querySelector("#restoreBoard");
  if (!board) return;
  const rect = board.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
  restoreTouchedPoints.add(`${Math.floor(x * 10)}-${Math.floor(y * 14)}`);
  restoreProgress = Math.min(100, Math.round((restoreTouchedPoints.size / 58) * 100));
  if (restoreProgress >= 72) {
    restoreSolved = true;
    restoreProgress = 100;
  }
  renderChapterThree();
}

function completeRestoreByAdmin() {
  restoreSolved = true;
  restoreProgress = 100;
  renderChapterThree();
}

function submitImagineAnswer() {
  if (!restoreSolved) return;
  if (imagineAnswer.trim().toUpperCase() !== "IMAGINE") {
    imagineFeedback = "강조된 단어와 입력한 내용이 일치하지 않습니다.";
  } else {
    imagineSolved = true;
    imagineFeedback = "강조 단어가 확인되었습니다.";
  }
  renderChapterThree();
}

function openChapterThreePreview(index) {
  chapterThreePreviewIndex = index;
  const record = chapterThreeRecords[index];
  document.querySelector("#chapterThreePreviewTitle").textContent = record.name;
  document.querySelector("#chapterThreePreviewSubtitle").textContent = record.recordTitle;
  const photo = document.querySelector("#chapterThreePreviewPhoto");
  photo.style.backgroundImage = `url(${record.photo})`;
  photo.classList.toggle("star-analysis", starSolved && record.id !== "C");
  photo.setAttribute("aria-label", `${record.name} 확대 이미지`);
  document.querySelector("#chapterThreePreviewCopy").textContent = starSolved ? (record.id === "C" ? "증거물 01에서는 동일한 특징이 확인되지 않습니다." : "정답 보고 이후 분석 강조가 활성화되었습니다.") : "세 이미지를 직접 비교해 달라진 특징을 찾으세요.";
  document.querySelector("#chapterThreePreviewModal").hidden = false;
}

function startEmptyRecordScene() {
  emptyAutoProgress = 0;
  emptyRecordFeedback = "비어 있는 기록을 선택하고 기존 위치를 지정하세요.";
  renderEmptyRecordScene();
  if (emptyAutoTimer !== null) window.clearInterval(emptyAutoTimer);
  emptyAutoTimer = window.setInterval(() => {
    emptyAutoProgress = Math.min(100, emptyAutoProgress + 4);
    renderEmptyRecordScene();
    if (emptyAutoProgress >= 100) {
      window.clearInterval(emptyAutoTimer);
      emptyAutoTimer = null;
    }
  }, 90);
}

function renderEmptyRecordScene() {
  const tabs = document.querySelector("#emptyRecordTabs");
  if (tabs) {
    tabs.innerHTML = chapterThreeRecords.map((record) => `<button type="button" class="${activeEmptyRecordId === record.id ? "is-active" : ""}" data-empty-tab="${record.id}">${record.name}</button>`).join("");
  }
  const stage = document.querySelector("#emptyRecordStage");
  if (stage) {
    stage.innerHTML = chapterThreeRecords.map((record) => {
      const mask = emptyRecordMasks[record.id];
      const isActive = activeEmptyRecordId === record.id;
      const isHit = emptyRecordHits[record.id];
      return `<button type="button" class="empty-record-card${isActive ? " is-active" : ""}${isHit ? " is-restored" : ""}${emptyRecordComplete ? " is-unstable" : ""}" data-empty-record="${record.id}" ${isActive ? "" : "hidden"}><span>${record.recordTitle}</span><div class="empty-record-image" style="background-image:url(${record.emptyPhoto})"><span class="empty-original-layer" style="background-image:url(${record.photo})"></span><i class="empty-loss-mask" style="left:${mask.x}%;top:${mask.y}%;width:${mask.width}%;height:${mask.height}%"></i><b class="empty-ghost-signal" style="left:${mask.x}%;top:${mask.y}%;width:${mask.width}%;height:${mask.height}%"></b></div><strong>${isHit ? "개체 영역 재생성" : "개체 정보 손실"}</strong></button>`;
    }).join("");
  }
  document.querySelector("#emptyAutoProgressBar").style.width = `${emptyAutoProgress}%`;
  document.querySelector("#emptyAutoProgressText").textContent = `${emptyAutoProgress}%`;
  document.querySelector("#emptyAutoResult").hidden = emptyAutoProgress < 100;
  const feedback = document.querySelector("#emptyRecordFeedback");
  feedback.textContent = emptyRecordFeedback;
  feedback.classList.toggle("is-correct", emptyRecordComplete);
  const conclusion = document.querySelector("#emptyRecordConclusion");
  conclusion.classList.toggle("is-open", emptyRecordComplete);
  conclusion.querySelector("span").textContent = emptyRecordComplete ? "개체 안정성 경고" : "수동 복원 대기";
  conclusion.querySelector("strong").textContent = emptyRecordComplete ? "개체 정보가 다시 감소하고 있습니다." : "세 기록에서 기린이 있던 위치를 지정해야 합니다.";
  conclusion.querySelector("p").textContent = emptyRecordComplete ? "복원 상태가 불안정합니다. 다음 추적 단계가 열렸습니다." : "수동 복원 단계가 대기 중입니다.";
  const startChapterFive = document.querySelector("#startChapterFive");
  if (startChapterFive) startChapterFive.hidden = !emptyRecordComplete;
}

function handleEmptyRecordPoint(recordId, event) {
  if (emptyRecordComplete) return;
  const card = event.target.closest("[data-empty-record]");
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  const mask = emptyRecordMasks[recordId];
  const centerX = mask.x + mask.width / 2;
  const centerY = mask.y + mask.height / 2;
  const distance = Math.hypot(x - centerX, y - centerY);
  activeEmptyRecordId = recordId;
  if (distance > mask.radius) {
    emptyRecordFeedback = "지정한 영역이 기존 개체 좌표와 일치하지 않습니다.";
    renderEmptyRecordScene();
    return;
  }
  emptyRecordHits[recordId] = true;
  if (chapterThreeRecords.every((record) => emptyRecordHits[record.id])) {
    emptyRecordComplete = true;
    emptyRecordFeedback = "수동 위치 지정 완료. 개체 영역이 재생성됩니다.";
  } else {
    emptyRecordFeedback = "기존 개체 좌표를 확인했습니다. 남은 기록에서도 기존 위치를 지정하십시오.";
  }
  renderEmptyRecordScene();
}


function completeFinalPosterScan() {
  if (finalScanTimer !== null) {
    window.clearInterval(finalScanTimer);
    finalScanTimer = null;
  }
  finalScanProgress = 100;
  finalScanMatched = true;
  finalScanStatus = "[DROPLINK] 이미지 일치율 100%. 잔류 패턴의 출처를 확인했습니다. 미등록 개체 정보가 복원되고 있습니다.";
  triggerEvidenceVibration();
  renderFirstContactScene();
}

async function startFinalPosterScan(options = {}) {
  finalScanStarted = true;
  finalScanMatched = false;
  finalScanProgress = 0;
  answeredGiraffeQuestions = { origin: false, star: false, fade: false };
  activeGiraffeQuestion = null;
  observationSubmitted = false;
  finalResponse = "";
  finalScanStatus = options.adminOverride ? "[DROPLINK] 이미지 패턴 분석 중." : "카메라 권한을 요청하는 중...";
  renderFirstContactScene();
  const video = document.querySelector("#finalCameraFeed");

  if (!options.adminOverride && navigator.mediaDevices?.getUserMedia) {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      if (video) {
        video.srcObject = cameraStream;
        await video.play();
      }
    } catch {
      finalScanStarted = false;
      finalScanStatus = "카메라 권한을 허용하면 특별 이미지를 조사할 수 있습니다. 데모에서는 관리자 버튼으로 진행할 수 있습니다.";
      renderFirstContactScene();
      return;
    }
  }

  finalScanStatus = "[DROPLINK] 이미지 패턴 분석 중. 일치율 42%. 카메라를 이미지 중앙에 유지하십시오.";
  renderFirstContactScene();
  if (finalScanTimer !== null) window.clearInterval(finalScanTimer);
  finalScanTimer = window.setInterval(() => {
    finalScanProgress = Math.min(100, finalScanProgress + 4);
    if (finalScanProgress >= 78 && finalScanProgress < 100) finalScanStatus = "[DROPLINK] 일치율 78%. 이미지 이동을 감지했습니다. 위치를 유지하십시오.";
    renderFirstContactScene();
    if (finalScanProgress >= 100) completeFinalPosterScan();
  }, 110);
}

function answerGiraffeQuestion(key) {
  activeGiraffeQuestion = key;
  answeredGiraffeQuestions[key] = true;
  renderFirstContactScene();
}

function submitObservationRecord() {
  if (!giraffeQuestions.every((question) => answeredGiraffeQuestions[question.key]) || observationText.trim().length < 6) return;
  observationSubmitted = true;
  renderFirstContactScene();
}

function renderFirstContactScene() {
  const screen = document.querySelector('[data-screen="firstContact"]');
  if (!screen) return;
  screen.classList.toggle("is-matched", finalScanMatched);
  screen.classList.toggle("is-recorded", observationSubmitted);
  const status = document.querySelector("#finalScanStatus");
  if (status) {
    status.textContent = finalScanStatus;
    status.classList.toggle("is-correct", finalScanMatched);
  }
  const progress = document.querySelector("#finalScanProgressBar");
  if (progress) progress.style.width = `${finalScanProgress}%`;
  const progressText = document.querySelector("#finalScanProgressText");
  if (progressText) progressText.textContent = `${finalScanProgress}%`;
  document.querySelector("#finalCameraPlaceholder").hidden = finalScanStarted;
  document.querySelector("#finalPosterLock").hidden = !finalScanStarted || finalScanMatched;
  document.querySelector("#finalArStage").hidden = !finalScanMatched;
  document.querySelector("#finalDialoguePanel").hidden = !finalScanMatched;
  document.querySelector("#finalEndingPanel").hidden = !observationSubmitted;
  const startButton = document.querySelector("#startFinalPosterScan");
  if (startButton) startButton.disabled = finalScanStarted && !finalScanMatched;
  const speech = document.querySelector("#giraffeSpeechText");
  if (speech) {
    const active = giraffeQuestions.find((question) => question.key === activeGiraffeQuestion);
    speech.textContent = observationSubmitted ? "[DROPLINK] 신규 관측 기록이 등록되었습니다. 개체 정보 안정화율: 100%. 신규 기록 등록 이후 정보 손실이 중단되었습니다. 두 현상의 상관관계는 확인되지 않았습니다. [미등록 통신] 이번 기록은 네가 남긴 거구나. 네가 떠올린 모습도 마음에 들어. 이제 네가 남긴 기록 속에도 내가 있을 수 있어." : active ? active.answer : "[미등록 통신] 이제야 나를 직접 보고 있네.";
  }
  document.querySelectorAll("[data-giraffe-question]").forEach((button) => button.classList.toggle("is-answered", answeredGiraffeQuestions[button.dataset.giraffeQuestion]));
  const allAnswered = giraffeQuestions.every((question) => answeredGiraffeQuestions[question.key]);
  document.querySelector("#observationRecord")?.classList.toggle("is-open", allAnswered);
  const submit = document.querySelector("#submitObservationRecord");
  if (submit) submit.disabled = !allAnswered || observationText.trim().length < 6 || observationSubmitted;
  const finalText = document.querySelector("#finalObservationText");
  if (finalText) finalText.textContent = `“${observationText.trim()}”`;
  document.querySelectorAll("[data-final-response]").forEach((button) => button.classList.toggle("is-selected", finalResponse === button.dataset.finalResponse));
  const appTransfer = document.querySelector("#appTransferPanel");
  if (appTransfer) appTransfer.hidden = !finalResponse;
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
        dropLinkText = "";
        dropLinkNoticeOpen = false;
        caseModalOpen = true;
        triggerDropLinkVibration();
        updateDropLinkUi();
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
  nextButton.textContent = dropLinkLine < activeBriefings.length - 1 ? "다음" : dropLinkMode === "case" ? "사건 개요 수신" : dropLinkMode === "clue" ? "2장 조사 시작" : dropLinkMode === "arrange" ? "배열 미션 시작" : dropLinkMode === "chapter3" ? "3장 시작" : dropLinkMode === "chapter4" ? "4장 시작" : "5장 시작";

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
  if (!card || witnessOrderSubmitted || witnessOrderAnalyzing) return;
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
  orderPointerStart = null;
  document.querySelectorAll(".order-card.is-dragging").forEach((card) => card.classList.remove("is-dragging"));
});

document.addEventListener("input", (event) => {
  if (event.target.matches("#witnessWordAnswer")) {
    witnessWordAnswer = event.target.value;
    updateWitnessUi();
  }
  if (event.target.matches("#starAnswer")) {
    starAnswer = event.target.value;
    renderChapterThree();
  }
  if (event.target.matches("#imagineAnswer")) {
    imagineAnswer = event.target.value;
    renderChapterThree();
  }
  if (event.target.matches("#observationText")) {
    observationText = event.target.value;
    renderFirstContactScene();
  }
});

document.addEventListener("pointerdown", (event) => {
  const orderCard = event.target.closest("[data-order-card]");
  if (orderCard && !event.target.closest("[data-preview-witness]") && !event.target.closest("[data-order-select]") && !witnessOrderSubmitted && !witnessOrderAnalyzing) {
    orderPointerStart = { id: orderCard.dataset.orderCard, x: event.clientX, y: event.clientY };
  }
  if (event.target.closest("#restoreBoard")) markRestorePoint(event.clientX, event.clientY);
});

document.addEventListener("pointerup", (event) => {
  const orderCard = event.target.closest("[data-order-card]");
  if (orderCard && !event.target.closest("[data-order-select]")) handleOrderPointerUp(orderCard.dataset.orderCard, event);
});

document.addEventListener("pointermove", (event) => {
  if (event.buttons !== 1 && event.pointerType !== "touch") return;
  if (event.target.closest("#restoreBoard")) markRestorePoint(event.clientX, event.clientY);
});

document.addEventListener("click", (event) => {
  const goButton = event.target.closest("[data-go]");
  if (goButton) {
    showScreen(goButton.dataset.go);
    return;
  }

  if (event.target.closest("#startChapterThree")) {
    openDropLinkBriefing("chapter3");
    return;
  }

  if (event.target.closest("#startChapterFour")) {
    openDropLinkBriefing("chapter4");
    return;
  }

  if (event.target.closest("#startChapterFive")) {
    openDropLinkBriefing("chapter5");
    return;
  }

  const emptyTab = event.target.closest("[data-empty-tab]");
  if (emptyTab) {
    activeEmptyRecordId = emptyTab.dataset.emptyTab;
    renderEmptyRecordScene();
    return;
  }

  const emptyRecord = event.target.closest("[data-empty-record]");
  if (emptyRecord) {
    handleEmptyRecordPoint(emptyRecord.dataset.emptyRecord, event);
    return;
  }

  const chapterThreePreview = event.target.closest("[data-chapter-three-preview]");
  if (chapterThreePreview) {
    openChapterThreePreview(Number(chapterThreePreview.dataset.chapterThreePreview));
    return;
  }

  if (event.target.closest("#chapterThreePrev")) {
    openChapterThreePreview((chapterThreePreviewIndex + chapterThreeRecords.length - 1) % chapterThreeRecords.length);
    return;
  }

  if (event.target.closest("#chapterThreeNext")) {
    openChapterThreePreview((chapterThreePreviewIndex + 1) % chapterThreeRecords.length);
    return;
  }

  if (event.target.closest("#closeChapterThreePreview")) {
    document.querySelector("#chapterThreePreviewModal").hidden = true;
    return;
  }

  if (event.target.closest("#submitStarAnswer")) {
    submitStarAnswer();
    return;
  }

  if (event.target.closest("#completeRestoreButton")) {
    completeRestoreByAdmin();
    return;
  }

  if (event.target.closest("#submitImagineAnswer")) {
    submitImagineAnswer();
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

  const orderSelectButton = event.target.closest("[data-order-select]");
  if (orderSelectButton) {
    selectOrderCard(orderSelectButton.dataset.orderSelect);
    return;
  }

  const orderCard = event.target.closest("[data-order-card]");
  if (orderCard && !event.target.closest("[data-preview-witness]")) {
    openEvidencePreview(orderCard.dataset.orderCard);
    return;
  }

  if (event.target.closest("#checkWitnessLocation")) {
    requestWitnessLocation();
    return;
  }

  const adminArriveItem = event.target.closest("[data-admin-arrive-witness]");
  if (adminArriveItem) {
    acquireWitnessEvidence(adminArriveItem.dataset.adminArriveWitness, { admin: true });
    return;
  }

  if (event.target.closest("#adminArriveWitness")) {
    markActiveWitnessArrived();
    return;
  }

  if (event.target.closest("#openArrangeBriefing")) {
    openArrangeBriefing();
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

  if (event.target.closest("#startFinalPosterScan")) {
    startFinalPosterScan();
    return;
  }

  if (event.target.closest("#adminMatchFinalPoster")) {
    startFinalPosterScan({ adminOverride: true });
    return;
  }

  const giraffeQuestion = event.target.closest("[data-giraffe-question]");
  if (giraffeQuestion) {
    answerGiraffeQuestion(giraffeQuestion.dataset.giraffeQuestion);
    return;
  }

  if (event.target.closest("#submitObservationRecord")) {
    submitObservationRecord();
    return;
  }

  const finalChoice = event.target.closest("[data-final-response]");
  if (finalChoice) {
    finalResponse = finalChoice.dataset.finalResponse;
    renderFirstContactScene();
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
    const nextSceneByDropLinkMode = {
      case: "mission",
      clue: "witness",
      arrange: "witnessOrder",
      chapter3: "imagination",
      chapter4: "emptyRecord",
      chapter5: "firstContact",
    };
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
      showScreen(nextSceneByDropLinkMode[dropLinkMode] || "mission");
      dropLinkMode = "case";
      closeDropLinkModal.disabled = false;
    }, 1500);
    return;
  }

  const dropLinkNotice = event.target.closest("#dropLinkNotice");
  if (dropLinkNotice) {
    openDropLinkModalFromNotice();
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
