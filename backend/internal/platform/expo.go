package platform

import (
	"errors"
	"strings"
	"time"

	"tandaza/backend/internal/domain"
)

var (
	ErrInvalidExpoInput        = errors.New("invalid expo input")
	ErrInvalidExpoStatus       = errors.New("invalid expo status")
	ErrInvalidStatusTransition = errors.New("invalid expo status transition")
	ErrForbiddenExpoMutation   = errors.New("forbidden expo mutation")
)

func ValidateExpoInput(input domain.ExpoInput, actorRole domain.Role) error {
	if strings.TrimSpace(input.Name) == "" || strings.TrimSpace(input.City) == "" || strings.TrimSpace(input.Venue) == "" {
		return ErrInvalidExpoInput
	}
	if strings.TrimSpace(input.CountryCode) == "" || strings.TrimSpace(input.CurrencyCode) == "" || strings.TrimSpace(input.Timezone) == "" {
		return ErrInvalidExpoInput
	}
	start, err := time.Parse("2006-01-02", input.StartDate)
	if err != nil {
		return ErrInvalidExpoInput
	}
	end, err := time.Parse("2006-01-02", input.EndDate)
	if err != nil {
		return ErrInvalidExpoInput
	}
	if end.Before(start) {
		return ErrInvalidExpoInput
	}
	if input.OrganizerCommissionBps < 0 || input.OrganizerCommissionBps > 10000 {
		return ErrInvalidExpoInput
	}
	if input.ExhibitorActivationFeeMinor < 0 || input.AdsAddonFeeMinor < 0 {
		return ErrInvalidExpoInput
	}
	if input.ExhibitorActivationFeeMinor%100 != 0 || input.AdsAddonFeeMinor%100 != 0 {
		return ErrInvalidExpoInput
	}
	if actorRole == domain.RoleOrganizer && input.OrganizerCommissionBps != 0 {
		return ErrForbiddenExpoMutation
	}
	return nil
}

func ValidateStatusTransition(role domain.Role, from domain.ExpoStatus, to domain.ExpoStatus) error {
	if _, ok := domain.ParseExpoStatus(string(to)); !ok {
		return ErrInvalidExpoStatus
	}
	if role == domain.RoleAdministrator || role == domain.RoleSuperAdmin {
		return nil
	}
	if role != domain.RoleOrganizer {
		return ErrForbiddenExpoMutation
	}
	if (from == domain.ExpoDraft || from == domain.ExpoNeedsChanges) && to == domain.ExpoSubmittedForReview {
		return nil
	}
	return ErrInvalidStatusTransition
}

func OrganizerCanEdit(status domain.ExpoStatus) bool {
	return status == domain.ExpoDraft || status == domain.ExpoNeedsChanges
}
