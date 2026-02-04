import {handler, getServiceToken} from 'protonode'
import path from 'path'
import fs from 'fs'
import { API, checkPermission } from "protobase";
import { downloadDeviceFirmwareEndpoint, downloadDeviceOtaEndpoint } from './utils'
import { uploadOTA, resolveHost } from './otaUpload'

export default (app, context) => {

    const isAuthorized = (req, session, permission = 'esphome.read') => {
        // Service tokens get full access
        const token = req?.query?.token
        if (token && token === getServiceToken()) return true
        // Check granular permission
        return checkPermission(session, permission)
    }

    app.get('/api/v1/esphome/:device/yaml', handler(async (req, res, session) => {
        if(!isAuthorized(req, session)) {
            res.status(401).send({error: "Unauthorized"})
            return
        }

        const devicesPathData = await API.get('/api/core/v1/devices/path?token='+getServiceToken())
        if(devicesPathData.isError) {
            console.error("Error getting devices path: ", devicesPathData.error, " - this is necesary for the esphome extension to work")
            res.status(500).send({error: "Devices path not found, this is necesary for the esphome extension to work"})
            return
        }
        // console.log("Devices path: ", devicePathData.data.path)
        const devicePath = path.join(devicesPathData.data.path, req.params.device)
        
        // console.log("Device path: ", devicePath)
        if(!fs.existsSync(devicePath)){
            res.status(404).send({error: "Not Found"})
            return
        }
        const yaml = fs.readFileSync(path.join(devicePath,"config.yaml"),'utf8')
        res.send({yaml})
    }))

    app.post('/api/v1/esphome/:device/yamls', handler(async (req, res, session) => {
        if(!isAuthorized(req, session, 'esphome.update')) {
            res.status(403).send({error: "Forbidden"})
            return
        }

        const devicesPathData = await API.get('/api/core/v1/devices/path?token='+getServiceToken())
        if(devicesPathData.isError) {
            console.error("Error getting devices path: ", devicesPathData.error, " - this is necesary for the esphome extension to work")
            res.status(500).send({error: "Devices path not found, this is necesary for the esphome extension to work"})
            return
        }
        // console.log("Devices path: ", devicePathData.data.path)
        const devicesPath = devicesPathData.data.path

        const {yaml} = req.body

        if(!fs.existsSync(devicesPath)) fs.mkdirSync(devicesPath)
        const devicePath = path.join(devicesPath, req.params.device)
        if(!fs.existsSync(devicePath)) fs.mkdirSync(devicePath)
        fs.writeFileSync(path.join(devicePath,"config.yaml"),yaml)

        res.send({value: yaml})
    }))

    app.get('/api/v1/esphome/:device/:compileSessionId/manifest', handler(async (req, res, session) => {
        if(!isAuthorized(req, session)) {
            res.status(401).send({error: "Unauthorized"})
            return
        }
        if(!req.params.device){
            res.status(400).send({error: "Device not specified"})
            return
        }
        const deviceData = await API.get('/api/core/v1/devices/'+req.params.device+'?token='+getServiceToken())
        if(deviceData.isError) {
            console.error("Error getting device data: ", deviceData.error)
            res.status(500).send({error: "Error getting device data"})
            return
        }
        const deviceInfo = deviceData.data
        console.log("Device info: ", deviceInfo)
        const core = await deviceInfo.getCore()
        const mapCore = {
            "esp32": "ESP32",
            "esp8266": "ESP8266",
            "esp32s3": "ESP32-S3",
            "esp32c3": "ESP32-C3",
            "esp32s2": "ESP32-S2" 
        }
        const manifest = {
            "name": `${req.params.device} firmware`,
            "new_install_prompt_erase": true,
            "improv": true,
            "builds": [{
                "chipFamily": mapCore[core],
                "parts": [
                    {"path": downloadDeviceFirmwareEndpoint(req.params.device, req.params.compileSessionId), "offset": "0"},
                ]
            }]
            }
        res.send(JSON.stringify(manifest))
    }))

    // OTA Upload endpoint - streams progress via Server-Sent Events
    app.post('/api/v1/esphome/:device/ota', handler(async (req, res, session) => {
        if(!isAuthorized(req, session, 'esphome.execute')) {
            res.status(403).send({error: "Forbidden"})
            return
        }

        const { host, compileSessionId, password } = req.body
        const deviceName = req.params.device

        if (!host) {
            res.status(400).send({error: "Host (IP or hostname) is required"})
            return
        }

        if (!compileSessionId) {
            res.status(400).send({error: "compileSessionId is required"})
            return
        }

        // Set up SSE for streaming progress
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.flushHeaders()

        const sendProgress = (data: any) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`)
        }

        try {
            // Resolve hostname to IP
            sendProgress({ stage: 'resolving', message: `Resolving ${host}...` })
            let targetHost: string
            try {
                targetHost = await resolveHost(host)
                sendProgress({ stage: 'resolving', message: `Resolved to ${targetHost}` })
            } catch (err) {
                sendProgress({ stage: 'error', error: `Could not resolve host: ${host}` })
                res.end()
                return
            }

            // Download OTA firmware from compile service
            sendProgress({ stage: 'downloading', message: 'Downloading OTA firmware from compile service...' })
            const firmwareUrl = downloadDeviceOtaEndpoint(deviceName, compileSessionId)

            const fetchResponse = await fetch(firmwareUrl)
            if (!fetchResponse.ok) {
                sendProgress({ stage: 'error', error: `Failed to download firmware: ${fetchResponse.status}` })
                res.end()
                return
            }

            const firmwareArrayBuffer = await fetchResponse.arrayBuffer()
            const firmwareBuffer = Buffer.from(firmwareArrayBuffer)
            sendProgress({
                stage: 'downloading',
                message: `Firmware downloaded (${Math.round(firmwareBuffer.length / 1024)} KB)`
            })

            // Perform OTA upload
            await uploadOTA(
                targetHost,
                firmwareBuffer,
                password,
                3232,
                (progress) => sendProgress(progress)
            )

            sendProgress({ stage: 'done', message: 'OTA upload completed successfully!' })
        } catch (error) {
            sendProgress({
                stage: 'error',
                error: error instanceof Error ? error.message : String(error)
            })
        } finally {
            res.end()
        }
    }))

    // Check if device is reachable for OTA by performing a minimal OTA handshake
    app.get('/api/v1/esphome/:device/ota-check', handler(async (req, res, session) => {
        if(!isAuthorized(req, session, 'esphome.read')) {
            res.status(403).send({error: "Forbidden"})
            return
        }

        const deviceName = req.params.device
        const host = req.query.host as string

        if (!host) {
            res.status(400).send({error: "Host parameter is required"})
            return
        }

        try {
            // Try to resolve the hostname first
            let targetHost: string
            try {
                targetHost = await resolveHost(host)
            } catch {
                res.send({ reachable: false, error: "Could not resolve hostname" })
                return
            }

            // Perform minimal OTA handshake to verify device is ready
            const net = await import('net')
            const OTA_MAGIC = [0x6C, 0x26, 0xF7, 0x5C, 0x45]
            const OTA_RESPONSE_OK = 0x00

            const result = await new Promise<{ reachable: boolean; version?: number; error?: string }>((resolve) => {
                const socket = new net.Socket()
                socket.setNoDelay(true)
                let dataBuffer = new Uint8Array(0)
                let resolved = false

                const cleanup = () => {
                    if (!resolved) {
                        resolved = true
                        socket.destroy()
                    }
                }

                const timeout = setTimeout(() => {
                    cleanup()
                    resolve({ reachable: false, error: "Connection timeout" })
                }, 5000)

                socket.on('error', (err) => {
                    clearTimeout(timeout)
                    cleanup()
                    resolve({ reachable: false, error: err.message })
                })

                socket.on('close', () => {
                    clearTimeout(timeout)
                    if (!resolved) {
                        resolved = true
                        resolve({ reachable: false, error: "Connection closed unexpectedly" })
                    }
                })

                socket.on('data', (data: Uint8Array) => {
                    const newBuffer = new Uint8Array(dataBuffer.length + data.length)
                    newBuffer.set(dataBuffer, 0)
                    newBuffer.set(new Uint8Array(data), dataBuffer.length)
                    dataBuffer = newBuffer
                    // We expect 2 bytes: OTA_RESPONSE_OK (0x00) + version
                    if (dataBuffer.length >= 2) {
                        clearTimeout(timeout)
                        const response = dataBuffer[0]
                        const version = dataBuffer[1]
                        cleanup()
                        if (response === OTA_RESPONSE_OK) {
                            resolve({ reachable: true, version })
                        } else {
                            resolve({ reachable: false, error: `Unexpected OTA response: 0x${response.toString(16)}` })
                        }
                    }
                })

                socket.connect(3232, targetHost, () => {
                    // Send OTA magic bytes
                    socket.write(new Uint8Array(OTA_MAGIC))
                })
            })

            res.send({ ...result, ip: targetHost })
        } catch (error) {
            res.send({ reachable: false, error: error instanceof Error ? error.message : String(error) })
        }
    }))

    // Get device network info for OTA (attempts to get IP from MQTT or mDNS)
    app.get('/api/v1/esphome/:device/network-info', handler(async (req, res, session) => {
        if(!isAuthorized(req, session, 'esphome.read')) {
            res.status(403).send({error: "Forbidden"})
            return
        }

        const deviceName = req.params.device

        // Get device data to check for MQTT/network configuration
        const deviceData = await API.get('/api/core/v1/devices/'+deviceName+'?token='+getServiceToken())
        if(deviceData.isError) {
            res.status(404).send({error: "Device not found"})
            return
        }

        const device = deviceData.data
        const deviceConfig = device.data || device

        // Try to extract network info
        const networkInfo: {
            mdnsHost?: string
            mqttConfigured?: boolean
            suggestions: string[]
        } = {
            suggestions: []
        }

        // The mDNS hostname is typically the device name with underscores replaced by dashes
        const mdnsName = deviceName.replace(/_/g, '-')
        networkInfo.mdnsHost = `${mdnsName}.local`
        networkInfo.suggestions.push(`${mdnsName}.local`)

        // Check if MQTT is configured
        if (deviceConfig.subsystem) {
            const hasMqtt = Array.isArray(deviceConfig.subsystem)
                ? deviceConfig.subsystem.some(s => s?.type?.toLowerCase?.().includes('mqtt'))
                : Object.values(deviceConfig.subsystem || {}).some((s: any) =>
                    s?.type?.toLowerCase?.().includes('mqtt'))
            networkInfo.mqttConfigured = hasMqtt
        }

        res.send(networkInfo)
    }))

}
