// Dashboard: consume la API, dibuja las gráficas con Chart.js y se actualiza solo.
const COLORES = {
  cafe: '#6f4e37', caramelo: '#c8813a', espresso: '#2b1d14',
  leche: '#e9dccb', verde: '#3f7d58', azul: '#3d6b8c', rojo: '#b5483b',
};
const PALETA_CAT = ['#6f4e37', '#c8813a', '#3d6b8c', '#3f7d58'];
const INTERVALO_MS = 5000; // actualización automática cada 5 s

const cop = (n) => '$' + Math.round(n).toLocaleString('es-CO');
const corto = (fecha) => { const [, m, d] = fecha.split('-'); return `${d}/${m}`; };

Chart.defaults.font.family = "'DM Sans', system-ui, sans-serif";
Chart.defaults.color = '#7a6a5d';
Chart.defaults.plugins.legend.labels.usePointStyle = true;

const graficas = {};
let ultimoConteo = null;

function crearGraficas() {
  graficas.diaria = new Chart(document.getElementById('g-diaria'), {
    type: 'line',
    data: { labels: [], datasets: [
      { label: 'Ventas reales', data: [], borderColor: COLORES.cafe, backgroundColor: 'rgba(111,78,55,.12)', fill: true, tension: .3, pointRadius: 3 },
      { label: 'Predicción IA (7 días)', data: [], borderColor: COLORES.caramelo, borderDash: [6, 5], pointRadius: 3, pointStyle: 'rectRot', tension: .3 },
      { label: 'Anomalía', data: [], type: 'scatter', backgroundColor: COLORES.rojo, pointRadius: 7, pointStyle: 'circle' },
    ] },
    options: {
      maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { tooltip: { filter: (c) => c.raw != null, callbacks: { label: (c) => `${c.dataset.label}: ${cop(c.raw.y ?? c.raw)}` } } },
      scales: { y: { ticks: { callback: (v) => cop(v) }, grid: { color: '#efe5d8' } }, x: { grid: { display: false } } },
    },
  });

  graficas.categoria = new Chart(document.getElementById('g-categoria'), {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: PALETA_CAT, borderColor: '#fffdf9', borderWidth: 3 }] },
    options: {
      maintainAspectRatio: false, cutout: '62%',
      plugins: {
        legend: { position: 'right' },
        tooltip: { callbacks: { label: (c) => {
          const tot = c.dataset.data.reduce((a, b) => a + b, 0);
          return `${c.label}: ${cop(c.raw)} (${((c.raw / tot) * 100).toFixed(1)} %)`;
        } } },
      },
    },
  });

  graficas.top = new Chart(document.getElementById('g-top'), {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Unidades', data: [], backgroundColor: COLORES.caramelo, borderRadius: 6 }] },
    options: {
      indexAxis: 'y', maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { color: '#efe5d8' } }, y: { grid: { display: false } } },
    },
  });

  graficas.semana = new Chart(document.getElementById('g-semana'), {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Promedio diario', data: [], backgroundColor: [], borderRadius: 6 }] },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => cop(c.raw) } } },
      scales: { y: { ticks: { callback: (v) => cop(v) }, grid: { color: '#efe5d8' } }, x: { grid: { display: false } } },
    },
  });
}

function pintarKPIs(k) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el.textContent !== val) { el.textContent = val; el.parentElement.classList.remove('flash'); void el.offsetWidth; el.parentElement.classList.add('flash'); }
  };
  set('k-total', cop(k.ventasTotales));
  set('k-num', k.numeroVentas.toLocaleString('es-CO'));
  set('k-ticket', cop(k.ticketPromedio));
  set('k-unid', k.unidadesVendidas.toLocaleString('es-CO'));
  set('k-top', k.productoMasVendido);
}

