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
let diaActual = new Date().toLocaleDateString();
// Observaciones privadas (persisten y no están ligadas al día)
let observacionesPrivadas = "";

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
    
    // Cargar observaciones privadas persistentes
    await cargarObservacionesPrivadas();
    
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
    
    html += `
      <div class="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center">
        <div class="flex-1">
          <span class="font-medium text-gray-800">${producto.producto}</span>
          <span class="text-sm text-gray-500 ml-2">(${producto.categoria} - ${producto.unidad})</span>
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
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
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
    
    if (categoriaSelect && productoInput && unidadSelect) {
      categoriaSelect.value = producto.categoria;
      productoInput.value = producto.producto;
      unidadSelect.value = producto.unidad;
      console.log("Formulario llenado con datos:", { categoria: producto.categoria, producto: producto.producto, unidad: producto.unidad });
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
    
    console.log("Datos a actualizar:", { nuevaCategoria, nuevoProducto, nuevaUnidad });
    
    if (!nuevaCategoria || !nuevoProducto || !nuevaUnidad) {
      alert("Por favor completa todos los campos");
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
// Nuevas funciones expuestas
window.limpiarPendientesYFaltantesYVolver = limpiarPendientesYFaltantesYVolver;
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
    renderConteoFinal();
    mostrarProductosFinal();
  } catch (error) {
    console.error("Error eliminando conteo final:", error);
    alert("Error al eliminar el conteo. Intenta nuevamente.");
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
    const estiloCompletado = completado ? "line-through text-gray-500 bg-gray-100" : "";
    
    listaFaltantes.innerHTML += `
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-3">
        <div class="flex justify-between items-center">
          <div class="flex items-center">
            <span class="text-red-600 mr-2">⚠️</span>
            <div class="${estiloCompletado}">${descripcion}</div>
          </div>
          <button onclick="marcarFaltanteCompletado(${i})" class="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
            ${completado ? '↩️' : '✔️'}
          </button>
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

  try {
    // Crear registro del día
    const registroDia = {
      fecha: diaActual,
      timestamp: new Date().toISOString(),
      conteoInicial: [...conteoInicial],
      conteoFinal: [...conteoFinal],
      faltantes: [...faltantes],
      pendientes: [...pendientes],
      tareas: [...tareas],
      resumen: generarResumenTexto()
    };

    // No incluir observaciones privadas en el historial del día

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

    // Limpiar datos actuales de Firebase
    await limpiarDatosDelDia();

    // Actualizar vistas
    renderConteoInicial();
    renderConteoFinal();
    renderPendientes();
    renderTareas();
    mostrarProductosCategoria();
    mostrarProductosFinal();

    alert(`✅ Día ${diaActual} finalizado y guardado en el historial. Los datos han sido limpiados para el nuevo día.`);
  } catch (error) {
    console.error("Error finalizando día:", error);
    alert("Error al finalizar el día. Intenta nuevamente.");
  }
}

