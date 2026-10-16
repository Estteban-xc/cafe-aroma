// Registro de ventas por consola (terminal de Node.js)
// Uso:  npm run registrar                                       → guarda en local (o en MongoDB si hay MONGODB_URI en .env)
//       npm run registrar -- https://tu-app.vercel.app          → envía las ventas a la app publicada
require('../services/env');
const readline = require('readline');
const productos = require('../services/productos');
const { guardarVenta, cerrar, modo } = require('../services/datos');

// URL de la app publicada: se pasa como argumento o en la variable API_URL
const API_URL = process.argv[2] || process.env.API_URL;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const preguntar = (q) => new Promise((r) => rl.question(q, (resp) => r(resp.trim())));
const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

function mostrarMenu() {
  console.log('\n☕  CAFÉ AROMA — Registro de ventas');
  console.log('──────────────────────────────────────────────');
  productos.forEach((p, i) => {
    const num = String(i + 1).padStart(2, ' ');
    console.log(`${num}. ${p.producto.padEnd(20)} ${p.categoria.padEnd(18)} $${p.precio.toLocaleString('es-CO')}`);
  });
  console.log('──────────────────────────────────────────────');
}

async function registrar(venta) {
  if (!API_URL) {
    const item = productos.find((p) => p.producto === venta.producto);
    return guardarVenta({ ...venta, categoria: item.categoria, precio: item.precio });
  }
  const resp = await fetch(`${API_URL.replace(/\/$/, '')}/api/ventas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(venta),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error);
  return data;
}

async function main() {
  console.log(API_URL ? `(Enviando ventas a ${API_URL})` : `(Guardando ventas en ${modo()})`);
  let seguir = true;
  while (seguir) {
    mostrarMenu();
    const op = Number(await preguntar('Número del producto: '));
    if (!Number.isInteger(op) || op < 1 || op > productos.length) {
      console.log('❌ Opción no válida, intenta de nuevo.');
      continue;
    }
    const cantidad = Number(await preguntar('Cantidad: '));
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      console.log('❌ La cantidad debe ser un número entero mayor que 0.');
      continue;
    }
    const fecha = (await preguntar(`Fecha (AAAA-MM-DD) [Enter = ${hoy()}]: `)) || hoy();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      console.log('❌ Formato de fecha no válido.');
      continue;
    }

    try {
      const v = await registrar({ producto: productos[op - 1].producto, cantidad, fecha });
      console.log(`✅ Venta #${v.id} registrada: ${v.cantidad} x ${v.producto} = $${v.total.toLocaleString('es-CO')}`);
    } catch (e) {
      console.log(`❌ No se pudo registrar: ${e.message}`);
    }

    const otra = (await preguntar('¿Registrar otra venta? (s/n): ')).toLowerCase();
    seguir = otra === 's' || otra === 'si' || otra === 'sí';
  }
  console.log('\n👋 Listo. Abre o recarga el dashboard para ver los cambios.');
  rl.close();
  await cerrar();
}

main();
