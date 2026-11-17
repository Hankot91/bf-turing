package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"bf-turing-backend/internal/server"
)

// corsMiddleware permite el origen configurado en CORS_ORIGIN (por defecto "*").
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	origin := os.Getenv("CORS_ORIGIN")
	if origin == "" {
		origin = "*"
	}
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/run", corsMiddleware(server.HandleRun))
	mux.HandleFunc("/api/validate", corsMiddleware(server.HandleValidate))
	mux.HandleFunc("/api/export", corsMiddleware(server.HandleExport))
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("ok")) })

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	log.Printf("Servidor iniciado en http://localhost:%s", port)
	log.Fatal(srv.ListenAndServe())
}
