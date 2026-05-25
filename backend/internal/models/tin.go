package models

import "time"

type Tin struct {
	ID            string     `json:"id"`
	Brand         string     `json:"brand"`
	BlendName     string     `json:"blend_name"`
	BlendType     string     `json:"blend_type"`
	Quantity      int        `json:"quantity"`
	TinSizeGrams  int        `json:"tin_size_grams"`
	Year          *int       `json:"year"`
	PurchaseDate  *time.Time `json:"purchase_date"`
	OpenedDate    *time.Time `json:"opened_date"`
	ContainerType string     `json:"container_type"`
	Status        string     `json:"status"`
	Notes         string     `json:"notes"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type TinInput struct {
	Brand         string  `json:"brand"`
	BlendName     string  `json:"blend_name"`
	BlendType     string  `json:"blend_type"`
	Quantity      int     `json:"quantity"`
	TinSizeGrams  int     `json:"tin_size_grams"`
	Year          *int    `json:"year"`
	PurchaseDate  *string `json:"purchase_date"`
	OpenedDate    *string `json:"opened_date"`
	ContainerType string  `json:"container_type"`
	Status        string  `json:"status"`
	Notes         string  `json:"notes"`
}

type StatusOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

type WeightOption struct {
	Value int    `json:"value"`
	Label string `json:"label"`
}

type Settings struct {
	BlendTypes []string       `json:"blend_types"`
	Statuses   []StatusOption `json:"statuses"`
	TinWeights []WeightOption `json:"tin_weights"`
}

type Stats struct {
	TotalTins         int `json:"total_tins"`
	TotalTobaccoGrams int `json:"total_tobacco_grams"`
	UnopenedTins      int `json:"unopened_tins"`
	OpenedTins        int `json:"opened_tins"`
	UniqueBlends      int `json:"unique_blends"`
	UniqueBrands      int `json:"unique_brands"`
}
