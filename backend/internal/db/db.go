package db

import (
	"database/sql"
	"fmt"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func Connect(url string) (*sql.DB, error) {
	db, err := sql.Open("pgx", url)
	if err != nil {
		return nil, fmt.Errorf("open: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping: %w", err)
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	return db, nil
}

func Migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE EXTENSION IF NOT EXISTS "pgcrypto";

		CREATE TABLE IF NOT EXISTS tins (
			id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
			brand          VARCHAR(255) NOT NULL,
			blend_name     VARCHAR(255) NOT NULL,
			blend_type     VARCHAR(50)  NOT NULL DEFAULT 'Other',
			quantity       INTEGER      NOT NULL DEFAULT 1,
			tin_size_grams INTEGER      NOT NULL DEFAULT 50,
			year           INTEGER,
			purchase_date  DATE,
			opened_date    DATE,
			container_type VARCHAR(10)  NOT NULL DEFAULT 'tin',
			status         VARCHAR(50)  NOT NULL DEFAULT 'aging_tin',
			notes          TEXT         NOT NULL DEFAULT '',
			created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
			updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS idx_tins_brand      ON tins(brand);
		CREATE INDEX IF NOT EXISTS idx_tins_blend_type ON tins(blend_type);
		CREATE INDEX IF NOT EXISTS idx_tins_status     ON tins(status);

		CREATE TABLE IF NOT EXISTS settings (
			id          INTEGER PRIMARY KEY DEFAULT 1,
			blend_types JSONB   NOT NULL DEFAULT '["Virginia","Burley","English/Latakia","Aromatic","Virginia/Perique","Turkish/Oriental","Other"]',
			statuses    JSONB   NOT NULL DEFAULT '[{"value":"aging_tin","label":"Aging (unopened tin)"},{"value":"aging_jar","label":"Aging (mason jar)"},{"value":"in_rotation","label":"In Rotation"}]',
			tin_weights JSONB   NOT NULL DEFAULT '[{"value":50,"label":"50g"},{"value":100,"label":"100g"},{"value":200,"label":"200g"},{"value":250,"label":"250g"},{"value":28,"label":"1 oz (28g)"},{"value":57,"label":"2 oz (57g)"},{"value":113,"label":"4 oz (113g)"},{"value":227,"label":"8 oz (227g)"},{"value":454,"label":"1 lb (454g)"},{"value":907,"label":"2 lb (907g)"}]',
			CONSTRAINT settings_single_row CHECK (id = 1)
		);
		ALTER TABLE settings ADD COLUMN IF NOT EXISTS tin_weights JSONB NOT NULL DEFAULT '[{"value":50,"label":"50g"},{"value":100,"label":"100g"},{"value":200,"label":"200g"},{"value":250,"label":"250g"},{"value":28,"label":"1 oz (28g)"},{"value":57,"label":"2 oz (57g)"},{"value":113,"label":"4 oz (113g)"},{"value":227,"label":"8 oz (227g)"},{"value":454,"label":"1 lb (454g)"},{"value":907,"label":"2 lb (907g)"}]';
		ALTER TABLE tins ADD COLUMN IF NOT EXISTS opened_date DATE;
		ALTER TABLE tins ADD COLUMN IF NOT EXISTS container_type VARCHAR(10) NOT NULL DEFAULT 'tin';
		INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;
	`)
	return err
}
