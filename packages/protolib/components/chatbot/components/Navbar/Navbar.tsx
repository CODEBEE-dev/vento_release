import { X, Plus, ChevronDown, ChevronUp, Check } from "lucide-react";
import useChat, { ModalList, useAuth, useSettings } from "../../store/store";
import { Adapt, Button, ScrollView, Select, Sheet, XStack, YStack } from "tamagui";
import ChatHistory from "./ChatHistory";

export default function Navbar({ active, setActive, }: { active: boolean; setActive: (v: boolean) => void; }) {

  const addNewChat = useChat((state) => state.addNewChat);
  const [selectedModal, modalsList, setModal] = useSettings((state) => [state.settings.selectedModal, state.modalsList, state.setModal]);
  const name = useAuth((state) => state.user.name);

  const groupedModels = modalsList.reduce(
    (obj: Record<string, string[]>, modal) => {
      const prefix = modal.split("-")[0] + "-" + modal.split("-")[1];
      return {
        ...obj,
        [prefix]: [...(obj[prefix] || []), modal],
      };
    },
    {}
  );

  return (
    <YStack
      overflow="hidden"
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={30}
      backgroundColor={active ? "$colorTransparent" : "transparent"}
      opacity={active ? 1 : 0}
      pointerEvents={active ? "auto" : "none"}
      animation="quick"
      enterStyle={{ opacity: 0 }}
      exitStyle={{ opacity: 0 }}
      transition="opacity 0.5s"
    >
      <YStack
        bc="$bgPanel"
        p="$3"
        w="400px"
        maw="80vw"
        h="100%"
        overflow="hidden"
        elevation="$2"
        gap="$2"
        shadowColor="$shadowColor"
      >
        <XStack jc="space-between" ai="center">
          <Button
            bc="$bgContent"
            hoverStyle={{ bc: "$bgContent", filter: "brightness(1.2)" }}
            icon={Plus}
            onPress={() => {
              addNewChat();
              setActive(false);
            }}
          >
            New Chat
          </Button>
          <Button
            hoverStyle={{ bg: "$color8" }}
            circular
            chromeless
            scaleIcon={1.3}
            icon={X}
            onPress={() => setActive(false)}
          />
        </XStack>
        <ScrollView>
          <ChatHistory onPressChat={() => setActive(false)} />
        </ScrollView>
        <Select
          value={selectedModal}
          onValueChange={(value) => setModal(value as ModalList)}
          disablePreventBodyScroll
        >
          <Select.Trigger
            iconAfter={ChevronDown}
            bc="$bgContent"
            hoverStyle={{
              bc: "$bgContent",
              filter: "brightness(1.2)",
            }}
          >
            <Select.Value placeholder="Select model..." />
          </Select.Trigger>

          <Adapt when="sm" platform="touch">
            <Sheet
              modal
              dismissOnSnapToBottom
              animationConfig={{
                type: "spring",
                damping: 20,
                mass: 1.2,
                stiffness: 250,
              }}
            >
              <Sheet.Frame>
                <Sheet.ScrollView>
                  <Adapt.Contents />
                </Sheet.ScrollView>
              </Sheet.Frame>
              <Sheet.Overlay
                animation="lazy"
                enterStyle={{ opacity: 0 }}
                exitStyle={{ opacity: 0 }}
              />
            </Sheet>
          </Adapt>
          <Select.Content zIndex={999999}>
            <Select.ScrollUpButton
              ai="center"
              jc="center"
              position="relative"
              width="100%"
              height="$3"
            >
              <YStack zIndex={10}>
                <ChevronUp size={20} />
              </YStack>
            </Select.ScrollUpButton>

            <Select.Viewport>
              {Object.keys(groupedModels).map((group) => (
                <Select.Group key={group}>
                  <Select.Label o={0.6}>{group.toUpperCase()}</Select.Label>
                  {groupedModels[group].map((modal, index) => (
                    <Select.Item key={modal} index={index} value={modal} pl="$8">
                      <Select.ItemText>{modal}</Select.ItemText>
                      <Select.ItemIndicator marginLeft="auto">
                        <Check size={16} />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Group>
              ))}
            </Select.Viewport>

            <Select.ScrollDownButton
              ai="center"
              jc="center"
              position="relative"
              width="100%"
              height="$3"
            >
              <YStack zIndex={10}>
                <ChevronDown size={20} />
              </YStack>
            </Select.ScrollDownButton>
          </Select.Content>
        </Select>
      </YStack>
    </YStack>
  );
}
