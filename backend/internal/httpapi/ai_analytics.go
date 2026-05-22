package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"tandaza/backend/internal/domain"
	"tandaza/backend/internal/store"
)

type aiSummaryResult struct {
	Summary         string   `json:"summary"`
	Risks           []string `json:"risks"`
	Opportunities   []string `json:"opportunities"`
	Recommendations []string `json:"recommendations"`
	NextActions     []string `json:"nextActions"`
	ConfidenceNotes string   `json:"confidenceNotes"`
}

func (s *Server) adminReportsAISummary(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	s.writeCachedAISummary(w, r, "admin_country", "platform", adminCountryFilter(r))
}

func (s *Server) adminGenerateReportsAISummary(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleAdministrator)
	if !ok {
		return
	}
	countryCode := adminCountryFilter(r)
	expos, _ := s.store.ListExpos(r.Context(), store.ExpoFilter{CountryCode: countryCode})
	payments, _ := s.store.ListPayments(r.Context(), store.PaymentFilter{CountryCode: countryCode})
	leads, _ := s.store.ListLeads(r.Context(), store.LeadFilter{CountryCode: countryCode})
	notifications, _ := s.store.ListNotifications(r.Context(), store.NotificationFilter{})
	metrics := adminAISourceMetrics(expos, payments, leads, notifications)
	summary := s.generateAndSaveAISummary(r.Context(), actor, "admin_country", "platform", countryCode, "Admin country performance", metrics)
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "ai_summary_generated", EntityType: "analytics", EntityID: "admin_reports", Metadata: map[string]any{"scope": "admin_country", "countryCode": countryCode}})
	writeJSON(w, http.StatusOK, summary)
}

func (s *Server) organizerReportsAISummary(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	s.writeCachedAISummary(w, r, "organizer", claims.UserID, "")
}

func (s *Server) organizerGenerateReportsAISummary(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	expos, _ := s.store.ListExpos(r.Context(), store.ExpoFilter{OrganizerID: actor.ID})
	payments, _ := s.store.ListPayments(r.Context(), store.PaymentFilter{OrganizerID: actor.ID})
	leads, _ := s.store.ListLeads(r.Context(), store.LeadFilter{OrganizerID: actor.ID})
	metrics := organizerAISourceMetrics(expos, payments, leads)
	summary := s.generateAndSaveAISummary(r.Context(), actor, "organizer", actor.ID, "", "Organizer expo performance", metrics)
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "ai_summary_generated", EntityType: "analytics", EntityID: "organizer_reports", Metadata: map[string]any{"scope": "organizer"}})
	writeJSON(w, http.StatusOK, summary)
}

func (s *Server) exhibitorExpoAnalyticsAISummary(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	s.writeCachedAISummary(w, r, "exhibitor_expo", r.PathValue("id")+":"+exhibitorID, "")
}

func (s *Server) exhibitorGenerateExpoAnalyticsAISummary(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), actor.ID)
	expoID := r.PathValue("id")
	leads, _ := s.store.ListLeads(r.Context(), store.LeadFilter{ExpoID: expoID, ExhibitorID: exhibitorID})
	payments, _ := s.store.ListPayments(r.Context(), store.PaymentFilter{ExpoID: expoID, PayerID: exhibitorID})
	ads, _ := s.store.ListSponsorAds(r.Context(), store.SponsorAdFilter{ExpoID: expoID, SponsorID: exhibitorID})
	products, _ := s.store.ListProducts(r.Context(), store.ProductFilter{ExpoID: expoID, ExhibitorID: exhibitorID})
	meetings, _ := s.store.ListMeetings(r.Context(), store.MeetingFilter{ExpoID: expoID, ExhibitorID: exhibitorID})
	feedback, _ := s.store.ListExhibitorFeedback(r.Context(), store.ExhibitorFeedbackFilter{ExpoID: expoID, ExhibitorID: exhibitorID})
	documents, _ := s.store.ListExpoDocuments(r.Context(), expoID, exhibitorID)
	metrics := exhibitorAISourceMetrics(leads, payments, ads, products, meetings, feedback, documents)
	summary := s.generateAndSaveAISummary(r.Context(), actor, "exhibitor_expo", expoID+":"+exhibitorID, "", "Exhibitor expo workspace performance", metrics)
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: expoID, Action: "ai_summary_generated", EntityType: "analytics", EntityID: "exhibitor_expo", Metadata: map[string]any{"scope": "exhibitor_expo"}})
	writeJSON(w, http.StatusOK, summary)
}

