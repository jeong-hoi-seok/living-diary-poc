# living-diary-poc

Expo(React Native) 앱. 메인 화면에 Blender에서 만든 3D 태양계(`unive-v2.glb`)를 펜화(NPR) 스타일로 렌더링하고, 행성 궤도 애니메이션을 재생한다.

## 스택

- Expo SDK 54 / React Native 0.81 / React 19 / New Architecture
- expo-router, NativeWind, TypeScript, Biome
- 3D: **three.js `WebGPURenderer` + react-native-wgpu**
  - New Architecture에서 expo-gl GLView가 화면 합성에 실패해, Fabric-native인 react-native-wgpu(WebGPU/Metal)로 렌더링한다.
- FSD(Feature-Sliced Design) 디렉터리 구조

## 3D 씬

`src/widgets/scene-viewer`

- `lib/loadUniverseGltf.ts` — GLB를 expo-asset로 받아 `GLTFLoader.parse`로 로드
- `lib/npr-materials.ts` — Blender 툰 룩 재현: 행성 `MeshToonMaterial`(2단계 gradientMap: 그림자 0.6 / 빛 1.0) + 코드 생성 inverted-hull 잉크 외곽선, 흰색 태양 + 검정 링, 검정 궤도선
- `ui/SceneViewer.tsx` — 렌더러/카메라/조명/애니메이션 + 제스처(드래그 회전, 핀치/버튼 줌)

## 실행

이 앱은 wgpu 네이티브 모듈을 쓰므로 **Expo Go가 아닌 dev client**가 필요하다.
(WebGPU는 Apple Silicon Mac의 iOS 시뮬레이터(Metal)에서 동작한다.)

스크립트는 두 그룹으로 나뉜다.

**① 네이티브 빌드 (가끔 — 최초 1회, 또는 네이티브 의존성/설정 변경 시)**
Dawn C++ 컴파일로 첫 빌드는 수 분 걸린다. dev client 앱을 시뮬/기기에 설치한다.

```bash
npm install --legacy-peer-deps   # react-native-webgpu의 optional peer 충돌 회피 (최초 1회)
npm run build:ios                # iOS 시뮬레이터에 dev client 설치
npm run build:ios:device         # 실기기에 설치 (Xcode 서명 설정 필요)
npm run build:android            # 안드로이드
```

**② 개발 서버 (평소 — 매번)**
Metro를 띄우고 이미 설치된 dev client를 연다. fast refresh로 코드 수정 즉시 반영.

```bash
npm run dev:ios      # 시뮬레이터에서 열기 (가장 흔함)
npm run dev          # Metro만 시작 (QR + 단축키 메뉴, i=iOS / a=Android)
```

> **QR은 dev client용이다.** 이 앱은 네이티브 모듈(wgpu) 때문에 **Expo Go로 실행할 수 없으며,
> Expo Go QR도 없다.** 실기기는 ①에서 dev client를 설치한 뒤 그 기기에서 QR/자동연결로 붙는다.

## 스크립트

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # biome check
```
