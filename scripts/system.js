// system.js - Service discovery for apps/*/services.js
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const appsDir = path.join(rootDir, 'apps');

const services = [];
const routers = [];

fs.readdirSync(appsDir).forEach((app) => {
    const appPath = path.join(appsDir, app);
    if (fs.statSync(appPath).isDirectory()) {
        // Check for services.js or services.cjs (for ES module packages)
        let servicesPath = path.join(appPath, 'services.js');
        if (!fs.existsSync(servicesPath)) {
            servicesPath = path.join(appPath, 'services.cjs');
        }
        if (fs.existsSync(servicesPath)) {
            const appServices = require(servicesPath);
            if (Array.isArray(appServices)) {
                const enabledServices = appServices.filter(s => !s.disabled);
                services.push(...enabledServices);
                routers.push(...appServices);
            }
        }
    }
});

module.exports = { services, routers };