func (s *Server) sponsorReportsAISummary(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleSponsor)
	if !ok {
		return
	}
	s.writeCachedAISummary(w, r, "sponsor", claims.UserID, "")
}

func (s *Server) sponsorGenerateReportsAISummary(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleSponsor)
	if !ok {
		return
	}
	campaigns, _ := s.store.ListSponsorCampaigns(r.Context(), actor.ID)
	ads, _ := s.store.ListSponsorAds(r.Context(), store.SponsorAdFilter{SponsorID: actor.ID})
	payments, _ := s.store.ListSponsorPayments(r.Context(), actor.ID)
	metrics := sponsorAISourceMetrics(campaigns, ads, payments)
	summary := s.generateAndSaveAISummary(r.Context(), actor, "sponsor", actor.ID, "", "Sponsor campaign performance", metrics)
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "ai_summary_generated", EntityType: "analytics", EntityID: "sponsor_reports", Metadata: map[string]any{"scope": "sponsor"}})
	writeJSON(w, http.StatusOK, summary)
}

func (s *Server) writeCachedAISummary(w http.ResponseWriter, r *http.Request, scope string, scopeID string, countryCode string) {
	summary, err := s.store.LatestAIAnalyticsSummary(r.Context(), scope, scopeID, countryCode)
	if err != nil {
		writeJSON(w, http.StatusOK, domain.AIAnalyticsSummary{Scope: scope, ScopeID: scopeID, CountryCode: countryCode, Summary: "No AI performance summary has been generated yet.", Status: "fallback", GeneratedAt: ""})
		return
	}
	writeJSON(w, http.StatusOK, summary)
}

func (s *Server) generateAndSaveAISummary(ctx context.Context, actor domain.User, scope string, scopeID string, countryCode string, title string, metrics map[string]any) domain.AIAnalyticsSummary {
	settings, _ := s.store.OpenAISettings(ctx)
	result, status, failure := deterministicAISummary(title, metrics), "fallback", ""
	model := settings.Model
	if settings.Enabled && strings.TrimSpace(settings.APIKey) != "" {
		if generated, err := s.generateAISummaryWithOpenAI(ctx, settings, title, metrics); err == nil {
			result = generated
			status = "ready"
		} else {
			failure = err.Error()
		}
	}
	summary := domain.AIAnalyticsSummary{
		ID:              fmt.Sprintf("ais_%d", time.Now().UTC().UnixNano()),
		Scope:           scope,
		ScopeID:         scopeID,
		CountryCode:     countryCode,
		Summary:         result.Summary,
		Risks:           result.Risks,
		Opportunities:   result.Opportunities,
		Recommendations: result.Recommendations,
		NextActions:     result.NextActions,
		ConfidenceNotes: result.ConfidenceNotes,
		SourceMetrics:   metrics,
		GeneratedBy:     actor.ID,
		GeneratedAt:     time.Now().UTC().Format(time.RFC3339),
		Provider:        "openai",
		Model:           model,
		Status:          status,
		ErrorMessage:    failure,
	}
	saved, err := s.store.SaveAIAnalyticsSummary(ctx, summary)
	if err != nil {
		return summary
	}
	return saved
}

func (s *Server) generateAISummaryWithOpenAI(ctx context.Context, settings domain.OpenAISettings, title string, metrics map[string]any) (aiSummaryResult, error) {
	schema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"summary":         map[string]any{"type": "string"},
			"risks":           map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
			"opportunities":   map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
			"recommendations": map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
			"nextActions":     map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
			"confidenceNotes": map[string]any{"type": "string"},
		},
		"required":             []string{"summary", "risks", "opportunities", "recommendations", "nextActions", "confidenceNotes"},
		"additionalProperties": false,
	}
	body := map[string]any{
		"model": firstNonEmptyString(settings.Model, "gpt-4.1-mini"),
		"input": []map[string]string{
			{"role": "system", "content": "You are Tandaza's expo analytics analyst. Analyse every aggregated data point provided. Do not infer private personal data. Return concise, practical recommendations for improving exhibitor expo performance, follow-up, product interest, visitor engagement, payments, ads, and post-expo outcomes."},
			{"role": "user", "content": mustJSON(map[string]any{"title": title, "metrics": metrics})},
		},
		"text": map[string]any{"format": map[string]any{"type": "json_schema", "name": "tandaza_ai_analytics_summary", "strict": true, "schema": schema}},
	}
	payload, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/responses", strings.NewReader(string(payload)))
	if err != nil {
		return aiSummaryResult{}, err
	}
	req.Header.Set("Authorization", "Bearer "+settings.APIKey)
	req.Header.Set("Content-Type", "application/json")
	response, err := (&http.Client{Timeout: 30 * time.Second}).Do(req)
	if err != nil {
		return aiSummaryResult{}, err
	}
	defer response.Body.Close()
	var decoded map[string]any
	if err := json.NewDecoder(response.Body).Decode(&decoded); err != nil {
		return aiSummaryResult{}, err
	}
	if response.StatusCode < 200 || response.StatusCode > 299 {
		return aiSummaryResult{}, fmt.Errorf("openai returned HTTP %d", response.StatusCode)
	}
	text := outputTextFromOpenAIResponse(decoded)
	if strings.TrimSpace(text) == "" {
		return aiSummaryResult{}, fmt.Errorf("openai response did not include output text")
	}
	var result aiSummaryResult
	if err := json.Unmarshal([]byte(text), &result); err != nil {
		return aiSummaryResult{}, err
	}
	return result, nil
}

