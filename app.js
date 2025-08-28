// === VARIABLES GLOBALES ===
let stock = JSON.parse(localStorage.getItem("stock")) || [
  // Preparados
  { categoria: "Preparados", producto: "Preparado de tomate", unidad: "unidad" },
  { categoria: "Preparados", producto: "Cebolla Caramelizada", unidad: "unidad" },
  { categoria: "Preparados", producto: "Mayonesa De Palta", unidad: "unidad" },
  { categoria: "Preparados", producto: "Mayonesa MQB", unidad: "unidad" },
  
  // Verduras
  { categoria: "Verduras", producto: "Lechuga Repollada", unidad: "unidad" },
  { categoria: "Verduras", producto: "Cebolla morada", unidad: "unidad" },
  { categoria: "Verduras", producto: "Palta", unidad: "unidad" },
  { categoria: "Verduras", producto: "Tomate perita", unidad: "unidad" },
  
  // Quesos
  { categoria: "Quesos", producto: "Cheddar fetas", unidad: "unidad" },
  { categoria: "Quesos", producto: "Cheddar Puch", unidad: "unidad" },
  { categoria: "Quesos", producto: "Queso azul", unidad: "unidad" },
  { categoria: "Quesos", producto: "Muzzarella", unidad: "unidad" },
  
  // Paquetes
  { categoria: "Paquetes", producto: "Pote de queso crema", unidad: "unidad" },
  { categoria: "Paquetes", producto: "Sachet de Mayonesa 950g", unidad: "unidad" },
  { categoria: "Paquetes", producto: "Sachet de ketchup", unidad: "unidad" },
  { categoria: "Paquetes", producto: "Sachet de Savora", unidad: "unidad" },
  { categoria: "Paquetes", producto: "Aceite", unidad: "lts" },
  
  // Condimentos/Ingredientes
  { categoria: "Condimentos/Ingredientes", producto: "Comino", unidad: "g" },
  { categoria: "Condimentos/Ingredientes", producto: "Pimienta negra", unidad: "g" },
  { categoria: "Condimentos/Ingredientes", producto: "Pimentón", unidad: "g" },
  { categoria: "Condimentos/Ingredientes", producto: "Ajo en polvo", unidad: "g" },
  { categoria: "Condimentos/Ingredientes", producto: "Provenzal", unidad: "g" },
  { categoria: "Condimentos/Ingredientes", producto: "Sal", unidad: "kg" },
  { categoria: "Condimentos/Ingredientes", producto: "Azúcar", unidad: "kg" },
  { categoria: "Condimentos/Ingredientes", producto: "Levadura", unidad: "g" },
  { categoria: "Condimentos/Ingredientes", producto: "Manteca", unidad: "kg" },
  { categoria: "Condimentos/Ingredientes", producto: "Harina", unidad: "kg" },
  { categoria: "Condimentos/Ingredientes", producto: "Leche", unidad: "lts" },
  
  // Accesorios
  { categoria: "Accesorios", producto: "Guantes", unidad: "unidad" },
  { categoria: "Accesorios", producto: "Broches para abrochadora", unidad: "unidad" },
  
  // Botiquín
  { categoria: "Botiquín", producto: "Platsul", unidad: "unidad" },
  { categoria: "Botiquín", producto: "Gasas", unidad: "unidad" },
  { categoria: "Botiquín", producto: "Curitas", unidad: "unidad" },
  { categoria: "Botiquín", producto: "Pervinox", unidad: "unidad" },
  { categoria: "Botiquín", producto: "Analgésicos", unidad: "unidad" },
  
  // Limpieza
  { categoria: "Limpieza", producto: "Lavandina", unidad: "lts" },
  { categoria: "Limpieza", producto: "Detergente", unidad: "lts" },
  { categoria: "Limpieza", producto: "Líquido para piso", unidad: "lts" },
  { categoria: "Limpieza", producto: "Antigrasa", unidad: "lts" },
  { categoria: "Limpieza", producto: "Limpia vidrios", unidad: "lts" },
  { categoria: "Limpieza", producto: "Esponja amarilla", unidad: "unidad" },
  { categoria: "Limpieza", producto: "Esponja de acero", unidad: "unidad" },
  { categoria: "Limpieza", producto: "Virulana", unidad: "unidad" },
  
  // General
  { categoria: "General", producto: "Carnes armadas", unidad: "kg" },
  { categoria: "General", producto: "Carnes por hacer", unidad: "kg" },
  { categoria: "General", producto: "Bolsas de pollo de kg", unidad: "unidad" },
  { categoria: "General", producto: "Panes grandes", unidad: "unidad" },
  { categoria: "General", producto: "Panes chicos", unidad: "unidad" },
  
  // Gas
  { categoria: "Gas", producto: "Bidón de agua", unidad: "unidad" }
];

