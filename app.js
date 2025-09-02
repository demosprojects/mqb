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
let pendientes = [];
let tareas = [];
let historial = [];
let diaActual = new Date().toLocaleDateString();

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
      // Limpiar todos los productos existentes para empezar desde cero
      console.log("Limpiando productos existentes para empezar desde cero...");
      await limpiarTodosLosProductos();
      stock = [];
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
    
    console.log("Datos cargados desde Firebase:", { stock, conteoInicial, conteoFinal, pendientes, tareas, historial });
    
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
  pendientes = JSON.parse(localStorage.getItem("pendientes")) || [];
  tareas = JSON.parse(localStorage.getItem("tareas")) || [];
  historial = JSON.parse(localStorage.getItem("historial")) || [];
  actualizarInterfaz();
}

function actualizarInterfaz() {
  renderConteoInicial();
  renderConteoFinal();
  renderPendientes();
  renderTareas();
  renderListaProductos();
}

// === FUNCIÓN PARA RENDERIZAR LISTA DE PRODUCTOS ===
function renderListaProductos() {
  const listaProductos = document.getElementById("listaProductos");
  if (!listaProductos) return;
  
  if (stock.length === 0) {
    listaProductos.innerHTML = '<p class="text-gray-500 text-sm">No hay productos en el catálogo</p>';
    return;
  }
  
  let html = "";
  stock.forEach((producto, i) => {
    html += `
      <div class="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center">
        <div class="flex-1">
          <span class="font-medium text-gray-800">${producto.producto}</span>
          <span class="text-sm text-gray-500 ml-2">(${producto.categoria} - ${producto.unidad})</span>
        </div>
        <div class="flex gap-2">
          <button onclick="editarProducto(${i})" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">✏️</button>
          <button onclick="eliminarProducto(${i})" class="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">🗑️</button>
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
  const producto = stock[index];
  
  // Crear modal de edición
  const modal = document.createElement('div');
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
  
  // Llenar formulario con datos actuales
  document.getElementById('editCategoria').value = producto.categoria;
  document.getElementById('editProducto').value = producto.producto;
  document.getElementById('editUnidad').value = producto.unidad;
  
  document.body.appendChild(modal);
  
  // Manejar envío del formulario
  document.getElementById('formEditarProducto').addEventListener('submit', async (e) => {
    e.preventDefault();
    await actualizarProducto(index, modal);
  });
}

async function actualizarProducto(index, modal) {
  try {
    const producto = stock[index];
    const nuevaCategoria = document.getElementById('editCategoria').value;
    const nuevoProducto = document.getElementById('editProducto').value;
    const nuevaUnidad = document.getElementById('editUnidad').value;
    
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
    
    if (producto.id) {
      await updateDoc(doc(window.db, "stock", producto.id), datosActualizados);
    }
    
    stock[index] = { id: producto.id, ...datosActualizados };
    renderListaProductos();
    cerrarModalEdicion();
    alert(`✅ Producto "${nuevoProducto}" actualizado correctamente`);
  } catch (error) {
    console.error("Error actualizando producto:", error);
    alert("Error al actualizar el producto. Intenta nuevamente.");
  }
}

function cerrarModalEdicion() {
  const modal = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
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
window.eliminarPendiente = eliminarPendiente;
window.completarTarea = completarTarea;
window.eliminarTarea = eliminarTarea;
window.abrirModalHistorial = abrirModalHistorial;
window.cerrarModalHistorial = cerrarModalHistorial;
window.mostrarHistorialFecha = mostrarHistorialFecha;
window.finalizarDia = finalizarDia;

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

async function eliminarConteoInicial(i) {
  try {
    const item = conteoInicial[i];
    if (item.id) {
      await deleteDoc(doc(window.db, "conteoInicial", item.id));
    }
    conteoInicial.splice(i, 1);
    renderConteoInicial();
    mostrarProductosCategoria();
  } catch (error) {
    console.error("Error eliminando conteo inicial:", error);
    alert("Error al eliminar el conteo. Intenta nuevamente.");
  }
}

async function eliminarConteoFinal(i) {
  try {
    const item = conteoFinal[i];
    if (item.id) {
      await deleteDoc(doc(window.db, "conteoFinal", item.id));
    }
    conteoFinal.splice(i, 1);
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
    listaPendientes.innerHTML += `
      <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
        <div class="flex justify-between items-center">
          <div>${descripcion}</div>
          <button onclick="eliminarPendiente(${i})" class="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">✔️</button>
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

async function eliminarPendiente(i) {
  try {
    const item = pendientes[i];
    if (item.id) {
      await deleteDoc(doc(window.db, "pendientes", item.id));
    }
    pendientes.splice(i, 1);
    renderPendientes();
  } catch (error) {
    console.error("Error eliminando pendiente:", error);
    alert("Error al eliminar el pendiente. Intenta nuevamente.");
  }
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

function completarTarea(i) {
  alert("Tarea completada: " + tareas[i].tarea);
  eliminarTarea(i);
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
    fechaElement.textContent = diaActual;
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
    pendientes = [];
    tareas = [];
  } catch (error) {
    console.error("Error limpiando datos del día:", error);
  }
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
});

// === INICIALIZACIÓN ===
actualizarFechaActual();

// Inicializar Firebase cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  await inicializarFirebase();
});

// Fallback para navegadores que no soportan DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    await inicializarFirebase();
  });
} else {
  // DOM ya está listo
  inicializarFirebase();
}