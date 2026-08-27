# Guía del Proyecto - Sistema de Gestión de Matrícula Escolar
## U.E.E. "General Aquilino Juares"
### Fecha: 24 de Agosto de 2026

---

# PARTE 1: INSTALACIÓN Y PUESTA EN MARCHA

## Requisitos Previos

Antes de empezar, la computadora debe tener instalado lo siguiente:

| Software | Versión Mínima | Para qué sirve |
|----------|---------------|----------------|
| **Node.js** | v18 o superior | Motor que ejecuta el servidor del sistema |
| **XAMPP** (o solo MySQL) | v8.0+ | Base de datos donde se almacena toda la información |
| **Git** (opcional) | Cualquiera | Para clonar el repositorio del proyecto |
| **Navegador Web** | Chrome/Edge moderno | Para usar la interfaz del sistema |

## Paso 1: Clonar o Copiar el Proyecto

**Opción A - Con Git (si tienes el repositorio):**
```bash
git clone https://github.com/TU_USUARIO/gestion-escolar.git
cd gestion-escolar
```

**Opción B - Sin Git:**
Copiar la carpeta `gestion-escolar` completa a la computadora.

## Paso 2: Instalar las Dependencias (librerías)

Abre una terminal (CMD o PowerShell) dentro de la carpeta del proyecto y ejecuta:

```bash
npm install
```

Esto descargará e instalará automáticamente todas las librerías que el proyecto necesita (Express, Prisma, bcrypt, etc.). Se creará una carpeta llamada `node_modules`.

## Paso 3: Crear la Base de Datos en MySQL

1. Abre **XAMPP** y enciende el servicio de **MySQL** (botón "Start").
2. Abre **phpMyAdmin** desde el navegador: `http://localhost/phpmyadmin`
3. Haz clic en **"Nueva"** (panel izquierdo) y crea una base de datos llamada:

```
gestion_escolar
```

Usa la codificación `utf8mb4_general_ci` y haz clic en **Crear**.

## Paso 4: Configurar el Archivo de Entorno (.env)

En la raíz del proyecto, crea un archivo llamado `.env` con este contenido:

```env
DATABASE_URL="mysql://root@localhost:3306/gestion_escolar"
SESSION_SECRET="gestion-escolar-aquilino-juares-2026"
PORT=3000
```

> **NOTA:** Si tu MySQL tiene contraseña, cambia `root` por `root:TU_CONTRASEÑA`. Ejemplo:
> `DATABASE_URL="mysql://root:1234@localhost:3306/gestion_escolar"`

## Paso 5: Crear las Tablas en la Base de Datos

Ejecuta el siguiente comando. Esto lee el archivo `prisma/schema.prisma` y crea automáticamente todas las tablas en MySQL:

```bash
npx prisma db push
```

Después, genera el cliente de Prisma:

```bash
npx prisma generate
```

## Paso 6: Cargar los Datos Iniciales (Seed)

Este comando inserta los datos base que el sistema necesita para funcionar: el primer año escolar, los grados (Preescolar A, Preescolar B, 1er a 6to Grado), el usuario administrador y la configuración de la escuela:

```bash
npx prisma db seed
```

**Credenciales del administrador por defecto:**
- Usuario: `admin`
- Contraseña: `admin123`

> Puedes cambiar la contraseña desde el sistema después de iniciar sesión.

## Paso 7: Iniciar el Servidor

```bash
npm run dev
```

Si todo está bien, verás en la consola:
```
  Servidor corriendo en:
  → Local:  http://localhost:3000
  → Red:    http://[IP-DEL-SERVIDOR]:3000
```

## Paso 8: Acceder al Sistema

Abre tu navegador y ve a:

```
http://localhost:3000
```

Inicia sesión con `admin` / `admin123` y listo, ya puedes usar el sistema.

---

# PARTE 2: HERRAMIENTAS Y LIBRERÍAS UTILIZADAS

## Lenguajes de Programación

| Lenguaje | Uso en el Proyecto |
|----------|-------------------|
| **JavaScript** | Lenguaje principal tanto para el servidor (backend) como para la interfaz (frontend) |
| **HTML5** | Estructura de las páginas del sistema |
| **CSS3** | Estilos visuales y diseño de la interfaz |
| **SQL** | Consultas a la base de datos (gestionado automáticamente por Prisma) |

## Tecnologías del Backend (Servidor)

| Herramienta | Versión | Descripción |
|-------------|---------|-------------|
| **Node.js** | v18+ | Entorno de ejecución de JavaScript fuera del navegador. Permite crear el servidor. |
| **Express.js** | v5.2 | Framework web para Node.js. Maneja las rutas, peticiones HTTP y respuestas del servidor. |
| **Prisma ORM** | v5.22 | Herramienta que conecta el código JavaScript con la base de datos MySQL sin necesidad de escribir SQL a mano. |
| **MySQL** | v8.0+ | Sistema de base de datos relacional donde se almacenan todos los datos. |
| **bcrypt** | v6.0 | Librería para encriptar contraseñas mediante "hashes" irreversibles. |
| **express-session** | v1.19 | Manejo de sesiones de usuario del lado del servidor. |
| **express-rate-limit** | v8.6 | Protección contra ataques de fuerza bruta en los endpoints de login. |
| **dotenv** | v17.4 | Carga las variables de entorno desde el archivo `.env`. |

