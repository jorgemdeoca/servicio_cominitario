// ==========================================
// SIDEBAR CENTRALIZADO — Gestión Escolar
// Un solo archivo para todos los menús
// ==========================================

(function () {
  'use strict';

  // Estructura del menú agrupado por jerarquía
  var menuGroups = [
    {
      items: [
        { label: 'Dashboard', href: '/dashboard.html', icon: 'home.svg' }
      ]
    },
    {
      title: 'GESTIÓN ACADÉMICA',
      items: [
        { label: 'Inscripciones', href: '/inscripciones.html', icon: 'clipboard-list.svg' },
        { label: 'Estudiantes', href: '/estudiantes.html', icon: 'graduation-cap.svg' },
        { label: 'Representantes', href: '/personas.html', icon: 'users.svg' },
        { label: 'Personal', href: '/profesores.html', icon: 'user-check.svg' }
      ]
    },
    {
      title: 'CONTROL DIARIO',
      items: [
        { label: 'Asistencia', href: '/asistencia.html', icon: 'calendar-check.svg' }
      ]
    },
    {
      title: 'CENTRO DE DOCUMENTOS',
      items: [
        { label: 'Emisión Oficial', href: '/reportes.html', icon: 'file-text.svg' }
      ]
    },
    {
      title: 'ADMINISTRACIÓN',
      superAdminOnly: true,
      items: [
        { label: 'Estructura Escolar', href: '/configuracion.html', hash: '#tab-anios', icon: 'layers.svg' },
        { label: 'Sistema y Seguridad', href: '/configuracion.html', hash: '#tab-usuarios', icon: 'shield.svg' }
      ]
    }
  ];

  /**
   * Detecta si un item del menú corresponde a la página actual.
   */
  function isActive(item) {
    var currentPath = window.location.pathname;
    // Para configuracion.html, distinguir por hash
    if (item.href === '/configuracion.html' && currentPath.endsWith('/configuracion.html')) {
      var currentHash = window.location.hash;
      if (item.hash) {
        // Activo si el hash coincide
        return currentHash === item.hash;
      }
      // Si no hay hash en la URL y este es el primer item de config, marcarlo activo
      if (!currentHash && item.hash === '#tab-anios') return true;
      return false;
    }
    return currentPath.endsWith(item.href);
  }

  /**
   * Genera el HTML completo del sidebar.
   */
  function buildSidebarHTML() {
    var html = '';

    // Header
    html += '<div class="sidebar-header">';
    html += '  <h2>Gestión Escolar</h2>';
    html += '  <p class="sidebar-school-name"></p>';
    html += '</div>';

    // Navegación
    html += '<nav class="sidebar-nav">';

    for (var g = 0; g < menuGroups.length; g++) {
      var group = menuGroups[g];

      // Contenedor del grupo
      var groupClass = 'nav-group';
      if (group.superAdminOnly) groupClass += ' nav-group-admin';

      html += '<div class="' + groupClass + '">';

      // Título del grupo (si tiene)
      if (group.title) {
        html += '<div class="nav-group-title">' + group.title + '</div>';
      }

      // Items del grupo
      for (var i = 0; i < group.items.length; i++) {
        var item = group.items[i];
        var activeClass = isActive(item) ? ' active' : '';
        var fullHref = item.hash ? item.href + item.hash : item.href;

        html += '<a href="' + fullHref + '" class="nav-item' + activeClass + '">';
        html += '  <span class="nav-icon"><img src="/icons/' + item.icon + '" alt="" class="nav-icon-img"></span>';
        html += '  <span class="nav-text">' + item.label + '</span>';
        html += '</a>';
      }

      html += '</div>';
    }

    html += '</nav>';

    // Footer
    html += '<div class="sidebar-footer">';
    html += '  <p>v1.0 — Servicio Comunitario UNEFA</p>';
    html += '</div>';

    return html;
  }

  /**
   * Renderiza el sidebar en el elemento #sidebar.
   */
  function renderSidebar() {
    var sidebarEl = document.getElementById('sidebar');
    if (!sidebarEl) return;
    sidebarEl.innerHTML = buildSidebarHTML();
  }

  /**
   * Controla la visibilidad del grupo ADMINISTRACIÓN según el rol.
   */
  function applySidebarRoles(rol) {
    if (rol === 'SUPER_ADMIN') {
      // Mostrar grupo de administración
      var adminGroups = document.querySelectorAll('.nav-group-admin');
      adminGroups.forEach(function (el) {
        el.style.display = 'block';
      });
    }
  }

  // Renderizar inmediatamente
  renderSidebar();

  // Exponer función para aplicar roles (llamada desde auth.js)
  window.applySidebarRoles = applySidebarRoles;
})();
