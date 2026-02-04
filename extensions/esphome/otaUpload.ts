import * as net from 'net';
import * as crypto from 'crypto';

// ESPHome OTA v2 Protocol Constants
const OTA_RESPONSE_OK = 0x00;
const OTA_RESPONSE_REQUEST_AUTH = 0x01;
const OTA_RESPONSE_REQUEST_SHA256_AUTH = 0x02;
const OTA_RESPONSE_HEADER_OK = 0x40;
const OTA_RESPONSE_AUTH_OK = 0x41;
const OTA_RESPONSE_UPDATE_PREPARE_OK = 0x42;
const OTA_RESPONSE_BIN_MD5_OK = 0x43;
const OTA_RESPONSE_RECEIVE_OK = 0x44;
const OTA_RESPONSE_UPDATE_END_OK = 0x45;
const OTA_RESPONSE_SUPPORTS_COMPRESSION = 0x46;
const OTA_RESPONSE_CHUNK_OK = 0x47;

const OTA_RESPONSE_ERROR_MAGIC = 0x80;
const OTA_RESPONSE_ERROR_UPDATE_PREPARE = 0x81;
const OTA_RESPONSE_ERROR_AUTH_INVALID = 0x82;
const OTA_RESPONSE_ERROR_WRITING_FLASH = 0x83;
const OTA_RESPONSE_ERROR_UPDATE_END = 0x84;
const OTA_RESPONSE_ERROR_INVALID_BOOTSTRAPPING = 0x85;
const OTA_RESPONSE_ERROR_WRONG_CURRENT_FLASH_CONFIG = 0x86;
const OTA_RESPONSE_ERROR_WRONG_NEW_FLASH_CONFIG = 0x87;
const OTA_RESPONSE_ERROR_ESP8266_NOT_ENOUGH_SPACE = 0x88;
const OTA_RESPONSE_ERROR_ESP32_NOT_ENOUGH_SPACE = 0x89;
const OTA_RESPONSE_ERROR_NO_UPDATE_PARTITION = 0x8A;
const OTA_RESPONSE_ERROR_MD5_MISMATCH = 0x8B;
const OTA_RESPONSE_ERROR_UNKNOWN = 0xFF;

// ESPHome OTA magic bytes (5 bytes)
const OTA_MAGIC = [0x6C, 0x26, 0xF7, 0x5C, 0x45];
const OTA_VERSION = 2;
const OTA_PORT = 3232;
const CHUNK_SIZE = 8192;

// Feature flags
const FEATURE_SUPPORTS_COMPRESSION = 0x01;
const FEATURE_SUPPORTS_SHA256_AUTH = 0x02;

interface OTAProgress {
  stage: 'connecting' | 'authenticating' | 'preparing' | 'uploading' | 'verifying' | 'done' | 'error';
  progress?: number; // 0-100 for uploading stage
  bytesWritten?: number;
  totalBytes?: number;
  message?: string;
  error?: string;
}

type ProgressCallback = (progress: OTAProgress) => void;

function getErrorMessage(code: number): string {
  const errorMessages: { [key: number]: string } = {
    [OTA_RESPONSE_ERROR_MAGIC]: 'Invalid magic byte',
    [OTA_RESPONSE_ERROR_UPDATE_PREPARE]: 'Failed to prepare update',
    [OTA_RESPONSE_ERROR_AUTH_INVALID]: 'Invalid authentication',
    [OTA_RESPONSE_ERROR_WRITING_FLASH]: 'Error writing to flash',
    [OTA_RESPONSE_ERROR_UPDATE_END]: 'Error finalizing update',
    [OTA_RESPONSE_ERROR_INVALID_BOOTSTRAPPING]: 'Invalid bootstrapping',
    [OTA_RESPONSE_ERROR_WRONG_CURRENT_FLASH_CONFIG]: 'Wrong current flash config',
    [OTA_RESPONSE_ERROR_WRONG_NEW_FLASH_CONFIG]: 'Wrong new flash config',
    [OTA_RESPONSE_ERROR_ESP8266_NOT_ENOUGH_SPACE]: 'ESP8266: Not enough space',
    [OTA_RESPONSE_ERROR_ESP32_NOT_ENOUGH_SPACE]: 'ESP32: Not enough space',
    [OTA_RESPONSE_ERROR_NO_UPDATE_PARTITION]: 'No OTA update partition',
    [OTA_RESPONSE_ERROR_MD5_MISMATCH]: 'MD5 checksum mismatch',
    [OTA_RESPONSE_ERROR_UNKNOWN]: 'Unknown error',
  };
  return errorMessages[code] || `Unknown error code: ${code}`;
}

