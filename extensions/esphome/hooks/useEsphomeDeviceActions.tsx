import React, { useCallback, useEffect, useRef, useState } from "react";
import { Paragraph, TextArea, XStack, YStack, Text, Button } from "@my/ui";
import { API } from "protobase";
import { useSubscription, Connector } from "protolib/lib/mqtt";
import DeviceModal from "protodevice/src/DeviceModal";
import { DevicesModel } from "@extensions/devices/devices/devicesSchemas";
import { parse as parseYaml } from "yaml";
import {
  connectSerialPort,
  onlineCompilerSecureWebSocketUrl,
  postYamlApiEndpoint,
  compileActionUrl,
  compileMessagesTopic,
  downloadDeviceFirmwareEndpoint,
  flash,
} from "@extensions/esphome/utils";

type DeviceModalStage =
  | "yaml"
  | "compile"
  | "write"
  | "upload"
  | "upload-method"
  | "ota-upload"
  | "idle"
  | "select-action"
  | "confirm-erase"
  | "done"
  | "console";

type UploadMethod = "usb" | "ota";

const MqttTest = ({
  onSetStage,
  onSetModalFeedback,
  compileSessionId,
  stage,
  onSetCompileMessages,
}: {
  onSetStage: (stage: DeviceModalStage | "") => void;
  onSetModalFeedback: (feedback: any) => void;
  compileSessionId: string;
  stage: DeviceModalStage | "";
  onSetCompileMessages: (messages: string[]) => void;
}) => {
  const [messages, setMessages] = React.useState<string[]>([]);
  const messagesRef = React.useRef<string[]>([]);
  const lastProcessedRef = React.useRef<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const isDoneRef = React.useRef(false);
  const { message } = useSubscription([compileMessagesTopic(compileSessionId)]);

  // auto-scroll logs
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [messages]);

  // prepare for a new compilation cycle
  React.useEffect(() => {
    if (stage === "yaml") {
      messagesRef.current = [];
      lastProcessedRef.current = null;
      isDoneRef.current = false;
      setMessages([]);
      onSetModalFeedback(undefined);
      onSetCompileMessages([]);
    }
  }, [stage, onSetModalFeedback, onSetCompileMessages]);

  React.useEffect(() => {
    if (stage !== "compile") return;
    if (!message?.message) return;

    try {
      const rawMsg =
        typeof message.message === "string" ? message.message : message.message?.toString?.();

      if (!rawMsg) return;

      // guard against duplicate payloads
      if (lastProcessedRef.current === rawMsg) return;
      lastProcessedRef.current = rawMsg;

      const data = JSON.parse(rawMsg);
      const text =
        typeof data.message === "string"
          ? data.message
          : data?.message?.toString?.() ?? "";
      const trimmedText = text?.trim?.() ?? "";

      if (trimmedText) {
        messagesRef.current = [...messagesRef.current, trimmedText];
        setMessages(messagesRef.current);
        onSetCompileMessages(messagesRef.current);
      }

      // ---- queue / position updates ----
      if (typeof data.position !== "undefined") {
        if (!isDoneRef.current && data.position) {
          onSetModalFeedback({
            message: `Current position in queue: ${data.position}\n Status: ${data.status}`,
            details: { error: false },
          });
          return;
        }
      }

      // ---- live progress ----
      if (trimmedText && !isDoneRef.current) {
        onSetModalFeedback({
          message: (
            <YStack gap="$2">
              <Paragraph fontWeight="600">Compiling firmware:</Paragraph>
              {trimmedText && (
                <Paragraph height={50} overflow="hidden">
                  {trimmedText}
                </Paragraph>
              )}
            </YStack>
          ),
          details: { error: false },
        });
      }

      // ---- exit event ----
      if (data.event === "exit" && data.code === 0) {
        isDoneRef.current = true;
        messagesRef.current = [];
        setMessages([]);
        onSetCompileMessages([]);
        onSetStage("upload");
      } else if (data.event === "exit" && data.code !== 0) {
        isDoneRef.current = true;

        onSetModalFeedback({
          message: (
            <YStack f={1} jc="flex-start" gap="$2">
              <Paragraph color="$red8" mt="$3" textAlign="center">
                Error compiling code.
              </Paragraph>
              <Paragraph color="$red8" textAlign="center">
                Please check your flow configuration.
              </Paragraph>

              <TextArea
                ref={textareaRef}
                f={1}
                minHeight={150}
                maxHeight="100%"
                mt="$2"
                mb="$4"
                overflow="auto"
                textAlign="left"
                resize="none"
                value={messagesRef.current.join("\n")}
              />
            </YStack>
          ),
          details: { error: true },
        });
      }
    } catch (err) {
      console.log("Error parsing compile message:", err);
    }
  }, [message, stage, onSetModalFeedback, onSetStage]);

  return null;
};

