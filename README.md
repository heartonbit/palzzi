# Palzzi (팔찌) - 쿠미히모 2D 시뮬레이터

**Palzzi(팔찌)**는 전통 실공예 중 하나인 **쿠미히모(Kumihimo)** 브레이딩 과정을 웹 상에서 시각적으로 정밀하게 시뮬레이션하고 플레이백하며 나만의 패턴을 제작·공유할 수 있는 모던 인터랙티브 웹 플랫폼입니다.

수학적으로 완벽히 검증된 직조 엔진 레이어와 미려하게 정렬된 UI 레이어를 디커플링하여 설계함으로써, 최상의 비주얼 퀄리티와 부드러운 하이라이트 애니메이션 가이드를 탑재한 MVP 제품입니다.

---

## ✨ 핵심 기능 (Key Features)

1. **다양한 가닥수 템플릿 지원 (4, 6, 8, 12, 16줄)**
   - 짝수 가닥의 줄 수에 맞게 원형 디스크 슬롯 초기 배치와 결과물 시뮬레이션을 자동으로 역산하여 꼬임 결과를 출력합니다.
2. **듀얼 실시간 뷰어 (Dual Rendering View)**
   - **가상 완성본 2D 뷰 (Finished View):** 현재 단계까지 엮인 매듭의 회전 꼬임을 입체감 있는 2D 원통 구조로 펼쳐 가상으로 실시간 렌더링합니다. 양 끝의 프린지(수슬)와 그림자 그라데이션을 통해 실재감을 한껏 높였습니다.
   - **기호 도안 차트 뷰 (Pattern Chart View):** 실의 교차 역사를 도안 기호 격자로 시각화하며, 현재 실행 중인 스텝에 활성 하이라이트 라인을 그립니다.
3. **직관적인 인터랙티브 가이드 및 드래그 앤 드롭**
   - 현재 단계에서 엮어야 하는 실(Top-Right, Bottom-Left)의 이동 경로를 디스크 위에 애니메이션 점선 화살표로 직관적으로 가이드합니다.
   - 마우스 드래그 또는 모바일 터치 드래그를 통해 실을 잡아 원하는 슬롯에 드롭함으로써 실제 손으로 땋는 듯한 손맛을 제공합니다.
4. **플레이백 제어 대시보드 (Playback Controller)**
   - 처음으로(`⏮`), 이전 단계(`◀`), 재생/일시정지(`▶/⏸`), 다음 단계(`▶`), 끝으로(`⏭`) 플레이어 기능 완비.
   - 0.5x, 1.0x, 2.0x, 5.0x 자동 재생 배속 제어 기능 및 실시간 드래그 슬라이더 진행 바 제공.
5. **색상 커스터마이저 및 프리셋**
   - 디스크 위 실 노드를 직접 클릭하거나 좌측 패널의 실 카드를 클릭하여 개별 실의 색상을 바꿀 수 있으며, 프리셋 컬러 및 미세 Hex 입력 피커를 연동했습니다.
6. **강력한 데이터 관리 및 내보내기/공유**
   - **로컬 저장:** 브라우저 `localStorage`를 활용하여 실시간 진행 상태 및 색상을 저장하고 언제든 불러와 이어서 제작합니다.
   - **JSON 백업:** 전체 템플릿 세팅 및 직조 진행 상태를 표준 JSON 파일로 다운로드하고 다시 복원합니다.
   - **고해상도 PNG 내보내기:** 전체 도안 차트와 가상 완성본 끈 이미지를 해상도 깨짐 없는 고해상도 PNG 이미지 파일로 즉시 다운로드합니다.
   - **고유 URL 공유:** 현재 커스텀된 실 색상들과 스텝 상태를 인코딩한 공유 링크를 1초 만에 클립보드에 복사하여 다른 유저와 공유합니다.

---

## 📂 프로젝트 구조 (Directory Structure)

```bash
/home/mango/palzzi/
├── package.json          # 프로젝트 메타데이터 및 스크립트 설정
├── index.html            # 메인 시뮬레이터 SPA 구조 정의
├── style.css             # Apple 미니멀리즘 스타일의 완전한 반응형 CSS
├── doc/                  # 기획, 사양 및 설계 기술 문서
├── src/
│   ├── main.js           # DOM 이벤트, 애니메이션, 렌더링 및 결합 제어
│   ├── engine/
│   │   ├── kumihimo.js   # 32슬롯 원형 디스크 직조 수학 연산 핵심 엔진
│   │   └── kumihimo.test.js # 안정성 보장 단위 테스트 코드 (Vitest)
│   └── templates/
│       └── templates.js  # 4, 6, 8, 12, 16가닥 주요 엄선 패턴 프리셋
```

