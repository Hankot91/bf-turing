@echo off
REM Script para compilar y ejecutar el proyecto localmente (sin Docker) - Windows

setlocal enabledelayedexpansion

echo ========================================
echo  Máquina de Turing - Brainfuck Interpreter
echo ========================================
echo.

REM Verificar Go
echo [1/3] Verificando Go...
go version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Go no está instalado o no está en el PATH
    echo Descárgalo desde: https://golang.org/dl
    pause
    exit /b 1
)
for /f "tokens=3" %%i in ('go version') do set GO_VERSION=%%i
echo [OK] Go %GO_VERSION% instalado
echo.

REM Verificar Node.js
echo [2/3] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ADVERTENCIA] Node.js no está instalado
    echo El frontend no se ejecutará sin Node.js
    echo Descárgalo desde: https://nodejs.org
    set SKIP_FRONTEND=1
) else (
    for /f %%i in ('node --version') do echo [OK] Node.js %%i instalado
    set SKIP_FRONTEND=0
)
echo.

REM Compilar Backend
echo [3/3] Compilando Backend...
go build -o bf-server.exe ./cmd/server/
if errorlevel 1 (
    echo [ERROR] Error compilando backend
    pause
    exit /b 1
)
echo [OK] Backend compilado: bf-server.exe
echo.

REM Instalar dependencias del Frontend
if "%SKIP_FRONTEND%"=="0" (
    echo [4/4] Instalando dependencias del Frontend...
    cd frontend
    call npm install
    cd ..
    echo [OK] Dependencias del frontend instaladas
    echo.
)

REM Mostrar instrucciones finales
echo ========================================
echo  PRÓXIMOS PASOS
echo ========================================
echo.
echo BACKEND:
echo   .\bf-server.exe
echo   API estará disponible en: http://localhost:8080
echo.

if "%SKIP_FRONTEND%"=="0" (
    echo FRONTEND (en otra terminal CMD):
    echo   cd frontend
    echo   npm start
    echo   UI estará disponible en: http://localhost:3000
) else (
    echo FRONTEND:
    echo   Instala Node.js desde https://nodejs.org
    echo   Luego ejecuta:
    echo   cd frontend
    echo   npm install
    echo   npm start
)

echo.
echo ========================================
echo  Compilación completada!
echo ========================================
pause
