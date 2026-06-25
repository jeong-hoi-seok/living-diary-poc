const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// 3D 모델 파일을 Metro가 정적 에셋으로 번들링하도록 확장자 등록.
// gltf/bin/텍스처 png는 기본 assetExts에 포함되지만 glb는 누락되어 require 시 해석 실패.
config.resolver.assetExts.push("glb", "gltf");

// --- three.js WebGPU 빌드 리졸브 (react-native-webgpu + WebGPURenderer 스파이크용) ---
// three의 기본 엔트리는 WebGL 빌드라 THREE.WebGPURenderer가 없다.
// react-native-webgpu 공식 example의 metro.config.js와 동일하게,
// "three" / "three/webgpu" 를 build/three.webgpu.js 로 강제 리졸브해야 WebGPURenderer가 잡힌다.
// (근거: github.com/wcandillon/react-native-webgpu apps/example/metro.config.js)
const threePackagePath = path.resolve(__dirname, "node_modules/three");
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "three" || moduleName === "three/webgpu") {
    return {
      filePath: path.resolve(threePackagePath, "build/three.webgpu.js"),
      type: "sourceFile",
    };
  }
  if (moduleName === "three/tsl") {
    return {
      filePath: path.resolve(threePackagePath, "build/three.tsl.js"),
      type: "sourceFile",
    };
  }
  if (moduleName.startsWith("three/addons/")) {
    // 주의: import가 이미 ".js"를 포함하므로(`three/addons/loaders/GLTFLoader.js`)
    // 무조건 ".js"를 덧붙이면 "...GLTFLoader.js.js"가 되어 존재하지 않는 경로 → SHA-1 실패.
    // 끝의 ".js"를 먼저 제거한 뒤 한 번만 붙인다. 결과는 실재하는 examples/jsm/*.js 경로.
    const sub = moduleName.replace("three/addons/", "").replace(/\.js$/, "");
    return {
      filePath: path.resolve(threePackagePath, `examples/jsm/${sub}.js`),
      type: "sourceFile",
    };
  }
  // 나머지는 기본 리졸버(있으면)에 위임, 없으면 Metro 기본 동작.
  if (typeof defaultResolveRequest === "function") {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./styles/global.css" });
