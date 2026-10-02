@echo off
chcp 65001 >nul 2>&1
title Sistema de Gestion Escolar - SERVIDOR
color 0A

REM ============================================================
REM  CONFIGURACION - AJUSTAR ESTAS RUTAS SEGUN LA PC
REM ============================================================
set "MYSQL_BIN=C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin"
set "MYSQL_INI=C:\laragon\bin\mysql\mysql-8.4.3-winx64\my.ini"
set "PROYECTO=C:\Users\jorge\Documents\proyecto comunitario\gestion-escolar"
set "PUERTO=3000"
REM ============================================================

echo.
echo  ============================================
echo   INICIANDO SISTEMA DE GESTION ESCOLAR
echo  ============================================
echo.

REM ------- PASO 1: Iniciar MySQL -------
tasklist /fi "imagename eq mysqld.exe" 2>nul | find "mysqld.exe" >nul 2>&1
if %errorlevel%==0 (
    echo   [OK] MySQL ya esta corriendo
    goto mysql_listo
)

echo   [..] Iniciando MySQL...
start /B "" "%MYSQL_BIN%\mysqld.exe" --defaults-file="%MYSQL_INI%"

set "INTENTOS=0"
:esperar_mysql
set /a INTENTOS+=1
if %INTENTOS% gtr 30 (
    echo   [ERROR] MySQL no pudo iniciar. Verifique la instalacion.
    echo.
    pause
    exit /b 1
)
"%MYSQL_BIN%\mysqladmin.exe" -u root ping >nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto esperar_mysql
)
echo   [OK] MySQL iniciado correctamente

:mysql_listo

REM ------- PASO 2: Verificar que no haya otro servidor corriendo -------
tasklist /fi "imagename eq node.exe" 2>nul | find "node.exe" >nul 2>&1
if %errorlevel%==0 (
    echo.
    echo   [!!] El servidor ya esta corriendo.
    echo   [!!] Si desea reiniciarlo, primero ejecute "APAGAR Sistema".
    echo.
    pause
    exit /b 0
)

REM ------- PASO 3: Detectar IP de la red -------
set "MI_IP=No detectada"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "127.0.0.1"') do (
    set "MI_IP=%%a"
)
set "MI_IP=%MI_IP: =%"

REM ------- PASO 4: Mostrar informacion -------
echo.
echo  ======================================================
echo.
echo   SISTEMA LISTO - DIRECCIONES DE ACCESO:
echo.
echo   En esta PC:          http://localhost:%PUERTO%
echo   Desde otros equipos: http://%MI_IP%:%PUERTO%
echo.
echo  ======================================================
echo.
echo   Para conectar otros dispositivos (telefonos, tablets,
echo   otras PCs), abrir el navegador y escribir:
echo.
echo          http://%MI_IP%:%PUERTO%
echo.
echo  ======================================================
echo.
echo   NO CIERRE ESTA VENTANA mientras use el sistema.
echo   Para apagar, use "APAGAR Sistema" o presione Ctrl+C.
echo.
echo  ======================================================
echo.

REM ------- PASO 5: Abrir navegador automaticamente -------
timeout /t 2 /nobreak >nul
start "" "http://localhost:%PUERTO%"

REM ------- PASO 6: Iniciar servidor Node.js -------
cd /d "%PROYECTO%"
node server.js

REM ------- Si llegamos aqui, el servidor se detuvo -------
echo.
echo   [..] Servidor Node.js detenido.
echo   [..] Apagando MySQL...
"%MYSQL_BIN%\mysqladmin.exe" -u root shutdown >nul 2>&1
if %errorlevel%==0 (
    echo   [OK] MySQL apagado correctamente.
) else (
    taskkill /im mysqld.exe /f >nul 2>&1
    echo   [OK] MySQL detenido.
)
echo.
echo  ============================================
echo   SISTEMA APAGADO COMPLETAMENTE
echo   Ya puede cerrar esta ventana.
echo  ============================================
echo.
pause
