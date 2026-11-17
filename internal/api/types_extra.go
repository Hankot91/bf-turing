package api

// ExportRequest es la petición de /api/export.
type ExportRequest struct {
	Code     string `json:"code"`
	Mode     string `json:"mode"`
	CellSize int    `json:"cellSize"`
}

// TMWrite describe qué escribe una transición.
// Alto nivel: {"op": "inc|dec|keep|input"}. Pura: {"value": n} (o {"op":"input"} para ',').
type TMWrite struct {
	Op    string `json:"op,omitempty"`
	Value *int   `json:"value,omitempty"`
}

type Transition struct {
	From  string      `json:"from"`
	Read  interface{} `json:"read"` // "*", "0", "!0" (alto nivel) o número (pura)
	To    string      `json:"to"`
	Write TMWrite     `json:"write"`
	Move  string      `json:"move"`
	IO    string      `json:"io,omitempty"` // "in" | "out"
}

type Alphabet struct {
	Size  int `json:"size"`
	Blank int `json:"blank"`
}

type ExportResponse struct {
	Version     int          `json:"version"`
	Mode        string       `json:"mode"`
	States      []string     `json:"states"`
	Alphabet    Alphabet     `json:"alphabet"`
	Initial     string       `json:"initial"`
	Accepting   []string     `json:"accepting"`
	Transitions []Transition `json:"transitions"`
}