export const useEsphomeDeviceActions = () => {
  const [showModal, setShowModal] = useState(false);
  const [eraseBeforeFlash, setEraseBeforeFlash] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<any>();
  const [stage, setStage] = useState<DeviceModalStage | "">("");
  const yamlRef = useRef<any>();
  const [targetDeviceName, setTargetDeviceName] = useState("");
  const [targetDeviceModel, setTargetDeviceModel] = useState<DevicesModel | null>(null);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [port, setPort] = useState<any>(null);
  const [compileSessionId, setCompileSessionId] = useState("");
  const [compileMessages, setCompileMessages] = useState<string[]>([]);
  const [compileBusyMessage, setCompileBusyMessage] = useState<string | null>(null);
  const BUSY_MESSAGE =
    "Compilation already running. Please wait for the current job to finish.";
  const [logsRequested, setLogsRequested] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<UploadMethod | null>(null);
  const [otaHost, setOtaHost] = useState<string>("");
  const [otaProgress, setOtaProgress] = useState<number>(0);
  const [otaReachable, setOtaReachable] = useState<boolean | null>(null);
  const [otaCheckingReachability, setOtaCheckingReachability] = useState(false);
  const [serialChooser, setSerialChooser] = useState<
    | null
    | {
        reqId: string;
        ports: Array<{
          portId: string;
          displayName?: string;
          vendorId?: string;
          productId?: string;
          serialNumber?: string;
          portName?: string;
        }>;
      }
  >(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const isReadingRef = useRef(false);
  const [logSourceChooserOpen, setLogSourceChooserOpen] = useState(false);
  const [logSource, setLogSource] = useState<null | "mqtt" | "usb">(null);
  const [currentDeviceHasMqtt, setCurrentDeviceHasMqtt] = useState(false);
  const [currentDeviceHasOta, setCurrentDeviceHasOta] = useState(false);
  const [deviceOnline, setDeviceOnline] = useState(false);
  const [deviceDisconnectInfo, setDeviceDisconnectInfo] = useState<
    null | { source: "usb" | "mqtt"; message: string }
  >(null);
  const compileRequestRef = useRef<string | null>(null);
  const latestChooserReqRef = useRef<string | null>(null);
  const expectChooserRef = useRef(false);
  const portRequestRef = useRef<Promise<{ port: any | null; error?: string }> | null>(null);

  const appendConsoleLog = useCallback((line: string) => {
    const trimmed = line.trimEnd();
    setConsoleOutput((prev) => {
      const prefix = prev && !prev.endsWith("\n") ? "\n" : "";
      return `${prev || ""}${prefix}${trimmed}\n`;
    });
  }, []);

  const setDeviceDisconnected = useCallback(
    (source: "usb" | "mqtt", customMessage?: string) => {
      setDeviceDisconnectInfo((prev) => {
        const message =
          customMessage || (source === "usb" ? "USB device disconnected" : "Device is offline");
        if (prev?.source === source && prev?.message === message) return prev;
        appendConsoleLog(`---- ${message} ----`);
        return { source, message };
      });
    },
    [appendConsoleLog],
  );

  const clearDeviceDisconnect = useCallback(() => {
    setDeviceDisconnectInfo(null);
  }, []);

  const hasMqttSubsystem = useCallback((subs: any): boolean => {
    if (!subs) return false;
    if (Array.isArray(subs)) {
      return subs.some((s) => {
        const v = (s?.type ?? s?.name ?? s?.id ?? "").toString().toLowerCase();
        return v.includes("mqtt");
      });
    }
    if (typeof subs === "object") {
      const keyHas = Object.keys(subs).some((k) => k.toLowerCase().includes("mqtt"));
      const valHas = Object.values(subs).some((s: any) => {
        const v = (s?.type ?? s?.name ?? s?.id ?? "").toString().toLowerCase();
        return v.includes("mqtt");
      });
      return keyHas || valHas;
    }
    return false;
  }, []);

  // Check if device has OTA capability
  // For esphome-yaml SDK: parses the deviceYaml and checks for 'ota' key
  // For other SDKs: checks subsystems for 'ota'
  const hasOtaFeature = useCallback((deviceData: any, definition?: any, deviceYaml?: string | null): boolean => {
    if (!deviceData) return false;

    const sdk = definition?.sdk;

    // For esphome-yaml SDK or no definition, parse the device YAML and check for 'ota' key
    if (sdk === "esphome-yaml" || !definition) {
      if (deviceYaml) {
        try {
          const parsed = parseYaml(deviceYaml);
          if (parsed && typeof parsed === "object" && "ota" in parsed) return true;
        } catch (err) {
          console.error("Error parsing device YAML for OTA feature check:", err);
        }
      }
      return false;
    }

    // Check for 'ota' in sdkConfig (ESPHome yaml config)
    const sdkConfig = definition?.config?.sdkConfig;
    if (sdkConfig && typeof sdkConfig === "object") {
      if ("ota" in sdkConfig) return true;
    }

    // Check subsystems for 'ota'
    const subs = deviceData?.subsystem ?? deviceData?.subsystems;
    if (subs) {
      if (Array.isArray(subs)) {
        return subs.some((s) => {
          const v = (s?.type ?? s?.name ?? s?.id ?? "").toString().toLowerCase();
          return v.includes("ota");
        });
      }
      if (typeof subs === "object") {
        const keyHas = Object.keys(subs).some((k) => k.toLowerCase().includes("ota"));
        if (keyHas) return true;
      }
    }

    return false;
  }, []);

  useEffect(() => {
    if (!port) return;

    const handleUsbDisconnect = () => {
      if (stage === "console") {
        // let console flow handle disconnects without changing modal state
        return;
      }
      setPort(null);
      setDeviceDisconnected("usb", "USB device disconnected. Please reconnect and select the port again.");
    };

    try {
      if (typeof port.addEventListener === "function") {
        port.addEventListener("disconnect", handleUsbDisconnect);
      } else if (typeof port.on === "function") {
        port.on("disconnect", handleUsbDisconnect);
      }
    } catch {
      // best-effort listener
    }

    return () => {
      try {
        if (typeof port.removeEventListener === "function") {
          port.removeEventListener("disconnect", handleUsbDisconnect);
        } else if (typeof port.off === "function") {
          port.off("disconnect", handleUsbDisconnect);
        }
      } catch {
        // ignore cleanup issues
      }
    };
  }, [port, setDeviceDisconnected, stage]);

  useEffect(() => {
    if (deviceDisconnectInfo?.source === "usb" && ["select-action", "confirm-erase"].includes(stage)) {
      setModalFeedback({
        message: deviceDisconnectInfo.message,
        details: { error: true },
      });
    }
  }, [deviceDisconnectInfo, stage]);

  useEffect(() => {
    const api = (window as any)?.serial;
    if (!api) return;

    const offOpen = api.onChooserOpen?.(({ reqId, ports }) => {
      if (!expectChooserRef.current) return;
      setSerialChooser({ reqId, ports });
      latestChooserReqRef.current = reqId;
    });

    const offUpdate = api.onChooserUpdate?.(({ reqId, ports }) => {
      if (!expectChooserRef.current) return;
      setSerialChooser((prev) => {
        if (!prev || prev.reqId !== reqId) return prev;
        return { reqId, ports };
      });
    });

    return () => {
      if (typeof offOpen === "function") offOpen();
      if (typeof offUpdate === "function") offUpdate();
      try {
        if (latestChooserReqRef.current) {
          (window as any)?.serial?.cancel(latestChooserReqRef.current);
        }
      } catch {
        // ignore cancel errors
      }
      latestChooserReqRef.current = null;
      expectChooserRef.current = false;
    };
  }, []);

  const handleChoosePort = (portId: string) => {
    try {
      (window as any)?.serial?.choose(serialChooser?.reqId, String(portId));
    } finally {
      setSerialChooser(null);
      expectChooserRef.current = false;
      latestChooserReqRef.current = null;
    }
  };

  const handleCancelChooser = () => {
    try {
      (window as any)?.serial?.cancel(serialChooser?.reqId);
    } finally {
      setSerialChooser(null);
      expectChooserRef.current = false;
      latestChooserReqRef.current = null;
    }
  };

  const requestSerialPort = useCallback(async () => {
    expectChooserRef.current = true;
    if (!portRequestRef.current) {
      portRequestRef.current = connectSerialPort().finally(() => {
        portRequestRef.current = null;
        expectChooserRef.current = false;
      });
    }
    return portRequestRef.current;
  }, []);

  // If we already have a port, dismiss any lingering chooser overlay.
  useEffect(() => {
    if (port && serialChooser) {
      try {
        (window as any)?.serial?.cancel(serialChooser.reqId);
      } catch {
        // ignore
      } finally {
        setSerialChooser(null);
        latestChooserReqRef.current = null;
        expectChooserRef.current = false;
      }
    }
  }, [port, serialChooser]);

  const flashDevice = useCallback(
    async (device: DevicesModel, yaml?: string) => {
      setTargetDeviceName(device.data.name);
      setTargetDeviceModel(device);

      // Fetch device definition to check for OTA capability
      let definition: any = null;
      let deviceYaml: string | null = null;
      const definitionName = device?.data?.deviceDefinition;

      if (definitionName) {
        try {
          const resp = await API.get(`/api/core/v1/deviceDefinitions/${encodeURIComponent(definitionName)}`);
          if (!resp.isError && resp.data) {
            definition = resp.data;
          }
        } catch (err) {
          console.error("Error fetching device definition for OTA check:", err);
        }
      }

      // For esphome-yaml SDK or if no definition, fetch the device YAML to check for OTA
      const sdk = definition?.sdk;
      if (sdk === "esphome-yaml" || !definition) {
        try {
          const resp = await API.get(`/api/v1/esphome/${encodeURIComponent(device.data.name)}/yaml`);
          if (!resp.isError && resp.data?.yaml) {
            deviceYaml = resp.data.yaml;
          }
        } catch (err) {
          console.error("Error fetching device YAML for OTA check:", err);
        }
      }

      setCurrentDeviceHasOta(hasOtaFeature(device?.data, definition, deviceYaml));
      yamlRef.current = yaml ?? (await device.getYaml());
      setShowModal(true);
      try {
        setStage("yaml");
      } catch (e) {
        console.error("error writting firmware: ", e);
      }
    },
    [hasOtaFeature],
  );

  const onSelectPort = useCallback(async () => {
    const { port, error } = await requestSerialPort();
    if (!port || error) {
      setModalFeedback({ message: error || "No port detected.", details: { error: true } });
      return;
    }
    setPort(port);
    setStage("select-action");
  }, [requestSerialPort]);

  const handleYamlStage = useCallback(async () => {
    compileRequestRef.current = null;

    const uploadYaml = async (yaml: string) => {
      try {
        const response = await API.post(postYamlApiEndpoint(targetDeviceName), { yaml });
        const { data } = response;
        setCompileSessionId(data.compileSessionId);
        return data.compileSessionId;
      } catch (err) {
        const errorMessage = "Error on fetch petition to compile.protofy.xyz: " + err;
        setModalFeedback({ message: errorMessage, details: { error: true } });
        throw errorMessage;
      }
    };

    const getBinary = async (deviceName: string, sessionId: string) => {
      const isBinaryAvailable = async (deviceName: string, sessionId: string) => {
        const url = downloadDeviceFirmwareEndpoint(deviceName, sessionId);
        const response = await fetch(url);
        return response.ok;
      };

      const binaryExists = await isBinaryAvailable(deviceName, sessionId);

      if (binaryExists) {
        const message = "Binary already exists. Skipping compilation.";
        setStage("upload");
        setModalFeedback({ message, details: { error: false } });
      } else {
        setModalFeedback({ message: "Queued for compilation...", details: { error: false } });
        setStage("compile");
      }

      if (targetDeviceModel) {
        await targetDeviceModel.setUploaded();
      } else {
        console.log("🤖 No targetDeviceModel");
      }
    };

    try {
      const sessionId = await uploadYaml(yamlRef.current);
      await getBinary(targetDeviceName, sessionId);
    } catch (err) {
      setModalFeedback({
        message: "Error connecting to compilation server. Please verify your Internet connection.",
        details: { error: true },
      });
    }
  }, [targetDeviceModel, targetDeviceName]);

  const compile = useCallback(async () => {
    if (!compileSessionId || !targetDeviceName) {
      setModalFeedback({
        message: "Compilation session is not ready. Please try again.",
        details: { error: true },
      });
      return;
    }

    if (compileRequestRef.current === compileSessionId) return;
    compileRequestRef.current = compileSessionId;

    try {
      setModalFeedback({
        message: "Starting remote compilation...",
        details: { error: false },
      });

      const response = await fetch(compileActionUrl(targetDeviceName, compileSessionId));
      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        if (payload?.running) {
          setCompileBusyMessage(BUSY_MESSAGE);
          return;
        }

        throw new Error(
          payload?.status
            ? `${payload.status} (${response.status})`
            : `Compile request failed (${response.status})`,
        );
      }

      if (payload?.running) {
        setCompileBusyMessage(BUSY_MESSAGE);
      } else {
        setCompileBusyMessage(null);
      }
    } catch (err) {
      console.error("Error starting compilation:", err);
      compileRequestRef.current = null;
      setModalFeedback({
        message: "Error starting compilation. Please retry.",
        details: { error: true },
      });
    }
  }, [compileSessionId, targetDeviceName]);

  const write = useCallback(async () => {
    const flashCb = (msgObj: any) => {
      setModalFeedback((state) => (state = msgObj));
    };

    try {
      await flash((msg) => setModalFeedback(msg), targetDeviceName, compileSessionId, eraseBeforeFlash);
      setStage("idle");
    } catch (e) {
      flashCb({
        message:
          "Error writing the device. Check that the USB connection and serial port are correctly configured.",
        details: { error: true },
      });
    }
  }, [compileSessionId, eraseBeforeFlash, targetDeviceName]);

  const writeOTA = useCallback(async () => {
    if (!otaHost || !compileSessionId || !targetDeviceName) {
      setModalFeedback({
        message: "OTA host or compile session not configured",
        details: { error: true },
      });
      return;
    }

    setModalFeedback({ message: "Starting OTA upload...", details: { error: false } });
    setOtaProgress(0);

    try {
      const response = await fetch(`/api/v1/esphome/${targetDeviceName}/ota`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: otaHost,
          compileSessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`OTA request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.stage === "error") {
                setModalFeedback({
                  message: `OTA Error: ${data.error}`,
                  details: { error: true },
                });
                return;
              }

              if (data.stage === "uploading" && typeof data.progress === "number") {
                setOtaProgress(data.progress);
                setModalFeedback({
                  message: (
                    <YStack gap="$2" ai="center">
                      <Paragraph fontWeight="600">Uploading firmware via OTA</Paragraph>
                      <Paragraph>{data.progress}%</Paragraph>
                    </YStack>
                  ),
                  details: { error: false },
                });
              } else if (data.stage === "done") {
                setModalFeedback({
                  message: "OTA upload complete! Device is restarting...",
                  details: { error: false },
                });
                setStage("idle");
                return;
              } else if (data.message) {
                setModalFeedback({
                  message: data.message,
                  details: { error: false },
                });
              }
            } catch (parseErr) {
              console.error("Error parsing OTA progress:", parseErr);
            }
          }
        }
      }
    } catch (e) {
      console.error("OTA upload error:", e);
      setModalFeedback({
        message: `OTA upload failed: ${e instanceof Error ? e.message : String(e)}`,
        details: { error: true },
      });
    }
  }, [otaHost, compileSessionId, targetDeviceName]);

  const checkOtaReachability = useCallback(async (deviceName: string) => {
    const mdnsHost = deviceName.replace(/_/g, "-") + ".local";
    setOtaHost(mdnsHost);
    setOtaCheckingReachability(true);
    setOtaReachable(null);

    try {
      const response = await fetch(`/api/v1/esphome/${deviceName}/ota-check?host=${encodeURIComponent(mdnsHost)}`);
      if (response.ok) {
        const data = await response.json();
        setOtaReachable(data.reachable === true);
      } else {
        setOtaReachable(false);
      }
    } catch {
      setOtaReachable(false);
    } finally {
      setOtaCheckingReachability(false);
    }
  }, []);

  const startUploadStage = useCallback(() => {
    const chromiumBasedAgent =
      navigator.userAgent.includes("Chrome") ||
      navigator.userAgent.includes("Edge") ||
      navigator.userAgent.includes("Opera");

    if (chromiumBasedAgent) {
      setModalFeedback({
        message: "Connect your device and click select to chose the port. ",
        details: { error: false },
      });
    } else {
      setModalFeedback({
        message: "You need Chrome, Opera or Edge to upload the code to the device.",
        details: { error: true },
      });
    }
  }, []);

  const startConsole = useCallback(async () => {
    if (!port) {
      console.error("No port selected");
      return;
    }

    clearDeviceDisconnect();

    if (isReadingRef.current || readerRef.current) {
      return;
    }

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      if (!port.readable) {
        return;
      }
      if (port.readable.locked) {
        return;
      }

      reader = port.readable.getReader();
      readerRef.current = reader;
      isReadingRef.current = true;

      const decoder = new TextDecoder();

      while (isReadingRef.current) {
        const { value, done } = await reader.read();
        if (done) {
          if (isReadingRef.current) {
            setDeviceDisconnected("usb", "Device disconnected from USB");
          }
          break;
        }
        if (value) {
          setConsoleOutput((prev) => prev + decoder.decode(value));
        }
      }
    } catch (err) {
      console.error("Error reading from port:", err);
      if (isReadingRef.current) {
        setDeviceDisconnected("usb", "Device disconnected from USB");
      }
    } finally {
      try {
        if (readerRef.current) {
          try {
            await readerRef.current.releaseLock();
          } catch {}
        }
      } finally {
        readerRef.current = null;
        isReadingRef.current = false;
      }
    }
  }, [clearDeviceDisconnect, port, setDeviceDisconnected]);

  const stopConsole = useCallback(async () => {
    isReadingRef.current = false;
    setLogSource(null);

    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch {}
      try {
        await readerRef.current.releaseLock();
      } catch {}
      readerRef.current = null;
    }

    try {
      if (port && !port.readable?.locked && !port.writable?.locked) {
        await port.close();
      } else if (port && !port.readable?.locked) {
        try {
          await port.close();
        } catch (e) {}
      }
    } catch (e) {
      console.warn("Error closing port:", e);
    } finally {
      setPort(null);
      clearDeviceDisconnect();
    }
  }, [clearDeviceDisconnect, port]);

  useEffect(() => {
    if (stage !== "console") return;
    return () => {
      stopConsole();
    };
  }, [stage, stopConsole]);

  useEffect(() => {
    if (stage !== "console") {
      clearDeviceDisconnect();
    }
  }, [stage, clearDeviceDisconnect]);

  useEffect(() => {
    if (stage === "" || stage === "yaml") {
      compileRequestRef.current = null;
    }
  }, [stage]);

  useEffect(() => {
    if (stage !== "compile" && compileBusyMessage) {
      setCompileBusyMessage(null);
    }
  }, [stage, compileBusyMessage]);

  useEffect(() => {
    const processStage = async () => {
      switch (stage) {
        case "yaml":
          await handleYamlStage();
          break;
        case "compile":
          await compile();
          break;
        case "write":
          await write();
          break;
        case "upload":
          // Show upload method selection and check OTA reachability if device supports it
          setModalFeedback({
            message: "Choose how to upload firmware to your device",
            details: { error: false },
          });
          // Only check OTA reachability if device has OTA feature
          if (currentDeviceHasOta) {
            checkOtaReachability(targetDeviceName);
          }
          break;
        case "ota-upload":
          await writeOTA();
          break;
      }
    };

    processStage();
  }, [stage, handleYamlStage, compile, write, writeOTA, checkOtaReachability, targetDeviceName, currentDeviceHasOta]);

  useEffect(() => {
    if (stage !== "console") return;
    if (logSource === "usb") startConsole();
  }, [stage, logSource, startConsole]);

  const mqttDebugTopic =
    logSource === "mqtt" && targetDeviceName ? [`devices/${targetDeviceName}/debug`] : [];
  const { message: mqttLogMessage } = useSubscription(mqttDebugTopic);
  const mqttStatusTopic = targetDeviceName ? [`devices/${targetDeviceName}/status`] : [];
  const { message: mqttStatusMessage } = useSubscription(mqttStatusTopic);

  useEffect(() => {
    if (logSource !== "mqtt") return;
    const raw = mqttLogMessage?.message;
    if (!raw) return;

    try {
      const text = typeof raw === "string" ? raw : raw.toString?.() ?? String(raw);
      const normalized = text.replace(/\r\n|\r/g, "\n");

      setConsoleOutput((prev) => {
        const prevEndsWithNL = prev?.endsWith("\n") ?? true;
        const nextStartsWithNL = normalized.startsWith("\n");
        const nextEndsWithNL = normalized.endsWith("\n");

        const sep = !prevEndsWithNL && !nextStartsWithNL ? "\n" : "";
        const tail = nextEndsWithNL ? "" : "\n";

        return (prev || "") + sep + normalized + tail;
      });
    } catch {
      setConsoleOutput((prev) => (prev || "") + "\n" + String(raw) + "\n");
    }
  }, [mqttLogMessage, logSource]);

  useEffect(() => {
    if (!targetDeviceName) return;
    const raw = mqttStatusMessage?.message;
    if (!raw) return;
    if (raw == undefined) return;
    try {
      const text = typeof raw === "string" ? raw : raw.toString?.() ?? String(raw);
      const normalized = text.trim().toLowerCase();
      if (normalized === "offline") {
        setDeviceOnline(false);
        setDeviceDisconnected("mqtt", "Device went offline");
      } else if (normalized === "online") {
        setDeviceOnline(true);
        clearDeviceDisconnect();
        appendConsoleLog("---- Device is online ----");
      }
    } catch {
      // ignore parsing issues
    }
  }, [mqttStatusMessage, targetDeviceName, setDeviceDisconnected, clearDeviceDisconnect]);

  const chooseLogsSource = useCallback(
    async (source: "mqtt" | "usb") => {
      setLogSourceChooserOpen(false);
      clearDeviceDisconnect();

      if (source === "usb") {
        const { port, error } = await requestSerialPort();

        if (error === "Any port selected") {
          setLogsRequested(false);
          setLogSource(null);
          return;
        }

        if (!port || error) {
          setLogsRequested(false);
          setLogSource(null);
          setModalFeedback({ message: error || "No port detected.", details: { error: true } });
          return;
        }

        setPort(port);
        setLogSource("usb");
        setConsoleOutput("");
        setShowModal(true);
        setStage("console");
        return;
      }

      setLogSource("mqtt");
      setConsoleOutput("");
      setShowModal(true);
      setStage("console");
      setModalFeedback({
        message: `Subscribing to MQTT topic: devices/${targetDeviceName}/debug`,
        details: { error: false },
      });
    },
    [clearDeviceDisconnect, requestSerialPort, targetDeviceName],
  );

  const cancelLogsSource = useCallback(() => {
    setLogSourceChooserOpen(false);
    setLogsRequested(false);
    setLogSource(null);
  }, []);

  const viewLogs = useCallback(
    async (device: DevicesModel) => {
      setTargetDeviceName(device.data.name);
      setTargetDeviceModel(device);
      clearDeviceDisconnect();
      setLogsRequested(true);
      setConsoleOutput("");

      const hasMqtt = hasMqttSubsystem(device?.data?.subsystem);
      setCurrentDeviceHasMqtt(hasMqtt);

      if (hasMqtt) {
        setLogSourceChooserOpen(true);
      } else {
        const { port, error } = await requestSerialPort();
        if (error === "Any port selected") {
          setLogsRequested(false);
          setLogSource(null);
          return;
        }
        if (!port || error) {
          setLogsRequested(false);
          setLogSource(null);
          setModalFeedback({ message: error || "No port detected.", details: { error: true } });
          return;
        }
        setPort(port);
        setLogSource("usb");
        setShowModal(true);
        setStage("console");
      }
    },
    [clearDeviceDisconnect, hasMqttSubsystem, requestSerialPort],
  );

  const uploadConfigFile = useCallback(
    async (device: DevicesModel, yamlOverride?: string) => {
      try {
        if (yamlOverride) {
          await flashDevice(device, yamlOverride);
          return;
        }
        const result = await API.get("/api/v1/esphome/" + device.data.name + "/yaml");
        await flashDevice(device, result.data.yaml);
      } catch (err) {
        console.error(err);
      }
    },
    [flashDevice],
  );

  const handleCancel = useCallback(() => {
    // Close the modal immediately; stopConsole runs in the background.
    setShowModal(false);
    setStage("");
    setLogsRequested(false);

    stopConsole().catch(() => {
      /* best effort */
    });
  }, [stopConsole]);

  const handleSelectUploadMethod = useCallback(
    (method: UploadMethod) => {
      setUploadMethod(method);
      if (method === "usb") {
        startUploadStage();
        setStage("upload-method");
      } else if (method === "ota") {
        // Set default OTA host based on device name
        const mdnsHost = targetDeviceName.replace(/_/g, "-") + ".local";
        setOtaHost(mdnsHost);
        setStage("ota-upload");
      }
    },
    [startUploadStage, targetDeviceName],
  );

  const handleOtaHostChange = useCallback((host: string) => {
    setOtaHost(host);
  }, []);

  const startOtaUpload = useCallback(() => {
    setStage("ota-upload");
  }, []);

  const deviceActionsUi = (
    <>
      <Connector brokerUrl={onlineCompilerSecureWebSocketUrl()}>
        <DeviceModal
          stage={stage}
          onCancel={handleCancel}
          onSelect={onSelectPort}
          eraseBeforeFlash={eraseBeforeFlash}
          setEraseBeforeFlash={setEraseBeforeFlash}
          modalFeedback={modalFeedback}
          showModal={showModal}
          selectedDevice={targetDeviceModel ?? undefined}
          compileSessionId={compileSessionId}
          disconnectInfo={deviceDisconnectInfo}
          compileMessages={compileMessages}
          uploadMethod={uploadMethod}
          onSelectUploadMethod={handleSelectUploadMethod}
          otaHost={otaHost}
          onOtaHostChange={handleOtaHostChange}
          onStartOtaUpload={startOtaUpload}
          otaProgress={otaProgress}
          otaReachable={otaReachable}
          otaCheckingReachability={otaCheckingReachability}
          hasOtaFeature={currentDeviceHasOta}
          onSelectAction={(next) => {
            if (next === "console") {
              setConsoleOutput("");
              setLogSource("usb");
              clearDeviceDisconnect();

              if (!port) {
                setModalFeedback({
                  message: "Serial port is not open. Please connect the device first.",
                  details: { error: true },
                });
                return;
              }

              setStage("console");
              return;
            }

            setStage(next);
          }}
          consoleOutput={consoleOutput}
          logSource={logSource}
          compileBusyMessage={compileBusyMessage}
        />
        <MqttTest
          onSetStage={(v) => setStage(v)}
          onSetModalFeedback={(v) => setModalFeedback(v)}
          compileSessionId={compileSessionId}
          stage={stage}
          onSetCompileMessages={setCompileMessages}
        />
      </Connector>

      {serialChooser && (
        <YStack
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          jc="center"
          ai="center"
          zi={2147483647}
          pointerEvents="auto"
        >
          <YStack w={520} maw={520} p="$4" br="$4" bw={1} bc="$color3" gap="$3" alignItems="center">
            <Paragraph size="$6" fow="700">
              Select a serial port
            </Paragraph>

            <YStack mah={280} overflow="auto" gap="$2">
              {serialChooser.ports.length ? (
                serialChooser.ports.map((p) => (
                  <Button key={p.portId} onPress={() => handleChoosePort(p.portId)} justifyContent="center">
                    <Text fow="600">
                      {`${p.displayName || p.portId || "Unknown device"}${
                        p.portName ? ` (${p.portName})` : ""
                      }`}
                    </Text>
                  </Button>
                ))
              ) : (
                <Paragraph opacity={0.8}>No ports found. Plug your device and try again.</Paragraph>
              )}
            </YStack>

            <XStack jc="flex-end" gap="$2" mt="$2">
              <Button theme="alt1" onPress={handleCancelChooser}>
                Cancel
              </Button>
            </XStack>
          </YStack>
        </YStack>
      )}

      {logSourceChooserOpen && (
        <YStack
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          jc="center"
          ai="center"
          zi={2147483647}
          pointerEvents="auto"
          px="$4"
        >
          <YStack w={520} maw={520} p="$4" br="$4" bw={1} bc="$color3" gap="$3" ai="stretch" bg="$color1">
            <Paragraph size="$6" fow="700" ta="center">
              Choose log source
            </Paragraph>
            <Paragraph ta="center" opacity={0.8}>
              Where do you want to read logs from for <Text fow="700">{targetDeviceName || "device"}</Text>?
            </Paragraph>
            <YStack gap="$2" mt="$2">
              {currentDeviceHasMqtt && (
                <YStack gap="$1">
                  <Button onPress={() => chooseLogsSource("mqtt")} disabled={!deviceOnline} opacity={!deviceOnline ? 0.6 : 1}>
                    MQTT
                  </Button>
                  {!deviceOnline && (
                    <Paragraph ta="center" size="$2" color="$red10">
                      Device offline. Please wait for it to reconnect.
                    </Paragraph>
                  )}
                </YStack>
              )}
              <Button onPress={() => chooseLogsSource("usb")}>USB</Button>
            </YStack>
            <XStack jc="flex-end" gap="$2" mt="$2">
              <Button theme="alt1" onPress={cancelLogsSource}>
                Cancel
              </Button>
            </XStack>
          </YStack>
        </YStack>
      )}
    </>
  );

  return {
    flashDevice,
    uploadConfigFile,
    viewLogs,
    ui: deviceActionsUi,
  };
};
