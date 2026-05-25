package handlers

import "net/http"

const (
	defaultBlendTypes = `["Virginia","Burley","English/Latakia","Aromatic","Virginia/Perique","Turkish/Oriental","Other"]`
	defaultStatuses   = `[{"value":"aging_tin","label":"Aging (unopened tin)"},{"value":"aging_jar","label":"Aging (mason jar)"},{"value":"in_rotation","label":"In Rotation"}]`
	defaultTinWeights = `[{"value":50,"label":"50g"},{"value":100,"label":"100g"},{"value":200,"label":"200g"},{"value":250,"label":"250g"},{"value":28,"label":"1 oz (28g)"},{"value":57,"label":"2 oz (57g)"},{"value":113,"label":"4 oz (113g)"},{"value":227,"label":"8 oz (227g)"},{"value":454,"label":"1 lb (454g)"},{"value":907,"label":"2 lb (907g)"}]`
)

func (h *Handler) ResetApp(w http.ResponseWriter, r *http.Request) {
	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		jsonError(w, "database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(r.Context(), "TRUNCATE tins"); err != nil {
		jsonError(w, "database error", http.StatusInternalServerError)
		return
	}

	if _, err := tx.ExecContext(r.Context(),
		"UPDATE settings SET blend_types = $1, statuses = $2, tin_weights = $3 WHERE id = 1",
		defaultBlendTypes, defaultStatuses, defaultTinWeights,
	); err != nil {
		jsonError(w, "database error", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		jsonError(w, "database error", http.StatusInternalServerError)
		return
	}

	jsonOK(w, map[string]string{"status": "ok"})
}
