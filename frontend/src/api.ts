// Tipos y cliente del contrato v1 (docs/contrato.md). El frontend nunca calcula
// la lógica de la máquina: solo dibuja lo que llega de la API.

export type Op = '>' | '<' | '+' | '-' | '[' | ']' | '.' | ',';
export type Move = 'L' | 'R' | 'N';
export type Status = 'halted' | 'step_limit' | 'cycle_detected' | 'error';

export interface Instruction { index: number; op: Op; src: number; match: number | null }
export interface CellWrite { index: number; value: number }
export interface Delta { from: string; read: number; to: string; write: number; move: Move }

export interface Step {
  n: number;
  pc: number;
  op: Op;
  ptr: number;
  write: CellWrite | null;
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
    status: Status;
    totalSteps: number;
    output: string;
    finalPtr: number;
    cycleFrom?: number;
    finalTape: { offset: number; cells: number[] };
  };
}

export interface ValidateResponse {
  version: 1;
  valid: boolean;
  instructions: Instruction[];
  bracketPairs: [number, number][];
}

export interface ApiErrorBody {
  code: string;
  message: string;
  position: number | null;
  line: number | null;
  column: number | null;
}
export interface ErrorResponse { version: 1; error: ApiErrorBody }

export type TransitionRead = '*' | '0' | '!0' | number;
export interface Transition {
  from: string;
  to: string;
  read: TransitionRead;
  write: { op?: 'inc' | 'dec' | 'keep' | 'input'; value?: number };
  move: Move;
  io?: 'in' | 'out';
}
export interface ExportResponse {
  version: 1;
  mode: 'high' | 'pure';
  states: string[];
  alphabet: { size: number; blank: number };
  initial: string;
  accepting: string[];
  transitions: Transition[];
}

/** Error de la API (HTTP 4xx con el formato del contrato) o de red. */
export class ApiFailure extends Error {
  readonly body: ApiErrorBody;
  constructor(body: ApiErrorBody) {
    super(body.message);
    this.body = body;
  }
}

// En desarrollo apunta a localhost:8080; en producción queda vacío y nginx reenvía /api.
const BASE = process.env.REACT_APP_API_URL ?? '';

async function post<T>(path: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new ApiFailure({
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con el servidor.',
      position: null, line: null, column: null,
    });
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiFailure({
      code: 'BAD_RESPONSE',
      message: `Respuesta inesperada del servidor (HTTP ${res.status}).`,
      position: null, line: null, column: null,
    });
  }
  if (!res.ok || (data as ErrorResponse).error) {
    const body = (data as ErrorResponse).error;
    throw new ApiFailure(
      body ?? { code: 'HTTP_' + res.status, message: `Error HTTP ${res.status}`, position: null, line: null, column: null },
    );
  }
  return data as T;
}

export const api = {
  run: (req: { code: string; input: string; cellSize: number; maxSteps: number }, signal?: AbortSignal) =>
    post<RunResponse>('/api/run', req, signal),
  validate: (code: string, signal?: AbortSignal) => post<ValidateResponse>('/api/validate', { code }, signal),
  exportTable: (req: { code: string; mode: 'high' | 'pure'; cellSize: number }, signal?: AbortSignal) =>
    post<ExportResponse>('/api/export', req, signal),
};

export function toApiError(e: unknown): ApiErrorBody {
  if (e instanceof ApiFailure) return e.body;
  return { code: 'UNKNOWN', message: 'Ocurrió un error inesperado.', position: null, line: null, column: null };
}
