module.exports = (api) => {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Reanimated 4 / SDK 54의 react-native-worklets 플러그인은 babel-preset-expo가 자동 주입한다.
  };
};
