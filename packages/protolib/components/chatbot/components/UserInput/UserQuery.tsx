import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { Input, XStack, YStack, Button } from "tamagui";
import useChat, { useSettings } from "../../store/store";
import { createMessage } from "../../utils/createMessage";
import { Tinted } from "protolib/components/Tinted";

export default function UserQuery() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<any>(null);
  const addChat = useChat((state) => state.addChat);
  const selectedModal = useSettings((state) => state.settings.selectedModal);

  async function handleSubmit() {
    if (query.trim()) {
      addChat(createMessage("user", query.trim(), "text"));
      addChat(
        createMessage(
          "assistant",
          "",
          selectedModal.startsWith("dall-e") ? "image_url" : "text"
        )
      );
      setQuery("");
    }
  }

  return (
    <XStack
      ai="center"
      jc="space-between"
      gap="$2"
      bc="$bgPanel"
      p="$2"
      br="$10"
    >
      <YStack flex={1}>
        <Input
          bc="transparent"
          ref={inputRef}
          value={query}
          placeholder="Send a message"
          borderColor="transparent"
          focusStyle={{ borderColor: "transparent", outlineColor: "$colorTransparent" }}
          hoverStyle={{ borderColor: "transparent" }}
          autoFocus
          onChangeText={setQuery}
          onSubmitEditing={handleSubmit}
        />
      </YStack>
      <Tinted>
        <Button
          icon={Send}
          circular
          onPress={handleSubmit}
          backgroundColor={query ? "var(--color5)" : "transparent"}
          color={query ? "var(--color8)" : "var(--gray11)"}
        />
      </Tinted>
    </XStack>
  );
}
