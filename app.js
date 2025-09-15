// === VARIABLES GLOBALES ===
// Importar funciones de Firestore
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  getDoc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variables globales
let stock = [];
let conteoInicial = [];
let conteoFinal = [];
let faltantes = [];
let pendientes = [];
let tareas = [];
let historial = [];
// Observaciones por empleado (persistentes)
let empleados = [];
let obsUIIniciada = false;
let diaActual = new Date().toLocaleDateString();
// Observaciones privadas (persisten y no están ligadas al día)
let observacionesPrivadas = "";
// Los límites ahora son individuales por producto, no por categoría

// Datos por defecto para stock inicial - VACÍO para que el usuario cargue sus propios productos
const stockInicial = [];

// === FUNCIONES DE FIREBASE ===
async function inicializarFirebase() {
  try {
    // Esperar a que Firebase esté disponible
    while (!window.db) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log("Firebase inicializado correctamente");
    await cargarDatosIniciales();
    await cargarTodosLosDatos();
    console.log("✅ Inicialización completa. Productos en stock:", stock.length);
  } catch (error) {
    console.error("Error inicializando Firebase:", error);
    // Fallback a localStorage si Firebase falla
    cargarDesdeLocalStorage();
  }
}

async function cargarDatosIniciales() {
  try {
    const stockRef = collection(window.db, "stock");
    const stockSnapshot = await getDocs(stockRef);
    
    if (stockSnapshot.empty) {
      console.log("No hay productos en Firestore. El catálogo está vacío - el usuario puede agregar sus propios productos.");
      stock = [];
    } else {
      // Cargar productos existentes desde Firebase
      console.log("Cargando productos existentes desde Firebase...");
      stock = stockSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Productos cargados:", stock);
    }
  } catch (error) {
    console.error("Error cargando datos iniciales:", error);
  }
}

async function limpiarTodosLosProductos() {
  try {
    const stockRef = collection(window.db, "stock");
    const stockSnapshot = await getDocs(stockRef);
    
    // Eliminar todos los productos existentes
    const deletePromises = stockSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log("✅ Todos los productos han sido eliminados del catálogo");
  } catch (error) {
    console.error("Error limpiando productos:", error);
  }
}

async function cargarTodosLosDatos() {
  try {
    // Cargar conteo inicial
    const conteoInicialRef = collection(window.db, "conteoInicial");
    const conteoInicialSnapshot = await getDocs(conteoInicialRef);
    conteoInicial = conteoInicialSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Cargar conteo final
    const conteoFinalRef = collection(window.db, "conteoFinal");
    const conteoFinalSnapshot = await getDocs(conteoFinalRef);
    conteoFinal = conteoFinalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Cargar faltantes
    const faltantesRef = collection(window.db, "faltantes");
    const faltantesSnapshot = await getDocs(faltantesRef);
    faltantes = faltantesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Cargar pendientes
    const pendientesRef = collection(window.db, "pendientes");
    const pendientesSnapshot = await getDocs(pendientesRef);
    pendientes = pendientesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Cargar tareas
    const tareasRef = collection(window.db, "tareas");
    const tareasSnapshot = await getDocs(tareasRef);
    tareas = tareasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Cargar historial
    const historialRef = collection(window.db, "historial");
    const historialSnapshot = await getDocs(historialRef);
    historial = historialSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Cargar observaciones persistentes
    await cargarObservacionesPrivadas();
    await cargarEmpleados();
    
    console.log("Datos cargados desde Firebase:", { stock, conteoInicial, conteoFinal, faltantes, pendientes, tareas, historial });
    
    // Actualizar la interfaz
    actualizarInterfaz();
  } catch (error) {
    console.error("Error cargando datos desde Firebase:", error);
    cargarDesdeLocalStorage();
  }
}

function cargarDesdeLocalStorage() {
  console.log("Cargando datos desde localStorage como fallback...");
  stock = JSON.parse(localStorage.getItem("stock")) || [];
  conteoInicial = JSON.parse(localStorage.getItem("conteoInicial")) || [];
  conteoFinal = JSON.parse(localStorage.getItem("conteoFinal")) || [];
  faltantes = JSON.parse(localStorage.getItem("faltantes")) || [];
  pendientes = JSON.parse(localStorage.getItem("pendientes")) || [];
  tareas = JSON.parse(localStorage.getItem("tareas")) || [];
  historial = JSON.parse(localStorage.getItem("historial")) || [];
  actualizarInterfaz();
}

function actualizarInterfaz() {
  renderConteoInicial();
  renderConteoFinal();
  renderFaltantes();
  renderPendientes();
  renderTareas();
  renderListaProductos();
  // Observaciones UI si modal está abierto
  renderEmpleadosLista();
}

function abrirModalHistorialTareas() {
  if (!modalHistorialTareas || !selectorFechaTareas) return;
  // Preparar selector de fechas (incluir hoy y las fechas del historial)
  selectorFechaTareas.innerHTML = '<option value="">Seleccionar fecha...</option>';
  const fechasSet = new Set();
  // Fechas del historial
  historial.forEach(h => { if (h.fecha) fechasSet.add(h.fecha); });
  // Incluir hoy
  fechasSet.add(diaActual);
  // Ordenar fechas (asumiendo formato local, mostramos como vienen)
  Array.from(fechasSet).forEach(f => {
    const opt = document.createElement('option');
    opt.value = f; opt.textContent = f; selectorFechaTareas.appendChild(opt);
  });
  modalHistorialTareas.classList.remove('hidden');
}

function cerrarModalHistorialTareas() {
  if (!modalHistorialTareas) return;
  modalHistorialTareas.classList.add('hidden');
}

function renderHistorialTareasFecha(fecha, filtroTexto = '') {
  if (!contenidoHistorialTareas) return;
  const filtro = (filtroTexto || '').toLowerCase();
  let tareasDeFecha = [];

  if (fecha === diaActual) {
    tareasDeFecha = [...tareas];
  } else {
    const registro = historial.find(h => h.fecha === fecha);
    if (registro && Array.isArray(registro.tareas)) {
      tareasDeFecha = [...registro.tareas];
    }
  }

  if (!tareasDeFecha || tareasDeFecha.length === 0) {
    contenidoHistorialTareas.innerHTML = '<p class="text-gray-500 text-center py-8">No hay tareas para esta fecha</p>';
    return;
  }

  // Filtrar por texto
  const filtradas = tareasDeFecha.filter(t => {
    const texto = `${t.tarea || ''} ${t.encargado || ''} ${t.fecha || ''}`.toLowerCase();
    return texto.includes(filtro);
  });

  if (filtradas.length === 0) {
    contenidoHistorialTareas.innerHTML = '<p class="text-gray-500 text-center py-8">Sin coincidencias para la búsqueda</p>';
    return;
  }

  let html = '';
  filtradas.forEach(t => {
    html += `
      <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <div class="flex justify-between items-center">
          <div class="${t.completa ? 'line-through text-gray-500' : ''}">
            <strong>${t.tarea || ''}</strong><br>
            <small>Fecha: ${t.fecha || ''} | Encargado: ${t.encargado || ''}</small>
          </div>
        </div>
      </div>`;
  });
  contenidoHistorialTareas.innerHTML = html;
}

// === FUNCIÓN PARA RENDERIZAR LISTA DE PRODUCTOS ===
function renderListaProductos() {
  const listaProductos = document.getElementById("listaProductos");
  const buscador = document.getElementById("buscadorProductos");
  if (!listaProductos) return;
  
  if (stock.length === 0) {
    listaProductos.innerHTML = '<p class="text-gray-500 text-sm">No hay productos en el catálogo</p>';
    return;
  }
  
  // Obtener término de búsqueda
  const terminoBusqueda = buscador ? buscador.value.toLowerCase() : "";
  
  // Filtrar productos
  const productosFiltrados = stock.filter(producto => 
    producto.producto.toLowerCase().includes(terminoBusqueda) ||
    producto.categoria.toLowerCase().includes(terminoBusqueda) ||
    producto.unidad.toLowerCase().includes(terminoBusqueda)
  );
  
  if (productosFiltrados.length === 0 && terminoBusqueda) {
    listaProductos.innerHTML = '<p class="text-gray-500 text-sm">No se encontraron productos que coincidan con la búsqueda</p>';
    return;
  }
  
  let html = "";
  productosFiltrados.forEach((producto, i) => {
    // Encontrar el índice real en el array original
    const indiceReal = stock.findIndex(p => p.id === producto.id);
    
    const limiteTexto = producto.limite && producto.limite > 0 ? `Límite: ${producto.limite}` : 'Sin límite';
    const limiteColor = producto.limite && producto.limite > 0 ? 'text-orange-600' : 'text-gray-400';
    
    html += `
      <div class="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center">
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-800">${producto.producto}</span>
            <span class="text-xs ${limiteColor} bg-gray-100 px-2 py-1 rounded">${limiteTexto}</span>
          </div>
          <span class="text-sm text-gray-500">${producto.categoria} - ${producto.unidad}</span>
        </div>
        <div class="flex gap-2">
          <button onclick="editarProducto(${indiceReal})" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">✏️</button>
          <button onclick="eliminarProducto(${indiceReal})" class="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">🗑️</button>
        </div>
      </div>`;
  });
  
  listaProductos.innerHTML = html;
}

