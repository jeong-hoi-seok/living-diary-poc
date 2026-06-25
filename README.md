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

```bash
# 0) 의존성 설치 (react-native-webgpu의 optional peer 충돌 회피)
npm install --legacy-peer-deps

# 1) dev client 네이티브 빌드 — 최초 1회, 또는 네이티브 의존성/설정 변경 시에만
#    (Dawn C++ 컴파일로 첫 빌드는 수 분 소요)
npm run ios:build        # 안드로이드: npm run android:build

# 2) 평소 개발 — Metro 시작 + 시뮬레이터 열기 + 터미널 QR 표시
npm run ios              # 또는 npm start 후 터미널에서 i(iOS) / a(Android)
```

- `npm run ios` = `expo start --ios` : 시뮬레이터 실행 + QR + 단축키 메뉴
- `npm run ios:build` = `expo run:ios` : 네이티브 빌드/재설치(QR 없음)
- **실기기**: 폰에 dev client를 먼저 설치(`npm run ios:build -- --device` 또는 EAS dev 빌드)한 뒤,
  QR을 스캔하면 `livingdiary://` 로 열린다. Expo Go로는 실행되지 않는다.

## 스크립트

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # biome check
```
