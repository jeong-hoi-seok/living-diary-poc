import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import "../../styles/global.css";

export default function RootLayout() {
  return (
    // react-native-gesture-handler v2는 제스처를 처리하려면 트리 최상단을
    // GestureHandlerRootView로 감싸야 한다. expo-router가 자체 루트를 두긴 하지만
    // 공식 가이드대로 명시적으로 감싸는 편이 플랫폼 간 동작이 확실하다.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}
