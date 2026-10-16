// Genera 30 días de ventas de ejemplo para que el dashboard tenga datos desde el inicio.
// Uso: npm run seed
//  - Sin MONGODB_URI → escribe data/ventas.json
//  - Con MONGODB_URI en el archivo .env → carga los datos en MongoDB Atlas (reemplaza los existentes)
require('../services/env');
const productos = require('../services/productos');

// Generador pseudoaleatorio con semilla (resultados reproducibles)
let semilla = 42;
const rand = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);

// Popularidad relativa de cada producto (los postres venden poco a propósito)
const peso = {
  'Tinto': 10, 'Capuccino': 8, 'Latte': 6, 'Chocolate': 3,
  'Frappé': 4, 'Limonada natural': 3, 'Cold brew': 2,
  'Croissant': 5, 'Pandebono': 7, 'Almojábana': 4,
  'Torta de chocolate': 1, 'Cheesecake': 1,
};
const totalPeso = Object.values(peso).reduce((a, b) => a + b, 0);
const elegirProducto = () => {
  let r = rand() * totalPeso;
  for (const p of productos) { r -= peso[p.producto]; if (r <= 0) return p; }
  return productos[0];
};

const ventas = [];
let id = 1;
const fin = new Date('2026-10-15T12:00:00');
for (let d = 29; d >= 0; d--) {
  const dia = new Date(fin);
  dia.setDate(fin.getDate() - d);
  const fecha = dia.toISOString().slice(0, 10);
  const dow = dia.getDay(); // 0 domingo, 6 sábado

  let transacciones = 18 + Math.round((29 - d) * 0.25); // leve tendencia al alza
  if (dow === 6) transacciones += 10;                  // sábado: día fuerte
  if (dow === 0) transacciones += 5;
  if (fecha === '2026-10-07') transacciones = 6;       // día atípico (anomalía)
  transacciones += Math.round(rand() * 4 - 2);

  for (let t = 0; t < transacciones; t++) {
    const p = elegirProducto();
    const cantidad = 1 + Math.floor(rand() * 3);
    ventas.push({
      id: id++, fecha, producto: p.producto, categoria: p.categoria,
      cantidad, precio: p.precio, total: cantidad * p.precio,
    });
  }
}

const { reemplazarVentas, cerrar, modo } = require('../services/datos');
(async () => {
  try {
    await reemplazarVentas(ventas);
    console.log(`✔ ${ventas.length} ventas de ejemplo guardadas en ${modo()}`);
  } catch (e) {
    console.error('❌ No se pudieron guardar los datos:', e.message);
    process.exitCode = 1;
  } finally {
    await cerrar();
  }
})();
