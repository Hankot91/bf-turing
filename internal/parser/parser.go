package parser

import (
	"fmt"
	"sort"

	"bf-turing-backend/internal/api"
	"bf-turing-backend/internal/lexer"
)

type ParseResult struct {
	Instructions []api.Instruction
	BracketPairs [][]int
	LoopDepths   []int
}

// ParseError también se usa para errores de parámetros (Position = -1).
type ParseError struct {
	Code     string
	Message  string
	Position int
	Line     int
	Column   int
}

// Parse valida el balanceo con una pila (autómata de pila), rellena los saltos
// y calcula la profundidad estática de bucles. Es lineal en el tamaño del código.
func Parse(tokens []lexer.Token, instructions []api.Instruction) (*ParseResult, *ParseError) {
	stack := make([]int, 0)
	pairs := make([][]int, 0)
	depths := make([]int, len(instructions))

	for i, tok := range tokens {
		switch tok.Op {
		case "[":
			stack = append(stack, i)
		case "]":
			if len(stack) == 0 {
				return nil, &ParseError{
					Code:     "UNEXPECTED_CLOSE",
					Message:  fmt.Sprintf("']' sin '[' correspondiente en la posición %d", tok.Src),
					Position: tok.Src, Line: tok.Line, Column: tok.Column,
				}
			}
			open := stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			openIdx, closeIdx := instructions[open].Index, instructions[i].Index
			instructions[open].Match = &closeIdx
			instructions[i].Match = &openIdx
			pairs = append(pairs, []int{open, i})
		}
	}

	if len(stack) > 0 {
		first := tokens[stack[0]]
		return nil, &ParseError{
			Code:     "UNBALANCED_BRACKET",
			Message:  fmt.Sprintf("Falta cerrar el '[' de la posición %d", first.Src),
			Position: first.Src, Line: first.Line, Column: first.Column,
		}
	}

	sort.Slice(pairs, func(a, b int) bool { return pairs[a][0] < pairs[b][0] })

	depth := 0
	for i, in := range instructions {
		switch in.Op {
		case "[":
			depth++
			depths[i] = depth
		case "]":
			depths[i] = depth
			depth--
		default:
			depths[i] = depth
		}
	}

	return &ParseResult{Instructions: instructions, BracketPairs: pairs, LoopDepths: depths}, nil
}
