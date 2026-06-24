# agent.md

이 프로젝트에서 AI 에이전트가 따를 공통 작업 지침.

## Project Identity

```yaml
platform: app
name: living-diary-poc
stack:
  - React Native
  - Expo
  - TypeScript
  - NativeWind
  - Biome
architecture: Feature-Sliced Design
wiki_root: /Users/hoi-seok/project/llm-wiki/wiki
```

## Response

- 모든 답변은 한국어로 작성한다.
- 변경 전 현재 파일과 설정을 먼저 읽는다.
- 추측한 내용을 사실처럼 쓰지 않는다.
- 사용자가 구현을 요청하면 가능한 한 구현, 검증, 결과 보고까지 한 번에 끝낸다.

## Wiki Baseline

작업 시작 전 아래 문서를 반드시 직접 열어서 읽는다. 경로만 인지하는 것으로 갈음하지 않는다.

### 1. 위키 진입점

- `/Users/hoi-seok/project/llm-wiki/wiki/index.md`
- `/Users/hoi-seok/project/llm-wiki/wiki/위키 개요.md`

### 2. 필수 학습 주입 문서

컨벤션:

- `/Users/hoi-seok/project/llm-wiki/wiki/컨벤션/네이밍 컨벤션.md`
- `/Users/hoi-seok/project/llm-wiki/wiki/컨벤션/커밋 컨벤션.md`
- `/Users/hoi-seok/project/llm-wiki/wiki/컨벤션/MR PR 작성 가이드.md`
- `/Users/hoi-seok/project/llm-wiki/wiki/컨벤션/프로젝트 맥락 위키 작성 가이드.md`

개발 원칙:

- `/Users/hoi-seok/project/llm-wiki/wiki/개발원칙/코드 품질.md`
- `/Users/hoi-seok/project/llm-wiki/wiki/개발원칙/가독성.md`
- `/Users/hoi-seok/project/llm-wiki/wiki/개발원칙/예측 가능성.md`
- `/Users/hoi-seok/project/llm-wiki/wiki/개발원칙/응집도.md`
- `/Users/hoi-seok/project/llm-wiki/wiki/개발원칙/결합도.md`
- `/Users/hoi-seok/project/llm-wiki/wiki/개발원칙/디버깅.md`
- `/Users/hoi-seok/project/llm-wiki/wiki/개발원칙/접근성.md`

아키텍처:

- `/Users/hoi-seok/project/llm-wiki/wiki/아키텍처/FSD 폴더구조.md`

앱 기술 개념:

- `/Users/hoi-seok/project/llm-wiki/wiki/기술개념/app/React Native.md`
- `/Users/hoi-seok/project/llm-wiki/wiki/기술개념/app/Expo.md`
- `/Users/hoi-seok/project/llm-wiki/wiki/기술개념/app/NativeWind.md`
- `/Users/hoi-seok/project/llm-wiki/wiki/기술결정/Biome을 사용하는 이유.md`

### 3. 주제별 추가 학습

- 작업 주제가 위 문서 밖이면 `/Users/hoi-seok/project/llm-wiki/wiki/index.md`에서 관련 문서를 찾아 추가로 읽는다.
- `platform: app` 문서와 `[공통]` 문서를 우선한다.
- 웹 전용 문서는 사용자가 요청했거나 비교가 필요할 때만 읽는다.
- 프로젝트 로컬 `wiki/` 또는 `docs/`가 생기면 공유 위키보다 프로젝트 로컬 문서를 우선한다.

### 4. 응답 검증

작업 결과물 하단에 참고한 위키 문서를 HTML 주석으로 남긴다.

```md
<!-- wiki-ref: 컨벤션/네이밍 컨벤션.md, 아키텍처/FSD 폴더구조.md -->
```

명시하지 않은 경우 위키를 읽지 않은 것으로 간주한다.

## Architecture

FSD(Feature-Sliced Design)를 기본 폴더 구조로 사용한다.

```txt
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
```

### Layer 책임

- `src/app`: Expo Router 엔트리, provider, 전역 스타일, 앱 설정.
- `src/pages`: route 기준 화면 조립.
- `src/widgets`: 독립적으로 동작하는 큰 UI 블록.
- `src/features`: 사용자 행동과 use case.
- `src/entities`: 재사용되는 핵심 도메인 모델.
- `src/shared`: 비즈니스와 분리된 공통 UI, lib, api, config.

### FSD 규칙

