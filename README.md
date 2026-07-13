# Palzzi (팔찌) - 쿠미히모 브레이딩 플랫폼

**Palzzi(팔찌)**는 전통 실공예 중 하나인 **쿠미히모(Kumihimo)** 브레이딩 과정을 웹 상에서 시각적으로 정밀하게 시뮬레이션하고 플레이백하며 나만의 패턴을 제작·공유할 수 있는 모던 인터랙티브 웹 플랫폼입니다.

수학적으로 완벽히 검증된 직조 엔진 레이어와 미려하게 정렬된 UI 레이어를 디커플링하여 설계함으로써, 최상의 비주얼 퀄리티와 부드러운 하이라이트 애니메이션 가이드를 탑재한 MVP 제품입니다.

---

## ✨ 핵심 기능 (Key Features)

1. **다양한 가닥수 템플릿 지원 (4, 6, 8, 12, 16, 20, 24, 28, 32줄)**
   - 짝수 가닥의 줄 수에 맞게 원형 디스크 슬롯 초기 배치와 결과물 시뮬레이션을 자동으로 역산하여 꼬임 결과를 출력합니다.
2. **듀얼 실시간 뷰어 (Dual Rendering View)**
   - **3D 브레이드 뷰어 (Three.js):** Kajiya-Kay anisotropic 셰이더로 렌더링된 실시간 3D 브레이드 미리보기. OrbitControls로 회전/줌 가능.
   - **기호 도안 차트 뷰 (Pattern Chart View):** 실의 교차 역사를 도안 기호 격자로 시각화하며, 현재 실행 중인 스텝에 활성 하이라이트 라인을 그립니다.
3. **직관적인 인터랙티브 가이드 및 드래그 앤 드롭**
   - 현재 단계에서 엮어야 하는 실(Top-Right, Bottom-Left)의 이동 경로를 디스크 위에 애니메이션 점선 화살표로 직관적으로 가이드합니다.
   - 마우스 드래그 또는 모바일 터치 드래그를 통해 실을 잡아 원하는 슬롯에 드롭함으로써 실제 손으로 땋는 듯한 손맛을 제공합니다.
4. **플레이백 제어 대시보드 (Playback Controller)**
   - 처음으로(`⏮`), 이전 단계(`◀`), 재생/일시정지(`▶/⏸`), 다음 단계(`▶`), 끝으로(`⏭`) 플레이어 기능 완비.
   - 0.5x, 1.0x, 2.0x, 5.0x 자동 재생 배속 제어 기능 및 실시간 드래그 슬라이더 진행 바 제공.
5. **색상 커스터마이저 및 프리셋**
   - 디스크 위 실 노드를 직접 클릭하거나 좌측 패널의 실 카드를 클릭하여 개별 실의 색상을 바꿀 수 있으며, 프리셋 컬러 및 미세 Hex 입력 피커를 연동했습니다.
6. **갤러리 및 패턴 관리**
   - **패턴 저장:** 시뮬레이션 결과를 Firebase Firestore에 저장. 3D 스냅샷이 자동 생성됩니다.
   - **패턴 갤러리:** 저장된 패턴을 갤러리 페이지(`/`) 및 시뮬레이터 사이드바에서 탐색. 좋아요, 정렬(최신순/좋아요순/내 좋아요순) 지원.
   - **좋아요:** 인증 사용자는 Firestore 트랜잭션으로 영구 저장. 비로그인 사용자도 세션당 1회 제한으로 좋아요 가능 (Firestore 카운트 반영).
7. **강력한 데이터 관리 및 내보내기/공유**
   - **로컬 저장:** 브라우저 `localStorage`를 활용하여 실시간 진행 상태 및 색상을 저장하고 언제든 불러와 이어서 제작합니다.
   - **JSON 백업:** 전체 템플릿 세팅 및 직조 진행 상태를 표준 JSON 파일로 다운로드하고 다시 복원합니다.
   - **고해상도 PNG 내보내기:** 전체 도안 차트와 가상 완성본 끈 이미지를 해상도 깨짐 없는 고해상도 PNG 이미지 파일로 즉시 다운로드합니다.
   - **단축 URL 공유:** `/s?t=...&c=<base64url>&s=...&k=...` 형식의 짧은 공유 URL 생성. 색상값은 base64url로 압축 (8색 기준 약 24자).
   - **소셜 미디어 미리보기 (OG):** 공유 URL(`/og/{docId}`)은 Cloudflare Pages Function이 동적 OG 태그를 생성하여 WhatsApp 등에서 패턴 스냅샷 이미지를 미리보기로 표시.

