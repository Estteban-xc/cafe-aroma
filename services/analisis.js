// Módulo de análisis de datos e inteligencia artificial
// - KPIs del negocio
// - Agregaciones para las gráficas
// - Predicción de ventas con regresión lineal (mínimos cuadrados)
// - Detección de anomalías con puntaje Z
// - Recomendaciones automáticas basadas en reglas (sistema experto)

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const sumar = (arr) => arr.reduce((a, b) => a + b, 0);
const promedio = (arr) => (arr.length ? sumar(arr) / arr.length : 0);
const desviacion = (arr) => {
  const m = promedio(arr);
  return Math.sqrt(promedio(arr.map((x) => (x - m) ** 2)));
};
const diaSemana = (fecha) => new Date(fecha + 'T12:00:00').getDay();
const formatoCOP = (n) => '$' + Math.round(n).toLocaleString('es-CO');

function agruparPor(ventas, clave) {
  const mapa = {};
  for (const v of ventas) {
    const k = typeof clave === 'function' ? clave(v) : v[clave];
    if (!mapa[k]) mapa[k] = { total: 0, unidades: 0, transacciones: 0 };
    mapa[k].total += v.total;
    mapa[k].unidades += v.cantidad;
    mapa[k].transacciones += 1;
  }
  return mapa;
}

// ---------- 1. KPIs ----------
function calcularKPIs(ventas) {
  const total = sumar(ventas.map((v) => v.total));
  const porProducto = agruparPor(ventas, 'producto');
  const masVendido = Object.entries(porProducto).sort((a, b) => b[1].unidades - a[1].unidades)[0];
  return {
    ventasTotales: total,
    numeroVentas: ventas.length,
    ticketPromedio: ventas.length ? total / ventas.length : 0,
    unidadesVendidas: sumar(ventas.map((v) => v.cantidad)),
    productoMasVendido: masVendido ? masVendido[0] : '—',
  };
}

// ---------- 2. Series para las gráficas ----------
function serieDiaria(ventas) {
  const mapa = agruparPor(ventas, 'fecha');
  return Object.keys(mapa).sort().map((fecha) => ({ fecha, total: mapa[fecha].total }));
}

function porCategoria(ventas) {
  const mapa = agruparPor(ventas, 'categoria');
  return Object.entries(mapa)
    .map(([categoria, d]) => ({ categoria, total: d.total, unidades: d.unidades }))
    .sort((a, b) => b.total - a.total);
}

function topProductos(ventas, n = 5) {
  const mapa = agruparPor(ventas, 'producto');
  return Object.entries(mapa)
    .map(([producto, d]) => ({ producto, unidades: d.unidades, total: d.total }))
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, n);
}

function porDiaSemana(ventas) {
  // Promedio de ventas por día de la semana (lunes a domingo)
  const diario = serieDiaria(ventas);
  const orden = [1, 2, 3, 4, 5, 6, 0];
  return orden.map((d) => {
    const dias = diario.filter((x) => diaSemana(x.fecha) === d);
    return { dia: DIAS[d], promedio: promedio(dias.map((x) => x.total)) };
  });
}

