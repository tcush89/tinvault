package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/tinvault/backend/internal/models"
)

func (h *Handler) ListTins(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	search := strings.TrimSpace(q.Get("search"))
	blendType := q.Get("blend_type")
	status := q.Get("status")

	query := `SELECT id, brand, blend_name, blend_type, quantity, tin_size_grams, year,
	                 purchase_date, opened_date, container_type, status, notes, created_at, updated_at
	          FROM tins WHERE 1=1`
	args := []any{}
	idx := 1

	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		query += fmt.Sprintf(" AND (LOWER(brand) LIKE $%d OR LOWER(blend_name) LIKE $%d)", idx, idx+1)
		args = append(args, like, like)
		idx += 2
	}
	if blendType != "" {
		query += fmt.Sprintf(" AND blend_type = $%d", idx)
		args = append(args, blendType)
		idx++
	}
	if status != "" {
		query += fmt.Sprintf(" AND status = $%d", idx)
		args = append(args, status)
		idx++
	}
	query += " ORDER BY created_at DESC"

	rows, err := h.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		jsonError(w, "database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	tins := []models.Tin{}
	for rows.Next() {
		var t models.Tin
		if err := rows.Scan(
			&t.ID, &t.Brand, &t.BlendName, &t.BlendType, &t.Quantity,
			&t.TinSizeGrams, &t.Year, &t.PurchaseDate, &t.OpenedDate, &t.ContainerType,
			&t.Status, &t.Notes, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			jsonError(w, "scan error", http.StatusInternalServerError)
			return
		}
		tins = append(tins, t)
	}
	jsonOK(w, tins)
}

func (h *Handler) GetTin(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var t models.Tin
	err := h.db.QueryRowContext(r.Context(), `
		SELECT id, brand, blend_name, blend_type, quantity, tin_size_grams, year,
		       purchase_date, opened_date, container_type, status, notes, created_at, updated_at
		FROM tins WHERE id = $1
	`, id).Scan(
		&t.ID, &t.Brand, &t.BlendName, &t.BlendType, &t.Quantity,
		&t.TinSizeGrams, &t.Year, &t.PurchaseDate, &t.OpenedDate, &t.ContainerType,
		&t.Status, &t.Notes, &t.CreatedAt, &t.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		jsonError(w, "tin not found", http.StatusNotFound)
		return
	}
	if err != nil {
		jsonError(w, "database error", http.StatusInternalServerError)
		return
	}
	jsonOK(w, t)
}

func (h *Handler) CreateTin(w http.ResponseWriter, r *http.Request) {
	var input models.TinInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(input.Brand) == "" || strings.TrimSpace(input.BlendName) == "" {
		jsonError(w, "brand and blend_name are required", http.StatusBadRequest)
		return
	}
	if input.BlendType == "" {
		input.BlendType = "Other"
	}
	if input.Quantity <= 0 {
		input.Quantity = 1
	}
	if input.TinSizeGrams <= 0 {
		input.TinSizeGrams = 50
	}
	if input.Status == "" {
		input.Status = "aging_tin"
	}
	if input.ContainerType == "" {
		input.ContainerType = "tin"
	}

	var purchaseDate *string
	if input.PurchaseDate != nil && *input.PurchaseDate != "" {
		purchaseDate = input.PurchaseDate
	}
	var openedDate *string
	if input.OpenedDate != nil && *input.OpenedDate != "" {
		openedDate = input.OpenedDate
	}

	var t models.Tin
	err := h.db.QueryRowContext(r.Context(), `
		INSERT INTO tins (brand, blend_name, blend_type, quantity, tin_size_grams, year, purchase_date, opened_date, container_type, status, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, brand, blend_name, blend_type, quantity, tin_size_grams, year,
		          purchase_date, opened_date, container_type, status, notes, created_at, updated_at
	`, input.Brand, input.BlendName, input.BlendType, input.Quantity, input.TinSizeGrams,
		input.Year, purchaseDate, openedDate, input.ContainerType, input.Status, input.Notes,
	).Scan(
		&t.ID, &t.Brand, &t.BlendName, &t.BlendType, &t.Quantity,
		&t.TinSizeGrams, &t.Year, &t.PurchaseDate, &t.OpenedDate, &t.ContainerType,
		&t.Status, &t.Notes, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		jsonError(w, "database error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(t)
}

func (h *Handler) UpdateTin(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var input models.TinInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(input.Brand) == "" || strings.TrimSpace(input.BlendName) == "" {
		jsonError(w, "brand and blend_name are required", http.StatusBadRequest)
		return
	}

	var purchaseDate *string
	if input.PurchaseDate != nil && *input.PurchaseDate != "" {
		purchaseDate = input.PurchaseDate
	}
	var openedDate *string
	if input.OpenedDate != nil && *input.OpenedDate != "" {
		openedDate = input.OpenedDate
	}
	if input.ContainerType == "" {
		input.ContainerType = "tin"
	}

	var t models.Tin
	err := h.db.QueryRowContext(r.Context(), `
		UPDATE tins
		SET brand=$1, blend_name=$2, blend_type=$3, quantity=$4, tin_size_grams=$5,
		    year=$6, purchase_date=$7, opened_date=$8, container_type=$9, status=$10, notes=$11, updated_at=NOW()
		WHERE id=$12
		RETURNING id, brand, blend_name, blend_type, quantity, tin_size_grams, year,
		          purchase_date, opened_date, container_type, status, notes, created_at, updated_at
	`, input.Brand, input.BlendName, input.BlendType, input.Quantity, input.TinSizeGrams,
		input.Year, purchaseDate, openedDate, input.ContainerType, input.Status, input.Notes, id,
	).Scan(
		&t.ID, &t.Brand, &t.BlendName, &t.BlendType, &t.Quantity,
		&t.TinSizeGrams, &t.Year, &t.PurchaseDate, &t.OpenedDate, &t.ContainerType,
		&t.Status, &t.Notes, &t.CreatedAt, &t.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		jsonError(w, "tin not found", http.StatusNotFound)
		return
	}
	if err != nil {
		jsonError(w, "database error", http.StatusInternalServerError)
		return
	}
	jsonOK(w, t)
}

func (h *Handler) DeleteTin(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	result, err := h.db.ExecContext(r.Context(), "DELETE FROM tins WHERE id = $1", id)
	if err != nil {
		jsonError(w, "database error", http.StatusInternalServerError)
		return
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		jsonError(w, "tin not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
