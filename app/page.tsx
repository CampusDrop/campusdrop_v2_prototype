"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";

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
    CAMPUS_DROP_MAPBOX_TOKEN?: string;
    mapboxgl?: {
      accessToken: string;
      Map: new (options: {
        container: HTMLElement;
        style: string;
        center: [number, number];
        zoom: number;
        pitch?: number;
      }) => {
        on: (type: string, callback: () => void) => void;
        getZoom: () => number;
        flyTo: (options: { center: [number, number]; zoom?: number; essential?: boolean }) => void;
        remove: () => void;
      };
      Marker: new (options?: { element?: HTMLElement; anchor?: string }) => {
        setLngLat: (lngLat: [number, number]) => {
          addTo: (map: unknown) => { remove: () => void };
        };
        remove: () => void;
      };
    };
    kakao?: {
      maps: {
        load: (callback: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => {
          getLevel: () => number;
          setCenter: (latLng: unknown) => void;
          panTo?: (latLng: unknown) => void;
        };
        Marker: new (options: { position: unknown }) => { setMap: (map: unknown) => void };
        CustomOverlay: new (options: {
          position: unknown;
          content: HTMLElement;
          xAnchor: number;
          yAnchor: number;
          zIndex: number;
        }) => { setMap: (map: unknown) => void };
        event: {
          addListener: (target: unknown, type: string, callback: () => void) => void;
        };
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
const mapboxStyle = "mapbox://styles/mapbox/dark-v11";
const mapCrewPoints = [
  { name: "피닉스", lat: 37.550944, lng: 127.073765 },
  { name: "오로라", lat: 37.55135, lng: 127.07432 },
  { name: "노바", lat: 37.55052, lng: 127.07318 },
];
const mapZoomScaleByLevel: Record<number, number> = {
  1: 2.25,
  2: 1.78,
  3: 1.24,
  4: 0.92,
  5: 0.68,
  6: 0.5,
  7: 0.38,
};
const scheduleDays = ["월", "화", "수", "목", "금"];
const schedulePeriods = ["1", "2", "3", "4", "5", "6", "7", "8"];
const classPresets = [
  { name: "자료구조", short: "자료", slots: ["mon-2", "mon-3", "wed-2", "wed-3"] },
  { name: "서비스 디자인", short: "디자인", slots: ["tue-5", "tue-6", "thu-5", "thu-6"] },
  { name: "인공지능 입문", short: "AI", slots: ["wed-6", "wed-7", "fri-4"] },
];
const dayKeys = ["mon", "tue", "wed", "thu", "fri"];
const interestOptions = [
  { label: "신작 영화", icon: "FILM" },
  { label: "맛집", icon: "FOOD" },
  { label: "전공 이야기", icon: "STUDY" },
  { label: "취업/인턴", icon: "CAREER" },
  { label: "공연/전시", icon: "ART" },
  { label: "여행", icon: "TRIP" },
];
const hobbyOptions = [
  { label: "보드게임", icon: "BOARD" },
  { label: "산책", icon: "WALK" },
  { label: "카페 탐방", icon: "CAFE" },
  { label: "운동", icon: "SPORT" },
  { label: "사진 찍기", icon: "PHOTO" },
  { label: "방탈출", icon: "ESCAPE" },
];
const collectionModels = [
  { season: "황금말 시즌", name: "세종 기린", title: "시계탑 정령", unlocked: true, src: npcModelUrl },
  { season: "황금말 시즌", name: "달빛 여우", title: "야간 탐험 보상", unlocked: false, src: "" },
  { season: "황금말 시즌", name: "도서관 부엉이", title: "스터디 미션 보상", unlocked: false, src: "" },
  { season: "벚꽃 시즌", name: "봄길 사슴", title: "지난 시즌 기록", unlocked: true, src: npcModelUrl },
];

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
  const [mapMenuOpen, setMapMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const kakaoShellRef = useRef<HTMLDivElement | null>(null);
  const kakaoMapRef = useRef<HTMLDivElement | null>(null);
  const mapboxMapInstanceRef = useRef<{
    flyTo: (options: { center: [number, number]; zoom?: number; duration?: number; essential?: boolean }) => void;
  } | null>(null);
  const myLocationOverlayRef = useRef<{ remove: () => void } | null>(null);
  const lastLocationRequestRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const foundFramesRef = useRef(0);
  const [kakaoReady, setKakaoReady] = useState(false);
  const [locationStatus, setLocationStatus] = useState("내 위치 표시");
  const [classSearch, setClassSearch] = useState("");
  const [classSlots, setClassSlots] = useState<Record<string, string>>({
    "mon-2": "자료",
    "mon-3": "자료",
    "wed-2": "자료",
    "wed-3": "자료",
    "tue-5": "디자인",
    "tue-6": "디자인",
  });
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [interestError, setInterestError] = useState("");
  const [hobbyError, setHobbyError] = useState("");
  const [collectionIndex, setCollectionIndex] = useState(0);
  const dragModeRef = useRef<"add" | "remove">("add");

  const todayLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    return formatter.format(new Date());
  }, []);
  const activeCollection = collectionModels[collectionIndex];
  const previousCollection = collectionModels[(collectionIndex + collectionModels.length - 1) % collectionModels.length];
  const nextCollection = collectionModels[(collectionIndex + 1) % collectionModels.length];

  useEffect(() => {
    if (step !== "map" || !kakaoMapRef.current || kakaoReady) return;
    const params = new URLSearchParams(window.location.search);
    const tokenFromQuery = params.get("mapboxToken");
    if (tokenFromQuery) window.localStorage.setItem("campusDropMapboxToken", tokenFromQuery);
    const mapboxToken =
      tokenFromQuery ||
      window.localStorage.getItem("campusDropMapboxToken") ||
      window.CAMPUS_DROP_MAPBOX_TOKEN ||
      "";
    if (!mapboxToken) return;

    const renderMap = () => {
      if (!window.mapboxgl || !kakaoMapRef.current) return;
      window.mapboxgl.accessToken = mapboxToken;
      const map = new window.mapboxgl.Map({
        container: kakaoMapRef.current,
        style: mapboxStyle,
        center: [sejongCenter.lng, sejongCenter.lat],
        zoom: 16,
        pitch: 0,
      });
      mapboxMapInstanceRef.current = map;
      map.on("load", () => setKakaoReady(true));
      map.on("error", () => setKakaoReady(false));
      mapCrewPoints.forEach((crew) => {
        const marker = document.createElement("button");
        marker.type = "button";
        marker.className = "kakao-crew-overlay";
        marker.innerHTML = `
          <model-viewer src="${npcModelUrl}" camera-orbit="90deg 76deg 3.2m" field-of-view="28deg" exposure="1.1" auto-rotate interaction-prompt="none" disable-zoom alt="${crew.name} 크루 기린"></model-viewer>
          <strong>${crew.name}</strong>
        `;
        new window.mapboxgl!.Marker({ element: marker, anchor: "bottom" }).setLngLat([crew.lng, crew.lat]).addTo(map);
      });
        const syncMapPointScale = () => {
          const zoomLevel = Math.max(1, Math.min(7, Math.round(19 - map.getZoom())));
          const scale = mapZoomScaleByLevel[zoomLevel] ?? 0.32;
          kakaoShellRef.current?.style.setProperty("--map-zoom-scale", scale.toFixed(3));
          kakaoMapRef.current?.style.setProperty("--map-zoom-scale", scale.toFixed(3));
        };
        syncMapPointScale();
        map.on("zoom", syncMapPointScale);
    };

    const existingLink = document.querySelector<HTMLLinkElement>("link[data-campus-drop-mapbox-css]");
    if (!existingLink) {
      const link = document.createElement("link");
      link.dataset.campusDropMapboxCss = "true";
      link.rel = "stylesheet";
      link.href = "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css";
      document.head.appendChild(link);
    }

    const existingScript = document.querySelector<HTMLScriptElement>("script[data-campus-drop-mapbox]");
    if (existingScript) {
      renderMap();
      return;
    }

    const script = document.createElement("script");
    script.dataset.campusDropMapbox = "true";
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.js";
    script.async = true;
    script.onload = renderMap;
    document.head.appendChild(script);
  }, [kakaoReady, step]);

  function requestMyLocation() {
    const now = Date.now();
    if (now - lastLocationRequestRef.current < 900) return;
    lastLocationRequestRef.current = now;
    if (!navigator.geolocation) {
      setLocationStatus("위치 사용 불가");
      return;
    }
    setLocationStatus("위치 확인 중");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!window.mapboxgl || !mapboxMapInstanceRef.current) {
          setLocationStatus("지도 준비 필요");
          return;
        }
        const lngLat: [number, number] = [position.coords.longitude, position.coords.latitude];
        mapboxMapInstanceRef.current.flyTo({
          center: lngLat,
          zoom: 17.8,
          duration: 1200,
          essential: true,
        });
        if (!myLocationOverlayRef.current) {
          const marker = document.createElement("div");
          marker.className = "my-location-marker";
          marker.innerHTML = "<span></span><strong>내 위치</strong>";
          myLocationOverlayRef.current = new window.mapboxgl.Marker({ element: marker }).setLngLat(lngLat).addTo(mapboxMapInstanceRef.current);
        } else {
          myLocationOverlayRef.current.remove();
          const marker = document.createElement("div");
          marker.className = "my-location-marker";
          marker.innerHTML = "<span></span><strong>내 위치</strong>";
          myLocationOverlayRef.current = new window.mapboxgl.Marker({ element: marker }).setLngLat(lngLat).addTo(mapboxMapInstanceRef.current);
        }
        setLocationStatus("내 위치 표시됨");
      },
      () => {
        setLocationStatus("위치 권한 필요");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  }

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
    if (step === "scan") return;
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

  function paintClassSlot(slot: string) {
    setClassSlots((current) => {
      const next = { ...current };
      if (dragModeRef.current === "add") next[slot] = "수업";
      else delete next[slot];
      return next;
    });
  }

  function startClassDrag(slot: string) {
    dragModeRef.current = classSlots[slot] ? "remove" : "add";
    paintClassSlot(slot);
  }

  function fillPreset(preset: (typeof classPresets)[number]) {
    setClassSlots((current) => {
      const next = { ...current };
      preset.slots.forEach((slot) => {
        next[slot] = preset.short;
      });
      return next;
    });
  }

  function toggleChoice(
    value: string,
    selected: string[],
    setSelected: (next: string[]) => void,
    clearError: () => void
  ) {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    setSelected(next);
    if (next.length > 0) clearError();
  }

  function goNextFromInterests() {
    if (selectedInterests.length === 0) {
      setInterestError("관심사를 1개 이상 선택해주세요.");
      return;
    }
    setStep("signup-hobbies");
  }

  function finishSignup() {
    if (selectedHobbies.length === 0) {
      setHobbyError("취미를 1개 이상 선택해주세요.");
      return;
    }
    setStep("map");
  }

  const goToMap = () => {
    setMapMenuOpen(false);
    setStep("map");
  };

  const openFromMapMenu = (nextStep: Step) => {
    setMapMenuOpen(false);
    setStep(nextStep);
  };

  const MapMenu = () => (
    <div className={`map-action-menu${mapMenuOpen ? " is-open" : ""}`}>
      <div className="map-menu-panel" aria-hidden={!mapMenuOpen}>
        <button type="button" onClick={() => openFromMapMenu("start")}>💎<span>탐색</span></button>
        <button type="button" onClick={() => openFromMapMenu("crew")}>👥<span>크루</span></button>
        <button type="button" onClick={() => openFromMapMenu("collection")}>📖<span>도감</span></button>
      </div>
      <button
        type="button"
        className="map-menu-trigger"
        aria-label="지도 메뉴 열기"
        aria-expanded={mapMenuOpen}
        onClick={() => setMapMenuOpen((open) => !open)}
      >
        ✦
      </button>
    </div>
  );

  const MapBackButton = () => (
    <button className="map-back-button" type="button" onClick={goToMap}>지도</button>
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
            <strong>수업 검색</strong>
            <label className="class-search">
              <input
                value={classSearch}
                onChange={(event) => setClassSearch(event.target.value)}
                placeholder="수업명 검색 예: 자료구조"
              />
            </label>
            <div className="class-result-list" aria-label="수업 검색 결과">
              {classPresets
                .filter((preset) => !classSearch || preset.name.includes(classSearch))
                .map((preset) => (
                  <button type="button" key={preset.name} onClick={() => fillPreset(preset)}>
                    <strong>{preset.name}</strong>
                    <span>{preset.slots.length}칸 채우기</span>
                  </button>
                ))}
            </div>
          </div>
          <div className="signup-panel schedule-panel">
            <strong>수업 시간표</strong>
            <p className="schedule-caption">수업이 있는 칸을 드래그해서 체크하세요.</p>
            <div className="class-grid" onPointerLeave={() => (dragModeRef.current = "add")}>
              <span className="grid-corner">교시</span>
              {scheduleDays.map((day) => <span className="grid-day" key={day}>{day}</span>)}
              {schedulePeriods.map((period) => (
                <Fragment key={period}>
                  <span className="grid-period">{period}</span>
                  {dayKeys.map((dayKey) => {
                    const slot = `${dayKey}-${period}`;
                    return (
                      <button
                        type="button"
                        key={slot}
                        className={classSlots[slot] ? "is-class" : ""}
                        onPointerDown={() => startClassDrag(slot)}
                        onPointerEnter={(event) => {
                          if (event.buttons === 1) paintClassSlot(slot);
                        }}
                      >
                        {classSlots[slot] || ""}
                      </button>
                    );
                  })}
                </Fragment>
              ))}
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
            <div className="choice-tile-grid" aria-label="관심사 선택">
              {interestOptions.map((option) => {
                const selected = selectedInterests.includes(option.label);
                return (
                  <button
                    key={option.label}
                    type="button"
                    className={selected ? "is-selected" : ""}
                    aria-pressed={selected}
                    onClick={() =>
                      toggleChoice(option.label, selectedInterests, setSelectedInterests, () =>
                        setInterestError("")
                      )
                    }
                  >
                    <span>{option.icon}</span>
                    <strong>{option.label}</strong>
                  </button>
                );
              })}
            </div>
            <p className="selection-hint">여러 개 선택할 수 있어요.</p>
            <p className="form-error">{interestError}</p>
          </div>
          <button className="primary-action" onClick={goNextFromInterests}>다음</button>
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
            <div className="choice-tile-grid" aria-label="취미 선택">
              {hobbyOptions.map((option) => {
                const selected = selectedHobbies.includes(option.label);
                return (
                  <button
                    key={option.label}
                    type="button"
                    className={selected ? "is-selected" : ""}
                    aria-pressed={selected}
                    onClick={() =>
                      toggleChoice(option.label, selectedHobbies, setSelectedHobbies, () =>
                        setHobbyError("")
                      )
                    }
                  >
                    <span>{option.icon}</span>
                    <strong>{option.label}</strong>
                  </button>
                );
              })}
            </div>
            <p className="selection-hint">여러 개 선택할 수 있어요.</p>
            <p className="form-error">{hobbyError}</p>
          </div>
          <button className="primary-action" onClick={finishSignup}>가입 완료</button>
        </section>
      )}

      {step === "start" && (
        <section className="screen home-screen app-tab-screen">
          <SettingsButton />
          <MapBackButton />
          <div className="app-header"><p className="eyebrow">탐색</p><h2>오늘의 캠퍼스 소식</h2></div>
          <div className="mission-card featured">
            <span>AR</span>
            <strong>시계탑 정령을 깨워라</strong>
            <p>지도 안내판을 스캔하고 기린의 퀘스트를 완료하세요.</p>
            <button type="button" onClick={beginScan}>퀘스트 입장</button>
          </div>
          <div className="mission-card">
            <span>오늘</span>
            <strong>크루 보물 탐색</strong>
            <p>세종 카페 라운지 근처에서 힌트 조각을 발견하면 크루 경험치가 올라갑니다.</p>
          </div>
          <div className="notice-list">
            <h3>공지사항</h3>
            <div><strong>황금말 시즌 진행 중</strong><p>이번 시즌 발견 기록은 도감에 자동으로 쌓입니다.</p></div>
            <div><strong>오늘 23:59 쿠폰 만료</strong><p>획득한 캠퍼스 쿠폰은 당일 안에 사용해야 합니다.</p></div>
          </div>
        </section>
      )}

      {step === "map" && (
        <section className="screen map-screen app-tab-screen">
          <div ref={kakaoShellRef} className={`kakao-map-shell${kakaoReady ? " is-kakao-ready" : ""}`}>
            <div ref={kakaoMapRef} className="kakao-map-canvas" aria-label="Mapbox 캠퍼스 지도" />
            <div className="game-map-layer" aria-hidden="true">
              <span className="game-map-grass grass-a" />
              <span className="game-map-grass grass-b" />
              <span className="game-map-water" />
              <span className="game-map-road road-main" />
              <span className="game-map-road road-branch-a" />
              <span className="game-map-road road-branch-b" />
              <span className="game-map-building building-a" />
              <span className="game-map-building building-b" />
              <span className="game-map-building building-c" />
              <span className="game-map-building building-d" />
              <span className="game-map-plaza" />
            </div>
            {!kakaoReady && (
              <div className="kakao-map-fallback">
                <strong>Mapbox 지도 준비됨</strong>
                <p>URL 뒤에 <span>?mapboxToken=액세스토큰</span>을 붙이면 다크 테마 지도가 표시됩니다.</p>
              </div>
            )}
          </div>
          <div className="map-crew-hud" aria-label="내 크루 상태">
            <span>내 크루</span>
            <strong>피닉스</strong>
            <div className="map-crew-level">
              <em>Lv. 8</em>
              <b>82%</b>
            </div>
            <div className="map-hud-xp-bar"><span style={{ width: "82%" }} /></div>
          </div>
          <div className="map-quest-hud" aria-label="현재 진행중인 퀘스트">
            <span>진행 중인 퀘스트</span>
            <strong>시계탑 정령을 깨워라</strong>
            <p>지도 안내판을 스캔하고 3자리 암호를 풀기</p>
          </div>
          <button
            className="map-location-button"
            type="button"
            aria-label="내 위치로 이동"
            onPointerDown={(event) => {
              event.preventDefault();
              requestMyLocation();
            }}
            onClick={requestMyLocation}
          >
            <span></span>
            {locationStatus}
          </button>
          <button
            className="map-ar-quest-button"
            type="button"
            aria-label="비밀 퀘스트 탐험 시작"
            onPointerDown={(event) => {
              event.preventDefault();
              setMapMenuOpen(false);
              beginScan();
            }}
            onClick={() => {
              setMapMenuOpen(false);
              beginScan();
            }}
          >
            <span aria-hidden="true">AR</span>
          </button>
          <MapMenu />
        </section>
      )}

      {step === "explore" && (
        <section className="screen explore-screen app-tab-screen">
          <SettingsButton />
          <MapBackButton />
          <div className="app-header"><p className="eyebrow">탐색</p><h2>오늘의 캠퍼스 소식</h2></div>
          <div className="mission-card featured"><span>AR</span><strong>시계탑 정령을 깨워라</strong><p>지도 안내판을 스캔하고 기린의 퀘스트를 완료하세요.</p><button type="button" onClick={beginScan}>퀘스트 입장</button></div>
          <div className="mission-card"><span>오늘</span><strong>크루 보물 탐색</strong><p>세종 카페 라운지 근처에서 힌트 조각을 발견하면 크루 경험치가 올라갑니다.</p></div>
          <div className="notice-list"><h3>공지사항</h3><div><strong>황금말 시즌 진행 중</strong><p>이번 시즌 발견 기록은 도감에 자동으로 쌓입니다.</p></div><div><strong>오늘 23:59 쿠폰 만료</strong><p>획득한 캠퍼스 쿠폰은 당일 안에 사용해야 합니다.</p></div></div>
        </section>
      )}

      {step === "crew" && (
        <section className="screen crew-screen app-tab-screen">
          <SettingsButton />
          <MapBackButton />
          <div className="crew-profile">
            <div className="crew-model-bubble large">🐺</div>
            <h2>피닉스</h2>
            <p>황금말 시즌 · 크루 경험치 12,840</p>
            <div className="crew-xp-panel">
              <div><span>다음 레벨까지</span><strong>82%</strong></div>
              <div className="xp-bar"><span style={{ width: "82%" }} /></div>
            </div>
          </div>
          <div className="contributor-list">
            <h3>상위 기여 유저</h3>
            <div><span>1</span><strong>민수</strong><em>+3,420 XP</em></div>
            <div><span>2</span><strong>지윤</strong><em>+2,880 XP</em></div>
            <div><span>3</span><strong>하린</strong><em>+2,140 XP</em></div>
          </div>
          <div className="crew-chat">오늘 6시에 보물 위치 같이 확인할 사람?</div>
        </section>
      )}

      {step === "collection" && (
        <section className="screen collection-screen app-tab-screen">
          <SettingsButton />
          <MapBackButton />
          <div className="collection-profile-card">
            <span>내 정보</span>
            <strong>김세종</strong>
            <p>컴퓨터공학과 · 피닉스 크루</p>
            <div className="equipped-title">
              <em>장착 중인 칭호</em>
              <strong>시계탑의 첫 목격자</strong>
            </div>
            <div className="title-vault" aria-label="보유 칭호">
              <button type="button" className="is-equipped"><span>RARE</span><strong>시계탑 탐험가</strong></button>
              <button type="button"><span>COMMON</span><strong>맛집 헌터</strong></button>
              <button type="button"><span>LOCKED</span><strong>???</strong></button>
            </div>
          </div>
          <div className="collection-carousel">
            <div className="app-header"><p className="eyebrow">시즌 도감</p><h2>{activeCollection.season}</h2></div>
            <div className="carousel-stage">
              <button className="carousel-arrow carousel-prev" type="button" aria-label="이전 도감 모델" onClick={() => setCollectionIndex((index) => (index + collectionModels.length - 1) % collectionModels.length)}>‹</button>
              <div className="model-preview preview-left" aria-hidden="true">
                {previousCollection.unlocked ? (
                  <model-viewer src={previousCollection.src} camera-orbit="90deg 76deg 3.2m" field-of-view="28deg" exposure="1" auto-rotate interaction-prompt="none" disable-zoom alt="" />
                ) : (
                  <div className="locked-model small">??</div>
                )}
              </div>
              <div className="model-showcase">
                {activeCollection.unlocked ? (
                  <model-viewer src={activeCollection.src} camera-orbit="90deg 76deg 3.2m" field-of-view="28deg" exposure="1.1" auto-rotate interaction-prompt="none" disable-zoom alt={activeCollection.name} />
                ) : (
                  <div className="locked-model">??</div>
                )}
              </div>
              <div className="model-preview preview-right" aria-hidden="true">
                {nextCollection.unlocked ? (
                  <model-viewer src={nextCollection.src} camera-orbit="90deg 76deg 3.2m" field-of-view="28deg" exposure="1" auto-rotate interaction-prompt="none" disable-zoom alt="" />
                ) : (
                  <div className="locked-model small">??</div>
                )}
              </div>
              <button className="carousel-arrow carousel-next" type="button" aria-label="다음 도감 모델" onClick={() => setCollectionIndex((index) => (index + 1) % collectionModels.length)}>›</button>
            </div>
            <div className="collection-caption">
              <strong>{activeCollection.unlocked ? activeCollection.name : "미발견 모델"}</strong>
              <p>{activeCollection.title}</p>
            </div>
          </div>
        </section>
      )}

      {step === "settings" && (
        <section className="screen settings-screen">
          <div className="settings-header">
            <button className="ghost-light-button" onClick={goToMap}>
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
            <button className="ghost-button" onClick={goToMap}>
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
              setStep("map");
            }}
          >
            처음부터 다시 시연
          </button>
        </section>
      )}
    </main>
  );
}
