/**
 * vento.js
 *
 * Main entry point for Vento. Handles process management and environment preparation.
 *
 * Usage:
 *   node vento.js                     # Start all services (default)
 *   node vento.js start               # Start all services
 *   node vento.js start <name>        # Start specific service
 *   node vento.js stop                # Stop all services
 *   node vento.js stop <name>         # Stop specific service
 *   node vento.js restart             # Restart all services
 *   node vento.js restart <name>      # Restart specific service
 *   node vento.js status              # Show service status
 *   node vento.js --prod              # Start in production mode
 *   node vento.js --prepare           # Prepare environment (download binaries, pages, etc.)
 *
 * Prepare flags:
 *   --skip-pages-download             # Skip downloading compiled pages
 *   --skip-download-client            # Skip downloading vento agent
 *   --skip-llama-download             # Skip downloading llama-server
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const kill = require('tree-kill');
const semver = require('semver');
const system = require('./scripts/system.js');

// ============================================================================
// Configuration
// ============================================================================

const rootDir = __dirname;  // start.js is now at project root
const stateDir = path.join(rootDir, 'data', 'system');
const stateFile = path.join(stateDir, 'processes.json');
const logsDir = path.join(rootDir, 'logs');

// ============================================================================
// Log Rotation
// ============================================================================

/**
 * Rotates logs/raw to logs/raw_X where X is an incremental number.
 * This preserves logs from previous sessions for debugging.
 *
 * Example:
 *   - Current session: logs/raw/
 *   - Previous session: logs/raw_3/
 *   - Before that: logs/raw_2/
 *   - First session: logs/raw_1/
 */
function rotateLogs() {
    const rawDir = path.join(logsDir, 'raw');

    // If logs/raw doesn't exist or is empty, nothing to rotate
    if (!fs.existsSync(rawDir)) {
        return;
    }

    const files = fs.readdirSync(rawDir);
    if (files.length === 0) {
        return;
    }

    // Find the highest existing raw_X number
    let maxNum = 0;
    const entries = fs.readdirSync(logsDir);
    for (const entry of entries) {
        const match = entry.match(/^raw_(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) {
                maxNum = num;
            }
        }
    }

    // Move raw to raw_{maxNum + 1}
    const newNum = maxNum + 1;
    const newDir = path.join(logsDir, `raw_${newNum}`);

    console.log(`📁 Rotating logs: raw -> raw_${newNum}`);
    fs.renameSync(rawDir, newDir);

    // Create fresh raw directory
    fs.mkdirSync(rawDir, { recursive: true });
}

// ============================================================================
// Prepare Environment (inlined from scripts/prepare.js)
// ============================================================================

async function runPrepare(options = {}) {
    const {
        skipPages = false,
        skipClient = false,
        skipLlama = false
    } = options;

    // Check Node.js version
    const requiredVersion = '>=18.0.0';
    if (!semver.satisfies(process.version, requiredVersion)) {
        console.error(`Vento requires Node.js ${requiredVersion}. Current: ${process.version}`);
        process.exit(1);
    }

    console.log('🔧 Preparing environment...\n');

    // 1. Create directories
    const directories = [
        path.join(rootDir, 'bin'),
        path.join(rootDir, 'data'),
        path.join(rootDir, 'data', 'public'),
        path.join(rootDir, 'data', 'models'),
        path.join(rootDir, 'data', 'public', 'clients'),
        path.join(rootDir, 'data', 'public', 'clients', 'desktop'),
        path.join(rootDir, 'data', 'tmp'),
        path.join(rootDir, 'data', 'settings'),
        path.join(rootDir, 'logs', 'raw'),
        path.join(rootDir, 'data', 'databases')
    ];

    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    // 2. Download pages
    if (!skipPages) {
        const { downloadPages } = require(path.join(rootDir, 'scripts', 'download-pages'));
        await downloadPages();
    } else {
        console.log('Skipping pages download (--skip-pages-download flag)');
        const pagesDir = path.join(rootDir, 'data', 'pages');
        if (!fs.existsSync(pagesDir)) {
            fs.mkdirSync(pagesDir, { recursive: true });
        }
    }

    // 3. Download Android client APK
    const { downloadApk } = require(path.join(rootDir, 'scripts', 'download-apk'));
    await downloadApk();

    // 4. Download desktop agents
    const { downloadDesktopAgents } = require(path.join(rootDir, 'scripts', 'download-desktop-agents'));
    await downloadDesktopAgents();

    // 5. Download vento agent binary
    if (!skipClient) {
        const { downloadAgent } = require(path.join(rootDir, 'scripts', 'download-agent'));
        await downloadAgent({ force: false });
    } else {
        console.log('Skipping agent download (--skip-download-client flag)');
    }

    // 6. Download llama-server
    if (!skipLlama) {
        const downloadLlama = require(path.join(rootDir, 'scripts', 'download-llama'));
        await downloadLlama();
    } else {
        console.log('Skipping llama-server download (--skip-llama-download flag)');
    }

    console.log('\n✅ Prepare complete!\n');
}

