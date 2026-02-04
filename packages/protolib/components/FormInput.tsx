import { Input, XStack, InputProps } from "tamagui"
import { Eye, EyeOff } from '@tamagui/lucide-icons'
import { InteractiveIcon } from "./InteractiveIcon"
import { useState } from "react"
import { Tinted } from "./Tinted"

type FormInputProps = {
    defaultVisible?: boolean,
    secureTextEntry?: boolean
} & InputProps

export const FormInput = ({ defaultVisible = false, secureTextEntry, ...props }: FormInputProps) => {
    const [visible, setVisible] = useState(defaultVisible)

    return <XStack f={1} ai="center" >
        <Input placeholderTextColor="$gray9" f={1} secureTextEntry={secureTextEntry ? !visible : false} pr={"$7"} {...props} />
        {
            secureTextEntry
            && <Tinted>
                <InteractiveIcon
                    pos="absolute"
                    right={"$2"}
                    IconColor={visible ? 'var(--color10)' : 'var(--gray9)'}
                    als="center"
                    onPress={() => setVisible(!visible)} Icon={visible ? Eye : EyeOff}
                />
            </Tinted>
        }
    </XStack>
}