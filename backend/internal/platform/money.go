package platform

import (
	"errors"

	"tandaza/backend/internal/domain"
)

var ErrInvalidCommissionRate = errors.New("commission rate must be between 0 and 10000 basis points")

func CalculateCommission(grossMinor int64, rateBps int, currencyCode string) (domain.CommissionSplit, error) {
	if rateBps < 0 || rateBps > 10000 {
		return domain.CommissionSplit{}, ErrInvalidCommissionRate
	}
	commission := (grossMinor * int64(rateBps)) / 10000
	return domain.CommissionSplit{
		GrossMinor:      grossMinor,
		CommissionMinor: commission,
		PlatformMinor:   grossMinor - commission,
		RateBps:         rateBps,
		CurrencyCode:    currencyCode,
	}, nil
}
