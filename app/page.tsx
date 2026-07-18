"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Scene = "entry" | "incident" | "mission" | "arrival";
type MessageStep = "hidden" | "first";

type KakaoLatLng = object;
type KakaoMap = object;

type KakaoMapsApi = {
  load: (callback: () => void) => void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
  Marker: new (options: { position: KakaoLatLng; title?: string }) => { setMap: (map: KakaoMap) => void };
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

const clockTower = { lat: 37.550944, lng: 127.073765 };
const reachRadiusMeters = 90;
const dropLinkBriefings = [
  "사용자 인증 완료. 임시 현장 조사원으로 등록합니다. 사건 번호 CD-SJ-01, 사건명 시계탑 대형 생물 목격 사건.",
  "세종대학교에는 오래된 소문이 하나 있습니다. 시계탑 꼭대기에는 기린이 산다. 본부는 목격 신고 7건을 근거로 현장 조사가 필요하다고 판단했습니다.",
];

const posterCopy: Record<string, string> = {
  student_hall: "학생회관 포스터를 통해 접속했습니다. 창문 뒤로 긴 그림자를 봤다는 제보가 남아 있습니다.",
  library: "학술정보원 포스터를 통해 접속했습니다. 새벽 시간대 시계탑 꼭대기 목격 신고가 반복됐습니다.",
  gate: "정문 포스터를 통해 접속했습니다. 최근 30일 동안 같은 소문과 관련된 신고가 7건 접수됐습니다.",
};

const clues = [
  {
    direction: "흔적 A",
    title: "사라진 나뭇잎",
    detail: "사람의 손이 닿지 않는 높이에서만 나뭇잎이 사라져 있습니다. 대형 초식동물의 섭식 흔적과 유사합니다.",
  },
  {
    direction: "흔적 B",
    title: "노란색 털",
    detail: "표본을 확인했습니다. 인공 섬유가 아닙니다. 기린과 동물의 체모와 유사하지만 단독 증거로는 확정할 수 없습니다.",
  },
  {
    direction: "흔적 C",
    title: "발굽 같은 충격음",
    detail: "단단한 바닥을 밟는 발굽 소리로 분류됐습니다. 발굽이 바닥에 닿는 간격이 대형 개체 보행 패턴과 일치합니다.",
  },
];

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
  const [foundClues, setFoundClues] = useState<string[]>([]);
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [dropLinkText, setDropLinkText] = useState("");
  const [caseTransferActive, setCaseTransferActive] = useState(false);
  const [dropLinkLine, setDropLinkLine] = useState(0);

  useEffect(() => {
    if (scene !== "incident") return;
    const first = window.setTimeout(() => setMessageStep("first"), 5200);
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
  const foundAllClues = foundClues.length === clues.length;

  function moveToScene(nextScene: Scene) {
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
          clockTower,
        );
        setDistance(nextDistance);
        if (nextDistance <= reachRadiusMeters) {
          setLocationStatus("시계탑 신호 범위에 진입했습니다.");
          moveToScene("arrival");
          return;
        }
        setLocationStatus("아직 신호 범위 밖입니다. 시계탑 쪽으로 이동하세요.");
      },
      () => {
        setLocationStatus("위치 권한을 허용하면 시계탑 도착 여부를 확인할 수 있습니다.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function toggleClue(title: string) {
    setFoundClues((current) => (current.includes(title) ? current : [...current, title]));
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
          <button className="primary-action" type="button" onClick={() => moveToScene("incident")}>
            조사 참여하기
          </button>
          <p className="warning-copy">※ 시계탑 꼭대기를 너무 오래 올려다보지 마세요.</p>
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
            <span>세종대학교 시계탑으로 이동해 소문 속 대형 생물의 흔적을 확인하세요. GPS는 시계탑 근처 도착 여부만 확인합니다.</span>
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
            <button className="primary-action" type="button" onClick={checkLocation}>
              현재 위치로 확인
            </button>
            <button className="secondary-action" type="button" onClick={() => moveToScene("arrival")}>
              데모용 도착 처리
            </button>
          </div>
        </section>
      )}

      {scene === "arrival" && (
        <section className="screen arrival-screen">
          <div className="arrival-copy">
            <p>체크포인트 열림</p>
            <h2>시계탑 조사 범위에 진입했습니다.</h2>
            <span>목격 신고에서 공통적으로 언급된 세 가지 흔적을 찾아주세요.</span>
          </div>

          <div className="clue-list">
            {clues.map((clue) => {
              const active = foundClues.includes(clue.title);
              return (
                <button
                  key={clue.title}
                  className={active ? "is-found" : ""}
                  type="button"
                  onClick={() => toggleClue(clue.title)}
                >
                  <span>{clue.direction}</span>
                  <strong>{clue.title}</strong>
                  <p>{active ? clue.detail : "탭해서 흔적 조사"}</p>
                </button>
              );
            })}
          </div>

          <div className={`conclusion ${foundAllClues ? "is-open" : ""}`} aria-live="polite">
            <span>조사 결론</span>
            <strong>
              {foundAllClues
                ? "분석 완료. 추정 개체 높이 4.5m 이상, 추정 분류 기린과, 실제 개체 존재 가능성 93.7%."
                : `${foundClues.length} / ${clues.length} 흔적 확인`}
            </strong>
            {foundAllClues && <p>기존 기록과 일치하는 개체가 확인됐습니다. 다음 파트: 지정 이미지를 스캔해 세린이와 첫 접촉하기</p>}
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
      const center = new window.kakao.maps.LatLng(clockTower.lat, clockTower.lng);
      const map = new window.kakao.maps.Map(mapRef.current, { center, level: 3 });
      new window.kakao.maps.Marker({ position: center, title: "세종대학교 시계탑" }).setMap(map);
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

  const fallbackSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${clockTower.lng - 0.003}%2C${clockTower.lat - 0.002}%2C${clockTower.lng + 0.003}%2C${clockTower.lat + 0.002}&layer=mapnik&marker=${clockTower.lat}%2C${clockTower.lng}`;

  return (
    <div className="real-map-shell">
      {mapState === "fallback" ? (
        <iframe className="real-map-frame" title="세종대학교 시계탑 지도" src={fallbackSrc} loading="lazy" />
      ) : (
        <div ref={mapRef} className="real-map-canvas" aria-label="세종대학교 시계탑 실제 지도" />
      )}
      <div className="map-target-panel">
        <span>조사 지점</span>
        <strong>세종대학교 시계탑</strong>
      </div>
      {mapState === "loading" && <p className="map-loading">지도 불러오는 중...</p>}
      {mapState === "fallback" && <p className="map-loading">Kakao 키 없이 실제 지도 미리보기 표시 중</p>}
    </div>
  );
}