// ============================================================================
// CLI Parser
// ============================================================================

function parseArgs() {
    const args = process.argv.slice(2);
    const result = {
        command: 'start',
        target: null,
        isProd: false,
        // Prepare options
        isPrepare: false,
        skipPages: false,
        skipClient: false,
        skipLlama: false,
        // Add user options
        addUserArgs: []
    };

    // Check for --help or -h flag
    if (args.includes('--help') || args.includes('-h')) {
        result.command = 'help';
        return result;
    }

    // Check for --prepare flag
    if (args.includes('--prepare')) {
        result.command = 'prepare';
        result.isPrepare = true;
        result.skipPages = args.includes('--skip-pages-download') || process.env.SKIP_PAGES_DOWNLOAD === 'true';
        result.skipClient = args.includes('--skip-download-client') || process.env.SKIP_DOWNLOAD_CLIENT === 'true';
        result.skipLlama = args.includes('--skip-llama-download') || process.env.SKIP_LLAMA_DOWNLOAD === 'true';
        return result;
    }

    // Check for add-user command
    if (args[0] === 'add-user') {
        result.command = 'add-user';
        result.addUserArgs = args.slice(1);
        return result;
    }

    // Check for --prod flag
    const prodIndex = args.indexOf('--prod');
    if (prodIndex !== -1) {
        result.isProd = true;
        args.splice(prodIndex, 1);
    }

    // Parse command and target
    if (args.length === 0) {
        result.command = 'start';
    } else {
        const cmd = args[0].toLowerCase();
        if (['start', 'stop', 'restart', 'status'].includes(cmd)) {
            result.command = cmd;
            result.target = args[1] || null;
        } else {
            // Assume it's a target name for start
            result.target = args[0];
        }
    }

    return result;
}

// ============================================================================
// State File Management
// ============================================================================

function ensureStateDir() {
    if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
    }
}

function readState() {
    try {
        if (fs.existsSync(stateFile)) {
            return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        }
    } catch (e) {
        // Ignore errors, return empty state
    }
    return { startedAt: null, processes: {} };
}

function writeState(state) {
    ensureStateDir();
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

function updateProcessState(name, data) {
    const state = readState();
    state.processes[name] = { ...state.processes[name], ...data };
    writeState(state);
}

function removeProcessState(name) {
    const state = readState();
    delete state.processes[name];
    writeState(state);
}

/**
 * Marca un proceso como "stopped manually" para que el manager
 * sepa que no debe reiniciarlo cuando detecte que murió.
 */
function markProcessAsStopped(name) {
    const state = readState();
    if (state.processes[name]) {
        state.processes[name].manuallyStopped = true;
        state.processes[name].stoppedAt = Date.now();
        writeState(state);
    }
}

/**
 * Verifica si un proceso fue marcado como "stopped manually" recientemente
 * (dentro de los últimos 5 segundos - suficiente para que el proceso muera)
 */
function wasStoppedManually(name) {
    const state = readState();
    const proc = state.processes[name];
    if (proc && proc.manuallyStopped) {
        // Verificar que fue hace menos de 5 segundos
        const elapsed = Date.now() - (proc.stoppedAt || 0);
        return elapsed < 5000;
    }
    return false;
}

// ============================================================================
// Timestamp Formatting
// ============================================================================

function formatTimestamp(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// ============================================================================
// Console Colors
// ============================================================================

// Tabla de colores para servicios (sin rojo, reservado para errores)
const ALL_SERVICE_COLORS = [
    '\x1b[32m',    // Verde
    '\x1b[33m',    // Amarillo
    '\x1b[34m',    // Azul
    '\x1b[35m',    // Magenta
    '\x1b[36m',    // Cyan
    '\x1b[92m',    // Verde brillante
    '\x1b[93m',    // Amarillo brillante
    '\x1b[94m',    // Azul brillante
    '\x1b[95m',    // Magenta brillante
    '\x1b[96m',    // Cyan brillante
];

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const WHITE = '\x1b[37m';

// Cache de colores por servicio
const serviceColorCache = new Map();
// Lista de colores disponibles (se va vaciando y se restaura cuando se agota)
let availableColors = [...ALL_SERVICE_COLORS];

/**
 * Calcula un hash simple de un string
 */
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash; // Convertir a 32bit integer
    }
    return Math.abs(hash);
}

