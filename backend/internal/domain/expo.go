package domain

import (
	"fmt"
	"strings"
	"time"
)

var AllExpoStatuses = []ExpoStatus{
	ExpoDraft,
	ExpoSubmittedForReview,
	ExpoNeedsChanges,
	ExpoApproved,
	ExpoPublished,
	ExpoLive,
	ExpoCompleted,
	ExpoSettlementPending,
	ExpoSettled,
	ExpoArchived,
}

func ParseExpoStatus(value string) (ExpoStatus, bool) {
	normalized := ExpoStatus(strings.TrimSpace(strings.ToLower(value)))
	for _, status := range AllExpoStatuses {
		if normalized == status {
			return status, true
		}
	}
	return "", false
}

func FormatExpoDateRange(start time.Time, end time.Time) string {
	if start.IsZero() || end.IsZero() {
		return ""
	}
	if start.Year() == end.Year() && start.Month() == end.Month() {
		return fmt.Sprintf("%02d %s - %02d %s %d", start.Day(), start.Format("Jan"), end.Day(), end.Format("Jan"), end.Year())
	}
	return fmt.Sprintf("%02d %s %d - %02d %s %d", start.Day(), start.Format("Jan"), start.Year(), end.Day(), end.Format("Jan"), end.Year())
}

func ToExpoRecord(expo Expo) ExpoRecord {
	location := strings.TrimSpace(expo.Venue)
	if expo.City != "" {
		if location != "" {
			location += ", "
		}
		location += expo.City
	}
	return ExpoRecord{
		ID:                          expo.ID,
		Name:                        expo.Name,
		Description:                 expo.Description,
		Location:                    location,
		City:                        expo.City,
		Venue:                       expo.Venue,
		CountryCode:                 expo.CountryCode,
		Dates:                       FormatExpoDateRange(expo.StartDate, expo.EndDate),
		OrganizerID:                 expo.OrganizerID,
		Organizer:                   expo.OrganizerName,
		StartDate:                   expo.StartDate.Format("2006-01-02"),
		EndDate:                     expo.EndDate.Format("2006-01-02"),
		Currency:                    expo.CurrencyCode,
		Timezone:                    expo.Timezone,
		CoverImageURL:               expo.CoverImageURL,
		CoverImage:                  expo.CoverImageURL,
		ExhibitorFee:                expo.ExhibitorActivationFeeMinor / 100,
		ExhibitorActivationFeeMinor: expo.ExhibitorActivationFeeMinor,
		AdsAddonFee:                 expo.AdsAddonFeeMinor / 100,
		AdsAddonFeeMinor:            expo.AdsAddonFeeMinor,
		OrganizerCommissionBps:      expo.OrganizerCommissionBps,
		OrganizerCommissionRate:     float64(expo.OrganizerCommissionBps) / 100,
		Exhibitors:                  expo.ExhibitorCount,
		Status:                      expo.Status,
		Categories:                  expo.Categories,
	}
}

func ToExpoRecords(expos []Expo) []ExpoRecord {
	records := make([]ExpoRecord, 0, len(expos))
	for _, expo := range expos {
		records = append(records, ToExpoRecord(expo))
	}
	return records
}
