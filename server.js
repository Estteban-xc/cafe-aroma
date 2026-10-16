// Servidor Express — API REST + archivos estáticos del dashboard
// Funciona igual en local (npm start) y en Vercel (se exporta la app).
require('./services/env');
const express = require('express');
const path = require('path');
const { leerVentas, guardarVenta, modo } = require('./services/datos');
const { analizar } = require('./services/analisis');
const productos = require('./services/productos');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// En local sirve la carpeta public/. En Vercel, public/ se publica automáticamente en su CDN.
app.use(express.static(path.join(__dirname, 'public')));

// Permite registrar ventas desde otros orígenes (p. ej. la consola local hacia la app publicada)
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Envuelve rutas async para que los errores lleguen al manejador de errores
const asincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Catálogo de productos
app.get('/api/productos', (req, res) => res.json(productos));

// Lista de ventas registradas
app.get('/api/ventas', asincrono(async (req, res) => res.json(await leerVentas())));

// Registrar una venta (lo usan la consola de Node y la consola del navegador)
app.post('/api/ventas', asincrono(async (req, res) => {
  const { producto, cantidad, fecha } = req.body || {};
  const item = productos.find((p) => p.producto.toLowerCase() === String(producto || '').toLowerCase());
  if (!item) return res.status(400).json({ error: `Producto no válido. Opciones: ${productos.map((p) => p.producto).join(', ')}` });
  const cant = Number(cantidad);
  if (!Number.isInteger(cant) || cant <= 0) return res.status(400).json({ error: 'La cantidad debe ser un entero mayor que 0' });
  const f = fecha || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return res.status(400).json({ error: 'La fecha debe tener formato AAAA-MM-DD' });

  const venta = await guardarVenta({ fecha: f, producto: item.producto, categoria: item.categoria, cantidad: cant, precio: item.precio });
  console.log(`🧾 Nueva venta: ${venta.cantidad} x ${venta.producto} = $${venta.total.toLocaleString('es-CO')}`);
  res.status(201).json(venta);
}));

// Análisis completo + IA (KPIs, gráficas, predicción, anomalías, recomendaciones)
app.get('/api/analisis', asincrono(async (req, res) => res.json(analizar(await leerVentas()))));

// Estado del servicio (útil para comprobar la conexión a la base de datos)
app.get('/api/estado', (req, res) => res.json({ ok: true, almacenamiento: modo() }));

// Ping diario (lo llama la tarea programada de vercel.json).
// Consulta la base de datos para que MongoDB Atlas no pause el clúster gratuito por inactividad.
app.get('/api/ping', asincrono(async (req, res) => {
  const ventas = await leerVentas();
  res.json({ ok: true, ventas: ventas.length, fecha: new Date().toISOString() });
}));

// Manejador de errores: responde JSON en vez de romper la función
app.use((err, req, res, next) => {
  console.error('❌', err);
  res.status(500).json({ error: 'Error interno del servidor', detalle: err.message });
});

// En local se levanta el servidor; en Vercel solo se exporta la app.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`☕ Café Aroma — dashboard en http://localhost:${PORT}`);
    console.log(`💾 Almacenamiento: ${modo()}`);
  });
}

module.exports = app;
