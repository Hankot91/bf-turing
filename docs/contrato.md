# Contrato de la API: Brainfuck ↔ Máquina de Turing

**Versión del contrato:** `1`  
**Fuente de verdad:** este archivo + los *golden files* de `docs/ejemplos/`.  
**Regla:** si el servidor y este documento no coinciden, hay un error; se corrige uno de los dos por Pull Request, nunca "de palabra".

---

## 1. Convenciones (leer primero)

Estas reglas definen el significado de los campos. Los tipos solos no alcanzan.

### Programa y estados

- Un programa es la lista de **comandos válidos** del código fuente (`> < + - [ ] . ,`). Todo otro carácter es comentario y se ignora.
- Cada comando recibe un `index` (0, 1, 2…) contando **solo comandos**, no caracteres. El campo `src` guarda su posición en el código original (útil para resaltar en el editor).
- El **estado** de la MT es el índice de instrucción: la instrucción `i` corresponde al estado `q{i}`. Con `n` instrucciones, el estado final se llama **`qhalt`** (no `q{n}`).
- El estado inicial es siempre `q0`. Si el programa está vacío, el primer estado ya es `qhalt`.

### Transiciones

| Comando | Lectura | Siguiente estado | Escritura | Movimiento |
|---|---|---|---|---|
| `+` | `a` | `q{i+1}` | `(a+1) mod k` | `N` |
| `-` | `a` | `q{i+1}` | `(a-1) mod k` | `N` |
| `>` | `a` | `q{i+1}` | `a` | `R` |
| `<` | `a` | `q{i+1}` | `a` | `L` |
| `[` | `a == 0` | `q{match+1}` | `a` | `N` |
| `[` | `a != 0` | `q{i+1}` | `a` | `N` |
| `]` | `a != 0` | `q{match+1}` | `a` | `N` |
| `]` | `a == 0` | `q{i+1}` | `a` | `N` |
| `.` | `a` | `q{i+1}` | `a` (emite `a` como salida) | `N` |
| `,` | `a` | `q{i+1}` | siguiente byte de la entrada, o `0` si no hay (EOF) | `N` |

Donde `match` es el índice del corchete pareja y `k` es `cellSize`. Si `match+1 == n`, el siguiente estado es `qhalt`.

> Nota: `]` con celda distinta de cero salta a `match+1` (después del `[`), no al `[` mismo. Es equivalente a volver a evaluar el `[` y ahorra un paso.

### Cinta

- Bidireccional e infinita: el cabezal parte en el índice `0` y puede llegar a índices **negativos**.
- Toda celda no escrita vale `0`.
- Las celdas toman valores en `0..cellSize-1` con aritmética módulo `cellSize` (wrap-around).

### Entrada y salida

- `input` es una cadena cuyos caracteres tienen código entre 0 y 255. `,` consume un carácter por vez.
- `output` de un paso es una cadena de **un carácter** cuyo código es el valor de la celda (`"\u0000"`, `"H"`, `"\u00ff"`…).
- E/S se modela como cintas auxiliares (la MT es multicinta; equivale a una de una cinta).

### Pasos de ejecución

- `ptr` es la posición del cabezal **después** de ejecutar el paso. La posición **antes** es el `ptr` del paso anterior (o `0` en el paso 0).
- `write` es no nulo **solo si el valor de la celda cambió**. Contiene el `index` de la celda (la posición del cabezal antes de moverse) y el nuevo `value`.
- `loopDepth` es el número de bucles que **contienen** a la instrucción, contando el `[` y el `]` como parte de su propio bucle. Un `+` fuera de bucles tiene `0`; el `[` externo tiene `1`.
- `delta` es la transición δ aplicada en ese paso. Siempre incluye `read` y `write` como números concretos.

### Fin de la ejecución (`result.status`)

| Valor | Significa |
|---|---|
| `halted` | El programa terminó (llegó a `qhalt`). |
| `step_limit` | Se ejecutaron `maxSteps` pasos sin terminar. |
| `cycle_detected` | Se repitió una configuración. Es una **heurística**, no una solución al problema de la parada. |
| `error` | Reservado. Los errores de entrada usan el formato de la sección 4 y no llegan aquí. |

