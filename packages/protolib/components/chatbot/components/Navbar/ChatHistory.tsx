import { YStack, Text } from "tamagui";
import useChat, { priority, selectChatsHistory } from "../../store/store";
import ChatRef from "./ChatRef";

export default function ChatHistory({ onPressChat = () => {} }: { onPressChat?: () => void }) {
  const chatsHistory = useChat(selectChatsHistory);

  return (
    <YStack className="my-4 px-2 h-full text-gray-800 dark:text-[#ECECF1]">
      {Object.keys(chatsHistory).length > 0 &&
        Object.keys(chatsHistory)
          .sort((a, b) => priority.indexOf(a) - priority.indexOf(b))
          .map((month) => (
            <YStack key={month}>
              <Text my={8} pl={8} color="$color9" >
                {month}
              </Text>
              {chatsHistory[month].map((chat, i) => (
                <ChatRef key={`${chat.id}-${i}`} chat={chat} onPress={onPressChat} />
              ))}
            </YStack>
          ))}
      {Object.keys(chatsHistory).length === 0 && (
        <YStack ai="center" jc="center" h="100%">
          <Text >No chats yet</Text>
        </YStack>
      )}
    </YStack>
  );
}
