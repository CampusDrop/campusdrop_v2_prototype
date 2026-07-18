const app = document.querySelector("#app");
const screens = [...document.querySelectorAll("[data-screen]")];
const reachRadiusMeters = 90;
const clockTower = { lat: 37.550944, lng: 127.073765 };
const dropLinkBriefings = [
  "사용자 인증 완료. 임시 현장 조사원으로 등록합니다. 사건 번호 CD-SJ-01, 사건명 시계탑 대형 생물 목격 사건.",
  "세종대학교에는 오래된 소문이 하나 있습니다. 시계탑 꼭대기에는 기린이 산다. 본부는 목격 신고 7건을 근거로 현장 조사가 필요하다고 판단했습니다.",
];
const posterCopy = {
  student_hall: "학생회관 포스터를 통해 접속했습니다. 창문 뒤로 긴 그림자를 봤다는 제보가 남아 있습니다.",
  library: "학술정보원 포스터를 통해 접속했습니다. 새벽 시간대 시계탑 꼭대기 목격 신고가 반복됐습니다.",
  gate: "정문 포스터를 통해 접속했습니다. 최근 30일 동안 같은 소문과 관련된 신고가 7건 접수됐습니다.",
};
const clueDetails = {
  "털": "표본을 확인했습니다. 인공 섬유가 아닙니다. 기린과 동물의 체모와 유사하지만 단독 증거로는 확정할 수 없습니다.",
  "나뭇잎": "사람의 손이 닿지 않는 높이에서만 나뭇잎이 사라져 있습니다. 대형 초식동물의 섭식 흔적과 유사합니다.",
  "충격음": "단단한 바닥을 밟는 발굽 소리로 분류됐습니다. 발굽이 바닥에 닿는 간격이 대형 개체 보행 패턴과 일치합니다.",
};

let messageStep = 0;
let dropLinkTyper = null;
let dropLinkLine = 0;
const foundClues = new Set();
let missionMapReady = false;

function showScreen(name) {
  screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === name);
  });
  app.className = `case-app scene-${name}`;
  window.scrollTo({ top: 0, behavior: "instant" });

  if (name === "incident") {
    const message = document.querySelector("#unknownMessage");
    messageStep = 0;
    message.classList.remove("is-visible");
    window.setTimeout(() => message.classList.add("is-visible"), 5200);
  }

  if (name === "mission") {
    initMissionMap();
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
  canvas.setAttribute("aria-label", "세종대학교 시계탑 실제 지도");
  shell.prepend(canvas);
  if (loading) loading.textContent = "지도 불러오는 중...";

  const renderMap = () => {
    if (!window.kakao?.maps) return;
    window.kakao.maps.load(() => {
      const center = new window.kakao.maps.LatLng(clockTower.lat, clockTower.lng);
      const map = new window.kakao.maps.Map(canvas, { center, level: 3 });
      new window.kakao.maps.Marker({ position: center, title: "세종대학교 시계탑" }).setMap(map);
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

function checkLocation() {
  const status = document.querySelector("#locationStatus");
  const distanceText = document.querySelector("#distanceText");
  if (!navigator.geolocation) {
    status.textContent = "이 브라우저에서는 위치 확인을 사용할 수 없습니다.";
    return;
  }

  status.textContent = "현재 위치 확인 중...";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const distance = getDistanceMeters(
        { lat: position.coords.latitude, lng: position.coords.longitude },
        clockTower,
      );
      distanceText.textContent = `${distance}m`;
      if (distance <= reachRadiusMeters) {
        status.textContent = "시계탑 조사 범위에 진입했습니다.";
        showScreen("arrival");
        return;
      }
      status.textContent = "아직 신호 범위 밖입니다. 시계탑 쪽으로 이동하세요.";
    },
    () => {
      status.textContent = "위치 권한을 허용하면 시계탑 도착 여부를 확인할 수 있습니다.";
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
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

function updateConclusion() {
  const conclusion = document.querySelector("#conclusion");
  const strong = conclusion.querySelector("strong");
  if (foundClues.size === 3) {
    conclusion.classList.add("is-open");
    strong.textContent = "분석 완료. 추정 개체 높이 4.5m 이상, 추정 분류 기린과, 실제 개체 존재 가능성 93.7%.";
    if (!conclusion.querySelector("p")) {
      const next = document.createElement("p");
      next.textContent = "기존 기록과 일치하는 개체가 확인됐습니다. 다음 파트: 지정 이미지를 스캔해 세린이와 첫 접촉하기";
      conclusion.appendChild(next);
    }
    return;
  }
  strong.textContent = `${foundClues.size} / 3 흔적 확인`;
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

  const clueButton = event.target.closest("[data-clue]");
  if (clueButton) {
    foundClues.add(clueButton.dataset.clue);
    clueButton.classList.add("is-found");
    clueButton.querySelector("p").textContent = clueDetails[clueButton.dataset.clue];
    updateConclusion();
  }
});

const posterId = new URLSearchParams(window.location.search).get("poster_id") ?? "student_hall";
document.querySelector("#posterSource").textContent = posterCopy[posterId] ?? posterCopy.student_hall;
showScreen("entry");
