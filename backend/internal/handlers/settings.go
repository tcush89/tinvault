package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/tinvault/backend/internal/models"
)

func (h *Handler) GetSettings(w http.ResponseWriter, r *http.Request) {
	var blendTypesRaw, statusesRaw, tinWeightsRaw string
	err := h.db.QueryRowContext(r.Context(),
		"SELECT blend_types, statuses, tin_weights FROM settings WHERE id = 1",
	).Scan(&blendTypesRaw, &statusesRaw, &tinWeightsRaw)
	if err != nil {
		jsonError(w, "database error", http.StatusInternalServerError)
		return
	}

	var s models.Settings
	if err := json.Unmarshal([]byte(blendTypesRaw), &s.BlendTypes); err != nil {
		jsonError(w, "parse error", http.StatusInternalServerError)
		return
	}
	if err := json.Unmarshal([]byte(statusesRaw), &s.Statuses); err != nil {
		jsonError(w, "parse error", http.StatusInternalServerError)
		return
	}
	if err := json.Unmarshal([]byte(tinWeightsRaw), &s.TinWeights); err != nil {
		jsonError(w, "parse error", http.StatusInternalServerError)
		return
	}
	jsonOK(w, s)
}

func (h *Handler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var input models.Settings
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	clean := input.BlendTypes[:0]
	for _, t := range input.BlendTypes {
		if strings.TrimSpace(t) != "" {
			clean = append(clean, strings.TrimSpace(t))
		}
	}
	input.BlendTypes = clean

	if len(input.BlendTypes) == 0 {
		jsonError(w, "blend_types cannot be empty", http.StatusBadRequest)
		return
	}
	if len(input.Statuses) == 0 {
		jsonError(w, "statuses cannot be empty", http.StatusBadRequest)
		return
	}
	if len(input.TinWeights) == 0 {
		jsonError(w, "tin_weights cannot be empty", http.StatusBadRequest)
		return
	}

	blendTypesJSON, _ := json.Marshal(input.BlendTypes)
	statusesJSON, _ := json.Marshal(input.Statuses)
	tinWeightsJSON, _ := json.Marshal(input.TinWeights)

	_, err := h.db.ExecContext(r.Context(),
		"UPDATE settings SET blend_types = $1, statuses = $2, tin_weights = $3 WHERE id = 1",
		string(blendTypesJSON), string(statusesJSON), string(tinWeightsJSON),
	)
	if err != nil {
		jsonError(w, "database error", http.StatusInternalServerError)
		return
	}
	jsonOK(w, input)
}
