"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any;
    }
  }
}

type SealState = "opened" | "detected" | "locked" | "corrupted";

type SealPoint = {
  id: string;
  name: string;
  shortName: string;
  echo: string;
  memory: string;
  clue: string;
  status: SealState;
  statusLabel: string;
  x: number;
  y: number;
  chapter: string;
};

const worldDraft = {
  title: "기억의 봉인",
  subtitle: "Campus Drop · Story Map Draft 01",
  premise:
    "캠퍼스에 남은 기억은 에코가 되어 장소의 문양에 봉인된다. 누군가 봉인을 오염시키기 시작했고, 드로퍼만이 현실의 표식을 스캔해 그 목소리를 들을 수 있다.",
};

const sealPoints: SealPoint[] = [
  {
    id: "front-gate",
    name: "정문 · 첫 번째 봉인",
    shortName: "정문",
    echo: "미오",
    memory: "처음 학교에 들어오던 날의 기대",
    clue: "교표 아래 반복되는 세 개의 별을 확인하라.",
    status: "opened",
    statusLabel: "해방 완료",
    x: 51,
    y: 83,
    chapter: "프롤로그",
  },
  {
    id: "student-hall",
    name: "학생회관 · 온기의 봉인",
    shortName: "학생회관",
    echo: "모닥",
    memory: "친구를 기다리며 나누던 짧은 대화",
    clue: "빛이 꺼진 게시판에서 사라진 동아리 이름을 찾아라.",
    status: "detected",
    statusLabel: "신호 감지",
    x: 25,
    y: 65,
    chapter: "1장",
  },
  {
    id: "clock-tower",
    name: "시계탑 · 약속의 봉인",
    shortName: "시계탑",
    echo: "세종 기린",
    memory: "같은 시간을 바라보며 했던 약속",
    clue: "멈춘 시곗바늘이 가리키는 두 장소를 연결하라.",
    status: "corrupted",
    statusLabel: "오염 발생",
    x: 54,
    y: 43,
    chapter: "2장",
  },
  {
    id: "library",
    name: "학술정보원 · 침묵의 봉인",
    shortName: "학술정보원",
    echo: "페이지",
    memory: "마지막 한 줄을 읽기 전의 고요함",
    clue: "대출 기록에 존재하지 않는 책의 청구기호를 찾아라.",
    status: "locked",
    statusLabel: "접근 잠김",
    x: 77,
    y: 31,
    chapter: "3장",
  },
  {
    id: "daeyang-hall",
    name: "대양홀 · 환호의 봉인",
    shortName: "대양홀",
    echo: "앙코르",
    memory: "무대가 끝난 뒤에도 남아 있던 박수",
    clue: "다섯 봉인의 기억이 모여야 마지막 문양이 나타난다.",
    status: "locked",
    statusLabel: "최종 봉인",
    x: 32,
    y: 25,
    chapter: "마지막 장",
  },
];

const stateCopy: Record<SealState, string> = {
  opened: "이미 해방한 에코입니다. 이 장소의 기억은 도감에 보존됐습니다.",
  detected: "현장 표식에서 약한 신호가 감지됩니다. 가까이 가면 스캔할 수 있습니다.",
  corrupted: "봉인이 오염됐습니다. 현장의 지정 이미지를 인식해야 에코와 대화할 수 있습니다.",
  locked: "이전 봉인의 기억을 복구해야 접근할 수 있습니다.",
};