func outputTextFromOpenAIResponse(decoded map[string]any) string {
	if value, ok := decoded["output_text"].(string); ok {
		return value
	}
	output, _ := decoded["output"].([]any)
	for _, item := range output {
		obj, _ := item.(map[string]any)
		content, _ := obj["content"].([]any)
		for _, c := range content {
			contentObj, _ := c.(map[string]any)
			if text, ok := contentObj["text"].(string); ok {
				return text
			}
		}
	}
	return ""
}

func deterministicAISummary(title string, metrics map[string]any) aiSummaryResult {
	return aiSummaryResult{
		Summary:         "Workspace analytics are using saved visitor, lead, meeting, pre-order, product, and payment signals. Use the charts below to prioritise follow-up and product focus.",
		Risks:           []string{"Some recommendations may be limited until more visitor, lead, payment, and product engagement data is captured."},
		Opportunities:   []string{"Use the current charts and source metrics to identify revenue, engagement, and follow-up priorities."},
		Recommendations: []string{"Review low-conversion areas first.", "Refresh this summary after new payments, leads, or ad activity are recorded."},
		NextActions:     []string{"Prioritise hot leads and overdue follow-ups.", "Generate a fresh summary after new reporting activity is recorded."},
		ConfidenceNotes: "Generated from aggregated Tandaza performance metrics only.",
	}
}

func adminAISourceMetrics(expos []domain.Expo, payments []domain.Payment, leads []domain.LeadRecord, notifications []domain.Notification) map[string]any {
	return map[string]any{"expos": len(expos), "expoStatus": expoStatusCounts(expos), "payments": paymentStatusCounts(payments), "paidVolume": paidPaymentVolume(payments), "processingFees": processingFeeVolume(payments), "leads": len(leads), "leadStatus": leadStatusCounts(leads), "notifications": notificationStatusCounts(notifications)}
}

func organizerAISourceMetrics(expos []domain.Expo, payments []domain.Payment, leads []domain.LeadRecord) map[string]any {
	return map[string]any{"ownedExpos": len(expos), "expoStatus": expoStatusCounts(expos), "payments": paymentStatusCounts(payments), "paidVolume": paidPaymentVolume(payments), "leads": len(leads), "leadStatus": leadStatusCounts(leads)}
}

