import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
// 정식 패키지명 react-native-webgpu를 직접 import (스파이크와 동일).
// react-native-wgpu는 이걸 재export하는 deprecated 셰임이라 런타임 경고가 뜬다.
import { Canvas, type CanvasRef, type NativeCanvas } from "react-native-webgpu";
import * as THREE from "three/webgpu";

import { loadUniverseGltf } from "../lib/loadUniverseGltf";
import { applyNprMaterials } from "../lib/npr-materials";

// ────────────────────────────────────────────────────────────────────────────
// 튜닝 상수 (빌드 후 스크린샷 보고 이 블록에서만 조정)
// ────────────────────────────────────────────────────────────────────────────

/**
 * 카메라 화각(도). Blender 씬 카메라 50mm 렌즈를 풀프레임(36mm) 기준 수평 화각으로 환산하면
 * 약 40°이나, 세로 화면 + Y-up 변환을 고려해 ref 렌더에 맞춘 28°를 시작값으로 둔다.
 * 궤도가 화면을 꽉 채우면 줄이고(망원), 너무 작게 보이면 키운다(광각).
 */
const CAMERA_FOV_DEG = 28;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 1000;

/**
 * 카메라가 바라보는 타겟(궤도 중심). 태양/행성이 원점 부근에 모여 있어 원점으로 둔다.
 */
const CAMERA_TARGET: [number, number, number] = [0, 0, 0];

/**
 * 초기 궤도 반경(타겟~카메라 거리). Blender 카메라 [0,15,19](Y-up 변환값)의 원점 거리 ≈ 24.2와
 * 동일하게 시작한다. 멀어서 작게 보이면 줄이고, 가까워 잘리면 키운다.
 */
const INITIAL_RADIUS = 24.2;
const MIN_RADIUS = 6;
const MAX_RADIUS = 80;

/**
 * 초기 구면좌표 각도(라디안).
 * theta = 수평 각(Y축 둘레), phi = 천정각(+Y에서 내려오는 각).
 * Blender 카메라 [0,15,19]를 구면좌표로 환산: theta=0(정면 +Z), phi=acos(15/24.2)≈0.886rad(≈51°).
 * → 약간 위에서 비스듬히 내려다보는 ref 앵글.
 */
const INITIAL_THETA = 0;
const INITIAL_PHI = 0.886;

/**
 * phi(상하 회전) 클램프. 0/π 극점에서 lookAt이 뒤집히는 짐벌락을 피하려고 여유를 둔다.
 */
const MIN_PHI = 0.15;
const MAX_PHI = Math.PI - 0.15;

/**
 * Pan 회전 감도. 화면 픽셀 이동량(translation)에 곱해 각도 변화로 쓴다.
 * 드래그가 둔하면 키우고, 너무 민감하면 줄인다.
 */
const ROTATE_SPEED = 0.005;

/**
 * +/- 버튼 1회당 반경 변화량(units).
 */
const BUTTON_ZOOM_STEP = 3;

/**
 * 방향광(Blender KeyLight 대응) 색/세기/방향.
 * 방향은 "광원이 놓인 위치"로 해석된다(three DirectionalLight.position에서 target(원점)을 향한다).
 * MeshToonMaterial이 이 빛을 받아 gradientMap 단계 명암을 만든다. 어두우면 intensity를 키운다.
 */
const KEY_LIGHT_COLOR = 0xffffff;
const KEY_LIGHT_INTENSITY = 2.2;
const KEY_LIGHT_POSITION: [number, number, number] = [5, 8, 6];

/**
 * 환경광. 툰 명암의 어두운 단계가 완전히 죽지 않도록 약하게만 넣는다.
 * 0이면 그림자부가 gradientMap 최저단(검정 직전)으로 떨어진다. 너무 밝으면 명암 대비가 사라진다.
 */
const AMBIENT_COLOR = 0xffffff;
// 낮게 잡아 그림자측이 낮은 툰 단계로 떨어지게 → 행성에 셀 명암(밝은면/어두운면)이 보인다.
const AMBIENT_INTENSITY = 0.35;