/**
 * Obtiene un color consistente para un servicio basado en su nombre.
 * Los colores no se repiten hasta que se agotan todos.
 * El mismo nombre siempre devuelve el mismo color (determinista).
 */
function getServiceColor(serviceName) {
    // Si ya tiene color asignado, devolverlo
    if (serviceColorCache.has(serviceName)) {
        return serviceColorCache.get(serviceName);
    }
    
    // Si no quedan colores disponibles, restaurar la lista completa
    if (availableColors.length === 0) {
        availableColors = [...ALL_SERVICE_COLORS];
    }
    
    // Usar hash del nombre para seleccionar de los colores disponibles
    const hash = hashString(serviceName);
    const colorIndex = hash % availableColors.length;
    const color = availableColors[colorIndex];
    
    // Remover el color de la lista de disponibles
    availableColors.splice(colorIndex, 1);
    
    // Guardar en cache
    serviceColorCache.set(serviceName, color);
    
    return color;
}

// ============================================================================
// Log Stream Handler
// ============================================================================

function createLogHandler(name, logFile, isError = false) {
    // Ensure log directory exists
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    const writeStream = fs.createWriteStream(logFile, { flags: 'a' });
    const serviceColor = getServiceColor(name);
    let closed = false;

    return {
        write(line) {
            if (closed) return; // Ignore writes after close

            const timestamp = formatTimestamp();
            const logLine = `${timestamp} | ${line}`;

            // Write to file (sin colores)
            writeStream.write(logLine + '\n');

            // Write to console con colores
            if (isError) {
                console.log(`${serviceColor}[${name}]${RESET} ${RED}[ERROR]${RESET} ${WHITE}${line}${RESET}`);
            } else {
                console.log(`${serviceColor}[${name}]${RESET} ${WHITE}${line}${RESET}`);
            }
        },
        close() {
            closed = true;
            writeStream.end();
        }
    };
}

// ============================================================================
// ManagedProcess Class
// ============================================================================

class ManagedProcess {
    constructor(config, manager) {
        this.config = config;
        this.manager = manager;
        this.child = null;
        this.restartCount = 0;
        this.lastRestartTime = 0;
        this.isShuttingDown = false;
        this.stdoutHandler = null;
        this.stderrHandler = null;
    }

    get name() {
        return this.config.name;
    }

    buildCommand() {
        const { config } = this;
        let command;
        let args = [];

        // Handle interpreter
        if (config.interpreter === 'none') {
            // Direct binary execution
            command = config.script;
        } else {
            // Use interpreter - check for local node in bin/ first
            if (!config.interpreter || config.interpreter === 'node') {
                const localNode = process.platform === 'win32'
                    ? path.join(rootDir, 'bin', 'node.exe')
                    : path.join(rootDir, 'bin', 'node');

                if (fs.existsSync(localNode)) {
                    command = localNode;
                } else {
                    command = 'node';
                }
            } else {
                command = config.interpreter;
            }

            // Add interpreter_args (e.g., '--import tsx')
            if (config.interpreter_args) {
                args.push(...config.interpreter_args.split(/\s+/));
            }

            // Add node_args (e.g., '--max-old-space-size=4096')
            if (config.node_args) {
                args.push(...config.node_args.split(/\s+/));
            }

            // Add script
            args.push(config.script);
        }

        // Add script args
        if (config.args) {
            if (Array.isArray(config.args)) {
                args.push(...config.args);
            } else {
                args.push(...config.args.split(/\s+/));
            }
        }

        return { command, args };
    }