// === FUNCIONES PARA GESTIONAR PRODUCTOS ===
async function eliminarProducto(index) {
  const producto = stock[index];
  if (!confirm(`¿Estás seguro de que quieres eliminar "${producto.producto}" del catálogo?`)) {
    return;
  }
  
  try {
    if (producto.id) {
      await deleteDoc(doc(window.db, "stock", producto.id));
    }
    stock.splice(index, 1);
    renderListaProductos();
    alert(`✅ Producto "${producto.producto}" eliminado del catálogo`);
  } catch (error) {
    console.error("Error eliminando producto:", error);
    alert("Error al eliminar el producto. Intenta nuevamente.");
  }
}

function editarProducto(index) {
  console.log("Editando producto en índice:", index);
  const producto = stock[index];
  console.log("Producto a editar:", producto);
  
  if (!producto) {
    alert("Error: No se encontró el producto a editar");
    return;
  }
  
  // Crear modal de edición
  const modal = document.createElement('div');
  modal.id = 'modalEditarProducto';
  modal.className = 'fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 backdrop-blur-sm w-full h-full';
  modal.innerHTML = `
    <div class="bg-white rounded-xl max-w-md w-full p-6">
      <h3 class="text-lg font-bold text-gray-800 mb-4">✏️ Editar Producto</h3>
      <form id="formEditarProducto" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
          <select id="editCategoria" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="Preparados">Preparados</option>
            <option value="Verduras">Verduras</option>
            <option value="Quesos">Quesos</option>
            <option value="Paquetes">Paquetes</option>
            <option value="Condimentos/Ingredientes">Condimentos/Ingredientes</option>
            <option value="Accesorios">Accesorios</option>
            <option value="Botiquín">Botiquín</option>
            <option value="Limpieza">Limpieza</option>
            <option value="General">General</option>
            <option value="Gas">Gas</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Producto</label>
          <input type="text" id="editProducto" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
          <select id="editUnidad" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="unidad">Unidad</option>
            <option value="kg">Kg</option>
            <option value="g">Gramos</option>
            <option value="lts">Litros</option>
            <option value="paquete">Paquete</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Límite mínimo</label>
          <input type="number" id="editLimite" min="0" step="0.01" 
                 placeholder="Ej: 5" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          <p class="text-xs text-gray-500 mt-1">Cantidad mínima para generar faltante automático (0 = sin límite)</p>
        </div>
        <div class="flex gap-3">
          <button type="submit" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
            💾 Guardar
          </button>
          <button type="button" onclick="cerrarModalEdicion()" class="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium">
            ❌ Cancelar
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Llenar formulario con datos actuales DESPUÉS de agregar al DOM
  setTimeout(() => {
    const categoriaSelect = document.getElementById('editCategoria');
    const productoInput = document.getElementById('editProducto');
    const unidadSelect = document.getElementById('editUnidad');
    const limiteInput = document.getElementById('editLimite');
    
    if (categoriaSelect && productoInput && unidadSelect && limiteInput) {
      categoriaSelect.value = producto.categoria;
      productoInput.value = producto.producto;
      unidadSelect.value = producto.unidad;
      limiteInput.value = producto.limite || 0;
      console.log("Formulario llenado con datos:", { categoria: producto.categoria, producto: producto.producto, unidad: producto.unidad, limite: producto.limite });
    } else {
      console.error("No se pudieron encontrar los elementos del formulario");
    }
  }, 100);
  
  // Manejar envío del formulario
  const form = document.getElementById('formEditarProducto');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log("Formulario de edición enviado");
      // Guardar y luego cerrar modal exitosamente
      await actualizarProducto(index);
      cerrarModalEdicion();
    });
  } else {
    console.error("No se pudo encontrar el formulario de edición");
  }
}

async function actualizarProducto(index) {
  try {
    console.log("Actualizando producto en índice:", index);
    const producto = stock[index];
    
    if (!producto) {
      alert("Error: No se encontró el producto a actualizar");
      return;
    }
    
    const nuevaCategoria = document.getElementById('editCategoria').value;
    const nuevoProducto = document.getElementById('editProducto').value;
    const nuevaUnidad = document.getElementById('editUnidad').value;
    const nuevoLimite = parseFloat(document.getElementById('editLimite').value) || 0;
    
    console.log("Datos a actualizar:", { nuevaCategoria, nuevoProducto, nuevaUnidad, nuevoLimite });
    
    if (!nuevaCategoria || !nuevoProducto || !nuevaUnidad) {
      alert("Por favor completa todos los campos obligatorios");
      return;
    }
    
    // Verificar si el nombre del producto ya existe (excluyendo el actual)
    const existe = stock.find((s, i) => i !== index && s.producto.toLowerCase() === nuevoProducto.toLowerCase());
    if (existe) {
      alert("Ya existe un producto con ese nombre en el catálogo");
      return;
    }
    
    const datosActualizados = {
      categoria: nuevaCategoria,
      producto: nuevoProducto,
      unidad: nuevaUnidad,
      limite: nuevoLimite,
      timestamp: new Date().toISOString()
    };
    
    console.log("Actualizando en Firebase...");
    if (producto.id) {
      await updateDoc(doc(window.db, "stock", producto.id), datosActualizados);
      console.log("Producto actualizado en Firebase");
    }
    
    // Actualizar array local
    stock[index] = { id: producto.id, ...datosActualizados };
    console.log("Array local actualizado");
    
    // Actualizar interfaz
    renderListaProductos();
    mostrarAviso(`✅ Producto "${nuevoProducto}" actualizado correctamente`);
  } catch (error) {
    console.error("Error actualizando producto:", error);
    mostrarAviso("Error al actualizar el producto. Intenta nuevamente.");
  }
}

function cerrarModalEdicion() {
  const modal = document.getElementById('modalEditarProducto');
  if (modal) {
    modal.remove();
  }
}

// Hacer funciones globales para que estén disponibles desde HTML
window.eliminarProducto = eliminarProducto;
window.editarProducto = editarProducto;
window.cerrarModalEdicion = cerrarModalEdicion;
window.mostrarProductosCategoria = mostrarProductosCategoria;
window.mostrarProductosFinal = mostrarProductosFinal;
window.agregarConteoInicial = agregarConteoInicial;
window.agregarConteoFinal = agregarConteoFinal;
window.eliminarConteoInicial = eliminarConteoInicial;
window.eliminarConteoFinal = eliminarConteoFinal;
window.marcarFaltanteCompletado = marcarFaltanteCompletado;
window.marcarPendienteCompletado = marcarPendienteCompletado;
window.eliminarPendiente = eliminarPendiente;
window.completarTarea = completarTarea;
window.eliminarTarea = eliminarTarea;
window.abrirModalHistorial = abrirModalHistorial;
window.cerrarModalHistorial = cerrarModalHistorial;
window.mostrarHistorialFecha = mostrarHistorialFecha;
window.eliminarDiaHistorial = eliminarDiaHistorial;
window.finalizarDia = finalizarDia;
window.cerrarSesion = cerrarSesion;

// Función de debug para probar la detección de faltantes
window.debugFaltantes = function() {
  console.log("=== DEBUG FALTANTES ===");
  console.log("Stock:", stock);
  console.log("Conteo Final:", conteoFinal);
  console.log("Faltantes actuales:", faltantes);
  
  // Probar detección manual
  detectarFaltantesAutomaticos().then(resultado => {
    console.log("Resultado detección:", resultado);
  });
};
// Nuevas funciones expuestas
window.abrirModalObservacionesPrivadas = abrirModalObservacionesPrivadas;
window.cerrarModalObservacionesPrivadas = cerrarModalObservacionesPrivadas;
window.abrirModalHistorialTareas = abrirModalHistorialTareas;
window.cerrarModalHistorialTareas = cerrarModalHistorialTareas;
window.renderHistorialTareasFecha = renderHistorialTareasFecha;

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
                    class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium">
              ${yaRegistrado ? 'Confirmar' : 'Confirmar'}
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
                      class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                ${final ? 'Confirmar' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>`;
    }
  });
  
  productosDiv.innerHTML = html;
}