**Configuración** = `(pc siguiente, ptr, contenido de la cinta, posición en la entrada)`. Cuando un paso deja una configuración ya vista, la ejecución se detiene en ese paso y `result.cycleFrom` indica el número de paso donde esa configuración apareció por primera vez (`-1` significa la configuración inicial).

### Posiciones en el código

- `position` está en **caracteres Unicode (runes)** desde 0, no en bytes. En Go hay que convertir con `[]rune(code)`, porque indexar el `string` da bytes.
- `line` y `column` empiezan en 1.

---

## 2. Valores por defecto y límites

| Parámetro | Defecto | Rango |
|---|---|---|
| `cellSize` | 256 | 2 a 256 (en modo `pure`, máximo 16) |
| `maxSteps` | 10000 | 1 a 200 000 |
| `input` | `""` | caracteres con código 0 a 255 |

Si un campo se omite en la petición se usa el defecto. En `/api/export`, `mode` por defecto es `high`, y `cellSize` por defecto es 256 (4 en modo `pure`).

---

## 3. Endpoints

Todas las respuestas llevan `"version": 1`. Los errores responden con HTTP 400 y el formato de la sección 4. Un resultado `step_limit` o `cycle_detected` **no es un error**: responde HTTP 200.

### 3.1 `POST /api/run`

Ejecuta el programa y devuelve todos los pasos.

**Petición**

```json
{ "code": "+++[-]", "input": "", "cellSize": 256, "maxSteps": 10000 }
```

**Respuesta** (recortada; el ejemplo completo está en `ejemplos/run-cero.json`)

```json
{
  "version": 1,
  "program": {
    "instructions": [
      {"index": 0, "op": "+", "src": 0, "match": null},
      {"index": 3, "op": "[", "src": 3, "match": 5},
      {"index": 5, "op": "]", "src": 5, "match": 3}
    ],
    "bracketPairs": [[3, 5]]
  },
  "steps": [
    {"n": 0, "pc": 0, "op": "+", "ptr": 0,
     "write": {"index": 0, "value": 1}, "output": null, "inputConsumed": false,
     "loopDepth": 0,
     "delta": {"from": "q0", "read": 0, "to": "q1", "write": 1, "move": "N"}}
  ],
  "result": {
    "status": "halted",
    "totalSteps": 10,
    "output": "",
    "finalPtr": 0,
    "finalTape": {"offset": 0, "cells": [0]}
  }
}
```

**Campos**

| Campo | Tipo | Descripción |
|---|---|---|
| `program.instructions[].index` | int | Índice del comando (= estado `q{index}`) |
| `program.instructions[].op` | string | Uno de `> < + - [ ] . ,` |
| `program.instructions[].src` | int | Posición en el código original (runes) |
| `program.instructions[].match` | int o `null` | Índice del corchete pareja; `null` si no es corchete |
| `program.bracketPairs` | `[int,int][]` | Pares `[abre, cierra]` en índices de instrucción, ordenados por apertura |
| `steps[].n` | int | Número de paso desde 0 |
| `steps[].pc` | int | Índice de la instrucción ejecutada |
| `steps[].op` | string | Comando ejecutado |
| `steps[].ptr` | int | Cabezal después del paso (puede ser negativo) |
| `steps[].write` | objeto o `null` | `{index, value}` si la celda cambió |
| `steps[].output` | string o `null` | Carácter emitido por `.` |
| `steps[].inputConsumed` | bool | `true` si `,` consumió un carácter |
| `steps[].loopDepth` | int | Ver sección 1 |
| `steps[].delta` | objeto | `{from, read, to, write, move}` con `move` en `L`, `R`, `N` |
| `result.status` | string | Ver sección 1 |
| `result.totalSteps` | int | Cantidad de elementos en `steps` |
| `result.output` | string | Toda la salida concatenada |
| `result.finalPtr` | int | Cabezal al terminar |
| `result.cycleFrom` | int | **Solo** si `status == "cycle_detected"` |
| `result.finalTape` | objeto | `{offset, cells}`: celdas desde el índice `offset`, cubriendo desde la celda no nula más a la izquierda hasta la más a la derecha, incluyendo la celda del cabezal |

