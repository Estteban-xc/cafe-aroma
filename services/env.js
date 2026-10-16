// Carga las variables del archivo .env (si existe) — requiere Node.js 20.12 o superior (el proyecto pide 20.19+).
// En Vercel no hay .env: las variables se configuran en el panel del proyecto.
const fs = require('fs');
const path = require('path');

const ruta = path.join(__dirname, '..', '.env');
if (fs.existsSync(ruta) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(ruta);
}
