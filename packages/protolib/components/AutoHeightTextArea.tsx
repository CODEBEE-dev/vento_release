import React, { useRef, useState, useLayoutEffect, useEffect } from 'react'
import { TextArea } from '@my/ui'
import { XStack, YStack, Button, Spinner } from '@my/ui'
import { Trash, Plus, Mic } from '@tamagui/lucide-icons'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const minHeight = 50;
const maxHeight = 300;

export const AutoHeightTextArea = ({
    value,
    speechRecognition,
    onChange,
    onKeyDown,
    readOnly,
    placeholder,
    style,
    ...rest
}) => {
    const ref = useRef(null);
    const [speechRecognitionEnabled, setSpeechRecognitionEnabled] = useState(false);
    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
      } = useSpeechRecognition();

    const adjustHeight = () => {
        const textarea = ref.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
            const scrollHeight = textarea.scrollHeight;
            textarea.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
            textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
        }
    };

    useLayoutEffect(() => {
        adjustHeight();
    }, [value]);

    // El hack: Espera a que se estabilice el DOM
    useEffect(() => {
        setTimeout(() => {
            adjustHeight();
        }, 0);
    }, []);

    useEffect(() => {
        if (speechRecognitionEnabled && transcript) {
            onChange({ target: { value: transcript } });
            adjustHeight();
        }
    }, [transcript, speechRecognitionEnabled]);

    return (
        <XStack f={1} gap="$3" ai="flex-end">
            <textarea
                ref={ref}
                readOnly={readOnly}
                value={value}
                placeholder={placeholder}
                onChange={onChange}
                onKeyDown={onKeyDown}
                spellCheck={false}
                style={{
                    lineHeight: '1.4',
                    width: '100%',
                    resize: 'none',
                    overflowY: 'hidden',
                    minHeight: `${minHeight}px`,
                    maxHeight: `${maxHeight}px`,
                    boxSizing: 'border-box',
                    border: '1px solid var(--color6)',
                    borderRadius: '8px',
                    padding: '10px',
                    backgroundColor: 'var(--color3)',
                    ...style,
                }}
                {...rest}
            />
            {speechRecognition && browserSupportsSpeechRecognition && <XStack cursor="pointer" onPress={() => {
                if (speechRecognitionEnabled) {
                    setSpeechRecognitionEnabled(false);
                    SpeechRecognition.stopListening();
                    // Stop speech recognition logic here
                } else {
                    resetTranscript();
                    setSpeechRecognitionEnabled(true);
                    SpeechRecognition.startListening({ continuous: true });
                    // Start speech recognition logic here
                }
            }} gap="$2" h="fit-content" w="fit-content" backgroundColor={speechRecognitionEnabled ? "$red6" : "$gray4"} p="$3" jc="center"
                ai="center" hoverStyle={{ opacity: 0.9 }} pressStyle={{ opacity: 1.0 }}
                br="$3">
                <Mic size={"$1"} />
            </XStack>}
        </XStack>
    );
};