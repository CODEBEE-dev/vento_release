import { useEffect, useState } from "react"
import Navbar from "./components/Navbar/Navbar"
import DefaultIdeas from "./components/DefaultIdea/DefaultIdeas"
import UserQuery from "./components/UserInput/UserQuery"
import { Plus, RefreshCcw, Folder } from "lucide-react"
import useChat, { chatsLength, useSettings } from "./store/store"
import Chats from "./components/Chat/Chats"
import { useThemeSetting } from "@tamagui/next-theme"
import { Button, ScrollView, Stack, Text, TooltipSimple, XStack, YStack } from "@my/ui"

const applyTheme = (resolvedTheme) => {
  if (resolvedTheme === "light" && document.documentElement.classList.contains("dark")) {
    document.documentElement.classList.remove("dark")
  } else if (resolvedTheme === "dark" && !document.documentElement.classList.contains("dark")) {
    document.documentElement.classList.add("dark")
  }
}

type AppProps = {
  apiUrl: string
}

function App({ apiUrl }: AppProps) {
  const [active, setActive] = useState(false)
  const isChatsVisible = useChat(chatsLength)
  const currentChatId = useChat((state) => state.chats[0]?.id)
  const [currentTitle, setCurrentTitle] = useState("Chat")
  const addNewChat = useChat((state) => state.addNewChat)
  const { resolvedTheme } = useThemeSetting()
  const menu = true //toggle to show/hide the menu

  const setApiUrl = useSettings((state) => state.setApiUrl)

  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    if (apiUrl) {
      setApiUrl(apiUrl)
    }
  }, [apiUrl])

  useEffect(() => {
    try {
      if (!currentChatId) {
        setCurrentTitle("Chat")
        return
      }
      const stored = localStorage.getItem(currentChatId)
      if (!stored) {
        setCurrentTitle("Chat")
        return
      }
      const { title } = JSON.parse(stored)
      setCurrentTitle(title || "Chat")
    } catch (e) {
      setCurrentTitle("Chat")
    }
  }, [currentChatId])

  return (
    <Stack backgroundColor={resolvedTheme === "light" ? "" : "#212121"} f={1} className="h-screen flex flex-col">
      {
        menu ? <Navbar active={active} setActive={setActive} />
          : <Button onPress={addNewChat} icon={Plus}>
            New chat
          </Button>
      }

      <YStack flex={1} bc="$bgContent"  >
        <XStack w={"100%"} jc="space-between" ai="center" bbc="$color6" bbw={2} bc="$bgContent" p="$1">
          {
            menu && <TooltipSimple label="Chat History">
              <Button circular icon={Folder} scaleIcon={1.3} chromeless onPress={() => setActive(true)} />
            </TooltipSimple>
          }
          <Text col="$color">{currentTitle}</Text>
          <TooltipSimple label="Start New Chat">
            <Button circular icon={RefreshCcw} scaleIcon={1.3} chromeless onPress={addNewChat} />
          </TooltipSimple>
        </XStack>
        <ScrollView p="$2" pb="$8">
          {isChatsVisible ? <Chats /> : <DefaultIdeas />}
        </ScrollView>
        <YStack h="$5"></YStack>
        <YStack pos={"absolute"} bottom="$2" w="100%" px="$2">
          <UserQuery />
        </YStack>
      </YStack>
    </Stack>
  )
}

export default App
