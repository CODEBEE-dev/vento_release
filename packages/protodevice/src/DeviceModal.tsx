import React, { useEffect, useRef, useState } from "react";
import { AlertDialog } from 'protolib/components/AlertDialog'
import { Tinted } from 'protolib/components/Tinted'
import { Switch, useThemeName, Input, Progress } from '@my/ui'
import { Maximize, Minimize, Upload, X, SearchCode, RefreshCcw, Download, LayoutDashboard, Wifi, Usb } from '@tamagui/lucide-icons'
import { Button, YStack, Text, XStack, TextArea } from "@my/ui"
import { EspWebInstall } from "./EspWebInstall"
import { EspConsole } from "./espConsole";

const DriversNote = () => {

    const Link = (props, style) => {
        return <Tinted><a
            target="_blank"
            onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none'
            }}
            {...props}
        /></Tinted>
    }

    const drivers = [
        { os: 'Windows', link: 'https://www.silabs.com/documents/public/software/CP210x_Windows_Drivers.zip' },
        { os: 'Mac', link: 'https://www.silabs.com/documents/public/software/Mac_OSX_VCP_Driver.zip' },
        { os: 'other OS', link: 'https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers?tab=downloads' }
    ]

    return <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <Text fontWeight="600">{"Note: "}</Text>
        <Text >{"If you don't see your device on the menu, download the device drivers on "}</Text>
        {drivers.map((driver, index) => (
            <Link style={{ color: "var(--color8)" }} key={index} href={driver.link}>
                {`${driver.os}${index < drivers.length - 1 ? ", " : ""}`}
            </Link>
        ))}
        {"."}
    </div>
}

