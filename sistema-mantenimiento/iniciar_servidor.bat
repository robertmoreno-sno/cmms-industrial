@echo off
title CMMS Mantenimiento Industrial - Servidor Centralizado
echo =======================================================================
echo   Iniciando Servidor Centralizado CMMS Mantenimiento Industrial
echo   Permite conexion simultanea desde multiples computadoras y tablets
echo =======================================================================
echo.

node -v >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH del sistema.
  echo Por favor descargue e instale Node.js desde https://nodejs.org/
  pause
  exit /b 1
)

echo Iniciando servidor en puerto 3000...
start http://localhost:3000/
node server.js

pause
