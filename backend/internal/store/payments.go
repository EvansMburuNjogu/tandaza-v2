package store

import "tandaza/backend/internal/domain"

func paymentProcessingFeeMinor(amountMinor int64, settings domain.PaystackSettings) int64 {
	if amountMinor <= 0 || settings.ProcessingFeeBps <= 0 {
		return 0
	}
	if settings.ProcessingFeeBps >= 10000 {
		return 0
	}
	gross := ceilDiv(amountMinor*10000, int64(10000-settings.ProcessingFeeBps))
	if gross <= amountMinor {
		return 0
	}
	return gross - amountMinor
}

func paymentCommissionBaseMinor(payment domain.Payment) int64 {
	base := payment.AmountMinor - payment.ProcessingFeeMinor
	if base < 0 {
		return 0
	}
	return base
}

func ceilDiv(numerator int64, denominator int64) int64 {
	if denominator <= 0 {
		return numerator
	}
	return (numerator + denominator - 1) / denominator
}
