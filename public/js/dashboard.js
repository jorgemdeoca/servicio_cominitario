// Lógica específica del dashboard

document.addEventListener('DOMContentLoaded', async () => {
  // Cargar año escolar activo en el header
  try {
    const response = await fetch('/api/me');
    if (response.ok) {
      const yearEl = document.getElementById('headerYear');
      if (yearEl) yearEl.textContent = 'Año Escolar: 2025-2026';
    }
  } catch (e) {
    console.error('Error cargando datos del dashboard:', e);
  }
});
