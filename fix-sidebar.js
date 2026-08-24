const fs = require('fs');
const files = ['configuracion.html', 'dashboard.html', 'estudiantes.html', 'inscripciones.html', 'personas.html', 'profesores.html'];
const newNav = `    <nav class="sidebar-nav">
      <a href="/dashboard.html" class="nav-item">
        <span class="nav-icon">📊</span>
        <span class="nav-text">Dashboard</span>
      </a>
      <a href="/personas.html" class="nav-item">
        <span class="nav-icon">👥</span>
        <span class="nav-text">Personas</span>
      </a>
      <a href="/estudiantes.html" class="nav-item">
        <span class="nav-icon">🎓</span>
        <span class="nav-text">Estudiantes</span>
      </a>
      <a href="/inscripciones.html" class="nav-item">
        <span class="nav-icon">📝</span>
        <span class="nav-text">Inscripciones</span>
      </a>
      <a href="/profesores.html" class="nav-item">
        <span class="nav-icon">👨‍🏫</span>
        <span class="nav-text">Profesores</span>
      </a>
      <a href="/reportes.html" class="nav-item disabled">
        <span class="nav-icon">📄</span>
        <span class="nav-text">Reportes y PDFs</span>
      </a>
      <a href="/configuracion.html" class="nav-item">
        <span class="nav-icon">⚙️</span>
        <span class="nav-text">Configuración</span>
      </a>
    </nav>`;

for (const file of files) {
  const path = 'public/' + file;
  let text = fs.readFileSync(path, 'utf8');
  
  // Replace the entire <nav class="sidebar-nav">...</nav> block
  text = text.replace(/<nav class="sidebar-nav">[\s\S]*?<\/nav>/, newNav);
  
  // Replace any corrupted characters back to normal
  // Sometimes ? appears instead of efbfbd depending on what broke it
  text = text.replace(/Gestin/g, 'Gestión');
  text = text.replace(/Jures/g, 'Juáres');
  text = text.replace(/Configuracin/g, 'Configuración');
  text = text.replace(/Sesin/g, 'Sesión');
  
  text = text.replace(/Gesti\ufffdn/g, 'Gestión');
  text = text.replace(/Ju\ufffdres/g, 'Juáres');
  text = text.replace(/Configuraci\ufffdn/g, 'Configuración');
  text = text.replace(/Sesi\ufffdn/g, 'Sesión');
  
  fs.writeFileSync(path, text, 'utf8');
}

// Fix index.html specifically
let indexText = fs.readFileSync('public/index.html', 'utf8');
indexText = indexText.replace(/Gestin/g, 'Gestión');
indexText = indexText.replace(/Sesin/g, 'Sesión');
indexText = indexText.replace(/Matrcula/g, 'Matrícula');
indexText = indexText.replace(/Gesti\ufffdn/g, 'Gestión');
indexText = indexText.replace(/Sesi\ufffdn/g, 'Sesión');
indexText = indexText.replace(/Matr\ufffdcula/g, 'Matrícula');
fs.writeFileSync('public/index.html', indexText, 'utf8');

console.log('Restored sidebars and accents.');
