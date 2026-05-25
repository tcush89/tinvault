package handlers

import (
	"net/http"
	"strings"
)

func (h *Handler) GetBrandSuggestions(w http.ResponseWriter, r *http.Request) {
	q := "%" + strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q"))) + "%"
	rows, err := h.db.QueryContext(r.Context(), `
		SELECT DISTINCT brand FROM tins
		WHERE LOWER(brand) LIKE $1
		ORDER BY brand
		LIMIT 10
	`, q)
	if err != nil {
		jsonError(w, "database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	brands := []string{}
	for rows.Next() {
		var b string
		if err := rows.Scan(&b); err != nil {
			continue
		}
		brands = append(brands, b)
	}
	jsonOK(w, brands)
}

type blendSuggestion struct {
	BlendName     string `json:"blend_name"`
	Brand         string `json:"brand"`
	BlendType     string `json:"blend_type"`
	ContainerType string `json:"container_type"`
}

func (h *Handler) GetBlendSuggestions(w http.ResponseWriter, r *http.Request) {
	q := "%" + strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q"))) + "%"
	rows, err := h.db.QueryContext(r.Context(), `
		SELECT DISTINCT ON (LOWER(blend_name)) blend_name, brand, blend_type, container_type
		FROM tins
		WHERE LOWER(blend_name) LIKE $1
		ORDER BY LOWER(blend_name), created_at DESC
		LIMIT 10
	`, q)
	if err != nil {
		jsonError(w, "database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	blends := []blendSuggestion{}
	for rows.Next() {
		var b blendSuggestion
		if err := rows.Scan(&b.BlendName, &b.Brand, &b.BlendType, &b.ContainerType); err != nil {
			continue
		}
		blends = append(blends, b)
	}
	jsonOK(w, blends)
}
