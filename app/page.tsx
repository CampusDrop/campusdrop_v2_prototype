"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";

type Scene = "entry" | "incident" | "mission" | "camera" | "arrival" | "witness" | "witnessOrder" | "imagination" | "emptyRecord" | "firstContact";
type MessageStep = "hidden" | "first";
type DropLinkMode = "case" | "clue" | "arrange" | "chapter3" | "chapter4" | "chapter5";
type GiraffeQuestionKey = "origin" | "star" | "fade";
type DirectionKey = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

type Coordinate = { lat: number; lng: number };
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
  CustomOverlay: new (options: { position: KakaoLatLng; content: HTMLElement; xAnchor?: number; yAnchor?: number }) => { setMap: (map: KakaoMap) => void; setPosition?: (position: KakaoLatLng) => void };
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
const DEFAULT_KAKAO_JAVASCRIPT_KEY = "97b8390b5c4e8c53f8504d89c5a5c8f4";
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
const witnesses = [
  {
    id: "A",
    name: "기록 03",
    recordTitle: "익명 게시판의 목격담",
    place: "잔디밭 남서쪽",
    location: { lat: 37.55009418972363, lng: 127.0736196575354 },
    photo: "/gfPhoto_03.png",
    emptyPhoto: "/gfPhoto_03-no-giraffe.png",
    piece: "FE",
    correctDirection: "N" as DirectionKey,
  },
  {
    id: "B",
    name: "기록 02",
    recordTitle: "동아리 회지의 삽화",
    place: "북쪽 보행로",
    location: { lat: 37.55143211168644, lng: 127.07371716568217 },
    photo: "/gfPhoto_02.png",
    emptyPhoto: "/gfPhoto_02-no-giraffe.png",
    piece: "AF",
    correctDirection: "SE" as DirectionKey,
  },
  {
    id: "C",
    name: "기록 01",
    recordTitle: "오래된 학생수첩의 낙서",
    place: "동쪽 진입로",
    location: { lat: 37.550652047104954, lng: 127.0748310833212 },
    photo: "/gfPhoto_01.png",
    emptyPhoto: "/gfPhoto_01-no-giraffe.png",
    piece: "GIR",
    correctDirection: "NW" as DirectionKey,
  },
];
const correctWitnessOrder = ["C", "B", "A"];
const dropLinkBriefings = [
  "사용자 인증 완료. 임시 현장 조사원으로 등록합니다. 사건 번호 CD-SJ-01, 사건명 시계탑 대형 생물 목격 사건.",
  "세종대학교에는 오래된 소문이 하나 있습니다. 시계탑 꼭대기에는 기린이 산다. 본부는 목격 신고 7건을 근거로 현장 조사가 필요하다고 판단했습니다.",
];
const clueTransmissionBriefings = [
  "[DROPLINK] 증거물 전송이 완료되었습니다.",
  "[DROPLINK] 확보된 노란 털의 생물학적 분류를 확인할 수 없습니다.",
  "[DROPLINK] 시계탑 주변에서 접수된 과거 기록을 조회합니다.",
  "[DROPLINK] 기록 저장소 분석 중...",
  "[DROPLINK] 관련 가능성이 있는 기록 세 건을 확인했습니다.",
  "[DROPLINK] 기록의 작성 시점 정보가 일부 손상되어 있습니다.",
  "[운영본부] 세 기록의 형태와 내용을 비교해 시간적 순서를 복원하십시오.",
  "[DROPLINK] 에너지 반응이 강한 지점 3곳을 지도상에 표시했습니다. 각 목적지 반경 10m 안에 진입해 현장 자료 이미지를 확보하세요.",
];
const witnessArrangeBriefings = [
  "[DROPLINK] 자료 이미지 3건이 모두 확보되었습니다.",
  "[DROPLINK] [기록 분석 지시]",
  "[DROPLINK] 획득한 기록을 오래된 순서대로 배치하십시오.",
];
const chapterThreeBriefings = [
  "[DROPLINK] 분석 결과가 등록되었습니다.",
  "[DROPLINK] 확인된 생물: GIRAFFE",
  "[DROPLINK] 세 기록은 서로 다른 시기에 작성되었습니다.",
  "[DROPLINK] 기록 작성자 사이의 직접적인 연관성은 확인되지 않습니다.",
  "[운영본부] 모든 기록은 시계탑 상부에 나타난 긴 목의 기린을 묘사하고 있습니다.",
  "[운영본부] 해당 개체가 최근에 처음 나타난 것은 아닐 가능성이 있습니다.",
  "[운영본부] 기록 사이에 추가적인 차이가 있는지 계속 조사하십시오.",
  "[DROPLINK] [증거물 추가 분석 지시]",
  "[DROPLINK] 획득한 세 건의 증거물을 시간순으로 비교하십시오.",
  "[DROPLINK] 개체의 외형에서 달라진 점이나 특별한 특징이 발견된다면 해당 요소를 영문으로 보고하십시오.",
];
const chapterFourBriefings = [
  "[DROPLINK] 강조 단어 확인: IMAGINE",
  "[DROPLINK] 최초 학생수첩의 기록은 일반적인 목격 보고와 형식이 다릅니다.",
  "[DROPLINK] 작성자는 탑을 바라보며 기린이 있는 모습을 떠올렸습니다.",
  "[DROPLINK] 이후 기록에서는 유사한 개체가 반복해서 나타납니다.",
  "[DROPLINK] 기록 사이의 관계는 확인되지 않았습니다.",
  "[운영본부] 최초 기록의 내용이 다른 학생들에게 전달되었을 가능성이 있습니다.",
  "[운영본부] 현재 자료만으로는 기록 사이의 관계를 확정할 수 없습니다.",
  "[DROPLINK] 증거물 상태 변화가 감지되었습니다.",
  "[DROPLINK] 현재 기록이 최초 확보본과 일치하지 않습니다.",
  "[DROPLINK] 배경과 문자 정보에는 변화가 없습니다.",
  "[DROPLINK] 개체로 분류된 영역에서만 정보 손실이 확인됩니다.",
  "[DROPLINK] 원인은 확인되지 않았습니다.",
];
const chapterFiveBriefings = [
  "[DROPLINK] 개체 정보가 다시 감소하고 있습니다.",
  "[DROPLINK] 현재 방식으로는 복원 상태를 유지할 수 없습니다.",
  "[DROPLINK] 세 증거물에서 동일한 잔류 패턴이 감지되었습니다.",
  "[DROPLINK] 잔류 패턴의 출처는 시계탑 인근으로 추정됩니다.",
  "[DROPLINK] 현장 추가 조사가 필요합니다.",
  "[DROPLINK] [현장 조사 지시]",
  "[DROPLINK] 시계탑 인근에서 잔류 패턴과 일치하는 이미지를 찾으십시오.",
  "[DROPLINK] 발견한 이미지를 DROPLINK 카메라로 조사하십시오.",
];
const chapterThreeRecords = correctWitnessOrder.map((id) => witnesses.find((witness) => witness.id === id)!);
const imaginationResults = [
  "[DROPLINK] 강조 단어 확인: IMAGINE",
  "[DROPLINK] 최초 학생수첩의 기록은 일반적인 목격 보고와 형식이 다릅니다.",
  "[DROPLINK] 작성자는 탑을 바라보며 기린이 있는 모습을 떠올렸습니다.",
  "[DROPLINK] 이후 기록에서는 유사한 개체가 반복해서 나타납니다.",
  "[DROPLINK] 기록 사이의 관계는 확인되지 않았습니다.",
  "[운영본부] 최초 기록의 내용이 다른 학생들에게 전달되었을 가능성이 있습니다.",
  "[운영본부] 현재 자료만으로는 기록 사이의 관계를 확정할 수 없습니다.",
];
const emptyRecordMasks: Record<string, { x: number; y: number; width: number; height: number; radius: number }> = {
  C: { x: 32, y: 18, width: 40, height: 54, radius: 28 },
  B: { x: 24, y: 28, width: 42, height: 48, radius: 27 },
  A: { x: 35, y: 45, width: 34, height: 38, radius: 25 },
};

