# AGENTS.md

이 프로젝트에서 AI 에이전트가 따를 공통 지침.

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

## Rules

- 모든 답변은 한국어로 작성한다.
- 작업 전 현재 파일과 설정을 먼저 읽는다.
- 추측한 내용을 사실처럼 쓰지 않는다.
- 사용자가 구현을 요청하면 가능한 한 구현, 검증, 결과 보고까지 한 번에 끝낸다.

## Wiki First

작업 시작 전 `/Users/hoi-seok/project/llm-wiki/wiki`를 우선 학습한다.

- 위키 문서를 경로만 인지하지 말고 직접 열어서 읽는다.
- 먼저 `/Users/hoi-seok/project/llm-wiki/wiki/index.md`를 읽는다.
- 필수 학습 범위는 `컨벤션`, `개발원칙`, `아키텍처` 폴더다.
- 이 프로젝트는 RN + Expo 앱이므로 `기술개념/app` 폴더를 우선한다.
- FSD, Biome, NativeWind 관련 작업이면 위키의 관련 문서를 먼저 읽고 따른다.
- 프로젝트 로컬 `docs/` 또는 `wiki/`가 생기면 공유 위키보다 프로젝트 로컬 문서를 우선한다.
- 위키에 이미 있는 규칙과 설명을 `AGENTS.md`에 중복 작성하지 않는다.