func exhibitorAISourceMetrics(leads []domain.LeadRecord, payments []domain.Payment, ads []domain.SponsorAdRecord, products []domain.ProductRecord, meetings []domain.MeetingRecord, feedback []domain.ExhibitorFeedbackRecord, documents []domain.ExpoDocumentRecord) map[string]any {
	preOrders := preOrdersFromLeads(leads)
	uniqueVisitors := exhibitorVisitorsFromLeads(leads)
	totalPreOrderValue := int64(0)
	totalPreOrderQuantity := 0
	preOrderStatus := map[string]int{}
	preOrderByDay := map[string]int{}
	preOrderValueByCurrency := map[string]int64{}
	for _, item := range preOrders {
		status, _ := item["status"].(string)
		currency, _ := item["currency"].(string)
		createdAt, _ := item["createdAt"].(string)
		amount := anyInt64(item["amount"])
		quantity := int(anyInt64(item["quantity"]))
		preOrderStatus[status]++
		preOrderByDay[dateOnlyKey(createdAt)]++
		preOrderValueByCurrency[strings.ToUpper(strings.TrimSpace(currency))] += amount
		totalPreOrderValue += amount
		totalPreOrderQuantity += quantity
	}
	leadTotal := len(leads)
	visitorTotal := len(uniqueVisitors)
	meetingTotal := len(meetings)
	preOrderTotal := len(preOrders)
	return map[string]any{
		"snapshot": map[string]any{
			"leads": leadTotal, "uniqueVisitors": visitorTotal, "products": len(products), "payments": len(payments),
			"ads": len(ads), "meetings": meetingTotal, "preOrders": preOrderTotal, "feedback": len(feedback), "documents": len(documents),
		},
		"conversionRates": map[string]any{
			"visitorToLeadPercent":     percent(leadTotal, visitorTotal),
			"leadToMeetingPercent":     percent(meetingTotal, leadTotal),
			"leadToPreOrderPercent":    percent(preOrderTotal, leadTotal),
			"leadToWonPercent":         percent(leadStatusCounts(leads)["won"], leadTotal),
			"visitorToPreOrderPercent": percent(preOrderTotal, visitorTotal),
		},
		"leads": map[string]any{
			"total": leadTotal, "status": leadStatusCounts(leads), "temperature": leadTemperatureCounts(leads),
			"source": leadSourceCounts(leads), "lastActivity": leadLastActivityCounts(leads), "followUps": leadFollowUpMetrics(leads),
			"capturedByDay": leadCapturedByDay(leads), "activityTypes": leadActivityTypeCounts(leads),
		},
		"visitors": map[string]any{
			"unique": visitorTotal, "source": visitorSourceCountsFromRecords(uniqueVisitors), "engagement": visitorEngagementMetrics(uniqueVisitors),
		},
		"meetings": map[string]any{
			"total": meetingTotal, "status": meetingStatusCounts(meetings), "type": meetingTypeCounts(meetings),
			"timing": meetingTimingMetrics(meetings), "scheduledByDay": meetingScheduledByDay(meetings),
		},
		"preOrders": map[string]any{
			"total": preOrderTotal, "status": preOrderStatus, "totalQuantity": totalPreOrderQuantity,
			"totalValue": totalPreOrderValue, "valueByCurrency": preOrderValueByCurrency, "createdByDay": preOrderByDay,
		},
		"products": productMetrics(products),
		"payments": paymentMetrics(payments),
		"ads":      sponsorAdMetrics(ads),
		"feedback": feedbackMetrics(feedback),
		"documents": map[string]any{
			"total": len(documents), "totalSizeBytes": documentTotalSize(documents), "mimeTypes": documentMimeTypeCounts(documents),
		},
	}
}

func sponsorAISourceMetrics(campaigns []domain.SponsorCampaignRecord, ads []domain.SponsorAdRecord, payments []domain.SponsorPaymentRecord) map[string]any {
	return map[string]any{"campaigns": len(campaigns), "ads": sponsorAdMetrics(ads), "payments": sponsorPaymentStatusCounts(payments)}
}

func expoStatusCounts(expos []domain.Expo) map[string]int {
	counts := map[string]int{}
	for _, item := range expos {
		counts[string(item.Status)]++
	}
	return counts
}

func paymentStatusCounts(payments []domain.Payment) map[string]int {
	counts := map[string]int{}
	for _, item := range payments {
		counts[string(item.Status)]++
	}
	return counts
}

func sponsorPaymentStatusCounts(payments []domain.SponsorPaymentRecord) map[string]int {
	counts := map[string]int{}
	for _, item := range payments {
		counts[item.Status]++
	}
	return counts
}

func leadStatusCounts(leads []domain.LeadRecord) map[string]int {
	counts := map[string]int{}
	for _, item := range leads {
		counts[item.Status]++
	}
	return counts
}

func leadTemperatureCounts(leads []domain.LeadRecord) map[string]int {
	counts := map[string]int{}
	for _, item := range leads {
		counts[item.Temperature]++
	}
	return counts
}

func leadSourceCounts(leads []domain.LeadRecord) map[string]int {
	counts := map[string]int{}
	for _, item := range leads {
		counts[nonEmpty(strings.TrimSpace(item.Source), "unknown")]++
	}
	return counts
}

func leadLastActivityCounts(leads []domain.LeadRecord) map[string]int {
	counts := map[string]int{}
	for _, item := range leads {
		counts[nonEmpty(strings.TrimSpace(item.LastActivity), "none")]++
	}
	return counts
}

