import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// GLB 에셋을 모듈로 require → Metro가 정적 에셋으로 번들링한다.
// (metro.config.js의 assetExts에 glb 등록이 선행되어야 한다.)
const MODEL = require("../../../../assets/3d/unive-v2.glb");

/**
 * unive.glb를 React Native 환경에서 three.js GLTFLoader로 로드한다.
 *
 * RN에는 브라우저 fetch/Request/createObjectURL/createImageBitmap 체인이 온전하지 않거나
 * Hermes에서 동작이 불확실하다. 그래서 GLTFLoader.load(url)(내부적으로 FileLoader→fetch 사용)를
 * 쓰지 않고, 파일을 직접 ArrayBuffer로 읽어 loader.parse(buffer, "", onLoad, onError)로 넘긴다.
 *
 * 로딩 절차:
 *  1. Asset.fromModule(MODEL).downloadAsync()로 번들 에셋을 로컬 파일로 확보하고 localUri를 얻는다.
 *  2. expo-file-system 신 API의 File 클래스로 그 file:// URI를 열어 arrayBuffer()로 바이트를 읽는다.
 *     (fetch/Request를 거치지 않으므로 RN의 네트워크 폴리필 의존이 없다.)
 *  3. loader.parse(buffer, "", onLoad, onError)로 파싱한다.
 *     - .glb 바이너리 파싱은 JSON 청크 디코딩에 TextDecoder만 쓴다(Hermes 내장).
 *     - 임베드 텍스처 추출(createObjectURL/createImageBitmap) 경로는, 로드 후 모든 머티리얼을
 *       교체하므로 실사용되지 않는다. parse 자체는 텍스처를 lazy 처리하여 동기 파싱을 막지 않는다.
 *
 * 별도 polyfill은 적용하지 않았다(스파이크와 동일). 만약 빌드 후 TextDecoder 미정의 등으로
 * parse가 실패하면, 그때 text-encoding polyfill을 entry에 추가하는 것이 최소 변경이다.
 */
export async function loadUniverseGltf(): Promise<GLTF> {
  const asset = Asset.fromModule(MODEL);
  await asset.downloadAsync();

  const localUri = asset.localUri ?? asset.uri;
  if (!localUri) {
    throw new Error(
      "[loadUniverseGltf] GLB 에셋의 localUri를 확보하지 못했습니다.",
    );
  }

  const file = new File(localUri);
  const arrayBuffer = await file.arrayBuffer();

  const loader = new GLTFLoader();

  return await new Promise<GLTF>((resolve, reject) => {
    loader.parse(
      arrayBuffer,
      "",
      (gltf) => {
        resolve(gltf);
      },
      (error) => {
        reject(error);
      },
    );
  });
}