export default function Home() {
  const [selectedId, setSelectedId] = useState("clock-tower");
  const [storyOpen, setStoryOpen] = useState(false);
  const [scanNoticeOpen, setScanNoticeOpen] = useState(false);

  const selectedSeal = useMemo(
    () => sealPoints.find((point) => point.id === selectedId) ?? sealPoints[0],
    [selectedId],
  );

  const openedCount = sealPoints.filter((point) => point.status === "opened").length;

  return (
    <main className="escape-app">
      <section className="map-shell" aria-label="캠퍼스드랍 기억의 봉인 지도">
        <header className="map-header">
          <div>
            <span className="draft-label">CONCEPT DRAFT · 언제든 변경 가능</span>
            <h1>{worldDraft.title}</h1>
            <p>{worldDraft.subtitle}</p>
          </div>
          <button
            className="lore-button"
            type="button"
            aria-expanded={storyOpen}
            onClick={() => setStoryOpen((open) => !open)}
          >
            세계관
          </button>
        </header>

        {storyOpen && (
          <aside className="lore-card" aria-live="polite">
            <span>현재 채택안 · 봉인된 캠퍼스 × 장소의 기억</span>
            <p>{worldDraft.premise}</p>
            <button type="button" onClick={() => setStoryOpen(false)}>
              지도 보기
            </button>
          </aside>
        )}

        <div className="mission-strip">
          <div>
            <span>현재 목표</span>
            <strong>오염된 시계탑 봉인을 조사하세요</strong>
          </div>
          <div className="progress-orb" aria-label={`${sealPoints.length}개 중 ${openedCount}개 해방`}>
            <b>{openedCount}</b>
            <span>/ {sealPoints.length}</span>
          </div>
        </div>

        <div className="campus-map">
          <div className="map-atmosphere" aria-hidden="true" />
          <div className="map-grid" aria-hidden="true" />
          <div className="map-water map-water-a" aria-hidden="true" />
          <div className="map-water map-water-b" aria-hidden="true" />
          <div className="map-road map-road-main" aria-hidden="true" />
          <div className="map-road map-road-cross" aria-hidden="true" />
          <div className="map-road map-road-east" aria-hidden="true" />
          <div className="map-building building-a" aria-hidden="true"><span>광개토관</span></div>
          <div className="map-building building-b" aria-hidden="true"><span>군자관</span></div>
          <div className="map-building building-c" aria-hidden="true"><span>집현관</span></div>
          <div className="map-building building-d" aria-hidden="true"><span>운동장</span></div>
          <div className="map-building building-e" aria-hidden="true"><span>충무관</span></div>
          <div className="plaza-rings" aria-hidden="true"><span /><span /><span /></div>

          <div className="seal-path" aria-hidden="true">
            <span className="path-one" />
            <span className="path-two" />
            <span className="path-three" />
            <span className="path-four" />
          </div>

          {sealPoints.map((point, index) => {
            const markerStyle = {
              "--point-x": `${point.x}%`,
              "--point-y": `${point.y}%`,
              "--point-delay": `${index * 160}ms`,
            } as CSSProperties;
            const isSelected = selectedId === point.id;
            return (
              <button
                key={point.id}
                type="button"
                className={`seal-marker is-${point.status}${isSelected ? " is-selected" : ""}`}
                style={markerStyle}
                aria-label={`${point.name}, ${point.statusLabel}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedId(point.id)}
              >
                <span className="seal-signal" aria-hidden="true">
                  <i />
                  <b>{index + 1}</b>
                </span>
                <strong>{point.shortName}</strong>
                <em>{point.statusLabel}</em>
              </button>
            );
          })}

          <div className="map-legend" aria-label="봉인 상태 범례">
            <span><i className="legend-opened" />해방</span>
            <span><i className="legend-signal" />감지</span>
            <span><i className="legend-corrupted" />오염</span>
          </div>
        </div>

        <article className={`seal-sheet sheet-${selectedSeal.status}`} aria-live="polite">
          <div className="sheet-grab" aria-hidden="true" />
          <div className="sheet-heading">
            <div>
              <span>{selectedSeal.chapter} · {selectedSeal.statusLabel}</span>
              <h2>{selectedSeal.name}</h2>
            </div>
            <div className="echo-token" aria-hidden="true">
              {selectedSeal.status === "locked" ? "?" : selectedSeal.echo.slice(0, 1)}
            </div>
          </div>

          <div className="memory-card">
            <span>이 장소에 남은 기억</span>
            <p>“{selectedSeal.memory}”</p>
          </div>

          <div className="seal-detail">
            <div>
              <span>에코</span>
              <strong>{selectedSeal.status === "locked" ? "아직 알 수 없음" : selectedSeal.echo}</strong>
            </div>
            <div>
              <span>현장 단서</span>
              <p>{selectedSeal.clue}</p>
            </div>
          </div>

          <p className="state-description">{stateCopy[selectedSeal.status]}</p>

          {selectedSeal.id === "clock-tower" && (
            <div className="echo-preview" aria-label="세종 기린 3D 미리보기">
              <model-viewer
                src="/sejongGF.glb"
                camera-orbit="45deg 72deg 3.2m"
                field-of-view="28deg"
                exposure="1.1"
                auto-rotate
                interaction-prompt="none"
                disable-zoom
                alt="시계탑 에코 세종 기린"
              />
              <div>
                <span>오염된 에코</span>
                <strong>세종 기린의 목소리가 끊겨 있다</strong>
              </div>
            </div>
          )}

          <button
            className="scan-action"
            type="button"
            disabled={selectedSeal.status === "locked"}
            onClick={() => setScanNoticeOpen(true)}
          >
            {selectedSeal.status === "opened"
              ? "복구된 기억 보기"
              : selectedSeal.status === "locked"
                ? "이전 봉인을 먼저 해방하세요"
                : "현장 스캔 조건 확인"}
          </button>
        </article>

        {scanNoticeOpen && (
          <div className="notice-backdrop" role="presentation" onClick={() => setScanNoticeOpen(false)}>
            <section
              className="scan-notice"
              role="dialog"
              aria-modal="true"
              aria-labelledby="scan-notice-title"
              onClick={(event) => event.stopPropagation()}
            >
              <span>WEB AR 원칙</span>
              <h2 id="scan-notice-title">실물 표식이 확인될 때만 에코가 열립니다</h2>
              <p>
                웹 버전에서는 GPS나 방향 센서로 출현을 흉내 내지 않습니다. 현장의 지정 이미지를
                카메라가 인식한 뒤에만 3D 에코를 해당 이미지에 고정합니다.
              </p>
              <button type="button" onClick={() => setScanNoticeOpen(false)}>확인</button>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
