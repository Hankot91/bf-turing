package api

// Petición estándar para /api/run
type RunRequest struct {
	Code     string `json:"code"`
	Input    string `json:"input"`
	CellSize int    `json:"cellSize"`
	MaxSteps int    `json:"maxSteps"`
}

// Petición para /api/validate
type ValidateRequest struct {
	Code string `json:"code"`
}

type Instruction struct {
	Index int    `json:"index"`
	Op    string `json:"op"`
	Src   int    `json:"src"`
	Match *int   `json:"match"` // Emitir null si no es corchete
}

type Program struct {
	Instructions []Instruction `json:"instructions"`
	BracketPairs [][]int       `json:"bracketPairs"`
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
	Output        *string    `json:"output"` // null si no emitió salida
	InputConsumed bool       `json:"inputConsumed"`
	LoopDepth     int        `json:"loopDepth"`
	Delta         Delta      `json:"delta"`
}

type FinalTape struct {
	Offset int   `json:"offset"`
	Cells  []int `json:"cells"`
}

type Result struct {
	Status     string    `json:"status"`
	TotalSteps int       `json:"totalSteps"`
	Output     string    `json:"output"`
	FinalPtr   int       `json:"finalPtr"`
	CycleFrom  *int      `json:"cycleFrom,omitempty"` // Solo en cycle_detected
	FinalTape  FinalTape `json:"finalTape"`
}

type RunResponse struct {
	Version int     `json:"version"`
	Program Program `json:"program"`
	Steps   []Step  `json:"steps"`
	Result  Result  `json:"result"`
}

type ValidateResponse struct {
	Version      int           `json:"version"`
	Valid        bool          `json:"valid"`
	Instructions []Instruction `json:"instructions"`
	BracketPairs [][]int       `json:"bracketPairs"`
}

type ErrorDetail struct {
	Code     string `json:"code"`
	Message  string `json:"message"`
	Position *int   `json:"position"`
	Line     *int   `json:"line"`
	Column   *int   `json:"column"`
}

type ErrorResponse struct {
	Version int         `json:"version"`
	Error   ErrorDetail `json:"error"`
}
