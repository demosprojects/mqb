// === CONFIGURACIÓN DE AUTENTICACIÓN ===
// Las credenciales se manejan directamente desde Firebase Auth

// === ELEMENTOS DEL DOM ===
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const btnLogin = document.getElementById("btnLogin");
const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");

// === FUNCIONES DE UI ===
function mostrarCargando() {
  loadingMessage.classList.remove("hidden");
  errorMessage.classList.add("hidden");
  btnLogin.disabled = true;
  btnLogin.textContent = "⏳ Verificando...";
}

function ocultarCargando() {
  loadingMessage.classList.add("hidden");
  btnLogin.disabled = false;
  btnLogin.textContent = "🚀 Ingresar al Sistema";
}

function mostrarError(mensaje) {
  errorMessage.textContent = mensaje;
  errorMessage.classList.remove("hidden");
  loadingMessage.classList.add("hidden");
  btnLogin.disabled = false;
  btnLogin.textContent = "🚀 Ingresar al Sistema";
}

// === FUNCIÓN DE AUTENTICACIÓN ===
async function autenticarUsuario(email, password) {
  try {
    mostrarCargando();
    
    // Esperar a que Firebase Auth esté disponible
    let intentos = 0;
    while (!window.auth && intentos < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      intentos++;
    }

    if (!window.auth) {
      throw new Error("Firebase Auth no está disponible");
    }

    // Importar función de autenticación dinámicamente
    const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

    // Autenticar directamente con Firebase Auth
    const userCredential = await signInWithEmailAndPassword(window.auth, email, password);
    console.log("Usuario autenticado:", userCredential.user.uid);
    
    // Guardar estado de autenticación en localStorage
    localStorage.setItem("mqb_authenticated", "true");
    localStorage.setItem("mqb_auth_timestamp", Date.now().toString());
    localStorage.setItem("mqb_user_uid", userCredential.user.uid);
    localStorage.setItem("mqb_user_email", email);
    
    // Mostrar mensaje de éxito
    loadingMessage.innerHTML = `
      <div class="flex items-center">
        <span class="text-green-600 mr-2">✅</span>
        <span class="text-green-700 text-sm">Acceso autorizado. Redirigiendo...</span>
      </div>
    `;
    
    // Redirigir a la aplicación principal después de un breve delay
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
    
    return true;
  } catch (error) {
    console.error("Error en autenticación:", error);
    
    // Manejar errores específicos de Firebase
    let mensajeError = "Error de conexión. Verifica tu conexión a internet e intenta nuevamente.";
    
    if (error.code === 'auth/user-not-found') {
      mensajeError = "Usuario no encontrado. Verifica tu email.";
    } else if (error.code === 'auth/wrong-password') {
      mensajeError = "Contraseña incorrecta.";
    } else if (error.code === 'auth/invalid-email') {
      mensajeError = "Email inválido.";
    } else if (error.code === 'auth/too-many-requests') {
      mensajeError = "Demasiados intentos fallidos. Intenta más tarde.";
    } else if (error.code === 'auth/invalid-credential') {
      mensajeError = "Credenciales incorrectas. Verifica tu email y contraseña.";
    }
    
    mostrarError(mensajeError);
    return false;
  }
}

// === VERIFICAR AUTENTICACIÓN EXISTENTE ===
async function verificarAutenticacionExistente() {
  try {
    const autenticado = localStorage.getItem("mqb_authenticated");
    const timestamp = localStorage.getItem("mqb_auth_timestamp");
    const userUid = localStorage.getItem("mqb_user_uid");
    const userEmail = localStorage.getItem("mqb_user_email");
    
    if (autenticado === "true" && timestamp && userUid && userEmail) {
      // Verificar si la sesión no ha expirado (24 horas)
      const tiempoTranscurrido = Date.now() - parseInt(timestamp);
      const veinticuatroHoras = 24 * 60 * 60 * 1000;
      
      if (tiempoTranscurrido < veinticuatroHoras) {
        // Verificar que Firebase Auth esté activo
        let intentos = 0;
        while (!window.auth && intentos < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          intentos++;
        }
        
        if (window.auth) {
          // Verificar estado de autenticación de Firebase
          return new Promise((resolve) => {
            const { onAuthStateChanged } = import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js").then(({ onAuthStateChanged }) => {
              onAuthStateChanged(window.auth, (user) => {
                if (user && user.uid === userUid && user.email === userEmail) {
                  // Usuario autenticado correctamente, redirigir
                  console.log("Sesión válida encontrada, redirigiendo...");
                  window.location.href = "index.html";
                  resolve(true);
                } else {
                  // No autenticado o UID/email no coincide, limpiar localStorage
                  console.log("Sesión inválida, limpiando datos...");
                  localStorage.removeItem("mqb_authenticated");
                  localStorage.removeItem("mqb_auth_timestamp");
                  localStorage.removeItem("mqb_user_uid");
                  localStorage.removeItem("mqb_user_email");
                  resolve(false);
                }
              });
            });
          });
        }
      } else {
        // Sesión expirada, limpiar
        console.log("Sesión expirada, limpiando datos...");
        localStorage.removeItem("mqb_authenticated");
        localStorage.removeItem("mqb_auth_timestamp");
        localStorage.removeItem("mqb_user_uid");
        localStorage.removeItem("mqb_user_email");
      }
    }
    return false;
  } catch (error) {
    console.error("Error verificando autenticación:", error);
    return false;
  }
}

// === EVENT LISTENERS ===
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!email || !password) {
    mostrarError("Por favor, completa todos los campos.");
    return;
  }
  
  await autenticarUsuario(email, password);
});

// Limpiar mensajes de error al escribir
emailInput.addEventListener('input', () => {
  errorMessage.classList.add("hidden");
});

passwordInput.addEventListener('input', () => {
  errorMessage.classList.add("hidden");
});

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', async () => {
  // Verificar si ya hay una sesión activa
  await verificarAutenticacionExistente();
});

// === FUNCIONES GLOBALES PARA LA APLICACIÓN PRINCIPAL ===
window.cerrarSesion = function() {
  localStorage.removeItem("mqb_authenticated");
  localStorage.removeItem("mqb_auth_timestamp");
  localStorage.removeItem("mqb_user_uid");
  localStorage.removeItem("mqb_user_email");
  
  if (window.auth) {
    window.auth.signOut();
  }
  
  window.location.href = "login.html";
};

window.verificarSesion = function() {
  const autenticado = localStorage.getItem("mqb_authenticated");
  const timestamp = localStorage.getItem("mqb_auth_timestamp");
  const userUid = localStorage.getItem("mqb_user_uid");
  const userEmail = localStorage.getItem("mqb_user_email");
  
  if (autenticado !== "true" || !timestamp || !userUid || !userEmail) {
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
    localStorage.removeItem("mqb_user_email");
    window.location.href = "login.html";
    return false;
  }
  
  return true;
};