// === FUNCIONES PARA AGREGAR CONTEO ===
async function agregarConteoInicial(producto, categoria, unidad) {
  const cantidad = document.getElementById(`cantidad_${producto.replace(/\s+/g, '_')}`).value;
  
  if (!cantidad || cantidad <= 0) {
    alert("Por favor ingresa una cantidad válida");
    return;
  }
  
  try {
    // Verificar si ya existe y actualizar, o crear nuevo
    const existente = conteoInicial.find(c => c.producto === producto);
    
    const datosConteo = {
      categoria: categoria,
      producto: producto,
      unidad: unidad,
      cantidad: Number(cantidad),
      fecha: new Date().toLocaleDateString(),
      timestamp: new Date().toISOString()
    };
    
    if (existente) {
      // Actualizar documento existente
      const docRef = doc(window.db, "conteoInicial", existente.id);
      await updateDoc(docRef, datosConteo);
      // Actualizar array local
      const index = conteoInicial.findIndex(c => c.producto === producto);
      conteoInicial[index] = { id: existente.id, ...datosConteo };
    } else {
      // Crear nuevo documento
      const docRef = await addDoc(collection(window.db, "conteoInicial"), datosConteo);
      conteoInicial.push({ id: docRef.id, ...datosConteo });
    }
    
    renderConteoInicial();
    mostrarProductosCategoria(); // Actualizar la vista
    alert(`✅ ${producto} registrado: ${cantidad} ${unidad}`);
  } catch (error) {
    console.error("Error guardando conteo inicial:", error);
    alert("Error al guardar el conteo. Intenta nuevamente.");
  }
}

async function agregarConteoFinal(producto, categoria, unidad) {
  const cantidad = document.getElementById(`final_${producto.replace(/\s+/g, '_')}`).value;
  const observacion = document.getElementById(`obs_${producto.replace(/\s+/g, '_')}`).value;
  
  if (!cantidad || cantidad < 0) {
    alert("Por favor ingresa una cantidad válida");
    return;
  }
  
  try {
    // Verificar si ya existe y actualizar, o crear nuevo
    const existente = conteoFinal.find(c => c.producto === producto);
    
    const datosConteo = {
      categoria: categoria,
      producto: producto,
      unidad: unidad,
      cantidad: Number(cantidad),
      observacion: observacion,
      fecha: new Date().toLocaleDateString(),
      timestamp: new Date().toISOString()
    };
    
    if (existente) {
      // Actualizar documento existente
      const docRef = doc(window.db, "conteoFinal", existente.id);
      await updateDoc(docRef, datosConteo);
      // Actualizar array local
      const index = conteoFinal.findIndex(c => c.producto === producto);
      conteoFinal[index] = { id: existente.id, ...datosConteo };
    } else {
      // Crear nuevo documento
      const docRef = await addDoc(collection(window.db, "conteoFinal"), datosConteo);
      conteoFinal.push({ id: docRef.id, ...datosConteo });
    }
    
    renderConteoFinal();
    mostrarProductosFinal(); // Actualizar la vista
    alert(`✅ ${producto} final registrado: ${cantidad} ${unidad}`);
    
    // NUEVO: Detectar faltantes automáticamente después de agregar/actualizar cada producto
    console.log("🔍 Detectando faltantes después de agregar/actualizar producto...");
    await detectarFaltantesAutomaticos();
  } catch (error) {
    console.error("Error guardando conteo final:", error);
    alert("Error al guardar el conteo. Intenta nuevamente.");
  }
}

// === STOCK BASE (CATÁLOGO) ===
const formStock = document.getElementById("formStock");

