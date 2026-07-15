"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Step = "start" | "scan" | "mission" | "success" | "coupon";
type ScanState = "idle" | "requesting" | "searching" | "found" | "error";

declare global {
  interface Window {
    THREE?: any;
  }
}

const markerUrl = "/campus-drop-marker.svg";
const answer = "428";

export default function Home() {
  const [step, setStep] = useState<Step>("start");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [cameraError, setCameraError] = useState("");
  const [code, setCode] = useState("");
  const [missionError, setMissionError] = useState("");
  const [collected, setCollected] = useState(false);
  const [threeReady, setThreeReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const threeMountRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const foundFramesRef = useRef(0);

  const todayLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    return formatter.format(new Date());
  }, []);

  useEffect(() => {
    if (step !== "scan") return;
    let cancelled = false;

    async function startCamera() {
      setScanState("requesting");
      setCameraError("");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setScanState("searching");
        scanForMarker();
      } catch {
        setScanState("error");
        setCameraError(
          "카메라 권한을 허용한 뒤 HTTPS 주소에서 다시 실행해주세요.",
        );
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [step]);

  useEffect(() => {
    if (step !== "scan" || scanState !== "found") return;
    let disposed = false;
    let frame = 0;
    let renderer: any;

    async function mountThree() {
      await loadThree();
      if (disposed || !window.THREE || !threeMountRef.current) return;
      setThreeReady(true);
      const THREE = window.THREE;
      const width = threeMountRef.current.clientWidth || window.innerWidth;
      const height = threeMountRef.current.clientHeight || window.innerHeight;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
      camera.position.z = 4.6;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      threeMountRef.current.innerHTML = "";
      threeMountRef.current.appendChild(renderer.domElement);

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

      const animate = () => {
        if (disposed) return;
        frame += 0.016;
        group.rotation.y += 0.018;
        group.position.y = Math.sin(frame * 2.2) * 0.12;
        ring.rotation.z += 0.012;
        ring.scale.setScalar(1 + Math.sin(frame * 3) * 0.04);
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      };
      animate();
    }

    mountThree();
    return () => {
      disposed = true;
      setThreeReady(false);
      renderer?.dispose?.();
      if (threeMountRef.current) threeMountRef.current.innerHTML = "";
    };
  }, [step, scanState]);

  useEffect(() => {
    if (step !== "success") return;
    setCollected(true);
    const timer = window.setTimeout(() => setStep("coupon"), 1700);
    return () => window.clearTimeout(timer);
  }, [step]);

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function scanForMarker() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const tick = () => {
      if (!video.videoWidth || !video.videoHeight) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas.width = 96;
      canvas.height = 96;
      ctx.drawImage(video, 0, 0, 96, 96);
      const image = ctx.getImageData(18, 18, 60, 60).data;
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
      foundFramesRef.current = detected ? foundFramesRef.current + 1 : 0;
      if (foundFramesRef.current > 8) {
        setScanState("found");
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }

  function beginScan() {
    setStep("scan");
    setScanState("idle");
    foundFramesRef.current = 0;
  }

  function openMission() {
    stopCamera();
    setStep("mission");
  }

  function submitMission(event: React.FormEvent) {
    event.preventDefault();
    if (code === answer) {
      setMissionError("");
      setStep("success");
      return;
    }
    setMissionError("코드가 맞지 않아요. 단서를 다시 살펴보세요.");
  }

  return (
    <main className={`app step-${step}`}>
      {step === "start" && (
        <section className="screen start-screen">
          <div className="campus-sky" aria-hidden="true">
            <span className="sun" />
            <span className="pin pin-a" />
            <span className="pin pin-b" />
            <span className="route" />
          </div>
          <div className="brand-mark">CD</div>
          <p className="eyebrow">Campus AR mission</p>
          <h1>Campus Drop</h1>
          <p className="lead">캠퍼스 이미지를 스캔하면 미션이 열립니다</p>
          <button className="primary-action" onClick={beginScan}>
            AR 스캔 시작
          </button>
          <a className="marker-link" href={markerUrl} target="_blank">
            데모 마커 이미지 열기
          </a>
        </section>
      )}

      {step === "scan" && (
        <section className="screen scan-screen" aria-label="AR 스캔 화면">
          <video ref={videoRef} className="camera-feed" playsInline muted />
          <canvas ref={canvasRef} className="hidden-canvas" />
          <div className="scan-vignette" />
          <div className="scan-topbar">
            <button className="ghost-button" onClick={() => setStep("start")}>
              닫기
            </button>
            <span>Campus Drop Scan</span>
          </div>
          <div className={`scan-frame ${scanState === "found" ? "is-found" : ""}`}>
            <span />
            <span />
            <span />
            <span />
          </div>
          {scanState !== "found" && (
            <div className="scan-hint">
              <strong>
                {scanState === "requesting"
                  ? "카메라를 준비하고 있어요"
                  : scanState === "error"
                    ? "카메라를 열 수 없어요"
                    : "이미지를 화면 중앙에 맞춰주세요"}
              </strong>
              <p>
                {cameraError ||
                  "데모 마커 포스터의 초록색 표식을 프레임 안에 넣으면 미션 입구가 열립니다."}
              </p>
            </div>
          )}
          {scanState === "found" && (
            <>
              <button className="ar-hit-area" onClick={openMission} aria-label="AR 보물상자 열기" />
              <div ref={threeMountRef} className="three-layer" aria-hidden="true" />
              {!threeReady && (
                <div className="css-chest" aria-hidden="true">
                  <span className="css-chest-lid" />
                  <span className="css-chest-lock" />
                </div>
              )}
              <div className="ar-copy">
                <strong>보물상자를 탭하세요</strong>
                <span>이미지 마커 위에 미션 입구가 열렸습니다</span>
              </div>
            </>
          )}
        </section>
      )}

      {step === "mission" && (
        <section className="screen mission-screen">
          <div className="mission-header">
            <span className="location-chip">세종관 1층 라운지</span>
            <h2>잠긴 캠퍼스 박스</h2>
            <p>세 개의 단서를 조합해 3자리 코드를 입력하세요.</p>
          </div>
          <div className="clue-board" aria-label="미션 단서">
            <div className="clue">
              <span>단서 1</span>
              <strong>강의실 문패의 네 번째 숫자</strong>
            </div>
            <div className="clue">
              <span>단서 2</span>
              <strong>포스터 속 두 번째 별 개수</strong>
            </div>
            <div className="clue">
              <span>단서 3</span>
              <strong>쿠폰 스탬프에 남은 여덟 조각</strong>
            </div>
          </div>
          <form className="code-form" onSubmit={submitMission}>
            <label htmlFor="mission-code">3자리 코드</label>
            <input
              id="mission-code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 3));
                setMissionError("");
              }}
              placeholder="000"
            />
            {missionError && <p className="form-error">{missionError}</p>}
            <button className="primary-action" type="submit">
              박스 열기
            </button>
          </form>
        </section>
      )}

      {step === "success" && (
        <section className="screen success-screen">
          <div className={`reward-burst ${collected ? "is-collected" : ""}`}>
            <span />
            <span />
            <span />
            <div className="reward-token">20%</div>
          </div>
          <h2>미션 클리어!</h2>
          <p>오늘만 사용할 수 있는 캠퍼스 보상을 획득했어요.</p>
        </section>
      )}

      {step === "coupon" && (
        <section className="screen coupon-screen">
          <p className="eyebrow">Reward unlocked</p>
          <h2>오늘의 캠퍼스 쿠폰</h2>
          <div className="coupon-ticket">
            <div>
              <span className="store-name">세종 카페 라운지</span>
              <strong>아메리카노 20% 할인</strong>
            </div>
            <div className="coupon-visual" aria-label="쿠폰 코드 CAMPUS-428">
              <span />
              <span />
              <span />
              <span />
              <em>CAMPUS-428</em>
            </div>
            <div className="coupon-footer">
              <span>{todayLabel}</span>
              <strong>오늘 23:59까지</strong>
            </div>
          </div>
          <div className="today-alert">당일 사용 제한 쿠폰입니다</div>
          <button
            className="secondary-action"
            onClick={() => {
              setCode("");
              setCollected(false);
              setStep("start");
            }}
          >
            처음부터 다시 시연
          </button>
        </section>
      )}
    </main>
  );
}

function loadThree() {
  if (window.THREE) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("[data-three]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/three@0.160.0/build/three.min.js";
    script.async = true;
    script.dataset.three = "true";
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.head.appendChild(script);
  });
}
