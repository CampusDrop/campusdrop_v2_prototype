"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Scene = "entry" | "incident" | "mission" | "camera" | "arrival" | "witness";
type MessageStep = "hidden" | "first";
type DropLinkMode = "case" | "clue" | "arrange";
type DirectionKey = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

type KakaoLatLng = object;
type KakaoMap = { panTo?: (position: KakaoLatLng) => void };
type KakaoMarker = { setMap: (map: KakaoMap) => void; setPosition?: (position: KakaoLatLng) => void };

type KakaoMarkerImage = object;

type KakaoMapsApi = {
  load: (callback: () => void) => void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
  Size: new (width: number, height: number) => object;
  Point: new (x: number, y: number) => object;
  MarkerImage: new (src: string, size: object, options?: { offset?: object }) => KakaoMarkerImage;
  Marker: new (options: { position: KakaoLatLng; title?: string; image?: KakaoMarkerImage }) => KakaoMarker;
  Circle: new (options: {
    center: KakaoLatLng;
    radius: number;
    strokeWeight: number;
    strokeColor: string;
    strokeOpacity: number;
    fillColor: string;
    fillOpacity: number;
  }) => { setMap: (map: KakaoMap) => void };
};

declare global {
  interface Window {
    kakao?: { maps: KakaoMapsApi };
  }
}

const missionTarget = { lat: 37.55041617275794, lng: 127.07381801425053 };
const towerTarget = { lat: 37.55106257128708, lng: 127.07392616012359 };
const reachRadiusMeters = 20;
const clueRevealRadiusMeters = 10;
const witnessReachRadiusMeters = 10;
const investigationMarkerSrc = "/investigation-marker-v2.png";
const missionMapBounds = {
  lngMin: missionTarget.lng - 0.003,
  lngMax: missionTarget.lng + 0.003,
  latMin: missionTarget.lat - 0.002,
  latMax: missionTarget.lat + 0.002,
};
const directionOptions: { key: DirectionKey; label: string }[] = [
  { key: "N", label: "북쪽" },
  { key: "NE", label: "북동쪽" },
  { key: "E", label: "동쪽" },
  { key: "SE", label: "남동쪽" },
  { key: "S", label: "남쪽" },
  { key: "SW", label: "남서쪽" },
  { key: "W", label: "서쪽" },
  { key: "NW", label: "북서쪽" },
];
const directionVectors: Record<DirectionKey, { x: number; y: number }> = {
  N: { x: 0, y: -1 },
  NE: { x: 0.7, y: -0.7 },
  E: { x: 1, y: 0 },
  SE: { x: 0.7, y: 0.7 },
  S: { x: 0, y: 1 },
  SW: { x: -0.7, y: 0.7 },
  W: { x: -1, y: 0 },
  NW: { x: -0.7, y: -0.7 },
};
const witnesses = [
  {
    id: "A",
    name: "목격자 A",
    place: "잔디밭 남서쪽",
    location: { lat: 37.55009418972363, lng: 127.0736196575354 },
    photo: "/gfPhoto_03.png",
    correctDirection: "N" as DirectionKey,
  },
  {
    id: "B",
    name: "목격자 B",
    place: "북쪽 보행로",
    location: { lat: 37.55143211168644, lng: 127.07371716568217 },
    photo: "/gfPhoto_02.png",
    correctDirection: "SE" as DirectionKey,
  },
  {
    id: "C",
    name: "목격자 C",
    place: "동쪽 진입로",
    location: { lat: 37.550652047104954, lng: 127.0748310833212 },
    photo: "/gfPhoto_01.png",
    correctDirection: "NW" as DirectionKey,
  },
];
const dropLinkBriefings = [
  "사용자 인증 완료. 임시 현장 조사원으로 등록합니다. 사건 번호 CD-SJ-01, 사건명 시계탑 대형 생물 목격 사건.",
  "세종대학교에는 오래된 소문이 하나 있습니다. 시계탑 꼭대기에는 기린이 산다. 본부는 목격 신고 7건을 근거로 현장 조사가 필요하다고 판단했습니다.",
];
const clueTransmissionBriefings = [
  "표본 A 수신 완료. 위치 기록과 촬영 시점이 현장 조사 로그에 정상 연결됐습니다.",
  "노란색 섬유는 인공 재료가 아닙니다. 기존 동물 자료와 정확히 일치하지 않지만, 대형 초식동물의 체모 특성과 유사합니다.",
  "표본 분석 중 같은 구역에서 비정상적인 에너지 반응 3곳을 확인했습니다. 해당 지점을 지도상에 표시합니다.",
  "각 목적지 반경 10m 안에 진입하면 현장 사진이 자동으로 확보됩니다. 세 사진을 모두 회수한 뒤, 에너지 방향을 연결해 대상을 추론하세요.",
];
const witnessArrangeBriefings = [
  "목격 기록 사진 3건이 모두 확보됐습니다. 각 기록은 서로 다른 시점과 위치에서 수집된 자료입니다.",
  "이제 세 지점에서 감지된 에너지 방향을 순서대로 표시하세요. 확보한 사진을 비교해 반응이 교차하는 지점을 찾아야 합니다.",
  "세 방향선이 하나의 지점에서 겹치면, 목격 대상이 어디에 있었는지 운영본부가 분석할 수 있습니다.",
];