formStock.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  try {
    // Verificar si el producto ya existe
    let existe = stock.find(s => s.producto.toLowerCase() === producto.value.toLowerCase());
    if (existe) {
      alert("Este producto ya existe en el catálogo");
      return;
    }

    const nuevoProducto = {
      categoria: categoria.value,
      producto: producto.value,
      unidad: unidad.value,
      limite: parseFloat(limite.value) || 0,
      timestamp: new Date().toISOString()
    };

    // Agregar a Firebase
    const docRef = await addDoc(collection(window.db, "stock"), nuevoProducto);
    
    // Agregar al array local
    stock.push({ id: docRef.id, ...nuevoProducto });
    
    // Actualizar la lista de productos
    renderListaProductos();
    
    formStock.reset();
    alert("✅ Producto agregado al catálogo");
  } catch (error) {
    console.error("Error agregando producto:", error);
    alert("Error al agregar el producto. Intenta nuevamente.");
  }
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
              <button onclick="eliminarConteoInicial('${item.id || item.producto}')" class="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">🗑️</button>
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
              <button onclick="eliminarConteoFinal('${item.id || item.producto}')" class="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">🗑️</button>
            </div>
          </div>`;
      });
    }
  });
  
  listaConteoFinal.innerHTML = html;
}

async function eliminarConteoInicial(key) {
  try {
    let index = typeof key === 'number' ? key : conteoInicial.findIndex(c => c.id === key || c.producto === key);
    if (index < 0) return;
    const item = conteoInicial[index];
    if (item.id) {
      await deleteDoc(doc(window.db, "conteoInicial", item.id));
    }
    conteoInicial.splice(index, 1);
    renderConteoInicial();
    mostrarProductosCategoria();
  } catch (error) {
    console.error("Error eliminando conteo inicial:", error);
    alert("Error al eliminar el conteo. Intenta nuevamente.");
  }
}

async function eliminarConteoFinal(key) {
  try {
    let index = typeof key === 'number' ? key : conteoFinal.findIndex(c => c.id === key || c.producto === key);
    if (index < 0) return;
    const item = conteoFinal[index];
    if (item.id) {
      await deleteDoc(doc(window.db, "conteoFinal", item.id));
    }
    conteoFinal.splice(index, 1);
    
    // CORRECCIÓN: Eliminar faltantes automáticos del producto eliminado
    await eliminarFaltantesAutomaticosDelProducto(item.producto);
    
    renderConteoFinal();
    mostrarProductosFinal();
  } catch (error) {
    console.error("Error eliminando conteo final:", error);
    alert("Error al eliminar el conteo. Intenta nuevamente.");
  }
}

// Función auxiliar para eliminar faltantes automáticos de un producto específico
async function eliminarFaltantesAutomaticosDelProducto(nombreProducto) {
  try {
    const faltantesDelProducto = faltantes.filter(f => 
      f.producto === nombreProducto && 
      f.automatico === true && 
      f.descripcion.includes('Stock bajo')
    );
    
    for (const faltante of faltantesDelProducto) {
      if (faltante.id) {
        await deleteDoc(doc(window.db, "faltantes", faltante.id));
      }
      // Remover del array local
      const index = faltantes.findIndex(f => f.id === faltante.id);
      if (index > -1) {
        faltantes.splice(index, 1);
      }
      console.log(`✅ Faltante automático eliminado: ${nombreProducto} (producto eliminado del conteo)`);
    }
    
    if (faltantesDelProducto.length > 0) {
      renderFaltantes();
    }
  } catch (error) {
    console.error(`Error eliminando faltantes automáticos para ${nombreProducto}:`, error);
  }
}

// === PENDIENTES ===
const formPendientes = document.getElementById("formPendientes");
const listaPendientes = document.getElementById("listaPendientes");

function renderPendientes() {
  listaPendientes.innerHTML = "";
  pendientes.forEach((p, i) => {
    const descripcion = p.descripcion || p; // Compatibilidad con datos antiguos
    const completado = p.completado || false;
    const estiloCompletado = completado ? "line-through text-gray-500 bg-gray-100" : "";
    
    listaPendientes.innerHTML += `
      <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
        <div class="flex justify-between items-center">
          <div class="${estiloCompletado}">${descripcion}</div>
          <div class="flex gap-2">
            <button onclick="marcarPendienteCompletado(${i})" class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
              ${completado ? '↩️' : '✔️'}
            </button>
            <button onclick="eliminarPendiente(${i})" class="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">🗑️</button>
          </div>
        </div>
      </div>`;
  });
}

formPendientes.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  try {
    const nuevoPendiente = {
      descripcion: pendiente.value,
      fecha: new Date().toLocaleDateString(),
      timestamp: new Date().toISOString()
    };

    const docRef = await addDoc(collection(window.db, "pendientes"), nuevoPendiente);
    pendientes.push({ id: docRef.id, ...nuevoPendiente });
    renderPendientes();
    formPendientes.reset();
  } catch (error) {
    console.error("Error agregando pendiente:", error);
    alert("Error al agregar el pendiente. Intenta nuevamente.");
  }
});

async function marcarPendienteCompletado(i) {
  try {
    const item = pendientes[i];
    const nuevoEstado = !item.completado;
    
    const datosActualizados = {
      ...item,
      completado: nuevoEstado,
      timestamp: new Date().toISOString()
    };
    
    if (item.id) {
      await updateDoc(doc(window.db, "pendientes", item.id), datosActualizados);
    }
    
    pendientes[i] = datosActualizados;
    renderPendientes();
  } catch (error) {
    console.error("Error marcando pendiente:", error);
    alert("Error al marcar el pendiente. Intenta nuevamente.");
  }
}

// Eliminar pendiente individual
async function eliminarPendiente(i) {
  try {
    const item = pendientes[i];
    if (!item) return;
    if (!confirm(`¿Eliminar pendiente: "${item.descripcion || ''}"?`)) return;
    if (item.id) {
      await deleteDoc(doc(window.db, 'pendientes', item.id));
    }
    pendientes.splice(i, 1);
    renderPendientes();
  } catch (e) {
    console.error('Error eliminando pendiente:', e);
    alert('Error al eliminar el pendiente. Intenta nuevamente.');
  }
}

// === FALTANTES ===
const formFaltantes = document.getElementById("formFaltantes");
const listaFaltantes = document.getElementById("listaFaltantes");

function renderFaltantes() {
  listaFaltantes.innerHTML = "";
  faltantes.forEach((f, i) => {
    const descripcion = f.descripcion || f; // Compatibilidad con datos antiguos
    const completado = f.completado || false;
    const esAutomatico = f.automatico || false;
    const estiloCompletado = completado ? "line-through text-gray-500 bg-gray-100" : "";
    const estiloAutomatico = esAutomatico ? "border-orange-300 bg-orange-50" : "border-red-200 bg-red-50";
    const iconoAutomatico = esAutomatico ? "🤖" : "⚠️";
    
    listaFaltantes.innerHTML += `
      <div class="${estiloAutomatico} border rounded-lg p-4 mb-3">
        <div class="flex justify-between items-center">
          <div class="flex items-center">
            <span class="text-red-600 mr-2">${iconoAutomatico}</span>
            <div class="${estiloCompletado}">${descripcion}</div>
            ${esAutomatico ? '<span class="ml-2 text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">AUTO</span>' : ''}
          </div>
          <div class="flex gap-2">
            <button onclick="marcarFaltanteCompletado(${i})" class="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
              ${completado ? '↩️' : '✔️'}
            </button>
            <button onclick="eliminarFaltante(${i})" class="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium">🗑️</button>
          </div>
        </div>
      </div>`;
  });
}

formFaltantes.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  try {
    const nuevoFaltante = {
      descripcion: faltante.value,
      fecha: new Date().toLocaleDateString(),
      timestamp: new Date().toISOString()
    };

    const docRef = await addDoc(collection(window.db, "faltantes"), nuevoFaltante);
    faltantes.push({ id: docRef.id, ...nuevoFaltante });
    renderFaltantes();
    formFaltantes.reset();
  } catch (error) {
    console.error("Error agregando faltante:", error);
    alert("Error al agregar el faltante. Intenta nuevamente.");
  }
});

async function marcarFaltanteCompletado(i) {
  try {
    const item = faltantes[i];
    const nuevoEstado = !item.completado;
    
    const datosActualizados = {
      ...item,
      completado: nuevoEstado,
      timestamp: new Date().toISOString()
    };
    
    if (item.id) {
      await updateDoc(doc(window.db, "faltantes", item.id), datosActualizados);
    }
    
    faltantes[i] = datosActualizados;
    renderFaltantes();
  } catch (error) {
    console.error("Error marcando faltante:", error);
    alert("Error al marcar el faltante. Intenta nuevamente.");
  }
}

// Eliminar faltante individual
async function eliminarFaltante(i) {
  try {
    const item = faltantes[i];
    if (!item) return;
    if (!confirm(`¿Eliminar faltante: "${item.descripcion || ''}"?`)) return;
    if (item.id) {
      await deleteDoc(doc(window.db, 'faltantes', item.id));
    }
    faltantes.splice(i, 1);
    renderFaltantes();
  } catch (e) {
    console.error('Error eliminando faltante:', e);
    alert('Error al eliminar el faltante. Intenta nuevamente.');
  }
}

// Hacer función global
window.eliminarFaltante = eliminarFaltante;

// === TAREAS ROTATIVAS ===
const formTareas = document.getElementById("formTareas");
const listaTareas = document.getElementById("listaTareas");

function renderTareas() {
  listaTareas.innerHTML = "";
  tareas.forEach((t, i) => {
    const completada = !!t.completa;
    const estiloCompletado = completada ? "line-through text-gray-500 bg-gray-100" : "";
    listaTareas.innerHTML += `
      <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-3">
        <div class="flex justify-between items-center">
          <div class="${estiloCompletado}">
            <strong>${t.tarea}</strong><br>
            <small>Fecha: ${t.fecha} | Encargado: ${t.encargado}</small>
          </div>
          <div class="flex gap-2">
            <button onclick="completarTarea(${i})" class="bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">${completada ? '↩️' : '✅'}</button>
            <button onclick="eliminarTarea(${i})" class="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">🗑️</button>
          </div>
        </div>
      </div>`;
  });
}

formTareas.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  try {
    const nuevaTarea = { 
      tarea: tarea.value, 
      fecha: fecha.value, 
      encargado: encargado.value, 
      completa: false,
      timestamp: new Date().toISOString()
    };

    const docRef = await addDoc(collection(window.db, "tareas"), nuevaTarea);
    tareas.push({ id: docRef.id, ...nuevaTarea });
    renderTareas();
    formTareas.reset();
  } catch (error) {
    console.error("Error agregando tarea:", error);
    alert("Error al agregar la tarea. Intenta nuevamente.");
  }
});

async function completarTarea(i) {
  try {
    const item = tareas[i];
    const nuevoEstado = !item.completa;
    const datosActualizados = { ...item, completa: nuevoEstado, timestamp: new Date().toISOString() };
    if (item.id) {
      await updateDoc(doc(window.db, "tareas", item.id), datosActualizados);
    }
    tareas[i] = datosActualizados;
    renderTareas();
  } catch (error) {
    console.error("Error marcando tarea como completada:", error);
    alert("Error al marcar la tarea. Intenta nuevamente.");
  }
}

async function eliminarTarea(i) {
  try {
    const item = tareas[i];
    if (item.id) {
      await deleteDoc(doc(window.db, "tareas", item.id));
    }
    tareas.splice(i, 1);
    renderTareas();
  } catch (error) {
    console.error("Error eliminando tarea:", error);
    alert("Error al eliminar la tarea. Intenta nuevamente.");
  }
}

// === FUNCIONES PARA HISTORIAL Y FINALIZACIÓN ===
function actualizarFechaActual() {
  const fechaElement = document.getElementById("fechaActual");
  if (fechaElement) {
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString();
    const hora = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    fechaElement.textContent = `${fecha} ${hora}`;
  }
}


async function finalizarDia() {
  if (conteoInicial.length === 0 && conteoFinal.length === 0) {
    alert("No hay datos para guardar. Agrega al menos un conteo inicial o final.");
    return;
  }

  // Mostrar indicador de carga
  const btnFinalizar = document.getElementById("btnFinalizarDia");
  const textoOriginal = btnFinalizar.textContent;
  btnFinalizar.textContent = "⏳ Guardando...";
  btnFinalizar.disabled = true;

  try {
    // CORRECCIÓN: Completar conteo final con productos no editados del inicial
    const conteoFinalCompleto = await completarConteoFinalConInicial();
    
    // Actualizar el array global conteoFinal con el conteo completo para la detección
    conteoFinal = [...conteoFinalCompleto];
    
    // Detectar faltantes automáticamente con el conteo final completo
    await detectarFaltantesAutomaticos();
    
    // Crear registro del día
    const registroDia = {
      fecha: diaActual,
      timestamp: new Date().toISOString(),
      conteoInicial: [...conteoInicial],
      conteoFinal: [...conteoFinalCompleto],
      faltantes: [...faltantes],
      pendientes: [...pendientes],
      tareas: [...tareas],
      resumen: generarResumenTexto()
    };

    // Verificar si ya existe un registro para hoy
    const existente = historial.find(h => h.fecha === diaActual);
    
    if (existente) {
      // Actualizar registro existente
      const docRef = doc(window.db, "historial", existente.id);
      await updateDoc(docRef, registroDia);
      const index = historial.findIndex(h => h.fecha === diaActual);
      historial[index] = { id: existente.id, ...registroDia };
    } else {
      // Crear nuevo registro
      const docRef = await addDoc(collection(window.db, "historial"), registroDia);
      historial.push({ id: docRef.id, ...registroDia });
    }

    // Antes de limpiar: preparar arrastre de conteo final -> inicial para el próximo día
    const migrado = await arrastrarFinalComoInicialParaManiana();
    // Limpiar datos actuales; si migramos, preservamos el conteoInicial recién creado
    await limpiarDatosDelDia({ preservarInicial: !!migrado });

    // Actualizar vistas
    renderConteoInicial();
    renderConteoFinal();
    renderPendientes();
    renderTareas();
    mostrarProductosCategoria();
    mostrarProductosFinal();

    alert(`✅ Día ${diaActual} finalizado y guardado en el historial. Los datos serán limpiados para el nuevo día.`);
  } catch (error) {
    console.error("Error finalizando día:", error);
    alert("Error al finalizar el día. Intenta nuevamente.");
  } finally {
    // Restaurar botón
    btnFinalizar.textContent = textoOriginal;
    btnFinalizar.disabled = false;
  }
}

async function limpiarDatosDelDia(opts = { preservarInicial: false }) {
  try {
    // Importar writeBatch para operaciones en lote
    const { writeBatch } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    const batch = writeBatch(window.db);
    
    // Eliminar conteos iniciales solo si NO debemos preservarlos
    if (!opts.preservarInicial) {
      for (const item of conteoInicial) {
        if (item.id) {
          batch.delete(doc(window.db, "conteoInicial", item.id));
        }
      }
      conteoInicial = [];
    }
    
    // Eliminar conteos finales (quedan limpios para el nuevo día)
    for (const item of conteoFinal) {
      if (item.id) {
        batch.delete(doc(window.db, "conteoFinal", item.id));
      }
    }
    
    // Eliminar faltantes
    for (const item of faltantes) {
      if (item.id) {
        batch.delete(doc(window.db, "faltantes", item.id));
      }
    }
    
    // Eliminar pendientes
    for (const item of pendientes) {
      if (item.id) {
        batch.delete(doc(window.db, "pendientes", item.id));
      }
    }
    
    // Eliminar tareas
    for (const item of tareas) {
      if (item.id) {
        batch.delete(doc(window.db, "tareas", item.id));
      }
    }
    
    // Ejecutar todas las eliminaciones en una sola operación
    await batch.commit();
    
    // Limpiar arrays locales
    conteoFinal = [];
    faltantes = [];
    pendientes = [];
    tareas = [];
  } catch (error) {
    console.error("Error limpiando datos del día:", error);
    // Fallback: limpiar arrays locales aunque falle la eliminación en Firebase
    conteoFinal = [];
    faltantes = [];
    pendientes = [];
    tareas = [];
  }
}

// CORRECCIÓN: Completar conteo final con productos del conteo inicial que no fueron editados
async function completarConteoFinalConInicial() {
  try {
    console.log("🔧 Completando conteo final...");
    console.log("Conteo inicial:", conteoInicial);
    console.log("Conteo final actual:", conteoFinal);
    
    const conteoFinalCompleto = [...conteoFinal];
    
    // Para cada producto del conteo inicial, verificar si existe en el conteo final
    for (const itemInicial of conteoInicial) {
      const existeEnFinal = conteoFinal.find(cf => cf.producto === itemInicial.producto);
      
      if (!existeEnFinal) {
        // Si no existe en el final, agregarlo con la misma cantidad (asumiendo que no se usó)
        const nuevoItemFinal = {
          categoria: itemInicial.categoria,
          producto: itemInicial.producto,
          unidad: itemInicial.unidad,
          cantidad: itemInicial.cantidad, // Misma cantidad que el inicial
          observacion: "No editado - cantidad inicial mantenida",
          fecha: new Date().toLocaleDateString(),
          timestamp: new Date().toISOString()
        };
        
        // NO agregar a Firebase aquí, solo al array local para el historial
        conteoFinalCompleto.push({ ...nuevoItemFinal });
        
        console.log(`✅ Agregado al conteo final (no editado): ${itemInicial.producto} - ${itemInicial.cantidad} ${itemInicial.unidad}`);
      } else {
        console.log(`ℹ️ Producto ya existe en conteo final: ${itemInicial.producto}`);
      }
    }
    
    console.log("Conteo final completo:", conteoFinalCompleto);
    return conteoFinalCompleto;
  } catch (error) {
    console.error("Error completando conteo final:", error);
    return conteoFinal; // Devolver el conteo final original si hay error
  }
}

// Migra el conteo como inicial del próximo día usando la lógica correcta
async function arrastrarFinalComoInicialParaManiana() {
  try {
    if (!conteoInicial || conteoInicial.length === 0) return false;
    
    // Guardar una copia del conteo inicial antes de vaciarlo
    const conteoInicialOriginal = [...conteoInicial];
    
    // Importar writeBatch para operaciones en lote
    const { writeBatch } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    const batch = writeBatch(window.db);
    
    // Eliminar todo conteoInicial actual primero (vamos a reemplazarlo)
    for (const item of conteoInicial) {
      if (item.id) {
        batch.delete(doc(window.db, 'conteoInicial', item.id));
      }
    }
    
    // Ejecutar eliminaciones
    await batch.commit();
    conteoInicial = [];

    // Crear nuevos documentos en conteoInicial usando la lógica correcta
    const newBatch = writeBatch(window.db);
    const nuevosItems = [];
    
    // Recorrer todos los productos del conteo inicial original
    for (const itemInicial of conteoInicialOriginal) {
      // Buscar si tiene conteo final
      const itemFinal = conteoFinal.find(cf => cf.producto === itemInicial.producto);
      
      let cantidadParaManiana;
      let observacion = "";
      
      if (itemFinal) {
        // Si tiene conteo final, usar esa cantidad
        cantidadParaManiana = Number(itemFinal.cantidad) || 0;
        observacion = "Actualizado desde conteo final";
        console.log(`✅ ${itemInicial.producto}: Usando conteo final (${cantidadParaManiana})`);
      } else {
        // Si no tiene conteo final, arrastrar la cantidad inicial
        cantidadParaManiana = Number(itemInicial.cantidad) || 0;
        observacion = "No editado - cantidad inicial mantenida";
        console.log(`✅ ${itemInicial.producto}: Arrastrando cantidad inicial (${cantidadParaManiana})`);
      }
      
      const datos = {
        categoria: itemInicial.categoria,
        producto: itemInicial.producto,
        unidad: itemInicial.unidad,
        cantidad: cantidadParaManiana,
        observacion: observacion,
        fecha: new Date().toLocaleDateString(),
        timestamp: new Date().toISOString()
      };
      
      // Crear referencia temporal para el documento
      const newDocRef = doc(collection(window.db, 'conteoInicial'));
      newBatch.set(newDocRef, datos);
      
      // Agregar a la lista local
      nuevosItems.push({ id: newDocRef.id, ...datos });
    }
    
    // Ejecutar todas las creaciones en una sola operación
    await newBatch.commit();
    conteoInicial = nuevosItems;
    
    console.log(`✅ Migración completada: ${nuevosItems.length} productos arrastrados para mañana`);
    return true;
  } catch (e) {
    console.error('Error migrando conteo para mañana:', e);
    return false;
  }
}

function generarResumenTexto() {
  let fecha = new Date().toLocaleDateString();
  let mensaje = `📋 RESUMEN COMPLETO DEL DÍA - ${fecha}\n`;
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

  // FALTANTES
  mensaje += "\n⚠️ FALTANTES DEL DÍA:\n";
  if (faltantes.length === 0) {
    mensaje += "- No hay faltantes registrados\n";
  } else {
    faltantes.forEach(f => {
      const descripcion = f.descripcion || f; // Compatibilidad con datos antiguos
      mensaje += `  • ${descripcion}\n`;
    });
  }

  // PENDIENTES
  mensaje += "\n📝 PENDIENTES PARA MAÑANA:\n";
  if (pendientes.length === 0) {
    mensaje += "- No hay pendientes registrados\n";
  } else {
    pendientes.forEach(p => {
      const descripcion = p.descripcion || p; // Compatibilidad con datos antiguos
      mensaje += `  • ${descripcion}\n`;
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

  // (Privado) No incluir observaciones privadas

  mensaje += "\n" + "=".repeat(50) + "\n";
  return mensaje;
}

function generarResumenResumido() {
  let fecha = new Date().toLocaleDateString();
  let mensaje = `RESUMEN DEL DÍA - ${fecha}\n`;
  mensaje += "-".repeat(40) + "\n";

  // Solo imprimir STOCK FINAL y LO USADO en el día
  if (conteoFinal.length === 0) {
    mensaje += "Sin conteo final registrado\n";
  } else {
    // Agrupar por categoría para mejor lectura
    const categorias = ["Preparados", "Verduras", "Quesos", "Paquetes", "Condimentos/Ingredientes", "Accesorios", "Botiquín", "Limpieza", "General", "Gas"];
    categorias.forEach(cat => {
      const items = conteoFinal.filter(c => c.categoria === cat);
      if (items.length === 0) return;
      mensaje += `\n${cat}:\n`;
      items.forEach(item => {
        const inicial = conteoInicial.find(c => c.producto === item.producto);
        const usado = inicial ? (inicial.cantidad - item.cantidad) : 0;
        mensaje += `  • ${item.producto}: final ${item.cantidad} ${item.unidad} | usado ${usado}\n`;
      });
    });
  }

  // Agregar faltantes del día al resumen resumido
  mensaje += "\nFALTANTES DEL DÍA:\n";
  if (faltantes.length === 0) {
    mensaje += "- No hay faltantes registrados\n";
  } else {
    faltantes.forEach(f => {
      const descripcion = f.descripcion || f; // Compatibilidad con datos antiguos
      mensaje += `  • ${descripcion}\n`;
    });
  }

  mensaje += "\n" + "-".repeat(40) + "\n";
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

async function eliminarDiaHistorial() {
  const selectorFecha = document.getElementById("selectorFecha");
  const fechaSeleccionada = selectorFecha.value;
  
  if (!fechaSeleccionada) {
    alert("Por favor selecciona una fecha para eliminar");
    return;
  }
  
  if (!confirm(`¿Estás seguro de que quieres eliminar el día ${fechaSeleccionada} del historial? Esta acción no se puede deshacer.`)) {
    return;
  }
  
  try {
    const registro = historial.find(h => h.fecha === fechaSeleccionada);
    if (registro && registro.id) {
      await deleteDoc(doc(window.db, "historial", registro.id));
      historial = historial.filter(h => h.fecha !== fechaSeleccionada);
      
      // Actualizar el selector
      const option = selectorFecha.querySelector(`option[value="${fechaSeleccionada}"]`);
      if (option) {
        option.remove();
      }
      
      // Limpiar contenido
      document.getElementById("contenidoHistorial").innerHTML = '<p class="text-gray-500 text-center py-8">Selecciona una fecha para ver el historial</p>';
      selectorFecha.value = "";
      
      alert(`✅ Día ${fechaSeleccionada} eliminado del historial`);
    } else {
      alert("No se encontró el registro para eliminar");
    }
  } catch (error) {
    console.error("Error eliminando día del historial:", error);
    alert("Error al eliminar el día del historial. Intenta nuevamente.");
  }
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

  // FALTANTES
  html += `<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
    <h4 class="font-bold text-red-800 mb-2">⚠️ Faltantes</h4>`;
  
  if (registro.faltantes && registro.faltantes.length === 0) {
    html += '<p class="text-gray-600">No hay faltantes registrados</p>';
  } else if (registro.faltantes) {
    registro.faltantes.forEach(f => {
      const descripcion = f.descripcion || f; // Compatibilidad con datos antiguos
      html += `<div class="text-sm">• ${descripcion}</div>`;
    });
  } else {
    html += '<p class="text-gray-600">No hay faltantes registrados</p>';
  }
  html += '</div>';

  // PENDIENTES
  html += `<div class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
    <h4 class="font-bold text-purple-800 mb-2">📝 Pendientes</h4>`;
  
  if (registro.pendientes.length === 0) {
    html += '<p class="text-gray-600">No hay pendientes registrados</p>';
  } else {
    registro.pendientes.forEach(p => {
      const descripcion = p.descripcion || p; // Compatibilidad con datos antiguos
      html += `<div class="text-sm">• ${descripcion}</div>`;
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

  // OBSERVACIONES DIARIAS (si existen)
  if (registro.observacionesDiarias) {
    html += `<div class=\"bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4\">\n` +
            `<h4 class=\"font-bold text-yellow-800 mb-2\">🗒️ Observaciones Diarias</h4>` +
            `<div class=\"text-sm whitespace-pre-wrap\">${registro.observacionesDiarias}</div>` +
            `</div>`;
  }

  contenidoHistorial.innerHTML = html;
}

