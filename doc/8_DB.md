# DB Schema

## DB

Firestore를 이용한 data 저장

## Collections

### patterns

갤러리에 저장된 패턴 문서.

| 필드 | 타입 | 설명 |
|---|---|---|
| `templateId` | string | 템플릿 ID (e.g. `kumihimo-8-candy`) |
| `patternKey` | string | `templateId + colors` 해시 (base36). 패턴 고유 식별용 |
| `templateName` | string | 템플릿 영문명 |
| `nameKo` | string | 패턴 이름 (한국어) |
| `nameEn` | string | 패턴 이름 (영어) |
| `nThreads` | number | 가닥 수 |
| `maxSteps` | number | 최대 스텝 수 |
| `colors` | string[] | 실 색상 hex 배열 |
| `snapshotBase64` | string | 3D 뷰어 스냅샷 JPEG base64 데이터 URL |
| `ownerUid` | string | 소유자 Firebase Auth UID |
| `ownerName` | string | 소유자 표시명 |
| `ownerPhoto` | string | 소유자 프로필 사진 URL |
| `likes` | number | 좋아요 수 (denyormalized 카운트) |
| `createdAt` | timestamp | 생성 시각 |

#### patterns/{patternId}/likes/{uid}

패턴별 좋아요 서브컬렉션. 각 사용자(`uid`)가 한 번만 좋아요 가능.

| 필드 | 타입 | 설명 |
|---|---|---|
| `createdAt` | timestamp | 좋아요 누른 시각 |

비로그인 사용자의 경우 문서 ID로 `sessionId`(UUID)를 사용하며, `sessionId` 필드를 포함한다.

### userLikes

사용자가 좋아요한 패턴 ID 목록 인덱스.

| 문서 ID | 필드 | 타입 | 설명 |
|---|---|---|---|
| `{uid}` | `patternIds` | string[] | 좋아요한 패턴 ID 배열 |

### userColors

사용자별 Firestore 저장 색상 상태.

| 문서 ID | 설명 |
|---|---|
| `{uid}` | 사용자별 색상 설정 JSON |

### admins

관리자 UID 목록.

| 문서 ID | 설명 |
|---|---|
| `{uid}` | 관리자 권한을 가진 UID |

## 스냅샷 이미지

`patterns` 컬렉션의 `snapshotBase64` 필드(base64 JPEG)에 저장. Firebase Functions(`/img/{docId}`)가 Firestore에서 직접 읽어 JPEG로 응답하므로 별도 정적 파일 관리가 불필요.

- **Functions 엔드포인트:** `/img/{docId}` → Firestore 조회 → base64 디코딩 → JPEG 응답
- **캐시:** `Cache-Control: public, max-age=86400` (24시간)
- **폴백:** 스냅샷이 없으면 `/palzzi_logo.png`로 리다이렉트
- **OG 이미지:** `/og/{docId}` 페이지의 `og:image`가 `/img/{docId}`를 가리킴

## 공유 URL

짧은 형식의 공유 URL을 지원.

- **형식:** `/s?t={templateId}&c={base64url_colors}&s={step}&k={patternKey}`
- **색상 인코딩:** hex를 바이트 변환 후 base64url 인코딩 (8색 기준 약 24자)
- **하위 호환:** 기존 `?tmpl=...&colors=...&step=...&key=...` 형식도 지원
- **라우팅:** `/s` → `simulator.html` (Vite dev + Firebase Hosting rewrite)

## Security Rules

- **patterns**: 누구나 읽기 가능. 생성은 인증 필요. 업데이트는 소유자/관리자 또는 `likes` 필드만 변경 가능 (비로그인 포함).
- **patterns/{id}/likes/{uid}**: 누구나 읽기 가능. 쓰기는 인증 사용자 또는 `sessionId`가 문서 ID와 일치하는 경우.
- **userLikes/{uid}**: 본인만 읽기/쓰기 가능.
