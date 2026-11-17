#!/bin/bash
# Script para compilar y ejecutar el proyecto localmente (sin Docker)

set -e

echo "🚀 Iniciando Máquina de Turing - Brainfuck Interpreter"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir secciones
print_section() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Función para éxito
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Función para advertencia
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Función para error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Verificar si Go está instalado
print_section "Verificando requisitos"

if ! command -v go &> /dev/null; then
    print_error "Go no está instalado"
    echo "Descárgalo desde: https://golang.org/dl"
    exit 1
fi
print_success "Go $(go version | awk '{print $3}')"

if ! command -v node &> /dev/null; then
    print_warning "Node.js no está instalado"
    echo "Descárgalo desde: https://nodejs.org"
    echo "El frontend no se ejecutará sin Node.js"
    SKIP_FRONTEND=true
else
    print_success "Node.js $(node --version)"
    SKIP_FRONTEND=false
fi

echo ""

# Compilar Backend
print_section "Compilando Backend"
cd "$(dirname "$0")"

if go build -o bf-server ./cmd/server/; then
    print_success "Backend compilado"
else
    print_error "Error compilando backend"
    exit 1
fi

echo ""

# Instalar dependencias del Frontend
if [ "$SKIP_FRONTEND" = false ]; then
    print_section "Instalando dependencias del Frontend"
    cd frontend
    npm install
    cd ..
    print_success "Dependencias instaladas"
    echo ""
fi

# Proporcionar instrucciones finales
print_section "Próximos pasos"

echo -e "${YELLOW}Backend:${NC}"
echo "  cd bf-turing-backend"
echo "  ./bf-server  (o bf-server.exe en Windows)"
echo "  API estará en: http://localhost:8080"
echo ""

if [ "$SKIP_FRONTEND" = false ]; then
    echo -e "${YELLOW}Frontend (en otra terminal):${NC}"
    echo "  cd bf-turing-backend/frontend"
    echo "  npm start"
    echo "  UI estará en: http://localhost:3000"
else
    echo -e "${YELLOW}Frontend:${NC}"
    echo "  Instala Node.js y ejecuta:"
    echo "  cd bf-turing-backend/frontend"
    echo "  npm install && npm start"
fi

echo ""
print_success "Build completado!"
