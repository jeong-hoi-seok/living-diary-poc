import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center gap-2 p-6">
        <Text className="text-2xl font-bold text-neutral-900">
          living-diary-poc
        </Text>
        <Text className="text-base text-neutral-500">
          살아있는 다이어리 · Expo + NativeWind + FSD
        </Text>
      </View>
    </SafeAreaView>
  );
}
