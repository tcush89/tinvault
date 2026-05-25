package handlers

import (
	"encoding/csv"
	"net/http"
	"strconv"
)

func (h *Handler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.QueryContext(r.Context(), `
		SELECT brand, blend_name, blend_type, quantity, tin_size_grams,
		       COALESCE(year::text, ''),
		       COALESCE(TO_CHAR(purchase_date, 'YYYY-MM-DD'), ''),
		       COALESCE(TO_CHAR(opened_date, 'YYYY-MM-DD'), ''),
		       container_type, status, notes
		FROM tins ORDER BY brand, blend_name
	`)
	if err != nil {
		jsonError(w, "database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="tinvault_cellar.csv"`)

	cw := csv.NewWriter(w)
	cw.Write([]string{"brand", "blend_name", "blend_type", "quantity", "tin_size_grams", "year", "purchase_date", "opened_date", "container_type", "status", "notes"})

	for rows.Next() {
		var brand, blendName, blendType, yearStr, pdStr, odStr, containerType, status, notes string
		var quantity, tinSizeGrams int
		if err := rows.Scan(&brand, &blendName, &blendType, &quantity, &tinSizeGrams, &yearStr, &pdStr, &odStr, &containerType, &status, &notes); err != nil {
			continue
		}
		cw.Write([]string{
			brand, blendName, blendType,
			strconv.Itoa(quantity), strconv.Itoa(tinSizeGrams),
			yearStr, pdStr, odStr, containerType, status, notes,
		})
	}
	cw.Flush()
}