    spawn() {
        if (this.child) {
            console.log(`[${this.name}] Already running (PID: ${this.child.pid})`);
            return;
        }

        const { config } = this;
        const { command, args } = this.buildCommand();

        // Resolve paths relative to cwd
        const cwd = config.cwd ? path.resolve(rootDir, config.cwd) : rootDir;

        // Resolve log files relative to cwd
        const outFile = config.out_file
            ? path.resolve(cwd, config.out_file)
            : path.join(rootDir, 'logs', 'raw', `${this.name}.stdout.log`);
        const errFile = config.error_file
            ? path.resolve(cwd, config.error_file)
            : path.join(rootDir, 'logs', 'raw', `${this.name}.stderr.log`);

        // Create log handlers
        this.stdoutHandler = createLogHandler(this.name, outFile, false);
        this.stderrHandler = createLogHandler(this.name, errFile, true);

        // Build environment - include SERVICE_NAME so apps know their identity
        const env = { ...process.env, ...config.env, SERVICE_NAME: this.name };

        const serviceColor = getServiceColor(this.name);
        console.log(`${serviceColor}[${this.name}]${RESET} Starting: ${command} ${args.join(' ')}`);
        console.log(`${serviceColor}[${this.name}]${RESET} CWD: ${cwd}`);

        try {
            this.child = spawn(command, args, {
                cwd,
                env,
                windowsHide: config.windowsHide !== false,
                shell: false,
                detached: false,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            // Update state
            updateProcessState(this.name, {
                pid: this.child.pid,
                status: 'running',
                restarts: this.restartCount,
                startedAt: new Date().toISOString()
            });

            console.log(`${serviceColor}[${this.name}]${RESET} Started (PID: ${this.child.pid})`);

            // Handle stdout
            if (this.child.stdout) {
                const rl = readline.createInterface({ input: this.child.stdout });
                rl.on('line', (line) => {
                    this.stdoutHandler.write(line);
                });
            }

            // Handle stderr
            if (this.child.stderr) {
                const rl = readline.createInterface({ input: this.child.stderr });
                rl.on('line', (line) => {
                    this.stderrHandler.write(line);
                });
            }

            // Handle exit
            this.child.on('exit', (code, signal) => {
                this.onExit(code, signal);
            });

            this.child.on('error', (err) => {
                console.error(`${serviceColor}[${this.name}]${RESET} ${RED}[ERROR]${RESET} ${err.message}`);
                this.stderrHandler.write(`Error: ${err.message}`);
            });

        } catch (err) {
            const serviceColor = getServiceColor(this.name);
            console.error(`${serviceColor}[${this.name}]${RESET} ${RED}[ERROR]${RESET} Failed to spawn: ${err.message}`);
            updateProcessState(this.name, { status: 'error', error: err.message });
        }
    }

    onExit(code, signal) {
        const { config } = this;
        const serviceColor = getServiceColor(this.name);
        
        // Close log handlers
        if (this.stdoutHandler) this.stdoutHandler.close();
        if (this.stderrHandler) this.stderrHandler.close();
        
        this.child = null;

        // Si el manager está cerrando, no reiniciar
        if (this.isShuttingDown) {
            console.log(`${serviceColor}[${this.name}]${RESET} Stopped`);
            removeProcessState(this.name);
            return;
        }

        // Verificar si fue detenido manualmente desde otra terminal
        if (wasStoppedManually(this.name)) {
            console.log(`${serviceColor}[${this.name}]${RESET} Stopped manually (not restarting)`);
            removeProcessState(this.name);
            return;
        }

        console.log(`${serviceColor}[${this.name}]${RESET} Exited (code: ${code}, signal: ${signal})`);
        updateProcessState(this.name, { status: 'stopped', exitCode: code, signal: signal });

        // Handle autorestart - reiniciar si:
        // 1. autorestart está habilitado (default)
        // 2. El proceso terminó con error (code !== 0) O terminó por una señal (crash/kill externo)
        const shouldRestart = config.autorestart !== false && (code !== 0 || signal !== null);
        
        if (shouldRestart) {
            // Reset restart count if last restart was more than 5 minutes ago
            const now = Date.now();
            if (now - this.lastRestartTime > 5 * 60 * 1000) {
                this.restartCount = 0;
            }

            // Backoff: 0.5s, 0.65s, 0.85s, 1.1s, 1.4s, 1.9s, 2.4s, 3.1s, 4.1s, 5s max
            // Never give up - just cap at 5 seconds
            let delay = Math.min(500 * Math.pow(1.3, this.restartCount), 5000);
            
            // GPU processes (like core with llama) need more time between restarts
            // to allow the GPU driver to fully release resources
            // Use restart_delay config or default to calculated backoff
            const minDelay = config.restart_delay || 0;
            if (minDelay > delay) {
                delay = minDelay;
            }
            
            this.restartCount++;
            this.lastRestartTime = now;

            console.log(`${serviceColor}[${this.name}]${RESET} Restarting in ${delay / 1000}s (attempt ${this.restartCount})...`);
            updateProcessState(this.name, { status: 'restarting' });

            setTimeout(() => {
                if (!this.isShuttingDown && !this.child) {
                    this.spawn();
                }
            }, delay);
        } else {
            console.log(`${serviceColor}[${this.name}]${RESET} Exited cleanly (code 0), not restarting`);
        }
    }

    async kill() {
        return new Promise((resolve) => {
            if (!this.child) {
                resolve();
                return;
            }

            this.isShuttingDown = true;
            const pid = this.child.pid;
            // GPU processes need more time for cleanup (prevents Windows GPU crash)
            const timeout = this.config.kill_timeout || 10000;
            const serviceColor = getServiceColor(this.name);

            console.log(`${serviceColor}[${this.name}]${RESET} Stopping (PID: ${pid})...`);

            // IMPORTANT: Send SIGTERM directly to the process first (not tree-kill)
            // This gives the process a chance to do graceful cleanup (like GPU resources)
            try {
                process.kill(pid, 'SIGTERM');
            } catch (e) {
                // Process may already be dead
                resolve();
                return;
            }

            // Wait for process to exit gracefully
            const forceKillTimer = setTimeout(() => {
                if (this.child) {
                    console.log(`${serviceColor}[${this.name}]${RESET} Force killing after timeout...`);
                    // Now use tree-kill as last resort
                    kill(pid, 'SIGKILL', () => {
                        resolve();
                    });
                } else {
                    resolve();
                }
            }, timeout);

            // Clear timer if process exits normally
            const checkInterval = setInterval(() => {
                if (!this.child) {
                    clearTimeout(forceKillTimer);
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }
}

// ============================================================================
// ProcessManager Class
// ============================================================================

class ProcessManager {
    constructor() {
        this.processes = new Map();
        this.isShuttingDown = false;
    }

    loadConfig() {
        const services = system.services;

        // Build apps array from service.config.js files
        const apps = services.reduce((total, service) => {
            if (service.disabled) return total;
            if (service.type === 'route') return total;

            const servicePath = path.join(rootDir, 'apps', service.dirname ?? service.name);
            // Check for service.config.js or service.config.cjs (for ES module packages)
            let serviceConfig = path.join(servicePath, 'service.config.js');
            if (!fs.existsSync(serviceConfig)) {
                serviceConfig = path.join(servicePath, 'service.config.cjs');
            }

            // Check for service.config.js/cjs
            if (fs.existsSync(serviceConfig)) {
                delete require.cache[require.resolve(serviceConfig)];
                console.log(`Loading config for: ${service.name}`);
                return [...total, ...require(serviceConfig).apps];
            }

            return total;
        }, []);

        return apps;
    }

    async start(targetName = null) {
        const apps = this.loadConfig();
        
        if (apps.length === 0) {
            console.log('No apps configured (no service.config.js files found)');
            return;
        }
        
        // Update state
        const state = readState();
        state.startedAt = new Date().toISOString();
        writeState(state);

        console.log(`\n🚀 Starting Vento...\n`);

        for (const appConfig of apps) {
            if (targetName && appConfig.name !== targetName) {
                continue;
            }

            const proc = new ManagedProcess(appConfig, this);
            this.processes.set(appConfig.name, proc);
            proc.spawn();
        }

        if (targetName && this.processes.size === 0) {
            console.error(`Process '${targetName}' not found in configuration`);
        }
    }

    async stop(targetName = null) {
        if (targetName) {
            // Stop specific process
            const proc = this.processes.get(targetName);
            if (proc) {
                await proc.kill();
                this.processes.delete(targetName);
            } else {
                // Try to find in state file
                const state = readState();
                if (state.processes[targetName]) {
                    const pid = state.processes[targetName].pid;
                    console.log(`Stopping ${targetName} (PID: ${pid})...`);
                    await new Promise(resolve => {
                        kill(pid, 'SIGTERM', () => resolve());
                    });
                    removeProcessState(targetName);
                } else {
                    console.error(`Process '${targetName}' not found`);
                }
            }
        } else {
            // Stop all
            console.log('\n🛑 Stopping all processes...\n');
            
            const promises = [];
            for (const [name, proc] of this.processes) {
                promises.push(proc.kill());
            }
            await Promise.all(promises);
            
            this.processes.clear();
            writeState({ startedAt: null, processes: {} });
        }
    }

    async restart(targetName = null) {
        if (targetName) {
            await this.stop(targetName);
            await this.start(targetName);
        } else {
            await this.stop();
            await this.start();
        }
    }

    status() {
        const state = readState();
        
        console.log('\n📊 Process Status\n');
        console.log('─'.repeat(60));
        
        if (state.startedAt) {
            console.log(`Started at: ${state.startedAt}`);
            console.log('─'.repeat(60));
        }

        const entries = Object.entries(state.processes);
        
        if (entries.length === 0) {
            console.log('No processes running');
            } else {
            for (const [name, info] of entries) {
                const statusColor = info.status === 'running' ? '\x1b[32m' : '\x1b[31m';
                const reset = '\x1b[0m';
                console.log(`${statusColor}●${reset} ${name.padEnd(20)} PID: ${String(info.pid).padEnd(8)} Status: ${info.status.padEnd(12)} Restarts: ${info.restarts || 0}`);
            }
        }
        
        console.log('─'.repeat(60));
        console.log('');
    }

    setupSignalHandlers() {
        const cleanup = async () => {
            if (this.isShuttingDown) return;
            this.isShuttingDown = true;
            
            console.log('\n');
            await this.stop();
            console.log('\n✅ Shutdown complete.\n');
            process.exit(0);
        };

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

        // Windows-specific handling
if (process.platform === 'win32') {
            const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
            rl.on('SIGINT', cleanup);
            rl.on('close', cleanup);
        }
    }
}

// ============================================================================
// External Commands (stop/restart/status from another process)
// ============================================================================

async function stopExternal(targetName = null) {
    const state = readState();
    
    // Helper: gracefully stop a single process
    const gracefulStop = async (name, pid) => {
        console.log(`Stopping ${name} (PID: ${pid})...`);
        markProcessAsStopped(name);
        
        return new Promise(resolve => {
            // Send SIGTERM directly first (allows graceful GPU cleanup)
            try {
                process.kill(pid, 'SIGTERM');
            } catch (e) {
                // Process may already be dead
                resolve();
                return;
            }
            
            // Check if process exited, with timeout
            let checks = 0;
            const maxChecks = 100; // 10 seconds max (100 * 100ms)
            
            const checkInterval = setInterval(() => {
                checks++;
                try {
                    // Check if process is still running (throws if dead)
                    process.kill(pid, 0);
                    
                    if (checks >= maxChecks) {
                        // Timeout - force kill
                        console.log(`${name} didn't stop gracefully, force killing...`);
                        clearInterval(checkInterval);
                        kill(pid, 'SIGKILL', () => resolve());
                    }
                } catch (e) {
                    // Process is dead
                    clearInterval(checkInterval);
                    console.log(`${name} stopped`);
                    resolve();
                }
            }, 100);
        });
    };
    
    if (targetName) {
        const proc = state.processes[targetName];
        if (proc && proc.pid) {
            await gracefulStop(targetName, proc.pid);
        } else {
            console.error(`Process '${targetName}' not found or not running`);
        }
    } else {
        console.log('Stopping all processes (waiting for graceful shutdown)...');
        
        // Stop all processes in parallel
        const stopPromises = [];
        for (const [name, info] of Object.entries(state.processes)) {
            if (info.pid) {
                stopPromises.push(gracefulStop(name, info.pid));
            }
        }
        
        await Promise.all(stopPromises);
        writeState({ startedAt: null, processes: {} });
        console.log('All processes stopped');
    }
}

async function restartExternal(targetName = null) {
    // For restart, we need to stop first and then start
    await stopExternal(targetName);
    
    // Small delay to ensure processes are fully stopped
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start a new manager
    const manager = new ProcessManager();
    await manager.start(targetName);
    manager.setupSignalHandlers();
    
    // Keep running
    await new Promise(() => {}); // Keep alive
}

function showHelp() {
    console.log(`
Vento - Process Manager

Usage:
  ./vento [command] [options]
  node vento.js [command] [options]

Commands:
  start [name]      Start all services (default) or a specific service
  stop [name]       Stop all services or a specific service
  restart [name]    Restart all services or a specific service
  status            Show status of all services
  add-user          Add a new user (requires: email, password, type)

Development (via ./vento script only):
  dev               Start in development mode (with FULL_DEV=1)
  dev-fast          Start in development mode (skip yarn install)

Options:
  --help, -h        Show this help message
  --prod            Start in production mode
  --prepare         Prepare environment (download binaries, pages, etc.)
  -fast             Start without running yarn install first

Prepare flags (use with --prepare):
  --skip-pages-download     Skip downloading compiled pages
  --skip-download-client    Skip downloading vento agent
  --skip-llama-download     Skip downloading llama-server

Examples:
  ./vento                   Start all services (production)
  ./vento dev               Start in development mode
  ./vento dev-fast          Start in development mode (skip install)
  ./vento -fast             Start quickly (skip yarn install)
  ./vento start vento       Start only the 'vento' service
  ./vento stop              Stop all services
  ./vento stop agent        Stop only the 'agent' service
  ./vento restart           Restart all services
  ./vento status            Show service status
  ./vento --prepare         Prepare environment
  ./vento --prod            Start in production mode
  ./vento add-user user@example.com password admin
`);
}

function showStatus() {
    const state = readState();
    
    console.log('\n📊 Process Status\n');
    console.log('─'.repeat(70));
    
    if (state.startedAt) {
        console.log(`Manager started at: ${state.startedAt}`);
        console.log('─'.repeat(70));
    }

    const entries = Object.entries(state.processes);
    
    if (entries.length === 0) {
        console.log('No processes registered');
    } else {
        console.log('Name'.padEnd(22) + 'PID'.padEnd(10) + 'Status'.padEnd(14) + 'Restarts'.padEnd(10) + 'Started');
        console.log('─'.repeat(70));
        
        for (const [name, info] of entries) {
            const statusColor = info.status === 'running' ? '\x1b[32m' : 
                               info.status === 'restarting' ? '\x1b[33m' : '\x1b[31m';
            const reset = '\x1b[0m';
            const started = info.startedAt ? new Date(info.startedAt).toLocaleTimeString() : '-';
            console.log(
                `${statusColor}●${reset} ${name.padEnd(20)} ` +
                `${String(info.pid || '-').padEnd(10)} ` +
                `${info.status.padEnd(14)} ` +
                `${String(info.restarts || 0).padEnd(10)} ` +
                `${started}`
            );
        }
    }
    
    console.log('─'.repeat(70));
    console.log('');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
    const { command, target, isProd, skipPages, skipClient, skipLlama, addUserArgs } = parseArgs();

    // Set environment
    if (isProd) {
        process.env.NODE_ENV = 'production';
    }

    switch (command) {
        case 'help':
            showHelp();
            break;

        case 'prepare':
            await runPrepare({ skipPages, skipClient, skipLlama });
            break;

        case 'status':
            showStatus();
            break;

        case 'stop':
            await stopExternal(target);
            break;

        case 'restart':
            await restartExternal(target);
            break;

        case 'add-user':
            if (addUserArgs.length < 3) {
                console.error('Usage: node vento.js add-user <email> <password> <type>');
                process.exit(1);
            }
            const addUserScript = path.join(rootDir, 'apps', 'vento', 'addUser.js');
            const addUserProc = spawn(process.execPath, [addUserScript, ...addUserArgs], {
                stdio: 'inherit',
                cwd: path.join(rootDir, 'apps', 'vento')
            });
            addUserProc.on('close', (code) => process.exit(code));
            break;

        case 'start':
        default:
            // Check if already running
            const state = readState();
            const runningProcesses = Object.values(state.processes).filter(p => p.status === 'running');

            if (runningProcesses.length > 0 && !target) {
                console.log('\n⚠️  Processes already running. Use "stop" first or "restart" to restart.\n');
                showStatus();
                return;
            }

            // Rotate logs from previous session
            rotateLogs();

            const manager = new ProcessManager();
            manager.setupSignalHandlers();
            await manager.start(target);
            
            // Keep the process running
            console.log('\n📝 Press Ctrl+C to stop all processes\n');
            await new Promise(() => {}); // Keep alive
            break;
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