let conteoInicial = JSON.parse(localStorage.getItem("conteoInicial")) || [];
let conteoFinal = JSON.parse(localStorage.getItem("conteoFinal")) || [];
let pendientes = JSON.parse(localStorage.getItem("pendientes")) || [];
let tareas = JSON.parse(localStorage.getItem("tareas")) || [];

// === NUEVAS VARIABLES PARA HISTORIAL ===
let historial = JSON.parse(localStorage.getItem("historial")) || [];
let diaActual = new Date().toLocaleDateString();

// === FUNCIONES PARA MOSTRAR PRODUCTOS POR CATEGORÍA ===
function mostrarProductosCategoria() {
  console.log("Función mostrarProductosCategoria ejecutada");
  const categoria = document.getElementById("categoriaSelector").value;
  const productosDiv = document.getElementById("productosCategoria");
  
  console.log("Categoría seleccionada:", categoria);
  console.log("Productos en stock:", stock);
  
  if (!categoria) {
    productosDiv.innerHTML = "";
    return;
  }
  
  const productos = stock.filter(s => s.categoria === categoria);
  console.log("Productos filtrados:", productos);
  
  let html = `<div class="bg-gray-800 text-white px-4 py-3 rounded-lg mb-4 font-semibold">${categoria}</div>`;
  
  productos.forEach(producto => {
    const yaRegistrado = conteoInicial.find(c => c.producto === producto.producto);
    const cantidadActual = yaRegistrado ? yaRegistrado.cantidad : "";
    
    html += `
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="flex-1">
            <div class="font-semibold text-gray-800">${producto.producto}</div>
            <div class="text-sm text-gray-600">${producto.unidad}</div>
            ${yaRegistrado ? `<div class="text-sm text-green-600 mt-1">✅ Ya registrado: ${yaRegistrado.cantidad} ${producto.unidad}</div>` : ''}
          </div>
          <div class="flex items-center gap-2">
            <input type="number" 
                   id="cantidad_${producto.producto.replace(/\s+/g, '_')}" 
                   placeholder="Cantidad" 
                   min="0" 
                   step="0.01" 
                   value="${cantidadActual}"
                   class="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center">
            <button onclick="agregarConteoInicial('${producto.producto}', '${producto.categoria}', '${producto.unidad}')" 
                    class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
              ${yaRegistrado ? '✏️' : '📝'}
            </button>
          </div>
        </div>
      </div>`;
  });
  
  console.log("HTML generado:", html);
  productosDiv.innerHTML = html;
}

