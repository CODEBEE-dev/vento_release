import { YStack, Text } from '@my/ui'
import { Tinted } from 'protolib/components/Tinted'
import { InternalIcon } from 'protolib/components/InternalIcon'

export const TemplateCard = ({ template, isSelected, onPress }) => {

    return (
        <Tinted>
            <YStack
                id={"template-card-" + template.id}
                onPress={onPress}
                height={"180px"}
                width={"357px"}
                overflow='hidden'
                borderWidth={isSelected ? "$1" : "$0.5"}
                borderColor={isSelected ? "$color7" : "$gray8"}
                backgroundColor={isSelected ? "$color3" : ""}
                cursor='pointer'
                borderRadius={"$3"}
                justifyContent='center'
                alignItems='center'
                padding="$4"
            >
                <InternalIcon size={35} color="var(--color8)" name={template.icon ?? "layout-dashboard"} />
                <Text ta='center' marginBottom="$2" marginTop="$4">{template.name ?? template.id}</Text>
                <Text ta='center' fontWeight="300" opacity={0.4}>{template.description}</Text>
            </YStack>
        </Tinted>
    )
}