---

## 📂 프로젝트 구조 (Directory Structure)

```bash
palzzi/
├── package.json              # 프로젝트 메타데이터 및 스크립트 설정
├── vite.config.js            # Vite 멀티페이지 빌드 설정 (simulator, gallery, admin)
├── firebase.json             # Firestore 규칙 + Hosting + Functions 설정
├── firestore.rules           # Firestore 보안 규칙 (patterns, likes, userLikes)
├── index.html                # 갤러리 페이지 (패턴 탐색, 좋아요)
├── simulator.html            # 시뮬레이터 페이지 (메인 앱)
├── admin.html                # 관리자 페이지
├── style.css                 # 시뮬레이터 반응형 CSS
├── gallery-style.css         # 갤러리 페이지 CSS
├── doc/                      # 기획, 사양 및 설계 기술 문서
├── functions/
│   ├── package.json          # Firebase Functions 의존성
│   └── index.js              # Cloud Functions: 동적 OG 페이지 + 이미지 서빙
├── scripts/
│   └── generate_logo.py      # 로고/파비콘 이미지 생성
├── public/
│   ├── logo.png              # 앱 로고
│   └── palzzi_logo.png       # OG 기본 이미지
├── src/
│   ├── main.js               # 시뮬레이터: DOM 이벤트, 렌더링, 좋아요, 공유
│   ├── gallery.js            # 갤러리: 패턴 목록, 좋아요, 정렬
│   ├── i18n.js               # 한/영 다국어 번역
│   ├── braid-3d-viewer.js    # Three.js 3D 브레이드 뷰어 (Braid3DViewer 클래스)
│   ├── braid-config.js       # 3D 렌더링 설정 상수
│   ├── ads.js                # AdSense 광고 관리
│   ├── firebase/
│   │   ├── config.js         # Firebase 초기화 (Firestore, Auth)
│   │   └── auth.js           # Google 인증 헬퍼
│   ├── engine/
│   │   ├── kumihimo.js       # 32슬롯 원형 디스크 직조 수학 연산 핵심 엔진
│   │   └── kumihimo.test.js  # 안정성 보장 단위 테스트 코드 (Vitest)
│   └── templates/
│       └── templates.js      # 4~32가닥 주요 엄선 패턴 프리셋
└── dist/                     # 빌드 출력물 (Cloudflare Pages 배포)
```

---

## 🛠️ 개발 및 실행 방법 (Getting Started)