// ---------- 3. IA: Predicción con regresión lineal ----------
// y = a + b·x, donde x es el número de día y y las ventas del día.
function regresionLineal(valores) {
  const n = valores.length;
  const xs = valores.map((_, i) => i);
  const mx = promedio(xs);
  const my = promedio(valores);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (valores[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const b = den ? num / den : 0;
  const a = my - b * mx;
  // Coeficiente de determinación R²
  const ssTot = sumar(valores.map((y) => (y - my) ** 2));
  const ssRes = sumar(valores.map((y, i) => (y - (a + b * i)) ** 2));
  const r2 = ssTot ? 1 - ssRes / ssTot : 0;
  return { a, b, r2 };
}

function predecir(ventas, diasFuturos = 7) {
  const diario = serieDiaria(ventas);
  if (diario.length < 3) return { pendiente: 0, r2: 0, predicciones: [] };

  const valores = diario.map((d) => d.total);
  const { a, b, r2 } = regresionLineal(valores);

  // Ajuste estacional: factor de cada día de la semana respecto al promedio general
  const promGeneral = promedio(valores);
  const factor = {};
  for (let d = 0; d < 7; d++) {
    const delDia = diario.filter((x) => diaSemana(x.fecha) === d).map((x) => x.total);
    factor[d] = delDia.length && promGeneral ? promedio(delDia) / promGeneral : 1;
  }

  // R² del modelo completo (tendencia × factor del día de la semana)
  const ajustados = diario.map((d, i) => (a + b * i) * factor[diaSemana(d.fecha)]);
  const my = promedio(valores);
  const ssTot = sumar(valores.map((y) => (y - my) ** 2));
  const ssRes = sumar(valores.map((y, i) => (y - ajustados[i]) ** 2));
  const r2Modelo = ssTot ? Math.max(0, 1 - ssRes / ssTot) : 0;

  const ultima = new Date(diario[diario.length - 1].fecha + 'T12:00:00');
  const predicciones = [];
  for (let i = 1; i <= diasFuturos; i++) {
    const f = new Date(ultima);
    f.setDate(ultima.getDate() + i);
    const x = valores.length - 1 + i;
    const base = a + b * x;
    predicciones.push({
      fecha: f.toISOString().slice(0, 10),
      total: Math.max(0, Math.round(base * factor[f.getDay()])),
    });
  }
  return { pendiente: b, r2: r2Modelo, r2Tendencia: r2, predicciones };
}

// ---------- 4. IA: Detección de anomalías (puntaje Z) ----------
function detectarAnomalias(ventas, umbral = 2) {
  const diario = serieDiaria(ventas);
  const valores = diario.map((d) => d.total);
  const m = promedio(valores);
  const s = desviacion(valores);
  if (!s) return [];
  return diario
    .map((d) => ({ ...d, z: (d.total - m) / s }))
    .filter((d) => Math.abs(d.z) >= umbral)
    .map((d) => ({
      fecha: d.fecha,
      total: d.total,
      z: Number(d.z.toFixed(2)),
      tipo: d.z < 0 ? 'baja' : 'alta',
    }));
}

// ---------- 5. IA: Recomendaciones (sistema basado en reglas) ----------
function generarRecomendaciones(ventas, extra) {
  const recs = [];
  if (!ventas.length) return [{ tipo: 'info', texto: 'Aún no hay ventas registradas. Usa la consola para registrar la primera.' }];

  const cats = porCategoria(ventas);
  const totalGeneral = sumar(cats.map((c) => c.total));
  const semana = porDiaSemana(ventas).filter((d) => d.promedio > 0);
  const mejorDia = [...semana].sort((a, b) => b.promedio - a.promedio)[0];
  const peorDia = [...semana].sort((a, b) => a.promedio - b.promedio)[0];

  // Regla 1: tendencia general
  const { pendiente, predicciones } = extra.prediccion;
  if (pendiente > 0) {
    recs.push({ tipo: 'exito', texto: `Las ventas muestran una tendencia al alza (≈ ${formatoCOP(pendiente)} más por día). Es buen momento para ampliar el inventario de los productos estrella.` });
  } else if (pendiente < 0) {
    recs.push({ tipo: 'alerta', texto: `Las ventas vienen bajando (≈ ${formatoCOP(Math.abs(pendiente))} menos por día). Considera una campaña en redes sociales o un programa de fidelización.` });
  }

  // Regla 2: categoría con baja participación
  for (const c of cats) {
    const part = c.total / totalGeneral;
    if (part < 0.12) {
      recs.push({ tipo: 'alerta', texto: `${c.categoria} solo aporta el ${(part * 100).toFixed(1)} % de los ingresos. Prueba un combo con café (por ejemplo, capuccino + porción) para impulsarla.` });
    }
  }

  // Regla 3: personal según día fuerte / débil
  if (mejorDia) recs.push({ tipo: 'info', texto: `El ${mejorDia.dia.toLowerCase()} es el día de mayores ventas (promedio ${formatoCOP(mejorDia.promedio)}). Refuerza el personal y la producción de panadería ese día.` });
  if (peorDia && peorDia !== mejorDia) recs.push({ tipo: 'info', texto: `El ${peorDia.dia.toLowerCase()} es el día más flojo. Una promoción "happy hour" podría atraer más clientes.` });

  // Regla 4: anomalías
  for (const a of extra.anomalias) {
    recs.push({
      tipo: a.tipo === 'baja' ? 'alerta' : 'exito',
      texto: a.tipo === 'baja'
        ? `El ${a.fecha} las ventas fueron inusualmente bajas (${formatoCOP(a.total)}). Revisa si hubo cierre, falta de personal o mal clima.`
        : `El ${a.fecha} las ventas fueron inusualmente altas (${formatoCOP(a.total)}). Identifica qué pasó para repetirlo.`,
    });
  }

  // Regla 5: proyección semanal
  if (predicciones.length) {
    const proy = sumar(predicciones.map((p) => p.total));
    recs.push({ tipo: 'info', texto: `Se proyectan ventas de ${formatoCOP(proy)} para los próximos 7 días. Planifica compras de insumos con base en esa cifra.` });
  }

  return recs;
}

function analizar(ventas) {
  const prediccion = predecir(ventas);
  const anomalias = detectarAnomalias(ventas);
  return {
    kpis: calcularKPIs(ventas),
    serieDiaria: serieDiaria(ventas),
    porCategoria: porCategoria(ventas),
    topProductos: topProductos(ventas),
    porDiaSemana: porDiaSemana(ventas),
    prediccion,
    anomalias,
    recomendaciones: generarRecomendaciones(ventas, { prediccion, anomalias }),
  };
}

module.exports = { analizar, regresionLineal, detectarAnomalias };
