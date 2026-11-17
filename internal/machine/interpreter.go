package machine

import (
	"strings"

	"bf-turing-backend/internal/api"
	"bf-turing-backend/internal/lexer"
	"bf-turing-backend/internal/parser"
	"bf-turing-backend/internal/tape"
	"bf-turing-backend/internal/tm"
)

const (
	MaxStepsLimit = 200_000
	MaxInputByte  = 255
)

func paramErr(code, msg string) *parser.ParseError {
	return &parser.ParseError{Code: code, Message: msg, Position: -1}
}

func mix(x uint64) uint64 {
	x += 0x9E3779B97F4A7C15
	x = (x ^ (x >> 30)) * 0xBF58476D1CE4E5B9
	x = (x ^ (x >> 27)) * 0x94D049BB133111EB
	return x ^ (x >> 31)
}

// configHash combina el hash incremental de la cinta con (pc, ptr, posición de entrada).
func configHash(tapeHash uint64, pc, ptr, inputPos int) uint64 {
	h := mix(uint64(pc) + 1)
	h = mix(h ^ uint64(int64(ptr)))
	h = mix(h ^ uint64(inputPos)<<1)
	return tapeHash ^ h
}

// Run ejecuta el programa y registra cada paso (δ aplicada incluida).
//
// Detección de ciclos: una configuración es (pc siguiente, ptr, cinta, posición
// de entrada). Se calcula un hash incremental en O(1) por paso; ante una
// coincidencia se verifica exactamente (reconstruyendo la cinta del paso
// candidato) para que una colisión no produzca un falso positivo.
// Es una heurística: el problema de la parada es indecidible en general.
func Run(code string, input string, cellSize int, maxSteps int) (*api.RunResponse, *parser.ParseError) {
	if cellSize < 2 || cellSize > 256 {
		return nil, paramErr("INVALID_CELL_SIZE", "cellSize debe estar entre 2 y 256")
	}
	if maxSteps < 1 {
		return nil, paramErr("INVALID_STEP_LIMIT", "maxSteps debe ser al menos 1")
	}
	if maxSteps > MaxStepsLimit {
		return nil, paramErr("STEP_LIMIT_TOO_HIGH", "maxSteps no puede superar 200,000")
	}
	inputRunes := []rune(input)
	for _, r := range inputRunes {
		if r > MaxInputByte {
			return nil, paramErr("INVALID_INPUT", "la entrada solo admite caracteres con código de 0 a 255")
		}
	}

	tokens, insts := lexer.Tokenize(code)
	parsed, perr := parser.Parse(tokens, insts)
	if perr != nil {
		return nil, perr
	}

	t := tape.NewTape(cellSize)
	total := len(parsed.Instructions)
	capHint := maxSteps
	if capHint > 4096 {
		capHint = 4096
	}
	steps := make([]api.Step, 0, capHint)
	nextPCs := make([]int, 0, capHint)
	inputPosAt := make([]int, 0, capHint)
	var out strings.Builder

	// first[hash] = primer paso cuya configuración posterior tiene ese hash (-1 = inicial).
	first := map[uint64]int{configHash(0, 0, 0, 0): -1}

	// sameConfig comprueba exactamente si la configuración actual es la del paso j.
	sameConfig := func(j, pc, inputPos int) bool {
		if j < 0 {
			return pc == 0 && t.Ptr == 0 && inputPos == 0 && len(t.Nonzero()) == 0
		}
		if nextPCs[j] != pc || steps[j].Ptr != t.Ptr || inputPosAt[j] != inputPos {
			return false
		}
		replay := make(map[int]int)
		for s := 0; s <= j; s++ {
			if w := steps[s].Write; w != nil {
				if w.Value == 0 {
					delete(replay, w.Index)
				} else {
					replay[w.Index] = w.Value
				}
			}
		}
		cur := t.Nonzero()
		if len(replay) != len(cur) {
			return false
		}
		for k, v := range replay {
			if cur[k] != v {
				return false
			}
		}
		return true
	}

	pc, inputPos := 0, 0
	status := ""
	var cycleFrom *int

	for pc < total && len(steps) < maxSteps {
		inst := parsed.Instructions[pc]
		read := t.Get(t.Ptr)
		write, move, nextPC := read, "N", pc+1
		var writeObj *api.CellWrite
		var outputObj *string
		consumed := false
		at := t.Ptr

		switch inst.Op {
		case "+":
			write, _ = t.Set(at, read+1)
		case "-":
			write, _ = t.Set(at, read-1)
		case ">":
			move = "R"
		case "<":
			move = "L"
		case "[":
			if read == 0 {
				nextPC = *inst.Match + 1
			}
		case "]":
			if read != 0 {
				nextPC = *inst.Match + 1
			}
		case ".":
			ch := string(rune(read))
			out.WriteString(ch)
			outputObj = &ch
		case ",":
			if inputPos < len(inputRunes) {
				write, _ = t.Set(at, int(inputRunes[inputPos]))
				inputPos++
				consumed = true
			} else {
				write, _ = t.Set(at, 0) // EOF = 0
			}
		}
		if write != read {
			writeObj = &api.CellWrite{Index: at, Value: write}
		}
		switch move {
		case "R":
			t.Ptr++
		case "L":
			t.Ptr--
		}

		n := len(steps)
		steps = append(steps, api.Step{
			N: n, PC: pc, Op: inst.Op, Ptr: t.Ptr,
			Write: writeObj, Output: outputObj, InputConsumed: consumed,
			LoopDepth: parsed.LoopDepths[pc],
			Delta: api.Delta{
				From: tm.StateName(pc, total), Read: read,
				To: tm.StateName(nextPC, total), Write: write, Move: move,
			},
		})
		nextPCs = append(nextPCs, nextPC)
		inputPosAt = append(inputPosAt, inputPos)
		pc = nextPC

		if pc < total {
			h := configHash(t.Hash(), pc, t.Ptr, inputPos)
			if j, seen := first[h]; seen {
				if sameConfig(j, pc, inputPos) {
					status = "cycle_detected"
					cycleFrom = &j
					break
				}
			} else {
				first[h] = n
			}
		}
	}

	if status == "" {
		if pc >= total {
			status = "halted"
		} else {
			status = "step_limit"
		}
	}

	return &api.RunResponse{
		Version: 1,
		Program: api.Program{Instructions: parsed.Instructions, BracketPairs: parsed.BracketPairs},
		Steps:   steps,
		Result: api.Result{
			Status: status, TotalSteps: len(steps), Output: out.String(),
			FinalPtr: t.Ptr, CycleFrom: cycleFrom, FinalTape: t.ExportFinalTape(),
		},
	}, nil
}
