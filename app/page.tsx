"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Step =
  | "signup-basic"
  | "signup-schedule"
  | "signup-interests"
  | "signup-hobbies"
  | "start"
  | "map"
  | "explore"
  | "crew"
  | "collection"
  | "settings"
  | "scan"
  | "mission"
  | "success"
  | "coupon";
type ScanState = "idle" | "requesting" | "searching" | "found" | "error";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any;
    }
  }

  interface Window {
    kakao?: {
      maps: {
        load: (callback: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => unknown;
        Marker: new (options: { position: unknown }) => { setMap: (map: unknown) => void };
      };
    };
  }
}

const fixtureUrl = "/sejong-map-fixture.jpeg";
const posterUrl = "/campus-drop-marker.svg";
const npcModelUrl = "/sejongGF.glb";
const answer = "428";
const npcDialogueText = "지도 앞까지 왔구나. 오늘의 캠퍼스 퀘스트를 받을 준비 됐어?";
const dialogueStartMs = 4300;
const typingIntervalMs = 46;
const sejongCenter = { lat: 37.550944, lng: 127.073765 };

export default function Home() {
  const [step, setStep] = useState<Step>("signup-basic");
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
  const kakaoMapRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const foundFramesRef = useRef(0);
  const [kakaoReady, setKakaoReady] = useState(false);

  const todayLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    return formatter.format(new Date());
  }, []);

  useEffect(() => {
    if (step !== "map" || !kakaoMapRef.current || kakaoReady) return;
    const params = new URLSearchParams(window.location.search);
    const keyFromQuery = params.get("kakaoKey");
    if (keyFromQuery) window.localStorage.setItem("campusDropKakaoKey", keyFromQuery);
    const kakaoKey =
      keyFromQuery ||
      window.localStorage.getItem("campusDropKakaoKey") ||
      "";
    if (!kakaoKey) return;

    const renderMap = () => {
      if (!window.kakao || !kakaoMapRef.current) return;
      window.kakao.maps.load(() => {
        if (!window.kakao || !kakaoMapRef.current) return;
        const center = new window.kakao.maps.LatLng(sejongCenter.lat, sejongCenter.lng);
        const map = new window.kakao.maps.Map(kakaoMapRef.current, { center, level: 3 });
        const marker = new window.kakao.maps.Marker({ position: center });
        marker.setMap(map);
        setKakaoReady(true);
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>("script[data-campus-drop-kakao]");
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
  }, [kakaoReady, step]);

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
      foundFramesRef.current = detected ? foundFramesRef.current + 1 : 0;
      if (foundFramesRef.current > requiredFrames) {
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

  const BottomNav = () => (
    <nav className="bottom-nav" aria-label="캠퍼스 드랍 하단 메뉴">
      <button className={step === "start" ? "is-active" : ""} onClick={() => setStep("start")}>🏠<span>홈</span></button>
      <button className={step === "map" ? "is-active" : ""} onClick={() => setStep("map")}>🗺<span>지도</span></button>
      <button className={step === "explore" ? "is-active" : ""} onClick={() => setStep("explore")}>💎<span>탐색</span></button>
      <button className={step === "crew" ? "is-active" : ""} onClick={() => setStep("crew")}>👥<span>크루</span></button>
      <button className={step === "collection" ? "is-active" : ""} onClick={() => setStep("collection")}>📖<span>도감</span></button>
    </nav>
  );

  const SettingsButton = () => (
    <button className="settings-button" onClick={() => setStep("settings")} aria-label="설정 열기">
      ⚙
    </button>
  );

  const SignupProgress = ({ current }: { current: number }) => (
    <div className="signup-progress" aria-label={`회원가입 ${current}단계`}>
      {[1, 2, 3, 4].map((item) => (
        <span key={item} className={item <= current ? "is-active" : ""} />
      ))}
    </div>
  );

  return (
    <main className={`app step-${step}`}>
      {step === "signup-basic" && (
        <section className="screen signup-screen">
          <div className="signup-header">
            <p className="eyebrow">회원가입 1/4</p>
            <h2>기본정보</h2>
            <p>캠퍼스 드랍에서 사용할 내 정보를 입력합니다.</p>
          </div>
          <SignupProgress current={1} />
          <div className="signup-panel form-panel">
            <label>이름<input placeholder="김세종" /></label>
            <label>성별<select defaultValue=""><option value="" disabled>선택</option><option>여성</option><option>남성</option><option>응답하지 않음</option></select></label>
            <label>나이<input inputMode="numeric" placeholder="22" /></label>
            <label>전화번호<input inputMode="tel" placeholder="010-1234-5678" /></label>
            <label>학과<input placeholder="컴퓨터공학과" /></label>
          </div>
          <button className="primary-action" onClick={() => setStep("signup-schedule")}>다음</button>
        </section>
      )}

      {step === "signup-schedule" && (
        <section className="screen signup-screen">
          <div className="signup-header">
            <button className="ghost-light-button" onClick={() => setStep("signup-basic")}>이전</button>
            <p className="eyebrow">회원가입 2/4</p>
            <h2>시간표</h2>
            <p>같이 움직일 수 있는 캠퍼스 시간을 등록합니다.</p>
          </div>
          <SignupProgress current={2} />
          <div className="signup-panel schedule-panel">
            <strong>이번 주 빈 시간</strong>
            <div className="time-grid" aria-label="시간표 선택">
              <button type="button">월 3-4교시</button><button type="button">화 5-6교시</button>
              <button type="button">수 점심</button><button type="button">목 7-8교시</button>
              <button type="button">금 오후</button><button type="button">주말 가능</button>
            </div>
          </div>
          <button className="primary-action" onClick={() => setStep("signup-interests")}>다음</button>
        </section>
      )}

      {step === "signup-interests" && (
        <section className="screen signup-screen">
          <div className="signup-header">
            <button className="ghost-light-button" onClick={() => setStep("signup-schedule")}>이전</button>
            <p className="eyebrow">회원가입 3/4</p>
            <h2>관심사</h2>
            <p>처음 만난 크루와 이야기하기 좋은 주제를 고릅니다.</p>
          </div>
          <SignupProgress current={3} />
          <div className="signup-panel">
            <strong>이야기 거리</strong>
            <div className="chip-grid" aria-label="관심사 선택">
              <button type="button">신작 영화</button><button type="button">맛집</button>
              <button type="button">전공 이야기</button><button type="button">취업/인턴</button>
              <button type="button">공연/전시</button><button type="button">여행</button>
            </div>
          </div>
          <button className="primary-action" onClick={() => setStep("signup-hobbies")}>다음</button>
        </section>
      )}

      {step === "signup-hobbies" && (
        <section className="screen signup-screen">
          <div className="signup-header">
            <button className="ghost-light-button" onClick={() => setStep("signup-interests")}>이전</button>
            <p className="eyebrow">회원가입 4/4</p>
            <h2>취미</h2>
            <p>같이 놀거나 미션을 돌 때 어울리는 활동을 고릅니다.</p>
          </div>
          <SignupProgress current={4} />
          <div className="signup-panel">
            <strong>같이 놀거리</strong>
            <div className="chip-grid" aria-label="취미 선택">
              <button type="button">보드게임</button><button type="button">산책</button>
              <button type="button">카페 탐방</button><button type="button">운동</button>
              <button type="button">사진 찍기</button><button type="button">방탈출</button>
            </div>
          </div>
          <button className="primary-action" onClick={() => setStep("start")}>가입 완료</button>
        </section>
      )}

      {step === "start" && (
        <section className="screen home-screen app-tab-screen">
          <SettingsButton />
          <div className="season-badge">🐴 황금말 시즌</div>
          <div className="crew-hero-card">
            <div className="crew-model-bubble">🐺</div>
            <div>
              <p className="eyebrow">나의 크루</p>
              <h1>피닉스</h1>
              <strong>레벨 8</strong>
              <div className="xp-bar"><span style={{ width: "82%" }} /></div>
              <p>우리 크루가 다음 레벨까지 82% 성장했어요.</p>
            </div>
          </div>
          <div className="event-strip">
            <span>다음 방탈출 미션</span>
            <strong>D-5</strong>
            <button onClick={() => setStep("map")}>시작</button>
          </div>
          <div className="section-block">
            <h2>오늘의 미션</h2>
            <div className="mission-pills"><span>보물 찾기</span><span>제휴 매장 방문</span></div>
          </div>
          <div className="activity-line">민수가 새로운 캐릭터를 획득했습니다.</div>
          <BottomNav />
        </section>
      )}

      {step === "map" && (
        <section className="screen map-screen app-tab-screen">
          <SettingsButton />
          <div className="app-header"><p className="eyebrow">캠퍼스 지도</p><h2>크루들이 캠퍼스를 움직이고 있어요</h2></div>
          <div className="kakao-map-shell">
            <div ref={kakaoMapRef} className="kakao-map-canvas" aria-label="카카오 캠퍼스 지도" />
            {!kakaoReady && (
              <div className="kakao-map-fallback">
                <strong>카카오맵 준비됨</strong>
                <p>URL 뒤에 <span>?kakaoKey=자바스크립트키</span>를 붙이면 실제 카카오 지도가 이 자리에 표시됩니다.</p>
              </div>
            )}
            <button className="crew-marker phoenix">🐺<strong>피닉스</strong></button>
            <button className="crew-marker aurora">🦊<strong>오로라</strong></button>
            <button className="crew-marker nova">🦉<strong>노바</strong></button>
            <span className="treasure-dot">💎</span>
            <span className="store-dot">☕</span>
          </div>
          <div className="map-detail-card">
            <span>현재 순위 3위</span>
            <strong>피닉스 · 경험치 12,840</strong>
            <p>3D 모델은 경험치에 따라 크기만 커집니다. 우리 커뮤니티가 함께 성장하고 있어요.</p>
          </div>
          <button className="primary-action" onClick={beginScan}>AR 스캔 시작</button>
          <BottomNav />
        </section>
      )}

      {step === "explore" && (
        <section className="screen explore-screen app-tab-screen">
          <SettingsButton />
          <div className="app-header"><p className="eyebrow">오늘</p><h2>오늘 캠퍼스에서 열리는 일</h2></div>
          <div className="treasure-card"><span>🐴</span><strong>오늘의 보물</strong><p>시계탑 근처 · 보상 캐릭터 조각</p></div>
          <div className="store-card"><span>☕</span><strong>세종 카페 라운지</strong><p>아메리카노 20% · 120m</p></div>
          <div className="store-card"><span>🎟</span><strong>한정 이벤트</strong><p>탈출 미션 D-5 · 우리 크루가 함께 발견했어요.</p></div>
          <BottomNav />
        </section>
      )}

      {step === "crew" && (
        <section className="screen crew-screen app-tab-screen">
          <SettingsButton />
          <div className="crew-profile">
            <div className="crew-model-bubble large">🐺</div>
            <h2>피닉스</h2>
            <p>황금말 시즌 · 경험치 12,840</p>
          </div>
          <div className="member-grid">
            <div><strong>민수</strong><span>탐험가</span></div>
            <div><strong>지윤</strong><span>분위기 메이커</span></div>
            <div><strong>하린</strong><span>맛집 헌터</span></div>
          </div>
          <div className="crew-chat">오늘 6시에 보물 위치 같이 확인할 사람?</div>
          <div className="vote-card"><strong>대표 모델 투표</strong><p>이번 주는 피닉스가 62%로 앞서고 있어요.</p></div>
          <BottomNav />
        </section>
      )}

      {step === "collection" && (
        <section className="screen collection-screen app-tab-screen">
          <SettingsButton />
          <div className="app-header"><p className="eyebrow">도감</p><h2>우리 크루가 함께 발견한 기록</h2></div>
          <div className="collection-grid">
            <button>🐺<span>발견함</span></button>
            <button>🦊<span>발견함</span></button>
            <button>🦉<span>발견함</span></button>
            <button className="is-locked">?</button>
            <button className="is-locked">?</button>
            <button className="is-locked">?</button>
          </div>
          <div className="title-strip"><span>탐험가</span><span>탐정</span><span>맛집 헌터</span></div>
          <div className="season-record">🏆 황금말 시즌 · 참여 기록 8회</div>
          <BottomNav />
        </section>
      )}

      {step === "settings" && (
        <section className="screen settings-screen">
          <div className="settings-header">
            <button className="ghost-light-button" onClick={() => setStep("start")}>
              뒤로
            </button>
            <p className="eyebrow">설정</p>
            <h2>내 설정</h2>
            <p>언어와 프로필 취향을 다시 맞춰볼 수 있어요.</p>
          </div>
          <div className="settings-panel">
            <span>언어 설정</span>
            <div className="segmented-grid" aria-label="언어 선택">
              <button className="is-selected" type="button">한국어</button>
              <button type="button">중국어</button>
              <button type="button">일본어</button>
              <button type="button">영어</button>
            </div>
          </div>
          <div className="settings-panel">
            <span>관심사 다시 설정</span>
            <div className="chip-grid">
              <button type="button">신작 영화</button>
              <button type="button">맛집</button>
              <button type="button">전공 이야기</button>
              <button type="button">취업/인턴</button>
            </div>
          </div>
          <div className="settings-panel">
            <span>취미 다시 설정</span>
            <div className="chip-grid">
              <button type="button">보드게임</button>
              <button type="button">산책</button>
              <button type="button">카페 탐방</button>
              <button type="button">운동</button>
            </div>
          </div>
          <div className="settings-panel my-info-card">
            <span>내 정보</span>
            <strong>김세종 · 22세 · 컴퓨터공학과</strong>
            <p>전화번호 010-1234-5678</p>
            <p>소속 크루 피닉스 · 황금말 시즌 참여 중</p>
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
            <span>캠퍼스 드랍 스캔</span>
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
                  alt="캠퍼스 드랍 퀘스트 기린"
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
          <p className="eyebrow">보상 획득</p>
          <h2>오늘의 캠퍼스 쿠폰</h2>
          <div className="coupon-ticket">
            <div>
              <span className="store-name">세종 카페 라운지</span>
              <strong>아메리카노 20% 할인</strong>
            </div>
            <div className="coupon-visual" aria-label="오늘의 캠퍼스 쿠폰 큐알 코드 캠퍼스-428">
              <div className="coupon-qr" aria-hidden="true">
                <span className="qr-eye qr-eye-tl" />
                <span className="qr-eye qr-eye-tr" />
                <span className="qr-eye qr-eye-bl" />
                <span className="qr-pixels" />
              </div>
              <em>큐알 쿠폰 · 캠퍼스-428</em>
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