// === RESUMEN FINAL ===
const btnResumenCompleto = document.getElementById("btnResumenCompleto");
const btnResumenResumido = document.getElementById("btnResumenResumido");
const btnCopiar = document.getElementById("btnCopiar");
const resumenFinal = document.getElementById("resumenFinal");
// Historial de tareas UI
const btnVerHistorialTareas = document.getElementById('btnVerHistorialTareas');
const modalHistorialTareas = document.getElementById('modalHistorialTareas');
const cerrarModalTareas = document.getElementById('cerrarModalTareas');
const selectorFechaTareas = document.getElementById('selectorFechaTareas');
const buscadorTareasHistorial = document.getElementById('buscadorTareasHistorial');
const contenidoHistorialTareas = document.getElementById('contenidoHistorialTareas');

btnResumenCompleto.addEventListener("click", () => {
  const mensaje = generarResumenTexto();
  resumenFinal.value = mensaje;
});

btnResumenResumido.addEventListener("click", () => {
  const mensaje = generarResumenResumido();
  resumenFinal.value = mensaje;
});

btnCopiar.addEventListener("click", () => {
  resumenFinal.select();
  document.execCommand("copy");
  mostrarAviso("¡Resumen copiado al portapapeles!");
});

// === HISTORIAL DE TAREAS ===
if (btnVerHistorialTareas) {
  btnVerHistorialTareas.addEventListener('click', abrirModalHistorialTareas);
}
if (cerrarModalTareas) {
  cerrarModalTareas.addEventListener('click', cerrarModalHistorialTareas);
}
if (modalHistorialTareas) {
  modalHistorialTareas.addEventListener('click', (e) => {
    if (e.target === modalHistorialTareas) cerrarModalHistorialTareas();
  });
}
if (selectorFechaTareas) {
  selectorFechaTareas.addEventListener('change', () => {
    const fecha = selectorFechaTareas.value;
    if (fecha) {
      renderHistorialTareasFecha(fecha, buscadorTareasHistorial ? buscadorTareasHistorial.value : '');
    } else {
      contenidoHistorialTareas.innerHTML = '<p class="text-gray-500 text-center py-8">Selecciona una fecha para ver tareas</p>';
    }
  });
}
if (buscadorTareasHistorial) {
  buscadorTareasHistorial.addEventListener('input', () => {
    const fecha = selectorFechaTareas ? selectorFechaTareas.value : '';
    if (fecha) {
      renderHistorialTareasFecha(fecha, buscadorTareasHistorial.value);
    }
  });
}

