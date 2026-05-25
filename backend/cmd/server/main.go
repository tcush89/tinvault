package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/tinvault/backend/internal/db"
	"github.com/tinvault/backend/internal/handlers"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://tinvault:tinvault@localhost:5432/tinvault?sslmode=disable"
	}

	database, err := db.Connect(dbURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer database.Close()

	if err := db.Migrate(database); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
	}))

	h := handlers.New(database)

	r.Route("/api", func(r chi.Router) {
		r.Get("/health", handlers.Health)
		r.Get("/stats", h.GetStats)
		r.Get("/brands", h.GetBrandSuggestions)
		r.Get("/blends", h.GetBlendSuggestions)
		r.Get("/settings", h.GetSettings)
		r.Put("/settings", h.UpdateSettings)
		r.Post("/reset", h.ResetApp)
		r.Get("/export", h.ExportCSV)
		r.Get("/import/template", handlers.ExportTemplate)
		r.Post("/import", h.ImportCSV)
		r.Route("/tins", func(r chi.Router) {
			r.Get("/", h.ListTins)
			r.Post("/", h.CreateTin)
			r.Get("/{id}", h.GetTin)
			r.Put("/{id}", h.UpdateTin)
			r.Delete("/{id}", h.DeleteTin)
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("TinVault API listening on :%s", port)
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("server: %v", err)
	}
}
