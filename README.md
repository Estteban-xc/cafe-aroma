# Café Aroma — Dashboard inteligente de ventas

Aplicación web que registra las ventas de una cafetería desde la consola, las procesa en un servidor Node.js/Express y las muestra en un dashboard interactivo con Chart.js. Incluye un módulo de análisis con inteligencia artificial para apoyar la toma de decisiones.

## Tecnologías
HTML5 · CSS3 · JavaScript · Node.js · Express · Chart.js · MongoDB Atlas · Vercel

## Estructura
```
cafe-aroma/
├── server.js                 Servidor Express (API REST); se exporta para Vercel
├── cli/registrar.js          Registro de ventas por consola (terminal)
├── services/
│   ├── productos.js          Catálogo de productos
│   ├── datos.js              Almacenamiento: MongoDB Atlas o data/ventas.json
│   ├── analisis.js           KPIs, regresión lineal, anomalías y recomendaciones (IA)
│   └── env.js                Carga el archivo .env
├── scripts/generar-datos.js  Genera 30 días de ventas de ejemplo
├── data/ventas.json          Datos locales (cuando no hay base de datos configurada)
├── public/                   Dashboard (index.html, styles.css, app.js, vendor/chart.js)
├── .env.example              Plantilla de variables de entorno
└── GUIA-DESPLIEGUE.md        Paso a paso para publicar en Vercel + MongoDB Atlas
```

## Ejecutar en local (sin configurar nada)
```bash
npm install
npm start           # http://localhost:3000
```
Sin archivo `.env`, las ventas se guardan en `data/ventas.json`.

## Registrar ventas por consola
**Terminal (Node.js)**
```bash
npm run registrar                                  # en local / en la BD del .env
npm run registrar -- https://cafe-aroma.vercel.app # en la app publicada
```

**Consola del navegador** (F12 → *Consola*)
```js
verProductos()
registrarVenta("Capuccino", 2)
registrarVenta("Tinto", 3, "2026-10-16")
verAnalisis()
```
El dashboard se actualiza solo cada 5 segundos.

## API
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/productos` | Catálogo |
| GET | `/api/ventas` | Ventas registradas |
| POST | `/api/ventas` | Registrar venta `{ producto, cantidad, fecha? }` |
| GET | `/api/analisis` | KPIs, series, predicción, anomalías y recomendaciones |
| GET | `/api/estado` | Indica qué almacenamiento se está usando |

## Componente de inteligencia artificial
1. **Predicción de ventas**: regresión lineal por mínimos cuadrados (y = a + b·x) ajustada con un factor estacional por día de la semana. Proyecta los próximos 7 días e informa el R² del modelo.
2. **Detección de anomalías**: puntaje Z; los días con |z| ≥ 2 se marcan en rojo en la gráfica.
3. **Recomendaciones**: sistema experto basado en reglas (tendencia, categorías con baja participación, días fuertes y débiles, anomalías y proyección semanal).

## Publicar en internet
Consulta **[GUIA-DESPLIEGUE.md](GUIA-DESPLIEGUE.md)**: Vercel aloja la app y MongoDB Atlas guarda las ventas de forma permanente. Ambos son gratuitos.