// === EVENT LISTENERS PARA HISTORIAL Y FINALIZACIÓN ===
const btnConsultarHistorial = document.getElementById("btnConsultarHistorial");
const btnFinalizarDia = document.getElementById("btnFinalizarDia");
const btnEliminarDia = document.getElementById("btnEliminarDia");
const modalHistorial = document.getElementById("modalHistorial");
const cerrarModal = document.getElementById("cerrarModal");
const selectorFecha = document.getElementById("selectorFecha");

btnConsultarHistorial.addEventListener("click", abrirModalHistorial);
btnFinalizarDia.addEventListener("click", finalizarDia);
btnEliminarDia.addEventListener("click", eliminarDiaHistorial);

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

// === EVENT LISTENERS ADICIONALES ===
document.addEventListener('DOMContentLoaded', () => {
  // Botón para limpiar catálogo
  const btnLimpiarCatalogo = document.getElementById('btnLimpiarCatalogo');
  if (btnLimpiarCatalogo) {
    btnLimpiarCatalogo.addEventListener('click', async () => {
      if (confirm('¿Estás seguro de que quieres eliminar TODOS los productos del catálogo? Esta acción no se puede deshacer.')) {
        await limpiarTodosLosProductos();
        stock = [];
        renderListaProductos();
        alert('✅ Catálogo limpiado completamente');
      }
    });
  }
  
  // Buscador de productos
  const buscadorProductos = document.getElementById('buscadorProductos');
  if (buscadorProductos) {
    buscadorProductos.addEventListener('input', () => {
      renderListaProductos();
    });
  }
  

  // Observaciones privadas
  const btnObservacionesPrivadas = document.getElementById('btnObservacionesPrivadas');
  const modalObservacionesPrivadas = document.getElementById('modalObservacionesPrivadas');
  const cerrarModalObservacionesPrivadasBtn = document.getElementById('cerrarModalObservacionesPrivadas');
  const btnCerrarObservacionesPrivadas = document.getElementById('btnCerrarObservacionesPrivadas');
  if (btnObservacionesPrivadas && modalObservacionesPrivadas) {
    btnObservacionesPrivadas.addEventListener('click', abrirModalObservacionesPrivadas);
    cerrarModalObservacionesPrivadasBtn.addEventListener('click', cerrarModalObservacionesPrivadas);
    btnCerrarObservacionesPrivadas.addEventListener('click', cerrarModalObservacionesPrivadas);
    modalObservacionesPrivadas.addEventListener('click', (e) => { if (e.target === modalObservacionesPrivadas) cerrarModalObservacionesPrivadas(); });
  }


  // Botón Subir (scroll-to-top)
  const btnScrollTop = document.getElementById('btnScrollTop');
  if (btnScrollTop) {
    const toggleBtn = () => {
      if (window.scrollY > 200) {
        btnScrollTop.classList.remove('hidden');
      } else {
        btnScrollTop.classList.add('hidden');
      }
    };
    window.addEventListener('scroll', toggleBtn, { passive: true });
    btnScrollTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    toggleBtn();
  }

  // Modal general de avisos
  const modalAviso = document.getElementById('modalAviso');
  const contenidoModalAviso = document.getElementById('contenidoModalAviso');
  const btnAceptarAviso = document.getElementById('btnAceptarAviso');
  const cerrarModalAvisoBtn = document.getElementById('cerrarModalAviso');

  function ocultarAviso() {
    if (modalAviso) modalAviso.classList.add('hidden');
  }

  window.mostrarAviso = function(mensaje) {
    if (!modalAviso || !contenidoModalAviso) {
      // Fallback si no existe el modal
      window.alert(mensaje);
      return;
    }
    contenidoModalAviso.textContent = mensaje || '';
    modalAviso.classList.remove('hidden');
  };

  if (btnAceptarAviso) btnAceptarAviso.addEventListener('click', ocultarAviso);
  if (cerrarModalAvisoBtn) cerrarModalAvisoBtn.addEventListener('click', ocultarAviso);
  if (modalAviso) {
    modalAviso.addEventListener('click', (e) => {
      if (e.target === modalAviso) ocultarAviso();
    });
  }

  // Redirigir window.alert al modal de avisos
  const originalAlert = window.alert.bind(window);
  window.alert = function(msg) {
    try { window.mostrarAviso(msg); } catch { originalAlert(msg); }
  };
});

