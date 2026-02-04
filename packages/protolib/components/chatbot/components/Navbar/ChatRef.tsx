import { MessageSquare, Trash2, Pencil, Check, X } from "lucide-react";
import useChat, { isChatSelected } from "../../store/store";
import classNames from "classnames";
import { useEffect, useState } from "react";
import { InteractiveIcon } from "../../../InteractiveIcon";
import { Input, XStack, Text } from "tamagui";

export default function ChatRef({
  chat,
  onPress = () => { }
}: {
  chat: { id: string; title: string };
  onPress?: () => void;
}) {
  const viewSelectedChat = useChat((state) => state.viewSelectedChat);
  const isSelected = useChat(isChatSelected(chat.id));
  const [deleteChat, editChatsTitle] = useChat((state) => [
    state.handleDeleteChats,
    state.editChatsTitle,
  ]);
  const [editTitle, setEditTitle] = useState(chat.title);
  const [isHovering, setIsHovering] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const isTitleEditeble = isSelected && isEditingTitle;

  useEffect(() => {
    setIsEditingTitle(false);
  }, [isSelected]);

  function handleEditTitle(id: string, title: string) {
    if (title.trim() === "") {
      return;
    }
    setIsEditingTitle(false);
    setEditTitle(title);
    editChatsTitle(id, title);
  }

  return (
    <XStack
      onHoverIn={() => setIsHovering(true)}
      onHoverOut={() => setIsHovering(false)}
      bc={isSelected ? "$bgContent" : "transparent"}
      boc="$color6"
      p="$2"
      br="$4"
      ai="center"
      mb={"$1"}
      cursor="pointer"
      hoverStyle={{ bc: "$bgContent" }}
    >
      {!isTitleEditeble && (
        <XStack h={"36px"} f={1} ml="$2" gap="$2" ai="center"
          overflow="hidden"
          onPress={() => {
            viewSelectedChat(chat.id);
            onPress()
          }}
        >
          <XStack> <MessageSquare size={18} /> </XStack>
          <Text numberOfLines={1} fos={14} fow={"400"}>{editTitle ? editTitle : chat.title}</Text>
        </XStack>
      )}
      {isTitleEditeble && (
        < Input
          bc="transparent"
          bw={0}
          h={"$2"}
          width="100%"
          borderColor="transparent"
          focusStyle={{ borderColor: "transparent", outlineColor: "$colorTransparent" }}
          hoverStyle={{ borderColor: "transparent" }}
          mr="2px"
          value={editTitle}
          onChangeText={setEditTitle}
          autoFocus
        />
      )}
      {((isSelected && !isEditingTitle) || isHovering) && (
        <XStack>
          <InteractiveIcon Icon={Pencil} onPress={() => setIsEditingTitle(true)} />
          <InteractiveIcon Icon={Trash2} onPress={() => deleteChat(chat.id)} />
        </XStack>
      )}
      {isSelected && isEditingTitle && (
        <XStack>
          <InteractiveIcon IconColor="var(--green9)" Icon={Check} onPress={() => handleEditTitle(chat.id, editTitle)} />
          <InteractiveIcon IconColor="var(--red9)" Icon={X} onPress={() => setIsEditingTitle(false)} />
        </XStack>
      )}
    </XStack>
  );
}