// Buffered socket reader to handle TCP packet fragmentation
class SocketReader {
  private chunks: Uint8Array[] = [];
  private totalLength: number = 0;
  private pendingResolve: ((value: Uint8Array) => void) | null = null;
  private pendingReject: ((reason: Error) => void) | null = null;
  private pendingLength: number = 0;
  private closed: boolean = false;

  constructor(socket: net.Socket) {
    socket.on('data', (data: Uint8Array) => {
      this.chunks.push(new Uint8Array(data));
      this.totalLength += data.length;
      this.tryResolve();
    });

    socket.on('error', (err: Error) => {
      this.closed = true;
      if (this.pendingReject) {
        this.pendingReject(err);
        this.pendingResolve = null;
        this.pendingReject = null;
      }
    });

    socket.on('close', () => {
      this.closed = true;
      if (this.pendingReject) {
        this.pendingReject(new Error('Socket closed'));
        this.pendingResolve = null;
        this.pendingReject = null;
      }
    });
  }

  private getBuffer(): Uint8Array {
    if (this.chunks.length === 0) return new Uint8Array(0);
    if (this.chunks.length === 1) return this.chunks[0];
    const result = new Uint8Array(this.totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    this.chunks = [result];
    return result;
  }

  private consume(length: number): Uint8Array {
    const buffer = this.getBuffer();
    const result = buffer.slice(0, length);
    const remaining = buffer.slice(length);
    this.chunks = remaining.length > 0 ? [remaining] : [];
    this.totalLength -= length;
    return result;
  }

  private tryResolve(): void {
    if (this.pendingResolve && this.totalLength >= this.pendingLength) {
      const result = this.consume(this.pendingLength);
      const resolve = this.pendingResolve;
      this.pendingResolve = null;
      this.pendingReject = null;
      this.pendingLength = 0;
      resolve(result);
    }
  }

  async readBytes(length: number, timeout: number = 5000): Promise<Uint8Array> {
    // Check if we already have enough data
    if (this.totalLength >= length) {
      return this.consume(length);
    }

    if (this.closed) {
      throw new Error('Socket is closed');
    }

    return new Promise((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;
      this.pendingLength = length;

      const timer = setTimeout(() => {
        if (this.pendingReject) {
          this.pendingReject(new Error(`Timeout waiting for ${length} bytes (got ${this.totalLength})`));
          this.pendingResolve = null;
          this.pendingReject = null;
          this.pendingLength = 0;
        }
      }, timeout);

      // Wrap resolve to clear timeout
      const originalResolve = this.pendingResolve;
      this.pendingResolve = (value: Uint8Array) => {
        clearTimeout(timer);
        originalResolve(value);
      };
    });
  }

  async readByte(timeout: number = 5000): Promise<number> {
    const buf = await this.readBytes(1, timeout);
    return buf[0];
  }
}

async function writeBuffer(socket: net.Socket, buffer: Buffer | Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const success = socket.write(buffer as Uint8Array, (err) => {
      if (err) reject(err);
      else resolve();
    });
    // Handle backpressure
    if (!success) {
      socket.once('drain', () => resolve());
    }
  });
}