// === OBSERVACIONES PRIVADAS ===
function inicializarObservacionesPrivadasUI() {
  if (obsUIIniciada) return;
  const btnAgregarEmpleado = document.getElementById('btnAgregarEmpleado');
  if (btnAgregarEmpleado) {
    btnAgregarEmpleado.addEventListener('click', async () => {
      const nombre = prompt('Nombre del empleado nuevo:');
      if (!nombre) return;
      const limpio = nombre.trim();
      if (!limpio) return;
      // Evitar duplicados por nombre exacto (case-insensitive)
      const existe = empleados.some(e => (e.nombre||'').toLowerCase() === limpio.toLowerCase());
      if (existe) {
        const estado = document.getElementById('estadoObservacionesPrivadas');
        if (estado) estado.textContent = 'Ya existe un empleado con ese nombre';
        return;
      }
      await agregarEmpleado(limpio);
      renderEmpleadosLista();
      renderEmpleadoDetalle(selectedEmpleadoIndex);
      const estado = document.getElementById('estadoObservacionesPrivadas');
      if (estado) estado.textContent = 'Empleado agregado ✓';
    });
  }
  obsUIIniciada = true;
}

function abrirModalObservacionesPrivadas() {
  const modal = document.getElementById('modalObservacionesPrivadas');
  if (modal) {
    renderEmpleadosLista();
    renderEmpleadoDetalle(selectedEmpleadoIndex);
    modal.classList.remove('hidden');
  }
}

function cerrarModalObservacionesPrivadas() {
  const modal = document.getElementById('modalObservacionesPrivadas');
  if (modal) modal.classList.add('hidden');
}

async function cargarObservacionesPrivadas() {
  try {
    const docRef = doc(window.db, 'observaciones_privadas', 'global');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      observacionesPrivadas = data.texto || '';
    } else {
      observacionesPrivadas = '';
    }
  } catch (e) {
    console.error('Error cargando observaciones privadas:', e);
    observacionesPrivadas = localStorage.getItem('observaciones_privadas') || '';
  }
}

async function guardarObservacionesPrivadas() {
  try {
    const docRef = doc(window.db, 'observaciones_privadas', 'global');
    await setDoc(docRef, { texto: observacionesPrivadas, timestamp: new Date().toISOString() });
    localStorage.setItem('observaciones_privadas', observacionesPrivadas || '');
  } catch (e) {
    console.error('Error guardando observaciones privadas:', e);
    localStorage.setItem('observaciones_privadas', observacionesPrivadas || '');
    // No relanzar para no romper la UI
  }
}

// === EMPLEADOS/OBSERVACIONES ===
let selectedEmpleadoIndex = 0;

function renderEmpleadosLista() {
  const lista = document.getElementById('empleadosLista');
  if (!lista) return;
  if (!empleados || empleados.length === 0) {
    lista.innerHTML = '<div class="p-3 text-gray-500">Sin empleados</div>';
    return;
  }
  lista.innerHTML = empleados.map((emp, i) => {
    const activo = i === selectedEmpleadoIndex;
    return `
      <button class="w-full text-left px-3 py-2 ${activo ? 'bg-yellow-200' : 'hover:bg-yellow-100'} flex items-center gap-2 border-b border-yellow-100" onclick="seleccionarEmpleado(${i})">
        <span class="w-7 h-7 rounded-full bg-yellow-300 flex items-center justify-center text-yellow-900 text-sm font-bold">${(emp.nombre||'?').charAt(0).toUpperCase()}</span>
        <span class="truncate">${emp.nombre||''}</span>
      </button>
    `;
  }).join('');
}

function renderEmpleadoDetalle(i) {
  const det = document.getElementById('empleadoDetalle');
  if (!det) return;
  if (!empleados || empleados.length === 0) {
    det.innerHTML = '<div class="text-gray-500">Agrega un empleado para comenzar</div>';
    return;
  }
  if (i == null || i < 0 || i >= empleados.length) i = 0;
  selectedEmpleadoIndex = i;
  const emp = empleados[i];
  const nota = emp.nota || '';
  det.innerHTML = `
    <div class="space-y-3 w-full">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-800 font-bold">${(emp.nombre||'?').charAt(0).toUpperCase()}</div>
          <div>
            <div class="text-lg font-semibold text-gray-800">${emp.nombre||''}</div>
            <div class="text-xs text-gray-500">Sección de notas</div>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="bg-blue-600 text-white px-3 py-1 rounded" onclick="guardarNotaEmpleado(${i})">Guardar</button>
          <button class="bg-red-600 text-white px-3 py-1 rounded" onclick="eliminarEmpleado(${i})">Eliminar</button>
        </div>
      </div>
      <textarea id="nota_emp_${i}" rows="8" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white resize-none" placeholder="Escribe aquí...">${nota.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
    </div>
  `;
  renderEmpleadosLista();
}

window.seleccionarEmpleado = function(i) {
  renderEmpleadoDetalle(i);
};

async function cargarEmpleados() {
  try {
    const docRef = doc(window.db, 'observaciones_privadas', 'empleados');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      empleados = Array.isArray(data.lista) ? data.lista : [];
    } else {
      // Inicial con tres empleados solicitados
      empleados = [
        { nombre: 'Camila', nota: '' },
        { nombre: 'Matias', nota: '' },
        { nombre: 'Denis', nota: '' }
      ];
      await guardarEmpleados();
    }
  } catch (e) {
    console.error('Error cargando empleados:', e);
    const raw = localStorage.getItem('empleados_observaciones');
    empleados = raw ? JSON.parse(raw) : [
      { nombre: 'Camila', nota: '' },
      { nombre: 'Matias', nota: '' },
      { nombre: 'Denis', nota: '' }
    ];
  }
}