function mostrarProductosFinal() {
  const categoria = document.getElementById("categoriaFinalSelector").value;
  const productosDiv = document.getElementById("productosFinal");
  
  if (!categoria) {
    productosDiv.innerHTML = "";
    return;
  }
  
  const productos = stock.filter(s => s.categoria === categoria);
  let html = `<div class="bg-gray-800 text-white px-4 py-3 rounded-lg mb-4 font-semibold">${categoria}</div>`;
  
  productos.forEach(producto => {
    const inicial = conteoInicial.find(c => c.producto === producto.producto);
    const final = conteoFinal.find(c => c.producto === producto.producto);
    const cantidadFinal = final ? final.cantidad : "";
    
    if (inicial) {
      html += `
        <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-3">
          <div class="flex flex-col gap-3">
            <div class="flex-1">
              <div class="font-semibold text-gray-800">${producto.producto}</div>
              <div class="text-sm text-gray-600">${producto.unidad}</div>
              <div class="text-sm text-blue-600 mt-1">Inicial: ${inicial.cantidad} ${producto.unidad}</div>
              ${final ? `<div class="text-sm text-green-600 mt-1">✅ Final registrado: ${final.cantidad} ${producto.unidad}</div>` : ''}
            </div>
            <div class="flex flex-col sm:flex-row gap-2">
              <input type="number" 
                     id="final_${producto.producto.replace(/\s+/g, '_')}" 
                     placeholder="Cantidad final" 
                     min="0" 
                     step="0.01" 
                     value="${cantidadFinal}"
                     class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <textarea id="obs_${producto.producto.replace(/\s+/g, '_')}" 
                        placeholder="Observación" 
                        rows="2" 
                        class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none">${final ? final.observacion : ''}</textarea>
              <button onclick="agregarConteoFinal('${producto.producto}', '${producto.categoria}', '${producto.unidad}')" 
                      class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                ${final ? '✏️' : '📊'}
              </button>
            </div>
          </div>
        </div>`;
    }
  });
  
  productosDiv.innerHTML = html;
}

// === FUNCIONES PARA AGREGAR CONTEO ===
function agregarConteoInicial(producto, categoria, unidad) {
  const cantidad = document.getElementById(`cantidad_${producto.replace(/\s+/g, '_')}`).value;
  
  if (!cantidad || cantidad <= 0) {
    alert("Por favor ingresa una cantidad válida");
    return;
  }
  
  // Verificar si ya existe y actualizar, o crear nuevo
  const index = conteoInicial.findIndex(c => c.producto === producto);
  
  if (index !== -1) {
    conteoInicial[index].cantidad = Number(cantidad);
  } else {
    conteoInicial.push({
      categoria: categoria,
      producto: producto,
      unidad: unidad,
      cantidad: Number(cantidad),
      fecha: new Date().toLocaleDateString()
    });
  }
  
  localStorage.setItem("conteoInicial", JSON.stringify(conteoInicial));
  renderConteoInicial();
  mostrarProductosCategoria(); // Actualizar la vista
  alert(`✅ ${producto} registrado: ${cantidad} ${unidad}`);
}

function agregarConteoFinal(producto, categoria, unidad) {
  const cantidad = document.getElementById(`final_${producto.replace(/\s+/g, '_')}`).value;
  const observacion = document.getElementById(`obs_${producto.replace(/\s+/g, '_')}`).value;
  
  if (!cantidad || cantidad < 0) {
    alert("Por favor ingresa una cantidad válida");
    return;
  }
  
  // Verificar si ya existe y actualizar, o crear nuevo
  const index = conteoFinal.findIndex(c => c.producto === producto);
  
  if (index !== -1) {
    conteoFinal[index].cantidad = Number(cantidad);
    conteoFinal[index].observacion = observacion;
  } else {
    conteoFinal.push({
      categoria: categoria,
      producto: producto,
      unidad: unidad,
      cantidad: Number(cantidad),
      observacion: observacion,
      fecha: new Date().toLocaleDateString()
    });
  }
  
  localStorage.setItem("conteoFinal", JSON.stringify(conteoFinal));
  renderConteoFinal();
  mostrarProductosFinal(); // Actualizar la vista
  alert(`✅ ${producto} final registrado: ${cantidad} ${unidad}`);
}

// === STOCK BASE (CATÁLOGO) ===
const formStock = document.getElementById("formStock");

