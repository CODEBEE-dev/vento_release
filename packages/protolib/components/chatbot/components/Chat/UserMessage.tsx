import { useState, useRef, useEffect } from "react";
import { PenIcon } from "lucide-react";
import { XStack, YStack, Button, TextArea, Text } from "tamagui";
import useChat, { ChatMessageType } from "../../store/store";
import { Tinted } from "../../../../components/Tinted";
import { InteractiveIcon } from "../../../../components/InteractiveIcon";

type Props = {
  chat: ChatMessageType;
  chatIndex: number;
};

export default function UserMessage({ chat, chatIndex }: Props) {
  const [edit, setEdit] = useState(false);
  const [updatedQuery, setUpdatedQuery] = useState(chat.content);
  const [isHovering, setIsHovering] = useState(false);
  const editTextareaRef = useRef<any>(null);
  const [editChatMessage, resetChatAt] = useChat((state) => [
    state.editChatMessage,
    state.resetChatAt,
  ]);

  function handleChatEdit() {
    editChatMessage(updatedQuery, chatIndex);
    resetChatAt(chatIndex + 1);
    setEdit(false);
  }
  useEffect(() => {
    if (edit && editTextareaRef.current) {
      editTextareaRef.current.style.height =
        editTextareaRef.current.scrollHeight + "px";
    }
  }, [edit]);

  return (
    <YStack p="$3" gap="$2" ai="flex-end">
      <XStack
        jc="flex-end"
        ai="center"
        gap="$2"
        width={"100%"}
      >
        {!edit ? (
          <YStack
            maxWidth={"100%"} gap="$2" ai="flex-end" onHoverIn={() => setIsHovering(true)} onHoverOut={() => setIsHovering(false)}>
            <YStack
              bg="$bgPanel"
              br="$6"
              p={"10px"}
            >
              <Text fos="$5"> {chat.content}</Text>
            </YStack>
            <InteractiveIcon
              alignSelf="flex-end"
              o={isHovering ? 1 : 0}
              Icon={PenIcon}
              onPress={() => setEdit((prev) => !prev)}
            />
          </YStack>
        ) : (
          <YStack backgroundColor={"$bgPanel"} flex={1} width={"100%"} p="$4" ai="flex-end" br="$6" gap="$3">
            <TextArea
              p={0}
              fos="$5"
              backgroundColor={"transparent"}
              spellCheck={false}
              ref={editTextareaRef}
              value={updatedQuery}
              onChangeText={(val) => {
                setUpdatedQuery(val);
                const el = editTextareaRef.current;
                if (el) {
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }
              }}
              autoFocus
              multiline
              rows={1}
              borderWidth={0}
              focusStyle={{ outlineWidth: 0 }}
              w="100%"
              minHeight={0}
              h="auto"
            />
            {edit && (
              <XStack gap="$2">
                <Button fow="500" w="$8" size="$3" bc="$gray6" hoverStyle={{ bc: "$gray2" }} onPress={() => setEdit(false)}>
                  Cancel
                </Button>
                <Button fow="500" w="$8" size="$3" themeInverse bc="$gray6" hoverStyle={{ bc: "$gray4" }} onPress={handleChatEdit}>
                  Save
                </Button>
              </XStack>
            )}
          </YStack>
        )}
      </XStack>

    </YStack>
  );
}