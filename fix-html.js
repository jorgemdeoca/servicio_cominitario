const fs = require('fs');
const files = ['index.html', 'configuracion.html', 'dashboard.html', 'estudiantes.html', 'inscripciones.html', 'personas.html', 'profesores.html'];
for (const file of files) {
  const path = 'public/' + file;
  let text = fs.readFileSync(path, 'utf8');
  text = text.replace(/^\uFEFF/, '');
  text = text.replace(/^\uFFFD/, '');
  
  text = text.replace(/Principal \uFFFD/g, 'Principal -');
  text = text.replace(/Sesi\uFFFDn \uFFFD/g, 'Sesión -');
  
  // Set the active class on the current file's nav item
  text = text.replace(/<a href="\/[a-z]+\.html" class="nav-item active">/g, function(match) {
    return match.replace(' active', '');
  });
  text = text.replace(new RegExp('<a href="/' + file + '" class="nav-item">'), '<a href="/' + file + '" class="nav-item active">');
  
  fs.writeFileSync(path, text, 'utf8');
}
console.log('Fixed BOM and active classes');
