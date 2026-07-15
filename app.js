const app = document.querySelector(".app");
const scanScreen = document.querySelector(".scan-screen");
const video = document.querySelector("#cameraFeed");
const canvas = document.querySelector("#scanCanvas");
const scanFrame = document.querySelector("#scanFrame");
const scanHint = document.querySelector("#scanHint");
const threeLayer = document.querySelector("#threeLayer");
const codeInput = document.querySelector("#missionCode");
const missionError = document.querySelector("#missionError");
const todayLabel = document.querySelector("#todayLabel");

let stream = null;
let raf = null;
let foundFrames = 0;
let renderer = null;
let threeAnimation = null;

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
  scanScreen.classList.remove("is-found", "is-three-ready");
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
    scanHint.querySelector("strong").textContent = "이미지를 화면 중앙에 맞춰주세요";
    scanHint.querySelector("p").textContent =
      "데모 마커 포스터의 초록색 표식을 프레임 안에 넣으면 미션 입구가 열립니다.";
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
  if (threeAnimation) cancelAnimationFrame(threeAnimation);
  threeAnimation = null;
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  threeLayer.innerHTML = "";
  scanScreen.classList.remove("is-three-ready");
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
    canvas.width = 96;
    canvas.height = 96;
    context.drawImage(video, 0, 0, 96, 96);
    const image = context.getImageData(18, 18, 60, 60).data;
    let green = 0;
    let yellow = 0;
    let dark = 0;
    for (let i = 0; i < image.length; i += 4) {
      const r = image[i];
      const g = image[i + 1];
      const b = image[i + 2];
      if (g > 95 && g > r * 1.1 && g > b * 1.15) green += 1;
      if (r > 150 && g > 120 && b < 95) yellow += 1;
      if (r < 55 && g < 70 && b < 80) dark += 1;
    }
    const detected = green > 90 && yellow > 40 && dark > 35;
    foundFrames = detected ? foundFrames + 1 : 0;
    if (foundFrames > 8) {
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
  mountThreeChest();
}

function mountThreeChest() {
  if (!window.THREE || !threeLayer) return;
  const THREE = window.THREE;
  const width = threeLayer.clientWidth || window.innerWidth;
  const height = threeLayer.clientHeight || window.innerHeight;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
  camera.position.z = 4.6;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  threeLayer.innerHTML = "";
  threeLayer.appendChild(renderer.domElement);
  scanScreen.classList.add("is-three-ready");

  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 1, 1),
    new THREE.MeshStandardMaterial({
      color: 0x20d6a3,
      metalness: 0.28,
      roughness: 0.22,
      emissive: 0x0b6d5e,
      emissiveIntensity: 0.45,
    }),
  );
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.34, 1.12),
    new THREE.MeshStandardMaterial({
      color: 0xffcc4d,
      metalness: 0.2,
      roughness: 0.26,
      emissive: 0x8b5b00,
      emissiveIntensity: 0.25,
    }),
  );
  lid.position.y = 0.67;
  const lock = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.34, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x7cf9d6 }),
  );
  lock.position.set(0, 0.22, 0.56);
  group.add(body, lid, lock);
  scene.add(group);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.025, 16, 90),
    new THREE.MeshBasicMaterial({ color: 0x7cf9d6, transparent: true, opacity: 0.75 }),
  );
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const light = new THREE.PointLight(0xffffff, 2.8, 12);
  light.position.set(1.8, 2.2, 3.5);
  scene.add(light);

  let frame = 0;
  const animate = () => {
    frame += 0.016;
    group.rotation.y += 0.018;
    group.position.y = Math.sin(frame * 2.2) * 0.12;
    ring.rotation.z += 0.012;
    ring.scale.setScalar(1 + Math.sin(frame * 3) * 0.04);
    renderer.render(scene, camera);
    threeAnimation = requestAnimationFrame(animate);
  };
  animate();
}
