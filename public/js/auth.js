// Lógica de autenticación del frontend

// Verificar si hay sesión activa
async function checkSession() {
  try {
    const response = await fetch('/api/me');
    if (response.ok) {
      const data = await response.json();
      if (data.usuario) {
        return data.usuario;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

// === PÁGINA DE LOGIN ===
if (document.getElementById('loginForm')) {
  // Si ya tiene sesión → redirigir al dashboard
  checkSession().then(usuario => {
    if (usuario) {
      window.location.href = '/dashboard.html';
    }
  });

  // Manejar formulario de login
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('btnLogin');
    const errorDiv = document.getElementById('loginError');

    btn.disabled = true;
    btn.textContent = 'Iniciando sesión...';
    errorDiv.style.display = 'none';

    const nombre_usuario = document.getElementById('nombre_usuario').value.trim();
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_usuario, password })
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = '/dashboard.html';
      } else {
        errorDiv.textContent = data.error || 'Error al iniciar sesión.';
        errorDiv.style.display = 'block';
      }
    } catch (error) {
      errorDiv.textContent = 'Error de conexión con el servidor.';
      errorDiv.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Iniciar Sesión';
    }
  });
}

// === PÁGINAS PROTEGIDAS (dashboard, etc.) ===
if (!document.getElementById('loginForm')) {
  // Verificar sesión → si no hay, redirigir al login
  checkSession().then(usuario => {
    if (!usuario) {
      window.location.href = '/index.html';
      return;
    }

    // Mostrar datos del usuario en el header
    const nameEl = document.getElementById('headerUserName');
    const roleEl = document.getElementById('headerUserRole');
    if (nameEl) nameEl.textContent = usuario.nombre_usuario;
    if (roleEl) roleEl.textContent = typeof formatRol === 'function' ? formatRol(usuario.rol) : usuario.rol;
  });

  // Botón de logout
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) { /* ignorar error */ }
      window.location.href = '/index.html';
    });
  }

  // Toggle sidebar en móvil
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('sidebar-open');
    });
  }
}
