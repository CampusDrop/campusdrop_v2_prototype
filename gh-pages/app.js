const app = document.querySelector("#app");
const screens = [...document.querySelectorAll("[data-screen]")];
const reachRadiusMeters = 90;
const clockTower = { lat: 37.550944, lng: 127.073765 };
const posterCopy = {
  student_hall: "학생회관 포스터를 통해 접속했습니다. 이 근처에서도 이상한 종소리가 들렸다는 제보가 있습니다.",
  library: "학술정보원 포스터를 통해 접속했습니다. 오늘 새벽, 시계탑 쪽에서 같은 제보가 반복됐습니다.",
  gate: "정문 포스터를 통해 접속했습니다. 방문자 기록에는 없는 종소리가 남아 있습니다.",
};
const clueDetails = {
  "털": "바람에 날린 흔적이 아니라, 높은 곳에서 스친 것처럼 붙어 있습니다.",
  "콧김": "유리 안쪽에만 남은 뿌연 곡선. 바깥 날씨와 맞지 않습니다.",
  "나뭇잎": "사다리 없이는 닿기 어려운 위치에 젖은 잎이 끼어 있습니다.",
  "흔적": "기계 내부 고장이 아니라 바깥에서 힘을 받은 방향입니다.",
};

let messageStep = 0;
const foundClues = new Set();

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
}

function updateCurrentTime() {
  const current = document.querySelector("#currentTime");
  if (!current) return;
  current.textContent = new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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
        status.textContent = "시계탑 신호 범위에 진입했습니다.";
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

function updateConclusion() {
  const conclusion = document.querySelector("#conclusion");
  const strong = conclusion.querySelector("strong");
  if (foundClues.size === 4) {
    conclusion.classList.add("is-open");
    strong.textContent = "시계가 고장 난 것이 아니다. 시계탑 안에서 누군가 시곗바늘을 움직이고 있다.";
    if (!conclusion.querySelector("p")) {
      const next = document.createElement("p");
      next.textContent = "다음 파트: 시계탑 안의 존재와 처음 접촉하기";
      conclusion.appendChild(next);
    }
    return;
  }
  strong.textContent = `${foundClues.size} / 4 흔적 확인`;
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

  const unknownMessage = event.target.closest("#unknownMessage");
  if (unknownMessage) {
    if (messageStep === 0) {
      messageStep = 1;
      unknownMessage.querySelector("strong").textContent = "그런데 일부러 그런 건 아니었어.";
      unknownMessage.querySelector("small").textContent = "탭해서 첫 미션 받기";
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
updateCurrentTime();
window.setInterval(updateCurrentTime, 1000 * 20);
showScreen("entry");
