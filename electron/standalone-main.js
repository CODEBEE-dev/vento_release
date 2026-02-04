// standalone-main.js
// Entry point for Electron standalone mode (vento embebido)
// Este archivo se usa cuando Electron arranca con vento ya incluido en extraResources

const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// En Electron empaquetado, extraResources está en process.resourcesPath
// En desarrollo, está junto a __dirname
function getVentoPath() {
  // Modo empaquetado (app.isPackaged es true cuando se ejecuta desde el .exe)
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'vento');
  }
  // Modo desarrollo (para testing antes de empaquetar)
  return path.join(__dirname, '..', 'vento-extracted');
}

app.whenReady().then(() => {
  const ventoPath = getVentoPath();

  console.log('🔍 Looking for embedded Vento at:', ventoPath);

  if (fs.existsSync(ventoPath)) {
    console.log('✅ Found embedded Vento');
    console.log('📂 Vento path:', ventoPath);

    // Skip yarn install - standalone comes with node_modules pre-installed
    process.env.SKIP_INSTALL = '1';

    // Cargar el main.js que ya existe y pasarle la ruta de vento
    const startMain = require('./main.js');
    startMain(ventoPath);
  } else {
    console.error('❌ No embedded Vento found at:', ventoPath);
    console.error('This standalone build requires vento to be included in extraResources.');
    console.error('Run: yarn build && node scripts/extract.js ./vento-extracted && electron-builder -c electron-builder.standalone.yml');

    // Mostrar un diálogo de error antes de salir
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Vento Not Found',
      `Could not find embedded Vento at:\n${ventoPath}\n\nThis is a standalone build that requires vento to be bundled.`
    );

    app.quit();
  }
});

// Manejar el evento window-all-closed (requerido en algunas plataformas)
app.on('window-all-closed', () => {
  // En macOS es común que las apps sigan activas hasta que el usuario cierre explícitamente
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