const finalSignalBriefings = [
  "[DROPLINK] 세 증거물에서 동일한 잔류 패턴이 감지되었습니다.",
  "잔류 패턴의 출처는 시계탑 인근으로 추정됩니다. 등록되지 않은 이미지를 찾아 조사하십시오.",
  "특별 이미지의 일부분을 확대했습니다. 현장에서 동일한 조각을 찾아 DROPLINK 카메라 중앙에 맞추세요.",
];
const giraffeQuestions: Array<{ key: GiraffeQuestionKey; label: string; answer: string }> = [
  {
    key: "origin",
    label: "너는 어디서 왔어?",
    answer: "처음에는 누군가 탑을 보다가 떠올린 작은 생각이었어. 그다음부터 여러 사람이 나를 조금씩 다르게 상상해줬어.",
  },
  {
    key: "star",
    label: "별 모양은 어떻게 생긴 거야?",
    answer: "처음부터 있던 건 아니야. 누군가 나에게 별이 있으면 좋겠다고 생각했어. 그 뒤부터 정말로 생겼어.",
  },
  {
    key: "fade",
    label: "왜 기록에서 사라졌어?",
    answer: "사람들이 더 이상 나를 떠올리지 않으면 내 모습도 흐려져. 그림 속에서도, 여기에서도 조금씩 보이지 않게 돼.",
  },
];