formStock.addEventListener("submit", e => {
  e.preventDefault();
  
  // Verificar si el producto ya existe
  let existe = stock.find(s => s.producto.toLowerCase() === producto.value.toLowerCase());
  if (existe) {
    alert("Este producto ya existe en el catálogo");
    return;
  }

  stock.push({
    categoria: categoria.value,
    producto: producto.value,
    unidad: unidad.value
  });
  
  localStorage.setItem("stock", JSON.stringify(stock));
  formStock.reset();
  alert("✅ Producto agregado al catálogo");
});

// === RENDERIZADO DE LISTAS ===
function renderConteoInicial() {
  const listaConteoInicial = document.getElementById("listaConteoInicial");
  
  if (conteoInicial.length === 0) {
    listaConteoInicial.innerHTML = "<p style='color: #6c757d;'>No hay conteo inicial registrado para hoy</p>";
    return;
  }

  let categorias = ["Preparados", "Verduras", "Quesos", "Paquetes", "Condimentos/Ingredientes", "Accesorios", "Botiquín", "Limpieza", "General", "Gas"];
  let html = "";
  
  categorias.forEach(cat => {
    let items = conteoInicial.filter(c => c.categoria === cat);
    if (items.length > 0) {
      html += `<div class="bg-gray-800 text-white px-4 py-3 rounded-lg mb-4 font-semibold">${cat}</div>`;
      items.forEach((item, i) => {
        html += `
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
            <div class="flex justify-between items-center">
              <div>
                <strong>${item.producto}</strong> - ${item.cantidad} ${item.unidad}
              </div>
              <button onclick="eliminarConteoInicial(${i})" class="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">🗑️</button>
            </div>
          </div>`;
      });
    }
  });
  
  listaConteoInicial.innerHTML = html;
}

function renderConteoFinal() {
  const listaConteoFinal = document.getElementById("listaConteoFinal");
  
  if (conteoFinal.length === 0) {
    listaConteoFinal.innerHTML = "<p style='color: #6c757d;'>No hay conteo final registrado para hoy</p>";
    return;
  }

  let categorias = ["Preparados", "Verduras", "Quesos", "Paquetes", "Condimentos/Ingredientes", "Accesorios", "Botiquín", "Limpieza", "General", "Gas"];
  let html = "";
  
  categorias.forEach(cat => {
    let items = conteoFinal.filter(c => c.categoria === cat);
    if (items.length > 0) {
      html += `<div class="bg-gray-800 text-white px-4 py-3 rounded-lg mb-4 font-semibold">${cat}</div>`;
      items.forEach((item, i) => {
        let inicial = conteoInicial.find(c => c.producto === item.producto);
        let usado = inicial ? inicial.cantidad - item.cantidad : 0;
        
        html += `
          <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-3">
            <div class="flex flex-col gap-3">
              <div class="flex-1">
                <strong>${item.producto}</strong> - ${item.cantidad} ${item.unidad}
                ${inicial ? `<br><small>Inicial: ${inicial.cantidad} | Usado: ${usado}</small>` : ''}
                ${item.observacion ? `<br><small>Obs: ${item.observacion}</small>` : ''}
              </div>
              <button onclick="eliminarConteoFinal(${i})" class="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">🗑️</button>
            </div>
          </div>`;
      });
    }
  });
  
  listaConteoFinal.innerHTML = html;
}

function eliminarConteoInicial(i) {
  conteoInicial.splice(i, 1);
  localStorage.setItem("conteoInicial", JSON.stringify(conteoInicial));
  renderConteoInicial();
  mostrarProductosCategoria();
}

function eliminarConteoFinal(i) {
  conteoFinal.splice(i, 1);
  localStorage.setItem("conteoFinal", JSON.stringify(conteoFinal));
  renderConteoFinal();
  mostrarProductosFinal();
}

// === PENDIENTES ===
const formPendientes = document.getElementById("formPendientes");
const listaPendientes = document.getElementById("listaPendientes");

function renderPendientes() {
  listaPendientes.innerHTML = "";
  pendientes.forEach((p, i) => {
    listaPendientes.innerHTML += `
      <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
        <div class="flex justify-between items-center">
          <div>${p}</div>
          <button onclick="eliminarPendiente(${i})" class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">✔️</button>
        </div>
      </div>`;
  });
}