---

## 🛠️ 개발 및 실행 방법 (Getting Started)

### 1. 의존성 패키지 설치
이 프로젝트는 모던 프론트엔드 환경을 위해 [Vite](https://vitejs.dev/)와 테스트용 [Vitest](https://vitest.dev/)를 사용합니다. 다음 명령어로 의존성을 설치하십시오.
```bash
npm install
```

### 2. 로컬 개발 서버 실행
설치가 끝나면 다음 명령어를 통해 로컬 호스트 상에 경량 개발 서버를 구동할 수 있습니다.
```bash
npm run dev
```
*서버 실행 후 브라우저에서 제공된 로컬 주소(예: `http://localhost:5173`)로 접속하면 고화질 인터랙티브 시뮬레이터를 즉시 테스트할 수 있습니다.*

### 3. 고속 정적 빌드
프로덕션 배포가 가능한 최적화된 HTML/JS/CSS 소스 세트로 컴파일하려면 다음을 실행하십시오.
```bash
npm run build
```
*빌드 결과물은 `./dist/` 폴더 내에 초경량 정적 웹 파일로 빌드되어 나옵니다.*

### 4. 자동 테스트 실행
Vitest를 활용하여 수학적 원형 회전 치환 알고리즘의 무오류 안정성을 체크하는 단위 테스트를 동작시킵니다.
```bash
npm test
```

### 5. 로고 이미지 재생성
헤더 로고(`public/logo.png`)와 파비콘(`public/favicon.ico`)은 3가닥 브레이드 z-buffer 렌더러로 생성됩니다. 색상, 꼬임 수, 각도 등을 변경하려면 아래 스크립트를 실행합니다.
```bash
python3 scripts/generate_logo.py
```
*설정 변경은 `scripts/generate_logo.py` 상단의 `COLORS`, `TWISTS`, `TILT_ANGLE` 등을 수정한 뒤 다시 실행하면 됩니다.*

### 6. Firebase Hosting 배포 방법 (BaaS Deployment)
본 웹앱은 Firebase CLI 도구를 활용해 Google Firebase Hosting에 단 몇 초 만에 프로덕션 글로벌 배포할 수 있습니다.

1. **Firebase CLI 전역 설치**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase 계정 로그인 및 인증**:
   ```bash
   firebase login
   ```

3. **Firebase 호스팅 초기화**:
   프로젝트 루트 디렉토리에서 아래 명령어를 실행합니다:
   ```bash
   firebase init hosting
   ```
   * 초기화 대화창 가이드에 따라 아래 옵션을 정확히 매핑해 주십시오:
     * **Project Setup:** `Use an existing project` (또는 새 프로젝트 개설)
     * **What do you want to use as your public directory?:** **`dist`** (매우 중요! Vite 빌드 아웃풋 경로)
     * **Configure as a single-page app (rewrite all urls to /index.html)?:** **`Yes`** (SPA 구조 대응)
     * **Set up automatic builds and deploys with GitHub?:** `No` (선택 사항)
     * **File dist/index.html already exists. Overwrite?:** **`No`** (기존 Vite 빌드 인덱스 파일 보존)

4. **최적화 빌드 및 클라우드 배포**:
   Vite 컴파일 정적 번들을 수행한 뒤, Firebase 클라우드로 고속 배포를 실행합니다:
   ```bash
   npm run build && firebase deploy
   ```
   *배포 성공 직후 발급되는 고유 호스팅 도메인 URL(예: `https://<your-project>.web.app`)로 전 세계 유저들이 실시간 동기화되는 쿠미히모 도안을 구동할 수 있습니다.*

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
본 구현체는 **Palzzi v1.2 MVP** 사양에 정의된 쿠미히모의 2D 시각화, 도안 다운로드, 로컬 저장소 백업, 가이드 안내 및 드래그 인터랙티브 조작 기능을 모두 만족합니다. 
VWebGL/Three.js 3D 연출 기능 및 커스텀 패턴 에디터 모드는 추후 확장 로드맵(Phase 2)에 따라 유연하게 탑재 가능한 형태로 모듈 독립성이 완벽히 유지되어 있습니다.
