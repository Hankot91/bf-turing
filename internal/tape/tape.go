// Package tape implementa la cinta bidireccional de la máquina.
//
// Solo se guardan las celdas distintas de cero: una celda sin escribir y una
// celda con 0 son indistinguibles (el blanco de la MT es 0). Esto mantiene la
// extensión de la cinta final bien definida y permite un hash incremental
// (Zobrist) de la cinta para detectar ciclos en O(1) por paso.
package tape

import "bf-turing-backend/internal/api"

type Tape struct {
	cells    map[int]int
	cellSize int
	Ptr      int
	hash     uint64
}

func NewTape(cellSize int) *Tape {
	return &Tape{cells: make(map[int]int), cellSize: cellSize}
}

func splitmix(x uint64) uint64 {
	x += 0x9E3779B97F4A7C15
	x = (x ^ (x >> 30)) * 0xBF58476D1CE4E5B9
	x = (x ^ (x >> 27)) * 0x94D049BB133111EB
	return x ^ (x >> 31)
}

func cellHash(index, val int) uint64 {
	return splitmix(splitmix(uint64(int64(index))) ^ uint64(val+1))
}

func (t *Tape) Get(index int) int { return t.cells[index] }

// Set escribe val (módulo cellSize) y devuelve el valor guardado y si cambió.
func (t *Tape) Set(index int, val int) (int, bool) {
	mod := val % t.cellSize
	if mod < 0 {
		mod += t.cellSize
	}
	old := t.cells[index]
	if old == mod {
		return mod, false
	}
	if old != 0 {
		t.hash ^= cellHash(index, old)
	}
	if mod != 0 {
		t.hash ^= cellHash(index, mod)
		t.cells[index] = mod
	} else {
		delete(t.cells, index)
	}
	return mod, true
}

// Hash devuelve el hash incremental del contenido (independiente del cabezal).
func (t *Tape) Hash() uint64 { return t.hash }

// Nonzero devuelve las celdas no nulas. Solo lectura.
func (t *Tape) Nonzero() map[int]int { return t.cells }

// ExportFinalTape cubre desde la celda no nula más a la izquierda hasta la más
// a la derecha, incluyendo siempre la celda del cabezal.
func (t *Tape) ExportFinalTape() api.FinalTape {
	lo, hi := t.Ptr, t.Ptr
	for idx := range t.cells {
		if idx < lo {
			lo = idx
		}
		if idx > hi {
			hi = idx
		}
	}
	cells := make([]int, hi-lo+1)
	for i := range cells {
		cells[i] = t.cells[lo+i]
	}
	return api.FinalTape{Offset: lo, Cells: cells}
}
