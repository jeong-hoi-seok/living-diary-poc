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

```bash
npm install --legacy-peer-deps   # react-native-webgpu의 optional peer 충돌 회피
npx expo run:ios                 # dev client 빌드 (Dawn 컴파일로 첫 빌드는 오래 걸림)
```

> 네이티브 모듈(wgpu)을 쓰므로 Expo Go가 아닌 dev client가 필요하다.
> WebGPU는 Apple Silicon Mac의 iOS 시뮬레이터(Metal)에서 동작한다.

## 스크립트

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # biome check
```