/** 배경색(Blender Paper 평면과 동일한 흰색). */
const BACKGROUND_COLOR = 0xffffff;

/**
 * three.js WebGPURenderer가 기대하는 canvas 인터페이스를 react-native-webgpu의 NativeCanvas에
 * 어댑트하는 래퍼. 스파이크(WebGPUSpike) 및 공식 example의 ReactNativeCanvas와 동일.
 */
class ReactNativeCanvas {
  constructor(private canvas: NativeCanvas) {}

  get width() {
    return this.canvas.width;
  }
  get height() {
    return this.canvas.height;
  }
  set width(width: number) {
    this.canvas.width = width;
  }
  set height(height: number) {
    this.canvas.height = height;
  }
  get clientWidth() {
    return this.canvas.width;
  }
  get clientHeight() {
    return this.canvas.height;
  }
  set clientWidth(width: number) {
    this.canvas.width = width;
  }
  set clientHeight(height: number) {
    this.canvas.height = height;
  }
  addEventListener(_type: string, _listener: EventListener) {}
  removeEventListener(_type: string, _listener: EventListener) {}
  dispatchEvent(_event: Event) {}
  setPointerCapture() {}
  releasePointerCapture() {}
}

/**
 * 궤도 카메라 상태. 구면좌표(theta/phi/radius)로 보관하고 매 프레임 데카르트로 변환해
 * camera.position에 반영한다. ref로 두어 리렌더 없이 animate 루프에서 직접 읽고/갱신한다.
 */
type OrbitState = {
  theta: number;
  phi: number;
  radius: number;
};

/**
 * 메인 화면용 3D 씬 뷰어 (three.js WebGPURenderer 버전).
 *
 * 검증된 스파이크(WebGPUSpike)의 연동 방식을 그대로 토대로 한다:
 * Canvas ref → getContext("webgpu") → ReactNativeCanvas 래퍼 → new WebGPURenderer({canvas,context})
 * → renderer.init() → setAnimationLoop → 매 프레임 renderer.render + context.present().
 *
 * 그 위에 (1) unive.glb 로드, (2) Blender EEVEE NPR 룩 재현용 머티리얼 교체,
 * (3) gesture-handler 기반 궤도 회전/줌, (4) AnimationMixer로 5트랙 공전 애니를 얹는다.
 */
type SceneViewerProps = {
  /** 행성 오브젝트를 탭했을 때 호출(planetId = "Planet1"~"Planet5"). */
  onSelectPlanet?: (planetId: string) => void;
};

