const app = document.querySelector("#app");
const screens = [...document.querySelectorAll("[data-screen]")];
const reachRadiusMeters = 20;
const clueRevealRadiusMeters = 10;
const missionTarget = { lat: 37.55041617275794, lng: 127.07381801425053 };
const investigationMarkerSrc = "./investigation-marker-v2.png";
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
let missionMapInstance = null;
let userMarker = null;
let locationRefreshTimer = null;
let locationInReach = false;
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
      missionMapInstance = map;
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

function updateMapUserMarker(location) {
  const fallbackMarker = document.querySelector("#missionMap .map-user-marker");
  if (fallbackMarker) {
    const lngMin = missionTarget.lng - 0.003;
    const lngMax = missionTarget.lng + 0.003;
    const latMin = missionTarget.lat - 0.002;
    const latMax = missionTarget.lat + 0.002;
    const x = Math.min(88, Math.max(12, ((location.lng - lngMin) / (lngMax - lngMin)) * 100));
    const y = Math.min(88, Math.max(12, (1 - (location.lat - latMin) / (latMax - latMin)) * 100));
    fallbackMarker.style.left = `${x}%`;
    fallbackMarker.style.top = `${y}%`;
    fallbackMarker.hidden = false;
  }

  if (!window.kakao?.maps || !missionMapInstance) return;
  const position = new window.kakao.maps.LatLng(location.lat, location.lng);
  if (!userMarker) {
    userMarker = new window.kakao.maps.Marker({ position, title: "내 위치" });
    userMarker.setMap(missionMapInstance);
    return;
  }
  userMarker.setPosition(position);
}

function applyMissionLocation(position, options = {}) {
  const location = { lat: position.coords.latitude, lng: position.coords.longitude };
  const distance = getDistanceMeters(location, missionTarget);
  document.querySelector("#distanceText").textContent = `${distance}m`;
  document.querySelector("#locationUpdatedText").textContent = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  locationInReach = distance <= reachRadiusMeters;
  updateScanStartButton();
  updateMapUserMarker(location);

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