async function limpiarDatosDelDia() {
  try {
    // Eliminar conteos iniciales
    for (const item of conteoInicial) {
      if (item.id) {
        await deleteDoc(doc(window.db, "conteoInicial", item.id));
      }
    }
    
    // Eliminar conteos finales
    for (const item of conteoFinal) {
      if (item.id) {
        await deleteDoc(doc(window.db, "conteoFinal", item.id));
      }
    }
    
    // Eliminar faltantes
    for (const item of faltantes) {
      if (item.id) {
        await deleteDoc(doc(window.db, "faltantes", item.id));
      }
    }
    
    // Eliminar pendientes
    for (const item of pendientes) {
      if (item.id) {
        await deleteDoc(doc(window.db, "pendientes", item.id));
      }
    }
    
    // Eliminar tareas
    for (const item of tareas) {
      if (item.id) {
        await deleteDoc(doc(window.db, "tareas", item.id));
      }
    }
    
    // Limpiar arrays locales
    conteoInicial = [];
    conteoFinal = [];
    faltantes = [];
    pendientes = [];
    tareas = [];
  } catch (error) {
    console.error("Error limpiando datos del día:", error);
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
  let mensaje = `📊 RESUMEN RESUMIDO DEL DÍA - ${fecha}\n`;
  mensaje += "=".repeat(50) + "\n\n";

  // Categorías requeridas en el resumen resumido
  const categoriasResumidas = ["Preparados", "Verduras", "Quesos", "Paquetes", "General"];

  // STOCK INICIAL (solo categorías resumidas)
  mensaje += "🌅 STOCK INICIAL:\n";
  if (conteoInicial.length === 0) {
    mensaje += "- Sin conteo inicial\n";
  } else {
    categoriasResumidas.forEach(cat => {
      let items = conteoInicial.filter(c => c.categoria === cat);
      if (items.length > 0) {
        mensaje += `\n${cat}:\n`;
        items.forEach(item => {
          mensaje += `  • ${item.producto}: ${item.cantidad} ${item.unidad}\n`;
        });
      }
    });
  }

  // STOCK FINAL (solo categorías resumidas) con observaciones
  mensaje += "\n🌙 STOCK FINAL:\n";
  if (conteoFinal.length === 0) {
    mensaje += "- Sin conteo final\n";
  } else {
    categoriasResumidas.forEach(cat => {
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
  mensaje += "\n⚠️ FALTANTES:\n";
  if (faltantes.length === 0) {
    mensaje += "- Sin faltantes\n";
  } else {
    faltantes.forEach(f => {
      const descripcion = f.descripcion || f;
      mensaje += `  • ${descripcion}\n`;
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
  
  // Botón eliminar pendientes/faltantes y volver
  const btnEliminarPendFaltYVolver = document.getElementById('btnEliminarPendFaltYVolver');
  if (btnEliminarPendFaltYVolver) {
    btnEliminarPendFaltYVolver.addEventListener('click', async () => {
      await limpiarPendientesYFaltantesYVolver();
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
  const textarea = document.getElementById('observacionesPrivadas');
  const estado = document.getElementById('estadoObservacionesPrivadas');
  const btnGuardar = document.getElementById('btnGuardarObservacionesPrivadas');
  const btnLimpiar = document.getElementById('btnLimpiarObservacionesPrivadas');
  if (!textarea || !btnGuardar || !btnLimpiar) return;

  // Cargar valor actual
  textarea.value = observacionesPrivadas || '';

  btnGuardar.addEventListener('click', async () => {
    if (estado) estado.textContent = 'Guardando...';
    try {
      observacionesPrivadas = textarea.value;
      await guardarObservacionesPrivadas();
      if (estado) estado.textContent = 'Observaciones guardadas ✓';
    } catch {
      if (estado) estado.textContent = 'Error al guardar';
    }
  });

  btnLimpiar.addEventListener('click', async () => {
    if (!confirm('¿Seguro que deseas limpiar las observaciones privadas?')) return;
    observacionesPrivadas = '';
    textarea.value = '';
    await guardarObservacionesPrivadas();
    if (estado) estado.textContent = 'Observaciones limpiadas';
  });
}

function abrirModalObservacionesPrivadas() {
  const modal = document.getElementById('modalObservacionesPrivadas');
  const textarea = document.getElementById('observacionesPrivadas');
  const estado = document.getElementById('estadoObservacionesPrivadas');
  if (modal) {
    if (textarea) textarea.value = observacionesPrivadas || '';
    if (estado) estado.textContent = '';
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

async function limpiarPendientesYFaltantesYVolver() {
  try {
    if (!confirm('¿Eliminar todos los pendientes y faltantes y volver a la página anterior?')) return;
    // Borrar faltantes
    for (const item of faltantes) {
      if (item.id) {
        await deleteDoc(doc(window.db, 'faltantes', item.id));
      }
    }
    // Borrar pendientes
    for (const item of pendientes) {
      if (item.id) {
        await deleteDoc(doc(window.db, 'pendientes', item.id));
      }
    }
    faltantes = [];
    pendientes = [];
    renderFaltantes();
    renderPendientes();
    history.back();
  } catch (e) {
    console.error('Error limpiando pendientes/faltantes:', e);
    alert('Error al limpiar pendientes/faltantes. Intenta nuevamente.');
  }
}

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