formPendientes.addEventListener("submit", e => {
  e.preventDefault();
  pendientes.push(pendiente.value);
  localStorage.setItem("pendientes", JSON.stringify(pendientes));
  renderPendientes();
  formPendientes.reset();
});

function eliminarPendiente(i) {
  pendientes.splice(i, 1);
  localStorage.setItem("pendientes", JSON.stringify(pendientes));
  renderPendientes();
}

// === TAREAS ROTATIVAS ===
const formTareas = document.getElementById("formTareas");
const listaTareas = document.getElementById("listaTareas");

function renderTareas() {
  listaTareas.innerHTML = "";
  tareas.forEach((t, i) => {
    listaTareas.innerHTML += `
      <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-3">
        <div class="flex justify-between items-center">
          <div>
            <strong>${t.tarea}</strong><br>
            <small>Fecha: ${t.fecha} | Encargado: ${t.encargado}</small>
          </div>
          <div class="flex gap-2">
            <button onclick="completarTarea(${i})" class="bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">✅</button>
            <button onclick="eliminarTarea(${i})" class="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">🗑️</button>
          </div>
        </div>
      </div>`;
  });
}

formTareas.addEventListener("submit", e => {
  e.preventDefault();
  tareas.push({ 
    tarea: tarea.value, 
    fecha: fecha.value, 
    encargado: encargado.value, 
    completa: false 
  });
  localStorage.setItem("tareas", JSON.stringify(tareas));
  renderTareas();
  formTareas.reset();
});

function completarTarea(i) {
  alert("Tarea completada: " + tareas[i].tarea);
  eliminarTarea(i);
}

function eliminarTarea(i) {
  tareas.splice(i, 1);
  localStorage.setItem("tareas", JSON.stringify(tareas));
  renderTareas();
}

// === FUNCIONES PARA HISTORIAL Y FINALIZACIÓN ===
function actualizarFechaActual() {
  const fechaElement = document.getElementById("fechaActual");
  if (fechaElement) {
    fechaElement.textContent = diaActual;
  }
}

function finalizarDia() {
  if (conteoInicial.length === 0 && conteoFinal.length === 0) {
    alert("No hay datos para guardar. Agrega al menos un conteo inicial o final.");
    return;
  }

  // Crear registro del día
  const registroDia = {
    fecha: diaActual,
    timestamp: new Date().toISOString(),
    conteoInicial: [...conteoInicial],
    conteoFinal: [...conteoFinal],
    pendientes: [...pendientes],
    tareas: [...tareas],
    resumen: generarResumenTexto()
  };

  // Verificar si ya existe un registro para hoy
  const indexExistente = historial.findIndex(h => h.fecha === diaActual);
  if (indexExistente !== -1) {
    historial[indexExistente] = registroDia;
  } else {
    historial.push(registroDia);
  }

  // Guardar en localStorage
  localStorage.setItem("historial", JSON.stringify(historial));

  // Limpiar datos actuales
  conteoInicial = [];
  conteoFinal = [];
  pendientes = [];
  tareas = [];
  
  localStorage.setItem("conteoInicial", JSON.stringify(conteoInicial));
  localStorage.setItem("conteoFinal", JSON.stringify(conteoFinal));
  localStorage.setItem("pendientes", JSON.stringify(pendientes));
  localStorage.setItem("tareas", JSON.stringify(tareas));

  // Actualizar vistas
  renderConteoInicial();
  renderConteoFinal();
  renderPendientes();
  renderTareas();
  mostrarProductosCategoria();
  mostrarProductosFinal();

  alert(`✅ Día ${diaActual} finalizado y guardado en el historial. Los datos han sido limpiados para el nuevo día.`);
}

