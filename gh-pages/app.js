const app = document.querySelector(".app");
const scanScreen = document.querySelector(".scan-screen");
const video = document.querySelector("#cameraFeed");
const canvas = document.querySelector("#scanCanvas");
const scanFrame = document.querySelector("#scanFrame");
const scanHint = document.querySelector("#scanHint");
const codeInput = document.querySelector("#missionCode");
const missionError = document.querySelector("#missionError");
const todayLabel = document.querySelector("#todayLabel");

let stream = null;
let raf = null;
let foundFrames = 0;

todayLabel.textContent = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "short",
}).format(new Date());

document.querySelector("#startScan").addEventListener("click", beginScan);
document.querySelector("#closeScan").addEventListener("click", () => {
  stopCamera();
  setStep("start");
});
document.querySelector("#openMission").addEventListener("click", () => {
  stopCamera();
  setStep("mission");
});
document.querySelector("#restartDemo").addEventListener("click", () => {
  codeInput.value = "";
  missionError.textContent = "";
  setStep("start");
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
  app.dataset.step = step;
}

async function beginScan() {
  setStep("scan");
  foundFrames = 0;
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
    scanHint.querySelector("strong").textContent = "지도 안내판을 화면 중앙에 맞춰주세요";
    scanHint.querySelector("p").textContent =
      "세종대 지도 안내판의 밝은 지도 영역이 프레임 안에 들어오면 기린이 나타납니다.";
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
    let green = 0;
    let yellow = 0;
    let dark = 0;
    let cyan = 0;
    let pink = 0;
    let bright = 0;
    let fixtureDark = 0;
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
    const posterDetected = green > 90 && yellow > 40 && dark > 35;
    const fixtureDetected =
      (cyan > 155 && pink > 35 && bright > 850 && fixtureDark > 330) ||
      (cyan > 250 && bright > 1050 && fixtureDark > 420);
    const detected = posterDetected || fixtureDetected;
    foundFrames = detected ? foundFrames + 1 : 0;
    if (foundFrames > 5) {
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
}
