"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Scene = "entry" | "incident" | "mission" | "camera" | "arrival";
type MessageStep = "hidden" | "first";

type KakaoLatLng = object;
type KakaoMap = object;

type KakaoMarkerImage = object;

type KakaoMapsApi = {
  load: (callback: () => void) => void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
  Size: new (width: number, height: number) => object;
  Point: new (x: number, y: number) => object;
  MarkerImage: new (src: string, size: object, options?: { offset?: object }) => KakaoMarkerImage;
  Marker: new (options: { position: KakaoLatLng; title?: string; image?: KakaoMarkerImage }) => { setMap: (map: KakaoMap) => void };
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
const reachRadiusMeters = 20;
const investigationMarkerSrc = "/investigation-marker-v2.png";
const dropLinkBriefings = [
  "사용자 인증 완료. 임시 현장 조사원으로 등록합니다. 사건 번호 CD-SJ-01, 사건명 시계탑 대형 생물 목격 사건.",
  "세종대학교에는 오래된 소문이 하나 있습니다. 시계탑 꼭대기에는 기린이 산다. 본부는 목격 신고 7건을 근거로 현장 조사가 필요하다고 판단했습니다.",
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
  const [locationStatus, setLocationStatus] = useState("위치 확인 전");
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [dropLinkText, setDropLinkText] = useState("");
  const [caseTransferActive, setCaseTransferActive] = useState(false);
  const [dropLinkLine, setDropLinkLine] = useState(0);
  const [cameraStatus, setCameraStatus] = useState("카메라 권한을 요청하는 중...");
  const [scanDistance, setScanDistance] = useState<number | null>(null);
  const [scanFound, setScanFound] = useState(false);
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

    const currentBriefing = dropLinkBriefings[dropLinkLine];
    let index = 0;
    const typer = window.setInterval(() => {
      index += 1;
      setDropLinkText(currentBriefing.slice(0, index));
      if (index >= currentBriefing.length) {
        window.clearInterval(typer);
      }
    }, 34);

    return () => window.clearInterval(typer);
  }, [caseModalOpen, dropLinkLine]);

  const posterId = useMemo(() => {
    if (typeof window === "undefined") return "student_hall";
    return new URLSearchParams(window.location.search).get("poster_id") ?? "student_hall";
  }, []);

  const posterText = posterCopy[posterId] ?? posterCopy.student_hall;

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

  function completeCameraScan() {
    if (cameraFoundTimerRef.current !== null) return;
    setScanFound(true);
    setCameraStatus("잔디밭 아래쪽에서 노란 신호가 감지됐습니다.");
    cameraFoundTimerRef.current = window.setTimeout(() => {
      stopCameraScan();
      moveToScene("arrival");
    }, 1500);
  }

  function updateCameraDistance(position: GeolocationPosition) {
    const nextDistance = getDistanceMeters(
      { lat: position.coords.latitude, lng: position.coords.longitude },
      missionTarget,
    );
    setDistance(nextDistance);
    setScanDistance(nextDistance);

    if (nextDistance <= reachRadiusMeters) {
      completeCameraScan();
      return;
    }

    setCameraStatus(`현재 조사 지점까지 ${nextDistance}m. 잔디밭을 천천히 훑어보세요.`);
  }

  async function startCameraScan() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setLocationStatus("이 브라우저에서는 카메라 조사를 사용할 수 없습니다.");
      return;
    }
    if (!navigator.geolocation) {
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
      setCameraStatus("잔디밭 아래쪽을 천천히 비춰 주세요. 반경 20m 안에서 신호가 반응합니다.");
      cameraWatchRef.current = navigator.geolocation.watchPosition(
        updateCameraDistance,
        () => setCameraStatus("위치 권한을 허용하면 노란털 신호를 감지할 수 있습니다."),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
      );
    } catch {
      stopCameraScan();
      setLocationStatus("카메라 권한을 허용하면 잔디밭 조사 화면을 열 수 있습니다.");
      moveToScene("mission");
    }
  }

  useEffect(() => () => stopCameraScan(), []);

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
    if (!navigator.geolocation) {
      setLocationStatus("이 브라우저에서는 위치 확인을 사용할 수 없습니다.");
      return;
    }

    setLocationStatus("현재 위치 확인 중...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextDistance = getDistanceMeters(
          { lat: position.coords.latitude, lng: position.coords.longitude },
          missionTarget,
        );
        setDistance(nextDistance);
        if (nextDistance <= reachRadiusMeters) {
          setLocationStatus("잔디밭 조사 범위에 진입했습니다. 카메라 조사를 시작하면 신호가 반응합니다.");
          return;
        }
        setLocationStatus("아직 조사 범위 밖입니다. 지정된 잔디밭 쪽으로 이동하세요.");
      },
      () => {
        setLocationStatus("위치 권한을 허용하면 잔디밭 도착 여부를 확인할 수 있습니다.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleDropLink() {
    if (messageStep === "first") {
      setDropLinkLine(0);
      setDropLinkText("");
      setCaseModalOpen(true);
      return;
    }
    moveToScene("mission");
  }

  function advanceDropLinkDialogue() {
    if (dropLinkLine < dropLinkBriefings.length - 1) {
      setDropLinkText("");
      setDropLinkLine((current) => current + 1);
      return;
    }

    setCaseTransferActive(true);
    window.setTimeout(() => {
      setCaseModalOpen(false);
      setCaseTransferActive(false);
      setMessageStep("hidden");
      moveToScene("mission");
    }, 1500);
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
                    disabled={dropLinkText.length < dropLinkBriefings[dropLinkLine].length || caseTransferActive}
                  >
                    {dropLinkLine < dropLinkBriefings.length - 1 ? "다음" : "사건 개요 수신"}
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
            </div>
          </div>

          <p className="location-status">{locationStatus}</p>
          <div className="mission-actions">
            <button className="primary-action" type="button" onClick={startCameraScan}>
              카메라로 노란털 조사 시작
            </button>
            <button className="secondary-action" type="button" onClick={checkLocation}>
              현재 거리만 확인
            </button>
          </div>
        </section>
      )}

      {scene === "camera" && (
        <section className={`screen camera-screen${scanFound ? " is-found" : ""}`}>
          <video ref={videoRef} className="camera-feed" playsInline muted />
          <div className="camera-vignette" aria-hidden="true" />
          <div className="camera-hud">
            <p>AR 현장 조사</p>
            <h2>잔디밭을 천천히 훑어보세요</h2>
            <span>{cameraStatus}</span>
          </div>
          <div className="camera-scan-line" aria-hidden="true" />
          <div className="camera-bottom-signal" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="camera-readout">
            <span>조사 반경</span>
            <strong>{scanDistance === null ? "측정 중" : `${scanDistance}m / ${reachRadiusMeters}m`}</strong>
          </div>
          <button className="camera-exit" type="button" onClick={() => moveToScene("mission")}>조사 종료</button>
        </section>
      )}

      {scene === "arrival" && (
        <section className="screen arrival-screen">
          <div className="arrival-copy">
            <p>첫 번째 흔적 발견</p>
            <h2>노란색 털을 발견했다!</h2>
            <span>카메라 조사 중 잔디밭 하단 신호가 반응했습니다. 확보한 표본을 운영본부로 전송합니다.</span>
          </div>

          <div className="fur-evidence-card">
            <div className="fur-image-wrap">
              <div className="fur-image" role="img" aria-label="기린의 노란털 표본" />
            </div>
            <div>
              <span>현장 표본 A</span>
              <strong>기린의 노란털</strong>
              <p>잔디밭 가장자리에서 노란 털 표본을 확보했습니다. 인공 섬유가 아니며 기린과 동물의 체모와 유사합니다.</p>
            </div>
          </div>

          <div className="conclusion is-open" aria-live="polite">
            <span>조사 결론</span>
            <strong>노란털 표본 확보. 첫 번째 현장 단서가 기록됐습니다.</strong>
            <p>다음 파트: 추가 단서를 분석해 세린이와 첫 접촉하기</p>
          </div>
        </section>
      )}
    </main>
  );
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

  const fallbackSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${missionTarget.lng - 0.003}%2C${missionTarget.lat - 0.002}%2C${missionTarget.lng + 0.003}%2C${missionTarget.lat + 0.002}&layer=mapnik&marker=${missionTarget.lat}%2C${missionTarget.lng}`;

  return (
    <div className="real-map-shell">
      {mapState === "fallback" ? (
        <iframe className="real-map-frame" title="농동로 209 잔디밭 지도" src={fallbackSrc} loading="lazy" />
      ) : (
        <div ref={mapRef} className="real-map-canvas" aria-label="농동로 209 잔디밭 실제 지도" />
      )}
      <div className="map-investigation-marker" aria-hidden="true" />
      <div className="map-target-panel">
        <span>조사 지점</span>
        <strong>농동로 209 잔디밭</strong>
      </div>
      {mapState === "loading" && <p className="map-loading">지도 불러오는 중...</p>}
      {mapState === "fallback" && <p className="map-loading">Kakao 키 없이 실제 지도 미리보기 표시 중</p>}
    </div>
  );
}
