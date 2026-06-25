import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SceneViewer } from "@/widgets/scene-viewer";

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-white">
      {/* 3D 씬을 화면 전체로 채운다. */}
      <SceneViewer />

      {/*
        타이틀/설명은 화면 하단에 떠 있는 오버레이. pointerEvents="none"으로 두어
        터치(회전/줌 제스처, 줌 버튼)가 그대로 씬으로 전달되게 한다.
      */}
      <SafeAreaView
        edges={["bottom"]}
        pointerEvents="none"
        className="absolute inset-x-0 bottom-0"
      >
        <View className="items-center gap-1 px-6 pb-6">
          <Text className="text-2xl font-bold text-neutral-900">
            Living Diary
          </Text>
          <Text className="text-sm text-neutral-500">살아있는 다이어리</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