async function guardarEmpleados() {
  try {
    const docRef = doc(window.db, 'observaciones_privadas', 'empleados');
    await setDoc(docRef, { lista: empleados, timestamp: new Date().toISOString() });
    localStorage.setItem('empleados_observaciones', JSON.stringify(empleados));
  } catch (e) {
    console.error('Error guardando empleados:', e);
    localStorage.setItem('empleados_observaciones', JSON.stringify(empleados));
  }
}


// Función para detectar faltantes automáticamente basados en límites individuales por producto
async function detectarFaltantesAutomaticos(conteoFinalCompleto = null) {
  try {
    const faltantesDetectados = [];
    const faltantesAEliminar = [];
    
    // Usar el conteo final completo si se proporciona, sino usar el global
    const conteoAUsar = conteoFinalCompleto || conteoFinal;
    
    console.log(`🔍 Detectando faltantes en ${conteoAUsar.length} productos del conteo final`);
    
    // PASO 1: Verificar cada producto del conteo final contra su límite individual
    for (const item of conteoAUsar) {
      // Buscar el producto en el catálogo para obtener su límite
      const productoEnStock = stock.find(p => p.producto === item.producto);
      
      console.log(`🔍 Verificando ${item.producto}: cantidad=${item.cantidad}, límite=${productoEnStock?.limite || 'sin límite'}`);
      
      if (productoEnStock && productoEnStock.limite && productoEnStock.limite > 0) {
        const cantidadActual = Number(item.cantidad) || 0;
        const limiteProducto = Number(productoEnStock.limite);
        
        // Buscar si ya existe un faltante automático para este producto
        const faltanteExistente = faltantes.find(f => 
          f.producto === item.producto && 
          f.automatico === true && 
          f.descripcion.includes('Stock bajo')
        );
        
        if (cantidadActual < limiteProducto) {
          console.log(`⚠️ FALTANTE DETECTADO: ${item.producto} (${cantidadActual}/${limiteProducto})`);
          // Stock bajo: crear o mantener faltante
          if (!faltanteExistente) {
            const faltante = {
              descripcion: `⚠️ ${item.producto}: Stock bajo (${cantidadActual}/${limiteProducto} ${item.unidad})`,
              categoria: item.categoria,
              producto: item.producto,
              cantidadActual: cantidadActual,
              limite: limiteProducto,
              unidad: item.unidad,
              automatico: true,
              fecha: new Date().toLocaleDateString(),
              timestamp: new Date().toISOString()
            };
            faltantesDetectados.push(faltante);
            console.log(`✅ Faltante agregado: ${faltante.descripcion}`);
          } else {
            // Actualizar faltante existente si la cantidad cambió
            if (faltanteExistente.cantidadActual !== cantidadActual) {
              faltanteExistente.descripcion = `⚠️ ${item.producto}: Stock bajo (${cantidadActual}/${limiteProducto} ${item.unidad})`;
              faltanteExistente.cantidadActual = cantidadActual;
              // Actualizar en Firebase
              if (faltanteExistente.id) {
                await updateDoc(doc(window.db, "faltantes", faltanteExistente.id), {
                  descripcion: faltanteExistente.descripcion,
                  cantidadActual: cantidadActual,
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        } else {
          // Stock por encima del límite: eliminar faltante automático si existe
          if (faltanteExistente) {
            faltantesAEliminar.push(faltanteExistente);
          }
        }
      }
    }
    
    // PASO 1.5: Verificar faltantes automáticos que ya no tienen producto en conteo final
    // (productos que se agotaron completamente o se eliminaron del conteo)
    const productosEnConteoFinal = conteoAUsar.map(item => item.producto);
    const faltantesObsoletos = faltantes.filter(f => 
      f.automatico === true && 
      f.descripcion.includes('Stock bajo') &&
      !productosEnConteoFinal.includes(f.producto)
    );
    
    // Agregar faltantes obsoletos a la lista de eliminación
    faltantesAEliminar.push(...faltantesObsoletos);
    
    // PASO 2: Eliminar faltantes automáticos que ya no son necesarios
    for (const faltante of faltantesAEliminar) {
      try {
        if (faltante.id) {
          await deleteDoc(doc(window.db, "faltantes", faltante.id));
        }
        // Remover del array local
        const index = faltantes.findIndex(f => f.id === faltante.id);
        if (index > -1) {
          faltantes.splice(index, 1);
        }
        console.log(`✅ Faltante automático eliminado: ${faltante.producto} (stock recuperado)`);
      } catch (error) {
        console.error(`Error eliminando faltante automático para ${faltante.producto}:`, error);
      }
    }
    
    // PASO 3: Agregar nuevos faltantes detectados a Firebase y array local
    for (const faltante of faltantesDetectados) {
      const docRef = await addDoc(collection(window.db, "faltantes"), faltante);
      faltantes.push({ id: docRef.id, ...faltante });
    }
    
    // Actualizar la interfaz si hubo cambios
    if (faltantesDetectados.length > 0 || faltantesAEliminar.length > 0) {
      renderFaltantes();
      console.log(`✅ Procesados: ${faltantesDetectados.length} faltantes nuevos, ${faltantesAEliminar.length} eliminados`);
    }
    
    return {
      nuevos: faltantesDetectados,
      eliminados: faltantesAEliminar
    };
  } catch (error) {
    console.error("Error detectando faltantes automáticos:", error);
    return { nuevos: [], eliminados: [] };
  }
}


async function agregarEmpleado(nombre) {
  empleados.push({ nombre, nota: '' });
  await guardarEmpleados();
}

window.eliminarEmpleado = async function(i) {
  if (!confirm('¿Eliminar empleado?')) return;
  empleados.splice(i, 1);
  await guardarEmpleados();
  if (selectedEmpleadoIndex >= empleados.length) selectedEmpleadoIndex = Math.max(0, empleados.length - 1);
  renderEmpleadosLista();
  renderEmpleadoDetalle(selectedEmpleadoIndex);
};

window.guardarNotaEmpleado = async function(i) {
  const ta = document.getElementById(`nota_emp_${i}`);
  if (!ta) return;
  empleados[i].nota = ta.value;
  await guardarEmpleados();
  const estado = document.getElementById('estadoObservacionesPrivadas');
  if (estado) estado.textContent = 'Notas guardadas ✓';
};


// === VERIFICACIÓN DE AUTENTICACIÓN ===
function verificarAutenticacion() {
  const autenticado = localStorage.getItem("mqb_authenticated");
  const timestamp = localStorage.getItem("mqb_auth_timestamp");
  const userUid = localStorage.getItem("mqb_user_uid");
  
  if (autenticado !== "true" || !timestamp || !userUid) {
    window.location.href = "login.html";
    return false;
  }
  
  // Verificar si la sesión no ha expirado (24 horas)
  const tiempoTranscurrido = Date.now() - parseInt(timestamp);
  const veinticuatroHoras = 24 * 60 * 60 * 1000;
  
  if (tiempoTranscurrido >= veinticuatroHoras) {
    localStorage.removeItem("mqb_authenticated");
    localStorage.removeItem("mqb_auth_timestamp");
    localStorage.removeItem("mqb_user_uid");
    window.location.href = "login.html";
    return false;
  }
  
  return true;
}

// === FUNCIÓN PARA CERRAR SESIÓN ===
function cerrarSesion() {
  localStorage.removeItem("mqb_authenticated");
  localStorage.removeItem("mqb_auth_timestamp");
  localStorage.removeItem("mqb_user_uid");
  
  // Cerrar sesión de Firebase si está disponible
  if (window.auth) {
    window.auth.signOut();
  }
  
  // Redirigir al login
  window.location.href = "login.html";
}

// === INICIALIZACIÓN ===
// Verificar autenticación antes de continuar
if (!verificarAutenticacion()) {
  // Si no está autenticado, la redirección ya se hizo
  // No ejecutar el resto del código
} else {
  actualizarFechaActual();

  // Inicializar Firebase cuando el DOM esté listo
  document.addEventListener('DOMContentLoaded', async () => {
    await inicializarFirebase();
    inicializarObservacionesPrivadasUI();
    // Actualización en vivo de fecha y hora visual (no cambia diaActual)
    actualizarFechaActual();
    setInterval(actualizarFechaActual, 1000);
  });

  // Fallback para navegadores que no soportan DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await inicializarFirebase();
      inicializarObservacionesPrivadasUI();
      actualizarFechaActual();
      setInterval(actualizarFechaActual, 1000);
    });
  } else {
    // DOM ya está listo
    inicializarFirebase();
    inicializarObservacionesPrivadasUI();
    actualizarFechaActual();
    setInterval(actualizarFechaActual, 1000);
  }
}
