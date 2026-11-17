export interface Example {
  id: string;
  name: string;
  note: string;
  code: string;
  input?: string;
  cellSize?: number;
  maxSteps?: number;
}

const HI = '++++++++[>+++++++++<-]>.' + '+'.repeat(33) + '.';

export const EXAMPLES: Example[] = [
  { id: 'hi', name: 'Hola (Hi)', note: 'Un bucle y dos salidas: imprime «Hi».', code: HI },
  { id: 'sum', name: 'Suma 2 + 3', note: 'Mueve la celda 0 a la celda 1.', code: '++>+++<[->+<]>.' },
  { id: 'mul', name: 'Multiplicación 2 × 2', note: 'Bucles anidados.', code: '++[>++[>+<-]<-]>>.' },
  { id: 'zero', name: 'Poner en cero', note: 'El patrón [-] que un optimizador reconoce.', code: '+++[-]' },
  { id: 'echo', name: 'Eco de la entrada', note: 'Lee con , hasta el fin de la entrada.', code: ',[.,]', input: 'Hola' },
  { id: 'neg', name: 'Cinta hacia la izquierda', note: 'El cabezal pasa a índices negativos.', code: '<++>+<.' },
  {
    id: 'hello',
    name: 'Hello World!',
    note: 'El clásico, con bucles anidados.',
    code: '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.',
  },
  { id: 'loop', name: 'Bucle infinito', note: 'La misma configuración se repite: ciclo detectado.', code: '+[]' },
  { id: 'grow', name: 'Cinta que crece', note: 'Nunca repite configuración: llega al límite de pasos.', code: '+[>+]', maxSteps: 1000 },
  { id: 'bad', name: 'Error de sintaxis', note: 'Falta cerrar un corchete.', code: '++[>+<-' },
];
