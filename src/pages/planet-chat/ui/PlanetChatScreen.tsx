import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Message = {
  id: string;
  role: "me" | "planet";
  text: string;
};

type PlanetChatScreenProps = {
  /** "Planet1" ~ "Planet5". */
  planetId: string;
};

/** "Planet3" → "행성 3". 매칭 안 되면 원문 그대로. */
function planetLabel(planetId: string): string {
  const n = planetId.match(/\d+/)?.[0];
  return n ? `행성 ${n}` : planetId;
}

/**
 * 행성 디테일 = 채팅방 화면. 지금은 백엔드 없이 로컬 상태만으로 동작하는 간단한 UI.
 * 상단에 뒤로가기 + 행성 이름, 가운데 메시지 목록, 하단 입력창.
 */
export function PlanetChatScreen({ planetId }: PlanetChatScreenProps) {
  const router = useRouter();
  const label = planetLabel(planetId);

  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "planet", text: `안녕, 나는 ${label}이야. 오늘 어땠어?` },
  ]);
  const [draft, setDraft] = useState("");

  const send = () => {
    const text = draft.trim();
    if (!text) {
      return;
    }
    setMessages((prev) => [
      ...prev,
      { id: String(prev.length), role: "me", text },
    ]);
    setDraft("");
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      {/* 헤더: 뒤로가기 + 행성 이름 */}
      <View className="flex-row items-center gap-2 border-neutral-200 border-b px-2 py-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          hitSlop={12}
          className="h-10 w-10 items-center justify-center"
        >
          <Text className="text-2xl text-neutral-900">‹</Text>
        </Pressable>
        <Text className="font-bold text-lg text-neutral-900">{label}</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerClassName="gap-2 p-4"
          renderItem={({ item }) => (
            <View
              className={
                item.role === "me"
                  ? "max-w-[80%] self-end rounded-2xl bg-neutral-900 px-4 py-2"
                  : "max-w-[80%] self-start rounded-2xl bg-neutral-100 px-4 py-2"
              }
            >
              <Text
                className={
                  item.role === "me" ? "text-white" : "text-neutral-900"
                }
              >
                {item.text}
              </Text>
            </View>
          )}
        />

        {/* 입력창 */}
        <View className="flex-row items-center gap-2 border-neutral-200 border-t p-3">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="메시지 입력"
            placeholderTextColor="#a3a3a3"
            className="flex-1 rounded-full bg-neutral-100 px-4 py-2 text-neutral-900"
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable
            onPress={send}
            accessibilityRole="button"
            accessibilityLabel="전송"
            className="h-10 items-center justify-center rounded-full bg-neutral-900 px-4"
          >
            <Text className="font-bold text-white">전송</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
