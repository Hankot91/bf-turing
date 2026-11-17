# Guía de Instalación y Configuración

## Requisitos del Sistema

Este proyecto requiere Docker y Docker Compose para ejecutarse. Sigue los pasos a continuación para configurar tu entorno.

### Para Windows

#### 1. Instalar Docker Desktop

1. Descarga Docker Desktop para Windows desde: https://www.docker.com/products/docker-desktop
2. Ejecuta el instalador y sigue los pasos de instalación
3. Reinicia tu computadora cuando se solicite
4. Docker Desktop debería iniciar automáticamente

#### 2. Verificar la instalación

Abre PowerShell o CMD y ejecuta:

```powershell
docker --version
docker ps
```

Si ves la versión de Docker y una lista (vacía) de contenedores, Docker está correctamente instalado.

#### 3. Iniciar Docker Desktop

Si Docker no está ejecutándose:

- Busca "Docker Desktop" en el menú de inicio
- Haz clic para ejecutar la aplicación
- Espera a que aparezca el ícono en la bandeja del sistema

### Para macOS

#### 1. Instalar Docker Desktop

Usando Homebrew:
```bash
brew install --cask docker
```

O descarga desde: https://www.docker.com/products/docker-desktop

#### 2. Iniciar Docker

```bash
open /Applications/Docker.app
```

#### 3. Verificar instalación

```bash
docker --version
docker ps
```

### Para Linux

#### 1. Instalar Docker

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo systemctl start docker
sudo usermod -aG docker $USER
```

**Fedora:**
```bash
sudo dnf install docker docker-compose
sudo systemctl start docker
sudo usermod -aG docker $USER
```

#### 2. Verificar instalación

```bash
docker --version
docker ps
```

## Ejecutar el Proyecto

Una vez que Docker esté running, ejecuta:

```bash
cd bf-turing-backend
docker-compose up --build
```

Esto:
1. Compilará el backend (Go) en un contenedor
2. Construirá el frontend (Node.js/React) en otro contenedor
3. Iniciará ambos servicios automáticamente

### Acceso a la Aplicación

Una vez que ves mensajes como:
- `bf-backend | Servidor iniciado en http://localhost:8080`
- `bf-frontend | Compiled successfully!`

Accede a:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8080

## Desarrollo Local (Sin Docker)

Si prefieres desarrollar sin Docker:

### Backend (Go)

**Requisitos:**
- Go 1.21 o superior: https://golang.org/dl

**Instalación en Windows:**

1. Descarga el instalador de Go desde https://golang.org/dl
2. Ejecuta el instalador
3. Reinicia tu PowerShell o CMD
4. Verifica: `go version`

**Ejecutar:**

```powershell
cd bf-turing-backend
go run ./cmd/server/main.go
```

El servidor estará disponible en http://localhost:8080

### Frontend (Node.js)

**Requisitos:**
- Node.js 18 o superior: https://nodejs.org

**Instalación en Windows:**

1. Descarga el instalador desde https://nodejs.org
2. Ejecuta el instalador
3. Reinicia tu PowerShell o CMD
4. Verifica: `node --version` y `npm --version`

**Ejecutar:**

```powershell
cd frontend
npm install
npm start
```

La aplicación estará disponible en http://localhost:3000

## Solución de Problemas

### Docker no inicia

**Windows:**
- Verifica que Hyper-V esté habilitado: 
  - Presiona `Win + R`, escribe `services.msc`
  - Busca "Hyper-V" y verifica que esté habilitado
- Asegúrate de tener suficiente espacio en disco (al menos 10GB)

**Mac:**
- Verifica que tienes 4GB de RAM disponibles para Docker

### Puertos ya en uso

Si los puertos 3000 u 8080 ya están en uso:

**Opción 1:** Detener el servicio que usa el puerto

**Opción 2:** Modificar los puertos en `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "9000:8080"  # Cambiar 8080 a otro puerto
  
  frontend:
    ports:
      - "3001:3000"  # Cambiar 3000 a otro puerto
```

### Contenedor se detiene inmediatamente

```bash
# Ver logs
docker-compose logs backend
docker-compose logs frontend

# Ejecutar en modo interactivo para ver errores
docker-compose up
```

## Próximos Pasos

Una vez que la aplicación esté ejecutándose:

1. Abre http://localhost:3000 en tu navegador
2. El editor vendrá con un ejemplo "Hello World" preinstalado
3. Haz clic en "▶️ Ejecutar" para ver la ejecución
4. Usa los controles de navegación para recorrer paso a paso
5. Experimenta con otros códigos Brainfuck

## Ejemplos de Código Brainfuck

Prueba estos códigos en el editor:

**Suma de dos números:**
```
,>,<[->+<]>.
```

**Imprimir "A":**
```
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++.
```

**Bucle simple:**
```
+++++++++++++++++++++++++++++[>+++++++++++++++++++++++++++++++.>+<-]
```

¡Disfruta experimentando con la máquina de Turing!