func leadFollowUpMetrics(leads []domain.LeadRecord) map[string]any {
	now := time.Now().UTC()
	overdue, upcoming, noDate, contacted := 0, 0, 0, 0
	for _, item := range leads {
		if strings.TrimSpace(item.LastContactedAt) != "" {
			contacted++
		}
		if strings.TrimSpace(item.NextFollowUpAt) == "" {
			noDate++
			continue
		}
		when, err := time.Parse(time.RFC3339, item.NextFollowUpAt)
		if err != nil {
			noDate++
			continue
		}
		if when.Before(now) {
			overdue++
		} else {
			upcoming++
		}
	}
	return map[string]any{"overdue": overdue, "upcoming": upcoming, "noFollowUpDate": noDate, "contacted": contacted}
}

func leadCapturedByDay(leads []domain.LeadRecord) map[string]int {
	counts := map[string]int{}
	for _, item := range leads {
		counts[dateOnlyKey(item.CapturedAt)]++
	}
	return counts
}

func leadActivityTypeCounts(leads []domain.LeadRecord) map[string]int {
	counts := map[string]int{}
	for _, lead := range leads {
		for _, activity := range lead.Activities {
			counts[nonEmpty(strings.TrimSpace(activity.Type), "activity")]++
		}
	}
	return counts
}

func visitorSourceCountsFromRecords(visitors []map[string]any) map[string]int {
	counts := map[string]int{}
	for _, item := range visitors {
		counts[nonEmpty(anyString(item["source"]), "unknown")]++
	}
	return counts
}

func visitorEngagementMetrics(visitors []map[string]any) map[string]any {
	total, max := 0, 0
	for _, item := range visitors {
		count := int(anyInt64(item["engagementCount"]))
		total += count
		if count > max {
			max = count
		}
	}
	avg := 0.0
	if len(visitors) > 0 {
		avg = float64(total) / float64(len(visitors))
	}
	return map[string]any{"totalEngagements": total, "averagePerVisitor": avg, "highestVisitorEngagements": max}
}

func meetingStatusCounts(meetings []domain.MeetingRecord) map[string]int {
	counts := map[string]int{}
	for _, item := range meetings {
		counts[nonEmpty(strings.TrimSpace(item.Status), "scheduled")]++
	}
	return counts
}

func meetingTypeCounts(meetings []domain.MeetingRecord) map[string]int {
	counts := map[string]int{}
	for _, item := range meetings {
		counts[nonEmpty(strings.TrimSpace(item.MeetingType), "meeting")]++
	}
	return counts
}

func meetingTimingMetrics(meetings []domain.MeetingRecord) map[string]any {
	now := time.Now().UTC()
	upcoming, past := 0, 0
	next := ""
	for _, item := range meetings {
		when, err := time.Parse(time.RFC3339, item.ScheduledAt)
		if err != nil {
			continue
		}
		if when.Before(now) {
			past++
			continue
		}
		upcoming++
		if next == "" || item.ScheduledAt < next {
			next = item.ScheduledAt
		}
	}
	return map[string]any{"upcoming": upcoming, "past": past, "nextScheduledAt": next}
}

func meetingScheduledByDay(meetings []domain.MeetingRecord) map[string]int {
	counts := map[string]int{}
	for _, item := range meetings {
		counts[dateOnlyKey(item.ScheduledAt)]++
	}
	return counts
}

func productMetrics(products []domain.ProductRecord) map[string]any {
	status, category, media := map[string]int{}, map[string]int{}, map[string]int{}
	featured, withImages, withDemoVideo, withPresentation, discounted := 0, 0, 0, 0, 0
	totalOriginalValue, totalDiscountedValue := int64(0), int64(0)
	for _, item := range products {
		status[nonEmpty(strings.TrimSpace(item.Status), "unknown")]++
		category[nonEmpty(strings.TrimSpace(item.Category), "uncategorized")]++
		media[nonEmpty(strings.TrimSpace(item.MediaType), "none")]++
		if item.Featured {
			featured++
		}
		if len(item.Images) > 0 {
			withImages++
		}
		if strings.TrimSpace(item.DemoVideoURL) != "" {
			withDemoVideo++
		}
		if strings.TrimSpace(item.PresentationURL) != "" {
			withPresentation++
		}
		if item.DiscountedPrice > 0 && item.DiscountedPrice < item.Price {
			discounted++
			totalDiscountedValue += item.DiscountedPrice
		} else {
			totalDiscountedValue += item.Price
		}
		totalOriginalValue += item.Price
	}
	return map[string]any{
		"total": len(products), "status": status, "category": category, "media": media, "featured": featured,
		"withImages": withImages, "withDemoVideo": withDemoVideo, "withPresentation": withPresentation,
		"discounted": discounted, "totalOriginalValue": totalOriginalValue, "totalDisplayedValue": totalDiscountedValue,
	}
}

