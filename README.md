# Campus Drop WebAR Demo

캠퍼스 안내판 같은 실제 기물을 스캔하면 AR 미션이 열리고, 미션을 클리어하면 당일 사용 쿠폰이 발급되는 흐름을 보여주는 인터랙티브 웹 데모입니다.

이 프로젝트는 출시용 MVP가 아니라 팀 내부 시연용입니다. 회원가입, 로그인, 시간표 등록, 매칭, 서버, DB는 포함하지 않습니다.

## 포함된 흐름

1. 하단 `Map` 탭에서 캠퍼스 지도와 크루 위치를 확인합니다.
2. `AR 스캔 시작`을 누릅니다.
3. 모바일 브라우저가 카메라 권한을 요청합니다.
4. 세종대 지도 안내판 기물 또는 전용 포스터를 화면 중앙에 맞춥니다.
5. 대상이 인식되면 카메라 화면 위에 3D 기린과 게임식 대사창이 나타납니다.
6. 기린을 탭하면 퀘스트형 미션으로 이동합니다.
7. 3자리 코드 `428`을 입력하면 미션 성공 화면이 나옵니다.
8. `오늘 23:59까지` 사용할 수 있는 캠퍼스 쿠폰이 발급됩니다.

## 인식 대상 기물

현재 데모는 두 가지 대상을 인식합니다.

- `public/sejong-map-fixture.jpeg`
- `public/campus-drop-marker.svg`

실제 시연에서는 세종대 지도 안내판 앞에서 스마트폰 카메라를 켜고, 밝은 지도 영역이 화면 중앙 프레임 안에 들어오도록 비추면 됩니다. 전용 포스터를 사용할 때는 다른 화면에 포스터 이미지를 띄우거나 인쇄해서 비추면 됩니다.

현재 구현은 시연 안정성을 위해 안내판의 밝은 지도 패널, 청록색 지도 영역, 분홍 번호점 조합을 인식하고, 전용 포스터의 초록/노랑 고대비 표식도 함께 인식합니다. GPS 기반 AR은 사용하지 않습니다.

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

Pages 버전도 같은 사용자 흐름을 제공합니다. 스마트폰으로 접속한 뒤 `AR 스캔 시작`을 누르고 세종대 지도 안내판 기물이나 전용 포스터를 비추면 됩니다.

## Kakao 지도 테스트

`Map` 탭은 Kakao Maps JavaScript SDK를 불러와 캠퍼스 지도를 표시합니다. 지도 색감은 Kakao 지도 스타일을 바꾸는 방식이 아니라, 지도 컨테이너의 CSS `filter`로 어두운 무채색 톤을 적용합니다.

Kakao Developers에서 JavaScript 키를 만들고, 플랫폼 Web 도메인에 아래 주소를 허용해 둡니다.

```text
https://campusdrop.github.io
```

로컬에서 테스트할 때는 아래 주소도 추가합니다.

```text
http://localhost:3000
```

GitHub Pages 데모에는 기본 Kakao JavaScript 키가 설정되어 있어 아래 주소로 바로 접속하면 지도가 표시됩니다.

```text
https://campusdrop.github.io/campusdrop_v2_prototype/

현재 데모에는 기본 카카오 JavaScript 키가 설정되어 있어 별도 쿼리 없이 지도가 표시됩니다. 다른 앱 키로 테스트하려면 `?kakaoKey=YOUR_KAKAO_JAVASCRIPT_KEY`를 붙여 접속하세요.
```

## AR 라이브러리 구조

현재 데모는 다음 구조로 동작합니다.

- 카메라: `navigator.mediaDevices.getUserMedia`
- 이미지 마커 감지: 중앙 프레임의 세종대 지도 안내판 색상/패턴 또는 전용 포스터 표식 인식
- AR 오브젝트: `sejongGF.glb`를 사용한 3D 기린
- 대사창 폰트: `HakgyoansimByeolbichhaneul-B.otf`
- 앱 흐름: React 상태 전환

실서비스에 가까운 이미지 트래킹으로 확장하려면 MindAR를 붙이면 됩니다.

1. 마커 후보 이미지를 `public/markers/source.png`처럼 준비합니다.
2. MindAR Image Compiler에서 `.mind` 파일을 생성합니다.
   - 웹 컴파일러: `https://hiukim.github.io/mind-ar-js-doc/tools/compile`
   - 또는 `mind-ar` 패키지의 compiler 도구 사용
3. 생성한 파일을 `public/markers/campus-drop.mind`로 저장합니다.
4. 스캔 화면에서 현재 색상 패턴 감지 로직을 MindAR의 `MindARThree` 초기화 코드로 교체합니다.
5. `anchor.group`에 `sejongGF.glb` 모델을 붙이면 이미지 위에 기린 오브젝트가 고정됩니다.

MindAR 예시 흐름:

```ts
const mindarThree = new MindARThree({
  container: scanContainer,
  imageTargetSrc: "/markers/campus-drop.mind",
});
const { renderer, scene, camera } = mindarThree;
const anchor = mindarThree.addAnchor(0);
anchor.group.add(giraffeGroup);
await mindarThree.start();
renderer.setAnimationLoop(() => renderer.render(scene, camera));
```

## 시연 팁

- 지도 안내판의 밝은 패널과 청록색 지도 영역이 중앙 프레임 안에 들어오면 더 빨리 인식됩니다.
- 전용 포스터는 초록/노랑 표식이 프레임 중앙에 들어오면 인식됩니다.
- 밤에는 안내판 조명 반사가 심하지 않게 약간 비스듬히 서서 비추면 안정적입니다.
- 미션 정답은 `428`입니다.