const posterCopy: Record<string, string> = {
  student_hall: "학생회관 포스터를 통해 접속했습니다. 창문 뒤로 긴 그림자를 봤다는 제보가 남아 있습니다.",
  library: "학술정보원 포스터를 통해 접속했습니다. 새벽 시간대 시계탑 꼭대기 목격 신고가 반복됐습니다.",
  gate: "정문 포스터를 통해 접속했습니다. 최근 30일 동안 같은 소문과 관련된 신고가 7건 접수됐습니다.",
};

function triggerDropLinkVibration() {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate([70, 45, 110]);
}

function triggerEvidenceVibration() {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate([45, 35, 70, 45, 130]);
}

function getDistanceMeters(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
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

export default function Home() {
  const [scene, setScene] = useState<Scene>("entry");
  const [messageStep, setMessageStep] = useState<MessageStep>("hidden");
  const [distance, setDistance] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState("위치 확인 전");
  const [locationInReach, setLocationInReach] = useState(false);
  const [lastLocationUpdatedAt, setLastLocationUpdatedAt] = useState<string | null>(null);
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [dropLinkMode, setDropLinkMode] = useState<DropLinkMode>("case");
  const [dropLinkText, setDropLinkText] = useState("");
  const [caseTransferActive, setCaseTransferActive] = useState(false);
  const [dropLinkLine, setDropLinkLine] = useState(0);
  const [evidenceSending, setEvidenceSending] = useState(false);
  const [evidenceProgress, setEvidenceProgress] = useState(0);
  const evidenceTimerRef = useRef<number | null>(null);
  const [cameraStatus, setCameraStatus] = useState("카메라 권한을 요청하는 중...");
  const [scanDistance, setScanDistance] = useState<number | null>(null);
  const [scanFound, setScanFound] = useState(false);
  const [activeWitnessId, setActiveWitnessId] = useState(witnesses[0].id);
  const [witnessDistances, setWitnessDistances] = useState<Record<string, number | null>>(() => Object.fromEntries(witnesses.map((witness) => [witness.id, null])));
  const [visitedWitnesses, setVisitedWitnesses] = useState<Record<string, boolean>>(() => Object.fromEntries(witnesses.map((witness) => [witness.id, false])));
  const [witnessDirections, setWitnessDirections] = useState<Record<string, DirectionKey | null>>(() => Object.fromEntries(witnesses.map((witness) => [witness.id, null])));
  const [witnessStatus, setWitnessStatus] = useState("목격 지점 3곳을 방문해 증거 사진을 확보하세요.");
  const [acquiredWitnessId, setAcquiredWitnessId] = useState<string | null>(null);
  const [arrangeBriefingQueued, setArrangeBriefingQueued] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraWatchRef = useRef<number | null>(null);
  const cameraFoundTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (scene !== "incident") return;
    const first = window.setTimeout(() => {
      setMessageStep("first");
      triggerDropLinkVibration();
    }, 5200);
    return () => window.clearTimeout(first);
  }, [scene]);

  useEffect(() => {
    if (!caseModalOpen) return;

    const activeBriefings = getActiveDropLinkBriefings(dropLinkMode);
    const currentBriefing = activeBriefings[dropLinkLine];
    let index = 0;
    const typer = window.setInterval(() => {
      index += 1;
      setDropLinkText(currentBriefing.slice(0, index));
      if (index >= currentBriefing.length) {
        window.clearInterval(typer);
      }
    }, 34);

    return () => window.clearInterval(typer);
  }, [caseModalOpen, dropLinkLine, dropLinkMode]);

  const posterId = useMemo(() => {
    if (typeof window === "undefined") return "student_hall";
    return new URLSearchParams(window.location.search).get("poster_id") ?? "student_hall";
  }, []);

  const posterText = posterCopy[posterId] ?? posterCopy.student_hall;

  function getActiveDropLinkBriefings(mode: DropLinkMode) {
    if (mode === "case") return dropLinkBriefings;
    if (mode === "clue") return clueTransmissionBriefings;
    return witnessArrangeBriefings;
  }

  function stopCameraScan() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (cameraWatchRef.current !== null) {
      navigator.geolocation.clearWatch(cameraWatchRef.current);
      cameraWatchRef.current = null;
    }
    if (cameraFoundTimerRef.current !== null) {
      window.clearTimeout(cameraFoundTimerRef.current);
      cameraFoundTimerRef.current = null;
    }
  }

  function applyMissionLocation(position: GeolocationPosition, options: { silent?: boolean } = {}) {
    const nextLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
    const nextDistance = getDistanceMeters(nextLocation, missionTarget);
    setUserLocation(nextLocation);
    setDistance(nextDistance);
    setLocationInReach(nextDistance <= reachRadiusMeters);
    setLastLocationUpdatedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

    if (options.silent) return;
    if (nextDistance <= reachRadiusMeters) {
      setLocationStatus("잔디밭 조사 범위에 진입했습니다. 카메라 조사를 시작할 수 있습니다.");
      return;
    }
    setLocationStatus("아직 조사 범위 밖입니다. 지정된 잔디밭 쪽으로 이동하세요.");
  }

  function requestMissionLocation(options: { silent?: boolean } = {}) {
    if (!navigator.geolocation) {
      if (!options.silent) setLocationStatus("이 브라우저에서는 위치 확인을 사용할 수 없습니다.");
      return;
    }

    if (!options.silent) setLocationStatus("현재 위치 확인 중...");
    navigator.geolocation.getCurrentPosition(
      (position) => applyMissionLocation(position, options),
      () => {
        if (!options.silent) setLocationStatus("위치 권한을 허용하면 잔디밭 도착 여부를 확인할 수 있습니다.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function acquireWitnessEvidence(witnessId: string, options: { admin?: boolean; silent?: boolean } = {}) {
    const witness = witnesses.find((item) => item.id === witnessId);
    if (!witness) return;
    setActiveWitnessId(witness.id);
    if (visitedWitnesses[witness.id]) {
      if (!options.silent) setWitnessStatus(`${witness.name} 사진은 이미 확보했습니다. 사진을 확인하고 에너지 방향을 표시하세요.`);
      return;
    }

    const nextVisited = { ...visitedWitnesses, [witness.id]: true };
    setVisitedWitnesses(nextVisited);
    setAcquiredWitnessId(witness.id);
    triggerEvidenceVibration();
    setWitnessStatus(`${witness.name} 증거 사진을 확보했습니다. 획득 자료를 확인하세요.`);
    if (witnesses.every((item) => nextVisited[item.id])) {
      setArrangeBriefingQueued(true);
    }
  }

  function closeWitnessAcquisition() {
    setAcquiredWitnessId(null);
    if (!arrangeBriefingQueued) return;
    setArrangeBriefingQueued(false);
    window.setTimeout(() => {
      setDropLinkMode("arrange");
      setDropLinkLine(0);
      setDropLinkText("");
      setCaseModalOpen(true);
      triggerDropLinkVibration();
    }, 260);
  }

  function applyWitnessLocation(position: GeolocationPosition, options: { silent?: boolean } = {}) {
    const nextLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
    setUserLocation(nextLocation);
    setLastLocationUpdatedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    const nextDistances = Object.fromEntries(
      witnesses.map((witness) => [witness.id, getDistanceMeters(nextLocation, witness.location)]),
    ) as Record<string, number>;
    setWitnessDistances(nextDistances);

    const arrivedWitness = witnesses.find((witness) => nextDistances[witness.id] <= witnessReachRadiusMeters);
    if (arrivedWitness) {
      acquireWitnessEvidence(arrivedWitness.id, options);
      return;
    }
    if (!options.silent) setWitnessStatus("가장 가까운 목격 지점으로 이동하세요. 반경 10m 안에서 증거 사진이 열립니다.");
  }

  function requestWitnessLocation(options: { silent?: boolean } = {}) {
    if (!navigator.geolocation) {
      if (!options.silent) setWitnessStatus("이 브라우저에서는 위치 확인을 사용할 수 없습니다.");
      return;
    }
    if (!options.silent) setWitnessStatus("현재 위치 확인 중...");
    navigator.geolocation.getCurrentPosition(
      (position) => applyWitnessLocation(position, options),
      () => {
        if (!options.silent) setWitnessStatus("위치 권한을 허용하면 목격 지점 도착 여부를 확인할 수 있습니다.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  useEffect(() => {
    if (scene !== "mission") return;
    const initial = window.setTimeout(() => requestMissionLocation({ silent: true }), 0);
    const interval = window.setInterval(() => requestMissionLocation({ silent: true }), 10000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
    // Location polling is intentionally tied to entering/leaving the mission scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useEffect(() => {
    if (scene !== "witness") return;
    const initial = window.setTimeout(() => requestWitnessLocation({ silent: true }), 0);
    const interval = window.setInterval(() => requestWitnessLocation({ silent: true }), 10000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
    // Witness location polling is intentionally tied to entering/leaving chapter 2.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  function completeCameraScan() {
    if (cameraFoundTimerRef.current !== null) return;
    setScanFound(true);
    triggerEvidenceVibration();
    setCameraStatus("신호 고정 완료. 노란털 표본을 증거로 확보합니다.");
    cameraFoundTimerRef.current = window.setTimeout(() => {
      stopCameraScan();
      moveToScene("arrival");
    }, 2600);
  }

  function updateCameraDistance(position: GeolocationPosition) {
    const nextDistance = getDistanceMeters(
      { lat: position.coords.latitude, lng: position.coords.longitude },
      missionTarget,
    );
    setDistance(nextDistance);
    setScanDistance(nextDistance);

    if (nextDistance <= clueRevealRadiusMeters) {
      completeCameraScan();
      return;
    }

    setCameraStatus(`현재 조사 지점까지 ${nextDistance}m. 10m 안으로 접근하면 노란털 신호가 보입니다.`);
  }

  async function startCameraScan(options: { adminOverride?: boolean } = {}) {
    if (!options.adminOverride && !locationInReach) {
      setLocationStatus("조사 지점 반경 20m 안에 들어오면 카메라 조사를 시작할 수 있습니다.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setLocationStatus("이 브라우저에서는 카메라 조사를 사용할 수 없습니다.");
      return;
    }
    if (!navigator.geolocation && !options.adminOverride) {
      setLocationStatus("위치 확인을 사용할 수 없어 조사 범위 판정을 할 수 없습니다.");
      return;
    }

    setScanFound(false);
    setScanDistance(null);
    setCameraStatus("카메라 권한을 요청하는 중...");
    moveToScene("camera");
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraStatus(
        options.adminOverride
          ? "관리자 권한으로 AR 카메라를 실행했습니다. 단서 발견 버튼으로 결과를 확인할 수 있습니다."
          : "잔디밭 아래쪽을 천천히 비춰 주세요. 10m 안으로 접근하면 신호가 반응합니다.",
      );
      if (navigator.geolocation) {
        cameraWatchRef.current = navigator.geolocation.watchPosition(
          updateCameraDistance,
          () => setCameraStatus("위치 권한을 허용하면 노란털 신호를 감지할 수 있습니다."),
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
        );
      }
    } catch {
      stopCameraScan();
      setLocationStatus("카메라 권한을 허용하면 잔디밭 조사 화면을 열 수 있습니다.");
      moveToScene("mission");
    }
  }

  useEffect(() => () => {
    stopCameraScan();
    if (evidenceTimerRef.current !== null) window.clearInterval(evidenceTimerRef.current);
  }, []);

  function moveToScene(nextScene: Scene) {
    if (scene === "camera" && nextScene !== "camera") {
      stopCameraScan();
    }
    if (nextScene === "incident") {
      setMessageStep("hidden");
    }
    setScene(nextScene);
  }

  function checkLocation() {
    requestMissionLocation();
  }

  function markActiveWitnessArrived() {
    acquireWitnessEvidence(activeWitnessId, { admin: true });
  }

  const witnessSolved = witnesses.every((witness) => witnessDirections[witness.id] === witness.correctDirection);

  function handleDropLink() {
    if (messageStep === "first") {
      setDropLinkMode("case");
      setDropLinkLine(0);
      setDropLinkText("");
      setCaseModalOpen(true);
      return;
    }
    moveToScene("mission");
  }

  function advanceDropLinkDialogue() {
    const activeBriefings = getActiveDropLinkBriefings(dropLinkMode);
    if (dropLinkLine < activeBriefings.length - 1) {
      setDropLinkText("");
      setDropLinkLine((current) => current + 1);
      return;
    }

    setCaseTransferActive(true);
    window.setTimeout(() => {
      setCaseModalOpen(false);
      setCaseTransferActive(false);
      setMessageStep("hidden");
      setDropLinkLine(0);
      setDropLinkText("");
      moveToScene(dropLinkMode === "case" ? "mission" : "witness");
    }, 1500);
  }

  function startEvidenceTransmission() {
    if (evidenceSending) return;
    triggerDropLinkVibration();
    setEvidenceSending(true);
    setEvidenceProgress(0);
    if (evidenceTimerRef.current !== null) window.clearInterval(evidenceTimerRef.current);
    evidenceTimerRef.current = window.setInterval(() => {
      setEvidenceProgress((current) => {
        const next = Math.min(100, current + 1);
        if (next >= 100) {
          if (evidenceTimerRef.current !== null) window.clearInterval(evidenceTimerRef.current);
          evidenceTimerRef.current = null;
          window.setTimeout(() => {
            setEvidenceSending(false);
            setDropLinkMode("clue");
            setDropLinkLine(0);
            setDropLinkText("");
            setCaseModalOpen(true);
            triggerDropLinkVibration();
          }, 2000);
        }
        return next;
      });
    }, 50);
  }

  return (
    <main className={`case-app scene-${scene}`}>
      <div className="clock-noise" aria-hidden="true" />

      {scene === "entry" && (
        <section className="screen case-entry">
          <div className="case-title">
            <p>CD-SJ-01</p>
            <h1>시계탑 꼭대기에서 무언가 목격됐다</h1>
          </div>
          <div className="case-status">
            <span>최근 목격 신고</span>
            <strong>7건</strong>
            <p>아직 확인된 사진은 없습니다.</p>
          </div>
          <p className="poster-source">{posterText}</p>
          <div className="entry-guide" aria-label="조사 안내">
            <article>
              <span>소개</span>
              <p>Campus Drop은 교내 QR 포스터에서 시작되는 현장 조사형 웹 게임입니다.</p>
            </article>
            <article>
              <span>진행 방식</span>
              <p>지정된 잔디밭에서 카메라 조사를 시작하고, 반경 20m 안에서 첫 번째 흔적을 감지합니다.</p>
            </article>
            <article>
              <span>안내</span>
              <p>이야기의 단서가 중요합니다. 큰 소리나 스포일러 없이 천천히 진행해 주세요.</p>
            </article>
          </div>
          <button className="primary-action" type="button" onClick={() => moveToScene("incident")}>
            조사 참여하기
          </button>
          <p className="warning-copy">※ 이동 중에는 주변을 확인하고 안전한 위치에서 화면을 조작하세요.</p>
        </section>
      )}
      {scene === "incident" && (
        <section className="screen incident-screen">
          <div className="incident-header">
            <p>카카오 로그인 완료</p>
            <h2>임시 현장 조사원 등록</h2>
          </div>

          <div className="clock-grid" aria-label="목격 신고 요약">
            <div className="clock-card">
              <span>신고 01</span>
              <strong>긴 목 그림자</strong>
            </div>
            <div className="clock-card">
              <span>신고 02</span>
              <strong>높은 잎사귀</strong>
            </div>
            <div className="clock-card is-corrupted">
              <span>신고 03</span>
              <strong>노란 무늬</strong>
            </div>
            <div className="clock-card is-unknown">
              <span>신고 04</span>
              <strong>발굽 소리</strong>
            </div>
          </div>

          <div className="time-report">
            <span>CAMPUS DROP 운영본부</span>
            <strong>시계탑 대형 생물 목격 사건</strong>
            <p>세종대학교에는 오래된 소문이 하나 있습니다. “시계탑 꼭대기에는 기린이 산다.” 본부는 최근 목격 신고 7건을 바탕으로 별도 현장 조사를 시작합니다.</p>
          </div>

          <div className="system-message">
            <span>첫 번째 목표</span>
            <p>시계탑으로 이동해 목격 신고가 사실인지 확인하세요.</p>
          </div>

          {messageStep !== "hidden" && (
            <button
              className="unknown-message"
              type="button"
              onClick={handleDropLink}
            >
              <div className="talk-notice-head"><span>DROP LINK</span><em>지금</em></div>
              <div className="talk-notice-body"><span className="talk-drop-core" aria-hidden="true">DROP</span><div><b>CAMPUS DROP 운영본부</b><strong>사용자 인증 완료. CD-SJ-01 현장 조사에 임시 배정됐습니다.</strong><small>탭해서 사건 개요 보기</small></div></div>
            </button>
          )}

          {caseModalOpen && (
            <div className={`drop-link-modal${caseTransferActive ? " is-transfer" : ""}`} role="dialog" aria-modal="true" aria-label="CAMPUS DROP 운영본부 메시지">
              <div className="drop-link-reveal" aria-hidden="true">
                <span className="drop-link-reveal-ring" />
                <span className="drop-link-reveal-core">DROP LINK</span>
                <span className="drop-link-reveal-spark spark-a" />
                <span className="drop-link-reveal-spark spark-b" />
                <span className="drop-link-reveal-spark spark-c" />
              </div>
              <div className="drop-link-transfer" aria-hidden="true">
                <span>CD-SJ-01</span>
                <strong>현장 조사 개방</strong>
                <i />
              </div>
              <div className="drop-link-dialogue">
                <div className="drop-link-speech">
                  <p className="drop-link-type">{dropLinkText}<i aria-hidden="true" /></p>
                  <button
                    className="drop-link-next"
                    type="button"
                    onClick={advanceDropLinkDialogue}
                    disabled={dropLinkText.length < getActiveDropLinkBriefings(dropLinkMode)[dropLinkLine].length || caseTransferActive}
                  >
                    {dropLinkLine < getActiveDropLinkBriefings(dropLinkMode).length - 1 ? "다음" : dropLinkMode === "case" ? "사건 개요 수신" : dropLinkMode === "arrange" ? "배열 미션 시작" : "2장으로 이동"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {scene === "mission" && (
        <section className="screen mission-screen">
          <div className="mission-copy">
            <p>사건 개요</p>
            <h2>CD-SJ-01 현장 조사 개방</h2>
            <span>농동로 209 인근 잔디밭으로 이동해 기린의 노란털 흔적을 확인하세요. GPS는 반경 20m 진입 여부만 확인합니다.</span>
          </div>

          <div className="campus-radar">
            <MissionMap />
            <div className="radar-data">
              <div>
                <span>예상 거리</span>
                <strong>{distance === null ? "위치 확인 필요" : `${distance}m`}</strong>
              </div>
              <div>
                <span>조사 가능 범위</span>
                <strong>{reachRadiusMeters}m</strong>
              </div>
              <div>
                <span>내 위치 갱신</span>
                <strong>{lastLocationUpdatedAt ?? "대기 중"}</strong>
              </div>
            </div>
          </div>

          <p className="location-status">{locationStatus}</p>
          <div className="mission-actions">
            <button
              className={`primary-action scan-start-action${locationInReach ? " is-ready" : " is-locked"}`}
              type="button"
              onClick={() => startCameraScan()}
              disabled={!locationInReach}
            >
              {locationInReach ? "카메라로 노란털 조사 시작" : "20m 안에서 조사 시작 가능"}
            </button>
            <button className="secondary-action" type="button" onClick={() => startCameraScan({ adminOverride: true })}>
              관리자 권한으로 AR 실행
            </button>
            <button className="text-scan-refresh" type="button" onClick={checkLocation}>
              현재 위치 즉시 갱신
            </button>
          </div>
        </section>
      )}

      {scene === "camera" && (
        <section className={`screen camera-screen${scanFound ? " is-found" : ""}`}>
          <video ref={videoRef} className="camera-feed" playsInline muted />
          <div className="camera-vignette" aria-hidden="true" />
          <div className="camera-discovery-flash" aria-hidden="true" />
          <div className="camera-hud">
            <p>AR 현장 조사</p>
            <h2>잔디밭을 천천히 훑어보세요</h2>
            <span>{cameraStatus}</span>
          </div>
          <div className="camera-scan-line" aria-hidden="true" />
          <div className="camera-clue-pin" aria-hidden="true">
            <i />
            <b />
          </div>
          <div className="camera-evidence-lock" aria-hidden="true">
            <i />
            <i />
            <b />
          </div>
          <div className="camera-evidence-stamp" aria-hidden="true">EVIDENCE FOUND</div>
          <div className="camera-bottom-signal" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="camera-readout">
            <span>조사 반경</span>
            <strong>{scanDistance === null ? "측정 중" : `${scanDistance}m / ${clueRevealRadiusMeters}m`}</strong>
          </div>
          <div className="camera-control-stack">
            <button className="camera-exit" type="button" onClick={() => moveToScene("mission")}>조사 종료</button>
            <button className="camera-admin-found" type="button" onClick={completeCameraScan}>관리자 권한으로 단서 발견</button>
          </div>
          <div className="camera-fur-glimpse" aria-hidden="true" />
          <div className="camera-spark-field" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </section>
      )}

      {scene === "arrival" && (
        <section className="screen arrival-screen">
          <div className="arrival-copy">
            <p>첫 번째 흔적 발견</p>
            <h2>노란색 털을 발견했다!</h2>
            <span>카메라 조사 중 잔디밭 하단 신호가 반응했습니다. 확보한 표본을 운영본부로 전송합니다.</span>
          </div>

          <div className="fur-evidence-card is-transmitting">
            <div className="fur-image-wrap">
              <div className="fur-image" role="img" aria-label="기린의 노란털 표본" />
            </div>
            <div className="fur-evidence-copy">
              <span>현장 표본 A</span>
              <strong>기린의 노란털</strong>
              <p>잔디밭 가장자리에서 확보한 노란 털 표본입니다. 운영본부 분석 서버로 원본 데이터를 전송합니다.</p>
            </div>
          </div>

          <button className="primary-action chapter-next-action" type="button" onClick={startEvidenceTransmission} disabled={evidenceSending}>
            {evidenceSending ? "표본 전송 중..." : "표본 전송하기"}
          </button>
        </section>
      )}

      {scene === "arrival" && evidenceSending && (
        <div className="transmission-modal" role="dialog" aria-modal="true" aria-label="표본 전송 중">
          <div className="transmission-card">
            <span>Sample Upload</span>
            <strong>{evidenceProgress >= 100 ? "본부 수신 완료" : "표본을 운영본부로 전송 중"}</strong>
            <p>{evidenceProgress >= 100 ? "분석 채널을 연결합니다." : "노란 털 표본 이미지와 위치 기록을 묶어 보안 전송합니다."}</p>
            <div className="transmission-panel is-active" aria-live="polite">
              <div><span>01</span><strong>표본 이미지 압축</strong><em>{evidenceProgress >= 28 ? "완료" : "대기"}</em></div>
              <div><span>02</span><strong>위치 기록 첨부</strong><em>{evidenceProgress >= 62 ? "완료" : "대기"}</em></div>
              <div><span>03</span><strong>CAMPUS DROP 운영본부 전송</strong><em>{evidenceProgress >= 100 ? "수신 확인" : "전송 중"}</em></div>
              <div className="transmission-progress" aria-label={`표본 전송 진행률 ${evidenceProgress}%`}>
                <i style={{ width: `${evidenceProgress}%` }} />
                <strong>{evidenceProgress}%</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {scene === "witness" && (
        <section className="screen witness-screen">
          <div className="mission-copy">
            <p>2장</p>
            <h2>목격 지점을 연결하라</h2>
            <span>지도에 표시된 세 에너지 지점의 반경 10m 안에 들어가 현장 사진을 확보하세요.</span>
          </div>

          <div className="campus-radar witness-radar">
            <WitnessMap
              userLocation={userLocation}
              activeWitnessId={activeWitnessId}
              visitedWitnesses={visitedWitnesses}
              witnessDirections={witnessDirections}
              onSelectWitness={setActiveWitnessId}
            />
            <div className="radar-data witness-data">
              <div><span>조사 범위</span><strong>{witnessReachRadiusMeters}m</strong></div>
              <div><span>확보한 사진</span><strong>{witnesses.filter((witness) => visitedWitnesses[witness.id]).length}/3</strong></div>
              <div><span>에너지 방향</span><strong>{witnesses.filter((witness) => witnessDirections[witness.id]).length}/3</strong></div>
            </div>
          </div>

          <p className="location-status">{witnessStatus}</p>
          <div className="mission-actions witness-actions">
            <button className="secondary-action" type="button" onClick={() => requestWitnessLocation()}>현재 위치 즉시 갱신</button>
            <button className="text-scan-refresh" type="button" onClick={markActiveWitnessArrived}>관리자 권한으로 도착 완료</button>
          </div>

          <div className="witness-list" aria-label="에너지 지점 사진 목록">
            {witnesses.map((witness) => {
              const isActive = activeWitnessId === witness.id;
              const isVisited = visitedWitnesses[witness.id];
              const selectedDirection = witnessDirections[witness.id];
              return (
                <article key={witness.id} className={`witness-card${isActive ? " is-active" : ""}${isVisited ? " is-visited" : ""}`}>
                  <button type="button" className="witness-card-head" onClick={() => setActiveWitnessId(witness.id)}>
                    <span>{witness.name}</span>
                    <strong>{witness.place}</strong>
                    <em>{witnessDistances[witness.id] === null ? "거리 측정 전" : `${witnessDistances[witness.id]}m`}</em>
                  </button>
                  <div className={`witness-photo${isVisited ? " is-open" : " is-locked"}`}>
                    {isVisited ? (
                      <div
                        className="witness-photo-image"
                        role="img"
                        aria-label={`${witness.name} 목격 기록 사진`}
                        style={{ backgroundImage: `url(${witness.photo})` }}
                      />
                    ) : (
                      <span>현장 사진 잠김</span>
                    )}
                  </div>
                  <div className="direction-picker" aria-label={`${witness.name} 방향 선택`}>
                    {directionOptions.map((direction) => (
                      <button
                        key={direction.key}
                        type="button"
                        className={selectedDirection === direction.key ? "is-selected" : ""}
                        disabled={!isVisited}
                        onClick={() => setWitnessDirections((current) => ({ ...current, [witness.id]: direction.key }))}
                      >
                        {direction.label}
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <div className={`conclusion witness-conclusion${witnessSolved ? " is-open" : ""}`} aria-live="polite">
            <span>{witnessSolved ? "분석 완료" : "운영본부 분석 대기"}</span>
            <strong>{witnessSolved ? "세 에너지 방향선이 대양타워 상부에서 교차합니다." : "세 지점의 사진을 확보하고 에너지 방향을 표시하세요."}</strong>
            <p>{witnessSolved ? "세 지점의 반응은 서로 다른 현상이 아니었습니다. 모두 시계탑 상부에서 잔디밭을 내려다보던, 목이 긴 존재를 가리킵니다. 사건 분류를 ‘미확인 생명체 조사’로 전환합니다." : "확보한 사진을 바탕으로 에너지 방향을 선택하면 지도 위에 추정선이 표시됩니다."}</p>
          </div>
        </section>
      )}

      {acquiredWitnessId && (() => {
        const witness = witnesses.find((item) => item.id === acquiredWitnessId);
        if (!witness) return null;
        return (
          <div className="witness-acquisition-modal" role="dialog" aria-modal="true" aria-label="증거 사진 획득">
            <div className="witness-acquisition-card">
              <span>Evidence Acquired</span>
              <strong>{witness.name} 증거 사진 획득</strong>
              <div className="witness-acquisition-photo" style={{ backgroundImage: `url(${witness.photo})` }} role="img" aria-label={`${witness.name} 증거 사진`} />
              <p>목표 지점 반경 10m 안에서 현장 사진을 확보했습니다. 사진은 2장 분석 카드에 저장됩니다.</p>
              <button className="primary-action" type="button" onClick={closeWitnessAcquisition}>자료 확인 완료</button>
            </div>
          </div>
        );
      })()}
    </main>
  );
}


function WitnessMap({
  userLocation,
  activeWitnessId,
  visitedWitnesses,
  witnessDirections,
  onSelectWitness,
}: {
  userLocation: { lat: number; lng: number } | null;
  activeWitnessId: string;
  visitedWitnesses: Record<string, boolean>;
  witnessDirections: Record<string, DirectionKey | null>;
  onSelectWitness: (id: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("kakaoKey");
    if (!key || !mapRef.current) {
      setMapState("fallback");
      return;
    }

    let cancelled = false;
    const renderMap = () => {
      if (cancelled || !mapRef.current || !window.kakao?.maps) return;
      const center = new window.kakao.maps.LatLng(towerTarget.lat, towerTarget.lng);
      new window.kakao.maps.Map(mapRef.current, { center, level: 3 });
      setMapState("ready");
    };

    if (window.kakao?.maps) {
      window.kakao.maps.load(renderMap);
      return () => {
        cancelled = true;
      };
    }

    const existingScript = document.querySelector<HTMLScriptElement>("#kakao-map-sdk");
    if (existingScript) {
      existingScript.addEventListener("load", () => window.kakao?.maps.load(renderMap), { once: true });
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    script.async = true;
    script.onload = () => window.kakao?.maps.load(renderMap);
    script.onerror = () => setMapState("fallback");
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []);

  const points = [...witnesses.map((witness) => witness.location), towerTarget];
  const lngValues = points.map((point) => point.lng);
  const latValues = points.map((point) => point.lat);
  const bounds = {
    lngMin: Math.min(...lngValues) - 0.00045,
    lngMax: Math.max(...lngValues) + 0.00045,
    latMin: Math.min(...latValues) - 0.00035,
    latMax: Math.max(...latValues) + 0.00035,
  };
  const fallbackSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bounds.lngMin}%2C${bounds.latMin}%2C${bounds.lngMax}%2C${bounds.latMax}&layer=mapnik&marker=${towerTarget.lat}%2C${towerTarget.lng}`;

  return (
    <div className="real-map-shell witness-map-shell">
      {mapState === "fallback" ? (
        <iframe className="real-map-frame" title="목격 지점 실제 지도" src={fallbackSrc} loading="lazy" />
      ) : (
        <div ref={mapRef} className="real-map-canvas" aria-label="목격 지점 실제 지도" />
      )}
      <svg className="witness-line-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {witnesses.map((witness) => {
          const direction = witnessDirections[witness.id];
          if (!direction) return null;
          const start = getMapPoint(witness.location, bounds);
          const vector = directionVectors[direction];
          return (
            <line
              key={witness.id}
              x1={start.x}
              y1={start.y}
              x2={start.x + vector.x * 42}
              y2={start.y + vector.y * 42}
              className={direction === witness.correctDirection ? "is-correct" : ""}
            />
          );
        })}
      </svg>
      <div className="tower-target-marker" style={getMapPointStyle(towerTarget, bounds)} aria-hidden="true"><span /></div>
      {witnesses.map((witness) => (
        <button
          key={witness.id}
          type="button"
          className={`witness-map-marker${activeWitnessId === witness.id ? " is-active" : ""}${visitedWitnesses[witness.id] ? " is-visited" : ""}`}
          style={getMapPointStyle(witness.location, bounds)}
          aria-label={`${witness.name} 위치`}
          onClick={() => onSelectWitness(witness.id)}
        >
          {witness.id}
        </button>
      ))}
      {userLocation && <div className="map-user-marker" aria-hidden="true" style={getMapPointStyle(userLocation, bounds)} />}
      <div className="map-target-panel witness-map-panel"><span>추정 교차 지점</span><strong>대양타워 상부</strong></div>
      {mapState === "loading" && <p className="map-loading">지도 불러오는 중...</p>}
      {mapState === "fallback" && <p className="map-loading">Kakao 키 없이 실제 지도 미리보기 표시 중</p>}
    </div>
  );
}

function getMapPoint(location: { lat: number; lng: number }, bounds: { lngMin: number; lngMax: number; latMin: number; latMax: number }) {
  const x = Math.min(94, Math.max(6, ((location.lng - bounds.lngMin) / (bounds.lngMax - bounds.lngMin)) * 100));
  const y = Math.min(94, Math.max(6, (1 - (location.lat - bounds.latMin) / (bounds.latMax - bounds.latMin)) * 100));
  return { x, y };
}

function getMapPointStyle(location: { lat: number; lng: number }, bounds: { lngMin: number; lngMax: number; latMin: number; latMax: number }) {
  const point = getMapPoint(location, bounds);
  return { left: `${point.x}%`, top: `${point.y}%` };
}

function MissionMap() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("kakaoKey");
    if (!key || !mapRef.current) {
      setMapState("fallback");
      return;
    }

    let cancelled = false;
    const renderMap = () => {
      if (cancelled || !mapRef.current || !window.kakao?.maps) return;
      const center = new window.kakao.maps.LatLng(missionTarget.lat, missionTarget.lng);
      const map = new window.kakao.maps.Map(mapRef.current, { center, level: 3 });
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
      setMapState("ready");
    };

    if (window.kakao?.maps) {
      window.kakao.maps.load(renderMap);
      return () => {
        cancelled = true;
      };
    }

    const existingScript = document.querySelector<HTMLScriptElement>("#kakao-map-sdk");
    if (existingScript) {
      existingScript.addEventListener("load", () => window.kakao?.maps.load(renderMap), { once: true });
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    script.async = true;
    script.onload = () => window.kakao?.maps.load(renderMap);
    script.onerror = () => setMapState("fallback");
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []);


  const fallbackSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${missionMapBounds.lngMin}%2C${missionMapBounds.latMin}%2C${missionMapBounds.lngMax}%2C${missionMapBounds.latMax}&layer=mapnik`;

  return (
    <div className="real-map-shell">
      {mapState === "fallback" ? (
        <iframe className="real-map-frame" title="농동로 209 잔디밭 지도" src={fallbackSrc} loading="lazy" />
      ) : (
        <div ref={mapRef} className="real-map-canvas" aria-label="농동로 209 잔디밭 실제 지도" />
      )}
      {mapState === "fallback" && (
        <>
          <div className="map-range-circle" style={getMapPointStyle(missionTarget, missionMapBounds)} aria-hidden="true" />
          <div className="map-investigation-marker" style={getMapPointStyle(missionTarget, missionMapBounds)} aria-hidden="true" />
        </>
      )}
      <div className="map-target-panel">
        <span>조사 지점</span>
        <strong>농동로 209 잔디밭</strong>
      </div>
      {mapState === "loading" && <p className="map-loading">지도 불러오는 중...</p>}
      {mapState === "fallback" && <p className="map-loading">Kakao 키 없이 실제 지도 미리보기 표시 중</p>}
    </div>
  );
}


