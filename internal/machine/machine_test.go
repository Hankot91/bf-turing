package machine

import (
	"strings"
	"testing"
	"time"
)

func run(t *testing.T, code, input string, k, max int) (status, output string, steps int) {
	t.Helper()
	r, e := Run(code, input, k, max)
	if e != nil {
		t.Fatalf("error inesperado: %+v", e)
	}
	return r.Result.Status, r.Result.Output, len(r.Steps)
}

// Regresión de rendimiento: antes, 30.000 pasos con la cinta creciendo tardaban 11 s.
func TestRendimientoCintaCreciente(t *testing.T) {
	start := time.Now()
	status, _, steps := run(t, "+[>+]", "", 256, 200000)
	if status != "step_limit" || steps != 200000 {
		t.Fatalf("status=%s steps=%d", status, steps)
	}
	if d := time.Since(start); d > 3*time.Second {
		t.Fatalf("demasiado lento: %v", d)
	}
}

func TestCicloSimple(t *testing.T) {
	r, _ := Run("+[]", "", 256, 10000)
	if r.Result.Status != "cycle_detected" || r.Result.CycleFrom == nil || *r.Result.CycleFrom != 1 || len(r.Steps) != 3 {
		t.Fatalf("%+v", r.Result)
	}
}

// Leer entrada no es un ciclo aunque la cinta vuelva a ser igual: cambia la posición de entrada.
func TestEntradaNoEsCiclo(t *testing.T) {
	status, _, _ := run(t, "+[,]", "AAAA", 256, 10000)
	if status != "halted" {
		t.Fatalf("status=%s, se esperaba halted", status)
	}
}

func TestCicloNoSeAnunciaSiLaCintaCambia(t *testing.T) {
	// El contador baja de 255 a 0: nunca repite configuración antes de terminar.
	status, _, _ := run(t, "-[-]", "", 256, 10000)
	if status != "halted" {
		t.Fatalf("status=%s", status)
	}
}

func TestEOFNoConsumeNiEscribe(t *testing.T) {
	r, _ := Run(",", "", 256, 10)
	s := r.Steps[0]
	if s.InputConsumed || s.Write != nil {
		t.Fatalf("EOF con celda en 0 no debe consumir ni escribir: %+v", s)
	}
	r, _ = Run("+,", "", 256, 10) // EOF sobre celda en 1 la pone en 0
	if s := r.Steps[1]; s.InputConsumed || s.Write == nil || s.Write.Value != 0 {
		t.Fatalf("EOF debe escribir 0 sin consumir: %+v", s)
	}
}

func TestFinalTapeIgnoraCerosEscritos(t *testing.T) {
	r, _ := Run(">+[-]<", "", 256, 100) // la celda 1 queda en 0 y el cabezal vuelve a 0
	ft := r.Result.FinalTape
	if ft.Offset != 0 || len(ft.Cells) != 1 {
		t.Fatalf("finalTape = %+v", ft)
	}
}

func TestWrapAround(t *testing.T) {
	_, out, _ := run(t, "-.", "", 256, 10)
	if out != "\u00ff" {
		t.Fatalf("out=%q", out)
	}
	_, out, _ = run(t, "---.", "", 4, 10) // 0-3 mod 4 = 1
	if out != "\u0001" {
		t.Fatalf("out=%q", out)
	}
}

func TestHolaMundoCorto(t *testing.T) {
	code := "++++++++[>+++++++++<-]>." + strings.Repeat("+", 33) + "."
	status, out, _ := run(t, code, "", 256, 10000)
	if status != "halted" || out != "Hi" {
		t.Fatalf("status=%s out=%q", status, out)
	}
}

func TestAnalisisLinealDeCodigoGrande(t *testing.T) {
	code := strings.Repeat("[", 20000) + strings.Repeat("]", 20000)
	start := time.Now()
	if _, e := Run(code, "", 256, 10); e != nil {
		t.Fatal(e)
	}
	if d := time.Since(start); d > 2*time.Second {
		t.Fatalf("el parser no es lineal: %v", d)
	}
}