`finalTape` sirve para que el frontend verifique que su reconstrucción a partir de los `write` es correcta.

### 3.2 `POST /api/validate`

Valida corchetes sin ejecutar.

**Petición:** `{ "code": "+[->+<]" }`

**Respuesta:** `{ "version": 1, "valid": true, "instructions": [...], "bracketPairs": [[1, 5]] }`

Si el código es inválido, responde con el error de la sección 4 (no con `valid: false`).

### 3.3 `POST /api/export`

Devuelve la tabla δ de la MT equivalente.

**Petición**

```json
{ "code": "+[-]", "mode": "high", "cellSize": 256 }
```

`mode` es `"high"` o `"pure"`.

**Respuesta (modo `high`)**: ver `ejemplos/export-alto-cero.json`.

```json
{
  "version": 1,
  "mode": "high",
  "states": ["q0", "q1", "q2", "q3", "qhalt"],
  "alphabet": {"size": 256, "blank": 0},
  "initial": "q0",
  "accepting": ["qhalt"],
  "transitions": [
    {"from": "q0", "read": "*",  "to": "q1",    "write": {"op": "inc"},  "move": "N"},
    {"from": "q1", "read": "0",  "to": "qhalt", "write": {"op": "keep"}, "move": "N"},
    {"from": "q1", "read": "!0", "to": "q2",    "write": {"op": "keep"}, "move": "N"}
  ]
}
```

(recortada)

| Campo de transición | Valores |
|---|---|
| `read` (alto nivel) | `"*"` (cualquier símbolo), `"0"`, `"!0"` |
| `read` (pura) | número `0..k-1` |
| `write` (alto nivel) | `{"op": "inc" \| "dec" \| "keep" \| "input"}` |
| `write` (pura) | `{"value": n}`, salvo `,` que usa `{"op": "input"}` |
| `move` | `"L"`, `"R"`, `"N"` |
| `io` | **Solo** en `.` (`"out"`) y `,` (`"in"`) |

Orden de las transiciones: por estado origen (`q0`, `q1`, …) y, dentro de cada estado, por `read` ascendente (`"0"` antes que `"!0"`).

**Modo `pure`:** una transición por cada símbolo del alfabeto en cada estado (ver `ejemplos/export-pura-cero.json` con `cellSize: 3`). Es una MT en sentido estricto, excepto por `,`, que depende de una cinta de entrada externa.

---

## 4. Errores

Formato único para todos los endpoints, con HTTP 400:

```json
{
  "version": 1,
  "error": {
    "code": "UNBALANCED_BRACKET",
    "message": "Falta cerrar el '[' de la posición 2",
    "position": 2,
    "line": 1,
    "column": 3
  }
}
```

`position`, `line` y `column` valen `null` cuando el error no está ligado al código fuente.

| `code` | Cuándo | `position` apunta a |
|---|---|---|
| `UNBALANCED_BRACKET` | Hay `[` sin cerrar | El **primer** `[` sin cerrar |
| `UNEXPECTED_CLOSE` | Hay `]` sin `[` | El `]` sobrante |
| `INVALID_CELL_SIZE` | `cellSize` fuera de rango, o `pure` con `cellSize > 16` | `null` |
| `INVALID_MODE` | `mode` distinto de `high`/`pure` | `null` |
| `INVALID_INPUT` | `input` con caracteres de código mayor a 255 | `null` |
| `STEP_LIMIT_TOO_HIGH` | `maxSteps` mayor a 200 000 | `null` |
| `INVALID_STEP_LIMIT` | `maxSteps` menor que 1 | `null` |
| `INVALID_JSON` | Cuerpo que no es JSON válido | `null` |
| `REQUEST_TOO_LARGE` | Cuerpo de más de 1 MB (HTTP 413) | `null` |
| `METHOD_NOT_ALLOWED` | Método distinto de `POST` (HTTP 405) | `null` |

