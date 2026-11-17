// Package tm genera la tabla de transición δ de la Máquina de Turing
// equivalente a un programa Brainfuck, en alto nivel o "pura".
package tm

import (
	"fmt"

	"bf-turing-backend/internal/api"
	"bf-turing-backend/internal/lexer"
	"bf-turing-backend/internal/parser"
)

// StateName: la instrucción i es el estado q{i}; el estado final es qhalt.
func StateName(i, n int) string {
	if i >= n {
		return "qhalt"
	}
	return fmt.Sprintf("q%d", i)
}

const MaxPureCellSize = 16

func paramErr(code, msg string) *parser.ParseError {
	return &parser.ParseError{Code: code, Message: msg, Position: -1}
}

func intp(v int) *int { return &v }

func Export(code, mode string, k int) (*api.ExportResponse, *parser.ParseError) {
	if mode != "high" && mode != "pure" {
		return nil, paramErr("INVALID_MODE", "mode debe ser 'high' o 'pure'")
	}
	if k < 2 || k > 256 {
		return nil, paramErr("INVALID_CELL_SIZE", "cellSize debe estar entre 2 y 256")
	}
	if mode == "pure" && k > MaxPureCellSize {
		return nil, paramErr("INVALID_CELL_SIZE", "el modo 'pure' requiere cellSize <= 16")
	}

	tokens, insts := lexer.Tokenize(code)
	parsed, perr := parser.Parse(tokens, insts)
	if perr != nil {
		return nil, perr
	}
	ins := parsed.Instructions
	n := len(ins)

	states := make([]string, 0, n+1)
	for i := 0; i <= n; i++ {
		states = append(states, StateName(i, n))
	}

	out := make([]api.Transition, 0, n*2)
	for _, in := range ins {
		i := in.Index
		from := StateName(i, n)
		move := "N"
		switch in.Op {
		case ">":
			move = "R"
		case "<":
			move = "L"
		}
		io := ""
		switch in.Op {
		case ".":
			io = "out"
		case ",":
			io = "in"
		}

		if in.Op == "[" || in.Op == "]" {
			jump := StateName(*in.Match+1, n)
			next := StateName(i+1, n)
			toZero, toNonZero := next, jump // ']'
			if in.Op == "[" {
				toZero, toNonZero = jump, next
			}
			if mode == "high" {
				out = append(out,
					api.Transition{From: from, Read: "0", To: toZero, Write: api.TMWrite{Op: "keep"}, Move: "N"},
					api.Transition{From: from, Read: "!0", To: toNonZero, Write: api.TMWrite{Op: "keep"}, Move: "N"})
			} else {
				for s := 0; s < k; s++ {
					to := toNonZero
					if s == 0 {
						to = toZero
					}
					out = append(out, api.Transition{From: from, Read: s, To: to, Write: api.TMWrite{Value: intp(s)}, Move: "N"})
				}
			}
			continue
		}

		if mode == "high" {
			w := api.TMWrite{Op: "keep"}
			switch in.Op {
			case "+":
				w.Op = "inc"
			case "-":
				w.Op = "dec"
			case ",":
				w.Op = "input"
			}
			out = append(out, api.Transition{From: from, Read: "*", To: StateName(i+1, n), Write: w, Move: move, IO: io})
			continue
		}
		for s := 0; s < k; s++ {
			var w api.TMWrite
			switch in.Op {
			case "+":
				w.Value = intp((s + 1) % k)
			case "-":
				w.Value = intp((s - 1 + k) % k)
			case ",":
				w.Op = "input"
			default:
				w.Value = intp(s)
			}
			out = append(out, api.Transition{From: from, Read: s, To: StateName(i+1, n), Write: w, Move: move, IO: io})
		}
	}

	return &api.ExportResponse{
		Version:     1,
		Mode:        mode,
		States:      states,
		Alphabet:    api.Alphabet{Size: k, Blank: 0},
		Initial:     "q0",
		Accepting:   []string{"qhalt"},
		Transitions: out,
	}, nil
}
