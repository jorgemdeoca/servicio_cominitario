# 📋 Guía Completa de Instalación — Sistema de Gestión Escolar

> **Versión:** 1.0  
> **Última actualización:** Septiembre 2026  
> **Sistema operativo requerido:** Windows 10 o superior

Esta guía explica paso a paso cómo instalar y configurar el Sistema de Gestión Escolar desde cero en cualquier PC con Windows.

---

## Tabla de Contenidos

1. [Requisitos del Sistema](#1-requisitos-del-sistema)
2. [Instalar Laragon (MySQL + phpMyAdmin)](#2-instalar-laragon)
3. [Instalar Node.js](#3-instalar-nodejs)
4. [Copiar el Proyecto](#4-copiar-el-proyecto)
5. [Configurar el archivo .env](#5-configurar-el-archivo-env)
6. [Crear la Base de Datos](#6-crear-la-base-de-datos)
7. [Instalar Dependencias y Generar Tablas](#7-instalar-dependencias-y-generar-tablas)
8. [Cargar Datos Iniciales (Seed)](#8-cargar-datos-iniciales-seed)
9. [Iniciar el Sistema por Primera Vez](#9-iniciar-el-sistema-por-primera-vez)
10. [Configurar el Firewall de Windows](#10-configurar-el-firewall-de-windows)
11. [Configurar la Red Local (Router)](#11-configurar-la-red-local-router)
12. [Uso Diario del Sistema](#12-uso-diario-del-sistema)
13. [Referencia Rápida de Comandos](#13-referencia-rápida-de-comandos)

---

## 1. Requisitos del Sistema

### Hardware mínimo

| Componente | Mínimo |
|---|---|
| Procesador | Dual Core 1.5 GHz o superior |
| Memoria RAM | 4 GB (recomendado 8 GB) |
| Espacio en disco | 2 GB libres |
| Puerto Ethernet | Recomendado (para conexión por cable al router) |
| WiFi | Opcional (la PC también puede conectarse por WiFi al router) |

### Software a instalar

| Software | ¿Para qué sirve? | Enlace de descarga |
|---|---|---|
| **Laragon** | Servidor de base de datos MySQL y phpMyAdmin | https://laragon.org/download/ |
| **Node.js** | Motor que ejecuta el sistema (servidor web) | https://nodejs.org |

### Otros elementos necesarios

| Elemento | Descripción |
|---|---|
| **Router WiFi** | Cualquier router doméstico (Xiaomi, TP-Link, Tenda, Huawei, etc.) |
| **Cable Ethernet** | Para conectar la PC al router (recomendado) |
| **Carpeta del proyecto** | La carpeta `gestion-escolar` con todo el código fuente |

---

## 2. Instalar Laragon

Laragon nos proporciona **MySQL** (la base de datos donde se guardan todos los estudiantes, inscripciones, etc.) y **phpMyAdmin** (una herramienta web para administrar la base de datos visualmente).

### Paso 2.1 — Descargar Laragon

1. Abrir el navegador y visitar: **https://laragon.org/download/**
2. Descargar la versión **"Laragon - Full"** (incluye MySQL, PHP y Apache)
3. Esperar a que se descargue el archivo `.exe`

### Paso 2.2 — Instalar Laragon

1. Ejecutar el archivo descargado (`laragon-wamp.exe` o similar)
2. En la pantalla de bienvenida, click en **"Next"**
3. **Carpeta de instalación:** Dejar la ruta por defecto (`C:\laragon`) o elegir otra. Click en **"Next"**
4. En las opciones de configuración:
   - ☑ Run Laragon when Windows starts → **Opcional** (si quieres que inicie automáticamente al encender la PC)
   - ☑ Auto start all services → **Opcional**
5. Click en **"Next"** → **"Install"**
6. Esperar a que termine la instalación
7. Click en **"Finish"**

### Paso 2.3 — Verificar que MySQL funciona

1. Abrir **Laragon** (buscar "Laragon" en el menú de Inicio de Windows)
2. En la ventana de Laragon, click en el botón **"Start All"**
3. Esperar unos segundos. Los indicadores de **Apache** y **MySQL** deben ponerse en **verde**
4. Click en el botón **"Database"** (o abrir el navegador e ir a `http://localhost/phpmyadmin`)
5. Si se abre phpMyAdmin, ✅ **MySQL está funcionando correctamente**

### Paso 2.4 — Datos importantes de Laragon

| Dato | Valor por defecto |
|---|---|
| **Usuario MySQL** | `root` |
| **Contraseña MySQL** | *(vacía, sin contraseña)* |
| **Puerto MySQL** | `3306` |
| **Host MySQL** | `localhost` |
| **phpMyAdmin** | `http://localhost/phpmyadmin` |

> **⚠️ IMPORTANTE:** Laragon instala MySQL con el usuario `root` **SIN contraseña** por defecto. Esto es correcto para un sistema de red local. NO necesitas crear contraseña de MySQL.

---

## 3. Instalar Node.js

Node.js es el motor que hace funcionar el sistema. El servidor web, las rutas de la API y toda la lógica del sistema corren sobre Node.js.

### Paso 3.1 — Descargar Node.js

1. Abrir el navegador y visitar: **https://nodejs.org**
2. Descargar la versión **LTS** (Long Term Support) — es el botón verde de la izquierda
3. Esperar a que se descargue el archivo `.msi`

### Paso 3.2 — Instalar Node.js

1. Ejecutar el archivo descargado (`node-v[version]-x64.msi`)
2. Click en **"Next"** en la pantalla de bienvenida
3. Aceptar la licencia → **"Next"**
4. **Carpeta de instalación:** Dejar la ruta por defecto → **"Next"**
5. **Componentes:** Dejar todo marcado por defecto → **"Next"**
6. Si aparece la opción **"Automatically install the necessary tools"**, marcarla ☑ → **"Next"**
7. Click en **"Install"**
8. Esperar a que termine → Click en **"Finish"**

### Paso 3.3 — Verificar la instalación

1. Abrir una terminal: **click derecho en el botón de Inicio → "Terminal"** (o buscar "PowerShell" en Inicio)
2. Ejecutar estos dos comandos:

```powershell
node --version
```
Debe mostrar algo como: `v20.x.x` o `v22.x.x`

```powershell
npm --version
```
Debe mostrar algo como: `10.x.x`

3. Si ambos muestran un número de versión, ✅ **Node.js está instalado correctamente**

> **💡 TIP:** Si el comando `node` no se reconoce, reiniciar la PC para que Windows cargue las rutas del sistema.

---

## 4. Copiar el Proyecto

### Paso 4.1 — Ubicar la carpeta del proyecto

El proyecto debe estar en una carpeta accesible. La ubicación recomendada es:

```
C:\Users\[TU_USUARIO]\Documents\proyecto comunitario\gestion-escolar
```

Reemplaza `[TU_USUARIO]` por tu nombre de usuario de Windows (ej: `jorge`, `maria`, `admin`, etc.).

### Paso 4.2 — Copiar los archivos

1. Copiar la carpeta `gestion-escolar` completa a la ubicación elegida
2. Verificar que contenga al menos estos archivos y carpetas:

```
gestion-escolar/
├── prisma/
│   ├── schema.prisma      ← Define la estructura de la base de datos
│   └── seed.js            ← Carga datos iniciales
├── public/                ← Archivos del frontend (HTML, CSS, JS)
├── routes/                ← Lógica del servidor (API)
├── middleware/            ← Autenticación
├── server.js              ← Archivo principal del servidor
├── package.json           ← Lista de dependencias
├── .env                   ← Configuración de conexión (lo crearemos)
└── ...
```

---

## 5. Configurar el Archivo .env

### ¿Qué es el archivo `.env`?

El archivo `.env` (de "environment" = entorno) es el archivo más importante de configuración. Contiene las **variables de entorno** que el sistema lee al iniciar. En particular, es el archivo que **conecta el sistema con la base de datos MySQL**.

Cuando el servidor arranca (`node server.js`), la primera línea del código hace esto:

```javascript
require('dotenv').config();  // Lee el archivo .env y carga las variables
```

Luego, el archivo `prisma/schema.prisma` usa la variable `DATABASE_URL` para saber dónde está MySQL:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")  // ← Lee el valor del archivo .env
}
```

### Paso 5.1 — Crear el archivo `.env`

1. Abrir la carpeta del proyecto con el Explorador de Archivos
2. Si **ya existe** un archivo llamado `.env`, ábrelo con el Bloc de Notas. Si **no existe**, crearlo:
   - Click derecho → Nuevo → Documento de texto
   - Nombrar el archivo `.env` (sin extensión `.txt`)
   - Si Windows no deja quitar la extensión: Ir a Ver → Extensiones de nombre de archivo → desmarcar

### Paso 5.2 — Escribir la configuración

Abrir el archivo `.env` con el Bloc de Notas y escribir exactamente estas 3 líneas:

```env
DATABASE_URL="mysql://root@localhost:3306/gestion_escolar"
SESSION_SECRET="gestion-escolar-aquilino-juares-2026"
PORT=3000
```

Guardar el archivo (Ctrl + S).

### Paso 5.3 — Entender cada variable

#### `DATABASE_URL` — Conexión con la Base de Datos

Esta es la variable más importante. Le dice al sistema **dónde está MySQL y qué base de datos usar**. Su formato es:

```
mysql://USUARIO:CONTRASEÑA@HOST:PUERTO/NOMBRE_BASE_DE_DATOS
```

Desglose de cada parte:

| Parte | Valor | Significado |
|---|---|---|
| `mysql://` | Protocolo | Indica que es una base de datos MySQL |
| `root` | Usuario | El usuario de MySQL (Laragon usa `root` por defecto) |
| *(sin contraseña)* | Contraseña | Laragon no pone contraseña al usuario root. Si tuviera contraseña sería `root:mipassword@...` |
| `localhost` | Host | La base de datos está en la misma PC (local) |
| `3306` | Puerto | Puerto estándar de MySQL |
| `gestion_escolar` | Nombre de la BD | El nombre de la base de datos que crearemos en el paso 6 |

**Ejemplos de variaciones comunes:**

```env
# Si MySQL tiene contraseña:
DATABASE_URL="mysql://root:mi_contraseña@localhost:3306/gestion_escolar"

# Si MySQL usa un puerto diferente (ej: 3307):
DATABASE_URL="mysql://root@localhost:3307/gestion_escolar"

# Si la base de datos tiene otro nombre:
DATABASE_URL="mysql://root@localhost:3306/escuela_juares"
```

#### `SESSION_SECRET` — Seguridad de las Sesiones

Es una cadena de texto secreta que el sistema usa para encriptar las sesiones de login de los usuarios. Puedes cambiarla por cualquier texto largo y único. Ejemplo:

```env
SESSION_SECRET="mi-escuela-secreta-2026-lara"
```

> **⚠️ IMPORTANTE:** Si cambias este valor después de que el sistema esté en uso, todos los usuarios que tengan sesión abierta serán desconectados automáticamente (tendrán que volver a iniciar sesión).

#### `PORT` — Puerto del Servidor

El puerto donde el sistema escuchará las conexiones. `3000` es el valor estándar. Los usuarios accederán al sistema escribiendo `http://[IP]:3000` en el navegador.

---

## 6. Crear la Base de Datos

Antes de que el sistema pueda funcionar, necesitamos crear una **base de datos vacía** en MySQL con el nombre que pusimos en el `.env` (`gestion_escolar`).

### Método A — Usando phpMyAdmin (visual, más fácil)

1. Asegurarse de que Laragon esté corriendo (los servicios en verde)
2. Abrir el navegador e ir a: `http://localhost/phpmyadmin`
3. En phpMyAdmin, click en **"Nueva"** (o **"New"**) en el panel izquierdo
4. En el campo **"Nombre de la base de datos"**, escribir:
   ```
   gestion_escolar
   ```
5. En **"Cotejamiento"** (collation), seleccionar: `utf8mb4_general_ci`
6. Click en **"Crear"**
7. ✅ En el panel izquierdo debe aparecer `gestion_escolar`

### Método B — Usando la terminal (más rápido)

1. Abrir una terminal (PowerShell)
2. Ejecutar:

```powershell
mysql -u root -e "CREATE DATABASE IF NOT EXISTS gestion_escolar CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
```

3. Si no muestra errores, ✅ la base de datos fue creada

> **💡 NOTA:** Si el comando `mysql` no se reconoce, es porque la ruta de MySQL no está en el PATH del sistema. En ese caso usa el Método A (phpMyAdmin), o ejecuta el comando con la ruta completa:
> ```powershell
> C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS gestion_escolar CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
> ```
> (La versión de MySQL puede variar. Busca la carpeta correcta dentro de `C:\laragon\bin\mysql\`)

---

## 7. Instalar Dependencias y Generar Tablas

### Paso 7.1 — Abrir terminal en la carpeta del proyecto

1. Abrir el **Explorador de Archivos** y navegar a la carpeta del proyecto
2. Click en la barra de dirección (arriba) y escribir `powershell`, luego presionar **Enter**
3. Se abrirá una terminal ya posicionada en la carpeta correcta

O desde cualquier terminal:
```powershell
cd "C:\Users\[TU_USUARIO]\Documents\proyecto comunitario\gestion-escolar"
```

### Paso 7.2 — Instalar las dependencias de Node.js

```powershell
npm install
```

Este comando lee el archivo `package.json` y descarga todas las librerías que el sistema necesita:
- **express** → Servidor web
- **@prisma/client** → Conexión con la base de datos
- **bcrypt** → Encriptación de contraseñas
- **dotenv** → Lectura del archivo `.env`
- **express-session** → Manejo de sesiones de login
- **express-rate-limit** → Protección contra ataques

Se creará una carpeta `node_modules/` (puede pesar ~100 MB). **Esto es normal.**

Esperar a que termine (puede tardar 1-3 minutos). Debe terminar sin errores rojos.

### Paso 7.3 — Generar el cliente de Prisma

```powershell
npx prisma generate
```

Este comando lee el archivo `prisma/schema.prisma` y genera el código que el sistema usa para comunicarse con la base de datos. Debe mostrar:

```
✔ Generated Prisma Client
```

### Paso 7.4 — Crear las tablas en la base de datos

```powershell
npx prisma db push
```

Este comando lee el archivo `prisma/schema.prisma` y **crea todas las tablas** en la base de datos `gestion_escolar`:

- `usuarios` — Usuarios del sistema (login)
- `configuracion` — Datos de la escuela
- `grados` — Grados escolares
- `anios_escolares` — Años escolares
- `secciones` — Secciones por grado y año
- `personas` — Madres, padres y representantes
- `estudiantes` — Datos de los estudiantes
- `inscripciones` — Inscripciones de cada estudiante
- `profesores` — Docentes
- `profesores_secciones` — Asignación de docentes a secciones
- `colaboraciones` — Colaboraciones económicas
- `colaboracion_pagos` — Pagos de colaboraciones

Debe mostrar:

```
Your database is now in sync with your Prisma schema. Done in XXXms
```

> **💡 VERIFICACIÓN:** Puedes abrir phpMyAdmin (`http://localhost/phpmyadmin`), click en `gestion_escolar` en el panel izquierdo, y verás todas las tablas creadas.

---

## 8. Cargar Datos Iniciales (Seed)

El sistema necesita ciertos datos iniciales para funcionar: el usuario administrador, los grados, el año escolar y la configuración de la escuela.

### Paso 8.1 — Ejecutar el seeder

En la misma terminal del proyecto, ejecutar:

```powershell
npx prisma db seed
```

Este comando ejecuta el archivo `prisma/seed.js`, que crea:

| Dato | Valor |
|---|---|
| **Usuario admin** | `admin` / contraseña: `admin123` |
| **Rol** | `SUPER_ADMIN` (acceso total) |
| **Año escolar** | `2025-2026` (activo) |
| **Grados** | Preescolar A, Preescolar B, 1er a 6to Grado |
| **Configuración** | Nombre de la escuela, municipio, parroquia, etc. |

Debe mostrar:

```
Iniciando el seeder...
Año escolar creado: 2025-2026
Grados creados exitosamente.
Usuario administrador creado: admin
Configuración de la escuela insertada.
¡Seeder terminado con éxito!
```

> **⚠️ IMPORTANTE:** Este comando solo se ejecuta **UNA VEZ** (la primera instalación). Si lo ejecutas de nuevo, dará error porque los datos ya existen.

> **💡 NOTA:** Los datos de configuración de la escuela (nombre, dirección, etc.) se pueden cambiar después desde el sistema, en la sección de Configuración (accesible solo con el rol SUPER_ADMIN).

---

## 9. Iniciar el Sistema por Primera Vez

### Paso 9.1 — Verificar que MySQL esté corriendo

1. Abrir Laragon
2. Verificar que MySQL esté en verde (si no, click en "Start All")

### Paso 9.2 — Iniciar el servidor

En la terminal del proyecto:

```powershell
node server.js
```

Debe mostrar:

```
  ✅ Servidor corriendo en puerto 3000
  → Local:  http://localhost:3000
  → Red (Wi-Fi):  http://192.168.1.15:3000
```

### Paso 9.3 — Abrir el sistema

1. Abrir el navegador (Chrome, Edge, Firefox)
2. Ir a: `http://localhost:3000`
3. Debe aparecer la pantalla de login
4. Ingresar:
   - **Usuario:** `admin`
   - **Contraseña:** `admin123`
5. ✅ Si entras al dashboard, **¡el sistema está instalado correctamente!**

> **⚠️ IMPORTANTE:** Cambiar la contraseña del usuario `admin` después del primer login por seguridad.

---

## 10. Configurar el Firewall de Windows

Este paso permite que **otros dispositivos** (teléfonos, tablets, otras PCs) se conecten al sistema a través de la red.

### Paso 10.1 — Abrir PowerShell como Administrador

1. Click derecho en el **botón de Inicio** de Windows
2. Seleccionar **"Terminal (Administrador)"** o **"PowerShell (Administrador)"**
3. Si pide confirmación, click en **"Sí"**

### Paso 10.2 — Crear la regla de firewall

Copiar y pegar este comando completo y presionar Enter:

```powershell
New-NetFirewallRule -DisplayName "Gestion Escolar - Puerto 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Any
```

Debe mostrar una tabla con los datos de la regla creada.

✅ **Este paso se hace UNA SOLA VEZ.** La regla se mantiene permanentemente (a menos que se formatee la PC).

### Verificar que se creó correctamente

```powershell
Get-NetFirewallRule -DisplayName "Gestion Escolar*" | Select-Object DisplayName, Enabled, Direction
```

Debe mostrar:
```
DisplayName                      Enabled Direction
-----------                      ------- ---------
Gestion Escolar - Puerto 3000      True   Inbound
```

---

## 11. Configurar la Red Local (Router)

### Arquitectura

```
[Internet] → [Router WiFi] ← Cable Ethernet → [PC Principal (Servidor)]
                   ↑
              WiFi inalámbrico
                   ↓
         [Teléfonos / Tablets / Otras PCs]
```

Todos los dispositivos (servidor y clientes) están en la **misma red WiFi del router**.

### Paso 11.1 — Conectar la PC principal al router

**Por cable Ethernet (recomendado):**
- Conectar un cable desde la PC al cualquier **puerto LAN** del router

**Por WiFi:**
- Conectar la PC a la red WiFi del router desde la configuración de Windows

### Paso 11.2 — Averiguar la IP de la PC principal

```powershell
ipconfig
```

Buscar la sección del adaptador activo (Ethernet o Wi-Fi) y anotar la **Dirección IPv4**:

```
Adaptador de Ethernet:
   Dirección IPv4. . . . . . . . : 192.168.1.15
```

Esta IP es la que usarán todos los dispositivos: `http://192.168.1.15:3000`

> **💡 TIP:** El servidor también muestra la IP al iniciar (`node server.js`). Busca la línea que dice `→ Red`.

### Paso 11.3 — (Recomendado) Fijar la IP de la PC en el router

Para que la IP no cambie al reiniciar el router:

1. Abrir el navegador → ir a la IP del router:
   - `192.168.1.1` (la más común)
   - `192.168.0.1`
   - `192.168.3.1`
   - O la IP que aparece como "Puerta de enlace predeterminada" en `ipconfig`
2. Iniciar sesión con las credenciales del router (viene en la etiqueta debajo del router)
3. Buscar **DHCP → Reserva de direcciones** (o "Address Reservation", "Static IP")
4. Buscar la PC en la lista de dispositivos conectados
5. Asignarle una IP fija (ej: `192.168.1.100`)
6. Guardar y reiniciar el router

### Paso 11.4 — Conectar dispositivos clientes

1. Conectar los teléfonos/tablets al **mismo WiFi** del router
2. Abrir el navegador → `http://[IP_DE_LA_PC]:3000`
3. Aparece el login del sistema
4. ✅ Funciona

### Paso 11.5 — Crear acceso directo en teléfonos

**Android (Chrome):** Menú (3 puntos) → "Agregar a pantalla de inicio"  
**iPhone (Safari):** Botón compartir → "Agregar a inicio"

### ¿Qué pasa si cambian de router?

El sistema **NO depende de ningún router específico.** Si cambian de router:

1. Conectar la PC al nuevo router
2. Ejecutar `ipconfig` para ver la nueva IP
3. Iniciar `node server.js` → ver la IP que muestra
4. Decir la nueva IP a los usuarios
5. ✅ Todo lo demás sigue igual (no se cambia código ni configuración)

---

## 12. Uso Diario del Sistema

### Encender (Inicio del día)

1. **Encender la PC principal**
2. **Abrir Laragon** → click en **"Start All"** (inicia MySQL)
3. **Abrir una terminal** en la carpeta del proyecto
4. **Ejecutar:**
   ```powershell
   node server.js
   ```
5. **Anotar la IP** que muestra (ej: `http://192.168.1.100:3000`)
6. **Dispositivos:** Abrir navegador → escribir la dirección IP

### Apagar (Fin del día)

1. En la terminal: presionar **Ctrl + C** (detiene Node.js)
2. En Laragon: click en **"Stop All"** (detiene MySQL)
3. Apagar la PC normalmente

> **⚠️ NO cerrar la terminal** de Node.js mientras el sistema esté en uso. Si la cierras, el servidor se apaga y nadie podrá acceder.

---

## 13. Referencia Rápida de Comandos

### Comandos de instalación (solo primera vez)

| Comando | ¿Qué hace? |
|---|---|
| `npm install` | Descarga todas las librerías necesarias |
| `npx prisma generate` | Genera el código de conexión con la BD |
| `npx prisma db push` | Crea todas las tablas en la base de datos |
| `npx prisma db seed` | Carga datos iniciales (admin, grados, etc.) |

### Comandos de uso diario

| Comando | ¿Qué hace? |
|---|---|
| `node server.js` | Inicia el servidor del sistema |
| `Ctrl + C` | Detiene el servidor |
| `ipconfig` | Muestra la IP de la PC (para compartir con dispositivos) |

### Comandos de diagnóstico

| Comando | ¿Qué hace? |
|---|---|
| `node --version` | Verifica la versión de Node.js instalada |
| `npm --version` | Verifica la versión de npm |
| `npx prisma studio` | Abre un visor web de la base de datos (para debug) |
| `netstat -ano \| findstr :3000` | Verifica si el puerto 3000 está en uso |
| `netstat -ano \| findstr :3306` | Verifica si MySQL está corriendo |

### Credenciales por defecto

| Recurso | Usuario | Contraseña |
|---|---|---|
| Sistema de Gestión | `admin` | `admin123` |
| MySQL (phpMyAdmin) | `root` | *(sin contraseña)* |
| phpMyAdmin URL | — | `http://localhost/phpmyadmin` |
| Sistema URL (local) | — | `http://localhost:3000` |
