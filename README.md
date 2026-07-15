# Campus Drop WebAR Demo

캠퍼스 포스터나 제휴 스팟 이미지를 스캔하면 AR 미션이 열리고, 미션을 클리어하면 당일 사용 쿠폰이 발급되는 흐름을 보여주는 인터랙티브 웹 데모입니다.

이 프로젝트는 출시용 MVP가 아니라 팀 내부 시연용입니다. 회원가입, 로그인, 시간표 등록, 매칭, 서버, DB는 포함하지 않습니다.

## 포함된 흐름

1. 시작 화면에서 `AR 스캔 시작`을 누릅니다.
2. 모바일 브라우저가 카메라 권한을 요청합니다.
3. 데모 마커 이미지를 화면 중앙에 맞춥니다.
4. 마커가 인식되면 카메라 화면 위에 빛나는 3D 보물상자가 나타납니다.
5. 보물상자를 탭하면 방탈출형 미션으로 이동합니다.
6. 3자리 코드 `428`을 입력하면 미션 성공 화면이 나옵니다.
7. `오늘 23:59까지` 사용할 수 있는 캠퍼스 쿠폰이 발급됩니다.

## 데모 마커 이미지

마커 파일은 다음 경로에 있습니다.

- `public/campus-drop-marker.svg`

시연할 때는 노트북, 태블릿, 다른 휴대폰 화면에 이 이미지를 크게 띄우거나 인쇄해서 사용하세요. 데모 앱 첫 화면의 `데모 마커 이미지 열기` 링크로도 확인할 수 있습니다.

현재 구현은 시연 안정성을 위해 데모 포스터 안의 고대비 색상 패턴을 카메라 프레임 중앙에서 인식합니다. GPS 기반 AR은 사용하지 않습니다.

## 로컬 실행

필요 조건:

- Node.js `>=22.13.0`

설치 및 실행:

```bash
npm install
npm run dev
```

개발 서버가 표시하는 주소로 접속합니다.

## 모바일 카메라 테스트

카메라 권한은 보통 `https://` 또는 `localhost`에서만 허용됩니다.

같은 Wi-Fi의 스마트폰에서 테스트하려면 HTTPS 터널을 사용하세요.

예시:

```bash
npm run dev
npx localtunnel --port 3000
```

또는 Cloudflare Tunnel, ngrok, Vercel Preview, Cloudflare Pages 같은 HTTPS 배포/프리뷰 주소를 사용해도 됩니다.

## 배포 방법

빌드 확인:

```bash
npm run build
```

배포는 Vercel, Cloudflare Pages, 또는 Sites 배포 환경에 올릴 수 있습니다. 배포 후에는 스마트폰에서 HTTPS 주소로 접속해 카메라 권한을 허용하면 됩니다.

## GitHub Pages

GitHub Pages용 정적 데모는 `gh-pages/` 폴더에 있습니다. `main` 브랜치에 push하면 `.github/workflows/pages.yml`이 실행되어 다음 주소로 배포됩니다.

- `https://campusdrop.github.io/campusdrop_v2_prototype/`

Pages 버전도 같은 사용자 흐름을 제공합니다. 첫 화면에서 `데모 마커 이미지 열기`를 눌러 마커를 다른 화면에 띄우거나 인쇄한 뒤, 스마트폰으로 `AR 스캔 시작`을 눌러 시연하세요.

## AR 라이브러리 구조

현재 데모는 다음 구조로 동작합니다.

- 카메라: `navigator.mediaDevices.getUserMedia`
- 이미지 마커 감지: 중앙 프레임의 데모 포스터 색상 패턴 인식
- AR 오브젝트: Three.js로 렌더링한 회전/발광 보물상자
- 앱 흐름: React 상태 전환

실서비스에 가까운 이미지 트래킹으로 확장하려면 MindAR를 붙이면 됩니다.

1. 마커 후보 이미지를 `public/markers/source.png`처럼 준비합니다.
2. MindAR Image Compiler에서 `.mind` 파일을 생성합니다.
   - 웹 컴파일러: `https://hiukim.github.io/mind-ar-js-doc/tools/compile`
   - 또는 `mind-ar` 패키지의 compiler 도구 사용
3. 생성한 파일을 `public/markers/campus-drop.mind`로 저장합니다.
4. 스캔 화면에서 현재 색상 패턴 감지 로직을 MindAR의 `MindARThree` 초기화 코드로 교체합니다.
5. `anchor.group`에 Three.js 보물상자 그룹을 붙이면 이미지 위에 오브젝트가 고정됩니다.

MindAR 예시 흐름:

```ts
const mindarThree = new MindARThree({
  container: scanContainer,
  imageTargetSrc: "/markers/campus-drop.mind",
});
const { renderer, scene, camera } = mindarThree;
const anchor = mindarThree.addAnchor(0);
anchor.group.add(treasureChestGroup);
await mindarThree.start();
renderer.setAnimationLoop(() => renderer.render(scene, camera));
```

## 시연 팁

- 마커 이미지는 화면 밝기를 높이고 정면으로 비추면 더 빨리 인식됩니다.
- 첫 시연은 데스크톱에 마커를 띄우고 스마트폰으로 배포 주소에 접속하는 방식이 가장 편합니다.
- 미션 정답은 `428`입니다.
