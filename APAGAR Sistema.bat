@echo off
chcp 65001 >nul 2>&1
title Apagando Sistema de Gestion Escolar
color 0C

REM ============================================================
REM  CONFIGURACION - AJUSTAR ESTAS RUTAS SEGUN LA PC
REM ============================================================
set "MYSQL_BIN=C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin"
REM ============================================================

echo.
echo  ============================================
echo   APAGANDO SISTEMA DE GESTION ESCOLAR
echo  ============================================
echo.

REM ------- PASO 1: Detener servidor Node.js -------
tasklist /fi "imagename eq node.exe" 2>nul | find "node.exe" >nul 2>&1
if %errorlevel%==0 (
    echo   [..] Deteniendo servidor Node.js...
    taskkill /im node.exe /f >nul 2>&1
    echo   [OK] Servidor Node.js detenido.
) else (
    echo   [--] El servidor Node.js no estaba corriendo.
)

REM ------- PASO 2: Detener MySQL -------
tasklist /fi "imagename eq mysqld.exe" 2>nul | find "mysqld.exe" >nul 2>&1
if %errorlevel%==0 (
    echo   [..] Deteniendo MySQL...
    "%MYSQL_BIN%\mysqladmin.exe" -u root shutdown >nul 2>&1
    if %errorlevel%==0 (
        echo   [OK] MySQL detenido correctamente.
    ) else (
        taskkill /im mysqld.exe /f >nul 2>&1
        echo   [OK] MySQL detenido.
    )
) else (
    echo   [--] MySQL no estaba corriendo.
)

echo.
echo  ============================================
echo.
echo   SISTEMA APAGADO CORRECTAMENTE
echo   Ya puede apagar la computadora.
echo.
echo  ============================================
echo.
echo  Presione cualquier tecla para cerrar...
pause >nul
