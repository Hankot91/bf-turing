# Brainfuck como Máquina de Turing

Entorno que ejecuta Brainfuck paso a paso y lo muestra como lo que es: una Máquina de Turing de una cinta.
Cada instrucción es un estado `q{i}`; cada paso aplica una transición δ(q, a) = (q', a', mov).

| Módulo (Go) | Teoría de la materia |
|---|---|
| `internal/lexer` | AFD: reconoce los 8 comandos, el resto es comentario |
| `internal/parser` | Autómata de pila: corchetes balanceados (lenguaje libre de contexto) |
| `internal/tape` + `internal/machine` | Máquina de Turing: cinta bidireccional, cabezal, δ |
| `internal/tm` | Tabla δ formal: de alto nivel y pura (7-tupla) |
| detección de ciclos | Problema de la parada (heurística; indecidible en general) |

## Inicio rápido

```bash
docker-compose up --build     # frontend en :3000, API en :8080
```

Sin Docker:

```bash
go run ./cmd/server                       # API en :8080
cd frontend && npm install && npm start   # interfaz en :3000
```

## Pruebas

```bash
go test ./...                                  # 38 pruebas, incluye los golden files
cd frontend && npm test                        # línea de tiempo contra los golden files
```

## Contrato de la API

**La única fuente de verdad es [`docs/contrato.md`](docs/contrato.md)** junto con los ejemplos de `docs/ejemplos/`.
`go test` ejecuta cada ejemplo contra los manejadores reales: si el contrato y el servidor se separan, la prueba falla.

Endpoints: `POST /api/run`, `POST /api/validate`, `POST /api/export`.

## Atajos de la interfaz

`Ctrl/⌘ + Enter` ejecutar · `Espacio` reproducir/pausar · `←` `→` paso atrás/adelante (con `Shift`, de 10 en 10) · `Inicio` `Fin`.
