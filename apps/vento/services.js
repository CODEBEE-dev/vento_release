// Unified service routing for apps/vento
// Handles both /api/core/v1/ and /api/v1/ endpoints

const services = [
    {
        "name": "vento",
        "disabled": false,  // ENABLED
        "description": "Unified Vento services (core + api merged)",
        "route": (req) => {
            // Capture all API requests:
            // - /api/core/v1/* (former apps/core endpoints)
            // - /api/v1/* (former apps/api endpoints)
            // - /api/core and /api/v1 root paths
            if (req.url.startsWith('/api/core/') ||
                req.url == '/api/core' ||
                req.url.startsWith('/api/v1/') ||
                req.url == '/api/v1') {
                return process.env.VENTO_URL ?? 'http://localhost:8000'
            }
        }
    },
    {
        "name": "vento-websocket",
        "disabled": false,
        "type": "route",
        "route": (req) => {
            if (req.url == '/websocket') {
                return process.env.WEBSOCKET_URL ?? 'http://localhost:3003'
            }
        }
    }
]

module.exports = services