function pintarGraficas(a) {
  // Línea: real + predicción + anomalías
  const reales = a.serieDiaria;
  const pred = a.prediccion.predicciones;
  // Eje X: fechas reales + fechas predichas (sin repetir el día de hoy, que puede tener ambas)
  const fechas = [...new Set([...reales.map((d) => d.fecha), ...pred.map((d) => d.fecha)])].sort();
  const real = Object.fromEntries(reales.map((d) => [d.fecha, d.total]));
  const predicho = Object.fromEntries(pred.map((d) => [d.fecha, d.total]));
  // La predicción arranca en el último día completo para que la línea sea continua
  const inicioPred = fechas[fechas.indexOf(pred[0]?.fecha) - 1];
  const g = graficas.diaria;
  g.data.labels = fechas.map(corto);
  g.data.datasets[0].data = fechas.map((f) => real[f] ?? null);
  g.data.datasets[1].data = fechas.map((f) => predicho[f] ?? (f === inicioPred ? real[f] : null));
  g.data.datasets[2].data = a.anomalias.map((an) => ({ x: corto(an.fecha), y: an.total }));
  g.update();
  document.getElementById('r2').textContent = `Regresión lineal + estacionalidad · R² = ${a.prediccion.r2.toFixed(2)}`;

  graficas.categoria.data.labels = a.porCategoria.map((c) => c.categoria);
  graficas.categoria.data.datasets[0].data = a.porCategoria.map((c) => c.total);
  graficas.categoria.update();

  graficas.top.data.labels = a.topProductos.map((p) => p.producto);
  graficas.top.data.datasets[0].data = a.topProductos.map((p) => p.unidades);
  graficas.top.update();

  const max = Math.max(...a.porDiaSemana.map((d) => d.promedio));
  graficas.semana.data.labels = a.porDiaSemana.map((d) => d.dia.slice(0, 3));
  graficas.semana.data.datasets[0].data = a.porDiaSemana.map((d) => d.promedio);
  graficas.semana.data.datasets[0].backgroundColor = a.porDiaSemana.map((d) => (d.promedio === max ? COLORES.caramelo : COLORES.cafe));
  graficas.semana.update();
}

function pintarRecomendaciones(recs) {
  const ul = document.getElementById('recomendaciones');
  ul.innerHTML = '';
  for (const r of recs) {
    const li = document.createElement('li');
    li.className = r.tipo;
    li.textContent = r.texto;
    ul.appendChild(li);
  }
}

function pintarTabla(ventas, hayNuevas) {
  const tbody = document.getElementById('tabla');
  tbody.innerHTML = '';
  ventas.slice(-10).reverse().forEach((v, i) => {
    const tr = document.createElement('tr');
    if (hayNuevas && i === 0) tr.className = 'nueva';
    tr.innerHTML = `<td>${v.id}</td><td>${v.fecha}</td><td>${v.producto}</td><td>${v.categoria}</td><td class="num">${v.cantidad}</td><td class="num">${cop(v.total)}</td>`;
    tbody.appendChild(tr);
  });
}

async function actualizar() {
  try {
    const [analisis, ventas] = await Promise.all([
      fetch('/api/analisis').then((r) => r.json()),
      fetch('/api/ventas').then((r) => r.json()),
    ]);
    const hayNuevas = ultimoConteo !== null && ventas.length > ultimoConteo;
    if (ultimoConteo === null || ventas.length !== ultimoConteo) {
      pintarKPIs(analisis.kpis);
      pintarGraficas(analisis);
      pintarRecomendaciones(analisis.recomendaciones);
      pintarTabla(ventas, hayNuevas);
      ultimoConteo = ventas.length;
    }
    document.getElementById('punto').classList.add('vivo');
    document.getElementById('actualizado').textContent = `En vivo · ${new Date().toLocaleTimeString('es-CO')}`;
  } catch (e) {
    document.getElementById('punto').classList.remove('vivo');
    document.getElementById('actualizado').textContent = 'Sin conexión con el servidor';
  }
}

// ---------- Funciones disponibles en la consola del navegador (F12) ----------
window.registrarVenta = async (producto, cantidad = 1, fecha) => {
  const r = await fetch('/api/ventas', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ producto, cantidad, fecha }),
  });
  const data = await r.json();
  if (!r.ok) { console.error('❌', data.error); return; }
  console.log(`✅ Venta #${data.id}: ${data.cantidad} x ${data.producto} = ${cop(data.total)}`);
  await actualizar();
  return data;
};
window.verProductos = async () => console.table(await fetch('/api/productos').then((r) => r.json()));
window.verAnalisis = async () => { const a = await fetch('/api/analisis').then((r) => r.json()); console.log(a); return a; };

console.log('%c☕ Café Aroma', 'font-size:18px;font-weight:bold;color:#6f4e37');
console.log('Comandos disponibles:\n  verProductos()\n  registrarVenta("Capuccino", 2)\n  registrarVenta("Tinto", 3, "2026-10-16")\n  verAnalisis()');

window.actualizarDashboard = actualizar;
crearGraficas();
actualizar();
setInterval(actualizar, INTERVALO_MS);
