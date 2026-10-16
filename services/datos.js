// Capa de acceso a datos.
// - Si existe la variable de entorno MONGODB_URI → guarda en MongoDB Atlas (producción / Vercel).
// - Si no existe → guarda en data/ventas.json (modo local, sin configurar nada).
const fs = require('fs');
const path = require('path');

const ARCHIVO = path.join(__dirname, '..', 'data', 'ventas.json');
const URI = process.env.MONGODB_URI;
const NOMBRE_BD = process.env.MONGODB_DB || 'cafe_aroma';

// ---------- Conexión a MongoDB (se reutiliza entre peticiones) ----------
let clientePromesa = null;
async function coleccion() {
  if (!clientePromesa) {
    const { MongoClient } = require('mongodb');
    clientePromesa = new MongoClient(URI).connect();
  }
  const cliente = await clientePromesa;
  return cliente.db(NOMBRE_BD).collection('ventas');
}

const sinId = { projection: { _id: 0 } }; // ocultar el _id interno de MongoDB

// ---------- Operaciones ----------
async function leerVentas() {
  if (URI) {
    const col = await coleccion();
    return col.find({}, sinId).sort({ id: 1 }).toArray();
  }
  if (!fs.existsSync(ARCHIVO)) return [];
  return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
}

function construirVenta(id, { fecha, producto, categoria, cantidad, precio }) {
  return {
    id,
    fecha,
    producto,
    categoria,
    cantidad: Number(cantidad),
    precio: Number(precio),
    total: Number(cantidad) * Number(precio),
  };
}

async function guardarVenta(datos) {
  if (URI) {
    const col = await coleccion();
    const ultima = await col.find({}, sinId).sort({ id: -1 }).limit(1).next();
    const venta = construirVenta(ultima ? ultima.id + 1 : 1, datos);
    await col.insertOne({ ...venta });
    return venta;
  }
  const ventas = await leerVentas();
  const venta = construirVenta(ventas.length ? ventas[ventas.length - 1].id + 1 : 1, datos);
  ventas.push(venta);
  fs.writeFileSync(ARCHIVO, JSON.stringify(ventas, null, 2));
  return venta;
}

// Reemplaza todas las ventas (lo usa el script de datos de ejemplo)
async function reemplazarVentas(ventas) {
  if (URI) {
    const col = await coleccion();
    await col.deleteMany({});
    if (ventas.length) await col.insertMany(ventas.map((v) => ({ ...v })));
    await col.createIndex({ id: 1 }, { unique: true });
    return;
  }
  fs.writeFileSync(ARCHIVO, JSON.stringify(ventas, null, 2));
}

async function cerrar() {
  if (clientePromesa) (await clientePromesa).close();
}

const modo = () => (URI ? 'MongoDB Atlas' : 'archivo local data/ventas.json');

module.exports = { leerVentas, guardarVenta, reemplazarVentas, cerrar, modo };