### 1. 의존성 패키지 설치
이 프로젝트는 모던 프론트엔드 환경을 위해 [Vite](https://vitejs.dev/)와 테스트용 [Vitest](https://vitest.org/)를 사용합니다. 다음 명령어로 의존성을 설치하십시오.
```bash
npm install
```

### 2. 로컬 개발 서버 실행
설치가 끝나면 다음 명령어를 통해 로컬 호스트 상에 경량 개발 서버를 구동할 수 있습니다.
```bash
npm run dev
```
*서버 실행 후 브라우저에서 제공된 로컬 주소(예: `http://localhost:5173`)로 접속하면 고화질 인터랙티브 시뮬레이터를 즉시 테스트할 수 있습니다.*

### 3. 프로덕션 빌드
최적화된 HTML/JS/CSS 세트로 컴파일합니다.
```bash
npm run build
```
*빌드 결과물은 `./dist/` 폴더에 생성됩니다. 스냅샷 이미지는 Firestore에서 Functions가 동적으로 서빙하므로 별도 파일 생성이 필요 없습니다.*

### 4. 자동 테스트 실행
Vitest를 활용하여 수학적 원형 회전 치환 알고리즘의 무오류 안정성을 체크하는 단위 테스트를 동작시킵니다.
```bash
npm test
```

---

## 🚀 배포 (Deployment)

본 프로젝트는 **Firebase** 단일 플랫폼에서 모든 서비스를 운영합니다.

| 역할 | 서비스 |
|---|---|
| 정적 호스팅 (SPA, 스냅샷 이미지) | Firebase Hosting |
| 서버사이드 함수 (동적 OG 페이지) | Firebase Functions |
| 데이터베이스 (패턴, 좋아요) | Firebase Firestore |
| 인증 (Google 로그인) | Firebase Authentication |

### 1. Firebase CLI 설치 및 로그인
```bash
npm install -g firebase-tools
firebase login
```

### 2. Functions 의존성 설치
```bash
cd functions && npm install && cd ..
```

### 3. 빌드 및 전체 배포
```bash
npm run build && firebase deploy
```
*`firebase deploy`는 Hosting, Functions, Firestore Rules를 한 번에 배포합니다.*

### 4. 개별 배포
```bash
firebase deploy --only hosting          # 호스팅만
firebase deploy --only functions        # Functions만
firebase deploy --only firestore:rules  # 보안 규칙만
```

*배포 후 `https://palzzilab.web.app`에서 서비스를 확인할 수 있습니다.*

### Blaze (Pay-as-you-go) 플랜
Firebase Functions 사용하려면 **Blaze 플랜** 활성화가 필요합니다. 무료 할당량 내에서 충분히 운영 가능합니다:
- Functions: 월 125,000 호출 / 400,000 GBs
- Firestore: 50,000 읽기/일, 20,000 쓰기/일
- Hosting: 10GB 전송/일

---

## ⚙️ 유지보수 및 확장 가이드 (Maintenance Guide)

### 새로운 패턴 프리셋 추가하기
새로운 컬러 세트나 가닥 수 템플릿을 등록하고 싶다면 `src/templates/templates.js` 안의 `KUMIHIMO_TEMPLATES` 배열에 아래 예시와 같은 형태로 항목을 추가하기만 하면 됩니다.
시스템이 자동으로 감지하여 UI 드롭다운 및 실 색상 팔레트, 도안 차트를 가변적으로 동기화합니다.

```javascript
{
  id: "kumihimo-8-custom",
  name: "8-Strand Midnight Sea (8줄 미드나잇 씨)",
  threads: 8,
  description: "밤바다의 깊은 분위기를 자아내는 네이비와 에메랄드 조합 패턴입니다.",
  defaultColors: ["#001F3F", "#0074D9", "#7FDBFF", "#39CCCC", "#001F3F", "#0074D9", "#7FDBFF", "#39CCCC"]
}
```

### 핵심 직조 엔진 알고리즘 수정
원형 디스크 슬롯 상태 및 순환 매커니즘은 `src/engine/kumihimo.js` 내의 `KumihimoDisk` 클래스가 주관합니다.
- `init(colors)`: $N$개의 실을 32개 원형 슬롯상에 $180^\circ$ 대칭 기준과 일정한 간격(`distance`)으로 균등 분할합니다.
- `weaveRow()`: 쿠미히모의 3단계 물리적 꼬임(Top Right $\rightarrow$ Bottom Right - 1, Bottom Left $\rightarrow$ Top Left - 1, 그리고 누적 디스크 오프셋 회전)을 수행하고, 교차된 실의 색상 순서 묶음을 결과 배열(`product`)에 푸시한 뒤 현재 상태를 반환합니다.
- 엔진의 로직을 손보았을 경우 반드시 `npm test`를 돌려 모든 엣지 케이스 및 가닥 수별 안정성을 재검증해야 합니다.

---

## 📜 기술 사양서 버전 정보 (PRD alignment)
본 구현체는 **Palzzi v1.2 MVP** 사양에 정의된 쿠미히모의 2D/3D 시각화, 도안 다운로드, 로컬 저장소 백업, 가이드 안내 및 드래그 인터랙티브 조작 기능을 모두 만족합니다.
갤러리, 좋아요, 단축 공유 URL, 소셜 미디어 OG 미리보기 기능이 포함되어 있습니다.