export async function uploadOTA(
  host: string,
  firmwareBuffer: Buffer,
  password?: string,
  port: number = OTA_PORT,
  onProgress?: ProgressCallback
): Promise<void> {
  const progress = (p: OTAProgress) => {
    if (onProgress) onProgress(p);
  };

  progress({ stage: 'connecting', message: `Connecting to ${host}:${port}...` });

  const socket = new net.Socket();
  // Disable Nagle's algorithm for low-latency protocol communication
  socket.setNoDelay(true);

  try {
    // Connect to device
    await new Promise<void>((resolve, reject) => {
      const connectTimeout = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Connection timeout to ${host}:${port}`));
      }, 10000);

      socket.connect(port, host, () => {
        clearTimeout(connectTimeout);
        resolve();
      });

      socket.on('error', (err) => {
        clearTimeout(connectTimeout);
        reject(err);
      });
    });

    progress({ stage: 'connecting', message: `Connected to ${host}` });

    // Create buffered reader for handling TCP packet fragmentation
    const reader = new SocketReader(socket);

    // Send OTA magic header (5 bytes: 0x6C, 0x26, 0xF7, 0x5C, 0x45)
    await writeBuffer(socket, Buffer.from(OTA_MAGIC));

    // Read response: OK status (1 byte)
    let response = await reader.readByte();
    progress({ stage: 'connecting', message: `Magic response: 0x${response.toString(16)}` });

    if (response !== OTA_RESPONSE_OK) {
      if (response === OTA_RESPONSE_ERROR_MAGIC) {
        throw new Error('Device rejected OTA magic bytes - make sure OTA is enabled');
      }
      throw new Error(`Unexpected response to magic: 0x${response.toString(16)}`);
    }

    // Read server OTA version (1 byte)
    const serverVersion = await reader.readByte();
    progress({ stage: 'connecting', message: `Device OTA version: ${serverVersion}` });

    // Send feature flags (no compression, no SHA256 auth for now)
    await writeBuffer(socket, Buffer.from([0x00]));

    // Read feature acknowledgment (HEADER_OK=0x40, SUPPORTS_COMPRESSION=0x46, or REQUEST_AUTH=0x01/0x02)
    response = await reader.readByte();
    progress({ stage: 'connecting', message: `Feature response: 0x${response.toString(16)}` });

    if (response === OTA_RESPONSE_REQUEST_AUTH || response === OTA_RESPONSE_REQUEST_SHA256_AUTH) {
      progress({ stage: 'authenticating', message: 'Device requires authentication...' });

      if (!password) {
        throw new Error('Device requires OTA password but none provided');
      }

      // Read nonce from device (32 bytes for MD5 auth)
      const nonce = await reader.readBytes(32);

      // Calculate response: MD5(MD5(password) + nonce)
      const passwordHash = crypto.createHash('md5').update(password).digest();
      const combined = new Uint8Array(passwordHash.length + nonce.length);
      combined.set(new Uint8Array(passwordHash), 0);
      combined.set(nonce, passwordHash.length);
      const authResponse = crypto.createHash('md5').update(combined).digest();

      // Send auth response (16 bytes)
      await writeBuffer(socket, authResponse);

      // Check auth result
      response = await reader.readByte();
      if (response !== OTA_RESPONSE_AUTH_OK) {
        if (response === OTA_RESPONSE_ERROR_AUTH_INVALID) {
          throw new Error('Invalid OTA password');
        }
        throw new Error(`Authentication failed with code: 0x${response.toString(16)}`);
      }

      progress({ stage: 'authenticating', message: 'Authentication successful' });
    } else if (response !== OTA_RESPONSE_HEADER_OK && response !== OTA_RESPONSE_SUPPORTS_COMPRESSION) {
      throw new Error(`Unexpected feature response: 0x${response.toString(16)} (expected HEADER_OK=0x40 or SUPPORTS_COMPRESSION=0x46)`);
    }

    progress({ stage: 'preparing', message: 'Preparing firmware upload...' });

    // Send firmware size (4 bytes, big-endian)
    const sizeBuffer = Buffer.alloc(4);
    sizeBuffer.writeUInt32BE(firmwareBuffer.length, 0);
    await writeBuffer(socket, sizeBuffer);

    // Read prepare response
    response = await reader.readByte();
    progress({ stage: 'preparing', message: `Size response: 0x${response.toString(16)}` });

    // Check for error responses (0x80+) only
    if (response >= 0x80) {
      throw new Error(`Device rejected firmware size: ${getErrorMessage(response)} (0x${response.toString(16)})`);
    }

    // Calculate MD5 of firmware
    const md5Hash = crypto.createHash('md5').update(new Uint8Array(firmwareBuffer)).digest('hex');
    progress({ stage: 'preparing', message: `Sending MD5: ${md5Hash}` });

    // Send MD5 (32 bytes as hex string)
    await writeBuffer(socket, Buffer.from(md5Hash, 'ascii'));

    // Read MD5 response
    response = await reader.readByte();
    progress({ stage: 'preparing', message: `MD5 response: 0x${response.toString(16)}` });

    // Check for error responses (0x80+) only
    if (response >= 0x80) {
      throw new Error(`Device rejected MD5: ${getErrorMessage(response)} (0x${response.toString(16)})`);
    }

    progress({
      stage: 'uploading',
      message: 'Uploading firmware...',
      progress: 0,
      bytesWritten: 0,
      totalBytes: firmwareBuffer.length
    });

    // Send firmware in chunks
    // OTA v2: device sends CHUNK_OK (0x47) after every 8192 bytes
    let offset = 0;
    let bytesUntilAck = CHUNK_SIZE;

    while (offset < firmwareBuffer.length) {
      const chunkEnd = Math.min(offset + CHUNK_SIZE, firmwareBuffer.length);
      const chunk = firmwareBuffer.subarray(offset, chunkEnd);

      await writeBuffer(socket, chunk);
      offset = chunkEnd;
      bytesUntilAck -= chunk.length;

      // Wait for CHUNK_OK after every 8192 bytes
      if (bytesUntilAck <= 0 && offset < firmwareBuffer.length) {
        response = await reader.readByte(30000);
        // Accept any non-error response (error codes are 0x80+)
        if (response >= 0x80) {
          throw new Error(`Chunk error: ${getErrorMessage(response)} (0x${response.toString(16)})`);
        }
        bytesUntilAck = CHUNK_SIZE;
      }

      const progressPercent = Math.round((offset / firmwareBuffer.length) * 100);
      progress({
        stage: 'uploading',
        message: `Uploading firmware... ${progressPercent}%`,
        progress: progressPercent,
        bytesWritten: offset,
        totalBytes: firmwareBuffer.length
      });
    }

    progress({ stage: 'verifying', message: 'Waiting for device to verify and install...' });

    // Wait for RECEIVE_OK (all data received)
    response = await reader.readByte(60000);
    progress({ stage: 'verifying', message: `Receive response: 0x${response.toString(16)}` });
    if (response >= 0x80) {
      throw new Error(`Receive error: ${getErrorMessage(response)} (0x${response.toString(16)})`);
    }

    // Wait for UPDATE_END_OK (verification and flash complete)
    response = await reader.readByte(120000); // Long timeout for verification and flash
    progress({ stage: 'verifying', message: `End response: 0x${response.toString(16)}` });
    if (response >= 0x80) {
      throw new Error(`Update verification failed: ${getErrorMessage(response)} (0x${response.toString(16)})`);
    }

    // Send final ACK
    await writeBuffer(socket, Buffer.from([OTA_RESPONSE_OK]));

    progress({ stage: 'done', message: 'OTA upload complete! Device is restarting...' });

  } catch (error) {
    progress({
      stage: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    socket.destroy();
  }
}

// Helper to resolve mDNS hostname to IP
export async function resolveHost(hostname: string): Promise<string> {
  const dns = await import('dns').then(m => m.promises);

  // If it's already an IP, return it
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return hostname;
  }

  // Use dns.lookup() which goes through the OS resolver (supports mDNS on macOS/Linux)
  // This is different from dns.resolve4() which uses DNS protocol directly
  try {
    const result = await dns.lookup(hostname, { family: 4 });
    return result.address;
  } catch (error) {
    throw new Error(`Could not resolve hostname: ${hostname}`);
  }
}
