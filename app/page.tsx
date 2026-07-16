"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Step = "start" | "scan" | "mission" | "success" | "coupon";
type ScanState = "idle" | "requesting" | "searching" | "found" | "error";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any;
    }
  }
}

const fixtureUrl = "/sejong-map-fixture.jpeg";
const posterUrl = "/campus-drop-marker.svg";
const npcModelUrl = "/sejongGF.glb";
const answer = "428";
const npcDialogueText = "지도 앞까지 왔구나. 오늘의 캠퍼스 퀘스트를 받을 준비 됐어?";
const dialogueStartMs = 4300;
const typingIntervalMs = 46;

export default function Home() {
  const [step, setStep] = useState<Step>("start");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [cameraError, setCameraError] = useState("");
  const [code, setCode] = useState("");
  const [missionError, setMissionError] = useState("");
  const [collected, setCollected] = useState(false);
  const [canOpenMission, setCanOpenMission] = useState(false);
  const [typedDialogue, setTypedDialogue] = useState("");
  const [frozenFrame, setFrozenFrame] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
    if (step !== "success") return;
    setCollected(true);
    const timer = window.setTimeout(() => setStep("coupon"), 1700);
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    setCanOpenMission(false);
    setTypedDialogue("");
    if (scanState !== "found") return;

    let index = 0;
    let interval: number | undefined;
    let readyTimer: number | undefined;
    const startTimer = window.setTimeout(() => {
      interval = window.setInterval(() => {
        index += 1;
        setTypedDialogue(npcDialogueText.slice(0, index));
        if (index >= npcDialogueText.length) {
          if (interval) window.clearInterval(interval);
          readyTimer = window.setTimeout(() => setCanOpenMission(true), 260);
        }
      }, typingIntervalMs);
    }, dialogueStartMs);

    return () => {
      window.clearTimeout(startTimer);
      if (interval) window.clearInterval(interval);
      if (readyTimer) window.clearTimeout(readyTimer);
    };
  }, [scanState]);

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function freezeCameraFrame(video: HTMLVideoElement) {
    const snapshot = document.createElement("canvas");
    snapshot.width = video.videoWidth;
    snapshot.height = video.videoHeight;
    const snapshotCtx = snapshot.getContext("2d");
    if (!snapshotCtx) return;
    snapshotCtx.drawImage(video, 0, 0, snapshot.width, snapshot.height);
    setFrozenFrame(snapshot.toDataURL("image/jpeg", 0.86));
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
      canvas.width = 120;
      canvas.height = 120;
      ctx.drawImage(video, 0, 0, 120, 120);
      const posterImage = ctx.getImageData(18, 18, 60, 60).data;
      const fixtureImage = ctx.getImageData(20, 35, 80, 60).data;
      const dayFixtureImage = ctx.getImageData(6, 28, 108, 68).data;
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
        const r = dayFixtureImage[i];
        const g = dayFixtureImage[i + 1];
        const b = dayFixtureImage[i + 2];
        if (g > 92 && b > 78 && r < 178 && g > r * 1.04 && b > r * 0.88) dayCyan += 1;
        if (r > 112 && b > 60 && g < 150 && r > g * 1.04 && r > b * 0.92) dayPink += 1;
        if (r > 122 && g > 104 && b > 70 && r > b * 1.04 && g > b * 0.96) dayParchment += 1;
        if (r < 118 && g < 112 && b < 118) dayInk += 1;
      }
      const posterDetected = green > 130 && yellow > 70 && dark > 60;
      const fixtureDetected =
        cyan > 260 &&
        pink > 80 &&
        bright > 1350 &&
        fixtureDark > 900 &&
        cyan + pink + bright + fixtureDark > 3300;
      const daylightFixtureDetected =
        dayCyan > 420 &&
        dayPink > 28 &&
        dayParchment > 900 &&
        dayInk > 220 &&
        dayParchment < 5600 &&
        dayCyan + dayPink + dayParchment + dayInk > 2300;
      const detected = posterDetected || fixtureDetected || daylightFixtureDetected;
      foundFramesRef.current = detected ? foundFramesRef.current + 1 : 0;
      if (foundFramesRef.current > 10) {
        freezeCameraFrame(video);
        stopCamera();
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
    setCanOpenMission(false);
    setTypedDialogue("");
    setFrozenFrame("");
    foundFramesRef.current = 0;
  }

  function openMission() {
    if (!canOpenMission) return;
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
          <p className="lead">지도 안내판이나 전용 포스터를 스캔하면 기린이 나타납니다</p>
          <button className="primary-action" onClick={beginScan}>
            AR 스캔 시작
          </button>
          <div className="marker-links">
            <a className="marker-link" href={fixtureUrl} target="_blank">
              인식할 기물 예시 보기
            </a>
            <a className="marker-link" href={posterUrl} target="_blank">
              전용 포스터 열기
            </a>
          </div>
        </section>
      )}

      {step === "scan" && (
        <section className="screen scan-screen" aria-label="AR 스캔 화면">
          <video ref={videoRef} className="camera-feed" playsInline muted />
          {frozenFrame && (
            <img className="camera-freeze" src={frozenFrame} alt="" aria-hidden="true" />
          )}
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
                    : "지도 안내판이나 포스터를 중앙에 맞춰주세요"}
              </strong>
              <p>
                {cameraError ||
                  "세종대 지도 안내판의 낮/야간 지도 영역 또는 전용 포스터의 초록/노랑 표식이 프레임 안에 들어오면 기린이 나타납니다."}
              </p>
            </div>
          )}
          {scanState === "found" && (
            <>
              <button
                className="ar-hit-area"
                onClick={openMission}
                aria-label="퀘스트 기린 만나기"
                disabled={!canOpenMission}
              />
              <div className="summon-flash" aria-hidden="true" />
              <div className="speed-lines" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="npc-stage" aria-hidden="true">
                <div className="clock-gears">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="summon-beam" />
                <div className="npc-glow" />
                <div className="impact-ring" />
                <div className="clock-hands" />
                <div className="summon-runes">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="spark-field">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <model-viewer
                  src={npcModelUrl}
                  camera-orbit="90deg 76deg 3.2m"
                  field-of-view="28deg"
                  exposure="1.1"
                  shadow-intensity="0"
                  interaction-prompt="none"
                  disable-zoom
                  alt="Campus Drop quest giraffe"
                />
              </div>
              <div
                className={`npc-dialogue ${
                  typedDialogue && typedDialogue.length < npcDialogueText.length ? "is-typing" : ""
                } ${canOpenMission ? "is-complete" : ""}`}
              >
                <strong>세종 기린</strong>
                <p>{typedDialogue}</p>
                <span>기린을 탭해 퀘스트 시작</span>
              </div>
            </>
          )}
        </section>
      )}

      {step === "mission" && (
        <section className="screen mission-screen">
          <div className="mission-header">
            <span className="location-chip">세종관 1층 라운지</span>
            <h2>기린의 캠퍼스 퀘스트</h2>
            <p>기린이 남긴 세 개의 단서를 조합해 3자리 코드를 입력하세요.</p>
          </div>
          <div className="clue-board" aria-label="미션 단서">
            <div className="clue">
              <span>단서 1</span>
              <strong>강의실 문패의 네 번째 숫자</strong>
            </div>
            <div className="clue">
              <span>단서 2</span>
              <strong>지도 위 두 번째 분홍 번호</strong>
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
              퀘스트 제출
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
            <div className="coupon-visual" aria-label="오늘의 캠퍼스 쿠폰 QR 코드 CAMPUS-428">
              <div className="coupon-qr" aria-hidden="true">
                <span className="qr-eye qr-eye-tl" />
                <span className="qr-eye qr-eye-tr" />
                <span className="qr-eye qr-eye-bl" />
                <span className="qr-pixels" />
              </div>
              <em>QR 쿠폰 · CAMPUS-428</em>
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
