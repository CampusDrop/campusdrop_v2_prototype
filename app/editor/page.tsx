"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type PromptMode = "question" | "image";
type SolveMode = "quiz" | "ar" | "location";

type AnswerCapture = {
  id: number;
  label: string;
  fileName: string;
  location: string;
};

const promptModes: Array<{ id: PromptMode; title: string; detail: string }> = [
  { id: "question", title: "질문", detail: "텍스트 단서와 선택지/주관식 답을 중심으로 냅니다." },
  { id: "image", title: "이미지", detail: "현장 사진, 포스터, 표식 이미지를 단서로 냅니다." },
];

const solveModes: Array<{ id: SolveMode; title: string; detail: string }> = [
  { id: "quiz", title: "그냥 퀴즈", detail: "사용자가 정답 텍스트를 입력하면 완료됩니다." },
  { id: "ar", title: "AR", detail: "지정 이미지나 현장 표식을 인식하면 AR 오브젝트가 열립니다." },
  { id: "location", title: "위치인식", detail: "GPS 반경 안에 들어오면 조사 가능 상태가 됩니다." },
];

const recommendedShots: Record<SolveMode, number> = {
  quiz: 1,
  ar: 5,
  location: 3,
};

export default function EditorPage() {
  const [questionCount, setQuestionCount] = useState(3);
  const [promptMode, setPromptMode] = useState<PromptMode>("question");
  const [solveMode, setSolveMode] = useState<SolveMode>("ar");
  const [answerText, setAnswerText] = useState("");
  const [captures, setCaptures] = useState<AnswerCapture[]>([]);
  const [locationText, setLocationText] = useState("위치 미저장");

  const recommendedCount = recommendedShots[solveMode];
  const readyScore = useMemo(() => {
    let score = 0;
    if (questionCount > 0) score += 25;
    if (promptMode) score += 25;
    if (solveMode) score += 25;
    if (answerText.trim() || captures.length >= recommendedCount) score += 25;
    return score;
  }, [answerText, captures.length, promptMode, questionCount, recommendedCount, solveMode]);

  function captureLocation() {
    if (!navigator.geolocation) {
      setLocationText("이 브라우저에서는 위치 저장을 사용할 수 없습니다.");
      return;
    }

    setLocationText("현재 위치 저장 중...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationText(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
      },
      () => setLocationText("위치 권한이 필요합니다."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function addCapture(file: File | undefined) {
    if (!file) return;
    setCaptures((current) => [
      ...current,
      {
        id: Date.now(),
        label: `정답 사진 ${current.length + 1}`,
        fileName: file.name,
        location: locationText,
      },
    ]);
  }

  return (
    <main className="editor-app">
      <section className="editor-shell">
        <header className="editor-header">
          <Link className="editor-home-link" href="/">
            데모로 돌아가기
          </Link>
          <div className="brand-lockup editor-brand">
            <Image src="/campusdrop_logo.png" alt="Campus Drop" width={42} height={42} priority />
            <div>
              <span>Campus Drop</span>
              <em>미션 맵 에디터</em>
            </div>
          </div>
          <div>
            <p>운영본부 제작 도구</p>
            <h1>현장 조사 미션을 설계하세요</h1>
          </div>
        </header>

        <section className="editor-progress" aria-label={`제작 준비도 ${readyScore}%`}>
          <div>
            <span>제작 준비도</span>
            <strong>{readyScore}%</strong>
          </div>
          <i><b style={{ width: `${readyScore}%` }} /></i>
        </section>

        <section className="editor-panel">
          <div className="editor-step-title">
            <span>1</span>
            <div>
              <h2>몇 문제가 필요한가요?</h2>
              <p>첫 데모는 3문제를 추천합니다. 너무 길면 현장 몰입이 끊깁니다.</p>
            </div>
          </div>
          <div className="question-count-control">
            <button type="button" onClick={() => setQuestionCount((value) => Math.max(1, value - 1))}>-</button>
            <strong>{questionCount}</strong>
            <button type="button" onClick={() => setQuestionCount((value) => Math.min(8, value + 1))}>+</button>
          </div>
        </section>

        <section className="editor-panel">
          <div className="editor-step-title">
            <span>2</span>
            <div>
              <h2>어떤 방식으로 문제를 낼까요?</h2>
              <p>질문형은 빠르게 만들 수 있고, 이미지형은 현장감이 강합니다.</p>
            </div>
          </div>
          <div className="choice-grid">
            {promptModes.map((mode) => (
              <button
                className={promptMode === mode.id ? "is-selected" : ""}
                key={mode.id}
                type="button"
                onClick={() => setPromptMode(mode.id)}
              >
                <strong>{mode.title}</strong>
                <span>{mode.detail}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="editor-panel">
          <div className="editor-step-title">
            <span>3</span>
            <div>
              <h2>어떤 방식으로 풀게 할까요?</h2>
              <p>AR과 위치인식은 사진/좌표 샘플을 여러 개 모아야 안정적입니다.</p>
            </div>
          </div>
          <div className="choice-grid solve-grid">
            {solveModes.map((mode) => (
              <button
                className={solveMode === mode.id ? "is-selected" : ""}
                key={mode.id}
                type="button"
                onClick={() => setSolveMode(mode.id)}
              >
                <strong>{mode.title}</strong>
                <span>{mode.detail}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="editor-panel answer-panel">
          <div className="editor-step-title">
            <span>4</span>
            <div>
              <h2>정답은 무엇인가요?</h2>
              <p>
                {solveMode === "quiz"
                  ? "퀴즈 정답을 입력하세요. 필요하면 참고 사진도 추가할 수 있습니다."
                  : `현장 사진을 최소 ${recommendedCount}장 정도 모으는 것을 추천합니다.`}
              </p>
            </div>
          </div>

          <label className="answer-input">
            <span>정답 텍스트</span>
            <input
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
              placeholder="예: 운영본부 보안 기록으로 전송"
            />
          </label>

          <div className="capture-tools">
            <button type="button" onClick={captureLocation}>현재 위치 저장</button>
            <label>
              사진 찍기
              <input
                accept="image/*"
                capture="environment"
                type="file"
                onChange={(event) => addCapture(event.target.files?.[0])}
              />
            </label>
          </div>

          <div className="capture-status">
            <span>저장 위치</span>
            <strong>{locationText}</strong>
          </div>

          <div className="capture-list">
            {captures.length === 0 ? (
              <p>아직 저장된 정답 사진이 없습니다. 현장 표식은 정면, 좌측, 우측, 가까운 거리, 먼 거리로 찍는 것을 추천합니다.</p>
            ) : (
              captures.map((capture) => (
                <article key={capture.id}>
                  <span>{capture.label}</span>
                  <strong>{capture.fileName}</strong>
                  <p>{capture.location}</p>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="editor-summary">
          <span>미션 맵 초안</span>
          <strong>{questionCount}문제 · {promptModes.find((mode) => mode.id === promptMode)?.title} 출제 · {solveModes.find((mode) => mode.id === solveMode)?.title} 풀이</strong>
          <p>현재는 브라우저 안에서만 동작하는 데모입니다. 다음 단계에서 저장/불러오기와 실제 이미지 타깃 생성으로 확장할 수 있습니다.</p>
        </aside>
      </section>
    </main>
  );
}
