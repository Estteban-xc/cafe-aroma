// Consola integrada en el dashboard: permite registrar y consultar datos sin salir de la página.
(() => {
  const salida = document.getElementById('salida');
  const form = document.getElementById('form-consola');
  const input = document.getElementById('comando');
  const terminal = document.getElementById('terminal');

  const cop = (n) => '$' + Math.round(n).toLocaleString('es-CO');
  const normalizar = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

  let productos = [];
  const historial = [];
  let posHist = 0;

  function escribir(texto, clase = '') {
    const div = document.createElement('div');
    div.className = 'linea ' + clase;
    div.textContent = texto;
    salida.appendChild(div);
    salida.scrollTop = salida.scrollHeight;
  }

  async function cargarProductos() {
    if (!productos.length) productos = await fetch('/api/productos').then((r) => r.json());
    return productos;
  }

  // Acepta el número del producto (1-12) o su nombre, sin importar mayúsculas ni tildes
  function buscarProducto(texto) {
    const n = Number(texto);
    if (Number.isInteger(n) && n >= 1 && n <= productos.length) return productos[n - 1];
    const t = normalizar(texto);
    return productos.find((p) => normalizar(p.producto) === t)
      || productos.find((p) => normalizar(p.producto).startsWith(t));
  }

  const comandos = {
    ayuda() {
      escribir('Comandos disponibles:', 'info');
      escribir('  productos                         → lista de productos y precios');
      escribir('  registrar <producto> <cantidad>   → registra una venta con la fecha de hoy');
      escribir('  registrar <producto> <cantidad> <AAAA-MM-DD>  → con fecha específica');
      escribir('  ventas                            → últimas 5 ventas');
      escribir('  resumen                           → indicadores principales');
      escribir('  prediccion                        → ventas estimadas por la IA (7 días)');
      escribir('  recomendaciones                   → sugerencias de la IA para el negocio');
      escribir('  limpiar                           → limpia la consola');
      escribir('Ejemplos: registrar capuccino 2   ·   registrar 11 3   ·   registrar torta de chocolate 1', 'tenue');
    },

    async productos() {
      await cargarProductos();
      productos.forEach((p, i) => escribir(`  ${String(i + 1).padStart(2)}. ${p.producto.padEnd(20)} ${p.categoria.padEnd(18)} ${cop(p.precio)}`));
    },

    async registrar(args) {
      await cargarProductos();
      if (args.length < 2) return escribir('Uso: registrar <producto> <cantidad> [AAAA-MM-DD]   (ej: registrar capuccino 2)', 'error');

      let fecha = hoy();
      if (/^\d{4}-\d{2}-\d{2}$/.test(args[args.length - 1])) fecha = args.pop();
      const cantidad = Number(args.pop());
      const nombre = args.join(' ');

      if (!Number.isInteger(cantidad) || cantidad <= 0) return escribir('La cantidad debe ser un número entero mayor que 0.', 'error');
      const p = buscarProducto(nombre);
      if (!p) return escribir(`No encontré el producto "${nombre}". Escribe "productos" para ver la lista.`, 'error');

      escribir('Procesando…', 'tenue');
      const r = await fetch('/api/ventas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto: p.producto, cantidad, fecha }),
      });
      const v = await r.json();
      salida.lastChild.remove();
      if (!r.ok) return escribir(v.error || 'No se pudo registrar la venta.', 'error');
      escribir(`✔ Venta #${v.id} registrada: ${v.cantidad} x ${v.producto} = ${cop(v.total)} (${v.fecha})`, 'ok');
      escribir('  El dashboard se actualizó con la nueva venta.', 'tenue');
      if (typeof window.actualizarDashboard === 'function') window.actualizarDashboard();
    },

    async ventas() {
      const ventas = await fetch('/api/ventas').then((r) => r.json());
      if (!ventas.length) return escribir('Aún no hay ventas registradas.', 'tenue');
      ventas.slice(-5).reverse().forEach((v) => escribir(`  #${v.id}  ${v.fecha}  ${v.cantidad} x ${v.producto.padEnd(20)} ${cop(v.total)}`));
    },

    async resumen() {
      const { kpis: k } = await fetch('/api/analisis').then((r) => r.json());
      escribir(`  Ventas totales:    ${cop(k.ventasTotales)}`);
      escribir(`  N.º de ventas:     ${k.numeroVentas.toLocaleString('es-CO')}`);
      escribir(`  Ticket promedio:   ${cop(k.ticketPromedio)}`);
      escribir(`  Unidades vendidas: ${k.unidadesVendidas.toLocaleString('es-CO')}`);
      escribir(`  Producto estrella: ${k.productoMasVendido}`);
    },

    async prediccion() {
      const { prediccion: p } = await fetch('/api/analisis').then((r) => r.json());
      escribir(`Modelo: regresión lineal + estacionalidad semanal (R² = ${p.r2.toFixed(2)})`, 'info');
      p.predicciones.forEach((d) => escribir(`  ${d.fecha}   ${cop(d.total)}`));
      const total = p.predicciones.reduce((a, d) => a + d.total, 0);
      escribir(`  Total proyectado 7 días: ${cop(total)}`, 'ok');
    },

    async recomendaciones() {
      const { recomendaciones } = await fetch('/api/analisis').then((r) => r.json());
      recomendaciones.forEach((r) => escribir('• ' + r.texto, r.tipo === 'alerta' ? 'error' : r.tipo === 'exito' ? 'ok' : 'info'));
    },

    limpiar() { salida.innerHTML = ''; },
  };

  // Alias para que sea fácil de usar
  Object.assign(comandos, { help: comandos.ayuda, '?': comandos.ayuda, clear: comandos.limpiar, cls: comandos.limpiar, registro: comandos.registrar, predicción: comandos.prediccion, ia: comandos.recomendaciones });

  async function ejecutar(linea) {
    const partes = linea.trim().split(/\s+/);
    const nombre = normalizar(partes.shift() || '');
    const fn = comandos[nombre];
    if (!fn) return escribir(`Comando no reconocido: "${nombre}". Escribe "ayuda" para ver los comandos.`, 'error');
    try {
      await fn(partes);
    } catch (e) {
      escribir('Error de conexión con el servidor. Intenta de nuevo.', 'error');
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const linea = input.value.trim();
    if (!linea) return;
    escribir('cafe-aroma $ ' + linea, 'cmd');
    historial.push(linea);
    posHist = historial.length;
    input.value = '';
    input.disabled = true;
    await ejecutar(linea);
    input.disabled = false;
    input.focus();
  });

  // Flechas ↑ ↓ para recorrer los comandos anteriores
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && posHist > 0) { posHist--; input.value = historial[posHist]; e.preventDefault(); }
    if (e.key === 'ArrowDown') { posHist = Math.min(historial.length, posHist + 1); input.value = historial[posHist] || ''; e.preventDefault(); }
  });

  terminal.addEventListener('click', () => { if (!window.getSelection().toString()) input.focus(); });

  escribir('☕ Bienvenido a la consola de Café Aroma.', 'ok');
  escribir('Registra ventas escribiendo comandos. Ejemplo: registrar capuccino 2', 'tenue');
  escribir('Escribe "ayuda" para ver todos los comandos.', 'tenue');
  cargarProductos().catch(() => {});
})();
