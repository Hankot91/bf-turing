package server

import (
	"encoding/json"
	"errors"
	"net/http"

	"bf-turing-backend/internal/api"
	"bf-turing-backend/internal/lexer"
	"bf-turing-backend/internal/machine"
	"bf-turing-backend/internal/parser"
	"bf-turing-backend/internal/tm"
)

// MaxBodyBytes limita el tamaño de la petición (el código fuente cabe de sobra).
const MaxBodyBytes = 1 << 20

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeErrorCode(w http.ResponseWriter, status int, code, msg string) {
	writeJSON(w, status, api.ErrorResponse{Version: 1, Error: api.ErrorDetail{Code: code, Message: msg}})
}

func writeError(w http.ResponseWriter, err *parser.ParseError) {
	var pos, line, col *int
	if err.Position != -1 {
		p, l, c := err.Position, err.Line, err.Column
		pos, line, col = &p, &l, &c
	}
	writeJSON(w, http.StatusBadRequest, api.ErrorResponse{
		Version: 1,
		Error:   api.ErrorDetail{Code: err.Code, Message: err.Message, Position: pos, Line: line, Column: col},
	})
}

// decode valida método y cuerpo; devuelve false si ya respondió con un error.
func decode(w http.ResponseWriter, r *http.Request, dst interface{}) bool {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		writeErrorCode(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Use POST")
		return false
	}
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			writeErrorCode(w, http.StatusRequestEntityTooLarge, "REQUEST_TOO_LARGE", "La petición supera 1 MB")
			return false
		}
		writeErrorCode(w, http.StatusBadRequest, "INVALID_JSON", "Petición JSON malformada")
		return false
	}
	return true
}

func HandleRun(w http.ResponseWriter, r *http.Request) {
	var req api.RunRequest
	if !decode(w, r, &req) {
		return
	}
	if req.CellSize == 0 {
		req.CellSize = 256
	}
	if req.MaxSteps == 0 {
		req.MaxSteps = 10000
	}
	resp, perr := machine.Run(req.Code, req.Input, req.CellSize, req.MaxSteps)
	if perr != nil {
		writeError(w, perr)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func HandleValidate(w http.ResponseWriter, r *http.Request) {
	var req api.ValidateRequest
	if !decode(w, r, &req) {
		return
	}
	tokens, insts := lexer.Tokenize(req.Code)
	parsed, perr := parser.Parse(tokens, insts)
	if perr != nil {
		writeError(w, perr)
		return
	}
	writeJSON(w, http.StatusOK, api.ValidateResponse{
		Version: 1, Valid: true, Instructions: parsed.Instructions, BracketPairs: parsed.BracketPairs,
	})
}

func HandleExport(w http.ResponseWriter, r *http.Request) {
	var req api.ExportRequest
	if !decode(w, r, &req) {
		return
	}
	if req.Mode == "" {
		req.Mode = "high"
	}
	if req.CellSize == 0 {
		req.CellSize = 256
		if req.Mode == "pure" {
			req.CellSize = 4
		}
	}
	resp, perr := tm.Export(req.Code, req.Mode, req.CellSize)
	if perr != nil {
		writeError(w, perr)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}
