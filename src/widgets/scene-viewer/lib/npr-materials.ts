import * as THREE from "three/webgpu";

/**
 * Blender EEVEE NPR(툰/잉크) 룩을 three.js로 재현하기 위한 머티리얼 교체 로직.
 *
 * 원본 GLB는 머티리얼이 PBR로 베이크돼 들어오므로, 로드 후 노드 이름 기반으로 머티리얼을
 * 통째로 교체한다. GLB 재익스포트는 불필요하다.
 *
 * 노드별 룩(Blender 원본 → three 대응):
 *  - Paper      : emission 흰 평면(배경) → MeshBasicMaterial(흰색, unlit)
 *  - Orbit_Line / Orbit1~5 : emission 거의 검정 → MeshBasicMaterial(0x0d0d0d, unlit)
 *  - Planet1~5  : slot0 Toon_Planet → MeshToonMaterial(gradientMap 2~3단계),
 *                 slot1 Ink_Outline → 검정 BackSide 외곽선
 *  - Sun        : slot0 Ink_Sun → MeshBasicMaterial(흰색),
 *                 slot1 Ink_Outline → 검정 BackSide 외곽선
 */

// ────────────────────────────────────────────────────────────────────────────
// 튜닝 상수
// ────────────────────────────────────────────────────────────────────────────

/** 툰 명암 단계값. NearestFilter gradientMap의 텍셀로, 어두운→밝은 순.
 * Blender Toon_Planet ColorRamp(CONSTANT, 2-stop)를 그대로 옮김: 그림자 0.6(=153), 빛 1.0(=255). */
const TOON_GRADIENT_STEPS = [153, 255];

/** 행성 baseColor. Blender 원본은 흰색 Diffuse라 lit 면이 순백, 그림자만 0.6 회색.
 * base를 흰색으로 두고 gradientMap이 그림자(0.6)/빛(1.0)을 만든다. */
const TOON_PLANET_COLOR = 0xffffff;

/** 궤도선 색(거의 검정). */
const ORBIT_LINE_COLOR = 0x0d0d0d;

/** 외곽선 색(잉크 검정). */
const INK_OUTLINE_COLOR = 0x000000;

/**
 * 슬롯1 지오메트리가 없어 코드로 inverted-hull을 생성할 때, 법선 방향으로 메시를 부풀리는 비율.
 * 0.03 = 3%. 외곽선이 너무 두꺼우면 줄이고, 안 보이면 키운다.
 */
const OUTLINE_HULL_SCALE = 0.1;

/** 슬롯0(채움)에 쓸 흰색(Sun 등). */
const SUN_FILL_COLOR = 0xffffff;

// 모든 행성에 공유할 gradientMap(매번 새로 만들지 않도록 모듈 캐시).
let sharedGradientMap: THREE.DataTexture | null = null;

/**
 * 셀 셰이딩용 gradientMap을 만든다. 1D 그라데이션 텍스처로, magFilter/minFilter를 NearestFilter로
 * 두어 단계 사이가 부드럽게 보간되지 않고 또렷한 셀 경계가 생기게 한다.
 */
function getGradientMap(): THREE.DataTexture {
  if (sharedGradientMap) {
    return sharedGradientMap;
  }
  const data = new Uint8Array(TOON_GRADIENT_STEPS);
  const texture = new THREE.DataTexture(
    data,
    data.length,
    1,
    THREE.RedFormat, // 단일 채널(밝기 단계만 필요).
  );
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  sharedGradientMap = texture;
  return texture;
}

/** 툰(행성 채움) 머티리얼. */
function makeToonMaterial(): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({
    color: TOON_PLANET_COLOR,
    gradientMap: getGradientMap(),
  });
}

/** 외곽선용 검정 BackSide 머티리얼. inverted-hull 기법: 뒷면만 그려 실루엣 링을 만든다. */
function makeOutlineMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: INK_OUTLINE_COLOR,
    side: THREE.BackSide,
  });
}

/** unlit 단색 머티리얼(배경/궤도선/태양 채움). */
function makeBasicMaterial(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color });
}

