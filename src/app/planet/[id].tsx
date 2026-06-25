import { useLocalSearchParams } from "expo-router";

import { PlanetChatScreen } from "@/pages/planet-chat";

export default function PlanetDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlanetChatScreen planetId={id ?? ""} />;
}