## Tecnologías del Frontend (Interfaz de Usuario)

| Herramienta | Descripción |
|-------------|-------------|
| **HTML5 + CSS3 + Vanilla JS** | La interfaz está construida con tecnologías web estándar, sin frameworks como React o Vue, lo que la hace rápida y fácil de mantener. |
| **CSS Custom Properties** | Sistema de diseño propio con variables (`:root`) para mantener colores, fuentes y espaciados consistentes. |
| **jsPDF & jsPDF-AutoTable** | Librerías JavaScript importadas por CDN que generan los archivos PDF de matrículas y fichas directamente en el navegador. |
| **Fetch API** | API nativa del navegador para hacer peticiones asíncronas al servidor (GET, POST, PUT, DELETE). |

---

# PARTE 3: PROGRESO DEL PROYECTO POR FASES

A continuación, un desglose completo de lo que llevamos según nuestro Plan Maestro:

## FASE 1: Planificación y Diseño de la Base de Datos - COMPLETADA
- Se analizó la estructura de las planillas físicas de inscripción de Educación Inicial y Primaria.
- Se diseñó un esquema relacional con 10 tablas en Prisma: `usuarios`, `configuracion`, `grados`, `anios_escolares`, `secciones`, `personas`, `estudiantes`, `profesores`, `inscripciones` y `profesores_secciones`.
- Se implementó borrado lógico (campo `eliminado`) para evitar la pérdida accidental de datos.

## FASE 2: Backend - API REST - COMPLETADA
- Se configuró el servidor Express en el puerto 3000.
- Se crearon rutas modulares (endpoints) para realizar operaciones CRUD completas en cada tabla.
- El endpoint de Estudiantes crea o reutiliza automáticamente los registros de madre, padre y representante basándose en la búsqueda por cédula para evitar duplicados.

## FASE 3: Seguridad y Autenticación - COMPLETADA
- Se implementaron sesiones del lado del servidor.
- Contraseñas almacenadas de forma segura (bcrypt).
- Dos roles de acceso: `SUPER_ADMIN` (acceso a configuración) y `ADMIN` (acceso operativo).
- Middleware global de seguridad (`requireAuth`) en todas las rutas `/api/*`.

## FASE 4: Frontend - Interfaz de Usuario - COMPLETADA
- Se construyó el panel administrativo (Dashboard).
- Módulos desarrollados y funcionando al 100%:
  - **Estudiantes**: Tabla con búsqueda, modal con datos médicos y familiares.
  - **Profesores**: Perfiles completos con datos académicos, años de servicio y asignación de secciones.
  - **Inscripciones**: El núcleo del sistema. Un formulario que replica la planilla oficial.
  - **Personas**: Gestión directa de padres y representantes.
  - **Configuración**: Gestión dinámica del nombre de la escuela, años escolares, grados, secciones y carga del logo de la institución.
  - **Reportes**: Interfaz para generar los PDFs en tiempo real.

## FASE 5: Integración de Datos y Búsquedas Inteligentes - COMPLETADA
- Búsqueda en tiempo real (debounce) de padres por cédula al momento de inscribir estudiantes.
- Paginación dinámica en el frontend.
- Filtros encadenados: Al elegir un año escolar se actualizan las secciones, al elegir una sección se adapta el formulario (Inicial vs Primaria).

## FASE 6 y 7: Formulario Completo de Inscripciones - COMPLETADA
- El formulario de inscripciones consta de 7 partes dinámicas.
- Si el estudiante es de Inicial, se muestran los campos médicos avanzados y la evaluación de integración social (tierno, inquieto, pasivo).
- Si es Primaria, se ajusta automáticamente.
- Los datos variables por año (tallas de camisa/pantalón/zapatos, dirección, correo, teléfono) se guardan en el registro de inscripción (histórico).

## FASE 8: Reportes y PDFs Extendidos - COMPLETADA
- **Generación Exacta de Fichas**: El código genera la ficha de Inicial (con sección VI Médica) o la de Primaria respetando los formatos, líneas de firmas y listado de documentos consignados.
- **Matrícula Inicial**: Reporte tabular usando `jspdf-autotable`.
- **Logos Dinámicos**: En la configuración se añadió la posibilidad de subir el logo de la institución. Al subirlo, se guarda en `/public/img/logo_escuela.png` y se refleja automáticamente en las próximas planillas PDF.

## FASE 9: Configuración de Red Local y Despliegue - EN PAUSA
- **Planificado**: Conectar la PC Principal (servidor) a un Router Huawei mediante Ethernet, mientras la PC Principal recibe internet por WiFi (usando Internet Connection Sharing).
- **Pendiente**: Ejecutar la configuración física con el router Huawei para permitir el acceso desde computadoras secundarias. (Se dejó en pausa por no disponer del router en este momento).

---

# NOTAS ADICIONALES PARA EL EQUIPO

1. **El archivo `.env` NO se subió al repositorio de Git por seguridad.** Cada desarrollador o instalación nueva debe crear su propio `.env`.
2. **Los logos cargados dinámicamente** reemplazan archivos en la carpeta `public/img`. Esta característica fue añadida recientemente para facilitar la distribución del sistema en otras instituciones.
3. Para abrir la interfaz de base de datos visual en caso de necesitar auditar datos a mano, ejecuta: `npx prisma studio`.
