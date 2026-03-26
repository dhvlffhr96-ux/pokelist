# pokelist

포켓몬 카드 보관 목록을 관리하는 `Next.js + TypeScript` 기반 앱입니다.

카드 마스터 정보는 `Supabase public.card_sets`, `Supabase public.cards`에서 읽기만 하고, 사용자별 보유 목록은 로컬 TXT 파일에 저장합니다.

## 시작 방법

1. 의존성 설치

```bash
npm install
```

2. 환경변수 파일 생성

```bash
cp .env.example .env.local
```

3. Supabase 마스터 스키마 확인

앱은 `/supabase/schema.sql` 기준으로 `public.card_sets`, `public.cards`를 조회합니다.
이미 같은 구조의 테이블이 있으면 그대로 사용하면 됩니다.

4. 개발 서버 실행

```bash
npm run dev
```

## 저장 방식

- 마스터 카드 정보
  - `Supabase`에서 조회만 수행
- 사용자 보유 목록
  - `data/user-lists/<userId>.txt`
  - 내용은 JSON 구조로 저장되며 파일 확장자만 `.txt`입니다.
  - 같은 카드를 다시 추가하면 기존 항목에 수량이 합산됩니다.

## 구조

- `app/`
  - 화면과 API 라우트
- `components/`
  - 사용자 ID 로드, 마스터 검색, 내 카드 저장 UI
- `lib/cards/`
  - 도메인 타입, 검증, Supabase 마스터 조회, TXT 저장소 구현
- `lib/supabase/`
  - Supabase 서버 클라이언트와 타입
- `data/user-lists/`
  - 사용자별 카드 목록 TXT 파일
- `supabase/schema.sql`
  - 마스터 테이블 기준 스키마

## 다음 단계

- 인증이 필요해지면 `userId` 입력 대신 실제 로그인 세션으로 전환
- 이미지 업로드가 필요하면 사용자 파일 대신 스토리지 메타데이터 레이어 추가
- 사용자 파일이 커지면 TXT 저장소를 SQLite로 교체
