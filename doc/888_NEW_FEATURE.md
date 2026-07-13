# New feature


## 좋아요 기능

### target version: v1.1.0

### 기능설명

- 사용자들이 실팔찌 패턴에 좋아요를 줄 수 있는 기능.

- 테두리만 있는 하트를 실팔찌 미리보기의 우측 하단에 표시하고 사용자가 이를 클릭하면 애니메이션을 주면서 빨간 하트로 표시.

- 미리보기 아래 정보란에 하트를 몇개 받았는지 표시

- 갤러리 화면에는 사용자가 좋아요를 준 패턴을 위쪽에 정렬할 것.

- 갤러리 정렬 순서를 "좋아요 많은 순", "최신순"에서 사용자가 선택할 수 있도록 한다.

### 구현 세부사항

- **데이터 모델:** `patterns/{id}/likes/{uid}` 서브컬렉션 + `patterns.likes` denyormalized 카운트 + `userLikes/{uid}` 사용자 인덱스
- **토글:** Firestore 트랜잭션으로 원자적 업데이트 (optimistic UI + 실패 시 롤백)
- **비로그인 좋아요:** `sessionStorage` 기반 세션당 1회 제한 + sessionId를 문서 ID로 사용. Firestore 카운트에도 반영
- **하트 박동 애니메이션:** 좋아요 수에 따라 로그 스케일로 박동 속도 조절 (2+개부터 적용, 31+개에서 최대 속도)
- **정렬:** 최신순 / 좋아요 많은 순 / 내가 좋아요한 순 (시뮬레이터 사이드바 + 갤러리 페이지)

## 스냅샷 이미지 동적 서빙

### target version: v1.1.0

### 기능설명

- 3D 브레이드 스냅샷을 Firestore `snapshotBase64` 필드에 base64로 저장. Firebase Functions가 동적으로 JPEG 응답.

### 구현 세부사항

- **Functions 엔드포인트:** `/img/{docId}` — Firestore에서 `snapshotBase64` 조회 → base64 디코딩 → JPEG 응답
- **캐시:** `Cache-Control: public, max-age=86400` (24시간)
- **폴백:** 스냅샷이 없으면 `/palzzi_logo.png`로 리다이렉트
- **OG 연동:** `/og/{docId}` 페이지의 `og:image`가 `/img/{docId}`를 참조
- **정적 파일 불필요:** 빌드 시 파일 생성 없음. 모든 이미지는 Functions가 Firestore에서 실시간 서빙

## 공유 URL 단축

### target version: v1.1.0

### 기능설명

- WhatsApp 등 SNS 공유 시 URL 길이를 대폭 단축.

### 구현 세부사항

- **이전 형식:** `/simulator?tmpl=kumihimo-8-candy&colors=FF3B30,FF9500,...&step=120&key=abc`
- **단축 형식:** `/s?t=kumihimo-8-candy&c=<base64url>&s=120&k=abc`
- **색상 인코딩:** hex 문자열을 바이트 배열로 변환 후 base64url 인코딩 (8색 기준 55자 → 약 24자)
- **하위 호환:** `checkUrlParams()`에서 기존 `tmpl/colors/step/key` 파라미터도 동시 지원
- **라우팅:** `/s` 경로를 `simulator.html`로 rewrite (Vite dev middleware + firebase.json rewrites)

## OG (Open Graph) 메타태그

### target version: v1.1.0

### 기능설명

- WhatsApp, Facebook 등 SNS에 URL 공유 시 미리보기 카드 표시.

### 구현 세부사항

- `simulator.html`, `index.html`에 정적 OG 태그 추가
- **og:image:** `/palzzi_logo.png` (정적 로고 이미지, 기본값)
- **동적 OG 이미지:** 스냅샷 파일이 `/snapshots/{docId}.jpg`로 서빙되므로 추후 Cloud Function 등으로 동적 og:image 삽입 가능
- **현재 한계:** SPA 구조상 URL 파라미터별 동적 OG 태그 미지원. 정적 태그가 기본으로 사용됨
