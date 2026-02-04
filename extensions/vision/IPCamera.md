# 🧠 How the Card Works

This card returns an object with 2 properties:

- **imageUrl** → snapshot/still JPG url
- **streamPath** → live MJPEG stream with cache-busting 

The UI simply renders an _<img>_ using **_streamPath_**.  
- If the camera endpoint is **MJPEG**, the card shows a live stream.  
- If not, you’ll see a static image or an error.

> **Note:** Many cameras provide **RTSP** or **H.264** streams only. This card expects **MJPEG over HTTP(S)**.  
> For non-MJPEG cameras, expose an MJPEG endpoint (e.g., via substream re-encoding or a proxy).

---

# 🔧 Inputs

### cameraAddr
- **What:** Camera host or IP.  
- **Examples:** `192.168.1.120`, `cam.local`, `my-cam.company.lan`

---

### cameraPort
- **What:** HTTP(S) port of the camera/server.  
- **Examples:**  
  - `80` → Dahua default web  
  - `8080` → IP Webcam app  
  - `443` → HTTPS proxy

---

### streamPath
- **What:** Path to MJPEG live stream.  
- **Default:** `/video`  
- **Examples:**  
  - **Dahua (MJPEG substream):** `/cgi-bin/mjpg/video.cgi?channel=1&subtype=1` (requires the chosen stream to be set to MJPEG on the camera).  
  - **IP Webcam (Android app):** `/video`

---

### stillPath
- **What:** Path to a still JPEG snapshot.  
- **Default:** `/photo.jpg`  
- **Examples:**  
  - **Dahua snapshot:** `/cgi-bin/snapshot.cgi?channel=1` (channel param optional on some models/NVRs).  
  - **IP Webcam snapshot:** `/photo.jpg`

---

### cameraProtocol
- **What:** `http://` or `https://`.  
- **Tip:** If your camera doesn’t support HTTPS, you can place a reverse proxy (e.g., Nginx) in front of it for TLS.

---


# 🚀 Quick Start (Demo)

### A) Dahua (Local MJPEG)

1. In the Dahua web UI, set **Sub Stream** encoding to **MJPEG** for the channel you’ll use.  
2. Fill the card params like:

```json
{
  "cameraAddr": "192.168.1.120",
  "cameraPort": "80",
  "cameraProtocol": "http://",
  "streamPath": "/cgi-bin/mjpg/video.cgi?channel=1&subtype=1",
  "stillPath": "/cgi-bin/snapshot.cgi?channel=1"
}
```
3. Click Open camera. You should see a live stream.
4. If you see a still image or error, verify the substream encoding is MJPEG and the endpoint is reachable.


### B) IP Webcam (Android)

Install IP Webcam on Android and start the server (it shows your device IP and port).

Use:
```json
{
  "cameraAddr": "192.168.1.50",
  "cameraPort": "8080",
  "cameraProtocol": "http://",
  "streamPath": "/video",
  "stillPath": "/photo.jpg"
}
```

Click Open camera. You should see a live stream.


# ✅ Best Practices for Demos

- Prefer LAN connections to keep latency low and avoid CORS.
- For Dahua, use Sub Stream set to MJPEG for mjpg/video.cgi. Main streams are often H.264/H.265 and won’t work in this card.
- Use the built-in cache-busting (?k=<random>) to avoid stale frames.
- If you need RTSP/H.264, re-expose it as MJPEG via an edge proxy (e.g., ffmpeg + web server) and point streamPath to that MJPEG endpoint.
