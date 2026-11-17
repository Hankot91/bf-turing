package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strings"
	"testing"
)

type golden struct {
	Name       string          `json:"name"`
	Endpoint   string          `json:"endpoint"`
	HTTPStatus int             `json:"httpStatus"`
	Request    json.RawMessage `json:"request"`
	Response   json.RawMessage `json:"response"`
}

// firstDiff devuelve la ruta del primer valor distinto entre dos JSON decodificados.
func firstDiff(path string, want, got interface{}) string {
	switch w := want.(type) {
	case map[string]interface{}:
		g, ok := got.(map[string]interface{})
		if !ok {
			return fmt.Sprintf("%s: se esperaba objeto, llegó %T", path, got)
		}
		keys := make([]string, 0, len(w))
		for k := range w {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			gv, exists := g[k]
			if !exists {
				return fmt.Sprintf("%s.%s: falta el campo", path, k)
			}
			if d := firstDiff(path+"."+k, w[k], gv); d != "" {
				return d
			}
		}
		for k := range g {
			if _, exists := w[k]; !exists {
				return fmt.Sprintf("%s.%s: campo extra no definido en el contrato", path, k)
			}
		}
	case []interface{}:
		g, ok := got.([]interface{})
		if !ok {
			return fmt.Sprintf("%s: se esperaba arreglo, llegó %v", path, got)
		}
		if len(w) != len(g) {
			return fmt.Sprintf("%s: longitud %d (esperada) vs %d (obtenida)", path, len(w), len(g))
		}
		for i := range w {
			if d := firstDiff(fmt.Sprintf("%s[%d]", path, i), w[i], g[i]); d != "" {
				return d
			}
		}
	default:
		if !reflect.DeepEqual(want, got) {
			return fmt.Sprintf("%s: esperado %v, obtenido %v", path, want, got)
		}
	}
	return ""
}

// TestGolden ejecuta cada ejemplo de docs/ejemplos contra el manejador real.
func TestGolden(t *testing.T) {
	files, err := filepath.Glob("../../docs/ejemplos/*.json")
	if err != nil || len(files) == 0 {
		t.Fatalf("no se encontraron golden files: %v", err)
	}
	for _, f := range files {
		raw, _ := os.ReadFile(f)
		var g golden
		if err := json.Unmarshal(raw, &g); err != nil {
			t.Fatalf("%s: JSON inválido: %v", f, err)
		}
		t.Run(g.Name, func(t *testing.T) {
			var h http.HandlerFunc
			switch {
			case strings.HasSuffix(g.Endpoint, "/api/run"):
				h = HandleRun
			case strings.HasSuffix(g.Endpoint, "/api/validate"):
				h = HandleValidate
			case strings.HasSuffix(g.Endpoint, "/api/export"):
				h = HandleExport
			default:
				t.Fatalf("endpoint desconocido %q", g.Endpoint)
			}
			rec := httptest.NewRecorder()
			h(rec, httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(g.Request)))
			if rec.Code != g.HTTPStatus {
				t.Errorf("HTTP %d, se esperaba %d", rec.Code, g.HTTPStatus)
			}
			var want, got interface{}
			json.Unmarshal(g.Response, &want)
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatalf("la respuesta no es JSON: %v", err)
			}
			if d := firstDiff("$", want, got); d != "" {
				t.Errorf("%s", d)
			}
		})
	}
}

func post(h http.HandlerFunc, body string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h(rec, httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body)))
	return rec
}

func TestErroresDePeticion(t *testing.T) {
	cases := []struct {
		name, body string
		h          http.HandlerFunc
		status     int
		code       string
	}{
		{"json malformado", `{"code":`, HandleRun, 400, "INVALID_JSON"},
		{"maxSteps negativo", `{"code":"+","maxSteps":-5}`, HandleRun, 400, "INVALID_STEP_LIMIT"},
		{"maxSteps enorme", `{"code":"+","maxSteps":5000000}`, HandleRun, 400, "STEP_LIMIT_TOO_HIGH"},
		{"cellSize 1", `{"code":"+","cellSize":1}`, HandleRun, 400, "INVALID_CELL_SIZE"},
		{"cellSize 300", `{"code":"+","cellSize":300}`, HandleRun, 400, "INVALID_CELL_SIZE"},
		{"entrada fuera de rango", `{"code":",","input":"€"}`, HandleRun, 400, "INVALID_INPUT"},
		{"modo inválido", `{"code":"+","mode":"x"}`, HandleExport, 400, "INVALID_MODE"},
		{"cuerpo gigante", `{"code":"` + strings.Repeat("+", 2<<20) + `"}`, HandleRun, 413, "REQUEST_TOO_LARGE"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			rec := post(c.h, c.body)
			if rec.Code != c.status {
				t.Fatalf("HTTP %d, se esperaba %d", rec.Code, c.status)
			}
			var e struct{ Error struct{ Code string } }
			json.Unmarshal(rec.Body.Bytes(), &e)
			if e.Error.Code != c.code {
				t.Fatalf("code %q, se esperaba %q", e.Error.Code, c.code)
			}
		})
	}
}

func TestMetodoNoPermitido(t *testing.T) {
	rec := httptest.NewRecorder()
	HandleRun(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if rec.Code != 405 {
		t.Fatalf("HTTP %d, se esperaba 405", rec.Code)
	}
}