const emptyRecordResults = [
  "[DROPLINK] 수동 위치 지정이 완료되었습니다.",
  "[DROPLINK] 삭제된 개체 정보가 다시 확인됩니다.",
  "[DROPLINK] 탐사원이 입력한 정보는 위치 좌표뿐입니다.",
  "[DROPLINK] 입력된 좌표만으로 개체의 외형이 복원된 원인을 설명할 수 없습니다.",
  "[운영본부] 저장된 임시 데이터가 뒤늦게 복구되었을 가능성이 있습니다.",
  "[운영본부] 복원된 증거물의 상태를 다시 확인하십시오.",
  "[DROPLINK] 개체 정보가 다시 감소하고 있습니다.",
  "[DROPLINK] 현재 방식으로는 복원 상태를 유지할 수 없습니다.",
  "[DROPLINK] 세 증거물에서 동일한 잔류 패턴이 감지되었습니다.",
  "[DROPLINK] 잔류 패턴의 출처는 시계탑 인근으로 추정됩니다.",
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
  const [locationStatus, setLocationStatus] = useState("위치 확인 전");
  const [locationInReach, setLocationInReach] = useState(false);
  const [lastLocationUpdatedAt, setLastLocationUpdatedAt] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [dropLinkNoticeOpen, setDropLinkNoticeOpen] = useState(false);
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
  const [witnessStatus, setWitnessStatus] = useState("에너지 반응이 강한 지점 3곳을 방문해 자료 이미지를 확보하세요.");
  const [acquiredWitnessId, setAcquiredWitnessId] = useState<string | null>(null);
  const [arrangeBriefingQueued, setArrangeBriefingQueued] = useState(false);
  const arrangeBriefingQueuedRef = useRef(false);
  const [witnessOrder, setWitnessOrder] = useState<string[]>(["A", "C", "B"]);
  const [selectedOrderCardId, setSelectedOrderCardId] = useState<string | null>(null);
  const [witnessOrderSubmitted, setWitnessOrderSubmitted] = useState(false);
  const [witnessOrderFeedback, setWitnessOrderFeedback] = useState("기록을 오래된 순서대로 배치한 뒤 분석을 요청하세요.");
  const [witnessAnswer, setWitnessAnswer] = useState("");
  const [witnessAnswerFeedback, setWitnessAnswerFeedback] = useState("기록 배열이 확인되면 보고 입력창이 열립니다.");
  const [witnessAnswerSubmitted, setWitnessAnswerSubmitted] = useState(false);
  const [expandedWitnessId, setExpandedWitnessId] = useState<string | null>(null);
  const [chapterThreePreviewIndex, setChapterThreePreviewIndex] = useState<number | null>(null);
  const [starAnswer, setStarAnswer] = useState("");
  const [starFeedback, setStarFeedback] = useState("기록 속 개체의 외형에서 달라진 특징을 영문으로 보고하십시오.");
  const [starSolved, setStarSolved] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreSolved, setRestoreSolved] = useState(false);
  const [imagineAnswer, setImagineAnswer] = useState("");
  const [imagineFeedback, setImagineFeedback] = useState("복원된 페이지에서 강조된 단어를 확인하십시오.");
  const [imagineSolved, setImagineSolved] = useState(false);
  const [emptyAutoProgress, setEmptyAutoProgress] = useState(0);
  const [activeEmptyRecordId, setActiveEmptyRecordId] = useState(chapterThreeRecords[0].id);
  const [emptyRecordHits, setEmptyRecordHits] = useState<Record<string, boolean>>(() => Object.fromEntries(chapterThreeRecords.map((record) => [record.id, false])));
  const [emptyRecordFeedback, setEmptyRecordFeedback] = useState("[증거물 상태 변화 감지] 현재 기록이 최초 확보본과 일치하지 않습니다. 배경과 문자 정보에는 변화가 없습니다.");
  const [emptyRecordComplete, setEmptyRecordComplete] = useState(false);
  const [finalScanStarted, setFinalScanStarted] = useState(false);
  const [finalScanProgress, setFinalScanProgress] = useState(0);
  const [finalScanMatched, setFinalScanMatched] = useState(false);
  const [finalScanStatus, setFinalScanStatus] = useState("잔류 패턴과 일치하는 특별 이미지를 찾아 카메라 중앙에 맞추세요.");
  const [answeredGiraffeQuestions, setAnsweredGiraffeQuestions] = useState<Record<GiraffeQuestionKey, boolean>>({ origin: false, star: false, fade: false });
  const [activeGiraffeQuestion, setActiveGiraffeQuestion] = useState<GiraffeQuestionKey | null>(null);
  const [observationText, setObservationText] = useState("");
  const [observationSubmitted, setObservationSubmitted] = useState(false);
  const [finalResponse, setFinalResponse] = useState("");
  const [draggedWitnessId, setDraggedWitnessId] = useState<string | null>(null);
  const orderPointerRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const restoreBoardRef = useRef<HTMLDivElement | null>(null);
  const restoreTouchedRef = useRef<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraWatchRef = useRef<number | null>(null);
  const cameraFoundTimerRef = useRef<number | null>(null);
  const finalScanTimerRef = useRef<number | null>(null);

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
    if (mode === "arrange") return witnessArrangeBriefings;
    if (mode === "chapter3") return chapterThreeBriefings;
    if (mode === "chapter4") return chapterFourBriefings;
    return chapterFiveBriefings;
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
    if (finalScanTimerRef.current !== null) {
      window.clearInterval(finalScanTimerRef.current);
      finalScanTimerRef.current = null;
    }
  }

  function applyMissionLocation(position: GeolocationPosition, options: { silent?: boolean } = {}) {
    const nextLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
    setUserLocation(nextLocation);
    const nextDistance = getDistanceMeters(nextLocation, missionTarget);
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
      if (!options.silent) setWitnessStatus(`${witness.name} 자료 이미지는 이미 확보했습니다. 자료 이미지를 확인하고 순서를 배열하세요.`);
      return;
    }

    const nextVisited = { ...visitedWitnesses, [witness.id]: true };
    setVisitedWitnesses(nextVisited);
    setAcquiredWitnessId(witness.id);
    triggerEvidenceVibration();
    setWitnessStatus(`${witness.name} 자료 이미지를 확보했습니다. 획득 자료를 확인하세요.`);
    if (witnesses.every((item) => nextVisited[item.id])) {
      arrangeBriefingQueuedRef.current = true;
      setArrangeBriefingQueued(true);
    }
  }

  function openArrangeBriefing() {
    arrangeBriefingQueuedRef.current = false;
    setArrangeBriefingQueued(false);
    setDropLinkMode("arrange");
    setDropLinkLine(0);
    setDropLinkText("");
    setCaseModalOpen(true);
    triggerDropLinkVibration();
  }

  function closeWitnessAcquisition() {
    setAcquiredWitnessId(null);
    if (!arrangeBriefingQueuedRef.current && !arrangeBriefingQueued) return;
    window.setTimeout(openArrangeBriefing, 260);
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
    if (!options.silent) setWitnessStatus("가장 가까운 에너지 지점으로 이동하세요. 반경 10m 안에서만 자료 이미지가 열립니다.");
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

  useEffect(() => {
    if (scene !== "emptyRecord") return;
    let timer: number | null = null;
    const starter = window.setTimeout(() => {
      setEmptyAutoProgress(0);
      setEmptyRecordFeedback("[DROPLINK] 증거물 상태 변화가 감지되었습니다. 현재 기록이 최초 확보본과 일치하지 않습니다. 배경과 문자 정보에는 변화가 없습니다. 개체로 분류된 영역에서만 정보 손실이 확인됩니다. 원인은 확인되지 않았습니다.");
      timer = window.setInterval(() => {
        setEmptyAutoProgress((current) => {
          const next = Math.min(100, current + 4);
          if (next >= 100 && timer !== null) window.clearInterval(timer);
          return next;
        });
      }, 90);
    }, 0);
    return () => {
      window.clearTimeout(starter);
      if (timer !== null) window.clearInterval(timer);
    };
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
    if ((scene === "camera" && nextScene !== "camera") || (scene === "firstContact" && nextScene !== "firstContact")) {
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

  function resetWitnessAnalysis() {
    setWitnessOrderSubmitted(false);
    setWitnessAnswerSubmitted(false);
    setWitnessAnswer("");
    setWitnessAnswerFeedback("기록 배열이 확인되면 보고 입력창이 열립니다.");
    setWitnessOrderFeedback("기록을 오래된 순서대로 배치한 뒤 분석을 요청하세요.");
  }


  function moveWitnessBySwipe(id: string, direction: "left" | "right") {
    if (witnessOrderSubmitted) return;
    resetWitnessAnalysis();
    setWitnessOrder((current) => {
      const index = current.indexOf(id);
      if (index < 0) return current;
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function handleOrderPointerUp(id: string, event: PointerEvent<HTMLElement>) {
    const start = orderPointerRef.current;
    orderPointerRef.current = null;
    if (!start || start.id !== id || witnessOrderSubmitted) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    moveWitnessBySwipe(id, dx < 0 ? "left" : "right");
  }

  function moveWitnessOrder(sourceId: string, targetId: string) {
    if (sourceId === targetId || witnessOrderSubmitted) return;
    resetWitnessAnalysis();
    setWitnessOrder((current) => {
      const next = current.filter((id) => id !== sourceId);
      const targetIndex = next.indexOf(targetId);
      next.splice(targetIndex, 0, sourceId);
      return next;
    });
  }

  function swapWitnessOrder(sourceId: string, targetId: string) {
    if (sourceId === targetId || witnessOrderSubmitted) return;
    resetWitnessAnalysis();
    setWitnessOrder((current) => {
      const next = [...current];
      const sourceIndex = next.indexOf(sourceId);
      const targetIndex = next.indexOf(targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
      return next;
    });
  }

  function selectOrderCard(id: string) {
    if (witnessOrderSubmitted) return;
    if (!selectedOrderCardId) {
      setSelectedOrderCardId(id);
      setWitnessOrderFeedback("교환할 두 번째 기록 카드를 선택하세요.");
      return;
    }
    swapWitnessOrder(selectedOrderCardId, id);
    setSelectedOrderCardId(null);
  }

  function submitWitnessOrder() {
    if (!allWitnessImagesAcquired) return;
    if (witnessOrder.join("") !== correctWitnessOrder.join("")) {
      setWitnessOrderFeedback("기록 사이의 시간적 연결을 확인할 수 없습니다. 기록 매체와 작성 방식을 다시 분석하십시오.");
      return;
    }
    setWitnessOrderSubmitted(true);
    setSelectedOrderCardId(null);
    setWitnessOrderFeedback("기록의 시간적 배열이 확인되었습니다. 각 기록에 포함된 식별 문자를 연결하십시오.");
    setWitnessAnswerFeedback("세 기록에 공통으로 등장하는 생물을 영문으로 보고하십시오.");
  }

  function submitWitnessAnswer() {
    if (!witnessOrderSubmitted) return;
    const normalized = witnessAnswer.trim().toUpperCase();
    if (witnessAnswer.trim() === "기린") {
      setWitnessAnswerFeedback("국제 생물 분류 기록을 위해 영문 명칭이 필요합니다.");
      return;
    }
    if (normalized !== "GIRAFFE") {
      setWitnessAnswerFeedback("보고된 명칭이 증거물과 일치하지 않습니다.");
      return;
    }
    setWitnessAnswerSubmitted(true);
    setWitnessAnswerFeedback("분석 결과가 등록되었습니다.");
  }

  function submitStarAnswer() {
    const normalized = starAnswer.trim().toUpperCase();
    if (starAnswer.trim() === "별") {
      setStarFeedback("분석 보고는 영문으로 입력하십시오.");
      return;
    }
    if (normalized !== "STAR") {
      setStarFeedback("보고된 특징을 증거물에서 확인할 수 없습니다.");
      return;
    }
    setStarSolved(true);
    setStarFeedback("[DROPLINK] STAR 확인. 해당 특징은 증거물 02와 03에서 발견됩니다. 증거물 01에서는 동일한 특징이 확인되지 않습니다. 증거물 01에서 미복원 기록이 발견되었습니다. 손상된 다음 페이지를 복원하십시오.");
  }

  function markRestorePoint(clientX: number, clientY: number) {
    if (!starSolved || restoreSolved || !restoreBoardRef.current) return;
    const rect = restoreBoardRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const key = `${Math.floor(x * 10)}-${Math.floor(y * 14)}`;
    restoreTouchedRef.current.add(key);
    const nextProgress = Math.min(100, Math.round((restoreTouchedRef.current.size / 58) * 100));
    setRestoreProgress(nextProgress);
    if (nextProgress >= 72) {
      setRestoreSolved(true);
      setRestoreProgress(100);
    }
  }

  function handleRestorePointer(event: PointerEvent<HTMLDivElement>) {
    if (event.buttons !== 1 && event.pointerType !== "touch") return;
    markRestorePoint(event.clientX, event.clientY);
  }

  function completeRestoreByAdmin() {
    setRestoreSolved(true);
    setRestoreProgress(100);
  }

  function submitImagineAnswer() {
    if (!restoreSolved) return;
    if (imagineAnswer.trim().toUpperCase() !== "IMAGINE") {
      setImagineFeedback("강조된 단어와 입력한 내용이 일치하지 않습니다.");
      return;
    }
    setImagineSolved(true);
    setImagineFeedback("기록 복원이 완료되었습니다.");
  }

  function completeFinalPosterScan() {
    if (finalScanTimerRef.current !== null) {
      window.clearInterval(finalScanTimerRef.current);
      finalScanTimerRef.current = null;
    }
    setFinalScanProgress(100);
    setFinalScanMatched(true);
    triggerEvidenceVibration();
    setFinalScanStatus("[DROPLINK] 이미지 일치율 100%. 잔류 패턴의 출처를 확인했습니다. 미등록 개체 정보가 복원되고 있습니다.");
  }

  async function startFinalPosterScan(options: { adminOverride?: boolean } = {}) {
    setFinalScanStarted(true);
    setFinalScanMatched(false);
    setFinalScanProgress(0);
    setAnsweredGiraffeQuestions({ origin: false, star: false, fade: false });
    setActiveGiraffeQuestion(null);
    setObservationSubmitted(false);
    setFinalResponse("");
    setFinalScanStatus(options.adminOverride ? "[DROPLINK] 이미지 패턴 분석 중." : "카메라 권한을 요청하는 중...");
    moveToScene("firstContact");
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    if (!options.adminOverride && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setFinalScanStatus("카메라 권한을 허용하면 특별 이미지를 조사할 수 있습니다. 데모에서는 관리자 버튼으로 진행할 수 있습니다.");
        setFinalScanStarted(false);
        return;
      }
    }

    setFinalScanStatus("[DROPLINK] 이미지 패턴 분석 중. 일치율 42%. 카메라를 이미지 중앙에 유지하십시오.");
    if (finalScanTimerRef.current !== null) window.clearInterval(finalScanTimerRef.current);
    finalScanTimerRef.current = window.setInterval(() => {
      setFinalScanProgress((current) => {
        const next = Math.min(100, current + 4);
        if (next >= 78 && next < 100) setFinalScanStatus("[DROPLINK] 일치율 78%. 이미지 이동을 감지했습니다. 위치를 유지하십시오.");
        if (next >= 100) completeFinalPosterScan();
        return next;
      });
    }, 110);
  }

  function answerGiraffeQuestion(key: GiraffeQuestionKey) {
    setActiveGiraffeQuestion(key);
    setAnsweredGiraffeQuestions((current) => ({ ...current, [key]: true }));
  }

  function submitObservationRecord() {
    if (!allGiraffeQuestionsAnswered || observationText.trim().length < 6) return;
    setObservationSubmitted(true);
  }

  function handleEmptyRecordPoint(recordId: string, event: PointerEvent<HTMLButtonElement>) {
    if (emptyRecordComplete) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const mask = emptyRecordMasks[recordId];
    const centerX = mask.x + mask.width / 2;
    const centerY = mask.y + mask.height / 2;
    const distance = Math.hypot(x - centerX, y - centerY);
    setActiveEmptyRecordId(recordId);
    if (distance > mask.radius) {
      setEmptyRecordFeedback("지정한 영역이 기존 개체 좌표와 일치하지 않습니다.");
      return;
    }
    const nextHits = { ...emptyRecordHits, [recordId]: true };
    setEmptyRecordHits(nextHits);
    if (chapterThreeRecords.every((record) => nextHits[record.id])) {
      setEmptyRecordComplete(true);
      setEmptyRecordFeedback("[DROPLINK] 수동 위치 지정이 완료되었습니다. 삭제된 개체 정보가 다시 확인됩니다.");
      return;
    }
    setEmptyRecordFeedback("기존 개체 좌표를 확인했습니다. 남은 기록에서도 기존 위치를 지정하십시오.");
  }

  const allGiraffeQuestionsAnswered = giraffeQuestions.every((question) => answeredGiraffeQuestions[question.key]);
  const allWitnessImagesAcquired = witnesses.every((witness) => visitedWitnesses[witness.id]);
  const witnessOrderSolved = witnessOrderSubmitted;
  const witnessSolved = witnessAnswerSubmitted;

  function openDropLinkNotice(mode: DropLinkMode) {
    setDropLinkMode(mode);
    setDropLinkLine(0);
    setDropLinkText("");
    setCaseModalOpen(false);
    setDropLinkNoticeOpen(true);
    triggerDropLinkVibration();
  }

  function openDropLinkModalFromNotice() {
    setDropLinkNoticeOpen(false);
    setCaseModalOpen(true);
    triggerDropLinkVibration();
  }

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

    const nextSceneByMode: Record<DropLinkMode, Scene> = {
      case: "mission",
      clue: "witness",
      arrange: "witnessOrder",
      chapter3: "imagination",
      chapter4: "emptyRecord",
      chapter5: "firstContact",
    };
    const nextScene = nextSceneByMode[dropLinkMode];
    if (dropLinkMode === "clue") {
      setCaseModalOpen(false);
      setCaseTransferActive(false);
      setMessageStep("hidden");
      setDropLinkMode("case");
      setDropLinkLine(0);
      setDropLinkText("");
      moveToScene("witness");
      return;
    }

    setCaseTransferActive(true);
    window.setTimeout(() => {
      setCaseModalOpen(false);
      setCaseTransferActive(false);
      setMessageStep("hidden");
      setDropLinkMode("case");
      setDropLinkLine(0);
      setDropLinkText("");
      moveToScene(nextScene);
    }, 1500);
  }

  function openDropLinkBriefing(mode: DropLinkMode) {
    openDropLinkNotice(mode);
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
            moveToScene("witness");
            openDropLinkNotice("clue");
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
            <MissionMap userLocation={userLocation} />
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
            <h2>여러 사람이 그린 하나의 기린</h2>
            <span>DROP LINK가 표시한 강한 에너지 반응 지점으로 이동해 손상된 과거 기록을 확보하세요.</span>
          </div>

          <div className="campus-radar witness-radar">
            <WitnessMap
              userLocation={userLocation}
              activeWitnessId={activeWitnessId}
              visitedWitnesses={visitedWitnesses}
              onSelectWitness={setActiveWitnessId}
            />
            <div className="radar-data witness-data">
              <div><span>조사 범위</span><strong>{witnessReachRadiusMeters}m</strong></div>
              <div><span>확보한 자료</span><strong>{witnesses.filter((witness) => visitedWitnesses[witness.id]).length}/3</strong></div>
              <div><span>배열 상태</span><strong>{witnessOrderSolved ? "완료" : `${witnessOrder.filter((id) => visitedWitnesses[id]).length}/3`}</strong></div>
            </div>
          </div>

          <p className="location-status">{witnessStatus}</p>
          <div className="mission-actions witness-actions">
            <button className="secondary-action" type="button" onClick={() => requestWitnessLocation()}>현재 위치 즉시 갱신</button>
            <button className="text-scan-refresh" type="button" onClick={markActiveWitnessArrived}>관리자 권한으로 도착 완료</button>
          </div>
          {allWitnessImagesAcquired && !witnessOrderSolved && (
            <div className="next-briefing-panel">
              <span>자료 이미지 3건 확보</span>
              <strong>DROP LINK 배열 지시를 수신할 수 있습니다.</strong>
              <button className="primary-action" type="button" onClick={openArrangeBriefing}>DROP LINK 배열 지시 수신</button>
            </div>
          )}

          <div className="witness-list" aria-label="에너지 지점 자료 목록">
            {witnesses.map((witness) => {
              const isActive = activeWitnessId === witness.id;
              const isVisited = visitedWitnesses[witness.id];
              return (
                <article key={witness.id} className={`witness-card${isActive ? " is-active" : ""}${isVisited ? " is-visited" : ""}`}>
                  <button type="button" className="witness-card-head" onClick={() => setActiveWitnessId(witness.id)}>
                    <span>{witness.name}</span>
                    <strong>{isVisited ? witness.recordTitle : witness.place}</strong>
                    <em>{witnessDistances[witness.id] === null ? "거리 측정 전" : `${witnessDistances[witness.id]}m`}</em>
                  </button>
                  <div className={`witness-photo${isVisited ? " is-open" : " is-locked"}`}>
                    {isVisited ? (
                      <button
                        type="button"
                        className="witness-photo-image"
                        aria-label={`${witness.name} 자료 이미지 확대`}
                        style={{ backgroundImage: `url(${witness.photo})` }}
                        onClick={() => setExpandedWitnessId(witness.id)}
                      />
                    ) : (
                      <span>도착 전 접근 잠김</span>
                    )}
                  </div>
                  {!isVisited && (
                    <button
                      type="button"
                      className="witness-admin-arrive"
                      onClick={() => acquireWitnessEvidence(witness.id, { admin: true })}
                    >
                      관리자 권한으로 이 지점 도착 처리
                    </button>
                  )}
                </article>
              );
            })}
          </div>

        </section>
      )}

      {scene === "witnessOrder" && (
        <section className="screen witness-order-screen">
          <div className="mission-copy">
            <p>2장</p>
            <h2>기록 배열</h2>
            <span>획득한 세 건의 기록을 오래된 순서대로 정렬하고, 연결된 식별 문자를 분석하세요.</span>
          </div>

          <div className="order-quiz-panel">
            <div className="order-quiz-copy">
              <span>CAMPUSDROP 분석 지시</span>
              <strong>획득한 세 건의 기록을 분석하십시오.</strong>
              <p>기록의 형태와 내용을 확인하고, 오래된 기록부터 순서대로 배치하십시오. 카드를 좌우로 드래그하거나 순서 선택 버튼으로 위치를 교환할 수 있습니다. 카드를 누르면 전체 사진을 확인할 수 있습니다.</p>
            </div>
            <div className="order-dropzone" aria-label="자료 이미지 순서 배열">
              {witnessOrder.map((id, index) => {
                const witness = witnesses.find((item) => item.id === id)!;
                return (
                  <article
                    key={id}
                    className={`order-card${draggedWitnessId === id ? " is-dragging" : ""}${selectedOrderCardId === id ? " is-selected" : ""}${witnessOrderSubmitted ? " is-locked" : ""}`}
                    draggable={!witnessOrderSubmitted}
                    onPointerDown={(event) => { orderPointerRef.current = { id, x: event.clientX, y: event.clientY }; }}
                    onPointerUp={(event) => handleOrderPointerUp(id, event)}
                    onClick={() => setExpandedWitnessId(id)}
                    onDragStart={(event) => {
                      if (witnessOrderSubmitted) return;
                      setDraggedWitnessId(id);
                      event.dataTransfer.setData("text/plain", id);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceId = draggedWitnessId || event.dataTransfer.getData("text/plain");
                      if (sourceId) moveWitnessOrder(sourceId, id);
                    }}
                    onDragEnd={() => setDraggedWitnessId(null)}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div style={{ backgroundImage: `url(${witness.photo})` }} role="img" aria-label={`${witness.name} 자료 이미지`} />
                    <strong>{witness.name}</strong>
                    <small>{witness.recordTitle}</small>
                    <button type="button" data-order-select="true" onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); selectOrderCard(id); }}>순서 선택</button>
                  </article>
                );
              })}
            </div>
            {witnessOrderSubmitted && (
              <div className="letter-chain" aria-label="식별 문자 연결">
                {witnessOrder.map((id, index) => {
                  const witness = witnesses.find((item) => item.id === id)!;
                  return <span key={id}>{witness.piece}{index < witnessOrder.length - 1 ? <b>+</b> : null}</span>;
                })}
              </div>
            )}
            <button className="primary-action" type="button" onClick={submitWitnessOrder} disabled={witnessOrderSubmitted}>분석 요청</button>
            <p className={`order-feedback${witnessOrderSubmitted ? " is-correct" : ""}`}>{witnessOrderFeedback}</p>
            {witnessOrderSubmitted && (
              <div className="word-report-panel">
                <div className="order-quiz-copy">
                  <span>CAMPUSDROP 분석 보고 요청</span>
                  <strong>세 기록에 공통으로 등장하는 생물을 확인하십시오.</strong>
                  <p>확인한 생물의 명칭을 영문으로 보고하십시오.</p>
                </div>
                <label className="word-submit">
                  <span>생물 명칭 보고</span>
                  <input value={witnessAnswer} onChange={(event) => setWitnessAnswer(event.target.value)} placeholder="영문 정답 입력" aria-label="생물 명칭 보고" />
                </label>
                <button className="primary-action" type="button" onClick={submitWitnessAnswer} disabled={witnessAnswerSubmitted}>보고 제출</button>
                <p className={`order-feedback${witnessAnswerSubmitted ? " is-correct" : ""}`}>{witnessAnswerFeedback}</p>
              </div>
            )}
          </div>

          <div className={`conclusion witness-conclusion${witnessSolved ? " is-open" : ""}`} aria-live="polite">
            <span>{witnessSolved ? "조사 결과 갱신" : "운영본부 분석 대기"}</span>
            <strong>{witnessSolved ? "해당 개체가 최근에 처음 나타난 것은 아닐 가능성이 있습니다." : "자료 이미지를 오래된 순서대로 배열하세요."}</strong>
            <p>{witnessSolved ? "분석 결과가 등록되었습니다. 확인된 생물: GIRAFFE. 세 기록은 서로 다른 시기에 작성되었고, 작성자 사이의 직접적인 연관성은 확인되지 않습니다. 그러나 모든 기록에는 시계탑 상부에 나타난 긴 목의 기린이 묘사되어 있습니다." : "배열이 확인되기 전에는 생물명 보고 입력창이 열리지 않습니다."}</p>
            {witnessSolved && <button className="primary-action" type="button" onClick={() => openDropLinkBriefing("chapter3")}>3장 기록 재분석 시작</button>}
          </div>
        </section>
      )}

      {scene === "imagination" && (
        <section className="screen imagination-screen">
          <div className="mission-copy">
            <p>3장</p>
            <h2>나만의 상상</h2>
            <span>2장에서 확보한 세 기록을 시간순으로 다시 비교합니다. CAMPUSDROP은 아직 차이를 특정하지 못했습니다.</span>
          </div>

          <div className="order-quiz-panel imagination-panel">
            <div className="order-quiz-copy">
              <span>CAMPUSDROP 증거 분석 지시</span>
              <strong>획득한 세 건의 증거물을 시간순으로 비교하십시오.</strong>
              <p>기록 속 개체의 외형에서 달라진 점이나 특별한 특징이 발견된다면, 해당 요소를 영문으로 보고하십시오.</p>
            </div>
            <div className={`imagination-record-grid${starSolved ? " is-solved" : ""}`} aria-label="시간순 기록 비교">
              {chapterThreeRecords.map((record, index) => (
                <button key={record.id} type="button" className="imagination-record-card" onClick={() => setChapterThreePreviewIndex(index)}>
                  <span>{record.name}</span>
                  <div style={{ backgroundImage: `url(${record.photo})` }} role="img" aria-label={record.recordTitle} />
                  <strong>{record.recordTitle}</strong>
                </button>
              ))}
            </div>
            <label className="word-submit">
              <span>특징 보고</span>
              <input value={starAnswer} onChange={(event) => setStarAnswer(event.target.value)} placeholder="영문 정답 입력" aria-label="특징 보고" disabled={starSolved} />
            </label>
            <button className="primary-action" type="button" onClick={submitStarAnswer} disabled={starSolved}>분석 보고 제출</button>
            <p className={`order-feedback${starSolved ? " is-correct" : ""}`}>{starFeedback}</p>
          </div>

          {starSolved && (
            <div className="order-quiz-panel restore-panel">
              <div className="order-quiz-copy">
                <span>CAMPUSDROP 기록 복원</span>
                <strong>증거물 01의 미복원 페이지를 복원하십시오.</strong>
                <p>화면을 문질러 훼손된 표면을 제거하세요. 조작이 어려우면 대체 복원 버튼을 사용할 수 있습니다.</p>
              </div>
              <div
                ref={restoreBoardRef}
                className={`restore-board${restoreSolved ? " is-restored" : ""}`}
                onPointerDown={(event) => markRestorePoint(event.clientX, event.clientY)}
                onPointerMove={handleRestorePointer}
              >
                <div className="restore-page-image" role="img" aria-label="복원된 학생수첩 다음 장" />
                <div className="restore-note-text" aria-hidden={!restoreSolved}>
                  <p>공강이라 잔디밭에 누워서 탑을 보고 있었다.</p>
                  <p>저 위로 기린 한 마리가 빼꼼 올라오면 재밌겠다는 생각이 들었다.</p>
                  <p className="english-line">Everything you can <mark>imagine</mark> is real.</p>
                </div>
                {!restoreSolved && <div className="restore-damage-layer" style={{ opacity: Math.max(0.18, 0.9 - restoreProgress / 100) }} aria-hidden="true" />}
              </div>
              <div className="transmission-progress restore-progress" aria-label={`복원 진행률 ${restoreProgress}%`}>
                <i style={{ width: `${restoreProgress}%` }} />
                <strong>{restoreProgress}%</strong>
              </div>
              {!restoreSolved && <button className="secondary-action" type="button" onClick={completeRestoreByAdmin}>대체 복원 버튼</button>}
            </div>
          )}

          {restoreSolved && (
            <div className="order-quiz-panel word-report-panel">
              <div className="order-quiz-copy">
                <span>CAMPUSDROP 기록 복원 지시</span>
                <strong>복원된 페이지에서 강조된 단어를 확인하십시오.</strong>
                <p>해당 단어를 영문으로 입력하십시오.</p>
              </div>
              <label className="word-submit">
                <span>강조 단어 입력</span>
                <input value={imagineAnswer} onChange={(event) => setImagineAnswer(event.target.value)} placeholder="영문 정답 입력" aria-label="강조 단어 입력" disabled={imagineSolved} />
              </label>
              <button className="primary-action" type="button" onClick={submitImagineAnswer} disabled={imagineSolved}>복원 결과 제출</button>
              <p className={`order-feedback${imagineSolved ? " is-correct" : ""}`}>{imagineFeedback}</p>
            </div>
          )}

          <div className={`conclusion witness-conclusion${imagineSolved ? " is-open" : ""}`} aria-live="polite">
            <span>{imagineSolved ? "3장 조사 완료" : "분석 대기"}</span>
            <strong>{imagineSolved ? "상상과 이후 기록 사이의 관계는 확정되지 않았습니다." : "정답 입력 전에는 3장을 완료할 수 없습니다."}</strong>
            <p>{imagineSolved ? imaginationResults.join(" ") : "CAMPUSDROP은 아직 기린의 발생 원리를 확정하지 않았습니다."}</p>
            {imagineSolved && <button className="primary-action" type="button" onClick={() => openDropLinkBriefing("chapter4")}>4장 비어 있는 기록 확인</button>}
          </div>
        </section>
      )}

      {scene === "emptyRecord" && (
        <section className="screen empty-record-screen">
          <div className="mission-copy">
            <p>4장</p>
            <h2>비어 있는 기록</h2>
            <span>원본 기록을 다시 불러오는 동안 개체로 분류된 영역에서만 정보 손실이 발생했습니다.</span>
          </div>

          <div className="order-quiz-panel empty-status-panel">
            <div className="order-quiz-copy">
              <span>CAMPUSDROP 증거물 상태 변화 감지</span>
              <strong>현재 기록이 최초 확보본과 일치하지 않습니다.</strong>
              <p>배경과 문자 정보에는 변화가 없습니다. 개체로 분류된 영역에서만 정보 손실이 확인됩니다. 원인은 확인되지 않았습니다.</p>
            </div>
            <div className="transmission-progress restore-progress" aria-label={`자동 복원 진행률 ${emptyAutoProgress}%`}>
              <i style={{ width: `${emptyAutoProgress}%` }} />
              <strong>{emptyAutoProgress}%</strong>
            </div>
            {emptyAutoProgress >= 100 && <p className="order-feedback">[DROPLINK] 배경 정보 복원 완료. 문자 정보 복원 완료. 개체 정보 복원 실패. 개체 영역의 원본 데이터를 확인할 수 없습니다.</p>}
          </div>

          <div className="order-quiz-panel empty-manual-panel">
            <div className="order-quiz-copy">
              <span>CAMPUSDROP 수동 복원 지시</span>
              <strong>최초 분석 당시 개체가 존재했던 영역을 지정하십시오.</strong>
              <p>기린이 사라진 기록을 한 장씩 확인하고, 기억나는 위치를 터치하세요.</p>
            </div>
            <div className="empty-record-tabs" aria-label="비어 있는 기록 선택">
              {chapterThreeRecords.map((record) => (
                <button key={record.id} type="button" className={activeEmptyRecordId === record.id ? "is-active" : ""} onClick={() => setActiveEmptyRecordId(record.id)}>{record.name}</button>
              ))}
            </div>
            {chapterThreeRecords.map((record) => {
              const mask = emptyRecordMasks[record.id];
              const isActive = activeEmptyRecordId === record.id;
              const isHit = emptyRecordHits[record.id];
              return (
                <button
                  key={record.id}
                  type="button"
                  className={`empty-record-card${isActive ? " is-active" : ""}${isHit ? " is-restored" : ""}${emptyRecordComplete ? " is-unstable" : ""}`}
                  onPointerDown={(event) => handleEmptyRecordPoint(record.id, event)}
                  hidden={!isActive}
                >
                  <span>{record.recordTitle}</span>
                  <div className="empty-record-image" style={{ backgroundImage: `url(${record.emptyPhoto})` }}>
                    <span className="empty-original-layer" style={{ backgroundImage: `url(${record.photo})` }} />
                    <i className="empty-loss-mask" style={{ left: `${mask.x}%`, top: `${mask.y}%`, width: `${mask.width}%`, height: `${mask.height}%` }} />
                    <b className="empty-ghost-signal" style={{ left: `${mask.x}%`, top: `${mask.y}%`, width: `${mask.width}%`, height: `${mask.height}%` }} />
                  </div>
                  <strong>{isHit ? "개체 영역 재생성" : "개체 정보 손실"}</strong>
                </button>
              );
            })}
            <p className={`order-feedback${emptyRecordComplete ? " is-correct" : ""}`}>{emptyRecordFeedback}</p>
          </div>

          <div className={`conclusion witness-conclusion${emptyRecordComplete ? " is-open" : ""}`} aria-live="polite">
            <span>{emptyRecordComplete ? "개체 안정성 경고" : "수동 복원 대기"}</span>
            <strong>{emptyRecordComplete ? "개체 정보가 다시 감소하고 있습니다." : "세 기록에서 기린이 있던 위치를 지정해야 합니다."}</strong>
            <p>{emptyRecordComplete ? emptyRecordResults.join(" ") : "[운영본부] 파일 저장 과정에서 발생한 오류일 가능성이 있습니다."}</p>
            {emptyRecordComplete && <button className="primary-action" type="button" onClick={() => openDropLinkBriefing("chapter5")}>5장 잔류 신호 추적</button>}
          </div>
        </section>
      )}

      {scene === "firstContact" && (
        <section className={`screen first-contact-screen${finalScanMatched ? " is-matched" : ""}${observationSubmitted ? " is-recorded" : ""}`}>
          <div className="mission-copy">
            <p>5장</p>
            <h2>최초의 대화</h2>
            <span>잔류 패턴이 시계탑 인근의 등록되지 않은 이미지와 연결됩니다.</span>
          </div>

          <div className="final-signal-panel">
            <div className="order-quiz-copy">
              <span>CAMPUSDROP 미확인 패턴 감지</span>
              <strong>등록되지 않은 이미지를 찾아 조사하십시오.</strong>
              {finalSignalBriefings.map((line) => <p key={line}>{line}</p>)}
            </div>
            <div className="signal-fragment" aria-label="특별 이미지 조각">
              <i />
              <span>잔류 패턴 조각</span>
              <strong>노란 곡선 / 검은 여백 / 별빛 잡음</strong>
            </div>
            <div className="signal-route">
              <span>조사 구역</span>
              <strong>시계탑 인근 숨겨진 포스터</strong>
              <p>정확한 좌표보다 현장 관찰이 중요합니다. 조각과 같은 이미지를 찾으세요.</p>
            </div>
          </div>

          <div className="final-camera-panel">
            <div className="final-camera-view">
              {!finalScanMatched && <video ref={videoRef} className="camera-video" muted playsInline />}
              {!finalScanStarted && <div className="camera-placeholder">CAMPUSDROP 카메라 대기</div>}
              {finalScanStarted && !finalScanMatched && (
                <div className="poster-lock-ui">
                  <span>이미지 안정화</span>
                  <i style={{ width: `${finalScanProgress}%` }} />
                  <strong>{finalScanProgress}%</strong>
                </div>
              )}
              {finalScanMatched && (
                <div className="giraffe-ar-stage" aria-label="3D 기린 등장 연출">
                  <div className="summon-particles" />
                  <div className="final-giraffe-model">
                    <i className="giraffe-horn one" />
                    <i className="giraffe-horn two" />
                    <i className="giraffe-ear left" />
                    <i className="giraffe-ear right" />
                    <i className="giraffe-head" />
                    <i className="giraffe-neck" />
                    <i className="giraffe-star" />
                    <i className="giraffe-body" />
                  </div>
                  <div className="analysis-error">[DROPLINK] 등록되지 않은 개체 정보가 카메라 화면에 표시되고 있습니다. 3D 데이터의 생성 경로를 확인할 수 없습니다.</div>
                </div>
              )}
            </div>
            <p className={`order-feedback${finalScanMatched ? " is-correct" : ""}`}>{finalScanStatus}</p>
            <div className="final-scan-actions">
              <button className="primary-action" type="button" onClick={() => startFinalPosterScan()} disabled={finalScanStarted && !finalScanMatched}>DROPLINK 카메라로 조사</button>
              <button className="secondary-action" type="button" onClick={() => startFinalPosterScan({ adminOverride: true })}>관리자 권한으로 이미지 일치</button>
            </div>
          </div>

          {finalScanMatched && (
            <div className="giraffe-dialogue-panel">
              <div className="private-channel">[미등록 통신 연결]</div>
              <div className="giraffe-speech">
                <p>{observationSubmitted ? "[DROPLINK] 신규 관측 기록이 등록되었습니다. 개체 정보 안정화율: 100%. 신규 기록 등록 이후 정보 손실이 중단되었습니다. 두 현상의 상관관계는 확인되지 않았습니다. [미등록 통신] 이번 기록은 네가 남긴 거구나. 네가 떠올린 모습도 마음에 들어. 이제 네가 남긴 기록 속에도 내가 있을 수 있어." : activeGiraffeQuestion ? giraffeQuestions.find((question) => question.key === activeGiraffeQuestion)?.answer : "[미등록 통신] 이제야 나를 직접 보고 있네."}</p>
              </div>
              <div className="giraffe-question-grid">
                {giraffeQuestions.map((question) => (
                  <button key={question.key} type="button" className={answeredGiraffeQuestions[question.key] ? "is-answered" : ""} onClick={() => answerGiraffeQuestion(question.key)}>{question.label}</button>
                ))}
              </div>

              <div className={`observation-record${allGiraffeQuestionsAnswered ? " is-open" : ""}`}>
                <span>DROPLINK 개인 관측 기록</span>
                <strong>지금 보고 있는 개체를 한 문장으로 기록하십시오.</strong>
                <textarea value={observationText} onChange={(event) => setObservationText(event.target.value)} placeholder="예: 아무도 보지 않을 때 별을 빛내는 기린" rows={3} />
                <button className="primary-action" type="button" onClick={submitObservationRecord} disabled={!allGiraffeQuestionsAnswered || observationText.trim().length < 6 || observationSubmitted}>신규 관측 기록 등록</button>
              </div>
            </div>
          )}

          {observationSubmitted && (
            <div className="final-ending-panel">
              <div className="ending-report official">
                <span>운영본부 공식 기록</span>
                <strong>사건 코드: CD-SJ-01</strong>
                <p>시계탑 인근 미확인 기록 조사 완료. 기록 변화 원인 미확인. 현장 조사 종료.</p>
              </div>
              <div className="ending-report personal">
                <span>DROPLINK 개인 기록</span>
                <strong>미등록 개체와 최초 통신에 성공했습니다.</strong>
                <p>“{observationText.trim()}”</p>
                <em>탐사원이 작성한 신규 관측 기록이 저장되었습니다. 비공개 연결이 형성되었습니다.</em>
              </div>
              <div className="last-choice">
                <p>다음에도 나를 찾아줄래?</p>
                <button type="button" className={finalResponse === "return" ? "is-selected" : ""} onClick={() => setFinalResponse("return")}>다시 찾아올게.</button>
                <button type="button" className={finalResponse === "crew" ? "is-selected" : ""} onClick={() => setFinalResponse("crew")}>계속 기억할게.</button>
              </div>
              {finalResponse && (
                <div className="app-transfer-panel">
                  <strong>이번 조사 기록을 이어가시겠습니까?</strong>
                  <p>CAMPUSDROP 앱에서는 공통 관심사를 가진 다른 탐사원과 탐사대를 구성하고 새로운 사건을 함께 조사할 수 있습니다.</p>
                  <button className="primary-action" type="button">앱에서 탐사대 찾기</button>
                  <button className="secondary-action" type="button">웹 조사 기록 확인하기</button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {expandedWitnessId && (() => {
        const witness = witnesses.find((item) => item.id === expandedWitnessId);
        if (!witness) return null;
        return (
          <div className="witness-acquisition-modal evidence-preview-modal" role="dialog" aria-modal="true" aria-label="기록 이미지 확대">
            <div className="witness-acquisition-card evidence-preview-card">
              <span>{witness.name}</span>
              <strong>{witness.recordTitle}</strong>
              <div className="witness-acquisition-photo evidence-preview-photo" style={{ backgroundImage: `url(${witness.photo})` }} role="img" aria-label={`${witness.name} 확대 이미지`} />
              <p>이미지 속 기록 방식과 식별 문자를 확인하세요.</p>
              <button className="primary-action" type="button" onClick={() => setExpandedWitnessId(null)}>닫기</button>
            </div>
          </div>
        );
      })()}

      {chapterThreePreviewIndex !== null && (() => {
        const record = chapterThreeRecords[chapterThreePreviewIndex];
        return (
          <div className="witness-acquisition-modal evidence-preview-modal" role="dialog" aria-modal="true" aria-label="3장 기록 이미지 확대">
            <div className="witness-acquisition-card evidence-preview-card">
              <span>{record.name}</span>
              <strong>{record.recordTitle}</strong>
              <div className={`witness-acquisition-photo evidence-preview-photo${starSolved && record.id !== "C" ? " star-analysis" : ""}`} style={{ backgroundImage: `url(${record.photo})` }} role="img" aria-label={`${record.name} 확대 이미지`} />
              <div className="preview-nav">
                <button type="button" onClick={() => setChapterThreePreviewIndex((chapterThreePreviewIndex + chapterThreeRecords.length - 1) % chapterThreeRecords.length)}>이전</button>
                <button type="button" onClick={() => setChapterThreePreviewIndex((chapterThreePreviewIndex + 1) % chapterThreeRecords.length)}>다음</button>
              </div>
              <p>{starSolved ? (record.id === "C" ? "증거물 01에서는 동일한 특징이 확인되지 않습니다." : "정답 보고 이후 분석 강조가 활성화되었습니다.") : "세 이미지를 직접 비교해 달라진 특징을 찾으세요."}</p>
              <button className="primary-action" type="button" onClick={() => setChapterThreePreviewIndex(null)}>닫기</button>
            </div>
          </div>
        );
      })()}

      {acquiredWitnessId && (() => {
        const witness = witnesses.find((item) => item.id === acquiredWitnessId);
        if (!witness) return null;
        return (
          <div className="witness-acquisition-modal" role="dialog" aria-modal="true" aria-label="자료 이미지 획득">
            <div className="witness-acquisition-card">
              <span>Evidence Acquired</span>
              <strong>{witness.name} 자료 이미지 획득</strong>
              <div className="witness-acquisition-photo" style={{ backgroundImage: `url(${witness.photo})` }} role="img" aria-label={`${witness.name} 자료 이미지`} />
              <p>목표 지점 반경 10m 안에서 자료 이미지를 확보했습니다. 이미지는 2장 분석 카드에 저장됩니다.</p>
              <button className="primary-action" type="button" onClick={closeWitnessAcquisition}>{allWitnessImagesAcquired ? "자료 확인 완료 · 배열 지시 수신" : "자료 확인 완료"}</button>
            </div>
          </div>
        );
      })()}


      {dropLinkNoticeOpen && (
        <button className="unknown-message is-visible drop-link-global-notice" type="button" onClick={openDropLinkModalFromNotice}>
          <div className="talk-notice-head"><span>DROP LINK</span><em>지금</em></div>
          <div className="talk-notice-body"><span className="talk-drop-core" aria-hidden="true">DROP</span><div><b>CAMPUS DROP 운영본부</b><strong>{dropLinkMode === "clue" ? "증거물 분석 결과가 도착했습니다." : dropLinkMode === "arrange" ? "기록 배열 지시가 도착했습니다." : dropLinkMode === "chapter3" ? "추가 분석 지시가 도착했습니다." : dropLinkMode === "chapter4" ? "증거물 상태 변화가 감지됐습니다." : "잔류 패턴 추적 지시가 도착했습니다."}</strong><small>탭해서 DROPLINK 열기</small></div></div>
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
                {dropLinkLine < getActiveDropLinkBriefings(dropLinkMode).length - 1 ? "다음" : dropLinkMode === "case" ? "사건 개요 수신" : dropLinkMode === "clue" ? "2장으로 이동" : dropLinkMode === "arrange" ? "배열 미션 시작" : dropLinkMode === "chapter3" ? "3장 시작" : dropLinkMode === "chapter4" ? "4장 시작" : "5장 시작"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


function WitnessMap({
  userLocation,
  activeWitnessId,
  visitedWitnesses,
  onSelectWitness,
}: {
  userLocation: Coordinate | null;
  activeWitnessId: string;
  visitedWitnesses: Record<string, boolean>;
  onSelectWitness: (id: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const kakaoMapRef = useRef<KakaoMap | null>(null);
  const userOverlayRef = useRef<{ setMap: (map: KakaoMap) => void; setPosition?: (position: KakaoLatLng) => void } | null>(null);
  const witnessMarkerRefs = useRef<Record<string, HTMLElement>>({});
  const onSelectWitnessRef = useRef(onSelectWitness);
  const [mapState, setMapState] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    onSelectWitnessRef.current = onSelectWitness;
  }, [onSelectWitness]);

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("kakaoKey") || DEFAULT_KAKAO_JAVASCRIPT_KEY;
    if (!key || !mapRef.current) {
      setMapState("fallback");
      return;
    }

    let cancelled = false;
    const renderMap = () => {
      if (cancelled || !mapRef.current || !window.kakao?.maps) return;
      const center = new window.kakao.maps.LatLng(towerTarget.lat, towerTarget.lng);
      const map = new window.kakao.maps.Map(mapRef.current, { center, level: 3 });
      kakaoMapRef.current = map;
      witnessMarkerRefs.current = {};
      witnesses.forEach((witness) => {
        const position = new window.kakao.maps.LatLng(witness.location.lat, witness.location.lng);
        const marker = document.createElement("button");
        marker.type = "button";
        marker.className = "witness-map-marker";
        marker.textContent = witness.id;
        marker.setAttribute("aria-label", `${witness.name} 위치`);
        marker.addEventListener("click", () => onSelectWitnessRef.current(witness.id));
        witnessMarkerRefs.current[witness.id] = marker;
        new window.kakao.maps.CustomOverlay({ position, content: marker, xAnchor: 0.5, yAnchor: 0.5 }).setMap(map);
      });
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

  useEffect(() => {
    witnesses.forEach((witness) => {
      const marker = witnessMarkerRefs.current[witness.id];
      if (!marker) return;
      marker.className = `witness-map-marker${activeWitnessId === witness.id ? " is-active" : ""}${visitedWitnesses[witness.id] ? " is-visited" : ""}`;
    });
  }, [activeWitnessId, visitedWitnesses]);

  useEffect(() => {
    if (!userLocation || !kakaoMapRef.current || !window.kakao?.maps) return;
    const position = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    if (!userOverlayRef.current) {
      const marker = document.createElement("div");
      marker.className = "user-location-marker";
      marker.innerHTML = "<i></i><b></b>";
      userOverlayRef.current = new window.kakao.maps.CustomOverlay({ position, content: marker, xAnchor: 0.5, yAnchor: 0.5 });
      userOverlayRef.current.setMap(kakaoMapRef.current);
      return;
    }
    userOverlayRef.current.setPosition?.(position);
  }, [userLocation, mapState]);

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
      {mapState === "loading" && <p className="map-loading">지도 불러오는 중...</p>}
      {mapState === "fallback" && <p className="map-loading">Kakao 키가 없으면 좌표 고정 마커를 표시할 수 없습니다</p>}
    </div>
  );
}

function MissionMap({ userLocation }: { userLocation: Coordinate | null }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const kakaoMapRef = useRef<KakaoMap | null>(null);
  const userOverlayRef = useRef<{ setMap: (map: KakaoMap) => void; setPosition?: (position: KakaoLatLng) => void } | null>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("kakaoKey") || DEFAULT_KAKAO_JAVASCRIPT_KEY;
    if (!key || !mapRef.current) {
      setMapState("fallback");
      return;
    }

    let cancelled = false;
    const renderMap = () => {
      if (cancelled || !mapRef.current || !window.kakao?.maps) return;
      const center = new window.kakao.maps.LatLng(missionTarget.lat, missionTarget.lng);
      const map = new window.kakao.maps.Map(mapRef.current, { center, level: 3 });
      kakaoMapRef.current = map;
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

  useEffect(() => {
    if (!userLocation || !kakaoMapRef.current || !window.kakao?.maps) return;
    const position = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    if (!userOverlayRef.current) {
      const marker = document.createElement("div");
      marker.className = "user-location-marker";
      marker.innerHTML = "<i></i><b></b>";
      userOverlayRef.current = new window.kakao.maps.CustomOverlay({ position, content: marker, xAnchor: 0.5, yAnchor: 0.5 });
      userOverlayRef.current.setMap(kakaoMapRef.current);
      return;
    }
    userOverlayRef.current.setPosition?.(position);
  }, [userLocation, mapState]);


  const fallbackSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${missionMapBounds.lngMin}%2C${missionMapBounds.latMin}%2C${missionMapBounds.lngMax}%2C${missionMapBounds.latMax}&layer=mapnik`;

  return (
    <div className="real-map-shell">
      {mapState === "fallback" ? (
        <iframe className="real-map-frame" title="농동로 209 잔디밭 지도" src={fallbackSrc} loading="lazy" />
      ) : (
        <div ref={mapRef} className="real-map-canvas" aria-label="농동로 209 잔디밭 실제 지도" />
      )}
      <div className="map-target-panel">
        <span>조사 지점</span>
        <strong>농동로 209 잔디밭</strong>
      </div>
      {mapState === "loading" && <p className="map-loading">지도 불러오는 중...</p>}
      {mapState === "fallback" && <p className="map-loading">Kakao 키가 없으면 좌표 고정 마커를 표시할 수 없습니다</p>}
    </div>
  );
}


