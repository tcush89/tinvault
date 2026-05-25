package handlers

import (
	"net/http"

	"github.com/tinvault/backend/internal/models"
)

func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request) {
	var s models.Stats
	err := h.db.QueryRowContext(r.Context(), `
		SELECT
			COUNT(*)                                         AS total_tins,
			COALESCE(SUM(quantity * tin_size_grams), 0)     AS total_tobacco_grams,
			COUNT(*) FILTER (WHERE status IN ('aging_tin', 'aging_jar'))  AS unopened_tins,
			COUNT(*) FILTER (WHERE status = 'in_rotation')                 AS opened_tins,
			COUNT(DISTINCT blend_name)                      AS unique_blends,
			COUNT(DISTINCT brand)                           AS unique_brands
		FROM tins
	`).Scan(
		&s.TotalTins,
		&s.TotalTobaccoGrams,
		&s.UnopenedTins,
		&s.OpenedTins,
		&s.UniqueBlends,
		&s.UniqueBrands,
	)
	if err != nil {
		jsonError(w, "database error", http.StatusInternalServerError)
		return
	}
	jsonOK(w, s)
}
