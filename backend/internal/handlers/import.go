package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const importTemplateCSV = `brand,blend_name,blend_type,quantity,tin_size_grams,year,purchase_date,opened_date,container_type,status,notes
Peterson,Standard Mixture,English/Latakia,2,100,2021,2021-06-15,,tin,aging_tin,"Rich and smoky"
G.L. Pease,Odyssey,Virginia/Perique,1,57,2020,,2023-03-01,tin,in_rotation,
Dunhill,Early Morning Pipe,Virginia,3,50,,,,,aging_tin,Still sealed from purchase
Cornell & Diehl,Autumn Evening,Aromatic,1,227,,,,,aging_jar,Transferred to mason jar
`

func ExportTemplate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="tinvault_import_template.csv"`)
	w.Write([]byte(importTemplateCSV))
}

type importRow struct {
	brand, blendName, blendType, containerType, status, notes string
	quantity, tinSizeGrams                                     int
	year                                                       *int
	purchaseDate, openedDate                                   *string
}

func (h *Handler) ImportCSV(w http.ResponseWriter, r *http.Request) {
	r.ParseMultipartForm(10 << 20)
	file, _, err := r.FormFile("file")
	if err != nil {
		jsonError(w, "no file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	cr := csv.NewReader(file)
	cr.TrimLeadingSpace = true

	headers, err := cr.Read()
	if err != nil {
		jsonError(w, "failed to read CSV header", http.StatusBadRequest)
		return
	}

	colIdx := map[string]int{}
	for i, h := range headers {
		colIdx[strings.TrimSpace(strings.ToLower(h))] = i
	}
	for _, req := range []string{"brand", "blend_name"} {
		if _, ok := colIdx[req]; !ok {
			jsonError(w, fmt.Sprintf("missing required column: %s", req), http.StatusBadRequest)
			return
		}
	}

	get := func(record []string, col string) string {
		idx, ok := colIdx[col]
		if !ok || idx >= len(record) {
			return ""
		}
		return strings.TrimSpace(record[idx])
	}

	var rows []importRow
	var errs []string
	rowNum := 1

	for {
		record, err := cr.Read()
		if err == io.EOF {
			break
		}
		rowNum++
		if err != nil {
			errs = append(errs, fmt.Sprintf("row %d: %v", rowNum, err))
			continue
		}

		brand := get(record, "brand")
		blendName := get(record, "blend_name")
		if brand == "" || blendName == "" {
			errs = append(errs, fmt.Sprintf("row %d: brand and blend_name are required", rowNum))
			continue
		}

		quantity := 1
		if q := get(record, "quantity"); q != "" {
			v, err := strconv.Atoi(q)
			if err != nil || v <= 0 {
				errs = append(errs, fmt.Sprintf("row %d: invalid quantity %q", rowNum, q))
				continue
			}
			quantity = v
		}

		tinSizeGrams := 50
		if t := get(record, "tin_size_grams"); t != "" {
			v, err := strconv.Atoi(t)
			if err != nil || v <= 0 {
				errs = append(errs, fmt.Sprintf("row %d: invalid tin_size_grams %q", rowNum, t))
				continue
			}
			tinSizeGrams = v
		}

		blendType := get(record, "blend_type")
		if blendType == "" {
			blendType = "Other"
		}

		containerType := get(record, "container_type")
		if containerType == "" {
			containerType = "tin"
		}

		status := get(record, "status")
		if status == "" {
			status = "aging_tin"
		}

		var year *int
		if y := get(record, "year"); y != "" {
			v, err := strconv.Atoi(y)
			if err != nil || v < 1900 || v > 2099 {
				errs = append(errs, fmt.Sprintf("row %d: invalid year %q", rowNum, y))
				continue
			}
			year = &v
		}

		var purchaseDate *string
		if pd := get(record, "purchase_date"); pd != "" {
			if _, err := time.Parse("2006-01-02", pd); err != nil {
				errs = append(errs, fmt.Sprintf("row %d: invalid purchase_date %q (expected YYYY-MM-DD)", rowNum, pd))
				continue
			}
			purchaseDate = &pd
		}

		var openedDate *string
		if od := get(record, "opened_date"); od != "" {
			if _, err := time.Parse("2006-01-02", od); err != nil {
				errs = append(errs, fmt.Sprintf("row %d: invalid opened_date %q (expected YYYY-MM-DD)", rowNum, od))
				continue
			}
			openedDate = &od
		}

		rows = append(rows, importRow{
			brand: brand, blendName: blendName, blendType: blendType,
			quantity: quantity, tinSizeGrams: tinSizeGrams,
			year: year, purchaseDate: purchaseDate, openedDate: openedDate,
			containerType: containerType, status: status, notes: get(record, "notes"),
		})
	}

	if len(errs) > 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"errors": errs, "imported": 0})
		return
	}

	if len(rows) == 0 {
		jsonError(w, "CSV contains no data rows", http.StatusBadRequest)
		return
	}

	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		jsonError(w, "database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	for _, row := range rows {
		_, err := tx.ExecContext(r.Context(), `
			INSERT INTO tins (brand, blend_name, blend_type, quantity, tin_size_grams, year, purchase_date, opened_date, container_type, status, notes)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		`, row.brand, row.blendName, row.blendType, row.quantity, row.tinSizeGrams,
			row.year, row.purchaseDate, row.openedDate, row.containerType, row.status, row.notes)
		if err != nil {
			jsonError(w, "database error", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		jsonError(w, "database error", http.StatusInternalServerError)
		return
	}

	jsonOK(w, map[string]interface{}{"imported": len(rows)})
}