func paymentMetrics(payments []domain.Payment) map[string]any {
	status, purpose, amountByStatus, amountByCurrency := map[string]int{}, map[string]int{}, map[string]int64{}, map[string]int64{}
	paidVolume, processingFees := int64(0), int64(0)
	for _, item := range payments {
		status[string(item.Status)]++
		purpose[string(item.Purpose)]++
		amountByStatus[string(item.Status)] += item.AmountMinor
		amountByCurrency[item.CurrencyCode] += item.AmountMinor
		if item.Status == domain.PaymentPaid {
			paidVolume += item.AmountMinor
			processingFees += item.ProcessingFeeMinor
		}
	}
	return map[string]any{"total": len(payments), "status": status, "purpose": purpose, "amountByStatus": amountByStatus, "amountByCurrency": amountByCurrency, "paidVolume": paidVolume, "processingFees": processingFees}
}

func feedbackMetrics(feedback []domain.ExhibitorFeedbackRecord) map[string]any {
	ratings := map[string]int{}
	total := 0
	comments := []map[string]any{}
	for _, item := range feedback {
		ratings[strconv.Itoa(item.Rating)]++
		total += item.Rating
		if strings.TrimSpace(item.Comment) != "" {
			comments = append(comments, map[string]any{"rating": item.Rating, "comment": sanitizeMetricText(item.Comment), "submittedAt": item.SubmittedAt})
		}
	}
	average := 0.0
	if len(feedback) > 0 {
		average = float64(total) / float64(len(feedback))
	}
	return map[string]any{"total": len(feedback), "ratings": ratings, "averageRating": average, "commentsCount": len(comments), "comments": comments}
}

func documentTotalSize(documents []domain.ExpoDocumentRecord) int {
	total := 0
	for _, item := range documents {
		total += item.Size
	}
	return total
}

func documentMimeTypeCounts(documents []domain.ExpoDocumentRecord) map[string]int {
	counts := map[string]int{}
	for _, item := range documents {
		counts[nonEmpty(strings.TrimSpace(item.MimeType), "unknown")]++
	}
	return counts
}

func notificationStatusCounts(notifications []domain.Notification) map[string]int {
	counts := map[string]int{}
	for _, item := range notifications {
		counts[item.Status]++
	}
	return counts
}

func processingFeeVolume(payments []domain.Payment) int64 {
	var total int64
	for _, item := range payments {
		if item.Status == domain.PaymentPaid {
			total += item.ProcessingFeeMinor
		}
	}
	return total
}

func sponsorAdMetrics(ads []domain.SponsorAdRecord) map[string]any {
	statuses := map[string]int{}
	var impressions, clicks int64
	var spend int64
	for _, item := range ads {
		statuses[item.Status]++
		impressions += item.Impressions
		clicks += item.Clicks
		spend += item.DailySpend
	}
	ctr := 0.0
	if impressions > 0 {
		ctr = float64(clicks) / float64(impressions) * 100
	}
	return map[string]any{"count": len(ads), "statuses": statuses, "impressions": impressions, "clicks": clicks, "ctr": ctr, "spend": spend}
}

func percent(numerator int, denominator int) float64 {
	if denominator <= 0 {
		return 0
	}
	return float64(numerator) / float64(denominator) * 100
}

func anyString(value any) string {
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	case fmt.Stringer:
		return strings.TrimSpace(typed.String())
	default:
		return strings.TrimSpace(fmt.Sprint(value))
	}
}

func anyInt64(value any) int64 {
	switch typed := value.(type) {
	case int:
		return int64(typed)
	case int64:
		return typed
	case int32:
		return int64(typed)
	case float64:
		return int64(typed)
	case float32:
		return int64(typed)
	case string:
		parsed, _ := strconv.ParseInt(strings.TrimSpace(typed), 10, 64)
		return parsed
	default:
		return 0
	}
}

func dateOnlyKey(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "unknown"
	}
	if len(value) >= 10 {
		return value[:10]
	}
	return value
}

func sanitizeMetricText(value string) string {
	value = strings.Join(strings.Fields(strings.TrimSpace(value)), " ")
	if len(value) > 240 {
		return value[:240]
	}
	return value
}

func mustJSON(value any) string {
	raw, _ := json.Marshal(value)
	return string(raw)
}