export function SceneViewer({ onSelectPlanet }: SceneViewerProps) {
  const canvasRef = useRef<CanvasRef>(null);
  const [isReady, setReady] = useState(false);

  // 탭 raycast용 refs. animate 루프 바깥(제스처 콜백)에서 씬/카메라를 읽어야 한다.
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  // GestureDetector(=View) 논리 크기(points). NDC 변환에 픽셀버퍼가 아니라 이 값을 쓴다.
  const layoutRef = useRef({ width: 0, height: 0 });
  const raycasterRef = useRef(new THREE.Raycaster());

  // 궤도 상태(ref): 제스처/버튼이 갱신하고 animate 루프가 읽는다. 리렌더 불필요.
  const orbitRef = useRef<OrbitState>({
    theta: INITIAL_THETA,
    phi: INITIAL_PHI,
    radius: INITIAL_RADIUS,
  });

  // Pan 시작 시점의 각도를 기억해 누적 이동량으로 절대 각도를 계산한다(드리프트 방지).
  const panStartRef = useRef({ theta: INITIAL_THETA, phi: INITIAL_PHI });
  // Pinch 시작 시점의 반경을 기억(scale은 제스처 시작 기준 비율이므로).
  const pinchStartRadiusRef = useRef(INITIAL_RADIUS);

  // +/- 버튼은 ref만 갱신하면 animate 루프가 다음 프레임에 반영한다.
  const clampRadius = useCallback((r: number) => {
    return Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, r));
  }, []);

  const onZoomIn = useCallback(() => {
    orbitRef.current.radius = clampRadius(
      orbitRef.current.radius - BUTTON_ZOOM_STEP,
    );
  }, [clampRadius]);

  const onZoomOut = useCallback(() => {
    orbitRef.current.radius = clampRadius(
      orbitRef.current.radius + BUTTON_ZOOM_STEP,
    );
  }, [clampRadius]);

  // ── 제스처 정의 ────────────────────────────────────────────────────────────
  // 스레딩: camera는 three(JS 객체)이고 orbitRef도 JS ref다. gesture-handler 콜백을
  // .runOnJS(true)로 JS 스레드에서 실행해 ref만 갱신하고, 실제 camera.position 반영은
  // animate 루프(JS)에서 한다. UI 스레드 worklet과 three 객체를 섞지 않아 안전하다.
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onStart(() => {
      panStartRef.current = {
        theta: orbitRef.current.theta,
        phi: orbitRef.current.phi,
      };
    })
    .onUpdate((event) => {
      // 가로 드래그 → theta, 세로 드래그 → phi. phi는 짐벌락 회피로 클램프.
      const nextTheta =
        panStartRef.current.theta - event.translationX * ROTATE_SPEED;
      const nextPhi =
        panStartRef.current.phi - event.translationY * ROTATE_SPEED;
      orbitRef.current.theta = nextTheta;
      orbitRef.current.phi = Math.min(MAX_PHI, Math.max(MIN_PHI, nextPhi));
    });

  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => {
      pinchStartRadiusRef.current = orbitRef.current.radius;
    })
    .onUpdate((event) => {
      // scale>1(핀치 아웃)=zoom in=반경 감소. 시작 반경 기준으로 나눈다.
      const next = pinchStartRadiusRef.current / event.scale;
      orbitRef.current.radius = clampRadius(next);
    });

  // 탭: 화면 좌표 → NDC → raycast → 맞은 오브젝트의 조상 중 Planet* 노드를 찾아 콜백.
  const handleTap = useCallback(
    (x: number, y: number) => {
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      const { width, height } = layoutRef.current;
      if (!camera || !scene || width === 0 || height === 0) {
        return;
      }
      const ndc = new THREE.Vector2((x / width) * 2 - 1, -(y / height) * 2 + 1);
      const raycaster = raycasterRef.current;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (/^Planet\d+$/.test(obj.name)) {
            onSelectPlanet?.(obj.name);
            return;
          }
          obj = obj.parent;
        }
      }
    },
    [onSelectPlanet],
  );

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .maxDistance(10)
    .onEnd((event, success) => {
      if (success) {
        handleTap(event.x, event.y);
      }
    });

  // 회전+줌은 동시 인식, 탭은 그와 경쟁(드래그면 pan이, 가만히 탭이면 tap이 이긴다).
  const composedGesture = Gesture.Race(
    Gesture.Simultaneous(panGesture, pinchGesture),
    tapGesture,
  );

  useEffect(() => {
    const context = canvasRef.current?.getContext("webgpu");
    if (!context) {
      console.warn("[SceneViewer] webgpu context를 얻지 못했습니다.");
      return;
    }

    const { width, height } = context.canvas;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND_COLOR);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      CAMERA_FOV_DEG,
      width / height,
      CAMERA_NEAR,
      CAMERA_FAR,
    );
    cameraRef.current = camera;

    // 조명: KeyLight 방향광 + 약한 환경광. MeshToonMaterial이 이 빛으로 단계 명암을 만든다.
    const ambient = new THREE.AmbientLight(AMBIENT_COLOR, AMBIENT_INTENSITY);
    scene.add(ambient);

    const directional = new THREE.DirectionalLight(
      KEY_LIGHT_COLOR,
      KEY_LIGHT_INTENSITY,
    );
    directional.position.set(...KEY_LIGHT_POSITION);
    scene.add(directional);

    const renderer = new THREE.WebGPURenderer({
      antialias: true,
      // ReactNativeCanvas는 DOM canvas가 아니므로 three의 canvas 타입과 불일치(의도된 어댑터).
      // @ts-expect-error three.js canvas 타입과 RN 어댑터 불일치(스파이크/공식 example과 동일).
      canvas: new ReactNativeCanvas(context.canvas),
      context,
    });

    // Blender Standard 톤맵 룩이라 톤매핑을 끄고 색을 그대로 본다. 흰 배경도 그대로 클리어.
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(BACKGROUND_COLOR, 1);

    let mixer: THREE.AnimationMixer | null = null;
    let disposed = false;
    const clock = new THREE.Clock();

    async function setup() {
      await renderer.init();
      if (disposed) {
        return;
      }

      // GLB 로드(expo-asset로 localUri 확보 → expo-file-system로 ArrayBuffer → GLTFLoader.parse).
      const gltf = await loadUniverseGltf();
      if (disposed) {
        return;
      }

      // 진단: 로드된 노드명 목록 + 애니 개수.
      const nodeNames: string[] = [];
      gltf.scene.traverse((child) => {
        if (child.name) {
          nodeNames.push(child.name);
        }
      });
      console.log("[Scene] loaded nodes:", nodeNames);
      console.log("[Scene] animation clips:", gltf.animations.length);

      // Blender EEVEE NPR 룩 재현용 머티리얼 교체(이름 기반 슬롯별 처리).
      applyNprMaterials(gltf.scene);

      scene.add(gltf.scene);

      // 애니메이션: 모든 트랙을 동시에 재생(행성 5개가 각자 트랙으로 공전).
      if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(gltf.scene);
        for (const clip of gltf.animations) {
          mixer.clipAction(clip).play();
        }
      }

      setReady(true);
      console.log("[Scene] ready");

      renderer.setAnimationLoop(() => {
        const delta = clock.getDelta();
        mixer?.update(delta);

        // 궤도 상태(ref)를 데카르트 좌표로 변환해 카메라 위치 갱신 후 타겟 응시.
        const { theta, phi, radius } = orbitRef.current;
        const sinPhi = Math.sin(phi);
        camera.position.set(
          CAMERA_TARGET[0] + radius * sinPhi * Math.sin(theta),
          CAMERA_TARGET[1] + radius * Math.cos(phi),
          CAMERA_TARGET[2] + radius * sinPhi * Math.cos(theta),
        );
        camera.lookAt(CAMERA_TARGET[0], CAMERA_TARGET[1], CAMERA_TARGET[2]);

        renderer.render(scene, camera);
        // react-native-webgpu는 매 프레임 present()로 GPU surface에 제출해야 한다.
        context?.present();
      });
    }

    setup().catch((error) => {
      console.error("[SceneViewer] 씬 셋업 실패:", error);
    });

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      mixer?.stopAllAction();
    };
  }, []);

  return (
    <GestureDetector gesture={composedGesture}>
      <View
        className="flex-1"
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          layoutRef.current = { width, height };
        }}
      >
        <Canvas ref={canvasRef} style={{ flex: 1 }} />

        {/* 로딩 인디케이터 오버레이(로드 완료 시 제거). */}
        {!isReady && (
          <View
            className="absolute inset-0 items-center justify-center"
            pointerEvents="none"
          >
            <ActivityIndicator size="large" color="#737373" />
          </View>
        )}

        {/* 줌 +/- 버튼 (우하단 절대배치 오버레이). */}
        <View className="absolute bottom-6 right-6 gap-3">
          <Pressable
            onPress={onZoomIn}
            accessibilityRole="button"
            accessibilityLabel="확대"
            className="h-12 w-12 items-center justify-center rounded-full bg-black/70"
          >
            <Text className="text-2xl font-bold text-white">+</Text>
          </Pressable>
          <Pressable
            onPress={onZoomOut}
            accessibilityRole="button"
            accessibilityLabel="축소"
            className="h-12 w-12 items-center justify-center rounded-full bg-black/70"
          >
            <Text className="text-2xl font-bold text-white">−</Text>
          </Pressable>
        </View>
      </View>
    </GestureDetector>
  );
}