function generarResumenTexto() {
  let fecha = new Date().toLocaleDateString();
  let mensaje = `📋 RESUMEN DEL DÍA - ${fecha}\n`;
  mensaje += "=".repeat(50) + "\n\n";

  // STOCK INICIAL
  mensaje += "🌅 STOCK INICIAL DEL DÍA:\n";
  if (conteoInicial.length === 0) {
    mensaje += "- No hay conteo inicial registrado\n";
  } else {
    let categorias = ["Preparados", "Verduras", "Quesos", "Paquetes", "Condimentos/Ingredientes", "Accesorios", "Botiquín", "Limpieza", "General", "Gas"];
    categorias.forEach(cat => {
      let items = conteoInicial.filter(c => c.categoria === cat);
      if (items.length > 0) {
        mensaje += `\n${cat}:\n`;
        items.forEach(item => {
          mensaje += `  • ${item.producto}: ${item.cantidad} ${item.unidad}\n`;
        });
      }
    });
  }

  // STOCK FINAL Y USO
  mensaje += "\n🌙 STOCK FINAL Y USO DEL DÍA:\n";
  if (conteoFinal.length === 0) {
    mensaje += "- No hay conteo final registrado\n";
  } else {
    let categorias = ["Preparados", "Verduras", "Quesos", "Paquetes", "Condimentos/Ingredientes", "Accesorios", "Botiquín", "Limpieza", "General", "Gas"];
    categorias.forEach(cat => {
      let items = conteoFinal.filter(c => c.categoria === cat);
      if (items.length > 0) {
        mensaje += `\n${cat}:\n`;
        items.forEach(item => {
          let inicial = conteoInicial.find(c => c.producto === item.producto);
          let usado = inicial ? inicial.cantidad - item.cantidad : 0;
          mensaje += `  • ${item.producto}: ${item.cantidad} ${item.unidad} (usado: ${usado})\n`;
          if (item.observacion) {
            mensaje += `    Obs: ${item.observacion}\n`;
          }
        });
      }
    });
  }

  // PENDIENTES
  mensaje += "\n📝 PENDIENTES PARA MAÑANA:\n";
  if (pendientes.length === 0) {
    mensaje += "- No hay pendientes registrados\n";
  } else {
    pendientes.forEach(p => {
      mensaje += `  • ${p}\n`;
    });
  }

  // TAREAS
  mensaje += "\n🔄 TAREAS ROTATIVAS:\n";
  if (tareas.length === 0) {
    mensaje += "- No hay tareas asignadas\n";
  } else {
    tareas.forEach(t => {
      mensaje += `  • ${t.fecha}: ${t.tarea} (Encargado: ${t.encargado})\n`;
    });
  }

  mensaje += "\n" + "=".repeat(50) + "\n";
  return mensaje;
}

function abrirModalHistorial() {
  const modal = document.getElementById("modalHistorial");
  const selectorFecha = document.getElementById("selectorFecha");
  
  // Limpiar selector
  selectorFecha.innerHTML = '<option value="">Seleccionar fecha...</option>';
  
  // Agregar fechas disponibles
  historial.forEach(registro => {
    const option = document.createElement("option");
    option.value = registro.fecha;
    option.textContent = registro.fecha;
    selectorFecha.appendChild(option);
  });
  
  modal.classList.remove("hidden");
}

function cerrarModalHistorial() {
  const modal = document.getElementById("modalHistorial");
  modal.classList.add("hidden");
}

