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
const npcDialogueText = "지도 앞까지 왔구나. 오늘의 캠퍼스 퀘스트를 받을 준비 됐어?";
const dialogueStartMs = 4300;
const typingIntervalMs = 46;
const sejongCenter = { lat: 37.550944, lng: 127.073765 };
const mapCrewPoints = [
  { name: "피닉스", lat: 37.550944, lng: 127.073765 },
  { name: "오로라", lat: 37.55135, lng: 127.07432 },
  { name: "노바", lat: 37.55052, lng: 127.07318 },
];

let stream = null;
let raf = null;
let foundFrames = 0;
let canOpenMission = false;
let missionReadyTimer = null;
let dialogueStartTimer = null;
let dialogueTypingTimer = null;
let kakaoMapLoaded = false;
let classDragMode = "add";
let mapMenuOpen = false;

todayLabel.textContent = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "short",
}).format(new Date());

document.querySelector("#startScanMap")?.addEventListener("click", beginScan);
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
  return keyFromQuery || window.localStorage.getItem("campusDropKakaoKey") || window.CAMPUS_DROP_KAKAO_KEY || "";
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
      const marker = new window.kakao.maps.Marker({ position: center });
      marker.setMap(map);
      mapCrewPoints.forEach((crew) => {
        const content = document.createElement("button");
        content.type = "button";
        content.className = "kakao-crew-overlay";
        content.innerHTML = `
          <model-viewer src="./sejongGF.glb" camera-orbit="90deg 76deg 3.2m" field-of-view="28deg" exposure="1.1" auto-rotate interaction-prompt="none" disable-zoom alt="${crew.name} 크루 기린"></model-viewer>
          <strong>${crew.name}</strong>
        `;
        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(crew.lat, crew.lng),
          content,
          xAnchor: 0.5,
          yAnchor: 1,
          zIndex: 10,
        });
        overlay.setMap(map);
      });
      const syncMapPointScale = () => {
        const level = map.getLevel();
        const scale = Math.min(1.8, Math.max(0.62, Math.pow(1.18, 3 - level)));
        kakaoMapElement.closest(".kakao-map-shell")?.style.setProperty("--map-zoom-scale", scale.toFixed(3));
      };
      syncMapPointScale();
      window.kakao.maps.event.addListener(map, "zoom_changed", syncMapPointScale);
      kakaoMapLoaded = true;
      kakaoFallback?.classList.add("is-hidden");
      kakaoMapElement.closest(".kakao-map-shell")?.classList.add("is-kakao-ready");
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

async function beginScan() {
  setStep("scan");
  foundFrames = 0;
  canOpenMission = false;
  resetDialogue();
  frozenFrame.removeAttribute("src");
  frozenFrame.classList.remove("is-visible");
  scanScreen.classList.remove("is-found");
  scanFrame.classList.remove("is-found");
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