/**
 * 코드로 inverted-hull 외곽선을 만든다(펜화 잉크선).
 * 원본 메시의 지오메트리를 공유하는 검정 BackSide 메시를, 원본의 "자식"으로 붙여
 * 원본 transform(궤도 애니 포함)을 그대로 따르게 한다. 로컬 스케일만 살짝 키워 실루엣을 만든다.
 *
 * BackSide + 균일 스케일은 구체에 거의 완벽하다(원본이 로컬 원점 중심 구체이므로).
 * MeshBasicMaterial(unlit)이라 라이트와 무관하게 균일한 검정 → 그라데이션 없는 또렷한 선.
 *
 * @returns 생성한 외곽선 메시(호출부가 원본의 자식으로 추가). 생성 불가 시 null.
 */
function createOutlineHull(mesh: THREE.Mesh): THREE.Mesh | null {
  if (!mesh.geometry) {
    return null;
  }
  const outline = new THREE.Mesh(mesh.geometry, makeOutlineMaterial());
  // 자식으로 붙으므로 로컬 스케일만 키우면 원본 중심 기준으로 균일 확장된다.
  outline.scale.setScalar(1 + OUTLINE_HULL_SCALE);
  outline.name = `${mesh.name}__OutlineHull`;
  return outline;
}

/** 메시의 (배열일 수 있는) 머티리얼에서 첫 머티리얼 이름을 얻는다. */
function materialName(mesh: THREE.Mesh): string {
  const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  return mat?.name ?? "";
}

/**
 * 한 메시의 머티리얼을 "원본 머티리얼 이름" 기준으로 교체한다.
 *
 * 노드 이름이 아니라 머티리얼 이름으로 매칭하는 이유: unive-v2.glb는 메시 이름이 "구체.007"처럼
 * Blender 한글 메시명이라 노드(Sun, Planet1~5, Orbit1~5) 이름과 다르다. 머티리얼 이름
 * (Toon_Planet / Ink_Sun / Orbit_Line)은 안정적이라 이 기준이 견고하다.
 *
 * 외곽선은 GLB에 베이크돼 있지 않으므로(v2엔 Ink_Outline 없음) 행성/태양에 코드로 생성한다.
 */
function applyToMesh(mesh: THREE.Mesh, generatedOutlines: THREE.Mesh[]): void {
  const mat = materialName(mesh);

  // 행성: 툰 채움 + 잉크 외곽선.
  if (mat === "Toon_Planet") {
    mesh.material = makeToonMaterial();
    const hull = createOutlineHull(mesh);
    if (hull) {
      generatedOutlines.push(hull);
    }
    return;
  }

  // 태양: 흰색 채움 + 잉크 외곽선(흰 속 + 검정 링).
  if (mat === "Ink_Sun") {
    mesh.material = makeBasicMaterial(SUN_FILL_COLOR);
    const hull = createOutlineHull(mesh);
    if (hull) {
      generatedOutlines.push(hull);
    }
    return;
  }

  // 궤도선: unlit 검정(또렷한 펜선, 그라데이션 없음).
  if (mat === "Orbit_Line") {
    mesh.material = makeBasicMaterial(ORBIT_LINE_COLOR);
    return;
  }
}

/**
 * gltf.scene을 순회하며 머티리얼 이름 기반으로 NPR 머티리얼을 재할당한다.
 * 코드 생성 외곽선은 순회 중 트리를 수정하면 안 되므로, 순회 후 각 원본 메시의 자식으로 일괄 추가한다.
 */
export function applyNprMaterials(root: THREE.Object3D): void {
  const generatedOutlines: { mesh: THREE.Mesh; outline: THREE.Mesh }[] = [];

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }
    const before: THREE.Mesh[] = [];
    applyToMesh(child, before);
    for (const outline of before) {
      generatedOutlines.push({ mesh: child, outline });
    }
  });

  // 순회 종료 후 일괄 추가(외곽선은 원본 메시의 자식 → 원본 transform/애니를 그대로 따른다).
  for (const { mesh, outline } of generatedOutlines) {
    mesh.add(outline);
  }

  console.log(
    `[Scene] 코드 생성 inverted-hull 외곽선 ${generatedOutlines.length}개 추가.`,
  );
}