El campo `message` es para mostrar al usuario, en español. **El frontend decide por `code`, nunca por `message`.**

---

## 5. Tipos

### TypeScript (`frontend/src/api/types.ts`)

```ts
export type Op = ">" | "<" | "+" | "-" | "[" | "]" | "." | ",";
export type Move = "L" | "R" | "N";
export type Status = "halted" | "step_limit" | "cycle_detected" | "error";

export interface Instruction { index: number; op: Op; src: number; match: number | null }

export interface Delta { from: string; read: number; to: string; write: number; move: Move }

export interface Step {
  n: number; pc: number; op: Op; ptr: number;
  write: { index: number; value: number } | null;
  output: string | null;
  inputConsumed: boolean;
  loopDepth: number;
  delta: Delta;
}

export interface RunResponse {
  version: 1;
  program: { instructions: Instruction[]; bracketPairs: [number, number][] };
  steps: Step[];
  result: {
    status: Status; totalSteps: number; output: string; finalPtr: number;
    cycleFrom?: number;
    finalTape: { offset: number; cells: number[] };
  };
}

export interface ApiError {
  version: 1;
  error: { code: string; message: string; position: number | null; line: number | null; column: number | null };
}

export type Transition = {
  from: string; to: string; move: Move; io?: "in" | "out";
  read: "*" | "0" | "!0" | number;
  write: { op: "inc" | "dec" | "keep" | "input" } | { value: number };
};

export interface ExportResponse {
  version: 1; mode: "high" | "pure";
  states: string[]; alphabet: { size: number; blank: number };
  initial: string; accepting: string[]; transitions: Transition[];
}
```

### Go (`internal/api/types.go`)

```go
package api

type RunRequest struct {
	Code     string `json:"code"`
	Input    string `json:"input"`
	CellSize int    `json:"cellSize"`
	MaxSteps int    `json:"maxSteps"`
}

type Instruction struct {
	Index int    `json:"index"`
	Op    string `json:"op"`
	Src   int    `json:"src"`
	Match *int   `json:"match"` // sin omitempty: debe salir null
}

type CellWrite struct {
	Index int `json:"index"`
	Value int `json:"value"`
}

type Delta struct {
	From  string `json:"from"`
	Read  int    `json:"read"`
	To    string `json:"to"`
	Write int    `json:"write"`
	Move  string `json:"move"`
}

type Step struct {
	N             int        `json:"n"`
	PC            int        `json:"pc"`
	Op            string     `json:"op"`
	Ptr           int        `json:"ptr"`
	Write         *CellWrite `json:"write"`  // null si la celda no cambió
	Output        *string    `json:"output"` // null si no hay salida
	InputConsumed bool       `json:"inputConsumed"`
	LoopDepth     int        `json:"loopDepth"`
	Delta         Delta      `json:"delta"`
}

type FinalTape struct {
	Offset int   `json:"offset"`
	Cells  []int `json:"cells"`
}

type Result struct {
	Status      string    `json:"status"`
	TotalSteps  int       `json:"totalSteps"`
	Output      string    `json:"output"`
	FinalPtr    int       `json:"finalPtr"`
	CycleFrom   *int      `json:"cycleFrom,omitempty"` // solo en cycle_detected
	FinalTape   FinalTape `json:"finalTape"`
}

type ErrorBody struct {
	Code     string `json:"code"`
	Message  string `json:"message"`
	Position *int   `json:"position"`
	Line     *int   `json:"line"`
	Column   *int   `json:"column"`
}
```

Trampas típicas de Go con JSON: un `[]int` vacío debe inicializarse (`[]int{}`) o sale `null`; `Match`, `Write`, `Output` y los campos de error **no** llevan `omitempty` porque el contrato exige `null` explícito.

---

## 6. Golden files

Están en `docs/ejemplos/`. Cada archivo tiene esta forma:

```json
{
  "name": "run-cero",
  "description": "…",
  "endpoint": "POST /api/run",
  "httpStatus": 200,
  "request":  { … },
  "response": { … }
}
```