const DeviceModal = ({
  eraseBeforeFlash,
  setEraseBeforeFlash,
  consoleOutput,
  stage,
  onCancel,
  onSelect,
  showModal,
  modalFeedback,
  selectedDevice,
  compileSessionId,
  onSelectAction,
  logSource, // 'mqtt' | 'usb' | null | undefined
  disconnectInfo,
  compileMessages = [],
  uploadMethod,
  onSelectUploadMethod,
  otaHost,
  onOtaHostChange,
  onStartOtaUpload,
  otaProgress = 0,
  otaReachable,
  otaCheckingReachability = false,
  hasOtaFeature = false, // Whether device supports OTA updates
  compileBusyMessage,
}) => {    
    const [fullscreen, setFullscreen] = useState(false);
    const [manifestUrl, setManifestUrl] = useState(null)
    const isError = modalFeedback?.details?.error
    const isLoading = ['write'].includes(stage) && !isError && !modalFeedback?.message?.includes('Please hold "Boot"')
    const themeName = useThemeName();
    const compileLogRef = useRef<HTMLTextAreaElement | null>(null);
    const stickToBottomRef = useRef(true);
    const stages = {
        'yaml': 'Uploading yaml to the project...',
        'compile': 'Compiling firmware...',
        'select-action': 'What do you want to do?',
        'upload': 'Choose how to upload firmware to your device.',
        'upload-method': 'Connect your device and click select to chose the port.',
        'ota-upload': 'Uploading firmware via WiFi (OTA)...',
        'write': 'Writting firmware to device. Please do not unplug your device.',
        "confirm-erase": 'Do you want to erase the device before installing the firmware?',
        'idle': 'Device configured successfully.\nYou can unplug your device.'
    }

    const images = {
        "light": {
            "compile": "images/device/protofitoCompiling.gif",
            "loading": "images/device/protofitoLoading.gif",
            "idle": "images/device/protofitoDancing.gif"
        },
        "dark": {
            "compile": "images/device/protofitoCompilingW.gif",
            "loading": "images/device/protofitoLoadingW.gif",
            "idle": "images/device/protofitoDancingW.gif"
        }
    }

    useEffect(() => {
        const fetchManifestUrl = async () => {
            if (stage === 'upload') {
                try {
                    const url = await selectedDevice?.getManifestUrl(compileSessionId);
                    setManifestUrl(url);
                } catch (error) {
                    console.error("Error fetching manifest URL:", error);
                }
            }
        };

        fetchManifestUrl();
    }, [stage, selectedDevice, compileSessionId]);

    useEffect(() => {
        if (!showModal) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showModal, onCancel]);

    useEffect(() => {
        if (stage === 'compile' && fullscreen && compileLogRef.current && stickToBottomRef.current) {
            compileLogRef.current.scrollTop = compileLogRef.current.scrollHeight;
        }
    }, [compileMessages, stage, fullscreen]);

    useEffect(() => {
        // Reset autoscroll when re-entering compile or toggling fullscreen
        stickToBottomRef.current = true;
    }, [stage, fullscreen]);

    const boardHref = selectedDevice?.data?.name
        ? `/workspace/boards/view?board=${encodeURIComponent(selectedDevice.data.name)}#dashboard`
        : null;

    return <AlertDialog open={showModal} hideAccept={true}>
        <YStack
            height={stage == 'console' || fullscreen ? "80vh" : "450px"}
            width={stage == 'console' || fullscreen ? "80vw" : "500px"}
            padding={"$3"}
            gap={"$6"}
            justifyContent="space-between"
        >
            {!["console"].includes(stage) &&
                <XStack justifyContent="center" alignItems="center" >
                    <Text fontWeight="600" fontSize="xs" textAlign='center'>
                        {`[${Object.keys(stages).indexOf(stage)}/${Object.keys(stages).length}]`}
                    </Text>
                    {/* Fullscreen toggle */}
                    <Button
                        position="absolute"
                        left={0}
                        size="$2"
                        icon={fullscreen ? <Minimize size="$1" /> : <Maximize size="$1" />}
                        onPress={() => setFullscreen(prev => !prev)}
                        backgroundColor="transparent"
                        pressStyle={{ scale: 1.1 }}
                        hoverStyle={{ opacity: 0.7 }}
                        padding="$2"
                        paddingVertical="$4"
                    />
                    <Button
                        position="absolute"
                        right={0}
                        size={"$3"}
                        theme="red"
                        circular
                        icon={X}
                        onPress={() => onCancel()}
                    />
                </XStack>
            }
            {stage === 'console'
                ? <EspConsole
                    consoleOutput={consoleOutput}
                    deviceName={selectedDevice?.getId?.()}
                    onCancel={() => {
                        onCancel()
                        setFullscreen(false)
                    }}
                    showReset={logSource === 'usb'}
                    disconnectInfo={disconnectInfo}
                />
                : <YStack flex={1} maxHeight="100%" overflow="hidden">
                    {stage === 'compile' && compileBusyMessage && (
                        <YStack
                            width="100%"
                            mb="$2"
                            p="$2"
                            br="$3"
                            backgroundColor="$color2"
                            ai="center"
                        >
                            <Text fontSize="$3" textAlign="center" fontWeight="600">
                                {compileBusyMessage}
                            </Text>
                        </YStack>
                    )}
                    {isError ? (
                        <YStack
                            flex={1}
                            gap="$3"
                            maxHeight="100%"
                            width="100%"
                            ai="center"
                            jc="center"
                            py="$3"
                            overflow="auto"
                        >
                            <YStack width="100%" flex={1} maxHeight="100%" overflow="auto" jc="center">
                                {modalFeedback?.message
                                    ? (typeof modalFeedback?.message === 'string'
                                        ? <Text color="red" textAlign="center">{modalFeedback.message}</Text>
                                        : modalFeedback.message)
                                    : <Text fontWeight={"600"} textAlign="center" color={'red'}>
                                        {stages[stage]}
                                      </Text>
                                }
                            </YStack>
                        </YStack>
                    ) : (
                        <YStack justifyContent="center" flex={1} gap={"$2"} maxHeight="100%">
                            {!(stage === 'compile' && fullscreen) && (
                                <Text fontWeight={"600"} textAlign="center" color={isError ? 'red' : ''}>
                                    {modalFeedback && ['write', 'compile', 'upload', 'yaml'].includes(stage)
                                        ? modalFeedback.message
                                        : stages[stage]
                                    }
                                </Text>
                            )}
                            {stage === 'compile' && fullscreen && (
                                <TextArea
                                    ref={compileLogRef}
                                    value={(compileMessages ?? []).join("\n")}
                                    f={1}
                                    minHeight={180}
                                    maxHeight="100%"
                                    overflow="auto"
                                    textAlign="left"
                                    resize="none"
                                    readOnly
                                    onScroll={(e) => {
                                        const target = e.currentTarget;
                                        const { scrollTop, scrollHeight, clientHeight } = target;
                                        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
                                        stickToBottomRef.current = distanceFromBottom < 20;
                                    }}
                                />
                            )}
                            {stage === 'idle' && boardHref && (
                                <XStack jc="center" gap="$2" pt="$2">
                                    <Button
                                        icon={LayoutDashboard}
                                        onPress={() => {
                                            onCancel();
                                            if (typeof window !== 'undefined') {
                                                window.location.assign(boardHref);
                                            }
                                        }}
                                    >
                                        Open device board
                                    </Button>
                                </XStack>
                            )}
                            {
                                !(stage === 'compile' && fullscreen) && !isError && images[themeName] && images[themeName][isLoading ? 'loading' : stage] && (
                                    <img
                                        alt="protofito dancing"
                                        style={{
                                            height: isLoading ? "200px" : "180px",
                                            width: isLoading ? "300px" : "190px",
                                            alignSelf: "center",
                                            objectFit: 'cover',
                                            paddingTop: "20px"
                                        }}
                                        src={`/public/${images[themeName][isLoading ? 'loading' : stage]}`}
                                    />
                                )}
                        </YStack>
                    )}
                    {stage == "confirm-erase" && !isError &&
                        <YStack mt={"$8"} width={"100%"} f={1} alignItems="center" jc={"center"} gap="$2">
                            <XStack alignItems="center" gap="$2">
                                <Text>Erase device</Text>
                                <Tinted>
                                    <Switch
                                        value={eraseBeforeFlash}
                                        onCheckedChange={setEraseBeforeFlash}
                                        defaultChecked={false}
                                    >
                                        <Switch.Thumb backgroundColor="black" />
                                    </Switch>
                                </Tinted>
                            </XStack>
                            <Text fontSize={"$2"} color={"$gray10"} textAlign="center" mt="$2">
                                Enable this option if the device was previously flashed with different firmware or is experiencing issues. Warning: this will erase all previously saved values on device memory.
                            </Text>
                        </YStack>
                    }
                    {stage === 'upload-method' && !isError && <DriversNote />}
                </YStack>
            }
            {
                (stage == 'select-action' && !isError) &&
                <XStack gap="$3" flex={1} justifyContent="center">
                    <Tinted>
                        <Button icon={Upload} onPress={() => onSelectAction("confirm-erase")}>{`Install ${selectedDevice.getId()} firmware`}</Button>
                        <Button icon={SearchCode} onPress={() => onSelectAction("console")}>Watch logs</Button>
                    </Tinted>
                </XStack>
            }
            {
                (stage == 'upload' && !isError && onSelectUploadMethod) &&
                <YStack gap="$4" flex={1} ai="center" jc="center">
                    <Text fontWeight="600" textAlign="center" mb="$2">Choose upload method</Text>
                    <XStack gap="$3" jc="center" flexWrap="wrap">
                        <Tinted>
                            {hasOtaFeature && (
                                <Button
                                    icon={Wifi}
                                    onPress={() => onSelectUploadMethod("ota")}
                                    minWidth={180}
                                    disabled={otaCheckingReachability || otaReachable === false}
                                    opacity={otaCheckingReachability || otaReachable === false ? 0.5 : 1}
                                >
                                    {otaCheckingReachability ? "Checking..." : "WiFi (OTA)"}
                                </Button>
                            )}
                            <Button
                                icon={Usb}
                                onPress={() => onSelectUploadMethod("usb")}
                                minWidth={180}
                            >
                                USB Cable
                            </Button>
                        </Tinted>
                    </XStack>
                    {hasOtaFeature && otaReachable === false && !otaCheckingReachability && (
                        <Text color="$red10" fontSize="$2" textAlign="center" mt="$2">
                            Device not reachable via WiFi. Make sure it's powered on and connected to the network.
                        </Text>
                    )}
                    {hasOtaFeature && otaReachable === true && !otaCheckingReachability && (
                        <Text color="$green10" fontSize="$2" textAlign="center" mt="$2">
                            Device is reachable via WiFi ({otaHost})
                        </Text>
                    )}
                    {hasOtaFeature && otaCheckingReachability && (
                        <Text opacity={0.7} fontSize="$2" textAlign="center" mt="$2">
                            Checking if device is reachable...
                        </Text>
                    )}
                    {!hasOtaFeature && (
                        <Text opacity={0.6} fontSize="$2" textAlign="center" mt="$2">
                            WiFi (OTA) upload not available for this device.
                        </Text>
                    )}
                </YStack>
            }
            {
                (stage == 'ota-upload' && !isError) &&
                <YStack gap="$3" flex={1} ai="center" jc="center" px="$4">
                    {otaProgress > 0 && otaProgress < 100 && (
                        <YStack w="100%" gap="$2">
                            <Progress value={otaProgress} max={100}>
                                <Progress.Indicator animation="bouncy" />
                            </Progress>
                            <Text textAlign="center" fontSize="$3">{otaProgress}%</Text>
                        </YStack>
                    )}
                </YStack>
            }

            <XStack style={{ display: ["console"].includes(stage) ? "none" : "flex" }} justifyContent="center" gap={"$4"}>
                {
                    (!["write", "idle", "upload", "upload-method", "ota-upload", "compile"].includes(stage) || isError) &&
                    <Button onPress={() => {
                        onCancel()
                        setFullscreen(false)
                    }}>Cancel</Button>
                }
                {
                    stage == 'upload-method' &&
                    <Button backgroundColor={"black"} color={"white"} onPress={() => onSelect()}>Select</Button>
                }
                {
                    stage == 'confirm-erase' &&
                    <Button backgroundColor={"black"} color={"white"} onPress={() => onSelectAction("write")}>Accept</Button>
                }
                {/* {
                        (stage == 'upload' && manifestUrl) &&
                        <EspWebInstall.ModalButton onPress={() => onCancel()} manifestUrl={manifestUrl} />
                    } */}
                {
                    stage == 'idle' &&
                    <Button backgroundColor="black" color={"white"} onPress={() => onCancel()}>Done !</Button>
                }
            </XStack>
        </YStack>
    </AlertDialog >
}

export default DeviceModal