- 하위 Layer는 상위 Layer를 import하지 않는다.
- 같은 Layer의 다른 Slice를 직접 import하지 않는다.
- Slice 외부 접근은 `index.ts` Public API를 통한다.
- `export *` 남발 금지. 외부에 필요한 것만 명시적으로 export한다.
- `components`, `hooks`, `types` 같은 파일 종류 중심 Segment보다 `ui`, `api`, `model`, `lib`, `config`처럼 목적 중심 Segment를 쓴다.
- Slice Group은 탐색용 폴더일 뿐 공용 코드를 두지 않는다.
- `entities`는 재사용이 분명할 때만 만든다. 초기에는 가까운 feature/page의 `model`에 둔다.

## Expo / React Native

- Expo는 React Native 위 도구층이다. Expo Go만 기준으로 판단하지 않는다.
- 새 네이티브 의존성은 `npx expo install`을 우선 사용한다.
- 실제 앱 개발 기준은 Expo Go보다 Development Build를 우선 검토한다.
- `android/`, `ios/` 직접 수정 전 CNG와 config plugin으로 표현 가능한지 확인한다.
- 의존성·config 문제가 의심되면 `npx expo-doctor`로 점검한다.
- RN 기본 UI는 `View`, `Text`, `Pressable`, `TextInput` 등 네이티브 컴포넌트 기준으로 작성한다.

## Styling

- 스타일 기본값은 NativeWind `className`.
- variant가 있는 공용 UI는 CVA + `cn`을 사용한다.
- `StyleSheet.create`는 NativeWind로 표현하기 어려운 경우에만 사용한다.
- inline `style`은 런타임 동적 값이 필요할 때만 사용한다.
- 동적 Tailwind 클래스 문자열은 금지한다. 정적 클래스, CVA variant, 조건부 `cn` 조합을 사용한다.
- class 충돌 병합은 `src/shared/lib/cn.ts`의 `cn` 유틸을 통한다.

권장 위치:

```txt
styles/global.css
tailwind.config.js
metro.config.js
nativewind-env.d.ts
src/shared/lib/cn.ts
```

## Code Quality

- 좋은 코드는 변경하기 쉬운 코드다.
- 가독성: 한 번에 고려할 맥락을 줄인다.
- 예측 가능성: 이름, 파라미터, 반환값만 보고 동작을 알 수 있게 한다.
- 응집도: 함께 바뀌는 코드는 가까이 둔다.
- 결합도: 수정 영향 범위를 작게 유지한다.
- 숨은 부수효과를 만들지 않는다. 부수효과는 호출부나 명확한 action에 둔다.
- 조기 공통화보다 변경 방향이 확인된 뒤 추출한다.
- 버그는 증상 완화보다 근본 원인 수정, 재현, 예방 기록을 우선한다.

## Naming

- 파일과 디렉터리는 kebab-case를 사용한다.
- Expo Router 강제 규칙은 예외다: `[id].tsx`, `[...slug].tsx`, `(tabs)/`, `(auth)/`.
- 컴포넌트와 타입은 PascalCase.
- 함수, 변수, 훅은 camelCase.
- 훅은 `use*`로 시작한다.
- 상수는 UPPER_SNAKE_CASE.
- boolean은 `is`, `has`, `should`, `can` 접두를 우선한다.
- 약어도 PascalCase로 쓴다: `ApiClient`, `UuidGenerator`.

## Tooling

- 포맷과 린트는 Biome을 기본 품질 게이트로 둔다.
- 변경 후 가능한 검증 명령을 실행한다.
- package manager는 lockfile이 생기면 그 도구를 따른다.
- 설정 파일 추가 전 기존 설정과 Expo/NativeWind 호환성을 확인한다.
- 프레임워크 특수 lint가 꼭 필요하면 ESLint 병행을 별도 결정으로 남긴다.

## Git

- 커밋 메시지는 `type(scope): subject` 형식을 따른다.
- subject는 한국어, 50자 이내, 명사형 어미로 작성한다.
- 예: `docs(agent): 프로젝트 에이전트 지침 추가`
- PR/MR 작성 전 브랜치, target, 비교 기준 커밋, 포함 커밋 범위를 확인하고 공유한다.
- 확인하지 않은 테스트를 수행한 것처럼 쓰지 않는다.

## Project Wiki

- 프로젝트 맥락 기록은 사용자가 요청할 때만 작성한다.
- 프로젝트 root의 `wiki/`는 이 프로젝트 고유 맥락과 결정만 담는다.
- 공유 지식은 `/Users/hoi-seok/project/llm-wiki/wiki`에 둔다.
- 코드로 확인 가능한 사실은 장황하게 기록하지 않는다.
- 결정 변경은 과거 파일 수정이 아니라 최신 날짜 문서에서 오버라이드로 남긴다.