| Archivo | Qué demuestra |
|---|---|
| `run-hello` | Salida `Hi`, bucle simple, 149 pasos |
| `run-cero` | Patrón `[-]` |
| `run-suma` | Movimiento del cabezal y suma 2+3 |
| `run-anidados` | Bucles anidados (`loopDepth` = 2) |
| `run-cinta-negativa` | Índices negativos |
| `run-wrap` | Wrap-around `0 - 1 = 255` |
| `run-entrada` | `,` con entrada `Hi` y EOF = 0 |
| `run-comentarios` | Comentarios ignorados, `src` distinto de `index` |
| `run-ciclo` | `cycle_detected` con `cycleFrom` |
| `run-limite-pasos` | `step_limit` (la cinta crece, no hay ciclo) |
| `run-error-corchete-abierto` | `UNBALANCED_BRACKET`, HTTP 400 |
| `run-error-cierre-sobrante` | `UNEXPECTED_CLOSE`, HTTP 400 |
| `validate-ok`, `validate-error` | `/api/validate` |
| `export-alto-cero` | MT de alto nivel |
| `export-pura-cero` | MT pura con `cellSize: 3` |
| `export-alto-io` | Campo `io` |
| `export-error-cellsize` | `INVALID_CELL_SIZE` |

**Cómo se usan**

- **Go:** una prueba que recorra `docs/ejemplos/*.json`, llame al manejador con `request` y compare JSON con `response` (comparar estructuras, no texto, para ignorar espacios).
- **Frontend:** el servidor falso (mock) busca el golden cuyo `request.code` coincida con el que envía la interfaz y devuelve su `response` con su `httpStatus`.
- **Reconstrucción de cinta:** aplicando los `write` de `steps` en orden debe obtenerse exactamente `result.finalTape`.

Los golden files se generaron con una implementación de referencia que cumple las reglas de la sección 1. Si el equipo de Go encuentra una regla ambigua o un golden que contradice el texto, se corrige **uno de los dos** por Pull Request y se avisa a los tres.

---

## 7. Cambios respecto a la guía anterior

Esta versión ajusta o precisa cosas de la guía `contrato-y-reparto.md`:

1. **Nuevo `src` en `instructions`.** Como los comentarios se descartan, `index` no sirve para resaltar el editor.
2. **Nuevo `result.finalTape`.** Permite verificar la reconstrucción de la cinta.
3. **Nuevo `result.cycleFrom`**, solo con `cycle_detected`.
4. **Nuevo campo `io`** en transiciones de `.` y `,`, y `write: {"op": "input"}` para `,`.
5. **`loopDepth` definido de forma estática** (bucles que contienen la instrucción), en vez de dinámica.
6. **Estados:** el último se llama `qhalt` y `n` instrucciones dan `q0…q{n-1}` más `qhalt`. El ejemplo de `+[-]` de la guía anterior listaba estados de menos.
7. **Campos de error** `position`, `line`, `column` siempre presentes (con `null` cuando no aplican).
8. **Códigos de error** nuevos: `INVALID_INPUT`. `STEP_LIMIT_TOO_HIGH` ahora tiene umbral definido.
9. **El ejemplo de salida** de `++[>+<-].` de la guía anterior era ilustrativo y no correcto (esa salida es `"\u0000"`, porque la celda 0 queda en 0). Valen los golden files.

---

## 8. Decisiones abiertas (acordar antes de congelar)

- [ ] ¿`cellSize` por defecto 256?
- [ ] `maxSteps` por defecto 10 000 y máximo 200 000 (resuelto: 1 000 000 pasos generan ~176 MB de JSON)
- [ ] ¿Límite de `cellSize` 16 en modo `pure`?
- [ ] ¿La detección de ciclos incluye la posición en la entrada (como está ahora)?
- [ ] ¿Los pasos de la MT de alto nivel exportada se corresponden 1 a 1 con los pasos de `/api/run`? (hoy sí)

## 9. Cambios al contrato

1. Se propone por Pull Request que modifique **este archivo, los golden afectados y los tipos** a la vez.
2. Aprueban los tres.
3. Un cambio que rompa compatibilidad sube `version` a `2`. Añadir campos opcionales no la sube.
