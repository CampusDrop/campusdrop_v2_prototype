"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Scene = "entry" | "incident" | "mission" | "arrival";
type MessageStep = "hidden" | "first" | "second";

const clockTower = { lat: 37.550944, lng: 127.073765 };
const reachRadiusMeters = 90;

const posterCopy: Record<string, string> = {
  student_hall: "학생회관 포스터를 통해 접속했습니다. 이 근처에서도 이상한 종소리가 들렸다는 제보가 있습니다.",
  library: "학술정보원 포스터를 통해 접속했습니다. 오늘 새벽, 시계탑 쪽에서 같은 제보가 반복됐습니다.",
  gate: "정문 포스터를 통해 접속했습니다. 방문자 기록에는 없는 종소리가 남아 있습니다.",
};

const clues = [
  {
    direction: "시계탑 꼭대기",
    title: "높은 위치에서 사라진 나뭇잎",
    detail: "표본 분석 중… 가장자리만 뜯긴 잎자국이 시계탑 꼭대기 근처에서 반복됩니다.",
  },
  {
    direction: "건물 외벽",
    title: "건물 외벽의 노란색 털",
    detail: "표본 분석 중… 노란색 섬유는 인공 재료가 아닙니다. 대형 초식동물의 체모와 유사합니다.",
  },
  {
    direction: "시계탑 상부",
    title: "꼭대기에서 발생하는 충격음",
    detail: "음향 분석 중… 일정한 간격의 둔탁한 소리가 시계 장치 진동과 별도로 기록됩니다.",
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

function formatClockTime(date: Date) {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function Home() {
  const [scene, setScene] = useState<Scene>("entry");
  const [messageStep, setMessageStep] = useState<MessageStep>("hidden");
  const [now, setNow] = useState(() => new Date());
  const [distance, setDistance] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState("위치 확인 전");
  const [foundClues, setFoundClues] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000 * 20);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (scene !== "incident") return;
    const first = window.setTimeout(() => setMessageStep("first"), 5200);
    return () => window.clearTimeout(first);
  }, [scene]);

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

  return (
    <main className={`case-app scene-${scene}`}>
      <div className="clock-noise" aria-hidden="true" />

      {scene === "entry" && (
        <section className="screen case-entry">
          <div className="brand-lockup"><Image src="/campusdrop_logo.png" alt="Campus Drop" width={42} height={42} priority /><div><span>Campus Drop</span><em>운영본부</em></div></div>
          <div className="clocktower-window" aria-hidden="true">
            <span />
            <i />
          </div>
          <div className="case-title">
            <p>시계탑 이상 현상 조사</p>
            <h1>세종대 시계탑의 시계 4개가 전부 틀린 이유를 알고 있나요?</h1>
          </div>
          <div className="case-status">
            <span>현재 조사 인원</span>
            <strong>127명</strong>
            <p>아직 원인은 밝혀지지 않았습니다.</p>
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
            <h2>시계탑 이상 현상 감지</h2>
          </div>

          <div className="clock-grid" aria-label="시계탑 네 방향 시간">
            <div className="clock-card">
              <ClockFace minuteOffset={-13} />
              <span>동쪽</span>
              <strong>14:19</strong>
            </div>
            <div className="clock-card">
              <ClockFace minuteOffset={15} />
              <span>남쪽</span>
              <strong>14:47</strong>
            </div>
            <div className="clock-card is-corrupted">
              <ClockFace minuteOffset={-34} corrupted />
              <span>서쪽</span>
              <strong>13:58</strong>
            </div>
            <div className="clock-card is-unknown">
              <ClockFace minuteOffset={0} unknown />
              <span>북쪽</span>
              <strong>확인 불가</strong>
            </div>
          </div>

          <div className="time-report">
            <span>휴대폰 현재 시각</span>
            <strong>{formatClockTime(now)}</strong>
            <p>세종대학교 시계탑에는 동서남북을 향한 4개의 시계가 있습니다. 이상하게도 4개의 시계는 모두 실제 시간과 다릅니다.</p>
          </div>

          <div className="system-message">
            <span>시스템</span>
            <p>기계 고장과 일치하지 않는 움직임이 감지됐습니다.</p>
          </div>

          {messageStep !== "hidden" && (
            <button
              className="unknown-message"
              type="button"
              onClick={() => (messageStep === "first" ? setMessageStep("second") : moveToScene("mission"))}
            >
              <div className="talk-notice-head"><span>카카오톡</span><em>지금</em></div>
              <div className="talk-notice-body"><Image className="talk-logo" src="/campusdrop_logo.png" alt="" width={40} height={40} aria-hidden="true" /><div><b>CAMPUS DROP 운영본부</b><strong>{messageStep === "first" ? "사용자 인증이 완료됐습니다. 사건 CD-SJ-01에 임시 배정합니다." : "최근 30일 동안 시계탑 꼭대기에서 정체불명의 생물 신고가 7건 접수됐습니다."}</strong><small>{messageStep === "first" ? "탭해서 사건 개요 보기" : "탭해서 첫 미션 받기"}</small></div></div>
            </button>
          )}
        </section>
      )}

      {scene === "mission" && (
        <section className="screen mission-screen">
          <div className="mission-copy">
            <p>미션 1</p>
            <h2>네 개의 시계를 확인하라</h2>
            <span>현장 조사원은 시계탑 주변에서 정체불명의 대형 생물 흔적을 확인해 주세요.</span>
          </div>

          <div className="campus-radar">
            <div className="radar-map">
              <span className="radar-road road-a" />
              <span className="radar-road road-b" />
              <span className="radar-zone" />
              <span className="current-dot" />
              <span className="clocktower-pin">시계탑</span>
            </div>
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
            <h2>시계탑 신호 범위에 진입했습니다.</h2>
            <span>시계탑을 한 바퀴 돌며 서로 다른 시계를 확인하세요.</span>
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
                ? "분석 완료. 추정 개체 높이 4.5m 이상, 추정 분류 기린과, 현장 존재 가능성 93.7%."
                : `${foundClues.length} / ${clues.length} 흔적 확인`}
            </strong>
            {foundAllClues && <p>다음 파트: 지정 이미지를 스캔해 관리 대상 확인하기</p>}
          </div>
        </section>
      )}
    </main>
  );
}

function ClockFace({
  minuteOffset,
  corrupted = false,
  unknown = false,
}: {
  minuteOffset: number;
  corrupted?: boolean;
  unknown?: boolean;
}) {
  const minuteAngle = unknown ? 0 : minuteOffset * 6;
  const hourAngle = unknown ? 0 : 70 + minuteOffset * 0.5;
  return (
    <div className={`clock-face${corrupted ? " corrupted" : ""}${unknown ? " unknown" : ""}`}>
      <span className="tick tick-a" />
      <span className="tick tick-b" />
      <i className="hand hour" style={{ transform: `rotate(${hourAngle}deg)` }} />
      <i className="hand minute" style={{ transform: `rotate(${minuteAngle}deg)` }} />
      <b />
    </div>
  );
}