function mostrarHistorialFecha(fecha) {
  const contenidoHistorial = document.getElementById("contenidoHistorial");
  const registro = historial.find(h => h.fecha === fecha);
  
  if (!registro) {
    contenidoHistorial.innerHTML = '<p class="text-gray-500 text-center py-8">No se encontró información para esta fecha</p>';
    return;
  }

  let html = `
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h4 class="font-bold text-lg text-blue-800 mb-2">📅 ${registro.fecha}</h4>
      <p class="text-sm text-blue-600">Guardado el: ${new Date(registro.timestamp).toLocaleString()}</p>
    </div>
  `;

  // STOCK INICIAL
  html += `<div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
    <h4 class="font-bold text-green-800 mb-2">🌅 Conteo Inicial</h4>`;
  
  if (registro.conteoInicial.length === 0) {
    html += '<p class="text-gray-600">No hay conteo inicial registrado</p>';
  } else {
    let categorias = ["Preparados", "Verduras", "Quesos", "Paquetes", "Condimentos/Ingredientes", "Accesorios", "Botiquín", "Limpieza", "General", "Gas"];
    categorias.forEach(cat => {
      let items = registro.conteoInicial.filter(c => c.categoria === cat);
      if (items.length > 0) {
        html += `<div class="mb-2"><strong class="text-gray-700">${cat}:</strong>`;
        items.forEach(item => {
          html += `<div class="ml-4 text-sm">• ${item.producto}: ${item.cantidad} ${item.unidad}</div>`;
        });
        html += '</div>';
      }
    });
  }
  html += '</div>';

  // STOCK FINAL
  html += `<div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
    <h4 class="font-bold text-orange-800 mb-2">🌙 Conteo Final</h4>`;
  
  if (registro.conteoFinal.length === 0) {
    html += '<p class="text-gray-600">No hay conteo final registrado</p>';
  } else {
    let categorias = ["Preparados", "Verduras", "Quesos", "Paquetes", "Condimentos/Ingredientes", "Accesorios", "Botiquín", "Limpieza", "General", "Gas"];
    categorias.forEach(cat => {
      let items = registro.conteoFinal.filter(c => c.categoria === cat);
      if (items.length > 0) {
        html += `<div class="mb-2"><strong class="text-gray-700">${cat}:</strong>`;
        items.forEach(item => {
          let inicial = registro.conteoInicial.find(c => c.producto === item.producto);
          let usado = inicial ? inicial.cantidad - item.cantidad : 0;
          html += `<div class="ml-4 text-sm">• ${item.producto}: ${item.cantidad} ${item.unidad} (usado: ${usado})</div>`;
          if (item.observacion) {
            html += `<div class="ml-8 text-xs text-gray-500">Obs: ${item.observacion}</div>`;
          }
        });
        html += '</div>';
      }
    });
  }
  html += '</div>';

  // PENDIENTES
  html += `<div class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
    <h4 class="font-bold text-purple-800 mb-2">📝 Pendientes</h4>`;
  
  if (registro.pendientes.length === 0) {
    html += '<p class="text-gray-600">No hay pendientes registrados</p>';
  } else {
    registro.pendientes.forEach(p => {
      html += `<div class="text-sm">• ${p}</div>`;
    });
  }
  html += '</div>';

  // TAREAS
  html += `<div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
    <h4 class="font-bold text-indigo-800 mb-2">🔄 Tareas</h4>`;
  
  if (registro.tareas.length === 0) {
    html += '<p class="text-gray-600">No hay tareas registradas</p>';
  } else {
    registro.tareas.forEach(t => {
      html += `<div class="text-sm">• ${t.fecha}: ${t.tarea} (Encargado: ${t.encargado})</div>`;
    });
  }
  html += '</div>';

  // RESUMEN COMPLETO
  html += `<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
    <h4 class="font-bold text-gray-800 mb-2">📋 Resumen Completo</h4>
    <textarea readonly rows="10" class="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm font-mono resize-none">${registro.resumen}</textarea>
  </div>`;

  contenidoHistorial.innerHTML = html;
}

// === RESUMEN FINAL ===
const btnResumen = document.getElementById("btnResumen");
const btnCopiar = document.getElementById("btnCopiar");
const resumenFinal = document.getElementById("resumenFinal");

