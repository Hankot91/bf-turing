package lexer

import (
	"bf-turing-backend/internal/api"
)

type Token struct {
	Op     string
	Src    int
	Line   int
	Column int
}

func Tokenize(code string) ([]Token, []api.Instruction) {
	runes := []rune(code)
	tokens := make([]Token, 0)
	instructions := make([]api.Instruction, 0)

	line := 1
	col := 1
	cmdIndex := 0

	for i, r := range runes {
		ch := string(r)
		switch ch {
		case ">", "<", "+", "-", "[", "]", ".", ",":
			tokens = append(tokens, Token{
				Op:     ch,
				Src:    i,
				Line:   line,
				Column: col,
			})
			instructions = append(instructions, api.Instruction{
				Index: cmdIndex,
				Op:    ch,
				Src:   i,
				Match: nil,
			})
			cmdIndex++
		}

		if r == '\n' {
			line++
			col = 1
		} else {
			col++
		}
	}

	return tokens, instructions
}
