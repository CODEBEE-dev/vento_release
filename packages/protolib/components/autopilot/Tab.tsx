import { YStack, Text } from "@my/ui"

export const TabTitle = ({ tabname, tabDescription }: { tabname: String, tabDescription?: string }) => {
  return <YStack h="fit-content" w="fit-content">
    <Text fontSize={"$8"} fontWeight={"400"}>{tabname}</Text>
    <Text fontSize={"$5"} fontWeight={"300"} color="$gray10">{tabDescription}</Text>
  </YStack>
}

export const TabContainer = ({ children, ...props }) => {
  return <YStack w="100%" h="100%" gap="$5" px="$3" py="$2" flex={1} jc="flex-start" ai="flex-start" {...props}>
    {children}
  </YStack>
}