btnResumen.addEventListener("click", () => {
  let fecha = new Date().toLocaleDateString();
  let mensaje = `📋 RESUMEN DEL DÍA - ${fecha}\n`;
  mensaje += "=".repeat(50) + "\n\n";

  // STOCK INICIAL
  mensaje += "🌅 STOCK INICIAL DEL DÍA:\n";
  if (conteoInicial.length === 0) {
    mensaje += "- No hay conteo inicial registrado\n";
  } else {
    let categorias = ["Preparados", "Verduras", "Quesos", "Paquetes", "Condimentos/Ingredientes", "Accesorios", "Botiquín", "Limpieza", "General", "Gas"];
    categorias.forEach(cat => {
      let items = conteoInicial.filter(c => c.categoria === cat);
      if (items.length > 0) {
        mensaje += `\n${cat}:\n`;
        items.forEach(item => {
          mensaje += `  • ${item.producto}: ${item.cantidad} ${item.unidad}\n`;
        });
      }
    });
  }

  // STOCK FINAL Y USO
  mensaje += "\n🌙 STOCK FINAL Y USO DEL DÍA:\n";
  if (conteoFinal.length === 0) {
    mensaje += "- No hay conteo final registrado\n";
  } else {
    let categorias = ["Preparados", "Verduras", "Quesos", "Paquetes", "Condimentos/Ingredientes", "Accesorios", "Botiquín", "Limpieza", "General", "Gas"];
    categorias.forEach(cat => {
      let items = conteoFinal.filter(c => c.categoria === cat);
      if (items.length > 0) {
        mensaje += `\n${cat}:\n`;
        items.forEach(item => {
          let inicial = conteoInicial.find(c => c.producto === item.producto);
          let usado = inicial ? inicial.cantidad - item.cantidad : 0;
          mensaje += `  • ${item.producto}: ${item.cantidad} ${item.unidad} (usado: ${usado})\n`;
          if (item.observacion) {
            mensaje += `    Obs: ${item.observacion}\n`;
          }
        });
      }
    });
  }

  // PENDIENTES
  mensaje += "\n📝 PENDIENTES PARA MAÑANA:\n";
  if (pendientes.length === 0) {
    mensaje += "- No hay pendientes registrados\n";
  } else {
    pendientes.forEach(p => {
      mensaje += `  • ${p}\n`;
    });
  }

  // TAREAS
  mensaje += "\n🔄 TAREAS ROTATIVAS:\n";
  if (tareas.length === 0) {
    mensaje += "- No hay tareas asignadas\n";
  } else {
    tareas.forEach(t => {
      mensaje += `  • ${t.fecha}: ${t.tarea} (Encargado: ${t.encargado})\n`;
    });
  }

  mensaje += "\n" + "=".repeat(50) + "\n";
 

  resumenFinal.value = mensaje;
});

btnCopiar.addEventListener("click", () => {
  resumenFinal.select();
  document.execCommand("copy");
  alert("¡Resumen copiado al portapapeles!");
});

// === EVENT LISTENERS PARA HISTORIAL Y FINALIZACIÓN ===
const btnConsultarHistorial = document.getElementById("btnConsultarHistorial");
const btnFinalizarDia = document.getElementById("btnFinalizarDia");
const modalHistorial = document.getElementById("modalHistorial");
const cerrarModal = document.getElementById("cerrarModal");
const selectorFecha = document.getElementById("selectorFecha");

btnConsultarHistorial.addEventListener("click", abrirModalHistorial);
btnFinalizarDia.addEventListener("click", finalizarDia);

cerrarModal.addEventListener("click", cerrarModalHistorial);

// Cerrar modal al hacer clic fuera de él
modalHistorial.addEventListener("click", (e) => {
  if (e.target === modalHistorial) {
    cerrarModalHistorial();
  }
});

// Mostrar historial cuando se selecciona una fecha
selectorFecha.addEventListener("change", (e) => {
  if (e.target.value) {
    mostrarHistorialFecha(e.target.value);
  } else {
    document.getElementById("contenidoHistorial").innerHTML = '<p class="text-gray-500 text-center py-8">Selecciona una fecha para ver el historial</p>';
  }
});

// === INICIALIZACIÓN ===
actualizarFechaActual();
renderConteoInicial();
renderConteoFinal();
renderPendientes();
renderTareas();