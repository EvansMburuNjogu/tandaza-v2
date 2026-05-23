package httpapi

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log/slog"
	"math"
	"net/http"
	"net/url"
	"path"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"tandaza/backend/internal/auth"
	"tandaza/backend/internal/config"
	"tandaza/backend/internal/domain"
	"tandaza/backend/internal/media"
	"tandaza/backend/internal/notify"
	"tandaza/backend/internal/platform"
	"tandaza/backend/internal/store"
)

type Server struct {
	cfg          config.Config
	logger       *slog.Logger
	store        store.Store
	tokenService auth.TokenService
	requestSeq   atomic.Uint64
	dispatcher   notify.Dispatcher
	mediaStore   media.Store
	rateMu       sync.Mutex
	rateLimits   map[string]rateCounter
	chatHub      *chatHub
}

func NewServer(cfg config.Config, logger *slog.Logger, store store.Store, tokenService auth.TokenService) *Server {
	return &Server{cfg: cfg, logger: logger, store: store, tokenService: tokenService, dispatcher: notify.NewDispatcher(cfg), mediaStore: media.NewStore(cfg), rateLimits: map[string]rateCounter{}, chatHub: newChatHub()}
}

type rateCounter struct {
	WindowStart time.Time
	Count       int
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.health)
	mux.HandleFunc("GET /ready", s.ready)
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(s.cfg.LocalStorageDir))))
	mux.HandleFunc("GET /media/{key...}", s.serveMedia)
	mux.HandleFunc("GET /api/v1/roadmap", s.roadmap)
	mux.HandleFunc("POST /api/v1/media", s.uploadMedia)
	mux.HandleFunc("POST /api/v1/auth/login", s.login)
	mux.HandleFunc("POST /api/v1/auth/register", s.register)
	mux.HandleFunc("POST /api/v1/auth/verify-email", s.verifyEmail)
	mux.HandleFunc("POST /api/v1/auth/forgot-password", s.forgotPassword)
	mux.HandleFunc("POST /api/v1/auth/reset-password", s.resetPassword)
	mux.HandleFunc("POST /api/v1/auth/change-password", s.changePassword)
	mux.HandleFunc("POST /api/v1/auth/google", s.googleAuth)
	mux.HandleFunc("GET /api/v1/auth/google/config", s.googleAuthConfig)
	mux.HandleFunc("POST /api/v1/auth/logout", s.logout)
	mux.HandleFunc("GET /api/v1/auth/me", s.me)
	mux.HandleFunc("GET /api/v1/platform/countries", s.countries)
	mux.HandleFunc("GET /api/v1/platform/currencies", s.currencies)
	mux.HandleFunc("GET /api/v1/categories", s.categories)
	mux.HandleFunc("GET /api/v1/meeting-categories", s.meetingCategories)
	mux.HandleFunc("GET /api/v1/notifications", s.myNotifications)
	mux.HandleFunc("PATCH /api/v1/notifications/read-all", s.markMyNotificationsRead)
	mux.HandleFunc("PATCH /api/v1/notifications/{id}/read", s.markMyNotificationRead)
	mux.HandleFunc("DELETE /api/v1/notifications/{id}", s.dismissMyNotification)
	mux.HandleFunc("GET /api/v1/admin/countries", s.adminCountries)
	mux.HandleFunc("POST /api/v1/ads/{id}/track", s.trackSponsorAd)
	mux.HandleFunc("POST /api/v1/admin/countries", s.adminCreateCountry)
	mux.HandleFunc("PATCH /api/v1/admin/countries/{code}/status", s.adminCountryStatus)
	mux.HandleFunc("GET /api/v1/admin/categories", s.adminCategories)
	mux.HandleFunc("POST /api/v1/admin/categories", s.adminCreateCategory)
	mux.HandleFunc("PATCH /api/v1/admin/categories/{id}/status", s.adminCategoryStatus)
	mux.HandleFunc("GET /api/v1/expos", s.expos)
	mux.HandleFunc("GET /api/v1/expos/available", s.exhibitorAvailableExpos)
	mux.HandleFunc("GET /api/v1/qr/{code}", s.resolveQRCode)
	mux.HandleFunc("GET /api/v1/admin/expos", s.adminExpos)
	mux.HandleFunc("POST /api/v1/admin/expos", s.adminCreateExpo)
	mux.HandleFunc("GET /api/v1/admin/expos/{id}", s.adminExpoDetail)
	mux.HandleFunc("GET /api/v1/admin/expos/{id}/exhibitors", s.adminExpoExhibitors)
	mux.HandleFunc("GET /api/v1/admin/expos/{id}/visitors", s.adminExpoVisitors)
	mux.HandleFunc("GET /api/v1/admin/expos/{id}/payments", s.adminExpoPayments)
	mux.HandleFunc("GET /api/v1/admin/expos/{id}/analytics", s.adminExpoAnalytics)
	mux.HandleFunc("GET /api/v1/admin/expos/{id}/ads", s.adminExpoAds)
	mux.HandleFunc("PATCH /api/v1/admin/expos/{id}", s.adminUpdateExpo)
	mux.HandleFunc("PATCH /api/v1/admin/expos/{id}/status", s.adminExpoStatus)
	mux.HandleFunc("GET /api/v1/organizer/expos", s.organizerExpos)
	mux.HandleFunc("POST /api/v1/organizer/expos", s.organizerCreateExpo)
	mux.HandleFunc("GET /api/v1/organizer/expos/{id}", s.organizerExpoDetail)
	mux.HandleFunc("PATCH /api/v1/organizer/expos/{id}", s.organizerUpdateExpo)
	mux.HandleFunc("POST /api/v1/organizer/expos/{id}/submit", s.organizerSubmitExpo)
	mux.HandleFunc("GET /api/v1/admin/overview", s.adminOverview)
	mux.HandleFunc("GET /api/v1/admin/reports", s.adminReports)
	mux.HandleFunc("GET /api/v1/admin/reports/ai-summary", s.adminReportsAISummary)
	mux.HandleFunc("POST /api/v1/admin/reports/ai-summary", s.adminGenerateReportsAISummary)
	mux.HandleFunc("GET /api/v1/admin/visitors", s.adminVisitors)
	mux.HandleFunc("PATCH /api/v1/admin/visitors/{id}", s.adminUpdateVisitor)
	mux.HandleFunc("GET /api/v1/admin/organizers", s.adminOrganizers)
	mux.HandleFunc("POST /api/v1/admin/organizers", s.adminCreateOrganizer)
	mux.HandleFunc("PATCH /api/v1/admin/organizers/{id}", s.adminUpdateOrganizer)
	mux.HandleFunc("GET /api/v1/admin/exhibitors", s.adminExhibitors)
	mux.HandleFunc("POST /api/v1/admin/exhibitors", s.adminCreateExhibitor)
	mux.HandleFunc("PATCH /api/v1/admin/exhibitors/{id}", s.adminUpdateExhibitor)
	mux.HandleFunc("POST /api/v1/admin/exhibitor-assignments", s.adminAssignExhibitor)
	mux.HandleFunc("GET /api/v1/admin/sponsors", s.adminSponsors)
	mux.HandleFunc("POST /api/v1/admin/sponsors", s.adminCreateSponsor)
	mux.HandleFunc("PATCH /api/v1/admin/sponsors/{id}", s.adminUpdateSponsor)
	mux.HandleFunc("GET /api/v1/admin/payments", s.adminPayments)
	mux.HandleFunc("PATCH /api/v1/admin/payments/{id}/status", s.adminPaymentStatus)
	mux.HandleFunc("GET /api/v1/admin/settlements", s.adminSettlements)
	mux.HandleFunc("GET /api/v1/admin/notifications", s.adminNotifications)
	mux.HandleFunc("POST /api/v1/admin/notifications", s.adminCreateNotification)
	mux.HandleFunc("POST /api/v1/admin/notifications/dispatch-due", s.adminDispatchDueNotifications)
	mux.HandleFunc("POST /api/v1/admin/notifications/test-send", s.adminTestSendNotification)
	mux.HandleFunc("POST /api/v1/admin/notifications/{id}/retry", s.adminRetryNotification)
	mux.HandleFunc("GET /api/v1/admin/notifications/{id}/attempts", s.adminNotificationAttempts)
	mux.HandleFunc("GET /api/v1/admin/ads", s.adminAds)
	mux.HandleFunc("PATCH /api/v1/admin/ads/{id}/status", s.adminAdStatus)
	mux.HandleFunc("GET /api/v1/admin/sponsor-plans", s.adminSponsorPlans)
	mux.HandleFunc("POST /api/v1/admin/sponsor-plans", s.adminCreateSponsorPlan)
	mux.HandleFunc("PATCH /api/v1/admin/sponsor-plans/{id}", s.adminUpdateSponsorPlan)
	mux.HandleFunc("PATCH /api/v1/admin/sponsor-plans/{id}/status", s.adminSponsorPlanStatus)
	mux.HandleFunc("GET /api/v1/admin/audit-logs", s.adminAuditLogs)
	mux.HandleFunc("GET /api/v1/admin/app-logs", s.adminAppLogs)
	mux.HandleFunc("GET /api/v1/admin/users", s.adminUsers)
	mux.HandleFunc("POST /api/v1/admin/users", s.adminCreateUser)
	mux.HandleFunc("PATCH /api/v1/admin/users/{id}", s.adminUpdateUser)
	mux.HandleFunc("DELETE /api/v1/admin/users/{id}", s.adminDeleteUser)
	mux.HandleFunc("GET /api/v1/admin/settings/email", s.adminEmailSettings)
	mux.HandleFunc("PATCH /api/v1/admin/settings/email", s.adminUpdateEmailSettings)
	mux.HandleFunc("GET /api/v1/admin/settings/sms", s.adminSMSSettings)
	mux.HandleFunc("PATCH /api/v1/admin/settings/sms", s.adminUpdateSMSSettings)
	mux.HandleFunc("GET /api/v1/admin/settings/paystack", s.adminPaystackSettings)
	mux.HandleFunc("PATCH /api/v1/admin/settings/paystack", s.adminUpdatePaystackSettings)
	mux.HandleFunc("GET /api/v1/admin/settings/google", s.adminGoogleSettings)
	mux.HandleFunc("PATCH /api/v1/admin/settings/google", s.adminUpdateGoogleSettings)
	mux.HandleFunc("GET /api/v1/admin/settings/meeting-categories", s.adminMeetingSettings)
	mux.HandleFunc("PATCH /api/v1/admin/settings/meeting-categories", s.adminUpdateMeetingSettings)
	mux.HandleFunc("GET /api/v1/admin/settings/openai", s.adminOpenAISettings)
	mux.HandleFunc("PATCH /api/v1/admin/settings/openai", s.adminUpdateOpenAISettings)
	mux.HandleFunc("POST /api/v1/admin/settings/openai/test", s.adminTestOpenAISettings)
	mux.HandleFunc("GET /api/v1/admin/settings/whatsapp", s.adminWhatsappSettings)
	mux.HandleFunc("PATCH /api/v1/admin/settings/whatsapp", s.adminUpdateWhatsappSettings)
	mux.HandleFunc("GET /api/v1/admin/sponsor-accounts", s.adminSponsorAccounts)
	mux.HandleFunc("GET /api/v1/admin/sponsor-plans/{id}", s.adminSponsorPlanDetail)
	mux.HandleFunc("PATCH /api/v1/admin/settlements/{id}/status", s.adminSettlementStatus)
	mux.HandleFunc("GET /api/v1/organizer/overview", s.organizerOverview)
	mux.HandleFunc("GET /api/v1/organizer/exhibitors", s.organizerExhibitors)
	mux.HandleFunc("POST /api/v1/organizer/exhibitors", s.organizerInviteExhibitor)
	mux.HandleFunc("POST /api/v1/organizer/exhibitor-assignments", s.organizerAssignExhibitor)
	mux.HandleFunc("GET /api/v1/organizer/visitors", s.organizerVisitors)
	mux.HandleFunc("GET /api/v1/organizer/feedback", s.organizerFeedback)
	mux.HandleFunc("GET /api/v1/organizer/profile", s.organizerProfile)
	mux.HandleFunc("PATCH /api/v1/organizer/profile", s.organizerUpdateProfile)
	mux.HandleFunc("GET /api/v1/organizer/team", s.organizerTeam)
	mux.HandleFunc("POST /api/v1/organizer/team", s.organizerCreateTeamMember)
	mux.HandleFunc("GET /api/v1/organizer/team/{id}", s.organizerTeamMember)
	mux.HandleFunc("PATCH /api/v1/organizer/team/{id}", s.organizerUpdateTeamMember)
	mux.HandleFunc("DELETE /api/v1/organizer/team/{id}", s.organizerDeleteTeamMember)
	mux.HandleFunc("GET /api/v1/organizer/sponsors", s.organizerSponsors)
	mux.HandleFunc("POST /api/v1/organizer/sponsors", s.organizerCreateSponsor)
	mux.HandleFunc("GET /api/v1/organizer/sponsors/{id}", s.organizerSponsorDetail)
	mux.HandleFunc("PATCH /api/v1/organizer/sponsors/{id}", s.organizerUpdateSponsor)
	mux.HandleFunc("GET /api/v1/organizer/payments", s.organizerPayments)
	mux.HandleFunc("GET /api/v1/organizer/payments/{id}/receipt", s.organizerPaymentReceipt)
	mux.HandleFunc("GET /api/v1/organizer/settlements", s.organizerSettlements)
	mux.HandleFunc("GET /api/v1/organizer/reports", s.organizerReports)
	mux.HandleFunc("GET /api/v1/organizer/reports/ai-summary", s.organizerReportsAISummary)
	mux.HandleFunc("POST /api/v1/organizer/reports/ai-summary", s.organizerGenerateReportsAISummary)
	mux.HandleFunc("GET /api/v1/exhibitor/payments", s.exhibitorPayments)
	mux.HandleFunc("GET /api/v1/exhibitor/overview", s.exhibitorOverview)
	mux.HandleFunc("GET /api/v1/exhibitor/profile", s.exhibitorProfile)
	mux.HandleFunc("PATCH /api/v1/exhibitor/profile", s.exhibitorUpdateProfile)
	mux.HandleFunc("GET /api/v1/exhibitor/documents", s.exhibitorDocuments)
	mux.HandleFunc("POST /api/v1/exhibitor/documents", s.exhibitorCreateDocument)
	mux.HandleFunc("DELETE /api/v1/exhibitor/documents/{id}", s.exhibitorDeleteDocument)
	mux.HandleFunc("GET /api/v1/exhibitor/settings/meeting-categories", s.exhibitorMeetingSettings)
	mux.HandleFunc("PATCH /api/v1/exhibitor/settings/meeting-categories", s.exhibitorUpdateMeetingSettings)
	mux.HandleFunc("GET /api/v1/exhibitor/team", s.exhibitorTeam)
	mux.HandleFunc("POST /api/v1/exhibitor/team", s.exhibitorCreateTeamMember)
	mux.HandleFunc("PATCH /api/v1/exhibitor/team/{id}", s.exhibitorUpdateTeamMember)
	mux.HandleFunc("DELETE /api/v1/exhibitor/team/{id}", s.exhibitorDeleteTeamMember)
	mux.HandleFunc("GET /api/v1/exhibitor/products", s.exhibitorProducts)
	mux.HandleFunc("POST /api/v1/exhibitor/products", s.exhibitorCreateProduct)
	mux.HandleFunc("GET /api/v1/exhibitor/products/{id}", s.exhibitorProductDetail)
	mux.HandleFunc("PATCH /api/v1/exhibitor/products/{id}", s.exhibitorUpdateProduct)
	mux.HandleFunc("DELETE /api/v1/exhibitor/products/{id}", s.exhibitorDeleteProduct)
	mux.HandleFunc("POST /api/v1/exhibitor/expos/{id}/products/showcase", s.exhibitorShowcaseProducts)
	mux.HandleFunc("DELETE /api/v1/exhibitor/expos/{id}/products/{productId}/showcase", s.exhibitorRemoveShowcaseProduct)
	mux.HandleFunc("GET /api/v1/exhibitor/payments/{id}/receipt", s.exhibitorPaymentReceipt)
	mux.HandleFunc("POST /api/v1/exhibitor/expos/{id}/activation-payments", s.exhibitorCreateActivationPayment)
	mux.HandleFunc("POST /api/v1/exhibitor/payments/paystack/verify", s.exhibitorVerifyPaystackPayment)
	mux.HandleFunc("POST /api/v1/exhibitor/payments/{id}/confirm", s.exhibitorConfirmPayment)
	mux.HandleFunc("GET /api/v1/exhibitor/my-expos", s.exhibitorMyExpos)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/leads", s.exhibitorExpoLeads)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/leads/export", s.exhibitorExpoLeadsExport)
	mux.HandleFunc("PATCH /api/v1/exhibitor/leads/{id}", s.exhibitorUpdateLead)
	mux.HandleFunc("POST /api/v1/exhibitor/leads/{id}/activities", s.exhibitorRecordLeadActivity)
	mux.HandleFunc("POST /api/v1/exhibitor/leads/{id}/messages", s.exhibitorSendLeadMessage)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/qrcode", s.exhibitorExpoQRCode)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/qrcode.svg", s.exhibitorExpoQRCodeSVG)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/orders", s.exhibitorExpoOrders)
	mux.HandleFunc("PATCH /api/v1/exhibitor/expos/{id}/orders/{orderId}", s.exhibitorUpdateExpoOrder)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/reminders", s.exhibitorExpoReminders)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/meetings", s.exhibitorExpoMeetings)
	mux.HandleFunc("POST /api/v1/exhibitor/expos/{id}/meetings", s.exhibitorCreateExpoMeeting)
	mux.HandleFunc("DELETE /api/v1/exhibitor/expos/{id}/meetings/{meetingId}", s.exhibitorDeleteExpoMeeting)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/analytics", s.exhibitorExpoAnalytics)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/roi", s.exhibitorExpoROI)
	mux.HandleFunc("PATCH /api/v1/exhibitor/expos/{id}/roi", s.exhibitorUpdateExpoROI)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/analytics/ai-summary", s.exhibitorExpoAnalyticsAISummary)
	mux.HandleFunc("POST /api/v1/exhibitor/expos/{id}/analytics/ai-summary", s.exhibitorGenerateExpoAnalyticsAISummary)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/visitors", s.exhibitorExpoVisitors)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/feedback", s.exhibitorExpoFeedback)
	mux.HandleFunc("POST /api/v1/exhibitor/expos/{id}/organizer-feedback", s.exhibitorSubmitOrganizerFeedback)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/conversations", s.exhibitorExpoConversations)
	mux.HandleFunc("POST /api/v1/exhibitor/expos/{id}/conversations/{threadId}/messages", s.exhibitorSendChatMessage)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/conversations/ws", s.chatWebSocket)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/live-stream", s.exhibitorExpoLiveStream)
	mux.HandleFunc("PATCH /api/v1/exhibitor/expos/{id}/live-stream", s.exhibitorUpdateExpoLiveStream)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/campaigns", s.exhibitorExpoCampaigns)
	mux.HandleFunc("POST /api/v1/exhibitor/expos/{id}/campaigns", s.exhibitorCreateExpoCampaign)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/documents", s.exhibitorExpoDocuments)
	mux.HandleFunc("POST /api/v1/exhibitor/expos/{id}/documents", s.exhibitorCreateExpoDocument)
	mux.HandleFunc("DELETE /api/v1/exhibitor/expos/{id}/documents/{documentId}", s.exhibitorDeleteExpoDocument)
	mux.HandleFunc("GET /api/v1/exhibitor/expos/{id}/ads", s.exhibitorExpoAds)
	mux.HandleFunc("POST /api/v1/exhibitor/expos/{id}/ads", s.exhibitorCreateExpoAd)
	mux.HandleFunc("PATCH /api/v1/exhibitor/expos/{id}/ads/{adId}", s.exhibitorUpdateExpoAd)
	mux.HandleFunc("POST /api/v1/exhibitor/expos/{id}/leads", s.createExpoLeadForExpo)
	mux.HandleFunc("GET /api/v1/visitor/dashboard", s.visitorDashboard)
	mux.HandleFunc("GET /api/v1/visitor/expos", s.visitorExpos)
	mux.HandleFunc("GET /api/v1/visitor/expos/{id}", s.visitorExpoDetail)
	mux.HandleFunc("POST /api/v1/visitor/expos/{id}/actions", s.visitorExpoAction)
	mux.HandleFunc("POST /api/v1/visitor/expos/{id}/activity", s.visitorRecordActivity)
	mux.HandleFunc("POST /api/v1/visitor/expos/{id}/book", s.visitorBookExpo)
	mux.HandleFunc("GET /api/v1/visitor/bookings", s.visitorBookings)
	mux.HandleFunc("GET /api/v1/visitor/bookings/{id}", s.visitorBookingDetail)
	mux.HandleFunc("POST /api/v1/visitor/bookings/{id}/cancel", s.visitorCancelBooking)
	mux.HandleFunc("GET /api/v1/visitor/timeline", s.visitorTimeline)
	mux.HandleFunc("GET /api/v1/visitor/favorites", s.visitorFavorites)
	mux.HandleFunc("POST /api/v1/visitor/favorites", s.visitorAddFavorite)
	mux.HandleFunc("DELETE /api/v1/visitor/favorites/{id}", s.visitorDeleteFavorite)
	mux.HandleFunc("GET /api/v1/visitor/calendar", s.visitorCalendar)
	mux.HandleFunc("GET /api/v1/visitor/messages", s.visitorMessages)
	mux.HandleFunc("POST /api/v1/visitor/messages/{id}", s.visitorSendMessage)
	mux.HandleFunc("GET /api/v1/visitor/expos/{id}/conversations", s.visitorExpoConversations)
	mux.HandleFunc("POST /api/v1/visitor/expos/{id}/conversations/{exhibitorId}/messages", s.visitorSendChatMessage)
	mux.HandleFunc("GET /api/v1/visitor/expos/{id}/conversations/ws", s.chatWebSocket)
	mux.HandleFunc("GET /api/v1/visitor/feedback", s.visitorFeedback)
	mux.HandleFunc("POST /api/v1/visitor/feedback", s.visitorSubmitFeedback)
	mux.HandleFunc("GET /api/v1/visitor/orders", s.visitorOrders)
	mux.HandleFunc("GET /api/v1/visitor/settings", s.visitorSettings)
	mux.HandleFunc("PUT /api/v1/visitor/settings", s.updateVisitorSettings)
	mux.HandleFunc("GET /api/v1/sponsor/dashboard", s.sponsorDashboard)
	mux.HandleFunc("GET /api/v1/sponsor/reports", s.sponsorReports)
	mux.HandleFunc("GET /api/v1/sponsor/reports/ai-summary", s.sponsorReportsAISummary)
	mux.HandleFunc("POST /api/v1/sponsor/reports/ai-summary", s.sponsorGenerateReportsAISummary)
	mux.HandleFunc("GET /api/v1/sponsor/campaigns", s.sponsorCampaigns)
	mux.HandleFunc("POST /api/v1/sponsor/campaigns", s.sponsorCreateCampaign)
	mux.HandleFunc("GET /api/v1/sponsor/campaigns/{id}", s.sponsorCampaignDetail)
	mux.HandleFunc("GET /api/v1/sponsor/ads", s.sponsorAds)
	mux.HandleFunc("POST /api/v1/sponsor/ads", s.sponsorCreateAd)
	mux.HandleFunc("GET /api/v1/sponsor/ads/{id}", s.sponsorAdDetail)
	mux.HandleFunc("POST /api/v1/sponsor/ads/{id}/payments", s.sponsorCreateAdPayment)
	mux.HandleFunc("POST /api/v1/sponsor/payments/{id}/confirm", s.sponsorConfirmAdPayment)
	mux.HandleFunc("GET /api/v1/sponsor/payments", s.sponsorPayments)
	mux.HandleFunc("GET /api/v1/sponsor/payments/{id}/receipt", s.sponsorPaymentReceipt)
	mux.HandleFunc("POST /api/v1/payments/paystack/webhook", s.paystackWebhook)
	return s.securityHeaders(s.cors(s.requestLogger(s.rateLimit(s.recoverPanic(mux)))))
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":    "ok",
		"service":   "tandaza-go-api",
		"timestamp": time.Now().UTC(),
	})
}

func (s *Server) ready(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":             "ready",
		"environment":        s.cfg.Environment,
		"databaseMode":       s.cfg.DatabaseMode,
		"storageDriver":      s.cfg.StorageDriver,
		"paymentMode":        s.cfg.PaymentMode,
		"queueMode":          notificationWorkerMode(s.cfg.NotificationWorker),
		"expoLifecycleMode":  expoLifecycleWorkerMode(s.cfg.ExpoLifecycleWorker),
		"errorAlertsEnabled": strings.TrimSpace(s.cfg.ErrorWebhookURL) != "",
		"rateLimitPerMinute": s.cfg.RateLimitPerMinute,
	})
}

func (s *Server) StartNotificationWorker(ctx context.Context) {
	if !s.cfg.NotificationWorker {
		return
	}
	interval := s.cfg.NotificationInterval
	if interval <= 0 {
		interval = time.Minute
	}
	s.logger.Info("notification worker started", "interval", interval.String())
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		s.dispatchDueNotifications(ctx, "notification_worker")
		for {
			select {
			case <-ctx.Done():
				s.logger.Info("notification worker stopped")
				return
			case <-ticker.C:
				s.dispatchDueNotifications(ctx, "notification_worker")
			}
		}
	}()
}

func (s *Server) StartExpoLifecycleWorker(ctx context.Context) {
	if !s.cfg.ExpoLifecycleWorker {
		return
	}
	interval := s.cfg.ExpoLifecycleInterval
	if interval <= 0 {
		interval = time.Hour
	}
	s.logger.Info("expo lifecycle worker started", "interval", interval.String())
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		s.completeEndedExpos(ctx)
		for {
			select {
			case <-ctx.Done():
				s.logger.Info("expo lifecycle worker stopped")
				return
			case <-ticker.C:
				s.completeEndedExpos(ctx)
			}
		}
	}()
}

func (s *Server) completeEndedExpos(ctx context.Context) {
	expos, err := s.store.CompleteEndedExpos(ctx, time.Now().UTC())
	if err != nil {
		s.logger.Warn("expo lifecycle completion failed", "error", err)
		return
	}
	for _, expo := range expos {
		s.logger.Info("expo auto-completed after end date", "expoId", expo.ID, "name", expo.Name, "endDate", expo.EndDate.Format("2006-01-02"))
		s.recordSystemAudit(ctx, domain.AuditLog{
			ActorID:    "expo_lifecycle_worker",
			Actor:      "Expo Lifecycle Worker",
			ActorRole:  domain.RoleAdministrator,
			ExpoID:     expo.ID,
			Action:     "expo_auto_completed",
			EntityType: "expo",
			EntityID:   expo.ID,
			Metadata:   map[string]any{"endDate": expo.EndDate.Format("2006-01-02"), "status": expo.Status},
		})
	}
}

func (s *Server) roadmap(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, []map[string]any{
		{"phase": 1, "name": "Go foundation", "status": "in_progress", "features": []string{"auth", "roles", "countries", "currencies", "expo pricing model", "health checks"}},
		{"phase": 2, "name": "Expo core", "status": "planned", "features": []string{"organizer drafts", "admin approval", "categories", "activation pricing"}},
		{"phase": 3, "name": "Payments and commission", "status": "planned", "features": []string{"Paystack", "idempotent webhooks", "organizer commission", "manual payouts"}},
		{"phase": 4, "name": "Visitor, QR and leads", "status": "planned", "features": []string{"remote expo access", "QR scans", "visitor timeline", "lead management"}},
		{"phase": 5, "name": "Notifications and analytics", "status": "planned", "features": []string{"email", "SMS", "push", "post-expo reports", "expo metrics"}},
	})
}

func (s *Server) uploadMedia(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	user, err := s.store.UserByID(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "user_not_found", "Authenticated user no longer exists.")
		return
	}
	if err := r.ParseMultipartForm(12 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_upload", "Upload a file up to 10MB.")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file_required", "Upload field 'file' is required.")
		return
	}
	defer file.Close()

	purpose := strings.TrimSpace(r.FormValue("purpose"))
	maxUploadSize := int64(10 << 20)
	if purpose == "ad_banner" {
		maxUploadSize = 2 << 20
	}
	content, err := io.ReadAll(io.LimitReader(file, maxUploadSize+1))
	if err != nil || len(content) == 0 || int64(len(content)) > maxUploadSize {
		if purpose == "ad_banner" {
			writeError(w, http.StatusBadRequest, "invalid_upload", "Upload an ad banner up to 2MB.")
			return
		}
		writeError(w, http.StatusBadRequest, "invalid_upload", "Upload a file up to 10MB.")
		return
	}
	mimeType := http.DetectContentType(content)
	width, height := 0, 0
	if purpose == "ad_banner" {
		if mimeType != "image/jpeg" && mimeType != "image/png" {
			writeError(w, http.StatusBadRequest, "unsupported_ad_banner", "Upload a 728 x 90 px PNG or JPG banner.")
			return
		}
		cfg, _, err := image.DecodeConfig(bytes.NewReader(content))
		if err != nil || cfg.Width != 728 || cfg.Height != 90 {
			writeError(w, http.StatusBadRequest, "invalid_ad_banner_dimensions", "Upload a 728 x 90 px banner image.")
			return
		}
		width, height = cfg.Width, cfg.Height
	}
	if !allowedUploadMime(mimeType) {
		writeError(w, http.StatusBadRequest, "unsupported_media", "Upload an image, PDF, or MP4 video.")
		return
	}
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = uploadExtension(mimeType)
	}
	name := fmt.Sprintf("%s_%d%s", sanitizeUploadPrefix(user.ID), time.Now().UnixNano(), ext)
	mediaFolder := "media"
	if purpose == "ad_banner" {
		mediaFolder = "ads"
	}
	key := path.Join(mediaFolder, sanitizeUploadPrefix(user.ID), name)
	object, err := s.mediaStore.Put(r.Context(), key, content, mimeType)
	if err != nil {
		s.logger.Warn("media upload storage failed", "error", err, "driver", s.cfg.StorageDriver)
		writeError(w, http.StatusInternalServerError, "upload_failed", "Could not save media.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: user.ID, Actor: user.Name, ActorRole: user.Role, Action: "media_uploaded", EntityType: "media", EntityID: object.Key, Metadata: map[string]any{"mimeType": mimeType, "size": len(content), "driver": s.cfg.StorageDriver}})
	writeJSON(w, http.StatusCreated, map[string]any{
		"id": object.Key, "url": object.URL, "name": header.Filename, "mimeType": object.ContentType, "size": object.Size, "width": width, "height": height,
	})
}

func (s *Server) serveMedia(w http.ResponseWriter, r *http.Request) {
	key := strings.TrimSpace(r.PathValue("key"))
	if key == "" {
		writeError(w, http.StatusNotFound, "media_not_found", "Media file was not found.")
		return
	}
	content, contentType, err := s.mediaStore.Get(r.Context(), key)
	if err != nil {
		writeError(w, http.StatusNotFound, "media_not_found", "Media file was not found.")
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(content)
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	email, password, err := readEmailPassword(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_credentials_payload", "Provide credentials using HTTP Basic auth or a JSON email/password body.")
		return
	}
	user, token, err := s.store.Login(r.Context(), email, password)
	if err != nil {
		s.recordAudit(r, domain.AuditLog{
			Action: "login_failed", EntityType: "auth", EntityID: strings.ToLower(strings.TrimSpace(email)),
			IPAddress: clientIP(r), Metadata: map[string]any{"reason": "invalid_credentials"},
		})
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "Invalid email or password.")
		return
	}
	redirectTo := redirectForUser(user)
	s.recordAudit(r, domain.AuditLog{
		ActorID: user.ID, Actor: user.Name, ActorRole: user.Role,
		Action: "login_success", EntityType: "user", EntityID: user.ID,
		IPAddress: clientIP(r), Metadata: map[string]any{"redirectTo": redirectTo, "mustChangePassword": user.MustChangePassword},
	})
	writeJSON(w, http.StatusOK, map[string]any{
		"token":      token,
		"user":       user,
		"redirectTo": redirectTo,
	})
}

func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	email, password, input, err := readRegistration(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_registration_payload", "Provide Basic auth credentials and a JSON registration profile.")
		return
	}
	if input.Role == "" {
		input.Role = domain.RoleVisitor
	}
	if input.Role != domain.RoleVisitor {
		s.recordAudit(r, domain.AuditLog{
			Action: "register_failed", EntityType: "auth", EntityID: strings.ToLower(strings.TrimSpace(email)),
			IPAddress: clientIP(r), Metadata: map[string]any{"reason": "public_registration_role_not_allowed", "role": input.Role},
		})
		writeError(w, http.StatusBadRequest, "public_registration_role_not_allowed", "Only visitors can self-register.")
		return
	}
	user, _, err := s.store.Register(r.Context(), email, password, input)
	if err != nil {
		s.recordAudit(r, domain.AuditLog{
			Action: "register_failed", EntityType: "auth", EntityID: strings.ToLower(strings.TrimSpace(email)),
			IPAddress: clientIP(r), Metadata: map[string]any{"reason": "invalid_registration"},
		})
		writeError(w, http.StatusBadRequest, "registration_failed", "Registration details are invalid or the account already exists.")
		return
	}
	verificationToken, err := s.store.CreateEmailVerification(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "verification_failed", "Account was created but verification could not be started.")
		return
	}
	verificationLink := authLink(s.cfg.FrontendURL, "/verify-email", verificationToken)
	s.queueAndSendAuthEmail(r.Context(), domain.NotificationInput{
		UserID:      user.ID,
		Role:        user.Role,
		Channel:     "email",
		TemplateKey: "email_verification",
		Payload: map[string]any{
			"email":    user.Email,
			"to":       user.Email,
			"subject":  "Verify your Tandaza email",
			"title":    "Verify your email",
			"message":  "Confirm your email address to activate your Tandaza workspace.",
			"ctaLabel": "Verify email",
			"ctaUrl":   verificationLink,
		},
	})
	s.recordAudit(r, domain.AuditLog{
		ActorID: user.ID, Actor: user.Name, ActorRole: user.Role,
		Action: "register_success", EntityType: "user", EntityID: user.ID,
		IPAddress: clientIP(r), Metadata: map[string]any{"verificationEmailQueued": true},
	})
	writeJSON(w, http.StatusCreated, map[string]any{
		"user":             user,
		"message":          "Account created. Check your email to verify your address.",
		"verificationLink": verificationLink,
	})
}

func (s *Server) verifyEmail(w http.ResponseWriter, r *http.Request) {
	token, err := readToken(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_verification_payload", "Provide the verification token.")
		return
	}
	user, signedToken, err := s.store.VerifyEmail(r.Context(), token)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "email_verification_failed", "Verification link is invalid, expired, or already used.")
		return
	}
	s.recordAudit(r, domain.AuditLog{
		ActorID: user.ID, Actor: user.Name, ActorRole: user.Role,
		Action: "email_verified", EntityType: "user", EntityID: user.ID,
		IPAddress: clientIP(r), Metadata: map[string]any{"redirectTo": redirectForRole(user.Role)},
	})
	s.queueVerifiedWelcomeEmails(r.Context(), user)
	writeJSON(w, http.StatusOK, map[string]any{
		"token":      signedToken,
		"user":       user,
		"redirectTo": redirectForRole(user.Role),
	})
}

func (s *Server) forgotPassword(w http.ResponseWriter, r *http.Request) {
	email, err := readForgotPasswordEmail(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_forgot_password_payload", "Provide the account email using HTTP Basic auth or a JSON body.")
		return
	}
	result, err := s.store.ForgotPassword(r.Context(), email)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "forgot_password_failed", "Could not create a reset request.")
		return
	}
	s.recordAudit(r, domain.AuditLog{
		Action: "forgot_password_requested", EntityType: "auth", EntityID: strings.ToLower(strings.TrimSpace(email)),
		IPAddress: clientIP(r),
	})
	if result.Token != "" {
		result.ResetLink = authLink(s.cfg.FrontendURL, "/reset-password", result.Token)
		s.queueAndSendAuthEmail(r.Context(), domain.NotificationInput{
			Role:        domain.RoleVisitor,
			Channel:     "email",
			TemplateKey: "password_reset",
			Payload: map[string]any{
				"email":    strings.TrimSpace(strings.ToLower(email)),
				"to":       strings.TrimSpace(strings.ToLower(email)),
				"subject":  "Reset your Tandaza password",
				"title":    "Reset your password",
				"message":  "Use this secure link to choose a new Tandaza password. The link expires soon.",
				"ctaLabel": "Reset password",
				"ctaUrl":   result.ResetLink,
			},
		})
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"message": "If the account exists, a password reset link has been sent to the email address.",
	})
}

func (s *Server) resetPassword(w http.ResponseWriter, r *http.Request) {
	token, newPassword, err := readResetPassword(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_reset_password_payload", "Provide the reset token and new password using HTTP Basic auth or a JSON body.")
		return
	}
	if err := s.store.ResetPassword(r.Context(), token, newPassword); err != nil {
		s.recordAudit(r, domain.AuditLog{
			Action: "password_reset_failed", EntityType: "auth", EntityID: "password_reset",
			IPAddress: clientIP(r), Metadata: map[string]any{"reason": "invalid_or_expired_token"},
		})
		writeError(w, http.StatusUnauthorized, "password_reset_failed", "Reset token is invalid, expired, or already used.")
		return
	}
	s.recordAudit(r, domain.AuditLog{
		Action: "password_reset_success", EntityType: "auth", EntityID: "password_reset",
		IPAddress: clientIP(r),
	})
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

func (s *Server) changePassword(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	var payload struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
		ConfirmPassword string `json:"confirmPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	if strings.TrimSpace(payload.CurrentPassword) == "" || strings.TrimSpace(payload.NewPassword) == "" {
		writeError(w, http.StatusBadRequest, "invalid_password_payload", "Current password and new password are required.")
		return
	}
	if payload.ConfirmPassword != "" && payload.ConfirmPassword != payload.NewPassword {
		writeError(w, http.StatusBadRequest, "password_confirmation_mismatch", "Password confirmation must match the new password.")
		return
	}
	if len(payload.NewPassword) < 8 {
		writeError(w, http.StatusBadRequest, "weak_password", "New password must be at least 8 characters.")
		return
	}
	if err := s.store.ChangePassword(r.Context(), claims.UserID, payload.CurrentPassword, payload.NewPassword); err != nil {
		s.recordAudit(r, domain.AuditLog{
			ActorID: claims.UserID, ActorRole: claims.Role,
			Action: "password_change_failed", EntityType: "user", EntityID: claims.UserID,
			IPAddress: clientIP(r), Metadata: map[string]any{"reason": "invalid_current_password"},
		})
		writeError(w, http.StatusUnauthorized, "password_change_failed", "Current password is incorrect.")
		return
	}
	s.recordAudit(r, domain.AuditLog{
		ActorID: claims.UserID, ActorRole: claims.Role,
		Action: "password_changed", EntityType: "user", EntityID: claims.UserID,
		IPAddress: clientIP(r),
	})
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

func (s *Server) googleAuth(w http.ResponseWriter, r *http.Request) {
	var input domain.GoogleAuthInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	verified, err := s.googleProfile(r.Context(), input)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "google_auth_failed", "Google account could not be verified.")
		return
	}
	user, token, err := s.store.AuthWithGoogle(r.Context(), verified)
	if err != nil {
		writeError(w, http.StatusBadRequest, "google_auth_failed", "Google account could not be registered or logged in.")
		return
	}
	s.recordAudit(r, domain.AuditLog{
		ActorID: user.ID, Actor: user.Name, ActorRole: user.Role,
		Action: "google_login_success", EntityType: "user", EntityID: user.ID,
		IPAddress: clientIP(r), Metadata: map[string]any{"redirectTo": redirectForRole(user.Role)},
	})
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": user, "redirectTo": redirectForRole(user.Role)})
}

func (s *Server) googleAuthConfig(w http.ResponseWriter, r *http.Request) {
	settings, _ := s.store.GoogleSettings(r.Context())
	clientID := firstNonEmptyString(settings.ClientID, s.cfg.GoogleClientID)
	writeJSON(w, http.StatusOK, map[string]any{"clientId": clientID, "enabled": clientID != ""})
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if claims, ok := s.claimsFromRequest(r); ok {
		s.recordAudit(r, domain.AuditLog{
			ActorID: claims.UserID, ActorRole: claims.Role,
			Action: "logout", EntityType: "user", EntityID: claims.UserID,
			IPAddress: clientIP(r),
		})
	}
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	user, err := s.store.UserByID(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "user_not_found", "Authenticated user no longer exists.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]domain.User{"user": user})
}

func (s *Server) countries(w http.ResponseWriter, r *http.Request) {
	countries, err := s.store.Countries(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "countries_failed", "Could not load countries.")
		return
	}
	activeCountries := []domain.Country{}
	for _, country := range countries {
		if country.Active {
			activeCountries = append(activeCountries, country)
		}
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, activeCountries))
}

func (s *Server) currencies(w http.ResponseWriter, r *http.Request) {
	currencies, err := s.store.Currencies(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "currencies_failed", "Could not load currencies.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, currencies))
}

func (s *Server) categories(w http.ResponseWriter, r *http.Request) {
	categories, err := s.store.Categories(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "categories_failed", "Could not load categories.")
		return
	}
	activeCategories := []domain.Category{}
	for _, category := range categories {
		if category.Active {
			activeCategories = append(activeCategories, category)
		}
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, activeCategories))
}

func (s *Server) meetingCategories(w http.ResponseWriter, r *http.Request) {
	settings, err := s.store.MeetingSettings(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "meeting_categories_failed", "Could not load meeting categories.")
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

func (s *Server) adminCountries(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireSuperAdmin(w, r); !ok {
		return
	}
	countries, err := s.store.Countries(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "countries_failed", "Could not load countries.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, countries))
}

func (s *Server) adminCreateCountry(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	var input domain.CountryInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	country, err := s.store.CreateCountry(r.Context(), input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "country_create_failed", "Could not create country. Check code, currency, timezone, and duplicates.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "country_created", EntityType: "country", EntityID: country.Code, Metadata: map[string]any{"name": country.Name, "currency": country.DefaultCurrency}})
	writeJSON(w, http.StatusCreated, country)
}

func (s *Server) adminCountryStatus(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	var input struct {
		Active bool `json:"active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	country, err := s.store.UpdateCountryStatus(r.Context(), r.PathValue("code"), input.Active, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "country_status_failed", "Could not update country status.")
		return
	}
	action := "country_disabled"
	if country.Active {
		action = "country_enabled"
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: action, EntityType: "country", EntityID: country.Code, Metadata: map[string]any{"active": country.Active}})
	writeJSON(w, http.StatusOK, country)
}

func (s *Server) adminCategories(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireSuperAdmin(w, r); !ok {
		return
	}
	categories, err := s.store.Categories(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "categories_failed", "Could not load categories.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, categories))
}

func (s *Server) adminCreateCategory(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	var input domain.CategoryInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	category, err := s.store.CreateCategory(r.Context(), input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "category_create_failed", "Could not create category. Check name, slug, and duplicates.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "category_created", EntityType: "category", EntityID: category.ID, Metadata: map[string]any{"name": category.Name, "slug": category.Slug}})
	writeJSON(w, http.StatusCreated, category)
}

func (s *Server) adminCategoryStatus(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	var input struct {
		Active bool `json:"active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	category, err := s.store.UpdateCategoryStatus(r.Context(), r.PathValue("id"), input.Active, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "category_status_failed", "Could not update category status.")
		return
	}
	action := "category_deactivated"
	if category.Active {
		action = "category_activated"
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: action, EntityType: "category", EntityID: category.ID, Metadata: map[string]any{"active": category.Active}})
	writeJSON(w, http.StatusOK, category)
}

func (s *Server) expos(w http.ResponseWriter, r *http.Request) {
	expos, err := s.store.ListExpos(r.Context(), store.ExpoFilter{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "expos_failed", "Could not load expos.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, domain.ToExpoRecords(expos)))
}

func (s *Server) exhibitorAvailableExpos(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	assignments, err := s.store.ListExpoExhibitors(r.Context(), store.ExpoExhibitorFilter{ExhibitorID: exhibitorID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "expos_failed", "Could not load expos.")
		return
	}
	expos, err := s.store.ListExpos(r.Context(), store.ExpoFilter{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "expos_failed", "Could not load expos.")
		return
	}
	paystackSettings, _ := s.store.PaystackSettings(r.Context())
	writeJSON(w, http.StatusOK, paginatedItems(r, availableExpoRecordsForExhibitor(expos, assignments, paystackSettings)))
}

func (s *Server) resolveQRCode(w http.ResponseWriter, r *http.Request) {
	code, err := s.store.ResolveQRCode(r.Context(), r.PathValue("code"))
	if err != nil {
		writeError(w, http.StatusNotFound, "qr_not_found", "QR code was not found.")
		return
	}
	if claims, ok := s.claimsFromRequest(r); ok && claims.Role == domain.RoleVisitor {
		user, _ := s.store.UserByID(r.Context(), claims.UserID)
		_ = s.store.RecordVisitorActivity(r.Context(), user, code.ExpoID, code.ExpoExhibitorID, "visited", "Opened exhibitor QR code")
	}
	s.recordAudit(r, domain.AuditLog{Action: "qr_resolved", EntityType: "qr_code", EntityID: code.ID, ExpoID: code.ExpoID})
	writeJSON(w, http.StatusOK, code)
}

func (s *Server) adminOverview(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	if !serverAdminRole(claims.Role) {
		writeError(w, http.StatusForbidden, "forbidden", "Administrator access is required.")
		return
	}
	s.recordAudit(r, domain.AuditLog{
		ActorID: claims.UserID, ActorRole: claims.Role,
		Action: "view_admin_overview", EntityType: "admin_dashboard", EntityID: "overview",
		IPAddress: clientIP(r),
	})
	countryCode := adminCountryFilter(r)
	expos, _ := s.store.ListExpos(r.Context(), store.ExpoFilter{CountryCode: countryCode})
	countries, _ := s.store.Countries(r.Context())
	users, _ := s.store.Users(r.Context())
	payments, _ := s.store.ListPayments(r.Context(), store.PaymentFilter{CountryCode: countryCode})
	auditLogs, _ := s.store.AuditLogs(r.Context())
	writeJSON(w, http.StatusOK, adminOverviewFrom(countryCode, expos, countries, users, payments, auditLogs))
}

func (s *Server) adminReports(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	countryCode := adminCountryFilter(r)
	expos, _ := s.store.ListExpos(r.Context(), store.ExpoFilter{CountryCode: countryCode})
	payments, _ := s.store.ListPayments(r.Context(), store.PaymentFilter{CountryCode: countryCode})
	leads, _ := s.store.ListLeads(r.Context(), store.LeadFilter{CountryCode: countryCode})
	notifications, _ := s.store.ListNotifications(r.Context(), store.NotificationFilter{})
	if countryCode != "" {
		expoIDs := map[string]bool{}
		for _, expo := range expos {
			expoIDs[expo.ID] = true
		}
		scopedNotifications := []domain.Notification{}
		for _, notification := range notifications {
			if notification.ExpoID != "" && expoIDs[notification.ExpoID] {
				scopedNotifications = append(scopedNotifications, notification)
			}
		}
		notifications = scopedNotifications
	}
	writeJSON(w, http.StatusOK, adminReportsFrom(expos, payments, leads, notifications))
}

func (s *Server) adminVisitors(w http.ResponseWriter, r *http.Request) {
	s.adminRoleUsers(w, r, domain.RoleVisitor, visitorRecord)
}

func (s *Server) adminOrganizers(w http.ResponseWriter, r *http.Request) {
	s.adminRoleUsers(w, r, domain.RoleOrganizer, organizerRecord)
}

func (s *Server) adminExhibitors(w http.ResponseWriter, r *http.Request) {
	s.adminRoleUsers(w, r, domain.RoleExhibitor, exhibitorRecord)
}

func (s *Server) adminSponsors(w http.ResponseWriter, r *http.Request) {
	s.adminRoleUsers(w, r, domain.RoleSponsor, sponsorRecord)
}

func (s *Server) adminCreateOrganizer(w http.ResponseWriter, r *http.Request) {
	s.adminCreateRoleUser(w, r, domain.RoleOrganizer, "organizer")
}

func (s *Server) adminUpdateOrganizer(w http.ResponseWriter, r *http.Request) {
	s.adminUpdateRoleUser(w, r, domain.RoleOrganizer, "organizer")
}

func (s *Server) adminCreateExhibitor(w http.ResponseWriter, r *http.Request) {
	s.adminCreateRoleUser(w, r, domain.RoleExhibitor, "exhibitor")
}

func (s *Server) adminUpdateExhibitor(w http.ResponseWriter, r *http.Request) {
	s.adminUpdateRoleUser(w, r, domain.RoleExhibitor, "exhibitor")
}

func (s *Server) adminAssignExhibitor(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleAdministrator)
	if !ok {
		return
	}
	var input domain.ExpoExhibitorInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	assignment, err := s.store.AssignExpoExhibitor(r.Context(), input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "assignment_failed", "Could not assign exhibitor to expo.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: assignment.ExpoID, Action: "exhibitor_assigned", EntityType: "expo_exhibitor", EntityID: assignment.ID, Metadata: map[string]any{"exhibitorId": assignment.ExhibitorID, "status": assignment.ActivationStatus}})
	writeJSON(w, http.StatusCreated, assignment)
}

func (s *Server) adminCreateSponsor(w http.ResponseWriter, r *http.Request) {
	s.adminCreateRoleUser(w, r, domain.RoleSponsor, "sponsor")
}

func (s *Server) adminUpdateSponsor(w http.ResponseWriter, r *http.Request) {
	s.adminUpdateRoleUser(w, r, domain.RoleSponsor, "sponsor")
}

func (s *Server) adminUpdateVisitor(w http.ResponseWriter, r *http.Request) {
	s.adminUpdateRoleUser(w, r, domain.RoleVisitor, "visitor")
}

func (s *Server) adminCreateRoleUser(w http.ResponseWriter, r *http.Request, role domain.Role, entity string) {
	actor, ok := s.requireUser(w, r, domain.RoleAdministrator)
	if !ok {
		return
	}
	var input domain.AdminUserInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	input.Role = role
	user, err := s.store.CreateAdminManagedUser(r.Context(), input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, entity+"_create_failed", "Could not create "+entity+". Check email, password, and duplicates.")
		return
	}
	switch role {
	case domain.RoleOrganizer:
		s.sendOrganizerOnboardingEmails(r.Context(), user, input.Password)
	case domain.RoleExhibitor:
		s.sendExhibitorOnboardingEmails(r.Context(), user, input.Password)
	case domain.RoleSponsor:
		s.sendSponsorOnboardingEmails(r.Context(), user, input.Password)
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "admin_" + entity + "_created", EntityType: "user", EntityID: user.ID, Metadata: map[string]any{"role": user.Role}})
	writeJSON(w, http.StatusCreated, userRecord(user))
}

func (s *Server) adminUpdateRoleUser(w http.ResponseWriter, r *http.Request, role domain.Role, entity string) {
	actor, ok := s.requireUser(w, r, domain.RoleAdministrator)
	if !ok {
		return
	}
	var input domain.AdminUserInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	input.Role = role
	user, err := s.store.UpdateAdminManagedUser(r.Context(), r.PathValue("id"), input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, entity+"_update_failed", "Could not update "+entity+". Check email, password, status, and duplicates.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "admin_" + entity + "_updated", EntityType: "user", EntityID: user.ID, Metadata: map[string]any{"role": user.Role, "status": user.Status}})
	writeJSON(w, http.StatusOK, userRecord(user))
}

func (s *Server) adminRoleUsers(w http.ResponseWriter, r *http.Request, role domain.Role, mapper func(domain.User) map[string]any) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	countryCode := adminCountryFilter(r)
	users, err := s.store.Users(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "users_failed", "Could not load users.")
		return
	}
	records := []map[string]any{}
	for _, user := range users {
		if countryCode != "" && !strings.EqualFold(user.CountryCode, countryCode) {
			continue
		}
		if user.Role == role {
			records = append(records, mapper(user))
		}
	}
	writeJSON(w, http.StatusOK, paginatedCollection(r, records, []domain.DashboardStat{
		{ID: "accounts", Label: "Accounts", Value: strconv.Itoa(len(records)), Delta: string(role), Trend: "neutral"},
	}))
}

func (s *Server) adminExpos(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	expos, err := s.store.ListExpos(r.Context(), store.ExpoFilter{CountryCode: adminCountryFilter(r)})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "expos_failed", "Could not load expos.")
		return
	}
	writeJSON(w, http.StatusOK, expoCollection(r, expos))
}

func (s *Server) adminExpoDetail(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	s.writeExpoDetail(w, r, r.PathValue("id"))
}

func (s *Server) adminExpoExhibitors(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	expoID := r.PathValue("id")
	exhibitors, err := s.store.ListExpoExhibitors(r.Context(), store.ExpoExhibitorFilter{ExpoID: expoID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "expo_exhibitors_failed", "Could not load expo exhibitors.")
		return
	}
	records := []map[string]any{}
	for _, item := range exhibitors {
		records = append(records, map[string]any{
			"id": item.ExhibitorID, "assignmentId": item.ID, "company": item.ExhibitorName, "contact": item.ExhibitorName,
			"email": item.ExhibitorEmail, "assignedExpos": item.ExpoName, "boothNumber": item.BoothNumber,
			"boothLabel": item.BoothLabel, "status": item.ActivationStatus, "createdAt": item.CreatedAt.Format(time.RFC3339),
		})
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, records))
}

func (s *Server) adminExpoVisitors(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	leads, err := s.store.ListLeads(r.Context(), store.LeadFilter{ExpoID: r.PathValue("id")})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "expo_visitors_failed", "Could not load expo visitors.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, organizerVisitorRecordsFromLeads(leads)))
}

func (s *Server) adminExpoPayments(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	payments, err := s.store.ListPayments(r.Context(), store.PaymentFilter{ExpoID: r.PathValue("id")})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "expo_payments_failed", "Could not load expo payments.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, paymentRecords(payments)))
}

func (s *Server) adminExpoAnalytics(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	expoID := r.PathValue("id")
	assignments, _ := s.store.ListExpoExhibitors(r.Context(), store.ExpoExhibitorFilter{ExpoID: expoID})
	leads, _ := s.store.ListLeads(r.Context(), store.LeadFilter{ExpoID: expoID})
	payments, _ := s.store.ListPayments(r.Context(), store.PaymentFilter{ExpoID: expoID})
	activeBooths := 0
	hotLeads := 0
	meetingRequests := 0
	preOrders := 0
	paidVolume := int64(0)
	for _, assignment := range assignments {
		if assignment.ActivationStatus == "active" {
			activeBooths++
		}
	}
	for _, payment := range payments {
		if payment.Status == domain.PaymentPaid {
			paidVolume += majorFromMinor(payment.AmountMinor)
		}
	}
	for _, lead := range leads {
		if lead.Temperature == "hot" {
			hotLeads++
		}
		if lead.Status == "meeting_booked" || lead.Source == "meeting" {
			meetingRequests++
		}
		if lead.Source == "pre_order" {
			preOrders++
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"stats": []domain.DashboardStat{
			{ID: "assignedExhibitors", Label: "Assigned Exhibitors", Value: strconv.Itoa(len(assignments)), Delta: "total", Trend: "neutral"},
			{ID: "activeBooths", Label: "Active Exhibitors", Value: strconv.Itoa(activeBooths), Delta: "activated", Trend: "up"},
			{ID: "visitorLeads", Label: "Visitor Leads", Value: strconv.Itoa(len(leads)), Delta: "captured", Trend: "up"},
			{ID: "hotLeads", Label: "Hot Leads", Value: strconv.Itoa(hotLeads), Delta: "priority", Trend: "up"},
			{ID: "paidVolume", Label: "Payments Made", Value: strconv.FormatInt(paidVolume, 10), Delta: "received", Trend: "up"},
			{ID: "meetings", Label: "Meeting Requests", Value: strconv.Itoa(meetingRequests), Delta: "requested", Trend: "neutral"},
			{ID: "preOrders", Label: "Pre-orders", Value: strconv.Itoa(preOrders), Delta: "intent", Trend: "neutral"},
		},
	})
}

func (s *Server) adminExpoAds(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	expoID := r.PathValue("id")
	expo, err := s.store.ExpoByID(r.Context(), expoID)
	if err != nil {
		writeError(w, http.StatusNotFound, "expo_not_found", "Expo was not found.")
		return
	}
	ads, err := s.store.ListSponsorAds(r.Context(), store.SponsorAdFilter{ExpoID: expoID, CountryCode: expo.CountryCode})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "expo_ads_failed", "Could not load expo ads.")
		return
	}
	writeJSON(w, http.StatusOK, adCollection(r, ads))
}

func (s *Server) adminCreateExpo(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleAdministrator)
	if !ok {
		return
	}
	input, ok := decodeExpoInput(w, r)
	if !ok {
		return
	}
	expo, err := s.store.CreateExpo(r.Context(), input, actor)
	if err != nil {
		writeExpoMutationError(w, err)
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: expo.ID, Action: "expo_created", EntityType: "expo", EntityID: expo.ID})
	writeJSON(w, http.StatusCreated, domain.ToExpoRecord(expo))
}

func (s *Server) adminUpdateExpo(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleAdministrator)
	if !ok {
		return
	}
	input, ok := decodeExpoInput(w, r)
	if !ok {
		return
	}
	before, _ := s.store.ExpoByID(r.Context(), r.PathValue("id"))
	expo, err := s.store.UpdateExpo(r.Context(), r.PathValue("id"), input, actor)
	if err != nil {
		writeExpoMutationError(w, err)
		return
	}
	action := "expo_updated"
	if before.ExhibitorActivationFeeMinor != expo.ExhibitorActivationFeeMinor || before.OrganizerCommissionBps != expo.OrganizerCommissionBps {
		action = "expo_pricing_updated"
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: expo.ID, Action: action, EntityType: "expo", EntityID: expo.ID})
	writeJSON(w, http.StatusOK, domain.ToExpoRecord(expo))
}

func (s *Server) adminExpoStatus(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleAdministrator)
	if !ok {
		return
	}
	status, note, ok := decodeExpoStatus(w, r)
	if !ok {
		return
	}
	expo, err := s.store.ChangeExpoStatus(r.Context(), r.PathValue("id"), status, actor)
	if err != nil {
		writeExpoMutationError(w, err)
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: expo.ID, Action: "expo_status_changed", EntityType: "expo", EntityID: expo.ID, Metadata: map[string]any{"status": status, "note": note}})
	writeJSON(w, http.StatusOK, domain.ToExpoRecord(expo))
}

func (s *Server) organizerExpos(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	organizerID := s.effectiveOrganizerID(r.Context(), claims.UserID)
	expos, err := s.store.ListExpos(r.Context(), store.ExpoFilter{OrganizerID: organizerID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "expos_failed", "Could not load expos.")
		return
	}
	writeJSON(w, http.StatusOK, expoCollection(r, expos))
}

func (s *Server) organizerExpoDetail(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	organizerID := s.effectiveOrganizerID(r.Context(), claims.UserID)
	expo, err := s.store.ExpoByID(r.Context(), r.PathValue("id"))
	if err != nil {
		writeExpoMutationError(w, err)
		return
	}
	if expo.OrganizerID != organizerID {
		writeError(w, http.StatusForbidden, "forbidden", "Expo belongs to another organizer.")
		return
	}
	writeJSON(w, http.StatusOK, domain.ToExpoRecord(expo))
}

func (s *Server) organizerCreateExpo(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	workspace := s.organizerWorkspaceUser(r.Context(), actor)
	input, ok := decodeExpoInput(w, r)
	if !ok {
		return
	}
	expo, err := s.store.CreateExpo(r.Context(), input, workspace)
	if err != nil {
		writeExpoMutationError(w, err)
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: expo.ID, Action: "expo_created", EntityType: "expo", EntityID: expo.ID})
	s.notifyAdminsExpoDraftCreated(r.Context(), actor, expo)
	writeJSON(w, http.StatusCreated, domain.ToExpoRecord(expo))
}

func (s *Server) organizerUpdateExpo(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	workspace := s.organizerWorkspaceUser(r.Context(), actor)
	input, ok := decodeExpoInput(w, r)
	if !ok {
		return
	}
	expo, err := s.store.UpdateExpo(r.Context(), r.PathValue("id"), input, workspace)
	if err != nil {
		writeExpoMutationError(w, err)
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: expo.ID, Action: "expo_updated", EntityType: "expo", EntityID: expo.ID})
	writeJSON(w, http.StatusOK, domain.ToExpoRecord(expo))
}

func (s *Server) organizerSubmitExpo(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	workspace := s.organizerWorkspaceUser(r.Context(), actor)
	expo, err := s.store.ChangeExpoStatus(r.Context(), r.PathValue("id"), domain.ExpoSubmittedForReview, workspace)
	if err != nil {
		writeExpoMutationError(w, err)
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: expo.ID, Action: "expo_submitted_for_review", EntityType: "expo", EntityID: expo.ID})
	writeJSON(w, http.StatusOK, domain.ToExpoRecord(expo))
}

func (s *Server) writeExpoDetail(w http.ResponseWriter, r *http.Request, id string) {
	expo, err := s.store.ExpoByID(r.Context(), id)
	if err != nil {
		writeExpoMutationError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, domain.ToExpoRecord(expo))
}

func (s *Server) adminPayments(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	payments, err := s.store.ListPayments(r.Context(), store.PaymentFilter{CountryCode: adminCountryFilter(r)})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "payments_failed", "Could not load payments.")
		return
	}
	writeJSON(w, http.StatusOK, paymentCollection(r, payments))
}

func (s *Server) adminPaymentStatus(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleAdministrator)
	if !ok {
		return
	}
	var input domain.PaymentStatusInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	status := domain.PaymentStatus(strings.TrimSpace(input.Status))
	payment, err := s.store.UpdatePaymentStatus(r.Context(), r.PathValue("id"), status, input.Reason, actor)
	if err != nil {
		writePaymentError(w, err)
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: payment.ExpoID, Action: "payment_status_updated", EntityType: "payment", EntityID: payment.ID, Metadata: map[string]any{"status": payment.Status, "reason": input.Reason}})
	writeJSON(w, http.StatusOK, paymentRecords([]domain.Payment{payment})[0])
}

func (s *Server) organizerPayments(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	organizerID := s.effectiveOrganizerID(r.Context(), claims.UserID)
	payments, err := s.store.ListPayments(r.Context(), store.PaymentFilter{OrganizerID: organizerID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "payments_failed", "Could not load payments.")
		return
	}
	writeJSON(w, http.StatusOK, paymentCollection(r, payments))
}

func (s *Server) adminSettlements(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	payments, err := s.store.ListPayments(r.Context(), store.PaymentFilter{CountryCode: adminCountryFilter(r)})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "settlements_failed", "Could not load settlements.")
		return
	}
	records := s.settlementRecords(r.Context(), payments, "")
	writeJSON(w, http.StatusOK, settlementCollection(r, records))
}

func (s *Server) adminNotifications(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireSuperAdmin(w, r); !ok {
		return
	}
	notifications, err := s.store.ListNotifications(r.Context(), store.NotificationFilter{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "notifications_failed", "Could not load notifications.")
		return
	}
	writeJSON(w, http.StatusOK, s.notificationCollection(r, notifications))
}

func (s *Server) myNotifications(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	notifications, err := s.store.ListNotifications(r.Context(), store.NotificationFilter{UserID: claims.UserID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "notifications_failed", "Could not load notifications.")
		return
	}
	writeJSON(w, http.StatusOK, s.notificationCollection(r, userFacingNotifications(notifications)))
}

func (s *Server) markMyNotificationRead(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	if err := s.store.MarkNotificationRead(r.Context(), r.PathValue("id"), claims.UserID); err != nil {
		writeError(w, http.StatusNotFound, "notification_not_found", "Notification was not found.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "read"})
}

func (s *Server) markMyNotificationsRead(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	count, err := s.store.MarkNotificationsRead(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "notifications_failed", "Could not update notifications.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "read", "count": count})
}

func (s *Server) dismissMyNotification(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	if err := s.store.DismissNotification(r.Context(), r.PathValue("id"), claims.UserID); err != nil {
		writeError(w, http.StatusNotFound, "notification_not_found", "Notification was not found.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "cleared"})
}

func (s *Server) adminCreateNotification(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	var input domain.NotificationInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	notification, err := s.store.CreateNotification(r.Context(), input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "notification_failed", "Could not queue notification.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: notification.ExpoID, Action: "notification_queued", EntityType: "notification", EntityID: notification.ID})
	writeJSON(w, http.StatusCreated, map[string]any{"notification": notificationRecord(notification, ""), "preview": notify.Render(notification)})
}

func (s *Server) queueAndSendAuthEmail(ctx context.Context, input domain.NotificationInput) {
	system := domain.User{ID: "system_auth", Name: "System Auth", Role: domain.RoleAdministrator}
	notification, err := s.store.CreateNotification(ctx, input, system)
	if err != nil {
		s.logger.Warn("auth notification queue failed", "error", err, "template", input.TemplateKey)
		return
	}
	dispatcher := notify.NewDispatcher(s.configWithAdminNotificationSettings(ctx))
	attempt, status, failureReason := dispatcher.Dispatch(ctx, notification)
	_, _ = s.store.RecordNotificationAttempt(ctx, attempt)
	sentAt := ""
	if status == "sent" {
		sentAt = time.Now().UTC().Format(time.RFC3339Nano)
	}
	_ = s.store.UpdateNotificationDelivery(ctx, notification.ID, status, sentAt, failureReason)
}

func (s *Server) queueMeetingNotifications(ctx context.Context, meeting domain.MeetingRecord, actor domain.User) {
	expo, _ := s.store.ExpoByID(ctx, meeting.ExpoID)
	exhibitor, _ := s.store.UserByID(ctx, meeting.ExhibitorID)
	when := meeting.ScheduledAt
	targets := s.meetingNotificationTargets(ctx, meeting, exhibitor)
	if parsed, err := time.Parse(time.RFC3339, meeting.ScheduledAt); err == nil {
		when = formatMeetingTimeForExpo(parsed, expo)
		s.queueMeetingReminders(ctx, meeting, expo, targets, parsed, when)
	}
	message := meeting.Title + " is scheduled for " + when + "."
	if meeting.LocationOrLink != "" {
		message += " Meeting link: " + meeting.LocationOrLink
	}
	exhibitorName := notificationDisplayName(exhibitor)
	if exhibitorName == "" {
		exhibitorName = "exhibitor"
	}
	for _, target := range targets {
		if strings.TrimSpace(target.email) == "" {
			continue
		}
		title := "New expo meeting"
		subject := "Meeting scheduled: " + expo.Name
		ctaLabel := "Open Tandaza"
		ctaURL := frontendLink(s.cfg.FrontendURL, "/exhibitor/my-expos/"+meeting.ExpoID)
		if target.role == domain.RoleVisitor {
			title = "Your meeting is scheduled"
			subject = "Meeting with " + exhibitorName + " at " + expo.Name
			ctaLabel = "Open meeting"
			ctaURL = meeting.LocationOrLink
		}
		s.queueAndSendAuthEmail(ctx, domain.NotificationInput{UserID: target.userID, Role: target.role, ExpoID: meeting.ExpoID, Channel: "email", TemplateKey: "meeting_scheduled", Payload: map[string]any{"email": target.email, "to": target.email, "recipient": target.name, "subject": subject, "title": title, "message": message, "ctaLabel": ctaLabel, "ctaUrl": ctaURL, "meeting": "true", "meetingStatus": "Scheduled", "meetingId": meeting.ID, "meetingTitle": meeting.Title, "meetingType": meeting.MeetingType, "meetingTime": when, "meetingLink": meeting.LocationOrLink, "visitorName": meeting.VisitorName, "visitorEmail": meeting.VisitorEmail, "expoName": expo.Name, "exhibitorName": exhibitorName, "nextStep": "Add this meeting to your calendar and use the meeting link when it is time to join."}})
		if target.canReceiveAppNotifications() {
			s.queueAndSendStoredNotification(ctx, domain.NotificationInput{UserID: target.userID, Role: target.role, ExpoID: meeting.ExpoID, Channel: "in_app", TemplateKey: "meeting_scheduled", Payload: map[string]any{"recipient": target.name, "subject": subject, "title": title, "message": message, "ctaLabel": ctaLabel, "ctaUrl": ctaURL, "meetingId": meeting.ID, "expoName": expo.Name, "exhibitorName": exhibitorName}})
			s.queueAndSendStoredNotification(ctx, domain.NotificationInput{UserID: target.userID, Role: target.role, ExpoID: meeting.ExpoID, Channel: "push", TemplateKey: "meeting_scheduled", Payload: map[string]any{"recipient": target.name, "subject": subject, "title": title, "message": message, "ctaLabel": ctaLabel, "ctaUrl": ctaURL, "meetingId": meeting.ID, "expoName": expo.Name, "exhibitorName": exhibitorName}})
		}
	}
	_ = actor
}

func (s *Server) queueAndSendStoredNotification(ctx context.Context, input domain.NotificationInput) {
	system := domain.User{ID: "system_meetings", Name: "Meeting Scheduler", Role: domain.RoleAdministrator}
	notification, err := s.store.CreateNotification(ctx, input, system)
	if err != nil {
		s.logger.Warn("meeting notification queue failed", "error", err, "template", input.TemplateKey, "channel", input.Channel)
		return
	}
	dispatcher := notify.NewDispatcher(s.configWithAdminNotificationSettings(ctx))
	attempt, status, failureReason := dispatcher.Dispatch(ctx, notification)
	_, _ = s.store.RecordNotificationAttempt(ctx, attempt)
	sentAt := ""
	if status == "sent" {
		sentAt = time.Now().UTC().Format(time.RFC3339Nano)
	}
	_ = s.store.UpdateNotificationDelivery(ctx, notification.ID, status, sentAt, failureReason)
}

func (s *Server) queueMeetingReminders(ctx context.Context, meeting domain.MeetingRecord, expo domain.Expo, targets []meetingNotificationTarget, scheduledAt time.Time, when string) {
	system := domain.User{ID: "system_meetings", Name: "Meeting Scheduler", Role: domain.RoleAdministrator}
	for _, minutes := range []int{30, 5, 1} {
		reminderAt := scheduledAt.Add(-time.Duration(minutes) * time.Minute)
		if !reminderAt.After(time.Now().UTC()) {
			continue
		}
		for _, target := range targets {
			title := fmt.Sprintf("Meeting reminder: %s", meeting.Title)
			message := fmt.Sprintf("Reminder: %s starts in %d minute%s. It is scheduled for %s.", meeting.Title, minutes, pluralSuffix(minutes), when)
			exhibitor, _ := s.store.UserByID(ctx, meeting.ExhibitorID)
			exhibitorName := notificationDisplayName(exhibitor)
			payload := map[string]any{"email": target.email, "to": target.email, "recipient": target.name, "subject": title, "title": "Upcoming meeting", "message": message, "ctaLabel": "Open meeting", "ctaUrl": meeting.LocationOrLink, "meeting": "true", "meetingStatus": fmt.Sprintf("Starts in %d minute%s", minutes, pluralSuffix(minutes)), "meetingId": meeting.ID, "meetingTitle": meeting.Title, "meetingType": meeting.MeetingType, "meetingTime": when, "meetingLink": meeting.LocationOrLink, "visitorName": meeting.VisitorName, "visitorEmail": meeting.VisitorEmail, "expoName": expo.Name, "exhibitorName": exhibitorName, "reminderMinutes": strconv.Itoa(minutes), "nextStep": "This is an automatic reminder. Join using the meeting link when ready."}
			if strings.TrimSpace(target.email) != "" {
				_, _ = s.store.CreateNotification(ctx, domain.NotificationInput{UserID: target.userID, Role: target.role, ExpoID: meeting.ExpoID, Channel: "email", TemplateKey: "meeting_reminder", ScheduledAt: reminderAt.Format(time.RFC3339), Payload: payload}, system)
			}
			if strings.TrimSpace(target.phone) != "" {
				_, _ = s.store.CreateNotification(ctx, domain.NotificationInput{UserID: target.userID, Role: target.role, ExpoID: meeting.ExpoID, Channel: "sms", TemplateKey: "meeting_reminder", ScheduledAt: reminderAt.Format(time.RFC3339), Payload: payload}, system)
			}
			if target.canReceiveAppNotifications() {
				_, _ = s.store.CreateNotification(ctx, domain.NotificationInput{UserID: target.userID, Role: target.role, ExpoID: meeting.ExpoID, Channel: "in_app", TemplateKey: "meeting_reminder", ScheduledAt: reminderAt.Format(time.RFC3339), Payload: payload}, system)
				_, _ = s.store.CreateNotification(ctx, domain.NotificationInput{UserID: target.userID, Role: target.role, ExpoID: meeting.ExpoID, Channel: "push", TemplateKey: "meeting_reminder", ScheduledAt: reminderAt.Format(time.RFC3339), Payload: payload}, system)
			}
		}
	}
}

func (s *Server) queueMeetingCancellationNotifications(ctx context.Context, meeting domain.MeetingRecord, actor domain.User) {
	expo, _ := s.store.ExpoByID(ctx, meeting.ExpoID)
	exhibitor, _ := s.store.UserByID(ctx, meeting.ExhibitorID)
	exhibitorName := notificationDisplayName(exhibitor)
	if exhibitorName == "" {
		exhibitorName = "exhibitor"
	}
	when := meeting.ScheduledAt
	if parsed, err := time.Parse(time.RFC3339, meeting.ScheduledAt); err == nil {
		when = formatMeetingTimeForExpo(parsed, expo)
	}
	targets := []meetingNotificationTarget{}
	seen := map[string]bool{}
	add := func(userID string, email string, name string) {
		email = strings.TrimSpace(strings.ToLower(email))
		if email == "" || seen[email] {
			return
		}
		seen[email] = true
		targets = append(targets, meetingNotificationTarget{userID: strings.TrimSpace(userID), role: domain.RoleVisitor, email: email, name: nonEmpty(name, email)})
	}
	add(meeting.VisitorID, meeting.VisitorEmail, meeting.VisitorName)
	for _, email := range meeting.CCEmails {
		add("", email, email)
	}
	subject := "Meeting cancelled: " + meeting.Title
	message := fmt.Sprintf("%s with %s at %s scheduled for %s has been cancelled.", meeting.Title, exhibitorName, expo.Name, when)
	for _, target := range targets {
		s.queueAndSendAuthEmail(ctx, domain.NotificationInput{UserID: target.userID, Role: target.role, ExpoID: meeting.ExpoID, Channel: "email", TemplateKey: "meeting_cancelled", Payload: map[string]any{"email": target.email, "to": target.email, "recipient": target.name, "subject": subject, "title": "Meeting cancelled", "message": message, "ctaLabel": "Open Tandaza", "ctaUrl": frontendLink(s.cfg.FrontendURL, "/visitor/calendar"), "meeting": "true", "meetingStatus": "Cancelled", "meetingId": meeting.ID, "meetingTitle": meeting.Title, "meetingType": meeting.MeetingType, "meetingTime": when, "meetingLink": meeting.LocationOrLink, "visitorName": meeting.VisitorName, "visitorEmail": meeting.VisitorEmail, "expoName": expo.Name, "exhibitorName": exhibitorName, "nextStep": "No action is required. You can schedule a new meeting from Tandaza if needed."}})
	}
	_ = actor
}

func formatMeetingTimeForExpo(value time.Time, expo domain.Expo) string {
	location := time.UTC
	if loaded, err := time.LoadLocation(strings.TrimSpace(expo.Timezone)); err == nil {
		location = loaded
	}
	return value.In(location).Format("02 Jan 2006 15:04 MST")
}

func userFacingNotifications(items []domain.Notification) []domain.Notification {
	records := []domain.Notification{}
	for _, item := range items {
		if item.Channel == "in_app" {
			records = append(records, item)
		}
	}
	return records
}

func pluralSuffix(value int) string {
	if value == 1 {
		return ""
	}
	return "s"
}

type meetingNotificationTarget struct {
	userID string
	role   domain.Role
	email  string
	phone  string
	name   string
}

func (target meetingNotificationTarget) canReceiveAppNotifications() bool {
	userID := strings.TrimSpace(target.userID)
	return userID != "" && userID != "meeting_cc"
}

func (s *Server) meetingNotificationTargets(ctx context.Context, meeting domain.MeetingRecord, exhibitor domain.User) []meetingNotificationTarget {
	targets := []meetingNotificationTarget{}
	seen := map[string]bool{}
	add := func(userID string, role domain.Role, email string, phone string, name string) {
		email = strings.TrimSpace(strings.ToLower(email))
		key := firstNonEmptyString(email, strings.TrimSpace(phone), strings.TrimSpace(userID))
		if key == "" || seen[key] {
			return
		}
		seen[key] = true
		targets = append(targets, meetingNotificationTarget{userID: strings.TrimSpace(userID), role: role, email: email, phone: strings.TrimSpace(phone), name: nonEmpty(name, firstNonEmptyString(email, phone))})
	}
	if members, err := s.store.ListExhibitorTeam(ctx, meeting.ExhibitorID); err == nil {
		for _, member := range members {
			if member.Status != "" && member.Status != "active" {
				continue
			}
			add(member.ID, domain.RoleExhibitor, member.Email, "", member.Name)
		}
	}
	exhibitorPhone := ""
	if profile, err := s.store.ExhibitorProfile(ctx, exhibitor.ID); err == nil {
		exhibitorPhone = profile.Phone
	}
	add(exhibitor.ID, domain.RoleExhibitor, exhibitor.Email, exhibitorPhone, exhibitor.Name)
	add(meeting.VisitorID, domain.RoleVisitor, meeting.VisitorEmail, meeting.VisitorPhone, meeting.VisitorName)
	for _, email := range meeting.CCEmails {
		add("", domain.RoleVisitor, email, "", email)
	}
	return targets
}

func (s *Server) exhibitorNotificationTargets(ctx context.Context, exhibitor domain.User) []meetingNotificationTarget {
	targets := []meetingNotificationTarget{}
	seen := map[string]bool{}
	add := func(userID string, role domain.Role, email string, phone string, name string) {
		email = strings.TrimSpace(strings.ToLower(email))
		key := firstNonEmptyString(email, strings.TrimSpace(phone), strings.TrimSpace(userID))
		if key == "" || seen[key] {
			return
		}
		seen[key] = true
		targets = append(targets, meetingNotificationTarget{userID: strings.TrimSpace(userID), role: role, email: email, phone: strings.TrimSpace(phone), name: nonEmpty(name, firstNonEmptyString(email, phone))})
	}
	if members, err := s.store.ListExhibitorTeam(ctx, exhibitor.ID); err == nil {
		for _, member := range members {
			if member.Status != "" && member.Status != "active" {
				continue
			}
			add(member.ID, domain.RoleExhibitor, member.Email, "", member.Name)
		}
	}
	exhibitorPhone := ""
	if profile, err := s.store.ExhibitorProfile(ctx, exhibitor.ID); err == nil {
		exhibitorPhone = profile.Phone
	}
	add(exhibitor.ID, domain.RoleExhibitor, exhibitor.Email, exhibitorPhone, exhibitor.Name)
	return targets
}

func (s *Server) leadByID(ctx context.Context, id string) (domain.LeadRecord, bool) {
	leads, err := s.store.ListLeads(ctx, store.LeadFilter{})
	if err != nil {
		return domain.LeadRecord{}, false
	}
	for _, lead := range leads {
		if lead.ID == id {
			return lead, true
		}
	}
	return domain.LeadRecord{}, false
}

func (s *Server) queueLeadFollowUpReminders(ctx context.Context, lead domain.LeadRecord, exhibitor domain.User, activity domain.LeadActivityRecord) {
	scheduledAt, err := time.Parse(time.RFC3339, strings.TrimSpace(activity.ScheduledAt))
	if err != nil || !scheduledAt.After(time.Now().UTC()) {
		return
	}
	expo, _ := s.store.ExpoByID(ctx, lead.ExpoID)
	when := formatMeetingTimeForExpo(scheduledAt, expo)
	targets := s.leadFollowUpNotificationTargets(ctx, lead, exhibitor)
	system := domain.User{ID: "system_followups", Name: "Follow-up Scheduler", Role: domain.RoleAdministrator}
	for _, offset := range []time.Duration{48 * time.Hour, 24 * time.Hour, 30 * time.Minute, 5 * time.Minute} {
		reminderAt := scheduledAt.Add(-offset)
		if !reminderAt.After(time.Now().UTC()) {
			continue
		}
		label := leadFollowUpReminderLabel(offset)
		for _, target := range targets {
			message := fmt.Sprintf("Follow-up reminder: %s is scheduled for %s.", nonEmpty(lead.VisitorName, "this lead"), when)
			if strings.TrimSpace(activity.Notes) != "" {
				message += " Notes: " + strings.TrimSpace(activity.Notes)
			}
			payload := map[string]any{
				"email": target.email, "to": target.email, "phone": target.phone, "recipient": target.name,
				"subject": "Lead follow-up reminder: " + nonEmpty(lead.VisitorName, "visitor"),
				"title":   "Lead follow-up reminder", "message": message,
				"ctaLabel": "Open lead", "ctaUrl": frontendLink(s.cfg.FrontendURL, "/exhibitor/my-expos/"+lead.ExpoID+"?tab=leads"),
				"leadId": lead.ID, "activityId": activity.ID, "expoName": expo.Name, "exhibitorName": notificationDisplayName(exhibitor),
				"visitorName": lead.VisitorName, "visitorEmail": lead.VisitorEmail, "visitorPhone": lead.VisitorPhone,
				"followUpTime": when, "reminderLabel": label,
				"nextStep": "Open Tandaza, review the lead notes, then complete the follow-up.",
			}
			if strings.TrimSpace(target.email) != "" {
				_, _ = s.store.CreateNotification(ctx, domain.NotificationInput{UserID: target.userID, Role: target.role, ExpoID: lead.ExpoID, Channel: "email", TemplateKey: "lead_follow_up_reminder", ScheduledAt: reminderAt.Format(time.RFC3339), Payload: payload}, system)
			}
			if strings.TrimSpace(target.phone) != "" {
				_, _ = s.store.CreateNotification(ctx, domain.NotificationInput{UserID: target.userID, Role: target.role, ExpoID: lead.ExpoID, Channel: "sms", TemplateKey: "lead_follow_up_reminder", ScheduledAt: reminderAt.Format(time.RFC3339), Payload: payload}, system)
			}
			if target.canReceiveAppNotifications() {
				_, _ = s.store.CreateNotification(ctx, domain.NotificationInput{UserID: target.userID, Role: target.role, ExpoID: lead.ExpoID, Channel: "in_app", TemplateKey: "lead_follow_up_reminder", ScheduledAt: reminderAt.Format(time.RFC3339), Payload: payload}, system)
				_, _ = s.store.CreateNotification(ctx, domain.NotificationInput{UserID: target.userID, Role: target.role, ExpoID: lead.ExpoID, Channel: "push", TemplateKey: "lead_follow_up_reminder", ScheduledAt: reminderAt.Format(time.RFC3339), Payload: payload}, system)
			}
		}
	}
}

func (s *Server) leadFollowUpNotificationTargets(ctx context.Context, lead domain.LeadRecord, exhibitor domain.User) []meetingNotificationTarget {
	targets := []meetingNotificationTarget{}
	seen := map[string]bool{}
	add := func(target meetingNotificationTarget) {
		key := firstNonEmptyString(strings.TrimSpace(target.email), strings.TrimSpace(target.phone), strings.TrimSpace(target.userID))
		if key == "" || seen[key] {
			return
		}
		seen[key] = true
		if target.name == "" {
			target.name = firstNonEmptyString(target.email, target.phone, "Recipient")
		}
		targets = append(targets, target)
	}
	for _, target := range s.exhibitorNotificationTargets(ctx, exhibitor) {
		add(target)
	}
	add(meetingNotificationTarget{role: domain.RoleVisitor, email: strings.ToLower(strings.TrimSpace(lead.VisitorEmail)), phone: strings.TrimSpace(lead.VisitorPhone), name: nonEmpty(lead.VisitorName, lead.VisitorEmail)})
	return targets
}

func leadFollowUpReminderLabel(offset time.Duration) string {
	switch offset {
	case 48 * time.Hour:
		return "2 days before"
	case 24 * time.Hour:
		return "1 day before"
	case 30 * time.Minute:
		return "30 minutes before"
	case 5 * time.Minute:
		return "5 minutes before"
	default:
		return "before"
	}
}

func (s *Server) queuePreOrderNotifications(ctx context.Context, lead domain.LeadRecord, actor domain.User) {
	expo, _ := s.store.ExpoByID(ctx, lead.ExpoID)
	exhibitor, _ := s.store.UserByID(ctx, lead.ExhibitorID)
	productName := nonEmpty(lead.ProductName, "Product interest")
	if productName == "Product interest" && len(lead.InterestedProductIds) > 0 {
		productName = strings.Join(lead.InterestedProductIds, ", ")
	}
	quantity := lead.Quantity
	if quantity <= 0 {
		quantity = 1
	}
	currency := nonEmpty(lead.ProductCurrency, expo.CurrencyCode)
	unitPrice := lead.ProductPrice
	total := unitPrice * int64(quantity)
	subject := "Pre-order received: " + productName
	customerName := nonEmpty(lead.VisitorName, "A visitor")
	customerEmail := nonEmpty(lead.VisitorEmail, "Not provided")
	customerPhone := nonEmpty(lead.VisitorPhone, "Not provided")
	targets := s.exhibitorNotificationTargets(ctx, exhibitor)
	if strings.TrimSpace(lead.VisitorEmail) != "" {
		targets = append(targets, meetingNotificationTarget{userID: "", role: domain.RoleVisitor, email: lead.VisitorEmail, name: nonEmpty(lead.VisitorName, lead.VisitorEmail)})
	}
	seen := map[string]bool{}
	for _, target := range targets {
		email := strings.TrimSpace(strings.ToLower(target.email))
		if email == "" || seen[email] {
			continue
		}
		seen[email] = true
		ctaURL := frontendLink(s.cfg.FrontendURL, "/exhibitor/my-expos/"+lead.ExpoID+"?tab=orders")
		title := "New pre-order"
		message := fmt.Sprintf("%s submitted a pre-order for %s during %s. Review the request, confirm availability, and follow up while the visitor's interest is still fresh.", customerName, productName, nonEmpty(expo.Name, "the expo"))
		nextStep := "Review this pre-order in your Tandaza workspace, confirm availability, then contact the visitor with next steps."
		if target.role == domain.RoleVisitor {
			subject = "Your pre-order with " + notificationDisplayName(exhibitor) + " was received"
			title = "Your pre-order was received"
			message = fmt.Sprintf("Thanks %s. Your pre-order interest for %s has been shared with %s. Their team can now review the request and follow up with availability, payment, or delivery details.", nonEmpty(target.name, "there"), productName, notificationDisplayName(exhibitor))
			nextStep = "The exhibitor team will review your request and contact you with the next steps."
			ctaURL = frontendLink(s.cfg.FrontendURL, "/visitor/expos/"+lead.ExpoID)
		}
		s.queueAndSendAuthEmail(ctx, domain.NotificationInput{UserID: target.userID, Role: target.role, ExpoID: lead.ExpoID, Channel: "email", TemplateKey: "pre_order_created", Payload: map[string]any{"email": email, "to": email, "recipient": target.name, "subject": subject, "title": title, "message": message, "ctaLabel": "Open Tandaza", "ctaUrl": ctaURL, "expoName": expo.Name, "exhibitorName": notificationDisplayName(exhibitor), "leadId": lead.ID, "preOrder": "true", "orderRef": "po_" + lead.ID, "productName": productName, "quantity": strconv.Itoa(quantity), "unitPrice": formatMoneyMajor(unitPrice, currency), "total": formatMoneyMajor(total, currency), "currency": currency, "customerName": customerName, "customerEmail": customerEmail, "customerPhone": customerPhone, "nextStep": nextStep}})
		if target.canReceiveAppNotifications() {
			s.queueAndSendStoredNotification(ctx, domain.NotificationInput{UserID: target.userID, Role: target.role, ExpoID: lead.ExpoID, Channel: "in_app", TemplateKey: "pre_order_created", Payload: map[string]any{"recipient": target.name, "subject": subject, "title": title, "message": message, "ctaLabel": "Open Tandaza", "ctaUrl": ctaURL, "expoName": expo.Name, "leadId": lead.ID}})
		}
	}
}

func (s *Server) queueConversationMessageNotifications(ctx context.Context, thread domain.ExhibitorConversationThread, message domain.ChatMessageRecord) {
	expo, _ := s.store.ExpoByID(ctx, thread.ExpoID)
	exhibitor, _ := s.store.UserByID(ctx, thread.ExhibitorID)
	visitor, _ := s.store.UserByID(ctx, thread.VisitorID)
	exhibitorName := firstNonEmptyString(notificationDisplayName(exhibitor), thread.ExhibitorName, "Exhibitor")
	visitorName := firstNonEmptyString(notificationDisplayName(visitor), thread.VisitorName, "Visitor")
	visitorEmail := firstNonEmptyString(visitor.Email, thread.VisitorEmail)
	preview := conversationPreview(message.Message)
	switch message.SenderRole {
	case domain.RoleVisitor:
		subject := "New visitor message from " + visitorName
		title := "New visitor message"
		body := fmt.Sprintf("%s sent a new message to %s during %s: %s", visitorName, exhibitorName, nonEmpty(expo.Name, "the expo"), preview)
		ctaURL := frontendLink(s.cfg.FrontendURL, "/exhibitor/my-expos/"+thread.ExpoID+"?tab=conversations&thread="+thread.ID)
		for _, target := range s.exhibitorNotificationTargets(ctx, exhibitor) {
			if strings.TrimSpace(target.userID) == strings.TrimSpace(message.SenderID) {
				continue
			}
			payload := map[string]any{"email": target.email, "to": target.email, "recipient": target.name, "subject": subject, "title": title, "message": body, "ctaLabel": "Open conversation", "ctaUrl": ctaURL, "expoName": expo.Name, "exhibitorName": exhibitorName, "visitorName": visitorName, "threadId": thread.ID}
			if strings.TrimSpace(target.email) != "" {
				s.queueAndSendAuthEmail(ctx, domain.NotificationInput{UserID: target.userID, Role: target.role, ExpoID: thread.ExpoID, Channel: "email", TemplateKey: "conversation_message", Payload: payload})
			}
			if target.canReceiveAppNotifications() {
				s.queueAndSendStoredNotification(ctx, domain.NotificationInput{UserID: target.userID, Role: target.role, ExpoID: thread.ExpoID, Channel: "in_app", TemplateKey: "conversation_message", Payload: payload})
				s.queueAndSendStoredNotification(ctx, domain.NotificationInput{UserID: target.userID, Role: target.role, ExpoID: thread.ExpoID, Channel: "push", TemplateKey: "conversation_message", Payload: payload})
			}
		}
	case domain.RoleExhibitor:
		subject := "New message from " + exhibitorName
		title := "New exhibitor message"
		body := fmt.Sprintf("%s sent you a new message during %s: %s", exhibitorName, nonEmpty(expo.Name, "the expo"), preview)
		ctaURL := frontendLink(s.cfg.FrontendURL, "/visitor/expos/"+thread.ExpoID+"?tab=conversations&exhibitor="+thread.ExhibitorID)
		payload := map[string]any{"email": visitorEmail, "to": visitorEmail, "recipient": visitorName, "subject": subject, "title": title, "message": body, "ctaLabel": "Open conversation", "ctaUrl": ctaURL, "expoName": expo.Name, "exhibitorName": exhibitorName, "visitorName": visitorName, "threadId": thread.ID}
		if strings.TrimSpace(visitorEmail) != "" {
			s.queueAndSendAuthEmail(ctx, domain.NotificationInput{UserID: thread.VisitorID, Role: domain.RoleVisitor, ExpoID: thread.ExpoID, Channel: "email", TemplateKey: "conversation_message", Payload: payload})
		}
		if strings.TrimSpace(thread.VisitorID) != "" && strings.TrimSpace(thread.VisitorID) != strings.TrimSpace(message.SenderID) {
			s.queueAndSendStoredNotification(ctx, domain.NotificationInput{UserID: thread.VisitorID, Role: domain.RoleVisitor, ExpoID: thread.ExpoID, Channel: "in_app", TemplateKey: "conversation_message", Payload: payload})
			s.queueAndSendStoredNotification(ctx, domain.NotificationInput{UserID: thread.VisitorID, Role: domain.RoleVisitor, ExpoID: thread.ExpoID, Channel: "push", TemplateKey: "conversation_message", Payload: payload})
		}
	}
}

func conversationPreview(value string) string {
	value = strings.TrimSpace(strings.Join(strings.Fields(value), " "))
	if len(value) <= 180 {
		return value
	}
	return value[:177] + "..."
}

func (s *Server) queueVerifiedWelcomeEmails(ctx context.Context, user domain.User) {
	if user.Role != domain.RoleVisitor && user.Role != domain.RoleSponsor {
		return
	}
	name := strings.TrimSpace(user.Name)
	if name == "" {
		name = "there"
	}
	dashboardURL := frontendLink(s.cfg.FrontendURL, redirectForRole(user.Role))
	s.queueAndSendAuthEmail(ctx, domain.NotificationInput{
		UserID:      user.ID,
		Role:        user.Role,
		Channel:     "email",
		TemplateKey: "account_welcome",
		Payload: map[string]any{
			"email":      user.Email,
			"to":         user.Email,
			"subject":    "Welcome to Tandaza",
			"title":      "Welcome to Tandaza, " + name,
			"message":    "Your email is verified. You can now use Tandaza to discover expos, access exhibitor workspaces, follow expo timelines, and keep your expo opportunities in one place.",
			"ctaLabel":   "Open Tandaza",
			"ctaUrl":     dashboardURL,
			"footerText": "You are receiving this because you verified your Tandaza account.",
		},
	})
	s.queueAndSendAuthEmail(ctx, domain.NotificationInput{
		UserID:      user.ID,
		Role:        user.Role,
		Channel:     "email",
		TemplateKey: "founder_welcome",
		Payload: map[string]any{
			"email":      user.Email,
			"to":         user.Email,
			"fromName":   "Evans Mburu, Founder of Tandaza",
			"subject":    "A welcome note from Evans Mburu, Founder of Tandaza",
			"title":      "A note from Evans Mburu",
			"message":    "Welcome to Tandaza. We started Tandaza because expos across Africa create real opportunity, but too much value disappears when the hall closes, when visitors cannot travel, or when exhibitors leave without a clear way to follow up. Our mission is to make every expo more accessible, measurable, and useful for visitors, exhibitors, organizers, and sponsors. For visitors, Tandaza should make it possible to discover expos, follow the day timeline, and engage exhibitors even from another city. For exhibitors, every expo conversation, QR scan, product interest, meeting request, and pre-order intent should become a trackable sales opportunity. For organizers, Tandaza should make it easier to run scalable expos across countries, currencies, exhibitors, sponsors, communications, payments, and reports. For sponsors, visibility should not be guesswork; it should be measurable attention tied to the right expo audience. We are building Tandaza for the physical energy of African expos and the digital access that helps that energy last longer. Thank you for joining us early. Your participation helps us shape a platform that can help more businesses meet, sell, learn, and grow across Africa. - Evans Mburu, Founder of Tandaza",
			"ctaLabel":   "Explore Tandaza",
			"ctaUrl":     dashboardURL,
			"footerText": "A founder welcome sent after verifying your Tandaza account.",
		},
	})
}

func (s *Server) adminDispatchDueNotifications(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	dispatched, sent, failed, err := s.dispatchDueNotifications(r.Context(), actor.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "dispatch_failed", "Could not dispatch due notifications.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "notifications_dispatched", EntityType: "notification", EntityID: "due", Metadata: map[string]any{"count": dispatched, "sent": sent, "failed": failed}})
	writeJSON(w, http.StatusOK, map[string]any{"dispatched": dispatched, "sent": sent, "failed": failed})
}

func (s *Server) dispatchDueNotifications(ctx context.Context, actorID string) (int, int, int, error) {
	due, err := s.store.DueNotifications(ctx, time.Now().UTC().Format(time.RFC3339Nano))
	if err != nil {
		return 0, 0, 0, err
	}
	sent := 0
	failed := 0
	dispatcher := notify.NewDispatcher(s.configWithAdminNotificationSettings(ctx))
	for _, item := range due {
		attempt, status, failureReason := dispatcher.Dispatch(ctx, item)
		_, _ = s.store.RecordNotificationAttempt(ctx, attempt)
		sentAt := ""
		if status == "sent" {
			sent++
			sentAt = time.Now().UTC().Format(time.RFC3339)
		} else {
			failed++
		}
		_ = s.store.UpdateNotificationDelivery(ctx, item.ID, status, sentAt, failureReason)
	}
	if len(due) > 0 && actorID == "notification_worker" {
		_, _ = s.store.RecordAudit(ctx, domain.AuditLog{ActorID: actorID, Actor: "Notification Worker", ActorRole: domain.RoleAdministrator, Action: "notifications_dispatched", EntityType: "notification", EntityID: "due", Metadata: map[string]any{"count": len(due), "sent": sent, "failed": failed}})
	}
	return len(due), sent, failed, nil
}

func (s *Server) adminRetryNotification(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	notification, found := s.notificationByID(r, r.PathValue("id"))
	if !found {
		writeError(w, http.StatusNotFound, "notification_not_found", "Notification was not found.")
		return
	}
	dispatcher := notify.NewDispatcher(s.configWithAdminNotificationSettings(r.Context()))
	attempt, status, failureReason := dispatcher.Dispatch(r.Context(), notification)
	_, _ = s.store.RecordNotificationAttempt(r.Context(), attempt)
	sentAt := ""
	if status == "sent" {
		sentAt = time.Now().UTC().Format(time.RFC3339)
	}
	_ = s.store.UpdateNotificationDelivery(r.Context(), notification.ID, status, sentAt, failureReason)
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: notification.ExpoID, Action: "notification_retried", EntityType: "notification", EntityID: notification.ID, Metadata: map[string]any{"status": status}})
	writeJSON(w, http.StatusOK, map[string]any{"notification": notificationRecord(notification, ""), "attempt": attempt, "status": status})
}

func (s *Server) adminTestSendNotification(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	var input domain.NotificationInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	if input.TemplateKey == "" {
		input.TemplateKey = "admin_test_send"
	}
	notification, err := s.store.CreateNotification(r.Context(), input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "test_send_failed", "Could not queue test notification.")
		return
	}
	dispatcher := notify.NewDispatcher(s.configWithAdminNotificationSettings(r.Context()))
	attempt, status, failureReason := dispatcher.Dispatch(r.Context(), notification)
	_, _ = s.store.RecordNotificationAttempt(r.Context(), attempt)
	sentAt := ""
	if status == "sent" {
		sentAt = time.Now().UTC().Format(time.RFC3339)
	}
	_ = s.store.UpdateNotificationDelivery(r.Context(), notification.ID, status, sentAt, failureReason)
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: notification.ExpoID, Action: "notification_test_sent", EntityType: "notification", EntityID: notification.ID, Metadata: map[string]any{"status": status}})
	writeJSON(w, http.StatusCreated, map[string]any{"notification": notificationRecord(notification, ""), "attempt": attempt, "status": status})
}

func (s *Server) adminNotificationAttempts(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireSuperAdmin(w, r); !ok {
		return
	}
	attempts, err := s.store.ListNotificationAttempts(r.Context(), r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "notification_attempts_failed", "Could not load notification delivery attempts.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, attempts))
}

func (s *Server) adminEmailSettings(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireSuperAdmin(w, r); !ok {
		return
	}
	settings, err := s.store.EmailSettings(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "email_settings_failed", "Could not load email settings.")
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

func (s *Server) adminUpdateEmailSettings(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	var settings domain.EmailSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	updated, err := s.store.UpdateEmailSettings(r.Context(), settings)
	if err != nil {
		writeError(w, http.StatusBadRequest, "email_settings_failed", "Could not update email settings.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "email_settings_updated", EntityType: "settings", EntityID: "email"})
	writeJSON(w, http.StatusOK, updated)
}

func (s *Server) adminSMSSettings(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireSuperAdmin(w, r); !ok {
		return
	}
	settings, err := s.store.SMSSettings(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "sms_settings_failed", "Could not load SMS settings.")
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

func (s *Server) adminUpdateSMSSettings(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	var settings domain.SMSSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	updated, err := s.store.UpdateSMSSettings(r.Context(), settings)
	if err != nil {
		writeError(w, http.StatusBadRequest, "sms_settings_failed", "Could not update SMS settings.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "sms_settings_updated", EntityType: "settings", EntityID: "sms"})
	writeJSON(w, http.StatusOK, updated)
}

func (s *Server) adminAds(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	ads, err := s.store.ListSponsorAds(r.Context(), store.SponsorAdFilter{CountryCode: adminCountryFilter(r)})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "ads_failed", "Could not load ads.")
		return
	}
	writeJSON(w, http.StatusOK, adCollection(r, ads))
}

func (s *Server) adminAdStatus(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleAdministrator)
	if !ok {
		return
	}
	var input domain.StatusInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	ad, err := s.store.UpdateSponsorAdStatus(r.Context(), r.PathValue("id"), input.Status, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "ad_status_failed", "Could not update ad status.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "ad_status_changed", EntityType: "ad", EntityID: ad.ID, Metadata: map[string]any{"status": ad.Status, "note": input.Note}})
	writeJSON(w, http.StatusOK, ad)
}

func (s *Server) adminSettlementStatus(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleAdministrator)
	if !ok {
		return
	}
	var input domain.StatusInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	status, err := s.store.UpdateSettlementStatus(r.Context(), r.PathValue("id"), input.Status, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "settlement_status_failed", "Could not update settlement status.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "settlement_status_changed", EntityType: "settlement", EntityID: r.PathValue("id"), Metadata: map[string]any{"status": status, "note": input.Note}})
	writeJSON(w, http.StatusOK, map[string]any{"id": r.PathValue("id"), "status": status})
}

func (s *Server) adminSponsorPlans(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	plans, err := s.store.SponsorPlans(r.Context(), adminCountryFilter(r))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "sponsor_plans_failed", "Could not load sponsor plans.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, plans))
}

func (s *Server) adminSponsorPlanDetail(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	plan, err := s.store.SponsorPlanByID(r.Context(), r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusNotFound, "sponsor_plan_not_found", "Sponsor plan was not found.")
		return
	}
	writeJSON(w, http.StatusOK, plan)
}

func (s *Server) adminCreateSponsorPlan(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleAdministrator)
	if !ok {
		return
	}
	var input domain.SponsorPlanInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	plan, err := s.store.CreateSponsorPlan(r.Context(), input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "sponsor_plan_create_failed", "Could not create sponsor plan.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "sponsor_plan_created", EntityType: "sponsor_plan", EntityID: plan.ID})
	writeJSON(w, http.StatusCreated, plan)
}

func (s *Server) adminUpdateSponsorPlan(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleAdministrator)
	if !ok {
		return
	}
	var input domain.SponsorPlanInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	plan, err := s.store.UpdateSponsorPlan(r.Context(), r.PathValue("id"), input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "sponsor_plan_update_failed", "Could not update sponsor plan.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "sponsor_plan_updated", EntityType: "sponsor_plan", EntityID: plan.ID, Metadata: map[string]any{"status": plan.Status}})
	writeJSON(w, http.StatusOK, plan)
}

func (s *Server) adminSponsorPlanStatus(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleAdministrator)
	if !ok {
		return
	}
	var input domain.StatusInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	plan, err := s.store.UpdateSponsorPlanStatus(r.Context(), r.PathValue("id"), input.Status, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "sponsor_plan_status_failed", "Could not update sponsor plan status.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "sponsor_plan_status_changed", EntityType: "sponsor_plan", EntityID: plan.ID, Metadata: map[string]any{"status": plan.Status, "note": input.Note}})
	writeJSON(w, http.StatusOK, plan)
}

func (s *Server) adminSponsorAccounts(w http.ResponseWriter, r *http.Request) {
	s.adminRoleUsers(w, r, domain.RoleSponsor, func(user domain.User) map[string]any {
		return map[string]any{
			"id": user.ID, "sponsorName": user.Name, "company": nonEmpty(user.CompanyName, user.Name), "email": user.Email,
			"planName": "Unassigned", "status": "active", "createdAt": "",
		}
	})
}

func (s *Server) adminPaystackSettings(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireSuperAdmin(w, r); !ok {
		return
	}
	settings, err := s.store.PaystackSettings(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "paystack_settings_failed", "Could not load Paystack settings.")
		return
	}
	if settings.CallbackURL == "" {
		settings.CallbackURL = s.cfg.FrontendURL + "/payments/callback"
	}
	writeJSON(w, http.StatusOK, settings)
}

func (s *Server) adminUpdatePaystackSettings(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	var settings domain.PaystackSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	if settings.ProcessingFeeBps < 0 || settings.ProcessingFeeBps >= 10000 {
		writeError(w, http.StatusBadRequest, "invalid_processing_fee", "Processing fee must be between 0 and 99.99 percent.")
		return
	}
	updated, err := s.store.UpdatePaystackSettings(r.Context(), settings)
	if err != nil {
		writeError(w, http.StatusBadRequest, "paystack_settings_failed", "Could not update Paystack settings.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "paystack_settings_updated", EntityType: "settings", EntityID: "paystack"})
	writeJSON(w, http.StatusOK, updated)
}

func (s *Server) adminGoogleSettings(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireSuperAdmin(w, r); !ok {
		return
	}
	settings, err := s.store.GoogleSettings(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "google_settings_failed", "Could not load Google settings.")
		return
	}
	if settings.ClientID == "" {
		settings.ClientID = s.cfg.GoogleClientID
	}
	writeJSON(w, http.StatusOK, settings)
}

func (s *Server) adminUpdateGoogleSettings(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	var settings domain.GoogleSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	updated, err := s.store.UpdateGoogleSettings(r.Context(), settings)
	if err != nil {
		writeError(w, http.StatusBadRequest, "google_settings_failed", "Could not update Google settings.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "google_settings_updated", EntityType: "settings", EntityID: "google"})
	writeJSON(w, http.StatusOK, updated)
}

func (s *Server) adminMeetingSettings(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireSuperAdmin(w, r); !ok {
		return
	}
	settings, err := s.store.MeetingSettings(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "meeting_settings_failed", "Could not load meeting category settings.")
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

func (s *Server) adminUpdateMeetingSettings(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	var settings domain.MeetingSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	updated, err := s.store.UpdateMeetingSettings(r.Context(), settings)
	if err != nil {
		writeError(w, http.StatusBadRequest, "meeting_settings_failed", "Could not update meeting categories.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "meeting_categories_updated", EntityType: "settings", EntityID: "meeting_categories"})
	writeJSON(w, http.StatusOK, updated)
}

func (s *Server) adminOpenAISettings(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireSuperAdmin(w, r); !ok {
		return
	}
	settings, err := s.store.OpenAISettings(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "openai_settings_failed", "Could not load OpenAI settings.")
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

func (s *Server) adminUpdateOpenAISettings(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	var settings domain.OpenAISettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	if strings.TrimSpace(settings.Model) == "" {
		settings.Model = "gpt-4.1-mini"
	}
	updated, err := s.store.UpdateOpenAISettings(r.Context(), settings)
	if err != nil {
		writeError(w, http.StatusBadRequest, "openai_settings_failed", "Could not update OpenAI settings.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "openai_settings_updated", EntityType: "settings", EntityID: "openai"})
	writeJSON(w, http.StatusOK, updated)
}

func (s *Server) adminTestOpenAISettings(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	settings, err := s.store.OpenAISettings(r.Context())
	if err != nil || !settings.Enabled || strings.TrimSpace(settings.APIKey) == "" {
		writeError(w, http.StatusBadRequest, "openai_not_configured", "OpenAI is not enabled or the API key is missing.")
		return
	}
	if _, err := s.generateAISummaryWithOpenAI(r.Context(), settings, "OpenAI configuration test", map[string]any{"test": true}); err != nil {
		writeError(w, http.StatusBadGateway, "openai_test_failed", "Could not reach OpenAI with the configured key.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "openai_settings_tested", EntityType: "settings", EntityID: "openai"})
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

func (s *Server) adminWhatsappSettings(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireSuperAdmin(w, r); !ok {
		return
	}
	settings, err := s.store.WhatsappSettings(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "whatsapp_settings_failed", "Could not load WhatsApp settings.")
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

func (s *Server) adminUpdateWhatsappSettings(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	var settings domain.WhatsappSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	updated, err := s.store.UpdateWhatsappSettings(r.Context(), settings)
	if err != nil {
		writeError(w, http.StatusBadRequest, "whatsapp_settings_failed", "Could not update WhatsApp settings.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "whatsapp_settings_updated", EntityType: "settings", EntityID: "whatsapp"})
	writeJSON(w, http.StatusOK, updated)
}

func (s *Server) organizerOverview(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	organizerID := s.effectiveOrganizerID(r.Context(), claims.UserID)
	expos, _ := s.store.ListExpos(r.Context(), store.ExpoFilter{OrganizerID: organizerID})
	payments, _ := s.store.ListPayments(r.Context(), store.PaymentFilter{OrganizerID: organizerID})
	exhibitors, _ := s.store.ListExpoExhibitors(r.Context(), store.ExpoExhibitorFilter{OrganizerID: organizerID})
	leads, _ := s.store.ListLeads(r.Context(), store.LeadFilter{OrganizerID: organizerID})
	total := int64(0)
	for _, payment := range payments {
		if payment.Status == domain.PaymentPaid {
			total += majorFromMinor(payment.AmountMinor)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"stats": []domain.DashboardStat{
			{ID: "expos", Label: "Expos", Value: strconv.Itoa(len(expos)), Delta: "owned", Trend: "neutral"},
			{ID: "exhibitors", Label: "Exhibitors", Value: strconv.Itoa(len(exhibitors)), Delta: "assigned", Trend: "up"},
			{ID: "visitors", Label: "Visitor Leads", Value: strconv.Itoa(len(leads)), Delta: "engaged", Trend: "up"},
			{ID: "payments", Label: "Payments", Value: strconv.Itoa(len(payments)), Delta: "activation activity", Trend: "neutral"},
		},
		"activities": organizerActivityItems(expos, payments, leads),
		"quickActions": []map[string]any{
			{"id": "createExpo", "label": "Create Expo", "description": "Start a new expo draft", "href": "/organizer/expos/new"},
			{"id": "reports", "label": "View Reports", "description": "Review expo performance", "href": "/organizer/reports"},
		},
		"commissionEarnings": map[string]any{"total": total, "thisMonth": total},
	})
}

func (s *Server) organizerExhibitors(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	organizerID := s.effectiveOrganizerID(r.Context(), claims.UserID)
	exhibitors, _ := s.store.ListExpoExhibitors(r.Context(), store.ExpoExhibitorFilter{OrganizerID: organizerID})
	type exhibitorAggregate struct {
		id        string
		company   string
		email     string
		status    string
		createdAt time.Time
		expos     map[string]map[string]any
	}
	grouped := map[string]*exhibitorAggregate{}
	for _, item := range exhibitors {
		if strings.TrimSpace(item.ExhibitorID) == "" || strings.TrimSpace(item.ExpoID) == "" {
			continue
		}
		record, ok := grouped[item.ExhibitorID]
		if !ok {
			record = &exhibitorAggregate{
				id: item.ExhibitorID, company: item.ExhibitorName, email: item.ExhibitorEmail,
				status: item.ActivationStatus, createdAt: item.CreatedAt, expos: map[string]map[string]any{},
			}
			grouped[item.ExhibitorID] = record
		}
		if item.ActivationStatus == "active" || record.status == "" {
			record.status = item.ActivationStatus
		}
		if item.CreatedAt.After(record.createdAt) {
			record.createdAt = item.CreatedAt
		}
		record.expos[item.ExpoID] = map[string]any{
			"id":        item.ExpoID,
			"name":      nonEmpty(item.ExpoName, item.ExpoID),
			"status":    item.ActivationStatus,
			"createdAt": item.CreatedAt.Format(time.RFC3339),
		}
	}
	records := []map[string]any{}
	for _, item := range grouped {
		expoList := []map[string]any{}
		expoNames := []string{}
		for _, expo := range item.expos {
			expoList = append(expoList, expo)
			expoNames = append(expoNames, fmt.Sprint(expo["name"]))
		}
		sort.SliceStable(expoList, func(i, j int) bool {
			return fmt.Sprint(expoList[i]["name"]) < fmt.Sprint(expoList[j]["name"])
		})
		sort.Strings(expoNames)
		records = append(records, map[string]any{
			"id": item.id, "company": item.company, "contact": item.company, "email": item.email,
			"assignedExpos": strings.Join(expoNames, ", "), "assignedExpoCount": len(expoList), "assignedExpoList": expoList,
			"status": item.status, "createdAt": item.createdAt.Format(time.RFC3339),
		})
	}
	sort.SliceStable(records, func(i, j int) bool {
		return fmt.Sprint(records[i]["company"]) < fmt.Sprint(records[j]["company"])
	})
	writeJSON(w, http.StatusOK, paginatedItems(r, records))
}

func (s *Server) organizerAssignExhibitor(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	workspace := s.organizerWorkspaceUser(r.Context(), actor)
	var input domain.ExpoExhibitorInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	assignment, err := s.store.AssignExpoExhibitor(r.Context(), input, workspace)
	if err != nil {
		writeError(w, http.StatusBadRequest, "assignment_failed", "Could not assign exhibitor to this expo.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: assignment.ExpoID, Action: "organizer_exhibitor_assigned", EntityType: "expo_exhibitor", EntityID: assignment.ID, Metadata: map[string]any{"exhibitorId": assignment.ExhibitorID, "status": assignment.ActivationStatus}})
	writeJSON(w, http.StatusCreated, assignment)
}

type organizerInviteExhibitorInput struct {
	CompanyName       string `json:"companyName"`
	ContactName       string `json:"contactName"`
	Email             string `json:"email"`
	Phone             string `json:"phone"`
	TemporaryPassword string `json:"temporaryPassword"`
}

func (s *Server) organizerInviteExhibitor(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	workspace := s.organizerWorkspaceUser(r.Context(), actor)
	var input organizerInviteExhibitorInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	name := strings.TrimSpace(input.ContactName)
	company := strings.TrimSpace(input.CompanyName)
	password := strings.TrimSpace(input.TemporaryPassword)
	if name == "" || company == "" || !strings.Contains(strings.TrimSpace(input.Email), "@") || len(password) < 8 {
		writeError(w, http.StatusBadRequest, "exhibitor_invite_failed", "Company, contact name, email, and a temporary password are required.")
		return
	}
	user, err := s.store.CreateAdminManagedUser(r.Context(), domain.AdminUserInput{
		Name: name, Email: strings.TrimSpace(input.Email), Password: password, Role: domain.RoleExhibitor,
		CompanyName: company, CountryCode: workspace.CountryCode, Status: "active",
	}, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "exhibitor_invite_failed", "Could not invite exhibitor. Check email, password, and duplicates.")
		return
	}
	s.sendExhibitorOnboardingEmails(r.Context(), user, password)
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "organizer_exhibitor_invited", EntityType: "user", EntityID: user.ID})
	writeJSON(w, http.StatusCreated, userRecord(user))
}

func (s *Server) organizerVisitors(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	organizerID := s.effectiveOrganizerID(r.Context(), claims.UserID)
	leads, err := s.store.ListLeads(r.Context(), store.LeadFilter{OrganizerID: organizerID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "visitors_failed", "Could not load organizer visitors.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, organizerVisitorRecordsFromLeads(leads)))
}

func (s *Server) organizerFeedback(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	organizerID := s.effectiveOrganizerID(r.Context(), claims.UserID)
	exhibitorFeedback, err := s.store.ListOrganizerFeedback(r.Context(), organizerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "feedback_failed", "Could not load organizer feedback.")
		return
	}
	records := []map[string]any{}
	for _, item := range exhibitorFeedback {
		records = append(records, organizerFeedbackRecordMap(item))
	}
	sort.SliceStable(records, func(i, j int) bool {
		return fmt.Sprint(records[i]["createdAt"]) > fmt.Sprint(records[j]["createdAt"])
	})
	writeJSON(w, http.StatusOK, records)
}

func (s *Server) organizerProfile(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	organizerID := s.effectiveOrganizerID(r.Context(), claims.UserID)
	profile, err := s.store.OrganizerProfile(r.Context(), organizerID)
	if err != nil {
		writeError(w, http.StatusNotFound, "profile_not_found", "Organizer profile was not found.")
		return
	}
	writeJSON(w, http.StatusOK, profile)
}

func (s *Server) organizerUpdateProfile(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	ownerID := s.effectiveOrganizerID(r.Context(), actor.ID)
	if ownerID != actor.ID {
		writeError(w, http.StatusForbidden, "main_organizer_required", "Only the main organizer can update the company profile.")
		return
	}
	var input domain.OrganizerProfileInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	profile, err := s.store.UpdateOrganizerProfile(r.Context(), ownerID, input)
	if err != nil {
		writeError(w, http.StatusBadRequest, "profile_update_failed", "Could not update organizer profile.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "organizer_profile_updated", EntityType: "organizer_profile", EntityID: ownerID})
	writeJSON(w, http.StatusOK, profile)
}

func (s *Server) organizerTeam(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	organizerID := s.effectiveOrganizerID(r.Context(), claims.UserID)
	members, err := s.store.ListOrganizerTeam(r.Context(), organizerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "team_failed", "Could not load organizer team.")
		return
	}
	writeJSON(w, http.StatusOK, members)
}

func (s *Server) organizerTeamMember(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	organizerID := s.effectiveOrganizerID(r.Context(), claims.UserID)
	member, err := s.store.OrganizerTeamMemberByID(r.Context(), organizerID, r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusNotFound, "team_member_not_found", "Team member was not found.")
		return
	}
	writeJSON(w, http.StatusOK, member)
}

func (s *Server) organizerCreateTeamMember(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	ownerID := s.effectiveOrganizerID(r.Context(), actor.ID)
	if ownerID != actor.ID {
		writeError(w, http.StatusForbidden, "main_organizer_required", "Only the main organizer can add team members.")
		return
	}
	var input domain.OrganizerTeamMemberInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	password := strings.TrimSpace(input.TemporaryPassword)
	if len(password) < 8 {
		writeError(w, http.StatusBadRequest, "temporary_password_required", "Temporary password must be at least 8 characters.")
		return
	}
	input.Role = "staff"
	input.Status = "active"
	input.Permissions = nil
	member, err := s.store.CreateOrganizerTeamMemberAccount(r.Context(), actor, input)
	if err != nil {
		writeError(w, http.StatusBadRequest, "team_member_create_failed", "Could not create team member. Check email, password, and duplicates.")
		return
	}
	s.sendOrganizerTeamMemberOnboardingEmails(r.Context(), actor, member, password)
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "organizer_team_member_created", EntityType: "organizer_team_member", EntityID: member.ID, Metadata: map[string]any{"role": member.Role}})
	writeJSON(w, http.StatusCreated, member)
}

func (s *Server) organizerUpdateTeamMember(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireUser(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	writeError(w, http.StatusForbidden, "team_member_edit_disabled", "Team member edits are disabled. Remove and re-add the member if details change.")
}

func (s *Server) organizerDeleteTeamMember(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	ownerID := s.effectiveOrganizerID(r.Context(), actor.ID)
	if ownerID != actor.ID {
		writeError(w, http.StatusForbidden, "main_organizer_required", "Only the main organizer can remove team members.")
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" || id == actor.ID || id == ownerID {
		writeError(w, http.StatusForbidden, "cannot_remove_owner", "You cannot remove the main organizer account.")
		return
	}
	if err := s.store.DeleteOrganizerTeamMember(r.Context(), ownerID, id); err != nil {
		writeError(w, http.StatusBadRequest, "team_member_delete_failed", "Could not remove team member.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "organizer_team_member_removed", EntityType: "organizer_team_member", EntityID: id})
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) organizerSponsors(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	organizerID := s.effectiveOrganizerID(r.Context(), claims.UserID)
	sponsors, err := s.store.ListOrganizerSponsors(r.Context(), organizerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "sponsors_failed", "Could not load organizer sponsors.")
		return
	}
	writeJSON(w, http.StatusOK, sponsors)
}

func (s *Server) organizerSponsorDetail(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	organizerID := s.effectiveOrganizerID(r.Context(), claims.UserID)
	sponsor, err := s.store.OrganizerSponsorByID(r.Context(), organizerID, r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusNotFound, "sponsor_not_found", "Sponsor was not found.")
		return
	}
	writeJSON(w, http.StatusOK, sponsor)
}

func (s *Server) organizerCreateSponsor(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireUser(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	writeError(w, http.StatusForbidden, "sponsor_invite_disabled", "Sponsor invitations are currently handled by the platform administrator.")
}

func (s *Server) organizerUpdateSponsor(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	organizerID := s.effectiveOrganizerID(r.Context(), actor.ID)
	var input domain.OrganizerSponsorInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	sponsor, err := s.store.UpdateOrganizerSponsor(r.Context(), organizerID, r.PathValue("id"), input)
	if err != nil {
		writeError(w, http.StatusBadRequest, "sponsor_update_failed", "Could not update sponsor.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "organizer_sponsor_updated", EntityType: "organizer_sponsor", EntityID: sponsor.ID, Metadata: map[string]any{"status": sponsor.Status, "commissionRate": sponsor.CommissionRate}})
	writeJSON(w, http.StatusOK, sponsor)
}

func (s *Server) organizerSettlements(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	organizerID := s.effectiveOrganizerID(r.Context(), claims.UserID)
	payments, err := s.store.ListPayments(r.Context(), store.PaymentFilter{OrganizerID: organizerID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "settlements_failed", "Could not load settlements.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, s.settlementRecords(r.Context(), payments, organizerID)))
}

func (s *Server) organizerReports(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	organizerID := s.effectiveOrganizerID(r.Context(), claims.UserID)
	expos, _ := s.store.ListExpos(r.Context(), store.ExpoFilter{OrganizerID: organizerID})
	payments, _ := s.store.ListPayments(r.Context(), store.PaymentFilter{OrganizerID: organizerID})
	leads, _ := s.store.ListLeads(r.Context(), store.LeadFilter{OrganizerID: organizerID})
	exhibitors, _ := s.store.ListExpoExhibitors(r.Context(), store.ExpoExhibitorFilter{OrganizerID: organizerID})
	writeJSON(w, http.StatusOK, organizerReportsFrom(expos, payments, leads, exhibitors))
}

func (s *Server) organizerPaymentReceipt(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleOrganizer)
	if !ok {
		return
	}
	organizerID := s.effectiveOrganizerID(r.Context(), claims.UserID)
	payment, err := s.store.PaymentByID(r.Context(), r.PathValue("id"))
	if err != nil {
		writePaymentError(w, err)
		return
	}
	expo, err := s.store.ExpoByID(r.Context(), payment.ExpoID)
	if err != nil {
		writeExpoMutationError(w, err)
		return
	}
	if expo.OrganizerID != organizerID {
		writeError(w, http.StatusForbidden, "forbidden", "Payment belongs to another organizer.")
		return
	}
	writeJSON(w, http.StatusOK, paymentReceipt(payment, expo))
}

func (s *Server) exhibitorPayments(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	payments, err := s.store.ListPayments(r.Context(), store.PaymentFilter{PayerID: exhibitorID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "payments_failed", "Could not load payments.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, exhibitorPaymentRecords(payments)))
}

func (s *Server) exhibitorOverview(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	myExpos, _ := s.store.ListExpoExhibitors(r.Context(), store.ExpoExhibitorFilter{ExhibitorID: exhibitorID})
	payments, _ := s.store.ListPayments(r.Context(), store.PaymentFilter{PayerID: exhibitorID})
	allLeads := []domain.LeadRecord{}
	for _, assignment := range myExpos {
		leads, _ := s.store.ListLeads(r.Context(), store.LeadFilter{ExpoID: assignment.ExpoID, ExhibitorID: exhibitorID})
		allLeads = append(allLeads, leads...)
	}
	hotLeads := 0
	newLeads := 0
	overdue := 0
	now := time.Now().UTC()
	for _, lead := range allLeads {
		if lead.Temperature == "hot" {
			hotLeads++
		}
		if lead.Status == "new" || lead.Status == "" {
			newLeads++
		}
		if parsed, err := time.Parse(time.RFC3339, lead.NextFollowUpAt); err == nil && parsed.Before(now) && lead.Status != "won" && lead.Status != "lost" {
			overdue++
		}
	}
	incompleteSetup := 0
	for _, assignment := range myExpos {
		products, _ := s.store.ListProducts(r.Context(), store.ProductFilter{ExpoID: assignment.ExpoID, ExhibitorID: exhibitorID})
		if assignment.ActivationStatus == "active" && len(products) == 0 {
			incompleteSetup++
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"stats": []domain.DashboardStat{
			{ID: "newLeads", Label: "New Leads", Value: strconv.Itoa(newLeads), Delta: "need follow-up", Trend: "up"},
			{ID: "hotLeads", Label: "Hot Leads", Value: strconv.Itoa(hotLeads), Delta: "high intent", Trend: "up"},
			{ID: "overdueFollowups", Label: "Overdue Follow-ups", Value: strconv.Itoa(overdue), Delta: "due now", Trend: "neutral"},
			{ID: "workspaces", Label: "Expo Workspaces", Value: strconv.Itoa(len(myExpos)), Delta: "assigned", Trend: "neutral"},
		},
		"activities": exhibitorActivityItems(myExpos, payments, allLeads),
		"quickActions": []map[string]any{
			{"id": "leads", "label": "Follow Up Leads", "description": "Open your active expo workspace and convert visitor interest", "href": "/exhibitor/my-expos"},
			{"id": "setup", "label": "Complete Workspace Setup", "description": strconv.Itoa(incompleteSetup) + " active workspace(s) need product setup", "href": "/exhibitor/products"},
			{"id": "activation", "label": "Browse Expos", "description": "Find expos available for one-off digital workspace activation", "href": "/exhibitor/expos"},
		},
	})
}

func (s *Server) exhibitorProfile(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), user)
	profile, err := s.store.ExhibitorProfile(r.Context(), workspace.ID)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"id": workspace.ID, "companyName": nonEmpty(workspace.CompanyName, workspace.Name), "description": "", "logoUrl": workspace.AvatarURL, "logo": workspace.AvatarURL, "website": "", "phone": "", "address": "", "email": workspace.Email, "categories": []string{}, "teamMembers": []map[string]string{{"id": workspace.ID, "name": workspace.Name, "email": workspace.Email, "role": "owner"}}, "socialLinks": map[string]string{"linkedin": "", "twitter": "", "instagram": ""}})
		return
	}
	writeJSON(w, http.StatusOK, profile)
}

func (s *Server) exhibitorUpdateProfile(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.ExhibitorProfileInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	profile, err := s.store.UpdateExhibitorProfile(r.Context(), workspace.ID, input)
	if err != nil {
		writeError(w, http.StatusBadRequest, "profile_update_failed", "Could not update exhibitor profile.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "exhibitor_profile_updated", EntityType: "exhibitor_profile", EntityID: workspace.ID})
	writeJSON(w, http.StatusOK, profile)
}

func (s *Server) exhibitorMeetingSettings(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	settings, err := s.store.ExhibitorMeetingSettings(r.Context(), workspace.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "meeting_settings_failed", "Could not load meeting categories.")
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

func (s *Server) exhibitorUpdateMeetingSettings(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var settings domain.MeetingSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	if len(settings.CategoryTypes) > 60 {
		writeError(w, http.StatusBadRequest, "too_many_categories", "Keep meeting categories under 60 items.")
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	updated, err := s.store.UpdateExhibitorMeetingSettings(r.Context(), workspace.ID, settings)
	if err != nil {
		writeError(w, http.StatusBadRequest, "meeting_settings_failed", "Could not update meeting categories.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "exhibitor_meeting_categories_updated", EntityType: "exhibitor_settings", EntityID: workspace.ID, Metadata: map[string]any{"categoryCount": len(updated.CategoryTypes)}})
	writeJSON(w, http.StatusOK, updated)
}

func (s *Server) exhibitorDocuments(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	items, err := s.store.ListExhibitorDocuments(r.Context(), workspace.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "documents_failed", "Could not load company documents.")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) exhibitorCreateDocument(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.CompanyDocumentInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	item, err := s.store.CreateExhibitorDocument(r.Context(), workspace.ID, input)
	if err != nil {
		writeError(w, http.StatusBadRequest, "document_create_failed", "Upload a PDF document with a clear name.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "company_document_uploaded", EntityType: "company_document", EntityID: item.ID, Metadata: map[string]any{"exhibitorId": workspace.ID, "mimeType": item.MimeType, "size": item.Size}})
	writeJSON(w, http.StatusCreated, item)
}

func (s *Server) exhibitorDeleteDocument(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	if err := s.store.DeleteExhibitorDocument(r.Context(), workspace.ID, id); err != nil {
		writeError(w, http.StatusNotFound, "document_delete_failed", "Document was not found.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "company_document_removed", EntityType: "company_document", EntityID: id, Metadata: map[string]any{"exhibitorId": workspace.ID}})
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) exhibitorTeam(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	members, err := s.store.ListExhibitorTeam(r.Context(), exhibitorID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "team_failed", "Could not load exhibitor team.")
		return
	}
	writeJSON(w, http.StatusOK, members)
}

func (s *Server) exhibitorCreateTeamMember(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.OrganizerTeamMemberInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	temporaryPassword := strings.TrimSpace(input.TemporaryPassword)
	if len(temporaryPassword) < 8 {
		writeError(w, http.StatusBadRequest, "temporary_password_required", "Temporary password must be at least 8 characters.")
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	member, err := s.store.CreateExhibitorTeamMemberAccount(r.Context(), workspace, input)
	if err != nil {
		writeError(w, http.StatusBadRequest, "team_member_create_failed", "Could not create team member.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "exhibitor_team_member_created", EntityType: "exhibitor_team_member", EntityID: member.ID, Metadata: map[string]any{"role": member.Role}})
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
		defer cancel()
		s.sendExhibitorTeamMemberOnboardingEmails(ctx, workspace, member, temporaryPassword)
	}()
	writeJSON(w, http.StatusCreated, member)
}

func (s *Server) exhibitorUpdateTeamMember(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.OrganizerTeamMemberInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	if r.PathValue("id") == actor.ID && strings.EqualFold(strings.TrimSpace(input.Status), "inactive") {
		writeError(w, http.StatusForbidden, "cannot_deactivate_self", "You cannot deactivate your own access.")
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	member, err := s.store.UpdateExhibitorTeamMember(r.Context(), workspace.ID, r.PathValue("id"), input)
	if err != nil {
		writeError(w, http.StatusBadRequest, "team_member_update_failed", "Could not update team member.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "exhibitor_team_member_updated", EntityType: "exhibitor_team_member", EntityID: member.ID, Metadata: map[string]any{"status": member.Status}})
	writeJSON(w, http.StatusOK, member)
}

func (s *Server) exhibitorDeleteTeamMember(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	id := r.PathValue("id")
	if id == actor.ID {
		writeError(w, http.StatusForbidden, "cannot_remove_self", "You cannot remove your own access.")
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	if err := s.store.DeleteExhibitorTeamMember(r.Context(), workspace.ID, id); err != nil {
		s.logger.Warn("exhibitor team member delete failed", "error", err, "actorID", actor.ID, "workspaceID", workspace.ID, "memberID", id)
		writeError(w, http.StatusBadRequest, "team_member_delete_failed", "Could not remove team member.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "exhibitor_team_member_removed", EntityType: "exhibitor_team_member", EntityID: id})
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) exhibitorProducts(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	products, err := s.store.ListProducts(r.Context(), store.ProductFilter{ExhibitorID: exhibitorID, ExpoID: r.URL.Query().Get("expoId")})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "products_failed", "Could not load products.")
		return
	}
	writeJSON(w, http.StatusOK, products)
}

func (s *Server) exhibitorProductDetail(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	product, err := s.store.ProductByID(r.Context(), r.PathValue("id"), exhibitorID)
	if err != nil {
		writeError(w, http.StatusNotFound, "product_not_found", "Product could not be found.")
		return
	}
	writeJSON(w, http.StatusOK, product)
}

func (s *Server) exhibitorCreateProduct(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.ProductInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	product, err := s.store.CreateProduct(r.Context(), input, workspace)
	if err != nil {
		writeProductError(w, err)
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: product.ExpoID, Action: "exhibitor_product_created", EntityType: "product", EntityID: product.ID})
	writeJSON(w, http.StatusCreated, product)
}

func (s *Server) exhibitorUpdateProduct(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.ProductInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	product, err := s.store.UpdateProduct(r.Context(), r.PathValue("id"), input, workspace)
	if err != nil {
		writeProductError(w, err)
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: product.ExpoID, Action: "exhibitor_product_updated", EntityType: "product", EntityID: product.ID})
	writeJSON(w, http.StatusOK, product)
}

func (s *Server) exhibitorDeleteProduct(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	product, err := s.store.ProductByID(r.Context(), r.PathValue("id"), workspace.ID)
	if err != nil {
		writeError(w, http.StatusNotFound, "product_not_found", "Product could not be found.")
		return
	}
	if err := s.store.DeleteProduct(r.Context(), r.PathValue("id"), workspace); err != nil {
		writeProductError(w, err)
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: product.ExpoID, Action: "exhibitor_product_deleted", EntityType: "product", EntityID: product.ID})
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (s *Server) exhibitorShowcaseProducts(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input struct {
		ProductIDs []string `json:"productIds"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	productIDs := compactProductIDs(input.ProductIDs)
	if len(productIDs) == 0 {
		writeError(w, http.StatusBadRequest, "showcase_products_required", "Select at least one product to showcase.")
		return
	}
	expoID := r.PathValue("id")
	if !s.expoAcceptsWorkspaceMutation(w, r, expoID, "This expo has ended. You can no longer showcase products for it.") {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), actor.ID)
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	existing, _ := s.store.ListProducts(r.Context(), store.ProductFilter{ExpoID: expoID, ExhibitorID: exhibitorID})
	existingKeys := map[string]bool{}
	for _, product := range existing {
		existingKeys[showcaseProductKey(product)] = true
	}
	created := []domain.ProductRecord{}
	for _, productID := range productIDs {
		source, err := s.store.ProductByID(r.Context(), productID, exhibitorID)
		if err != nil {
			writeError(w, http.StatusNotFound, "product_not_found", "One of the selected products could not be found.")
			return
		}
		if source.ExpoID == expoID || existingKeys[showcaseProductKey(source)] {
			continue
		}
		product, err := s.store.CreateProduct(r.Context(), domain.ProductInput{
			ExpoID: expoID, Name: source.Name, Description: source.Description, Price: source.Price, DiscountedPrice: source.DiscountedPrice,
			Currency: source.Currency, MediaType: source.MediaType, MediaURL: source.MediaURL, DemoVideoURL: source.DemoVideoURL,
			PresentationURL: source.PresentationURL, ImageURLs: source.Images, Specifications: source.Specifications,
			Category: source.Category, Status: "available", Featured: source.Featured,
		}, workspace)
		if err != nil {
			writeProductError(w, err)
			return
		}
		existingKeys[showcaseProductKey(product)] = true
		created = append(created, product)
		s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: expoID, Action: "exhibitor_product_showcased", EntityType: "product", EntityID: product.ID, Metadata: map[string]any{"sourceProductId": productID}})
	}
	writeJSON(w, http.StatusCreated, map[string]any{"products": created})
}

func (s *Server) exhibitorRemoveShowcaseProduct(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	expoID := r.PathValue("id")
	productID := r.PathValue("productId")
	exhibitorID := s.effectiveExhibitorID(r.Context(), actor.ID)
	product, err := s.store.ProductByID(r.Context(), productID, exhibitorID)
	if err != nil || product.ExpoID != expoID {
		writeError(w, http.StatusNotFound, "product_not_found", "Showcased product could not be found.")
		return
	}
	if err := s.store.DeleteProduct(r.Context(), productID, s.exhibitorWorkspaceUser(r.Context(), actor)); err != nil {
		writeProductError(w, err)
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: expoID, Action: "exhibitor_product_unshowcased", EntityType: "product", EntityID: productID})
	writeJSON(w, http.StatusOK, map[string]string{"status": "removed"})
}

func showcaseProductKey(product domain.ProductRecord) string {
	return strings.ToLower(strings.TrimSpace(product.Name)) + "|" + strings.ToLower(strings.TrimSpace(product.Category))
}

func compactProductIDs(values []string) []string {
	items := []string{}
	seen := map[string]bool{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		items = append(items, value)
	}
	return items
}

func (s *Server) exhibitorPaymentReceipt(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	payment, err := s.store.PaymentByID(r.Context(), r.PathValue("id"))
	if err != nil {
		writePaymentError(w, err)
		return
	}
	if payment.PayerID != exhibitorID {
		writeError(w, http.StatusForbidden, "forbidden", "Payment belongs to another exhibitor.")
		return
	}
	expo, err := s.store.ExpoByID(r.Context(), payment.ExpoID)
	if err != nil {
		writeExpoMutationError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, paymentReceipt(payment, expo))
}

func (s *Server) exhibitorCreateActivationPayment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.PaymentInput
	if r.Body != nil && r.Body != http.NoBody {
		_ = json.NewDecoder(r.Body).Decode(&input)
	}
	input.ExpoID = r.PathValue("id")
	input.Purpose = domain.PaymentExhibitorActivation
	input.ROIEstimate = normalizeROIEstimateInput(input.ROIEstimate)
	input.PaymentChannels = normalizePaystackChannels(input.PaymentChannels)
	input.PaymentMethods = normalizePaymentMethods(input.PaymentMethods)
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	payment, err := s.store.CreatePayment(r.Context(), input, workspace)
	if err != nil {
		writePaymentError(w, err)
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: payment.ExpoID, Action: "payment_initialized", EntityType: "payment", EntityID: payment.ID, Metadata: map[string]any{"purpose": payment.Purpose, "provider": payment.Provider, "includeAdsAddon": input.IncludeAdsAddon}})
	checkout, err := s.initializePaystackCheckout(r.Context(), payment, actor.Email, map[string]any{"purpose": payment.Purpose, "expoId": payment.ExpoID, "payerId": workspace.ID, "actorId": actor.ID, "includeAdsAddon": input.IncludeAdsAddon, "paymentChannels": input.PaymentChannels, "paymentMethods": input.PaymentMethods})
	if err != nil {
		s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: payment.ExpoID, Action: "payment_provider_initialization_failed", EntityType: "payment", EntityID: payment.ID, Metadata: map[string]any{"provider": "paystack", "error": err.Error()}})
		writeError(w, http.StatusBadGateway, "payment_provider_failed", "Could not initialize Paystack checkout.")
		return
	}
	if checkout.Reference != "" {
		if updated, err := s.store.UpdatePaymentProviderReference(r.Context(), payment.ID, checkout.Reference); err == nil {
			payment = updated
		}
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"payment":          payment,
		"authorizationUrl": checkout.AuthorizationURL,
		"reference":        checkout.Reference,
		"requiresRedirect": s.paymentGatewayRequiresWebhook(r.Context()),
	})
}

func (s *Server) exhibitorVerifyPaystackPayment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input struct {
		Reference string `json:"reference"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	verification, err := s.verifyPaystackTransaction(r.Context(), input.Reference)
	if err != nil {
		writeError(w, http.StatusBadGateway, "payment_verification_failed", "Could not verify Paystack payment.")
		return
	}
	if verification.Status != "success" {
		writeError(w, http.StatusConflict, "payment_not_successful", "Paystack has not marked this payment as successful.")
		return
	}
	payment, err := s.paymentByPaystackReference(r.Context(), verification.Reference)
	if err != nil {
		writePaymentError(w, err)
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	if payment.PayerID != workspace.ID {
		writeError(w, http.StatusForbidden, "forbidden", "Payment belongs to another exhibitor.")
		return
	}
	if verification.AmountMinor > 0 && verification.AmountMinor != payment.AmountMinor {
		writeError(w, http.StatusConflict, "payment_amount_mismatch", "Paystack amount does not match this activation payment.")
		return
	}
	if verification.CurrencyCode != "" && !strings.EqualFold(verification.CurrencyCode, payment.CurrencyCode) {
		writeError(w, http.StatusConflict, "payment_currency_mismatch", "Paystack currency does not match this activation payment.")
		return
	}
	wasPaid := payment.Status == domain.PaymentPaid
	payment, split, err := s.store.ConfirmPayment(r.Context(), payment.ID, workspace)
	if err != nil {
		writePaymentError(w, err)
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: payment.ExpoID, Action: "payment_callback_verified", EntityType: "payment", EntityID: payment.ID, Metadata: map[string]any{"reference": verification.Reference, "commissionMinor": split.CommissionMinor, "providerResponse": verification.ProviderResponse}})
	if !wasPaid {
		s.queueExhibitorPaymentEmails(r.Context(), payment, split)
	}
	writeJSON(w, http.StatusOK, map[string]any{"payment": payment, "commissionSplit": split, "redirectTo": "/exhibitor/my-expos/" + payment.ExpoID})
}

func (s *Server) exhibitorConfirmPayment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	if s.paymentGatewayRequiresWebhook(r.Context()) {
		writeError(w, http.StatusConflict, "payment_confirmation_requires_webhook", "Payments are confirmed by the Paystack webhook in production mode.")
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	existing, _ := s.store.PaymentByID(r.Context(), r.PathValue("id"))
	wasPaid := existing.Status == domain.PaymentPaid
	payment, split, err := s.store.ConfirmPayment(r.Context(), r.PathValue("id"), workspace)
	if err != nil {
		writePaymentError(w, err)
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: payment.ExpoID, Action: "payment_confirmed", EntityType: "payment", EntityID: payment.ID, Metadata: map[string]any{"commissionMinor": split.CommissionMinor, "platformMinor": split.PlatformMinor}})
	if !wasPaid {
		s.queueExhibitorPaymentEmails(r.Context(), payment, split)
	}
	writeJSON(w, http.StatusOK, map[string]any{"payment": payment, "commissionSplit": split})
}

func (s *Server) paymentByPaystackReference(ctx context.Context, reference string) (domain.Payment, error) {
	reference = strings.TrimSpace(reference)
	if reference == "" {
		return domain.Payment{}, store.ErrNotFound
	}
	if payment, err := s.store.PaymentByID(ctx, reference); err == nil {
		return payment, nil
	}
	payments, err := s.store.ListPayments(ctx, store.PaymentFilter{})
	if err != nil {
		return domain.Payment{}, err
	}
	for _, payment := range payments {
		if payment.ProviderRef == reference || payment.ID == reference {
			return payment, nil
		}
	}
	return domain.Payment{}, store.ErrNotFound
}

func (s *Server) queueExhibitorPaymentEmails(ctx context.Context, payment domain.Payment, split domain.CommissionSplit) {
	expo, err := s.store.ExpoByID(ctx, payment.ExpoID)
	if err != nil {
		return
	}
	amount := moneyText(majorFromMinor(payment.AmountMinor), payment.CurrencyCode)
	receiptURL := frontendLink(s.cfg.FrontendURL, "/exhibitor/payments/"+payment.ID+"/receipt")
	s.queueAndSendAuthEmail(ctx, domain.NotificationInput{
		UserID:      payment.PayerID,
		Role:        payment.PayerRole,
		ExpoID:      payment.ExpoID,
		Channel:     "email",
		TemplateKey: "payment_receipt",
		Payload: map[string]any{
			"email":      payment.PayerEmail,
			"to":         payment.PayerEmail,
			"subject":    "Your Tandaza payment receipt",
			"title":      "Payment received",
			"expoName":   expo.Name,
			"message":    "We received your " + amount + " payment for " + expo.Name + ". Your digital expo workspace is now active, and your receipt is available in Tandaza.",
			"ctaLabel":   "View receipt",
			"ctaUrl":     receiptURL,
			"footerText": "You are receiving this because your company activated a Tandaza expo workspace.",
		},
	})
	if split.CommissionMinor <= 0 || strings.TrimSpace(expo.OrganizerID) == "" {
		return
	}
	organizer, err := s.store.UserByID(ctx, expo.OrganizerID)
	if err != nil || strings.TrimSpace(organizer.Email) == "" {
		return
	}
	commission := moneyText(majorFromMinor(split.CommissionMinor), payment.CurrencyCode)
	organizerURL := frontendLink(s.cfg.FrontendURL, "/organizer/payments/"+payment.ID+"/receipt")
	s.queueAndSendAuthEmail(ctx, domain.NotificationInput{
		UserID:      organizer.ID,
		Role:        organizer.Role,
		ExpoID:      payment.ExpoID,
		Channel:     "email",
		TemplateKey: "organizer_commission_payment",
		Payload: map[string]any{
			"email":      organizer.Email,
			"to":         organizer.Email,
			"subject":    "Commission earned on " + expo.Name,
			"title":      "Commission recorded",
			"expoName":   expo.Name,
			"message":    payment.PayerName + " has paid " + amount + " for Tandaza activation on " + expo.Name + ". Your organizer commission is " + commission + " and has been recorded for settlement.",
			"ctaLabel":   "View payment",
			"ctaUrl":     organizerURL,
			"footerText": "You are receiving this because you organize this expo on Tandaza.",
		},
	})
}

func (s *Server) exhibitorMyExpos(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	items, err := s.store.ListExpoExhibitors(r.Context(), store.ExpoExhibitorFilter{ExhibitorID: exhibitorID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "my_expos_failed", "Could not load exhibitor expos.")
		return
	}
	expos, _ := s.store.ListExpos(r.Context(), store.ExpoFilter{})
	exposByID := map[string]domain.Expo{}
	for _, expo := range expos {
		exposByID[expo.ID] = expo
	}
	payments, _ := s.store.ListPayments(r.Context(), store.PaymentFilter{PayerID: exhibitorID})
	writeJSON(w, http.StatusOK, paginatedItems(r, myExpoRegistrations(items, exposByID, payments)))
}

func (s *Server) exhibitorExpoLeads(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	leads, err := s.store.ListLeads(r.Context(), store.LeadFilter{ExpoID: r.PathValue("id"), ExhibitorID: exhibitorID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "leads_failed", "Could not load leads.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, leads))
}

func (s *Server) exhibitorExpoLeadsExport(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	leads, err := s.store.ListLeads(r.Context(), store.LeadFilter{ExpoID: r.PathValue("id"), ExhibitorID: exhibitorID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "leads_export_failed", "Could not export leads.")
		return
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="tandaza-leads.csv"`)
	writer := csv.NewWriter(w)
	_ = writer.Write([]string{"name", "email", "phone", "temperature", "status", "next_follow_up_at", "last_contacted_at", "notes", "follow_up_notes", "captured_at"})
	for _, lead := range leads {
		_ = writer.Write([]string{lead.VisitorName, lead.VisitorEmail, lead.VisitorPhone, lead.Temperature, lead.Status, lead.NextFollowUpAt, lead.LastContactedAt, lead.Notes, lead.FollowUpNotes, lead.CapturedAt})
	}
	writer.Flush()
}

func (s *Server) exhibitorUpdateLead(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.LeadUpdateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	lead, err := s.store.UpdateLead(r.Context(), r.PathValue("id"), input, workspace)
	if err != nil {
		writeError(w, http.StatusBadRequest, "lead_update_failed", "Could not update lead.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: lead.ExpoID, Action: "exhibitor_lead_updated", EntityType: "lead", EntityID: lead.ID, Metadata: map[string]any{"status": lead.Status, "temperature": lead.Temperature}})
	writeJSON(w, http.StatusOK, lead)
}

func (s *Server) exhibitorRecordLeadActivity(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.LeadActivityInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	activity, err := s.store.RecordLeadActivity(r.Context(), r.PathValue("id"), input, workspace)
	if err != nil {
		writeError(w, http.StatusBadRequest, "lead_activity_failed", "Could not record lead activity.")
		return
	}
	if activity.Type == "follow_up" && strings.TrimSpace(activity.ScheduledAt) != "" {
		if lead, found := s.leadByID(r.Context(), r.PathValue("id")); found {
			cancelled, _ := s.store.CancelLeadFollowUpNotifications(r.Context(), lead.ID)
			s.queueLeadFollowUpReminders(r.Context(), lead, workspace, activity)
			s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: lead.ExpoID, Action: "exhibitor_lead_follow_up_reminders_queued", EntityType: "lead", EntityID: lead.ID, Metadata: map[string]any{"activityId": activity.ID, "cancelledPrevious": cancelled}})
		}
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "exhibitor_lead_activity_recorded", EntityType: "lead", EntityID: r.PathValue("id"), Metadata: map[string]any{"type": activity.Type}})
	writeJSON(w, http.StatusCreated, activity)
}

func (s *Server) exhibitorSendLeadMessage(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.LeadMessageInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	channel := strings.ToLower(strings.TrimSpace(input.Channel))
	if channel == "" {
		channel = "email"
	}
	if channel != "email" && channel != "sms" && channel != "whatsapp" {
		writeError(w, http.StatusBadRequest, "invalid_channel", "Channel must be email, sms, or whatsapp.")
		return
	}
	message := strings.TrimSpace(input.Message)
	if len(message) < 3 {
		writeError(w, http.StatusBadRequest, "message_required", "Message is required.")
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	lead, err := s.store.UpdateLead(r.Context(), r.PathValue("id"), domain.LeadUpdateInput{Status: "contacted", Temperature: "warm", FollowUpNotes: message}, workspace)
	if err != nil {
		writeError(w, http.StatusBadRequest, "lead_message_failed", "Could not prepare lead message.")
		return
	}
	notification, err := s.store.CreateNotification(r.Context(), domain.NotificationInput{
		ExpoID: lead.ExpoID, Role: domain.RoleVisitor, Channel: channel, TemplateKey: "exhibitor_follow_up",
		Payload: map[string]any{"subject": "Follow-up from " + nonEmpty(workspace.CompanyName, workspace.Name), "message": message, "email": lead.VisitorEmail, "phone": lead.VisitorPhone, "leadId": lead.ID},
	}, workspace)
	if err != nil {
		writeError(w, http.StatusBadRequest, "lead_message_failed", "Could not save lead message.")
		return
	}
	activity, _ := s.store.RecordLeadActivity(r.Context(), lead.ID, domain.LeadActivityInput{Type: channel, Notes: message}, workspace)
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: lead.ExpoID, Action: "exhibitor_lead_message_queued", EntityType: "lead", EntityID: lead.ID, Metadata: map[string]any{"channel": channel, "notificationId": notification.ID}})
	writeJSON(w, http.StatusCreated, map[string]any{"notification": notification, "activity": activity, "lead": lead})
}

func (s *Server) exhibitorExpoConversations(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	threads, err := s.store.ListChatThreads(r.Context(), store.ChatThreadFilter{ExpoID: r.PathValue("id"), ExhibitorID: workspace.ID}, workspace)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "conversations_failed", "Could not load conversations.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, threads))
}

func (s *Server) exhibitorSendChatMessage(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.ChatMessageInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	input.ThreadID = r.PathValue("threadId")
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	thread, message, err := s.store.CreateChatMessage(r.Context(), r.PathValue("id"), workspace.ID, input, workspace)
	if err != nil {
		writeError(w, http.StatusBadRequest, "chat_message_failed", "Could not send chat message.")
		return
	}
	s.chatHub.broadcast(thread.ID, chatSocketEvent{Type: "message", Thread: thread, Message: message})
	s.queueConversationMessageNotifications(r.Context(), thread, message)
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: thread.ExpoID, Action: "exhibitor_chat_message_sent", EntityType: "chat_thread", EntityID: thread.ID})
	writeJSON(w, http.StatusCreated, map[string]any{"thread": thread, "message": message})
}

func (s *Server) exhibitorExpoLiveStream(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	stream, err := s.store.ExhibitorLiveStream(r.Context(), r.PathValue("id"), exhibitorID)
	if err != nil {
		writeError(w, http.StatusNotFound, "live_stream_not_found", "Could not load live stream settings.")
		return
	}
	writeJSON(w, http.StatusOK, stream)
}

func (s *Server) exhibitorUpdateExpoLiveStream(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.ExhibitorLiveStreamInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	stream, err := s.store.UpdateExhibitorLiveStream(r.Context(), r.PathValue("id"), workspace.ID, input, workspace)
	if err != nil {
		writeError(w, http.StatusBadRequest, "live_stream_update_failed", "Add a valid YouTube live stream link.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: stream.ExpoID, Action: "exhibitor_live_stream_updated", EntityType: "live_stream", EntityID: stream.ExpoID + ":" + stream.ExhibitorID, Metadata: map[string]any{"enabled": stream.Enabled}})
	writeJSON(w, http.StatusOK, stream)
}

func (s *Server) exhibitorExpoQRCode(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	qr, err := s.store.EnsureExhibitorQRCode(r.Context(), r.PathValue("id"), exhibitorID)
	if err != nil {
		writeError(w, http.StatusNotFound, "qr_not_found", "Could not create or load QR code for this expo.")
		return
	}
	writeJSON(w, http.StatusOK, qr)
}

func (s *Server) exhibitorExpoQRCodeSVG(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	qr, err := s.store.EnsureExhibitorQRCode(r.Context(), r.PathValue("id"), exhibitorID)
	if err != nil {
		writeError(w, http.StatusNotFound, "qr_not_found", "Could not create or load QR code for this expo.")
		return
	}
	target := strings.TrimRight(s.cfg.FrontendURL, "/") + qr.TargetPath
	w.Header().Set("Content-Type", "image/svg+xml")
	w.Header().Set("Content-Disposition", `attachment; filename="tandaza-workspace-qr.svg"`)
	_, _ = io.WriteString(w, boothQRCodeSVG(qr.Code, target))
}

func (s *Server) exhibitorExpoOrders(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	leads, _ := s.store.ListLeads(r.Context(), store.LeadFilter{ExpoID: r.PathValue("id"), ExhibitorID: exhibitorID})
	writeJSON(w, http.StatusOK, preOrdersFromLeads(leads))
}

func (s *Server) exhibitorUpdateExpoOrder(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	status := validPreOrderStatus(input.Status)
	if status == "" {
		writeError(w, http.StatusBadRequest, "invalid_preorder_status", "Choose a valid pre-order status.")
		return
	}
	expoID := r.PathValue("id")
	orderID := strings.TrimPrefix(r.PathValue("orderId"), "po_")
	exhibitorID := s.effectiveExhibitorID(r.Context(), actor.ID)
	leads, err := s.store.ListLeads(r.Context(), store.LeadFilter{ExpoID: expoID, ExhibitorID: exhibitorID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "preorder_update_failed", "Could not load pre-order.")
		return
	}
	var lead domain.LeadRecord
	for _, item := range leads {
		if item.ID == orderID {
			lead = item
			break
		}
	}
	if lead.ID == "" || !isPreOrderLead(lead) {
		writeError(w, http.StatusNotFound, "preorder_not_found", "Pre-order was not found.")
		return
	}
	leadStatus := lead.Status
	switch status {
	case "delivered":
		leadStatus = "won"
	case "cancelled":
		leadStatus = "lost"
	case "confirmed", "processing", "ready_for_delivery":
		leadStatus = "contacted"
	}
	updated, err := s.store.UpdateLead(r.Context(), lead.ID, domain.LeadUpdateInput{
		Status:               leadStatus,
		Temperature:          lead.Temperature,
		FollowUpNotes:        setPreOrderStatusNote(lead.FollowUpNotes, status),
		NextFollowUpAt:       lead.NextFollowUpAt,
		InterestedProductIds: lead.InterestedProductIds,
	}, s.exhibitorWorkspaceUser(r.Context(), actor))
	if err != nil {
		writeError(w, http.StatusBadRequest, "preorder_update_failed", "Could not update pre-order status.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: expoID, Action: "exhibitor_preorder_status_updated", EntityType: "pre_order", EntityID: "po_" + lead.ID, Metadata: map[string]any{"status": status}})
	orders := preOrdersFromLeads([]domain.LeadRecord{updated})
	if len(orders) == 0 {
		writeError(w, http.StatusInternalServerError, "preorder_update_failed", "Could not reload pre-order.")
		return
	}
	writeJSON(w, http.StatusOK, orders[0])
}

func (s *Server) exhibitorExpoReminders(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireRole(w, r, domain.RoleExhibitor); !ok {
		return
	}
	writeJSON(w, http.StatusOK, []map[string]any{})
}

func (s *Server) exhibitorExpoMeetings(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	meetings, err := s.store.ListMeetings(r.Context(), store.MeetingFilter{ExpoID: r.PathValue("id"), ExhibitorID: exhibitorID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "meetings_failed", "Could not load meetings.")
		return
	}
	writeJSON(w, http.StatusOK, meetings)
}

func (s *Server) exhibitorCreateExpoMeeting(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.MeetingInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	input.CCEmails = cleanEmailList(input.CCEmails)
	if len(input.CCEmails) > 10 {
		writeError(w, http.StatusBadRequest, "invalid_cc_emails", "You can invite up to 10 additional email addresses.")
		return
	}
	for _, email := range input.CCEmails {
		if !validEmailAddress(email) {
			writeError(w, http.StatusBadRequest, "invalid_cc_emails", "Enter valid CC email addresses.")
			return
		}
	}
	expoID := r.PathValue("id")
	exhibitorID := s.effectiveExhibitorID(r.Context(), actor.ID)
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	if strings.TrimSpace(input.Location) == "" {
		writeError(w, http.StatusBadRequest, "meeting_link_required", "Meeting link is required.")
		return
	}
	meeting, err := s.store.CreateMeeting(r.Context(), expoID, exhibitorID, input, workspace)
	if err != nil {
		writeError(w, http.StatusBadRequest, "meeting_create_failed", "Could not create meeting. Check visitor details and schedule.")
		return
	}
	s.queueMeetingNotifications(r.Context(), meeting, actor)
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: expoID, Action: "exhibitor_meeting_created", EntityType: "meeting", EntityID: meeting.ID})
	writeJSON(w, http.StatusCreated, meeting)
}

func (s *Server) exhibitorDeleteExpoMeeting(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	expoID := r.PathValue("id")
	meetingID := r.PathValue("meetingId")
	exhibitorID := s.effectiveExhibitorID(r.Context(), actor.ID)
	meetings, err := s.store.ListMeetings(r.Context(), store.MeetingFilter{ExpoID: expoID, ExhibitorID: exhibitorID})
	if err != nil {
		writeError(w, http.StatusNotFound, "meeting_not_found", "Meeting was not found.")
		return
	}
	var meeting domain.MeetingRecord
	for _, item := range meetings {
		if item.ID == meetingID {
			meeting = item
			break
		}
	}
	if meeting.ID == "" {
		writeError(w, http.StatusNotFound, "meeting_not_found", "Meeting was not found.")
		return
	}
	if err := s.store.DeleteMeeting(r.Context(), meetingID, expoID, exhibitorID); err != nil {
		writeError(w, http.StatusNotFound, "meeting_not_found", "Meeting was not found.")
		return
	}
	cancelledNotifications, _ := s.store.CancelMeetingNotifications(r.Context(), meetingID)
	s.queueMeetingCancellationNotifications(r.Context(), meeting, actor)
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: expoID, Action: "exhibitor_meeting_deleted", EntityType: "meeting", EntityID: meetingID})
	writeJSON(w, http.StatusOK, map[string]any{"status": "deleted", "cancelledNotifications": cancelledNotifications})
}

func (s *Server) exhibitorExpoAnalytics(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	leads, err := s.store.ListLeads(r.Context(), store.LeadFilter{ExpoID: r.PathValue("id"), ExhibitorID: exhibitorID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "analytics_failed", "Could not load expo analytics.")
		return
	}
	preOrders := preOrdersFromLeads(leads)
	meetings, err := s.store.ListMeetings(r.Context(), store.MeetingFilter{ExpoID: r.PathValue("id"), ExhibitorID: exhibitorID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "analytics_failed", "Could not load expo analytics.")
		return
	}
	visitors := exhibitorVisitorsFromLeads(leads)
	assignments, _ := s.store.ListExpoExhibitors(r.Context(), store.ExpoExhibitorFilter{ExpoID: r.PathValue("id"), ExhibitorID: exhibitorID})
	payments, _ := s.store.ListPayments(r.Context(), store.PaymentFilter{ExpoID: r.PathValue("id"), PayerID: exhibitorID})
	leadTemperature := map[string]int{"hot": 0, "warm": 0, "cold": 0}
	leadStatus := map[string]int{"new": 0, "contacted": 0, "meeting_booked": 0, "proposal_sent": 0, "won": 0, "lost": 0}
	preOrderStatus := map[string]int{"pending": 0, "confirmed": 0, "processing": 0, "ready_for_delivery": 0, "delivered": 0, "cancelled": 0}
	preOrderValue := int64(0)
	now := time.Now().UTC()
	upcomingMeetings := 0
	completedMeetings := 0
	cancelledMeetings := 0
	for _, lead := range leads {
		if _, ok := leadTemperature[lead.Temperature]; ok {
			leadTemperature[lead.Temperature]++
		}
		if _, ok := leadStatus[lead.Status]; ok {
			leadStatus[lead.Status]++
		}
	}
	for _, item := range preOrders {
		status, _ := item["status"].(string)
		if _, ok := preOrderStatus[status]; ok {
			preOrderStatus[status]++
		}
		switch amount := item["amount"].(type) {
		case int:
			preOrderValue += int64(amount)
		case int64:
			preOrderValue += amount
		case float64:
			preOrderValue += int64(amount)
		}
	}
	for _, meeting := range meetings {
		switch meeting.Status {
		case "cancelled", "no_show":
			cancelledMeetings++
			continue
		case "completed":
			completedMeetings++
			continue
		}
		scheduledAt, err := time.Parse(time.RFC3339, meeting.ScheduledAt)
		if err == nil && (scheduledAt.After(now) || scheduledAt.Equal(now)) {
			upcomingMeetings++
		}
	}
	leadScore := len(leads) * 20
	if leadScore > 100 {
		leadScore = 100
	}
	summary := "No engagement data has been recorded yet."
	recommendations := []string{}
	if len(leads) > 0 {
		summary = fmt.Sprintf("%d visitor lead(s) have engaged with your expo workspace.", len(leads))
		recommendations = append(recommendations, "Follow up with new leads within 24 hours.", "Keep your product catalog current before the next visitor push.")
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"expoId":      r.PathValue("id"),
		"exhibitorId": exhibitorID,
		"overview": map[string]any{
			"totalLeads":        len(leads),
			"uniqueVisitors":    len(visitors),
			"meetings":          len(meetings),
			"upcomingMeetings":  upcomingMeetings,
			"completedMeetings": completedMeetings,
			"cancelledMeetings": cancelledMeetings,
			"preOrders":         len(preOrders),
			"preOrderValue":     preOrderValue,
			"leadTemperature":   leadTemperature,
			"leadStatus":        leadStatus,
			"preOrderStatus":    preOrderStatus,
		},
		"roi":                exhibitorROIAnalytics(assignments, payments, leads, preOrders, meetings),
		"visitorInsights":    map[string]any{"peakHours": peakHoursFromLeads(leads), "demographics": map[string]int{"visitor_leads": len(leads)}, "leadQualityScore": leadScore},
		"performanceSummary": summary,
		"recommendations":    recommendations,
		"generatedAt":        time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *Server) exhibitorExpoROI(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	assignments, err := s.store.ListExpoExhibitors(r.Context(), store.ExpoExhibitorFilter{ExpoID: r.PathValue("id"), ExhibitorID: exhibitorID})
	if err != nil || len(assignments) == 0 {
		writeError(w, http.StatusNotFound, "roi_not_found", "Expo workspace ROI settings were not found.")
		return
	}
	writeJSON(w, http.StatusOK, roiEstimateRecord(assignments[0]))
}

func (s *Server) exhibitorUpdateExpoROI(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.ROIEstimateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	input = normalizeROIEstimateInput(input)
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	assignment, err := s.store.UpdateExhibitorROI(r.Context(), r.PathValue("id"), workspace.ID, input)
	if err != nil {
		writeError(w, http.StatusBadRequest, "roi_update_failed", "Could not update ROI estimate.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: r.PathValue("id"), Action: "exhibitor_roi_updated", EntityType: "expo_exhibitor", EntityID: assignment.ID})
	writeJSON(w, http.StatusOK, roiEstimateRecord(assignment))
}

func (s *Server) exhibitorExpoVisitors(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	leads, err := s.store.ListLeads(r.Context(), store.LeadFilter{ExpoID: r.PathValue("id"), ExhibitorID: exhibitorID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "visitors_failed", "Could not load expo visitors.")
		return
	}
	writeJSON(w, http.StatusOK, exhibitorVisitorsFromLeads(leads))
}

func (s *Server) exhibitorExpoFeedback(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	items, err := s.store.ListExhibitorFeedback(r.Context(), store.ExhibitorFeedbackFilter{ExpoID: r.PathValue("id"), ExhibitorID: exhibitorID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "feedback_failed", "Could not load feedback.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, items))
}

func (s *Server) exhibitorSubmitOrganizerFeedback(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	actor, err := s.store.UserByID(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Sign in again.")
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	var input domain.OrganizerFeedbackInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	item, err := s.store.CreateOrganizerFeedback(r.Context(), r.PathValue("id"), exhibitorID, input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "organizer_feedback_failed", "Could not submit feedback. Check rating and comments.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: item.ExpoID, Action: "organizer_feedback_submitted", EntityType: "organizer_feedback", EntityID: item.ID, Metadata: map[string]any{"organizerId": item.OrganizerID, "rating": item.Rating, "category": item.Category}})
	writeJSON(w, http.StatusCreated, item)
}

func (s *Server) exhibitorExpoCampaigns(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	items, err := s.store.ListExhibitorCampaignDrafts(r.Context(), store.ExhibitorCampaignDraftFilter{ExpoID: r.PathValue("id"), ExhibitorID: exhibitorID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "campaigns_failed", "Could not load campaign drafts.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, items))
}

func (s *Server) exhibitorCreateExpoCampaign(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.ExhibitorCampaignDraftInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), actor.ID)
	item, err := s.store.CreateExhibitorCampaignDraft(r.Context(), r.PathValue("id"), exhibitorID, input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "campaign_failed", "Could not create campaign draft. Check channel, audience, subject, and message.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: r.PathValue("id"), Action: "exhibitor_campaign_draft_created", EntityType: "exhibitor_campaign_draft", EntityID: item.ID, Metadata: map[string]any{"channel": item.Channel, "audience": item.Audience, "exhibitorId": exhibitorID}})
	writeJSON(w, http.StatusCreated, item)
}

func (s *Server) exhibitorExpoDocuments(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	items, err := s.store.ListExpoDocuments(r.Context(), r.PathValue("id"), exhibitorID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "documents_failed", "Could not load expo documents.")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) exhibitorCreateExpoDocument(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.CompanyDocumentInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	if !s.expoAcceptsWorkspaceMutation(w, r, r.PathValue("id"), "This expo has ended. You can no longer add documents to it.") {
		return
	}
	item, err := s.store.CreateExpoDocument(r.Context(), r.PathValue("id"), exhibitorID, input)
	if err != nil {
		writeError(w, http.StatusBadRequest, "document_create_failed", "Upload a PDF expo document with a clear name.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: claims.UserID, Actor: claims.Email, ActorRole: domain.RoleExhibitor, Action: "expo_document_uploaded", EntityType: "expo_document", EntityID: item.ID, Metadata: map[string]any{"expoId": item.ExpoID, "exhibitorId": item.ExhibitorID, "mimeType": item.MimeType, "size": item.Size}})
	writeJSON(w, http.StatusCreated, item)
}

func (s *Server) exhibitorDeleteExpoDocument(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	id := strings.TrimSpace(r.PathValue("documentId"))
	if err := s.store.DeleteExpoDocument(r.Context(), r.PathValue("id"), exhibitorID, id); err != nil {
		writeError(w, http.StatusNotFound, "document_delete_failed", "Document was not found.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: claims.UserID, Actor: claims.Email, ActorRole: domain.RoleExhibitor, Action: "expo_document_removed", EntityType: "expo_document", EntityID: id, Metadata: map[string]any{"expoId": r.PathValue("id"), "exhibitorId": exhibitorID}})
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) exhibitorExpoAds(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	exhibitorID := s.effectiveExhibitorID(r.Context(), claims.UserID)
	ads, _ := s.store.ListSponsorAds(r.Context(), store.SponsorAdFilter{SponsorID: exhibitorID, ExpoID: r.PathValue("id")})
	writeJSON(w, http.StatusOK, ads)
}

func (s *Server) exhibitorCreateExpoAd(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.SponsorAdInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	input.ExpoID = r.PathValue("id")
	input.Status = nonEmpty(input.Status, "pending_payment")
	if !normalizeWorkspaceAdInput(w, &input) {
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	if !s.expoAcceptsWorkspaceMutation(w, r, input.ExpoID, "This expo has ended. You can no longer submit ads for it.") {
		return
	}
	if !s.exhibitorHasAdsAddon(r.Context(), input.ExpoID, workspace.ID) {
		writeError(w, http.StatusForbidden, "ads_addon_required", "Create ads add-on payment is required before creating ads for this expo.")
		return
	}
	input.Status = "active"
	existing, err := s.store.ListSponsorAds(r.Context(), store.SponsorAdFilter{SponsorID: workspace.ID, ExpoID: input.ExpoID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "ad_failed", "Could not load existing workspace ad.")
		return
	}
	if len(existing) > 0 {
		writeError(w, http.StatusBadRequest, "ad_limit_reached", "Only one ad can be created for this expo workspace. Edit the existing ad instead.")
		return
	}
	ad, err := s.store.CreateSponsorAd(r.Context(), input, workspace)
	if err != nil {
		writeError(w, http.StatusBadRequest, "ad_failed", "Could not create workspace boost.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: input.ExpoID, Action: "exhibitor_boost_created", EntityType: "sponsor_ad", EntityID: ad.ID})
	writeJSON(w, http.StatusCreated, ad)
}

func (s *Server) exhibitorUpdateExpoAd(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleExhibitor)
	if !ok {
		return
	}
	var input domain.SponsorAdInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	input.ExpoID = r.PathValue("id")
	if !normalizeWorkspaceAdInput(w, &input) {
		return
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), actor)
	if !s.expoAcceptsWorkspaceMutation(w, r, input.ExpoID, "This expo has ended. You can no longer submit ads for it.") {
		return
	}
	if !s.exhibitorHasAdsAddon(r.Context(), input.ExpoID, workspace.ID) {
		writeError(w, http.StatusForbidden, "ads_addon_required", "Create ads add-on payment is required before editing ads for this expo.")
		return
	}
	ad, err := s.store.UpdateSponsorAd(r.Context(), r.PathValue("adId"), input, workspace)
	if err != nil {
		writeError(w, http.StatusBadRequest, "ad_update_failed", "Could not update workspace ad.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: input.ExpoID, Action: "exhibitor_boost_updated", EntityType: "sponsor_ad", EntityID: ad.ID})
	writeJSON(w, http.StatusOK, ad)
}

func normalizeWorkspaceAdInput(w http.ResponseWriter, input *domain.SponsorAdInput) bool {
	input.MediaURL = strings.TrimSpace(input.MediaURL)
	if input.MediaURL == "" {
		writeError(w, http.StatusBadRequest, "ad_banner_required", "Upload a 728 x 90 px ad banner before saving this ad.")
		return false
	}
	input.MediaType = "image"
	input.Dimensions = "728x90"
	input.Placement = "banner"
	return true
}

func (s *Server) expoAcceptsWorkspaceMutation(w http.ResponseWriter, r *http.Request, expoID string, message string) bool {
	expo, err := s.store.ExpoByID(r.Context(), expoID)
	if err != nil {
		writeError(w, http.StatusNotFound, "expo_not_found", "Expo could not be found.")
		return false
	}
	if expoEndedByDate(expo, time.Now()) {
		writeError(w, http.StatusForbidden, "expo_ended", message)
		return false
	}
	return true
}

func expoEndedByDate(expo domain.Expo, now time.Time) bool {
	if expo.EndDate.IsZero() {
		return false
	}
	loc := time.UTC
	if strings.TrimSpace(expo.Timezone) != "" {
		if loaded, err := time.LoadLocation(strings.TrimSpace(expo.Timezone)); err == nil {
			loc = loaded
		}
	}
	return expo.EndDate.Format("2006-01-02") < now.In(loc).Format("2006-01-02")
}

func (s *Server) exhibitorHasAdsAddon(ctx context.Context, expoID string, exhibitorID string) bool {
	expo, err := s.store.ExpoByID(ctx, expoID)
	if err != nil || expo.AdsAddonFeeMinor <= 0 {
		return false
	}
	required := expo.ExhibitorActivationFeeMinor + expo.AdsAddonFeeMinor
	payments, err := s.store.ListPayments(ctx, store.PaymentFilter{ExpoID: expoID, PayerID: exhibitorID})
	if err != nil {
		return false
	}
	for _, payment := range payments {
		if payment.Purpose == domain.PaymentExhibitorActivation && payment.Status == domain.PaymentPaid && payment.AmountMinor >= required {
			return true
		}
	}
	return false
}

func (s *Server) createExpoLeadForExpo(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	user, err := s.store.UserByID(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "user_not_found", "Authenticated user no longer exists.")
		return
	}
	var input domain.LeadInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	if user.Role == domain.RoleExhibitor {
		s.exhibitorCreateLeadForExpo(w, r, user, input)
		return
	}
	if user.Role != domain.RoleVisitor {
		writeError(w, http.StatusForbidden, "forbidden", "Visitor or exhibitor access is required.")
		return
	}
	exhibitors, err := s.store.ListExpoExhibitors(r.Context(), store.ExpoExhibitorFilter{ExpoID: r.PathValue("id")})
	if err != nil || len(exhibitors) == 0 {
		writeError(w, http.StatusNotFound, "exhibitor_not_found", "No active exhibitor workspace was found for this expo.")
		return
	}
	exhibitorID := strings.TrimSpace(r.URL.Query().Get("exhibitor"))
	if exhibitorID == "" {
		exhibitorID = strings.TrimSpace(r.URL.Query().Get("booth"))
	}
	if exhibitorID == "" {
		exhibitorID = strings.TrimSpace(input.Source)
	}
	selected := exhibitors[0]
	for _, exhibitor := range exhibitors {
		if exhibitor.ID == exhibitorID || exhibitor.ExhibitorID == exhibitorID {
			selected = exhibitor
			break
		}
	}
	if strings.TrimSpace(input.Action) == "pre_order" {
		if err := s.enrichPreOrderInput(r.Context(), selected.ExhibitorID, selected.ExpoID, &input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_preorder_product", "Choose a valid product for this pre-order.")
			return
		}
	}
	lead, err := s.store.CreateLead(r.Context(), selected.ID, input, user)
	if err != nil {
		writeError(w, http.StatusBadRequest, "lead_failed", "Could not capture lead.")
		return
	}
	action := "lead_created"
	switch strings.TrimSpace(input.Action) {
	case "meeting":
		action = "meeting_requested"
	case "pre_order":
		action = "pre_order_intent_created"
	case "interest":
		action = "visitor_interest_created"
	case "visit":
		action = "visitor_exhibit_visited"
	}
	s.recordAudit(r, domain.AuditLog{ActorID: claims.UserID, Actor: user.Name, ActorRole: user.Role, ExpoID: lead.ExpoID, Action: action, EntityType: "lead", EntityID: lead.ID})
	writeJSON(w, http.StatusCreated, lead)
}

func (s *Server) enrichPreOrderInput(ctx context.Context, exhibitorID string, expoID string, input *domain.LeadInput) error {
	productID := strings.TrimSpace(input.ProductID)
	if productID == "" {
		return store.ErrInvalidCredentials
	}
	product, err := s.store.ProductByID(ctx, productID, exhibitorID)
	if err != nil {
		return err
	}
	if strings.TrimSpace(product.ExpoID) != "" && strings.TrimSpace(product.ExpoID) != strings.TrimSpace(expoID) {
		return store.ErrInvalidCredentials
	}
	input.ProductName = product.Name
	input.ProductPrice = product.Price
	if product.DiscountedPrice > 0 {
		input.ProductPrice = product.DiscountedPrice
	}
	input.ProductCurrency = product.Currency
	if input.Quantity <= 0 {
		input.Quantity = 1
	}
	return nil
}

func (s *Server) exhibitorCreateLeadForExpo(w http.ResponseWriter, r *http.Request, user domain.User, input domain.LeadInput) {
	exhibitorID := s.effectiveExhibitorID(r.Context(), user.ID)
	exhibitors, err := s.store.ListExpoExhibitors(r.Context(), store.ExpoExhibitorFilter{ExpoID: r.PathValue("id"), ExhibitorID: exhibitorID})
	if err != nil || len(exhibitors) == 0 {
		writeError(w, http.StatusNotFound, "exhibitor_not_found", "No active exhibitor workspace was found for this expo.")
		return
	}
	selected := domain.ExpoExhibitor{}
	for _, exhibitor := range exhibitors {
		if isActiveBooth(exhibitor) {
			selected = exhibitor
			break
		}
	}
	if selected.ID == "" {
		writeError(w, http.StatusForbidden, "workspace_inactive", "Activate this expo workspace before adding leads.")
		return
	}
	if strings.TrimSpace(input.Source) == "" {
		input.Source = "manual"
	}
	input.CCEmails = cleanEmailList(input.CCEmails)
	if len(input.CCEmails) > 10 {
		writeError(w, http.StatusBadRequest, "invalid_cc_emails", "You can invite up to 10 additional email addresses.")
		return
	}
	for _, email := range input.CCEmails {
		if !validEmailAddress(email) {
			writeError(w, http.StatusBadRequest, "invalid_cc_emails", "Enter valid CC email addresses.")
			return
		}
	}
	if strings.TrimSpace(input.Action) == "pre_order" {
		if err := s.enrichPreOrderInput(r.Context(), selected.ExhibitorID, selected.ExpoID, &input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_preorder_product", "Choose a valid product for this pre-order.")
			return
		}
	}
	workspace := s.exhibitorWorkspaceUser(r.Context(), user)
	lead, err := s.store.CreateLead(r.Context(), selected.ID, input, user)
	if err != nil {
		writeError(w, http.StatusBadRequest, "lead_failed", "Could not create lead.")
		return
	}
	update := domain.LeadUpdateInput{Status: nonEmpty(input.Status, "new"), Temperature: input.Temperature, FollowUpNotes: input.Notes}
	switch strings.TrimSpace(input.Action) {
	case "meeting":
		update.Status = "meeting_booked"
		update.NextFollowUpAt = input.ScheduledAt
	case "pre_order":
		update.Status = "proposal_sent"
	case "call":
		update.Status = "contacted"
		update.NextFollowUpAt = input.ScheduledAt
	}
	if update.Temperature == "" {
		update.Temperature = lead.Temperature
	}
	if updated, updateErr := s.store.UpdateLead(r.Context(), lead.ID, update, workspace); updateErr == nil {
		lead = updated
	}
	if strings.TrimSpace(input.Action) == "meeting" {
		if strings.TrimSpace(input.Location) == "" {
			writeError(w, http.StatusBadRequest, "meeting_link_required", "Meeting link is required.")
			return
		}
		meetingInput := domain.MeetingInput{
			LeadID:       lead.ID,
			VisitorName:  lead.VisitorName,
			VisitorEmail: lead.VisitorEmail,
			VisitorPhone: lead.VisitorPhone,
			Title:        nonEmpty(input.Title, "Meeting with "+nonEmpty(lead.VisitorName, "visitor")),
			MeetingType:  "Post-expo follow-up",
			ScheduledAt:  input.ScheduledAt,
			Location:     input.Location,
			Notes:        input.Notes,
			CCEmails:     input.CCEmails,
		}
		if meeting, meetingErr := s.store.CreateMeeting(r.Context(), lead.ExpoID, exhibitorID, meetingInput, workspace); meetingErr == nil {
			s.queueMeetingNotifications(r.Context(), meeting, user)
			s.recordAudit(r, domain.AuditLog{ActorID: user.ID, Actor: user.Name, ActorRole: user.Role, ExpoID: lead.ExpoID, Action: "exhibitor_meeting_created_from_lead", EntityType: "meeting", EntityID: meeting.ID})
		}
	}
	if strings.TrimSpace(input.Action) == "pre_order" {
		s.queuePreOrderNotifications(r.Context(), lead, user)
	}
	s.recordAudit(r, domain.AuditLog{ActorID: user.ID, Actor: user.Name, ActorRole: user.Role, ExpoID: lead.ExpoID, Action: "manual_lead_created", EntityType: "lead", EntityID: lead.ID, Metadata: map[string]any{"source": input.Source, "action": input.Action}})
	writeJSON(w, http.StatusCreated, lead)
}

func (s *Server) visitorExpoAction(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	user, ok := s.requireUser(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	var input domain.LeadInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	expoID := r.PathValue("id")
	exhibitorID := strings.TrimSpace(r.URL.Query().Get("exhibitor"))
	if exhibitorID == "" {
		exhibitorID = strings.TrimSpace(r.URL.Query().Get("booth"))
	}
	if exhibitorID == "" {
		exhibitorID = strings.TrimSpace(input.Source)
	}
	if exhibitorID == "" {
		writeError(w, http.StatusBadRequest, "exhibitor_required", "Choose an exhibitor before sending visitor interest.")
		return
	}
	exhibitors, err := s.store.ListExpoExhibitors(r.Context(), store.ExpoExhibitorFilter{ExpoID: expoID})
	if err != nil || len(exhibitors) == 0 {
		writeError(w, http.StatusNotFound, "exhibitor_not_found", "No active exhibitor workspace was found for this expo.")
		return
	}
	var selected domain.ExpoExhibitor
	for _, exhibitor := range exhibitors {
		if !isActiveBooth(exhibitor) {
			continue
		}
		if exhibitor.ID == exhibitorID || exhibitor.ExhibitorID == exhibitorID {
			selected = exhibitor
			break
		}
	}
	if selected.ID == "" {
		writeError(w, http.StatusNotFound, "exhibitor_not_found", "The selected exhibitor workspace is not active for visitor engagement.")
		return
	}
	if strings.TrimSpace(input.Action) == "pre_order" {
		if err := s.enrichPreOrderInput(r.Context(), selected.ExhibitorID, selected.ExpoID, &input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_preorder_product", "Choose a valid product for this pre-order.")
			return
		}
	}
	lead, err := s.store.CreateLead(r.Context(), selected.ID, input, user)
	if err != nil {
		writeError(w, http.StatusBadRequest, "lead_failed", "Could not capture visitor interest.")
		return
	}
	action := "visitor_interest_created"
	switch strings.TrimSpace(input.Action) {
	case "visit":
		action = "visitor_exhibit_visited"
	case "meeting":
		action = "visitor_meeting_requested"
		if strings.TrimSpace(input.ScheduledAt) == "" {
			break
		}
		expo, _ := s.store.ExpoByID(r.Context(), expoID)
		exhibitorUser, _ := s.store.UserByID(r.Context(), selected.ExhibitorID)
		if strings.TrimSpace(input.Location) == "" {
			if link := s.googleMeetLinkForMeeting(r.Context(), expo, domain.MeetingInput{
				Title: nonEmpty(input.Title, "Meeting with "+nonEmpty(user.Name, "visitor")), MeetingType: "Online demo", ScheduledAt: input.ScheduledAt, Notes: input.Notes,
			}, user.Email, exhibitorUser.Email); link != "" {
				input.Location = link
			}
		}
		meeting, meetingErr := s.store.CreateMeeting(r.Context(), expoID, selected.ExhibitorID, domain.MeetingInput{
			LeadID: lead.ID, VisitorName: user.Name, VisitorEmail: user.Email, VisitorPhone: input.Phone,
			Title: nonEmpty(input.Title, "Meeting with "+nonEmpty(user.Name, "visitor")), MeetingType: "Online demo", ScheduledAt: input.ScheduledAt, Location: input.Location, Notes: input.Notes,
		}, user)
		if meetingErr == nil {
			s.queueMeetingNotifications(r.Context(), meeting, user)
		}
	case "pre_order":
		action = "visitor_pre_order_intent_created"
		s.queuePreOrderNotifications(r.Context(), lead, user)
	}
	s.recordAudit(r, domain.AuditLog{ActorID: claims.UserID, Actor: user.Name, ActorRole: user.Role, ExpoID: lead.ExpoID, Action: action, EntityType: "lead", EntityID: lead.ID})
	writeJSON(w, http.StatusCreated, lead)
}

func (s *Server) visitorRecordActivity(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	var input domain.VisitorActivityInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	expoID := strings.TrimSpace(r.PathValue("id"))
	activityType := strings.ToLower(strings.TrimSpace(input.Type))
	if activityType == "" {
		writeError(w, http.StatusBadRequest, "activity_type_required", "Choose an activity type.")
		return
	}
	if _, err := s.store.ExpoByID(r.Context(), expoID); err != nil {
		writeError(w, http.StatusNotFound, "expo_not_found", "Expo was not found.")
		return
	}
	boothID := strings.TrimSpace(input.BoothID)
	if boothID != "" {
		exhibitors, err := s.store.ListExpoExhibitors(r.Context(), store.ExpoExhibitorFilter{ExpoID: expoID})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "activity_failed", "Could not validate exhibitor activity.")
			return
		}
		matched := ""
		for _, exhibitor := range exhibitors {
			if exhibitor.ID == boothID || exhibitor.ExhibitorID == boothID {
				matched = exhibitor.ID
				break
			}
		}
		if matched == "" {
			writeError(w, http.StatusNotFound, "exhibitor_not_found", "Exhibitor was not found for this expo.")
			return
		}
		boothID = matched
	}
	description := strings.TrimSpace(input.Description)
	if description == "" {
		description = strings.ReplaceAll(activityType, "_", " ")
	}
	if err := s.store.RecordVisitorActivity(r.Context(), user, expoID, boothID, activityType, description); err != nil {
		writeError(w, http.StatusInternalServerError, "activity_failed", "Could not record visitor activity.")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"status": "recorded"})
}

func (s *Server) visitorDashboard(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	timeline, _ := s.store.VisitorTimeline(r.Context(), claims.UserID)
	bookings, _ := s.store.VisitorBookings(r.Context(), claims.UserID)
	favorites, _ := s.store.VisitorFavorites(r.Context(), claims.UserID)
	activities := []domain.VisitorActivityItem{}
	for _, day := range timeline {
		activities = append(activities, day.Activities...)
	}
	writeJSON(w, http.StatusOK, domain.VisitorDashboardStats{
		TotalBookings: len(bookings), UpcomingEvents: len(bookings), TotalVisits: len(activities), FavoritesCount: len(favorites),
		RecentActivity: activities, UpcomingBookings: bookings,
	})
}

func (s *Server) visitorExpos(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireRole(w, r, domain.RoleVisitor); !ok {
		return
	}
	expos, err := s.store.ListExpos(r.Context(), store.ExpoFilter{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "expos_failed", "Could not load visitor expos.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, visitorExpoRecords(expos)))
}

func (s *Server) visitorExpoDetail(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	user, _ := s.store.UserByID(r.Context(), claims.UserID)
	expo, err := s.store.ExpoByID(r.Context(), r.PathValue("id"))
	if err != nil {
		writeExpoMutationError(w, err)
		return
	}
	_ = s.store.RecordVisitorActivity(r.Context(), user, expo.ID, "", "visited", "Viewed expo")
	booths, _ := s.visitorBoothsForExpo(r.Context(), expo.ID)
	ads, _ := s.store.ListSponsorAds(r.Context(), store.SponsorAdFilter{ExpoID: expo.ID, CountryCode: expo.CountryCode})
	writeJSON(w, http.StatusOK, visitorExpoRecordWithBoothsAndAds(expo, booths, ads))
}

func (s *Server) visitorBookExpo(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	var payload struct {
		TicketType string `json:"ticketType"`
	}
	_ = json.NewDecoder(r.Body).Decode(&payload)
	booking, err := s.store.CreateVisitorBooking(r.Context(), r.PathValue("id"), payload.TicketType, user)
	if err != nil {
		writeExpoMutationError(w, err)
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: user.ID, Actor: user.Name, ActorRole: user.Role, ExpoID: booking.ExpoID, Action: "visitor_booked_expo", EntityType: "visitor_booking", EntityID: booking.ID})
	writeJSON(w, http.StatusCreated, booking)
}

func (s *Server) visitorBookings(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	bookings, err := s.store.VisitorBookings(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "bookings_failed", "Could not load bookings.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, bookings))
}

func (s *Server) visitorBookingDetail(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	bookings, _ := s.store.VisitorBookings(r.Context(), claims.UserID)
	for _, booking := range bookings {
		if booking.ID == r.PathValue("id") {
			writeJSON(w, http.StatusOK, booking)
			return
		}
	}
	writeError(w, http.StatusNotFound, "booking_not_found", "Booking was not found.")
}

func (s *Server) visitorCancelBooking(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireRole(w, r, domain.RoleVisitor); !ok {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (s *Server) visitorTimeline(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	timeline, err := s.store.VisitorTimeline(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "timeline_failed", "Could not load timeline.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, timeline))
}

func (s *Server) visitorFavorites(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	items, err := s.store.VisitorFavorites(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "favorites_failed", "Could not load favorites.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, items))
}

func (s *Server) visitorAddFavorite(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	var input domain.VisitorFavoriteInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	item, err := s.store.AddVisitorFavorite(r.Context(), claims.UserID, input)
	if err != nil {
		writeError(w, http.StatusBadRequest, "favorite_failed", "Could not save favorite.")
		return
	}
	if strings.TrimSpace(item.ExpoID) != "" {
		description := "Saved " + item.Name
		boothID := ""
		if item.Type == "exhibitor" {
			boothID = item.ItemID
		}
		_ = s.store.RecordVisitorActivity(r.Context(), domain.User{ID: claims.UserID}, item.ExpoID, boothID, "saved", description)
	}
	writeJSON(w, http.StatusCreated, item)
}

func (s *Server) visitorDeleteFavorite(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	if err := s.store.DeleteVisitorFavorite(r.Context(), claims.UserID, r.PathValue("id")); err != nil {
		writeError(w, http.StatusNotFound, "favorite_not_found", "Favorite was not found.")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) visitorCalendar(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	bookings, _ := s.store.VisitorBookings(r.Context(), actor.ID)
	meetings, _ := s.store.ListMeetings(r.Context(), store.MeetingFilter{VisitorID: actor.ID, VisitorEmail: actor.Email})
	events := []map[string]any{}
	for _, booking := range bookings {
		events = append(events, map[string]any{"id": booking.ID, "expoId": booking.ExpoID, "expoName": booking.ExpoName, "date": booking.ExpoDate, "time": "09:00", "venue": booking.Venue, "type": "expo"})
	}
	for _, meeting := range meetings {
		if meeting.Status == "cancelled" {
			continue
		}
		scheduledAt, err := time.Parse(time.RFC3339, meeting.ScheduledAt)
		if err != nil {
			continue
		}
		expoName := meeting.Title
		if expo, err := s.store.ExpoByID(r.Context(), meeting.ExpoID); err == nil && strings.TrimSpace(expo.Name) != "" {
			expoName = expo.Name
		}
		events = append(events, map[string]any{
			"id": meeting.ID, "expoId": meeting.ExpoID, "expoName": expoName, "title": meeting.Title,
			"date": scheduledAt.Format("2006-01-02"), "time": scheduledAt.Format("15:04"),
			"venue": meeting.LocationOrLink, "type": "meeting",
		})
	}
	writeJSON(w, http.StatusOK, events)
}

func (s *Server) visitorMessages(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	threads, err := s.store.ListChatThreads(r.Context(), store.ChatThreadFilter{}, actor)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "messages_failed", "Could not load messages.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, threads))
}

func (s *Server) visitorSendMessage(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	var input domain.ChatMessageInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	thread, message, err := s.store.CreateChatMessage(r.Context(), "", r.PathValue("id"), input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "chat_message_failed", "Could not send chat message.")
		return
	}
	s.chatHub.broadcast(thread.ID, chatSocketEvent{Type: "message", Thread: thread, Message: message})
	writeJSON(w, http.StatusCreated, map[string]any{"thread": thread, "message": message})
}

func (s *Server) visitorExpoConversations(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	threads, err := s.store.ListChatThreads(r.Context(), store.ChatThreadFilter{ExpoID: r.PathValue("id"), VisitorID: actor.ID}, actor)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "conversations_failed", "Could not load conversations.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, threads))
}

func (s *Server) visitorSendChatMessage(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	var input domain.ChatMessageInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	thread, message, err := s.store.CreateChatMessage(r.Context(), r.PathValue("id"), r.PathValue("exhibitorId"), input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "chat_message_failed", "Could not send chat message.")
		return
	}
	s.chatHub.broadcast(thread.ID, chatSocketEvent{Type: "message", Thread: thread, Message: message})
	s.queueConversationMessageNotifications(r.Context(), thread, message)
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: thread.ExpoID, Action: "visitor_chat_message_sent", EntityType: "chat_thread", EntityID: thread.ID})
	writeJSON(w, http.StatusCreated, map[string]any{"thread": thread, "message": message})
}

func (s *Server) visitorFeedback(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	items, err := s.store.ListExhibitorFeedback(r.Context(), store.ExhibitorFeedbackFilter{VisitorID: claims.UserID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "feedback_failed", "Could not load feedback.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, items))
}

func (s *Server) visitorSubmitFeedback(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	var input domain.ExhibitorFeedbackInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	item, err := s.store.CreateExhibitorFeedback(r.Context(), input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "feedback_failed", "Could not submit feedback. Check expo, exhibitor, rating, and comment.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, ExpoID: item.ExpoID, Action: "visitor_feedback_submitted", EntityType: "exhibitor_feedback", EntityID: item.ID, Metadata: map[string]any{"exhibitorId": item.ExhibitorID, "rating": item.Rating}})
	writeJSON(w, http.StatusCreated, item)
}

func (s *Server) visitorOrders(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireRole(w, r, domain.RoleVisitor); !ok {
		return
	}
	writeJSON(w, http.StatusOK, []map[string]any{})
}

func (s *Server) visitorSettings(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	settings, err := s.store.VisitorSettings(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "visitor_settings_failed", "Could not load visitor settings.")
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

func (s *Server) updateVisitorSettings(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r, domain.RoleVisitor)
	if !ok {
		return
	}
	var payload struct {
		Name          string `json:"name"`
		Phone         string `json:"phone"`
		Company       string `json:"company"`
		Industry      string `json:"industry"`
		Notifications struct {
			Email       bool `json:"email"`
			Push        bool `json:"push"`
			ExpoUpdates bool `json:"expoUpdates"`
			Reminders   bool `json:"reminders"`
		} `json:"notifications"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	settings, err := s.store.UpdateVisitorSettings(r.Context(), user.ID, domain.VisitorSettingsInput{
		Name: payload.Name, Phone: payload.Phone, Company: payload.Company, Industry: payload.Industry,
		Email: payload.Notifications.Email, Push: payload.Notifications.Push, ExpoUpdates: payload.Notifications.ExpoUpdates, Reminders: payload.Notifications.Reminders,
	})
	if err != nil {
		writeError(w, http.StatusBadRequest, "visitor_settings_failed", "Could not update visitor settings.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: user.ID, Actor: user.Name, ActorRole: user.Role, Action: "visitor_settings_updated", EntityType: "user", EntityID: user.ID})
	writeJSON(w, http.StatusOK, settings)
}

func (s *Server) sponsorDashboard(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleSponsor)
	if !ok {
		return
	}
	campaigns, _ := s.store.ListSponsorCampaigns(r.Context(), claims.UserID)
	ads, _ := s.store.ListSponsorAds(r.Context(), store.SponsorAdFilter{SponsorID: claims.UserID})
	payments, _ := s.store.ListSponsorPayments(r.Context(), claims.UserID)
	writeJSON(w, http.StatusOK, sponsorDashboardFrom(campaigns, ads, payments))
}

func (s *Server) sponsorReports(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleSponsor)
	if !ok {
		return
	}
	campaigns, _ := s.store.ListSponsorCampaigns(r.Context(), claims.UserID)
	ads, _ := s.store.ListSponsorAds(r.Context(), store.SponsorAdFilter{SponsorID: claims.UserID})
	writeJSON(w, http.StatusOK, map[string]any{"campaigns": campaigns, "ads": ads, "summary": sponsorDashboardFrom(campaigns, ads, nil)})
}

func (s *Server) sponsorCampaigns(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleSponsor)
	if !ok {
		return
	}
	campaigns, err := s.store.ListSponsorCampaigns(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "campaigns_failed", "Could not load sponsor campaigns.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, campaigns))
}

func (s *Server) sponsorCampaignDetail(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleSponsor)
	if !ok {
		return
	}
	campaign, err := s.store.SponsorCampaignByID(r.Context(), r.PathValue("id"), claims.UserID)
	if err != nil {
		writeError(w, http.StatusNotFound, "campaign_not_found", "Sponsor campaign was not found.")
		return
	}
	writeJSON(w, http.StatusOK, campaign)
}

func (s *Server) sponsorCreateCampaign(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleSponsor)
	if !ok {
		return
	}
	var input domain.SponsorCampaignInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	campaign, err := s.store.CreateSponsorCampaign(r.Context(), input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "campaign_failed", "Could not create sponsor campaign.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "sponsor_campaign_created", EntityType: "sponsor_campaign", EntityID: campaign.ID})
	writeJSON(w, http.StatusCreated, campaign)
}

func (s *Server) sponsorAds(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleSponsor)
	if !ok {
		return
	}
	ads, err := s.store.ListSponsorAds(r.Context(), store.SponsorAdFilter{SponsorID: claims.UserID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "ads_failed", "Could not load sponsor ads.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, ads))
}

func (s *Server) sponsorAdDetail(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleSponsor)
	if !ok {
		return
	}
	ad, err := s.store.SponsorAdByID(r.Context(), r.PathValue("id"), claims.UserID)
	if err != nil {
		writeError(w, http.StatusNotFound, "ad_not_found", "Sponsor ad was not found.")
		return
	}
	writeJSON(w, http.StatusOK, ad)
}

func (s *Server) sponsorCreateAd(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleSponsor)
	if !ok {
		return
	}
	var input domain.SponsorAdInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	ad, err := s.store.CreateSponsorAd(r.Context(), input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "ad_failed", "Could not create sponsor ad.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "sponsor_ad_created", EntityType: "sponsor_ad", EntityID: ad.ID})
	writeJSON(w, http.StatusCreated, ad)
}

func (s *Server) sponsorCreateAdPayment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleSponsor)
	if !ok {
		return
	}
	payment, err := s.store.CreateSponsorAdPayment(r.Context(), r.PathValue("id"), actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "payment_failed", "Could not initialize sponsor ad payment.")
		return
	}
	paymentForCheckout := domain.Payment{
		ID:           payment.ID,
		PayerID:      actor.ID,
		PayerEmail:   actor.Email,
		PayerRole:    actor.Role,
		Purpose:      domain.PaymentSponsorPlacement,
		CountryCode:  actor.CountryCode,
		CurrencyCode: payment.Currency,
		AmountMinor:  payment.Amount,
		Provider:     payment.PaymentMethod,
		Status:       domain.PaymentStatus(payment.Status),
	}
	checkout, err := s.initializePaystackCheckout(r.Context(), paymentForCheckout, actor.Email, map[string]any{"purpose": domain.PaymentSponsorPlacement, "adId": payment.AdID, "payerId": actor.ID})
	if err != nil {
		s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "sponsor_ad_payment_provider_initialization_failed", EntityType: "sponsor_payment", EntityID: payment.ID, Metadata: map[string]any{"adId": payment.AdID, "error": err.Error()}})
		writeError(w, http.StatusBadGateway, "payment_provider_failed", "Could not initialize Paystack checkout.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "sponsor_ad_payment_initialized", EntityType: "sponsor_payment", EntityID: payment.ID, Metadata: map[string]any{"adId": payment.AdID, "amount": payment.Amount}})
	writeJSON(w, http.StatusCreated, map[string]any{"payment": payment, "authorizationUrl": checkout.AuthorizationURL, "reference": checkout.Reference})
}

func (s *Server) sponsorConfirmAdPayment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireUser(w, r, domain.RoleSponsor)
	if !ok {
		return
	}
	if s.paymentGatewayRequiresWebhook(r.Context()) {
		writeError(w, http.StatusConflict, "payment_confirmation_requires_webhook", "Payments are confirmed by the Paystack webhook in production mode.")
		return
	}
	payment, ad, err := s.store.ConfirmSponsorAdPayment(r.Context(), r.PathValue("id"), actor)
	if err != nil {
		writePaymentError(w, err)
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "sponsor_ad_payment_confirmed", EntityType: "sponsor_payment", EntityID: payment.ID, Metadata: map[string]any{"adId": ad.ID, "adStatus": ad.Status}})
	writeJSON(w, http.StatusOK, map[string]any{"payment": payment, "ad": ad})
}

func (s *Server) trackSponsorAd(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Event string `json:"event"`
	}
	_ = json.NewDecoder(r.Body).Decode(&payload)
	if strings.TrimSpace(payload.Event) == "" {
		payload.Event = r.URL.Query().Get("event")
	}
	ad, err := s.store.TrackSponsorAdEvent(r.Context(), r.PathValue("id"), payload.Event)
	if err != nil {
		writeError(w, http.StatusBadRequest, "track_failed", "Could not record ad event.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ad": ad})
}

func (s *Server) sponsorPayments(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleSponsor)
	if !ok {
		return
	}
	payments, err := s.store.ListSponsorPayments(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "payments_failed", "Could not load sponsor payments.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedItems(r, payments))
}

func (s *Server) sponsorPaymentReceipt(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireRole(w, r, domain.RoleSponsor)
	if !ok {
		return
	}
	payments, err := s.store.ListSponsorPayments(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "payments_failed", "Could not load sponsor payments.")
		return
	}
	for _, payment := range payments {
		if payment.ID == r.PathValue("id") {
			writeJSON(w, http.StatusOK, sponsorPaymentReceiptFrom(payment))
			return
		}
	}
	writeError(w, http.StatusNotFound, "payment_not_found", "Sponsor payment was not found.")
}

func (s *Server) paystackWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_webhook", "Webhook body could not be read.")
		return
	}
	if !s.verifyPaystackSignature(r.Context(), body, r.Header.Get("X-Paystack-Signature")) {
		writeError(w, http.StatusUnauthorized, "invalid_signature", "Paystack webhook signature is invalid.")
		return
	}
	var payload struct {
		Event     string `json:"event"`
		PaymentID string `json:"paymentId"`
		Reference string `json:"reference"`
		Data      struct {
			Reference string `json:"reference"`
			Status    string `json:"status"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	statusFromEvent := paystackPaymentStatus(payload.Event, payload.Data.Status)
	if statusFromEvent == "" {
		writeJSON(w, http.StatusAccepted, map[string]any{"ignored": true})
		return
	}
	paymentID := strings.TrimSpace(payload.PaymentID)
	if paymentID == "" {
		paymentID = strings.TrimSpace(payload.Reference)
	}
	if paymentID == "" {
		paymentID = strings.TrimSpace(payload.Data.Reference)
	}
	if paymentID == "" {
		writeError(w, http.StatusBadRequest, "payment_required", "Webhook must include paymentId or reference.")
		return
	}
	webhookActor := domain.User{ID: "paystack_webhook", Name: "Paystack Webhook", Role: domain.RoleAdministrator}
	if statusFromEvent != domain.PaymentPaid {
		payment, err := s.store.UpdatePaymentStatus(r.Context(), paymentID, statusFromEvent, payload.Event, webhookActor)
		if err != nil {
			writePaymentError(w, err)
			return
		}
		s.recordAudit(r, domain.AuditLog{ActorID: webhookActor.ID, Actor: webhookActor.Name, ActorRole: webhookActor.Role, ExpoID: payment.ExpoID, Action: "payment_webhook_status_updated", EntityType: "payment", EntityID: payment.ID, Metadata: map[string]any{"event": payload.Event, "status": payment.Status, "providerStatus": payload.Data.Status}})
		writeJSON(w, http.StatusOK, map[string]any{"payment": payment})
		return
	}
	existingPayment, _ := s.store.PaymentByID(r.Context(), paymentID)
	wasPaid := existingPayment.Status == domain.PaymentPaid
	payment, split, err := s.store.ConfirmPayment(r.Context(), paymentID, webhookActor)
	if err != nil {
		sponsorPayment, ad, sponsorErr := s.store.ConfirmSponsorAdPayment(r.Context(), paymentID, webhookActor)
		if sponsorErr != nil {
			writePaymentError(w, err)
			return
		}
		s.recordAudit(r, domain.AuditLog{ActorID: webhookActor.ID, Actor: webhookActor.Name, ActorRole: webhookActor.Role, Action: "sponsor_payment_webhook_confirmed", EntityType: "sponsor_payment", EntityID: sponsorPayment.ID, Metadata: map[string]any{"event": payload.Event, "adId": ad.ID, "providerStatus": payload.Data.Status}})
		writeJSON(w, http.StatusOK, map[string]any{"payment": sponsorPayment, "ad": ad})
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: webhookActor.ID, Actor: webhookActor.Name, ActorRole: webhookActor.Role, ExpoID: payment.ExpoID, Action: "payment_webhook_confirmed", EntityType: "payment", EntityID: payment.ID, Metadata: map[string]any{"event": payload.Event, "commissionMinor": split.CommissionMinor, "providerStatus": payload.Data.Status}})
	if !wasPaid {
		s.queueExhibitorPaymentEmails(r.Context(), payment, split)
	}
	writeJSON(w, http.StatusOK, map[string]any{"payment": payment, "commissionSplit": split})
}

func (s *Server) adminAuditLogs(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireSuperAdmin(w, r)
	if !ok {
		return
	}
	s.recordAudit(r, domain.AuditLog{
		ActorID: claims.UserID, ActorRole: claims.Role,
		Action: "view_audit_logs", EntityType: "audit_log", EntityID: "collection",
		IPAddress: clientIP(r),
	})
	logs, err := s.store.AuditLogs(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "audit_logs_failed", "Could not load audit logs.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedCollection(r, logs, []domain.DashboardStat{
		{ID: "auditEvents", Label: "Audit Events", Value: strconv.Itoa(len(logs)), Delta: "security trail", Trend: "neutral"},
		{ID: "trackedActions", Label: "Tracked Actions", Value: "login, logout, admin", Delta: "phase 1", Trend: "up"},
	}))
}

func (s *Server) adminAppLogs(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireSuperAdmin(w, r)
	if !ok {
		return
	}
	s.recordAudit(r, domain.AuditLog{
		ActorID: claims.UserID, ActorRole: claims.Role,
		Action: "view_app_logs", EntityType: "app_log", EntityID: "collection",
		IPAddress: clientIP(r),
	})
	logs, err := s.store.AppLogs(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "app_logs_failed", "Could not load app logs.")
		return
	}
	writeJSON(w, http.StatusOK, paginatedCollection(r, logs, []domain.DashboardStat{
		{ID: "appLogEvents", Label: "App Log Events", Value: strconv.Itoa(len(logs)), Delta: "runtime trail", Trend: "neutral"},
		{ID: "logSource", Label: "Primary Sink", Value: "stdout + db", Delta: "phase 1", Trend: "up"},
	}))
}

func (s *Server) adminUsers(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireSuperAdmin(w, r); !ok {
		return
	}
	users, err := s.store.Users(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "users_failed", "Could not load users.")
		return
	}
	records := make([]map[string]any, 0, len(users))
	systemUsers := make([]domain.User, 0, len(users))
	for _, user := range users {
		if !serverAdminRole(user.Role) {
			continue
		}
		systemUsers = append(systemUsers, user)
		records = append(records, userRecord(user))
	}
	writeJSON(w, http.StatusOK, paginatedCollection(r, records, []domain.DashboardStat{
		{ID: "totalUsers", Label: "System Users", Value: strconv.Itoa(len(systemUsers)), Delta: "admin accounts", Trend: "neutral"},
		{ID: "superAdmins", Label: "Super Administrators", Value: strconv.Itoa(countUsersByRole(systemUsers, domain.RoleSuperAdmin)), Delta: "full access", Trend: "neutral"},
		{ID: "admins", Label: "Administrators", Value: strconv.Itoa(countUsersByRole(systemUsers, domain.RoleAdministrator)), Delta: "platform access", Trend: "neutral"},
	}))
}

func (s *Server) adminCreateUser(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	var input domain.AdminUserInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	if input.Role == "" {
		input.Role = domain.RoleSuperAdmin
	}
	if !serverAdminRole(input.Role) {
		writeError(w, http.StatusBadRequest, "invalid_system_role", "System users can only be super administrators or administrators.")
		return
	}
	user, err := s.store.CreateAdminManagedUser(r.Context(), input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "user_create_failed", "Could not create user. Check role, email, password, and duplicates.")
		return
	}
	s.sendSystemUserWelcome(r.Context(), user, input.Password)
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "admin_user_created", EntityType: "user", EntityID: user.ID, Metadata: map[string]any{"role": user.Role}})
	writeJSON(w, http.StatusCreated, userRecord(user))
}

func (s *Server) adminUpdateUser(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	var input domain.AdminUserInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	if input.Role != "" && !serverAdminRole(input.Role) {
		writeError(w, http.StatusBadRequest, "invalid_system_role", "System users can only be super administrators or administrators.")
		return
	}
	user, err := s.store.UpdateAdminManagedUser(r.Context(), r.PathValue("id"), input, actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "user_update_failed", "Could not update user. Check role, email, password, and duplicates.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "admin_user_updated", EntityType: "user", EntityID: user.ID, Metadata: map[string]any{"role": user.Role}})
	writeJSON(w, http.StatusOK, userRecord(user))
}

func (s *Server) adminDeleteUser(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireSuperAdminUser(w, r)
	if !ok {
		return
	}
	id := r.PathValue("id")
	if err := s.store.DeleteAdminManagedUser(r.Context(), id, actor); err != nil {
		writeError(w, http.StatusBadRequest, "user_delete_failed", "Could not remove user. You cannot remove yourself or the last super administrator.")
		return
	}
	s.recordAudit(r, domain.AuditLog{ActorID: actor.ID, Actor: actor.Name, ActorRole: actor.Role, Action: "admin_user_removed", EntityType: "user", EntityID: id})
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) sendSystemUserWelcome(ctx context.Context, user domain.User, temporaryPassword string) {
	loginURL := strings.TrimRight(strings.TrimSpace(s.cfg.FrontendURL), "/") + "/login"
	if strings.TrimSpace(s.cfg.FrontendURL) == "" {
		loginURL = "http://localhost:3000/login"
	}
	message := "Your Tandaza admin account is ready. Sign in with this temporary password: " + temporaryPassword + ". You will be asked to create a new password before entering the admin console."
	s.queueAndSendAuthEmail(ctx, domain.NotificationInput{
		UserID:      user.ID,
		Role:        user.Role,
		Channel:     "email",
		TemplateKey: "system_user_welcome",
		Payload: map[string]any{
			"recipient":         user.Name,
			"name":              user.Name,
			"email":             user.Email,
			"to":                user.Email,
			"subject":           "Your Tandaza admin account is ready",
			"title":             "Welcome to Tandaza Admin",
			"message":           message,
			"temporaryPassword": temporaryPassword,
			"ctaLabel":          "Sign in",
			"ctaUrl":            loginURL,
		},
	})
}

func (s *Server) notifyAdminsExpoDraftCreated(ctx context.Context, organizer domain.User, expo domain.Expo) {
	admins, err := s.store.Users(ctx)
	if err != nil {
		return
	}
	for _, admin := range admins {
		if !serverAdminRole(admin.Role) || admin.Status != "active" {
			continue
		}
		organizerName := notificationDisplayName(organizer)
		s.queueAndSendAuthEmail(ctx, domain.NotificationInput{
			UserID:      admin.ID,
			Role:        admin.Role,
			Channel:     "email",
			TemplateKey: "expo_draft_created_admin",
			ExpoID:      expo.ID,
			Payload: map[string]any{
				"email":    admin.Email,
				"to":       admin.Email,
				"subject":  "New expo draft submitted by " + organizerName,
				"title":    "New expo draft created",
				"message":  organizerName + " created a new expo draft: " + expo.Name + ". Review the expo details, pricing, commission, and lifecycle status in the admin console.",
				"ctaLabel": "Review expo",
				"ctaUrl":   frontendLink(s.cfg.FrontendURL, "/administrator/expos/"+expo.ID),
			},
		})
	}
}

func (s *Server) sendSponsorOnboardingEmails(ctx context.Context, user domain.User, temporaryPassword string) {
	s.sendManagedAccountOnboardingEmails(ctx, user, temporaryPassword, managedOnboardingCopy{
		CredentialsTemplate: "sponsor_account_credentials",
		CredentialsSubject:  "Your Tandaza sponsor account is ready",
		CredentialsTitle:    "Your sponsor account is ready",
		CredentialsMessage:  "Your Tandaza sponsor account has been created. Sign in with the temporary password below to access sponsor plans, ad placements, campaign reporting, and payment receipts.",
		CredentialsFooter:   "You are receiving this because a Tandaza administrator created a sponsor account for your organization.",
		WelcomeSubject:      "Welcome to Tandaza Sponsorship",
		WelcomeMessage:      "Welcome to Tandaza Sponsorship. Your workspace helps you discover expo-specific visibility opportunities, review sponsor plans, manage ad placements, track campaign attention, and connect your brand to the right expo audience across countries.",
		WelcomeCta:          "Open sponsor workspace",
		FounderMessage:      "Welcome to Tandaza. We started Tandaza because expos across Africa create real opportunity, but too much value disappears when the hall closes, when visitors cannot travel, or when exhibitors leave without a clear way to follow up. Our mission is to make every expo more accessible, measurable, and useful for visitors, exhibitors, organizers, and sponsors. For sponsors, this means your visibility should not be guesswork. You should understand where your brand appeared, who engaged, which expo audience responded, and how your spend connected to real attention. We are building Tandaza for the physical energy of African expos and the digital access that helps that energy last longer. Thank you for joining us early. Your participation helps us shape a platform that can help more businesses meet, sell, learn, sponsor, and grow across Africa. - Evans Mburu, Founder of Tandaza",
		FounderFooter:       "A founder welcome sent to new Tandaza sponsor accounts.",
	})
}

func (s *Server) sendOrganizerOnboardingEmails(ctx context.Context, user domain.User, temporaryPassword string) {
	s.sendManagedAccountOnboardingEmails(ctx, user, temporaryPassword, managedOnboardingCopy{
		CredentialsTemplate: "organizer_account_credentials",
		CredentialsSubject:  "Your Tandaza organizer account is ready",
		CredentialsTitle:    "Your organizer account is ready",
		CredentialsMessage:  "Your Tandaza organizer account has been created. Sign in with the temporary password below to create and manage expos, exhibitors, sponsors, visitors, notifications, reports, and settlements.",
		CredentialsFooter:   "You are receiving this because a Tandaza administrator created an organizer account for your organization.",
		WelcomeSubject:      "Welcome to Tandaza for Organizers",
		WelcomeMessage:      "Welcome to Tandaza. Your organizer workspace helps you run scalable expos across countries, manage exhibitor and sponsor relationships, support remote expo access, communicate with participants, and track expo performance in one place.",
		WelcomeCta:          "Open organizer workspace",
		FounderMessage:      "Welcome to Tandaza. We started Tandaza because expos across Africa create real opportunity, but too much value disappears when the hall closes or when people cannot attend physically. For organizers, Tandaza exists to make expo operations more accessible, measurable, and scalable across countries, currencies, exhibitors, sponsors, visitors, communications, payments, and reports. Thank you for helping shape a platform built for the physical energy of African expos and the digital access that helps that energy last longer. - Evans Mburu, Founder of Tandaza",
		FounderFooter:       "A founder welcome sent to new Tandaza organizer accounts.",
	})
}

func (s *Server) sendOrganizerTeamMemberOnboardingEmails(ctx context.Context, organizer domain.User, member domain.OrganizerTeamMember, temporaryPassword string) {
	companyName := strings.TrimSpace(organizer.CompanyName)
	if companyName == "" {
		companyName = strings.TrimSpace(organizer.Name)
	}
	teamUser := domain.User{
		ID: member.ID, Name: member.Name, Email: member.Email, Role: domain.RoleOrganizer,
		CompanyName: companyName, CountryCode: organizer.CountryCode, Status: "active",
	}
	s.sendManagedAccountOnboardingEmails(ctx, teamUser, temporaryPassword, managedOnboardingCopy{
		CredentialsTemplate: "organizer_team_member_credentials",
		CredentialsSubject:  "Your Tandaza organizer team access is ready",
		CredentialsTitle:    "Your organizer team access is ready",
		CredentialsMessage:  "You have been added to " + companyName + " on Tandaza. Sign in with the temporary password below to support expo operations, exhibitors, visitors, sponsors, and reports.",
		CredentialsFooter:   "You are receiving this because an organizer account added you as a team member.",
		WelcomeSubject:      "Welcome to Tandaza Organizer Team",
		WelcomeMessage:      "Welcome to Tandaza. You have been invited to support an organizer workspace where expo operations, exhibitor activity, visitor access, sponsorships, and reporting come together.",
		WelcomeCta:          "Open organizer workspace",
		FounderMessage:      "Welcome to Tandaza. We started Tandaza because expos across Africa create real opportunity, but too much value disappears when the hall closes or when people cannot attend physically. As part of an organizer team, you help make expo operations more accessible, measurable, and useful for everyone involved. - Evans Mburu, Founder of Tandaza",
		FounderFooter:       "A founder welcome sent to new Tandaza organizer team members.",
	})
}

func (s *Server) sendExhibitorOnboardingEmails(ctx context.Context, user domain.User, temporaryPassword string) {
	s.sendManagedAccountOnboardingEmails(ctx, user, temporaryPassword, managedOnboardingCopy{
		CredentialsTemplate: "exhibitor_account_credentials",
		CredentialsSubject:  "Your Tandaza exhibitor account is ready",
		CredentialsTitle:    "Your exhibitor account is ready",
		CredentialsMessage:  "Your Tandaza exhibitor account has been created. Sign in with the temporary password below to access assigned expo workspaces, activate your digital workspace, manage products, capture leads, and follow up after the expo.",
		CredentialsFooter:   "You are receiving this because a Tandaza administrator created an exhibitor account for your organization.",
		WelcomeSubject:      "Welcome to Tandaza for Exhibitors",
		WelcomeMessage:      "Welcome to Tandaza. Your exhibitor workspace is built around one promise: every visitor can become a trackable sales opportunity through QR engagement, product interest, meeting requests, pre-order intent, lead notes, follow-ups, and expo analytics.",
		WelcomeCta:          "Open exhibitor workspace",
		FounderMessage:      "Welcome to Tandaza. We started Tandaza because exhibitors invest heavily in expo presence, but too many conversations disappear when the hall closes. For exhibitors, Tandaza turns QR scans, product interest, remote visitors, meeting requests, and pre-order intent into trackable leads you can follow up after the expo. Thank you for joining us as we build a platform that helps African businesses meet, sell, learn, and grow through better expo access. - Evans Mburu, Founder of Tandaza",
		FounderFooter:       "A founder welcome sent to new Tandaza exhibitor accounts.",
	})
}

func (s *Server) sendExhibitorTeamMemberOnboardingEmails(ctx context.Context, exhibitor domain.User, member domain.OrganizerTeamMember, temporaryPassword string) {
	companyName := strings.TrimSpace(exhibitor.CompanyName)
	if companyName == "" {
		companyName = strings.TrimSpace(exhibitor.Name)
	}
	if companyName == "" {
		companyName = "an exhibitor workspace"
	}
	teamUser := domain.User{
		ID:          member.ID,
		Name:        member.Name,
		Email:       member.Email,
		Role:        domain.RoleExhibitor,
		CompanyName: companyName,
		CountryCode: exhibitor.CountryCode,
		Status:      "active",
	}
	s.sendManagedAccountOnboardingEmails(ctx, teamUser, temporaryPassword, managedOnboardingCopy{
		CredentialsTemplate: "exhibitor_team_member_credentials",
		CredentialsSubject:  "Your Tandaza exhibitor team access is ready",
		CredentialsTitle:    "Your exhibitor team access is ready",
		CredentialsMessage:  "You have been added to " + companyName + " on Tandaza. Sign in with the temporary password below to support expo workspaces, product updates, visitor leads, meeting requests, and follow-up.",
		CredentialsFooter:   "You are receiving this because an exhibitor account added you as a team member.",
		WelcomeSubject:      "Welcome to Tandaza Exhibitor Team",
		WelcomeMessage:      "Welcome to Tandaza. You have been invited to support an exhibitor workspace where visitor traffic, product interest, meeting requests, and pre-order intent become follow-up opportunities.",
		WelcomeCta:          "Open exhibitor workspace",
		FounderMessage:      "Welcome to Tandaza. We started Tandaza because exhibitors invest heavily in expo presence, but too many conversations disappear when the hall closes. As part of an exhibitor team, you help turn QR scans, visitor interest, remote engagement, meetings, and pre-order intent into useful follow-up. Thank you for helping African businesses make expo opportunities last beyond the expo floor. - Evans Mburu, Founder of Tandaza",
		FounderFooter:       "A founder welcome sent to new Tandaza exhibitor team members.",
	})
}

type managedOnboardingCopy struct {
	CredentialsTemplate string
	CredentialsSubject  string
	CredentialsTitle    string
	CredentialsMessage  string
	CredentialsFooter   string
	WelcomeSubject      string
	WelcomeMessage      string
	WelcomeCta          string
	FounderMessage      string
	FounderFooter       string
}

func (s *Server) sendManagedAccountOnboardingEmails(ctx context.Context, user domain.User, temporaryPassword string, copy managedOnboardingCopy) {
	loginURL := frontendLink(s.cfg.FrontendURL, "/login")
	dashboardURL := frontendLink(s.cfg.FrontendURL, redirectForRole(user.Role))
	name := strings.TrimSpace(user.Name)
	if name == "" {
		name = "there"
	}
	s.queueAndSendAuthEmail(ctx, domain.NotificationInput{
		UserID:      user.ID,
		Role:        user.Role,
		Channel:     "email",
		TemplateKey: copy.CredentialsTemplate,
		Payload: map[string]any{
			"recipient":         user.Name,
			"name":              user.Name,
			"email":             user.Email,
			"to":                user.Email,
			"subject":           copy.CredentialsSubject,
			"title":             copy.CredentialsTitle,
			"message":           copy.CredentialsMessage,
			"temporaryPassword": temporaryPassword,
			"ctaLabel":          "Sign in",
			"ctaUrl":            loginURL,
			"footerText":        copy.CredentialsFooter,
		},
	})
	s.queueAndSendAuthEmail(ctx, domain.NotificationInput{
		UserID:      user.ID,
		Role:        user.Role,
		Channel:     "email",
		TemplateKey: "account_welcome",
		Payload: map[string]any{
			"email":      user.Email,
			"to":         user.Email,
			"subject":    copy.WelcomeSubject,
			"title":      "Welcome to Tandaza, " + name,
			"message":    copy.WelcomeMessage,
			"ctaLabel":   copy.WelcomeCta,
			"ctaUrl":     dashboardURL,
			"footerText": "You are receiving this because your Tandaza account is active.",
		},
	})
	s.queueAndSendAuthEmail(ctx, domain.NotificationInput{
		UserID:      user.ID,
		Role:        user.Role,
		Channel:     "email",
		TemplateKey: "founder_welcome",
		Payload: map[string]any{
			"email":      user.Email,
			"to":         user.Email,
			"fromName":   "Evans Mburu, Founder of Tandaza",
			"subject":    "A welcome note from Evans Mburu, Founder of Tandaza",
			"title":      "A note from Evans Mburu",
			"message":    copy.FounderMessage,
			"ctaLabel":   "Explore Tandaza",
			"ctaUrl":     dashboardURL,
			"footerText": copy.FounderFooter,
		},
	})
}

func (s *Server) requireAuth(w http.ResponseWriter, r *http.Request) (auth.Claims, bool) {
	claims, ok := s.claimsFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "access_token_required", "Authorization bearer token is required.")
		return auth.Claims{}, false
	}
	return claims, true
}

func (s *Server) claimsFromRequest(r *http.Request) (auth.Claims, bool) {
	header := r.Header.Get("Authorization")
	if !strings.HasPrefix(header, "Bearer ") {
		return auth.Claims{}, false
	}
	claims, err := s.tokenService.Verify(strings.TrimPrefix(header, "Bearer "))
	if err != nil {
		return auth.Claims{}, false
	}
	return claims, true
}

func (s *Server) requireAdmin(w http.ResponseWriter, r *http.Request) (auth.Claims, bool) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return auth.Claims{}, false
	}
	if !serverAdminRole(claims.Role) {
		writeError(w, http.StatusForbidden, "forbidden", "Administrator access is required.")
		return auth.Claims{}, false
	}
	return claims, true
}

func (s *Server) requireSuperAdmin(w http.ResponseWriter, r *http.Request) (auth.Claims, bool) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return auth.Claims{}, false
	}
	if claims.Role != domain.RoleSuperAdmin {
		writeError(w, http.StatusForbidden, "forbidden", "Super administrator access is required.")
		return auth.Claims{}, false
	}
	return claims, true
}

func (s *Server) requireSuperAdminUser(w http.ResponseWriter, r *http.Request) (domain.User, bool) {
	claims, ok := s.requireSuperAdmin(w, r)
	if !ok {
		return domain.User{}, false
	}
	user, err := s.store.UserByID(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "user_not_found", "Authenticated user no longer exists.")
		return domain.User{}, false
	}
	return user, true
}

func (s *Server) requireRole(w http.ResponseWriter, r *http.Request, role domain.Role) (auth.Claims, bool) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return auth.Claims{}, false
	}
	if role == domain.RoleAdministrator && serverAdminRole(claims.Role) {
		return claims, true
	}
	if claims.Role != role {
		writeError(w, http.StatusForbidden, "forbidden", string(role)+" access is required.")
		return auth.Claims{}, false
	}
	return claims, true
}

func (s *Server) requireUser(w http.ResponseWriter, r *http.Request, role domain.Role) (domain.User, bool) {
	claims, ok := s.requireRole(w, r, role)
	if !ok {
		return domain.User{}, false
	}
	user, err := s.store.UserByID(r.Context(), claims.UserID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "user_not_found", "Authenticated user no longer exists.")
		return domain.User{}, false
	}
	return user, true
}

func (s *Server) effectiveExhibitorID(ctx context.Context, userID string) string {
	exhibitorID, err := s.store.EffectiveExhibitorID(ctx, userID)
	if err != nil || strings.TrimSpace(exhibitorID) == "" {
		return userID
	}
	return exhibitorID
}

func (s *Server) effectiveOrganizerID(ctx context.Context, userID string) string {
	organizerID, err := s.store.EffectiveOrganizerID(ctx, userID)
	if err != nil || strings.TrimSpace(organizerID) == "" {
		return userID
	}
	return organizerID
}

func (s *Server) organizerWorkspaceUser(ctx context.Context, actor domain.User) domain.User {
	organizerID := s.effectiveOrganizerID(ctx, actor.ID)
	if organizerID == actor.ID {
		return actor
	}
	workspace, err := s.store.UserByID(ctx, organizerID)
	if err != nil || workspace.Role != domain.RoleOrganizer {
		actor.ID = organizerID
		return actor
	}
	return workspace
}

func (s *Server) exhibitorWorkspaceUser(ctx context.Context, actor domain.User) domain.User {
	exhibitorID := s.effectiveExhibitorID(ctx, actor.ID)
	if exhibitorID == actor.ID {
		return actor
	}
	workspace, err := s.store.UserByID(ctx, exhibitorID)
	if err != nil || workspace.Role != domain.RoleExhibitor {
		actor.ID = exhibitorID
		return actor
	}
	return workspace
}

func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == s.cfg.FrontendURL {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.cfg.EnforceHTTPS && !requestIsHTTPS(r) {
			writeError(w, http.StatusUpgradeRequired, "https_required", "HTTPS is required for this request.")
			return
		}
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		next.ServeHTTP(w, r)
	})
}

func (s *Server) rateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !rateLimitedPath(r) {
			next.ServeHTTP(w, r)
			return
		}
		limit := s.cfg.RateLimitPerMinute
		if limit <= 0 {
			limit = 120
		}
		key := clientIP(r) + ":" + r.Method + ":" + rateLimitBucket(r.URL.Path)
		now := time.Now().UTC()
		s.rateMu.Lock()
		counter := s.rateLimits[key]
		if counter.WindowStart.IsZero() || now.Sub(counter.WindowStart) >= time.Minute {
			counter = rateCounter{WindowStart: now}
		}
		counter.Count++
		s.rateLimits[key] = counter
		s.rateMu.Unlock()
		if counter.Count > limit {
			w.Header().Set("Retry-After", "60")
			writeError(w, http.StatusTooManyRequests, "rate_limited", "Too many requests. Please try again shortly.")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func rateLimitedPath(r *http.Request) bool {
	if r.Method == http.MethodOptions || r.Method == http.MethodGet {
		return false
	}
	path := r.URL.Path
	return strings.HasPrefix(path, "/api/v1/auth/") ||
		path == "/api/v1/media" ||
		path == "/api/v1/payments/paystack/webhook" ||
		(strings.HasPrefix(path, "/api/v1/ads/") && strings.HasSuffix(path, "/track"))
}

func rateLimitBucket(path string) string {
	if strings.HasPrefix(path, "/api/v1/ads/") && strings.HasSuffix(path, "/track") {
		return "/api/v1/ads/:id/track"
	}
	return path
}

func notificationWorkerMode(enabled bool) string {
	if enabled {
		return "background-dispatcher"
	}
	return "manual-dispatch"
}

func expoLifecycleWorkerMode(enabled bool) string {
	if enabled {
		return "background-lifecycle"
	}
	return "manual-lifecycle"
}

func paystackPaymentStatus(event string, providerStatus string) domain.PaymentStatus {
	event = strings.ToLower(strings.TrimSpace(event))
	providerStatus = strings.ToLower(strings.TrimSpace(providerStatus))
	switch {
	case event == "charge.success" || providerStatus == "success":
		return domain.PaymentPaid
	case strings.Contains(event, "refund") || providerStatus == "refunded":
		return domain.PaymentRefunded
	case event == "charge.failed" || providerStatus == "failed":
		return domain.PaymentFailed
	default:
		return ""
	}
}

func requestIsHTTPS(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}
	return strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}

func (s *Server) requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := requestIDFrom(r)
		if requestID == "" {
			requestID = fmt.Sprintf("req_%d", s.requestSeq.Add(1))
		}
		ctx := context.WithValue(r.Context(), requestIDKey{}, requestID)
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		start := time.Now()
		next.ServeHTTP(recorder, r.WithContext(ctx))
		latency := time.Since(start)
		userID := ""
		if claims, ok := s.claimsFromRequest(r); ok {
			userID = claims.UserID
		}
		level := "info"
		if recorder.status >= 500 {
			level = "error"
		} else if recorder.status >= 400 {
			level = "warn"
		}
		appLog := domain.AppLog{
			Level: level, Message: "http_request", RequestID: requestID, Method: r.Method,
			Path: r.URL.Path, Status: recorder.status, LatencyMs: latency.Milliseconds(),
			UserID: userID, Metadata: map[string]any{"query": r.URL.RawQuery, "ip": clientIP(r)},
		}
		_, _ = s.store.RecordAppLog(r.Context(), appLog)
		s.sendErrorAlert(r.Context(), appLog)
		s.logger.Info("http request", "request_id", requestID, "method", r.Method, "path", r.URL.Path, "status", recorder.status, "latency_ms", latency.Milliseconds(), "user_id", userID)
	})
}

func (s *Server) sendErrorAlert(ctx context.Context, log domain.AppLog) {
	if strings.TrimSpace(s.cfg.ErrorWebhookURL) == "" {
		return
	}
	minStatus := s.cfg.ErrorAlertMinStatus
	if minStatus <= 0 {
		minStatus = 500
	}
	if log.Status < minStatus {
		return
	}
	payload := map[string]any{
		"service":     "tandaza-go-api",
		"environment": s.cfg.Environment,
		"level":       log.Level,
		"requestId":   log.RequestID,
		"method":      log.Method,
		"path":        log.Path,
		"status":      log.Status,
		"latencyMs":   log.LatencyMs,
		"userId":      log.UserID,
		"metadata":    log.Metadata,
		"createdAt":   log.CreatedAt,
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		body, _ := json.Marshal(payload)
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.cfg.ErrorWebhookURL, bytes.NewReader(body))
		if err != nil {
			s.logger.Warn("error alert request failed", "error", err)
			return
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			s.logger.Warn("error alert delivery failed", "error", err)
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode < 200 || resp.StatusCode > 299 {
			s.logger.Warn("error alert webhook returned non-2xx", "status", resp.StatusCode)
		}
	}()
}

func (s *Server) recoverPanic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				s.logger.Error("request panic", "panic", recovered, "path", r.URL.Path)
				writeError(w, http.StatusInternalServerError, "internal_error", "Internal server error.")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func (s *Server) recordAudit(r *http.Request, log domain.AuditLog) {
	if log.Metadata == nil {
		log.Metadata = map[string]any{}
	}
	if requestID, ok := r.Context().Value(requestIDKey{}).(string); ok && requestID != "" {
		log.Metadata["requestId"] = requestID
	}
	if log.IPAddress == "" {
		log.IPAddress = clientIP(r)
	}
	_, _ = s.store.RecordAudit(r.Context(), log)
}

func (s *Server) recordSystemAudit(ctx context.Context, log domain.AuditLog) {
	if log.Metadata == nil {
		log.Metadata = map[string]any{}
	}
	_, _ = s.store.RecordAudit(ctx, log)
}

func adminCountryFilter(r *http.Request) string {
	countryCode := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("country")))
	if countryCode == "" || countryCode == "ALL" {
		return ""
	}
	return countryCode
}

type requestIDKey struct{}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func requestIDFrom(r *http.Request) string {
	if value := strings.TrimSpace(r.Header.Get("X-Request-ID")); value != "" {
		return value
	}
	return strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
}

func clientIP(r *http.Request) string {
	for _, header := range []string{"X-Forwarded-For", "X-Real-IP"} {
		value := strings.TrimSpace(r.Header.Get(header))
		if value != "" {
			return strings.TrimSpace(strings.Split(value, ",")[0])
		}
	}
	host := r.RemoteAddr
	if index := strings.LastIndex(host, ":"); index > -1 {
		return host[:index]
	}
	return host
}

func (s *Server) configWithAdminNotificationSettings(ctx context.Context) config.Config {
	cfg := s.cfg
	if emailSettings, err := s.store.EmailSettings(ctx); err == nil && strings.TrimSpace(emailSettings.SMTPHost) != "" {
		cfg.SMTPHost = emailSettings.SMTPHost
		cfg.SMTPPort = strconv.Itoa(emailSettings.SMTPPort)
		cfg.SMTPUsername = emailSettings.Username
		cfg.SMTPPassword = emailSettings.Password
		cfg.SMTPFromEmail = emailSettings.SenderEmail
		cfg.SMTPFromName = emailSettings.SenderName
		cfg.SMTPEncryption = emailSettings.Encryption
	}
	if smsSettings, err := s.store.SMSSettings(ctx); err == nil && strings.TrimSpace(smsSettings.APIKey) != "" {
		cfg.TiaraAPIKey = strings.TrimSpace(smsSettings.APIKey)
		cfg.TiaraSenderID = strings.TrimSpace(smsSettings.SenderID)
		if strings.TrimSpace(cfg.TiaraSenderID) == "" {
			cfg.TiaraSenderID = "CONNECT"
		}
		if strings.TrimSpace(smsSettings.BaseURL) != "" {
			cfg.TiaraBaseURL = strings.TrimRight(strings.TrimSpace(smsSettings.BaseURL), "/")
		}
	}
	if whatsappSettings, err := s.store.WhatsappSettings(ctx); err == nil && strings.TrimSpace(whatsappSettings.AuthToken) != "" {
		cfg.WhatsappProvider = whatsappSettings.Provider
		cfg.WhatsappAccountSID = whatsappSettings.AccountSID
		cfg.WhatsappAuthToken = whatsappSettings.AuthToken
		cfg.WhatsappFromNumber = whatsappSettings.FromNumber
	}
	return cfg
}

func (s *Server) googleProfile(ctx context.Context, input domain.GoogleAuthInput) (domain.GoogleAuthInput, error) {
	if strings.TrimSpace(input.Email) != "" && s.cfg.Environment != "production" {
		return input, nil
	}
	if strings.TrimSpace(input.IDToken) == "" {
		return domain.GoogleAuthInput{}, fmt.Errorf("google id token required")
	}
	endpoint := s.cfg.GoogleTokenInfoURL + "?id_token=" + url.QueryEscape(input.IDToken)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return domain.GoogleAuthInput{}, err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return domain.GoogleAuthInput{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return domain.GoogleAuthInput{}, fmt.Errorf("google tokeninfo status %d", resp.StatusCode)
	}
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 8192))
	var payload struct {
		Subject       string `json:"sub"`
		Email         string `json:"email"`
		EmailVerified string `json:"email_verified"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
		Audience      string `json:"aud"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return domain.GoogleAuthInput{}, err
	}
	settings, _ := s.store.GoogleSettings(ctx)
	clientID := firstNonEmptyString(settings.ClientID, s.cfg.GoogleClientID)
	if clientID != "" && payload.Audience != clientID {
		return domain.GoogleAuthInput{}, fmt.Errorf("google audience mismatch")
	}
	if payload.Email == "" || payload.Name == "" {
		return domain.GoogleAuthInput{}, fmt.Errorf("google profile incomplete")
	}
	return domain.GoogleAuthInput{Email: payload.Email, Name: payload.Name, Picture: payload.Picture, Subject: payload.Subject, IDToken: input.IDToken}, nil
}

func redirectForRole(role domain.Role) string {
	switch role {
	case domain.RoleVisitor:
		return "/visitor"
	case domain.RoleExhibitor:
		return "/exhibitor"
	case domain.RoleOrganizer:
		return "/organizer"
	case domain.RoleSponsor:
		return "/sponsor"
	case domain.RoleAdministrator, domain.RoleSuperAdmin:
		return "/administrator"
	default:
		return "/login"
	}
}

func redirectForUser(user domain.User) string {
	if user.MustChangePassword {
		return "/change-password"
	}
	return redirectForRole(user.Role)
}

func serverAdminRole(role domain.Role) bool {
	return role == domain.RoleAdministrator || role == domain.RoleSuperAdmin
}

func notificationDisplayName(user domain.User) string {
	if strings.TrimSpace(user.CompanyName) != "" {
		return strings.TrimSpace(user.CompanyName)
	}
	if strings.TrimSpace(user.Name) != "" {
		return strings.TrimSpace(user.Name)
	}
	return strings.TrimSpace(user.Email)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, code string, message string) {
	writeJSON(w, status, map[string]string{"error": code, "message": message})
}

type paginationMeta struct {
	Page       int `json:"page"`
	PageSize   int `json:"pageSize"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

func pageRequestFrom(r *http.Request) (int, int) {
	page := positiveQueryInt(r, "page", 1)
	pageSize := positiveQueryInt(r, "pageSize", 25)
	if pageSize > 100 {
		pageSize = 100
	}
	return page, pageSize
}

func positiveQueryInt(r *http.Request, key string, fallback int) int {
	value, err := strconv.Atoi(strings.TrimSpace(r.URL.Query().Get(key)))
	if err != nil || value < 1 {
		return fallback
	}
	return value
}

func paginateSlice[T any](r *http.Request, items []T) ([]T, paginationMeta) {
	page, pageSize := pageRequestFrom(r)
	total := len(items)
	totalPages := 0
	if total > 0 {
		totalPages = (total + pageSize - 1) / pageSize
	}
	start := (page - 1) * pageSize
	if start > total {
		start = total
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	return items[start:end], paginationMeta{Page: page, PageSize: pageSize, Total: total, TotalPages: totalPages}
}

func paginatedItems[T any](r *http.Request, items []T) map[string]any {
	pageItems, meta := paginateSlice(r, items)
	return map[string]any{
		"items":      pageItems,
		"page":       meta.Page,
		"pageSize":   meta.PageSize,
		"total":      meta.Total,
		"totalPages": meta.TotalPages,
	}
}

func paginatedCollection[T any](r *http.Request, items []T, stats []domain.DashboardStat) map[string]any {
	payload := paginatedItems(r, items)
	payload["stats"] = stats
	return payload
}

func readEmailPassword(r *http.Request) (string, string, error) {
	if email, password, ok := r.BasicAuth(); ok {
		if strings.TrimSpace(email) == "" || strings.TrimSpace(password) == "" {
			return "", "", fmt.Errorf("empty basic auth credentials")
		}
		return email, password, nil
	}
	var payload struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		return "", "", err
	}
	if strings.TrimSpace(payload.Email) == "" || strings.TrimSpace(payload.Password) == "" {
		return "", "", fmt.Errorf("empty json credentials")
	}
	return payload.Email, payload.Password, nil
}

func readRegistration(r *http.Request) (string, string, domain.RegisterInput, error) {
	email, password, ok := r.BasicAuth()
	if !ok {
		var payload struct {
			Email       string      `json:"email"`
			Password    string      `json:"password"`
			Name        string      `json:"name"`
			Role        domain.Role `json:"role"`
			CompanyName string      `json:"companyName"`
			CountryCode string      `json:"countryCode"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			return "", "", domain.RegisterInput{}, err
		}
		input := domain.RegisterInput{
			Name: payload.Name, Role: payload.Role, CompanyName: payload.CompanyName, CountryCode: payload.CountryCode,
		}
		if strings.TrimSpace(payload.Email) == "" || strings.TrimSpace(payload.Password) == "" {
			return "", "", domain.RegisterInput{}, fmt.Errorf("empty json registration credentials")
		}
		return payload.Email, payload.Password, input, nil
	}
	var input domain.RegisterInput
	if r.Body != nil && r.Body != http.NoBody {
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			return "", "", domain.RegisterInput{}, err
		}
	}
	if strings.TrimSpace(email) == "" || strings.TrimSpace(password) == "" {
		return "", "", domain.RegisterInput{}, fmt.Errorf("empty basic auth registration credentials")
	}
	return email, password, input, nil
}

func readForgotPasswordEmail(r *http.Request) (string, error) {
	if email, _, ok := r.BasicAuth(); ok {
		if strings.TrimSpace(email) == "" {
			return "", fmt.Errorf("empty basic auth email")
		}
		return email, nil
	}
	var payload struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		return "", err
	}
	if strings.TrimSpace(payload.Email) == "" {
		return "", fmt.Errorf("empty json email")
	}
	return payload.Email, nil
}

func readResetPassword(r *http.Request) (string, string, error) {
	if token, newPassword, ok := r.BasicAuth(); ok {
		if strings.TrimSpace(token) == "" || strings.TrimSpace(newPassword) == "" {
			return "", "", fmt.Errorf("empty basic auth reset credentials")
		}
		return token, newPassword, nil
	}
	var payload struct {
		Token       string `json:"token"`
		NewPassword string `json:"newPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		return "", "", err
	}
	if strings.TrimSpace(payload.Token) == "" || strings.TrimSpace(payload.NewPassword) == "" {
		return "", "", fmt.Errorf("empty json reset credentials")
	}
	return payload.Token, payload.NewPassword, nil
}

func readToken(r *http.Request) (string, error) {
	if token, _, ok := r.BasicAuth(); ok {
		if strings.TrimSpace(token) == "" {
			return "", fmt.Errorf("empty basic auth token")
		}
		return strings.TrimSpace(token), nil
	}
	var payload struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		return "", err
	}
	if strings.TrimSpace(payload.Token) == "" {
		return "", fmt.Errorf("empty json token")
	}
	return strings.TrimSpace(payload.Token), nil
}

func authLink(frontendURL string, path string, token string) string {
	base := strings.TrimRight(strings.TrimSpace(frontendURL), "/")
	if base == "" {
		base = "http://localhost:3000"
	}
	u, err := url.Parse(base + path)
	if err != nil {
		return base + path + "?token=" + url.QueryEscape(token)
	}
	q := u.Query()
	q.Set("token", token)
	u.RawQuery = q.Encode()
	return u.String()
}

func frontendLink(frontendURL string, path string) string {
	base := strings.TrimRight(strings.TrimSpace(frontendURL), "/")
	if base == "" {
		base = "http://localhost:3000"
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return base + path
}

func decodeExpoInput(w http.ResponseWriter, r *http.Request) (domain.ExpoInput, bool) {
	var input domain.ExpoInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return domain.ExpoInput{}, false
	}
	return input, true
}

func decodeExpoStatus(w http.ResponseWriter, r *http.Request) (domain.ExpoStatus, string, bool) {
	var input domain.ExpoStatusInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return "", "", false
	}
	status, ok := domain.ParseExpoStatus(input.Status)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_status", "Expo status is not supported.")
		return "", "", false
	}
	return status, input.Note, true
}

func writeExpoMutationError(w http.ResponseWriter, err error) {
	switch err {
	case store.ErrNotFound:
		writeError(w, http.StatusNotFound, "not_found", "Expo was not found.")
	case platform.ErrInvalidExpoInput:
		writeError(w, http.StatusBadRequest, "invalid_expo", "Expo details are incomplete or invalid.")
	case platform.ErrInvalidExpoStatus, platform.ErrInvalidStatusTransition:
		writeError(w, http.StatusBadRequest, "invalid_status_transition", "Expo status cannot move to the requested state.")
	case platform.ErrForbiddenExpoMutation:
		writeError(w, http.StatusForbidden, "forbidden", "You cannot perform this expo action.")
	default:
		writeError(w, http.StatusInternalServerError, "expo_failed", "Expo action failed.")
	}
}

func writePaymentError(w http.ResponseWriter, err error) {
	switch err {
	case store.ErrNotFound:
		writeError(w, http.StatusNotFound, "not_found", "Payment was not found.")
	case store.ErrInvalidCredentials:
		writeError(w, http.StatusForbidden, "forbidden", "You cannot perform this payment action.")
	case platform.ErrForbiddenExpoMutation:
		writeError(w, http.StatusBadRequest, "expo_not_payable", "Expo is not open for exhibitor activation payments.")
	default:
		writeError(w, http.StatusInternalServerError, "payment_failed", "Payment action failed.")
	}
}

func writeProductError(w http.ResponseWriter, err error) {
	switch err {
	case store.ErrNotFound:
		writeError(w, http.StatusNotFound, "product_not_found", "No active exhibitor workspace was found for this product.")
	case store.ErrInvalidCredentials:
		writeError(w, http.StatusBadRequest, "invalid_product", "Product details are incomplete or invalid.")
	default:
		writeError(w, http.StatusInternalServerError, "product_failed", "Product action failed.")
	}
}

func allowedUploadMime(value string) bool {
	switch value {
	case "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "video/mp4":
		return true
	default:
		return false
	}
}

func uploadExtension(mimeType string) string {
	switch mimeType {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	case "application/pdf":
		return ".pdf"
	case "video/mp4":
		return ".mp4"
	default:
		return ".bin"
	}
}

func sanitizeUploadPrefix(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var b strings.Builder
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' || r == '-' {
			b.WriteRune(r)
		}
	}
	if b.Len() == 0 {
		return "media"
	}
	return b.String()
}

func boothQRCodeSVG(code string, target string) string {
	code = xmlEscape(code)
	target = xmlEscape(target)
	var modules strings.Builder
	for y := 0; y < 21; y++ {
		for x := 0; x < 21; x++ {
			finder := (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)
			hash := (x*31 + y*17 + len(code)*13 + len(target)) % 7
			if finder || hash == 0 || hash == 3 {
				modules.WriteString(fmt.Sprintf(`<rect x="%d" y="%d" width="1" height="1"/>`, x+2, y+2))
			}
		}
	}
	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="500" viewBox="0 0 29 35" role="img" aria-label="Tandaza workspace QR">
<rect width="29" height="35" rx="1.5" fill="white"/>
<g transform="scale(1)" fill="#0f172a">%s</g>
<text x="14.5" y="29" text-anchor="middle" font-family="Arial, sans-serif" font-size="1.6" font-weight="700" fill="#0f172a">%s</text>
<text x="14.5" y="32" text-anchor="middle" font-family="Arial, sans-serif" font-size="0.9" fill="#475569">%s</text>
</svg>`, modules.String(), code, target)
}

func xmlEscape(value string) string {
	replacer := strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&quot;", "'", "&apos;")
	return replacer.Replace(value)
}

func expoCollection(r *http.Request, expos []domain.Expo) map[string]any {
	records := domain.ToExpoRecords(expos)
	submitted := 0
	published := 0
	for _, expo := range expos {
		if expo.Status == domain.ExpoSubmittedForReview {
			submitted++
		}
		if expo.Status == domain.ExpoPublished || expo.Status == domain.ExpoLive {
			published++
		}
	}
	return paginatedCollection(r, records, []domain.DashboardStat{
		{ID: "totalExpos", Label: "Total Expos", Value: strconv.Itoa(len(expos)), Delta: "all statuses", Trend: "neutral"},
		{ID: "reviewQueue", Label: "In Review", Value: strconv.Itoa(submitted), Delta: "awaiting admin", Trend: "neutral"},
		{ID: "published", Label: "Published/Live", Value: strconv.Itoa(published), Delta: "visible soon", Trend: "up"},
	})
}

func paymentCollection(r *http.Request, payments []domain.Payment) map[string]any {
	records := paymentRecords(payments)
	paid := 0
	var paidMinor int64
	for _, payment := range payments {
		if payment.Status == domain.PaymentPaid {
			paid++
			paidMinor += payment.AmountMinor
		}
	}
	currency := currencyFromPayments(payments, "KES")
	return paginatedCollection(r, records, []domain.DashboardStat{
		{ID: "totalPayments", Label: "Total Payments", Value: strconv.Itoa(len(payments)), Delta: "all statuses", Trend: "neutral"},
		{ID: "paidPayments", Label: "Paid", Value: strconv.Itoa(paid), Delta: "confirmed", Trend: "up"},
		{ID: "paidVolume", Label: "Paid Volume", Value: formatMoneyMinor(paidMinor, currency), Delta: "confirmed value", Trend: "up"},
	})
}

func settlementCollection(r *http.Request, records []domain.SettlementRecord) map[string]any {
	var amount int64
	var commission int64
	for _, record := range records {
		amount += record.Amount
		commission += record.Commission
	}
	currency := currencyFromSettlements(records, "KES")
	return paginatedCollection(r, records, []domain.DashboardStat{
		{ID: "settlements", Label: "Settlements", Value: strconv.Itoa(len(records)), Delta: "derived from paid activations", Trend: "neutral"},
		{ID: "gross", Label: "Gross", Value: formatMoneyMajor(amount, currency), Delta: "collected value", Trend: "up"},
		{ID: "commission", Label: "Organizer Commission", Value: formatMoneyMajor(commission, currency), Delta: "pending payout review", Trend: "up"},
	})
}

func (s *Server) notificationCollection(r *http.Request, items []domain.Notification) map[string]any {
	queued := 0
	delivered := 0
	for _, item := range items {
		if item.Status == "queued" {
			queued++
		}
		if item.Status == "sent" || item.Status == "delivered" {
			delivered++
		}
	}
	records := make([]domain.NotificationRecord, 0, len(items))
	recipients := map[string]string{}
	for _, item := range items {
		if strings.TrimSpace(item.UserID) != "" {
			if _, ok := recipients[item.UserID]; !ok {
				user, err := s.store.UserByID(r.Context(), item.UserID)
				if err == nil {
					recipients[item.UserID] = notificationDisplayName(user)
				}
			}
		}
		records = append(records, notificationRecord(item, recipients[item.UserID]))
	}
	return paginatedCollection(r, records, []domain.DashboardStat{
		{ID: "notifications", Label: "Notifications", Value: strconv.Itoa(len(items)), Delta: "all channels", Trend: "neutral"},
		{ID: "delivered", Label: "Sent/Delivered", Value: strconv.Itoa(delivered), Delta: "completed", Trend: "up"},
		{ID: "queued", Label: "Queued", Value: strconv.Itoa(queued), Delta: "pending dispatch", Trend: "neutral"},
	})
}

func (s *Server) notificationByID(r *http.Request, id string) (domain.Notification, bool) {
	notifications, err := s.store.ListNotifications(r.Context(), store.NotificationFilter{})
	if err != nil {
		return domain.Notification{}, false
	}
	for _, item := range notifications {
		if item.ID == id {
			return item, true
		}
	}
	return domain.Notification{}, false
}

func notificationRecord(item domain.Notification, recipientFallback string) domain.NotificationRecord {
	subject := item.TemplateKey
	if value, ok := item.Payload["subject"].(string); ok && strings.TrimSpace(value) != "" {
		subject = value
	}
	message := notificationMessage(item)
	sentAt := item.ScheduledAt.Format(time.RFC3339)
	if item.SentAt != nil {
		sentAt = item.SentAt.Format(time.RFC3339)
	}
	return domain.NotificationRecord{
		ID: item.ID, Recipient: notificationRecipient(item, recipientFallback), Role: item.Role, Channel: item.Channel, Subject: subject, Message: message, Status: notificationStatusForFrontend(item.Status), SentAt: sentAt, ActionURL: notificationActionURL(item), Unread: item.ReadAt == nil,
	}
}

func notificationActionURL(item domain.Notification) string {
	if cta := notificationPayloadText(item.Payload, "ctaUrl"); strings.HasPrefix(cta, "/") {
		return cta
	}
	switch item.TemplateKey {
	case "meeting_scheduled", "meeting_reminder":
		if item.Role == domain.RoleVisitor {
			return "/visitor/calendar"
		}
		if strings.TrimSpace(item.ExpoID) != "" {
			return "/exhibitor/my-expos/" + item.ExpoID + "?tab=meetings"
		}
	case "new_lead_captured":
		if strings.TrimSpace(item.ExpoID) != "" {
			return "/exhibitor/my-expos/" + item.ExpoID + "?tab=leads"
		}
	case "conversation_message":
		threadID := notificationPayloadText(item.Payload, "threadId")
		if item.Role == domain.RoleVisitor {
			if strings.TrimSpace(item.ExpoID) != "" {
				return "/visitor/expos/" + item.ExpoID + "?tab=conversations"
			}
		}
		if strings.TrimSpace(item.ExpoID) != "" {
			url := "/exhibitor/my-expos/" + item.ExpoID + "?tab=conversations"
			if strings.TrimSpace(threadID) != "" {
				url += "&thread=" + threadID
			}
			return url
		}
	}
	if item.Role == domain.RoleExhibitor {
		return "/exhibitor"
	}
	if item.Role == domain.RoleOrganizer {
		return "/organizer"
	}
	if item.Role == domain.RoleSponsor {
		return "/sponsor"
	}
	if item.Role == domain.RoleVisitor {
		return "/visitor"
	}
	return ""
}

func notificationRecipient(item domain.Notification, fallback string) string {
	if cleaned := strings.TrimSpace(fallback); cleaned != "" && !strings.HasPrefix(cleaned, "pii:") {
		return cleaned
	}
	for _, value := range []string{
		item.Recipient,
		item.RecipientEmail,
		item.RecipientPhone,
		notificationPayloadText(item.Payload, "recipient"),
		notificationPayloadText(item.Payload, "name"),
		notificationPayloadText(item.Payload, "to"),
		notificationPayloadText(item.Payload, "email"),
		notificationPayloadText(item.Payload, "phone"),
	} {
		cleaned := strings.TrimSpace(value)
		if cleaned != "" && !strings.HasPrefix(cleaned, "pii:") {
			return cleaned
		}
	}
	return "Recipient"
}

func cleanEmailList(values []string) []string {
	seen := map[string]bool{}
	items := []string{}
	for _, value := range values {
		for _, part := range strings.Split(value, ",") {
			cleaned := strings.ToLower(strings.TrimSpace(part))
			if cleaned == "" || seen[cleaned] {
				continue
			}
			seen[cleaned] = true
			items = append(items, cleaned)
		}
	}
	return items
}

func validEmailAddress(value string) bool {
	cleaned := strings.TrimSpace(value)
	if cleaned == "" || strings.ContainsAny(cleaned, " \n\r\t") {
		return false
	}
	parts := strings.Split(cleaned, "@")
	return len(parts) == 2 && parts[0] != "" && strings.Contains(parts[1], ".")
}

func notificationPayloadText(payload map[string]any, key string) string {
	if payload == nil {
		return ""
	}
	value, ok := payload[key]
	if !ok {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(value))
}

func notificationMessage(item domain.Notification) string {
	for _, key := range []string{"message", "body", "text", "description"} {
		if value, ok := item.Payload[key].(string); ok && strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return notifyBodyFallback(item.TemplateKey)
}

func notifyBodyFallback(key string) string {
	switch key {
	case "expo_remote_access_booked":
		return "Your remote expo access has been confirmed."
	case "new_lead_captured":
		return "A new expo lead has been captured."
	case "expo_reminder":
		return "Your expo reminder is ready."
	case "lead_follow_up_reminder":
		return "Your lead follow-up reminder is ready."
	case "email_verification":
		return "Confirm your email address to activate your Tandaza workspace."
	case "password_reset":
		return "Use the reset link to choose a new Tandaza password."
	default:
		return key
	}
}

func notificationStatusForFrontend(status string) string {
	switch status {
	case "sent", "delivered":
		return "delivered"
	case "failed":
		return "failed"
	default:
		return "queued"
	}
}

func userRecord(user domain.User) map[string]any {
	status := "active"
	if strings.TrimSpace(user.Status) != "" {
		status = user.Status
	}
	return map[string]any{
		"id":                 user.ID,
		"name":               user.Name,
		"email":              user.Email,
		"role":               user.Role,
		"countryCode":        user.CountryCode,
		"status":             status,
		"mustChangePassword": user.MustChangePassword,
		"lastLogin":          "",
		"createdAt":          "",
	}
}

func visitorRecord(user domain.User) map[string]any {
	return map[string]any{
		"id":            user.ID,
		"name":          user.Name,
		"email":         user.Email,
		"countryCode":   user.CountryCode,
		"status":        "active",
		"lastActivity":  "",
		"exposAttended": 0,
		"interactions":  0,
		"createdAt":     "",
	}
}

func organizerVisitorRecordsFromLeads(leads []domain.LeadRecord) []map[string]any {
	type expoVisit struct {
		id           string
		name         string
		interactions int
		lastActivity string
	}
	type aggregate struct {
		id           string
		name         string
		email        string
		lastActivity string
		expos        map[string]*expoVisit
		interactions int
	}
	grouped := map[string]*aggregate{}
	for _, lead := range leads {
		key := strings.ToLower(strings.TrimSpace(lead.VisitorEmail))
		if key == "" {
			key = strings.ToLower(strings.TrimSpace(lead.VisitorName))
		}
		if key == "" {
			key = lead.ID
		}
		item, ok := grouped[key]
		if !ok {
			item = &aggregate{id: "visitor_" + slugifyForID(key), name: nonEmpty(lead.VisitorName, "Visitor"), email: lead.VisitorEmail, expos: map[string]*expoVisit{}}
			grouped[key] = item
		}
		item.interactions++
		if lead.ExpoID != "" {
			visit, ok := item.expos[lead.ExpoID]
			if !ok {
				visit = &expoVisit{id: lead.ExpoID, name: lead.ExpoName}
				item.expos[lead.ExpoID] = visit
			}
			visit.interactions++
			if lead.CapturedAt > visit.lastActivity {
				visit.lastActivity = lead.CapturedAt
			}
		}
		if lead.CapturedAt > item.lastActivity {
			item.lastActivity = lead.CapturedAt
		}
	}
	records := []map[string]any{}
	for _, item := range grouped {
		expos := []map[string]any{}
		for _, expo := range item.expos {
			expos = append(expos, map[string]any{
				"id":           expo.id,
				"name":         nonEmpty(expo.name, expo.id),
				"interactions": expo.interactions,
				"lastActivity": expo.lastActivity,
			})
		}
		sort.SliceStable(expos, func(i, j int) bool {
			return fmt.Sprint(expos[i]["lastActivity"]) > fmt.Sprint(expos[j]["lastActivity"])
		})
		records = append(records, map[string]any{
			"id": item.id, "name": item.name, "email": item.email, "status": "active", "lastActivity": item.lastActivity,
			"exposAttended": len(item.expos), "visitedExpos": expos, "interactions": item.interactions, "createdAt": item.lastActivity,
		})
	}
	sort.SliceStable(records, func(i, j int) bool {
		return fmt.Sprint(records[i]["lastActivity"]) > fmt.Sprint(records[j]["lastActivity"])
	})
	return records
}

func organizerFeedbackRecordMap(item domain.OrganizerFeedbackRecord) map[string]any {
	return map[string]any{
		"id":             item.ID,
		"expoId":         item.ExpoID,
		"expoName":       item.ExpoName,
		"respondentName": item.ExhibitorName,
		"respondentRole": "exhibitor",
		"category":       item.Category,
		"rating":         item.Rating,
		"comment":        item.Comment,
		"suggestions":    item.Improvements,
		"improvements":   item.Improvements,
		"dislikes":       item.Dislikes,
		"createdAt":      item.SubmittedAt,
	}
}

func exhibitorVisitorsFromLeads(leads []domain.LeadRecord) []map[string]any {
	type visitorAggregate struct {
		id              string
		name            string
		email           string
		phone           string
		source          string
		sourceLabel     string
		engagementCount int
		registeredAt    string
		lastSeenAt      string
	}
	visitors := map[string]*visitorAggregate{}
	order := []string{}
	for _, lead := range leads {
		key := strings.ToLower(strings.TrimSpace(lead.VisitorEmail))
		if key == "" {
			key = strings.ToLower(strings.TrimSpace(lead.VisitorName))
		}
		if key == "" {
			key = lead.ID
		}
		source := visitorSourceCode(lead)
		sourceLabel := visitorSourceLabel(source)
		visitor, ok := visitors[key]
		if !ok {
			visitor = &visitorAggregate{
				id:           "visitor_" + slugifyForID(key),
				name:         nonEmpty(lead.VisitorName, "Visitor"),
				email:        lead.VisitorEmail,
				phone:        lead.VisitorPhone,
				source:       source,
				sourceLabel:  sourceLabel,
				registeredAt: lead.CapturedAt,
				lastSeenAt:   lead.CapturedAt,
			}
			visitors[key] = visitor
			order = append(order, key)
		}
		visitor.engagementCount++
		if strings.TrimSpace(visitor.phone) == "" && strings.TrimSpace(lead.VisitorPhone) != "" {
			visitor.phone = lead.VisitorPhone
		}
		if strings.TrimSpace(visitor.email) == "" && strings.TrimSpace(lead.VisitorEmail) != "" {
			visitor.email = lead.VisitorEmail
		}
		if strings.TrimSpace(visitor.name) == "" || visitor.name == "Visitor" {
			visitor.name = nonEmpty(lead.VisitorName, "Visitor")
		}
		if isAfterTime(lead.CapturedAt, visitor.lastSeenAt) {
			visitor.lastSeenAt = lead.CapturedAt
			visitor.source = source
			visitor.sourceLabel = sourceLabel
		}
	}
	sort.SliceStable(order, func(i, j int) bool {
		return isAfterTime(visitors[order[i]].lastSeenAt, visitors[order[j]].lastSeenAt)
	})
	records := []map[string]any{}
	for _, key := range order {
		visitor := visitors[key]
		records = append(records, map[string]any{
			"id":              visitor.id,
			"name":            visitor.name,
			"email":           visitor.email,
			"phone":           visitor.phone,
			"company":         "",
			"source":          visitor.source,
			"sourceLabel":     visitor.sourceLabel,
			"engagementCount": visitor.engagementCount,
			"registeredAt":    visitor.registeredAt,
			"lastSeenAt":      visitor.lastSeenAt,
		})
	}
	return records
}

func visitorSourceCode(lead domain.LeadRecord) string {
	source := strings.TrimSpace(lead.Source)
	notes := strings.ToLower(lead.Notes)
	switch {
	case source == "pre_order" || strings.Contains(notes, "pre-order"):
		return "pre_order"
	case lead.Status == "meeting_booked" || lead.LastActivity == "meeting" || strings.Contains(notes, "meeting"):
		return "meeting"
	case source == "booth_qr" || strings.Contains(notes, "qr code"):
		return "booth_qr"
	case source == "onsite":
		return "onsite"
	case lead.LastActivity == "visit" || strings.Contains(notes, "opened exhibitor profile"):
		return "remote_visit"
	case source == "inquiry":
		return "inquiry"
	default:
		return "remote"
	}
}

func visitorSourceLabel(source string) string {
	switch source {
	case "booth_qr":
		return "QR scan"
	case "onsite":
		return "On-site visit"
	case "inquiry":
		return "Shared interest"
	case "meeting":
		return "Meeting request"
	case "pre_order":
		return "Pre-order intent"
	case "remote_visit":
		return "Remote visit"
	default:
		return "Expo profile visit"
	}
}

func isAfterTime(value string, compareTo string) bool {
	if strings.TrimSpace(value) == "" {
		return false
	}
	if strings.TrimSpace(compareTo) == "" {
		return true
	}
	left, leftErr := time.Parse(time.RFC3339, value)
	right, rightErr := time.Parse(time.RFC3339, compareTo)
	if leftErr != nil || rightErr != nil {
		return value > compareTo
	}
	return left.After(right)
}

func preOrdersFromLeads(leads []domain.LeadRecord) []map[string]any {
	items := []map[string]any{}
	for _, lead := range leads {
		if !isPreOrderLead(lead) {
			continue
		}
		productName := "Product interest"
		if strings.TrimSpace(lead.ProductName) != "" {
			productName = strings.TrimSpace(lead.ProductName)
		}
		if productName == "Product interest" && len(lead.InterestedProductIds) > 0 {
			productName = strings.Join(lead.InterestedProductIds, ", ")
		}
		quantity := lead.Quantity
		if quantity <= 0 {
			quantity = 1
		}
		unitPrice := lead.ProductPrice
		currency := strings.ToUpper(strings.TrimSpace(lead.ProductCurrency))
		amount := unitPrice * int64(quantity)
		productID := ""
		if len(lead.InterestedProductIds) > 0 {
			productID = lead.InterestedProductIds[0]
		}
		items = append(items, map[string]any{
			"id": "po_" + lead.ID, "expoId": lead.ExpoID, "expoName": lead.ExpoName, "exhibitorId": lead.ExhibitorID,
			"productId": productID, "productName": productName, "visitorName": lead.VisitorName, "visitorEmail": lead.VisitorEmail,
			"visitorPhone": lead.VisitorPhone, "quantity": quantity, "unitPrice": unitPrice, "amount": amount, "currency": currency, "status": preOrderStatusFromNotes(lead.FollowUpNotes), "createdAt": lead.CapturedAt,
		})
	}
	return items
}

func isPreOrderLead(lead domain.LeadRecord) bool {
	return lead.Source == "pre_order" || strings.Contains(strings.ToLower(lead.Notes), "pre-order")
}

func validPreOrderStatus(value string) string {
	switch strings.TrimSpace(value) {
	case "pending", "confirmed", "processing", "ready_for_delivery", "delivered", "cancelled":
		return strings.TrimSpace(value)
	default:
		return ""
	}
}

func preOrderStatusFromNotes(value string) string {
	for _, line := range strings.Split(value, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "[pre_order_status:") && strings.HasSuffix(line, "]") {
			status := strings.TrimSuffix(strings.TrimPrefix(line, "[pre_order_status:"), "]")
			if valid := validPreOrderStatus(status); valid != "" {
				return valid
			}
		}
	}
	return "pending"
}

func setPreOrderStatusNote(notes string, status string) string {
	lines := []string{}
	for _, line := range strings.Split(notes, "\n") {
		if strings.HasPrefix(strings.TrimSpace(line), "[pre_order_status:") {
			continue
		}
		if strings.TrimSpace(line) != "" {
			lines = append(lines, line)
		}
	}
	lines = append(lines, "[pre_order_status:"+status+"]")
	return strings.Join(lines, "\n")
}

func meetingsFromLeads(leads []domain.LeadRecord) []map[string]any {
	items := []map[string]any{}
	for _, lead := range leads {
		if lead.Status != "meeting_booked" && lead.LastActivity != "meeting" && !strings.Contains(strings.ToLower(lead.Notes), "meeting") {
			continue
		}
		scheduledAt := lead.NextFollowUpAt
		if scheduledAt == "" {
			scheduledAt = lead.CapturedAt
		}
		items = append(items, map[string]any{
			"id": "meet_" + lead.ID, "expoId": lead.ExpoID, "exhibitorId": lead.ExhibitorID, "visitorId": "",
			"visitorName": lead.VisitorName, "visitorEmail": lead.VisitorEmail, "title": "Follow up with " + nonEmpty(lead.VisitorName, "visitor"),
			"scheduledAt": scheduledAt, "status": "scheduled",
		})
	}
	return items
}

func peakHoursFromLeads(leads []domain.LeadRecord) []string {
	hours := map[string]int{}
	for _, lead := range leads {
		captured, err := time.Parse(time.RFC3339, lead.CapturedAt)
		if err != nil {
			continue
		}
		hours[captured.Format("15:00")]++
	}
	type hourCount struct {
		hour  string
		count int
	}
	ranked := []hourCount{}
	for hour, count := range hours {
		ranked = append(ranked, hourCount{hour: hour, count: count})
	}
	sort.Slice(ranked, func(i, j int) bool {
		if ranked[i].count == ranked[j].count {
			return ranked[i].hour < ranked[j].hour
		}
		return ranked[i].count > ranked[j].count
	})
	limit := len(ranked)
	if limit > 3 {
		limit = 3
	}
	values := []string{}
	for i := 0; i < limit; i++ {
		values = append(values, ranked[i].hour)
	}
	return values
}

func organizerActivityItems(expos []domain.Expo, payments []domain.Payment, leads []domain.LeadRecord) []map[string]any {
	items := []map[string]any{}
	for _, lead := range leads {
		items = append(items, map[string]any{
			"id": "act_" + lead.ID, "title": "Visitor engagement captured", "description": nonEmpty(lead.VisitorName, "Visitor") + " engaged at " + lead.ExpoName,
			"timestamp": lead.CapturedAt, "type": "traffic",
		})
		if len(items) >= 5 {
			return items
		}
	}
	for _, payment := range payments {
		items = append(items, map[string]any{
			"id": "act_" + payment.ID, "title": "Payment " + string(payment.Status), "description": payment.PayerName + " paid for " + payment.ExpoName,
			"timestamp": payment.CreatedAt.Format(time.RFC3339), "type": "finance",
		})
		if len(items) >= 5 {
			return items
		}
	}
	for _, expo := range expos {
		items = append(items, map[string]any{
			"id": "act_" + expo.ID, "title": "Expo " + strings.ReplaceAll(string(expo.Status), "_", " "), "description": expo.Name + " in " + expo.City,
			"timestamp": expo.UpdatedAt.Format(time.RFC3339), "type": "system",
		})
		if len(items) >= 5 {
			return items
		}
	}
	return items
}

func slugifyForID(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var builder strings.Builder
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			builder.WriteRune(r)
			continue
		}
		if builder.Len() > 0 && builder.String()[builder.Len()-1] != '_' {
			builder.WriteByte('_')
		}
	}
	result := strings.Trim(builder.String(), "_")
	if result == "" {
		return "unknown"
	}
	return result
}

func exhibitorActivityItems(assignments []domain.ExpoExhibitor, payments []domain.Payment, leads []domain.LeadRecord) []map[string]any {
	items := []map[string]any{}
	for _, lead := range leads {
		items = append(items, map[string]any{"id": "lead_" + lead.ID, "title": "New lead: " + nonEmpty(lead.VisitorName, "Visitor"), "description": lead.ExpoName + " - " + nonEmpty(lead.Temperature, "warm") + " lead", "timestamp": lead.CapturedAt, "type": "lead"})
	}
	for _, payment := range payments {
		items = append(items, map[string]any{"id": "payment_" + payment.ID, "title": "Activation payment " + string(payment.Status), "description": payment.ExpoName, "timestamp": payment.CreatedAt.Format(time.RFC3339), "type": "payment"})
	}
	for _, assignment := range assignments {
		items = append(items, map[string]any{"id": "assignment_" + assignment.ID, "title": "Expo workspace assigned", "description": assignment.ExpoName, "timestamp": assignment.CreatedAt.Format(time.RFC3339), "type": "expo"})
	}
	if len(items) > 8 {
		return items[:8]
	}
	return items
}

func organizerRecord(user domain.User) map[string]any {
	company := nonEmpty(user.CompanyName, user.Name)
	return map[string]any{
		"id":          user.ID,
		"name":        user.Name,
		"company":     company,
		"email":       user.Email,
		"countryCode": user.CountryCode,
		"status":      "verified",
		"expos":       0,
		"createdAt":   "",
	}
}

func exhibitorRecord(user domain.User) map[string]any {
	return map[string]any{
		"id":            user.ID,
		"company":       nonEmpty(user.CompanyName, user.Name),
		"contact":       user.Name,
		"email":         user.Email,
		"countryCode":   user.CountryCode,
		"assignedExpos": "",
		"status":        "active",
		"createdAt":     "",
	}
}

func sponsorRecord(user domain.User) map[string]any {
	return map[string]any{
		"id":             user.ID,
		"sponsor":        user.Name,
		"company":        nonEmpty(user.CompanyName, user.Name),
		"email":          user.Email,
		"countryCode":    user.CountryCode,
		"package":        "Unassigned",
		"campaignStatus": "draft",
		"createdAt":      "",
	}
}

func countUsersByRole(users []domain.User, role domain.Role) int {
	count := 0
	for _, user := range users {
		if user.Role == role {
			count++
		}
	}
	return count
}

func countAdminUsers(users []domain.User) int {
	count := 0
	for _, user := range users {
		if serverAdminRole(user.Role) {
			count++
		}
	}
	return count
}

func adminOverviewFrom(countryCode string, expos []domain.Expo, countries []domain.Country, users []domain.User, payments []domain.Payment, auditLogs []domain.AuditLog) map[string]any {
	published := 0
	var activationFees int64
	var commissionBps int
	for _, expo := range expos {
		if expo.Status == domain.ExpoPublished || expo.Status == domain.ExpoLive {
			published++
		}
		activationFees += expo.ExhibitorActivationFeeMinor
		commissionBps += expo.OrganizerCommissionBps
	}
	avgFee := int64(0)
	avgCommission := 0
	if len(expos) > 0 {
		avgFee = activationFees / int64(len(expos))
		avgCommission = commissionBps / len(expos)
	}
	currency := currencyForOverview(countryCode, expos, payments, countries)
	return map[string]any{
		"stats": []domain.DashboardStat{
			{ID: "expos", Label: "Published Expos", Value: strconv.Itoa(published), Delta: strconv.Itoa(len(expos)) + " total", Trend: "neutral"},
			{ID: "countries", Label: "Configured Countries", Value: strconv.Itoa(len(countries)), Delta: "active markets", Trend: "up"},
			{ID: "activationFee", Label: "Average Activation Fee", Value: formatMoneyMinor(avgFee, currency), Delta: "configured per expo", Trend: "neutral"},
			{ID: "commission", Label: "Average Organizer Commission", Value: strconv.Itoa(avgCommission/100) + "%", Delta: "configured on expos", Trend: "up"},
		},
		"roleDistribution": roleDistribution(users),
		"systemHealth": []map[string]any{
			{"service": "Go API", "status": "healthy", "responseTimeMs": 0},
			{"service": "Data Store", "status": "healthy", "responseTimeMs": 0},
			{"service": "Payment Webhooks", "status": webhookHealth(payments), "responseTimeMs": 0},
		},
		"activities":    activityItemsFromAudit(auditLogs),
		"quickActions":  overviewQuickActions(expos, payments),
		"paymentVolume": paidPaymentVolume(payments),
	}
}

func currencyForOverview(countryCode string, expos []domain.Expo, payments []domain.Payment, countries []domain.Country) string {
	if len(expos) > 0 && strings.TrimSpace(expos[0].CurrencyCode) != "" {
		return expos[0].CurrencyCode
	}
	if len(payments) > 0 && strings.TrimSpace(payments[0].CurrencyCode) != "" {
		return payments[0].CurrencyCode
	}
	countryCode = strings.ToUpper(strings.TrimSpace(countryCode))
	for _, country := range countries {
		if strings.ToUpper(strings.TrimSpace(country.Code)) == countryCode && strings.TrimSpace(country.DefaultCurrency) != "" {
			return country.DefaultCurrency
		}
	}
	return "KES"
}

func currencyFromPayments(payments []domain.Payment, fallback string) string {
	for _, payment := range payments {
		if strings.TrimSpace(payment.CurrencyCode) != "" {
			return payment.CurrencyCode
		}
	}
	return fallback
}

func currencyFromExpos(expos []domain.Expo, fallback string) string {
	for _, expo := range expos {
		if strings.TrimSpace(expo.CurrencyCode) != "" {
			return expo.CurrencyCode
		}
	}
	return fallback
}

func currencyFromSettlements(records []domain.SettlementRecord, fallback string) string {
	for _, record := range records {
		if strings.TrimSpace(record.Currency) != "" {
			return record.Currency
		}
	}
	return fallback
}

func majorFromMinor(amount int64) int64 {
	if amount >= 0 {
		return (amount + 50) / 100
	}
	return (amount - 50) / 100
}

func formatMoneyMinor(amount int64, currency string) string {
	return formatMoneyMajor(majorFromMinor(amount), currency)
}

func formatMoneyMajor(amount int64, currency string) string {
	code := strings.ToUpper(strings.TrimSpace(currency))
	if code == "" {
		code = "KES"
	}
	return code + " " + formatIntWithCommas(amount)
}

func formatIntWithCommas(value int64) string {
	sign := ""
	if value < 0 {
		sign = "-"
		value = -value
	}
	raw := strconv.FormatInt(value, 10)
	if len(raw) <= 3 {
		return sign + raw
	}
	var parts []string
	for len(raw) > 3 {
		parts = append([]string{raw[len(raw)-3:]}, parts...)
		raw = raw[:len(raw)-3]
	}
	parts = append([]string{raw}, parts...)
	return sign + strings.Join(parts, ",")
}

func roleDistribution(users []domain.User) []map[string]any {
	counts := map[domain.Role]int{}
	for _, user := range users {
		counts[user.Role]++
	}
	roles := []domain.Role{domain.RoleVisitor, domain.RoleExhibitor, domain.RoleOrganizer, domain.RoleSponsor, domain.RoleAdministrator, domain.RoleSuperAdmin}
	items := make([]map[string]any, 0, len(roles))
	for _, role := range roles {
		items = append(items, map[string]any{"role": role, "count": counts[role]})
	}
	return items
}

func activityItemsFromAudit(logs []domain.AuditLog) []map[string]any {
	items := []map[string]any{}
	for _, log := range logs {
		items = append(items, map[string]any{
			"id": log.ID, "title": strings.ReplaceAll(log.Action, "_", " "), "description": log.EntityType + " " + log.EntityID,
			"timestamp": log.CreatedAt, "type": activityTypeFromAction(log.Action),
		})
		if len(items) == 5 {
			break
		}
	}
	return items
}

func activityTypeFromAction(action string) string {
	switch {
	case strings.Contains(action, "payment") || strings.Contains(action, "settlement"):
		return "finance"
	case strings.Contains(action, "login") || strings.Contains(action, "password"):
		return "security"
	case strings.Contains(action, "lead") || strings.Contains(action, "visitor"):
		return "traffic"
	default:
		return "system"
	}
}

func webhookHealth(payments []domain.Payment) string {
	for _, payment := range payments {
		if payment.ProviderRef != "" && payment.Status == domain.PaymentPaid {
			return "healthy"
		}
	}
	return "warning"
}

func overviewQuickActions(expos []domain.Expo, payments []domain.Payment) []map[string]string {
	actions := []map[string]string{}
	if len(expos) > 0 {
		actions = append(actions, map[string]string{"id": "expos", "label": "Review Expos", "description": strconv.Itoa(len(expos)) + " expos in system", "href": "/administrator/expos"})
	}
	if len(payments) > 0 {
		actions = append(actions, map[string]string{"id": "payments", "label": "Review Payments", "description": strconv.Itoa(len(payments)) + " payments in system", "href": "/administrator/payments"})
	}
	actions = append(actions, map[string]string{"id": "reports", "label": "Open Reports", "description": "View computed platform analytics", "href": "/administrator/reports"})
	return actions
}

func adCollection(r *http.Request, ads []domain.SponsorAdRecord) map[string]any {
	records := []map[string]any{}
	active := 0
	var impressions int64
	for _, ad := range ads {
		if ad.Status == "active" {
			active++
		}
		impressions += ad.Impressions
		records = append(records, map[string]any{
			"id": ad.ID, "ownerName": nonEmpty(ad.SponsorName, ad.SponsorID), "ownerRole": "sponsorship", "expoName": ad.Placement + " placement",
			"name": ad.Name, "countryCode": ad.CountryCode, "mediaUrl": ad.MediaURL, "mediaType": ad.MediaType, "dimensions": ad.Dimensions,
			"campaignName": ad.CampaignName, "placement": ad.Placement, "impressions": ad.Impressions, "clicks": ad.Clicks,
			"status": statusForAdminAd(ad.Status), "createdAt": ad.CreatedAt,
		})
	}
	return paginatedCollection(r, records, []domain.DashboardStat{
		{ID: "ads", Label: "Ads", Value: strconv.Itoa(len(ads)), Delta: "sponsor placements", Trend: "neutral"},
		{ID: "activeAds", Label: "Active Ads", Value: strconv.Itoa(active), Delta: "currently visible", Trend: "up"},
		{ID: "impressions", Label: "Impressions", Value: strconv.FormatInt(impressions, 10), Delta: "tracked delivery", Trend: "up"},
	})
}

func statusForAdminAd(status string) string {
	switch status {
	case "active":
		return "active"
	case "paused", "rejected":
		return "paused"
	default:
		return "draft"
	}
}

func sponsorDashboardFrom(campaigns []domain.SponsorCampaignRecord, ads []domain.SponsorAdRecord, payments []domain.SponsorPaymentRecord) domain.SponsorDashboardStats {
	activeCampaigns := 0
	activeAds := 0
	var impressions int64
	var clicks int64
	var spend int64
	for _, campaign := range campaigns {
		if campaign.Status == "active" {
			activeCampaigns++
		}
	}
	for _, ad := range ads {
		if ad.Status == "active" {
			activeAds++
		}
		impressions += ad.Impressions
		clicks += ad.Clicks
		spend += ad.DailySpend
	}
	for _, payment := range payments {
		if payment.Status == "paid" {
			spend += payment.Amount
		}
	}
	ctr := 0.0
	if impressions > 0 {
		ctr = (float64(clicks) / float64(impressions)) * 100
	}
	recent := ads
	if len(recent) > 5 {
		recent = recent[:5]
	}
	return domain.SponsorDashboardStats{
		TotalCampaigns: len(campaigns), ActiveCampaigns: activeCampaigns, TotalAds: len(ads), ActiveAds: activeAds,
		TotalImpressions: impressions, TotalClicks: clicks, AverageCtr: ctr, TotalSpend: spend, RecentAds: recent,
	}
}

func sponsorPaymentReceiptFrom(payment domain.SponsorPaymentRecord) domain.PaymentReceipt {
	payerName := nonEmpty(payment.AdName, payment.AdID)
	return domain.PaymentReceipt{
		ID: payment.ID, Reference: payment.Reference, Type: "payment", EntityID: payment.ID, ExpoName: nonEmpty(payment.AdName, "sponsor placement"),
		PayerName: payerName, PayerEmail: "", PayeeName: "Tandaza", Description: payment.AdName,
		Amount: payment.Amount, Currency: payment.Currency, Tax: 0, Total: payment.Amount, PlatformFee: payment.Amount,
		PaymentMethod: payment.PaymentMethod, Status: payment.Status, PaidAt: payment.PaidAt, IssuedAt: payment.PaidAt,
		OrganizerShare: 0, PlatformShare: payment.Amount, CommissionRate: 0,
	}
}

func (s *Server) settlementRecords(ctx context.Context, payments []domain.Payment, organizerID string) []domain.SettlementRecord {
	type aggregate struct {
		expo       domain.Expo
		amount     int64
		commission int64
		createdAt  time.Time
	}
	groups := map[string]aggregate{}
	for _, payment := range payments {
		if payment.Status != domain.PaymentPaid {
			continue
		}
		expo, err := s.store.ExpoByID(ctx, payment.ExpoID)
		if err != nil {
			continue
		}
		if organizerID != "" && expo.OrganizerID != organizerID {
			continue
		}
		commissionBase := paymentCommissionBaseMinor(payment)
		split, err := platform.CalculateCommission(commissionBase, expo.OrganizerCommissionBps, payment.CurrencyCode)
		if err != nil {
			continue
		}
		group := groups[expo.ID]
		group.expo = expo
		group.amount += commissionBase
		group.commission += split.CommissionMinor
		if group.createdAt.IsZero() || payment.CreatedAt.After(group.createdAt) {
			group.createdAt = payment.CreatedAt
		}
		groups[expo.ID] = group
	}
	records := []domain.SettlementRecord{}
	for expoID, group := range groups {
		if group.createdAt.IsZero() {
			group.createdAt = time.Now().UTC()
		}
		profile, _ := s.store.OrganizerProfile(ctx, group.expo.OrganizerID)
		record := domain.SettlementRecord{
			ID: "set_" + expoID, Reference: "SET-" + strings.ToUpper(strings.TrimPrefix(expoID, "expo_")),
			Expo: group.expo.Name, Organizer: group.expo.OrganizerName, Period: group.createdAt.Format("Jan 2006"),
			Currency: group.expo.CurrencyCode, Amount: majorFromMinor(group.amount), Commission: majorFromMinor(group.commission),
			NetAmount: majorFromMinor(group.commission), Status: settlementStatusLabel(s.store.SettlementStatus(ctx, "set_"+expoID)), CreatedAt: group.createdAt.Format(time.RFC3339),
			CommissionRate: group.expo.OrganizerCommissionBps / 100,
			PayoutMethod:   profile.PayoutMethod,
			BankName:       profile.PayoutBankName,
			AccountName:    profile.PayoutAccountName,
			AccountNumber:  profile.PayoutAccountNumber,
			BankBranch:     profile.PayoutBankBranch,
			SwiftCode:      profile.PayoutSwiftCode,
			MobileProvider: profile.PayoutMobileProvider,
			MobileNumber:   profile.PayoutMobileNumber,
			PayoutNotes:    profile.PayoutNotes,
		}
		records = append(records, record)
	}
	return records
}

func paymentRecords(payments []domain.Payment) []domain.PaymentRecord {
	records := make([]domain.PaymentRecord, 0, len(payments))
	for _, payment := range payments {
		records = append(records, domain.PaymentRecord{
			ID: payment.ID, Reference: paymentReference(payment), PayerName: payment.PayerName, PayerRole: payment.PayerRole,
			ExpoName: payment.ExpoName, Currency: payment.CurrencyCode, Amount: majorFromMinor(payment.AmountMinor),
			ProcessingFee: majorFromMinor(payment.ProcessingFeeMinor),
			Method:        payment.Provider, Status: string(payment.Status), PaidAt: paymentTime(payment),
		})
	}
	return records
}

func settlementStatusLabel(status string, err error) string {
	if err != nil || strings.TrimSpace(status) == "" {
		return "pending review"
	}
	switch strings.TrimSpace(status) {
	case "pending_review", "accruing":
		return "pending review"
	case "approved":
		return "approved"
	case "disbursed":
		return "disbursed"
	case "rejected", "held":
		return "rejected"
	default:
		return strings.ReplaceAll(strings.TrimSpace(status), "_", " ")
	}
}

func exhibitorPaymentRecords(payments []domain.Payment) []domain.ExhibitorPaymentRecord {
	records := make([]domain.ExhibitorPaymentRecord, 0, len(payments))
	for _, payment := range payments {
		records = append(records, domain.ExhibitorPaymentRecord{
			ID: payment.ID, Reference: paymentReference(payment), ExpoName: payment.ExpoName, Currency: payment.CurrencyCode,
			Amount: majorFromMinor(payment.AmountMinor), Description: "Tandaza exhibitor activation", Status: string(payment.Status),
			ProcessingFee: majorFromMinor(payment.ProcessingFeeMinor), PaidAt: paymentTime(payment), PaymentMethod: payment.Provider,
		})
	}
	return records
}

func paymentReceipt(payment domain.Payment, expo domain.Expo) domain.PaymentReceipt {
	split, _ := platform.CalculateCommission(paymentCommissionBaseMinor(payment), expo.OrganizerCommissionBps, payment.CurrencyCode)
	commissionBase := paymentCommissionBaseMinor(payment)
	adsAddonPaid := expo.AdsAddonFeeMinor > 0 && commissionBase >= expo.ExhibitorActivationFeeMinor+expo.AdsAddonFeeMinor
	return domain.PaymentReceipt{
		ID: payment.ID, Reference: paymentReference(payment), Type: "payment", EntityID: payment.ID,
		ExpoName: payment.ExpoName, PayerName: payment.PayerName, PayerEmail: payment.PayerEmail, PayeeName: "Tandaza",
		Description: "One-off exhibitor activation for " + expo.Name, Amount: majorFromMinor(payment.AmountMinor), Currency: payment.CurrencyCode,
		Tax: 0, Total: majorFromMinor(payment.AmountMinor), AdsAddonPaid: adsAddonPaid, AdsAddonFee: majorFromMinor(expo.AdsAddonFeeMinor), ProcessingFee: majorFromMinor(payment.ProcessingFeeMinor), PlatformFee: majorFromMinor(split.PlatformMinor), PaymentMethod: payment.Provider, Status: string(payment.Status),
		PaidAt: paymentTime(payment), IssuedAt: payment.CreatedAt.Format(time.RFC3339),
		OrganizerShare: majorFromMinor(split.CommissionMinor), PlatformShare: majorFromMinor(split.PlatformMinor), CommissionRate: split.RateBps / 100,
	}
}

func paymentCommissionBaseMinor(payment domain.Payment) int64 {
	base := payment.AmountMinor - payment.ProcessingFeeMinor
	if base < 0 {
		return 0
	}
	return base
}

func paymentReference(payment domain.Payment) string {
	if payment.ProviderRef != "" {
		return payment.ProviderRef
	}
	return strings.ToUpper(payment.ID)
}

func paymentTime(payment domain.Payment) string {
	if payment.PaidAt != nil {
		return payment.PaidAt.Format(time.RFC3339)
	}
	return ""
}

func moneyText(amount int64, currency string) string {
	return strings.TrimSpace(strings.ToUpper(currency) + " " + strconv.FormatInt(amount, 10))
}

func availableExpoRecords(expos []domain.Expo) []map[string]any {
	records := []map[string]any{}
	for _, expo := range expos {
		if expo.Status != domain.ExpoPublished && expo.Status != domain.ExpoLive {
			continue
		}
		records = append(records, map[string]any{
			"id": expo.ID, "name": expo.Name, "description": expo.Description,
			"coverImage": expoCoverImage(expo), "coverImageUrl": expoCoverImage(expo), "bannerImage": expoCoverImage(expo),
			"startDate": expo.StartDate.Format("2006-01-02"), "endDate": expo.EndDate.Format("2006-01-02"),
			"venue":        map[string]string{"name": expo.Venue, "address": expo.City + ", " + expo.CountryCode},
			"boothOptions": []map[string]any{{"size": "Digital Workspace", "price": majorFromMinor(expo.ExhibitorActivationFeeMinor), "available": 999}},
			"pricing":      map[string]any{"baseFee": majorFromMinor(expo.ExhibitorActivationFeeMinor), "adsAddonFee": majorFromMinor(expo.AdsAddonFeeMinor)},
			"status":       "open", "registrationDeadline": expo.StartDate.AddDate(0, 0, -1).Format("2006-01-02"), "visitorCount": 0,
		})
	}
	return records
}

func expoCoverImage(expo domain.Expo) string {
	if value := strings.TrimSpace(expo.CoverImageURL); value != "" {
		return value
	}
	return "/expos/" + expo.ID + ".jpg"
}

func availableExpoRecordsForExhibitor(expos []domain.Expo, assignments []domain.ExpoExhibitor, paystackSettings domain.PaystackSettings) []map[string]any {
	assignedByExpo := map[string]domain.ExpoExhibitor{}
	for _, assignment := range assignments {
		assignedByExpo[assignment.ExpoID] = assignment
	}
	records := []map[string]any{}
	for _, expo := range expos {
		if expo.Status != domain.ExpoPublished && expo.Status != domain.ExpoLive {
			continue
		}
		if assignment, ok := assignedByExpo[expo.ID]; ok && (assignment.ActivationStatus == "active" || assignment.ActivationStatus == "disabled") {
			continue
		}
		baseFee := expo.ExhibitorActivationFeeMinor
		adsAddonFee := expo.AdsAddonFeeMinor
		processingFee := checkoutProcessingFeeMajor(baseFee, paystackSettings)
		record := map[string]any{
			"id": expo.ID, "name": expo.Name, "description": expo.Description,
			"coverImage": expoCoverImage(expo), "coverImageUrl": expoCoverImage(expo), "bannerImage": expoCoverImage(expo),
			"startDate": expo.StartDate.Format("2006-01-02"), "endDate": expo.EndDate.Format("2006-01-02"),
			"venue":        map[string]string{"name": expo.Venue, "address": expo.City + ", " + expo.CountryCode},
			"boothOptions": []map[string]any{{"size": "Digital Workspace", "price": majorFromMinor(expo.ExhibitorActivationFeeMinor), "available": 999}},
			"pricing":      map[string]any{"baseFee": majorFromMinor(baseFee), "adsAddonFee": majorFromMinor(adsAddonFee), "processingFee": processingFee, "processingFeeBps": paystackSettings.ProcessingFeeBps},
			"status":       "open", "registrationDeadline": expo.StartDate.AddDate(0, 0, -1).Format("2006-01-02"), "visitorCount": 0,
			"currency":    expo.CurrencyCode,
			"countryCode": expo.CountryCode,
		}
		if assignment, ok := assignedByExpo[expo.ID]; ok {
			status := "open"
			switch assignment.ActivationStatus {
			case "active":
				status = "active"
			case "pending_activation", "pending_payment":
				status = "pending_activation"
			case "disabled":
				status = "closed"
			}
			record["assignmentId"] = assignment.ID
			record["status"] = status
			record["activationStatus"] = assignment.ActivationStatus
			record["boothNumber"] = assignment.BoothNumber
			record["boothLabel"] = assignment.BoothLabel
			record["boothOptions"] = []map[string]any{{"size": nonEmpty(assignment.BoothSize, "Digital Workspace"), "price": majorFromMinor(baseFee), "available": 1}}
			record["pricing"] = map[string]any{"baseFee": majorFromMinor(baseFee), "adsAddonFee": majorFromMinor(adsAddonFee), "processingFee": checkoutProcessingFeeMajor(baseFee, paystackSettings), "processingFeeBps": paystackSettings.ProcessingFeeBps}
			record["venue"] = map[string]string{"name": nonEmpty(assignment.Location, expo.Venue), "address": nonEmpty(assignment.Location, expo.City+", "+expo.CountryCode)}
			record["currency"] = nonEmpty(assignment.CurrencyCode, expo.CurrencyCode)
		}
		records = append(records, record)
	}
	return records
}

func checkoutProcessingFeeMajor(amountMinor int64, settings domain.PaystackSettings) int64 {
	if amountMinor <= 0 || settings.ProcessingFeeBps <= 0 || settings.ProcessingFeeBps >= 10000 {
		return 0
	}
	denominator := int64(10000 - settings.ProcessingFeeBps)
	gross := (amountMinor*10000 + denominator - 1) / denominator
	if gross <= amountMinor {
		return 0
	}
	return majorFromMinor(gross - amountMinor)
}

func assignedExpoRecords(assignments []domain.ExpoExhibitor) []map[string]any {
	records := []map[string]any{}
	for _, item := range assignments {
		if item.ActivationStatus == "active" || item.ActivationStatus == "disabled" {
			continue
		}
		status := "open"
		if item.ActivationStatus == "pending_activation" || item.ActivationStatus == "pending_payment" {
			status = "pending_activation"
		}
		records = append(records, map[string]any{
			"id": item.ExpoID, "assignmentId": item.ID, "name": item.ExpoName, "description": item.ExpoDescription,
			"coverImage": "/expos/" + item.ExpoID + ".jpg", "bannerImage": "/expos/" + item.ExpoID + "-banner.jpg",
			"startDate": item.StartDate.Format("2006-01-02"), "endDate": item.EndDate.Format("2006-01-02"),
			"venue":        map[string]string{"name": item.Location, "address": item.Location},
			"boothOptions": []map[string]any{{"size": nonEmpty(item.BoothSize, "Digital Workspace"), "price": majorFromMinor(item.AmountMinor), "available": 1}},
			"pricing":      map[string]any{"baseFee": majorFromMinor(item.AmountMinor)}, "status": status,
			"registrationDeadline": item.StartDate.AddDate(0, 0, -1).Format("2006-01-02"), "visitorCount": 0,
			"boothNumber": item.BoothNumber, "boothLabel": item.BoothLabel, "activationStatus": item.ActivationStatus,
			"currency": item.CurrencyCode,
		})
	}
	return records
}

func myExpoRegistrations(items []domain.ExpoExhibitor, exposByID map[string]domain.Expo, payments []domain.Payment) []map[string]any {
	records := []map[string]any{}
	paidActivationByExpo := map[string]int64{}
	for _, payment := range payments {
		if payment.Purpose != domain.PaymentExhibitorActivation || payment.Status != domain.PaymentPaid {
			continue
		}
		netAmount := payment.AmountMinor - payment.ProcessingFeeMinor
		if netAmount < 0 {
			netAmount = payment.AmountMinor
		}
		if netAmount > paidActivationByExpo[payment.ExpoID] {
			paidActivationByExpo[payment.ExpoID] = netAmount
		}
	}
	for _, item := range items {
		if item.ActivationStatus != "active" {
			continue
		}
		paidAt := ""
		if item.ActivatedAt != nil {
			paidAt = item.ActivatedAt.Format(time.RFC3339)
		}
		status := "invited"
		if item.ActivationStatus == "active" {
			status = "confirmed"
		} else if item.ActivationStatus == "pending_activation" || item.ActivationStatus == "pending_payment" {
			status = "pending"
		} else if item.ActivationStatus == "disabled" {
			status = "cancelled"
		}
		coverImage := "/expos/" + item.ExpoID + ".jpg"
		adsAddonEnabled := false
		adsAddonFee := int64(0)
		timezone := "UTC"
		if expo, ok := exposByID[item.ExpoID]; ok {
			coverImage = expoCoverImage(expo)
			adsAddonFee = expo.AdsAddonFeeMinor
			paidAmount := paidActivationByExpo[item.ExpoID]
			if paidAmount == 0 {
				paidAmount = item.AmountMinor
			}
			adsAddonEnabled = expo.AdsAddonFeeMinor > 0 && paidAmount >= expo.ExhibitorActivationFeeMinor+expo.AdsAddonFeeMinor
			timezone = nonEmpty(expo.Timezone, "UTC")
		}
		records = append(records, map[string]any{
			"id": item.ID, "expoId": item.ExpoID, "expoName": item.ExpoName, "expoDescription": item.ExpoDescription,
			"coverImage": coverImage, "location": item.Location, "timezone": timezone,
			"startDate": item.StartDate.Format("2006-01-02"), "endDate": item.EndDate.Format("2006-01-02"),
			"boothNumber": item.BoothNumber, "boothSize": item.BoothSize, "amount": majorFromMinor(item.AmountMinor), "currency": item.CurrencyCode,
			"adsAddonEnabled": adsAddonEnabled, "adsAddonFee": majorFromMinor(adsAddonFee),
			"status": status, "paidAt": paidAt,
		})
	}
	return records
}

func visitorExpoRecords(expos []domain.Expo) []domain.VisitorExpoRecord {
	records := []domain.VisitorExpoRecord{}
	for _, expo := range expos {
		if expo.Status != domain.ExpoPublished && expo.Status != domain.ExpoLive {
			continue
		}
		records = append(records, visitorExpoRecord(expo))
	}
	return records
}

func (s *Server) visitorBoothsForExpo(ctx context.Context, expoID string) ([]domain.VisitorBoothRecord, error) {
	assignments, err := s.store.ListExpoExhibitors(ctx, store.ExpoExhibitorFilter{ExpoID: expoID})
	if err != nil {
		return nil, err
	}
	products, err := s.store.ListProducts(ctx, store.ProductFilter{ExpoID: expoID})
	if err != nil {
		return nil, err
	}
	productsByExhibitor := map[string][]domain.ProductRecord{}
	for _, product := range products {
		if product.Status != "available" {
			continue
		}
		productsByExhibitor[product.ExhibitorID] = append(productsByExhibitor[product.ExhibitorID], product)
	}
	booths := []domain.VisitorBoothRecord{}
	for _, assignment := range assignments {
		if !isActiveBooth(assignment) {
			continue
		}
		profile, _ := s.store.ExhibitorProfile(ctx, assignment.ExhibitorID)
		companyDocuments, _ := s.store.ListExhibitorDocuments(ctx, assignment.ExhibitorID)
		expoDocuments, _ := s.store.ListExpoDocuments(ctx, assignment.ExpoID, assignment.ExhibitorID)
		logo := strings.TrimSpace(profile.LogoURL)
		if logo == "" {
			logo = strings.TrimSpace(profile.Logo)
		}
		booths = append(booths, domain.VisitorBoothRecord{
			ID: assignment.ID, ExpoID: assignment.ExpoID, ExhibitorID: assignment.ExhibitorID,
			ExhibitorName: nonEmpty(profile.CompanyName, assignment.ExhibitorName), ExhibitorLogo: logo,
			Description: profile.Description, Email: profile.Email, Phone: profile.Phone, Address: profile.Address,
			Categories: profile.Categories, BoothNumber: assignment.BoothNumber,
			BoothLabel: nonEmpty(assignment.BoothLabel, assignment.BoothSize), Products: productsByExhibitor[assignment.ExhibitorID],
			CompanyDocuments: companyDocuments, ExpoDocuments: expoDocuments,
		})
	}
	return booths, nil
}

func isActiveBooth(item domain.ExpoExhibitor) bool {
	return item.ActivationStatus == "active" || item.ActivationStatus == "confirmed"
}

func visitorExpoRecordWithBooths(expo domain.Expo, booths []domain.VisitorBoothRecord) domain.VisitorExpoRecord {
	record := visitorExpoRecord(expo)
	record.Booths = booths
	return record
}

func visitorExpoRecordWithBoothsAndAds(expo domain.Expo, booths []domain.VisitorBoothRecord, ads []domain.SponsorAdRecord) domain.VisitorExpoRecord {
	record := visitorExpoRecordWithBooths(expo, booths)
	activeAds := []domain.SponsorAdRecord{}
	for _, ad := range ads {
		status := strings.ToLower(strings.TrimSpace(ad.Status))
		paymentStatus := strings.ToLower(strings.TrimSpace(ad.PaymentStatus))
		if (status == "active" || status == "approved" || status == "published") && (paymentStatus == "" || paymentStatus == "paid") {
			activeAds = append(activeAds, ad)
		}
	}
	record.Ads = activeAds
	return record
}

func visitorExpoRecord(expo domain.Expo) domain.VisitorExpoRecord {
	category := "Trade"
	if len(expo.Categories) > 0 {
		category = expo.Categories[0].Name
	}
	return domain.VisitorExpoRecord{
		ID: expo.ID, Name: expo.Name, Description: expo.Description, StartDate: expo.StartDate.Format("2006-01-02"),
		EndDate: expo.EndDate.Format("2006-01-02"), Venue: expo.Venue, VenueAddress: expo.City + ", " + expo.CountryCode,
		BannerImage: expoCoverImage(expo), Category: category, OrganizerName: expo.OrganizerName,
		TicketPrice: 0, IsBookmarked: false,
	}
}

func adminReportsFrom(expos []domain.Expo, payments []domain.Payment, leads []domain.LeadRecord, notifications []domain.Notification) domain.AdministratorReportsResponse {
	paidVolume := paidPaymentVolume(payments)
	currency := currencyFromPayments(payments, currencyFromExpos(expos, "KES"))
	delivered := 0
	for _, notification := range notifications {
		if notification.Status == "sent" || notification.Status == "delivered" {
			delivered++
		}
	}
	published := 0
	for _, expo := range expos {
		if expo.Status == domain.ExpoPublished || expo.Status == domain.ExpoLive {
			published++
		}
	}
	return domain.AdministratorReportsResponse{
		Performance: []domain.ReportMetric{
			{Label: "Published/Live Expos", Value: strconv.Itoa(published), Delta: "ready for remote access"},
			{Label: "Paid Activation Volume", Value: strconv.FormatInt(paidVolume, 10), Delta: "confirmed value"},
			{Label: "Captured Leads", Value: strconv.Itoa(len(leads)), Delta: "remote + QR"},
			{Label: "Notifications Delivered", Value: strconv.Itoa(delivered), Delta: "email/SMS/push/in-app"},
		},
		RevenueSeries:    seriesFromPayments(payments),
		EngagementSeries: []domain.ReportSeriesItem{{Label: "Leads", Value: int64(len(leads))}, {Label: "Notifications", Value: int64(len(notifications))}, {Label: "Expos", Value: int64(len(expos))}},
		TopInsights:      adminInsightText(expos, payments, leads, notifications, currency),
	}
}

func roiEstimateRecord(assignment domain.ExpoExhibitor) map[string]any {
	currency := strings.TrimSpace(assignment.ROICurrencyCode)
	if currency == "" {
		currency = assignment.CurrencyCode
	}
	return map[string]any{
		"expoId":         assignment.ExpoID,
		"exhibitorId":    assignment.ExhibitorID,
		"estimatedSpend": majorFromMinor(assignment.EstimatedSpendMinor),
		"currency":       currency,
		"breakdown":      majorBreakdown(assignment.ROISpendBreakdown),
		"notes":          assignment.ROINotes,
	}
}

func normalizeROIEstimateInput(input domain.ROIEstimateInput) domain.ROIEstimateInput {
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.Notes = strings.TrimSpace(input.Notes)
	input.EstimatedSpend = majorInputToMinor(input.EstimatedSpend)
	if input.Breakdown == nil {
		input.Breakdown = map[string]int64{}
	}
	for key, value := range input.Breakdown {
		input.Breakdown[key] = majorInputToMinor(value)
	}
	return input
}

func majorInputToMinor(value int64) int64 {
	if value <= 0 {
		return 0
	}
	return value * 100
}

func normalizePaystackChannels(values []string) []string {
	allowed := map[string]bool{"card": true, "bank": true, "ussd": true, "qr": true, "mobile_money": true, "bank_transfer": true}
	channels := []string{}
	for _, value := range values {
		value = strings.ToLower(strings.TrimSpace(value))
		if value == "mobile money" {
			value = "mobile_money"
		}
		if value == "bank transfer" {
			value = "bank_transfer"
		}
		if !allowed[value] {
			continue
		}
		exists := false
		for _, existing := range channels {
			if existing == value {
				exists = true
				break
			}
		}
		if !exists {
			channels = append(channels, value)
		}
	}
	if len(channels) == 0 {
		return []string{"card"}
	}
	return channels
}

func normalizePaymentMethods(values []string) []string {
	methods := []string{}
	for _, value := range values {
		value = strings.ToLower(strings.TrimSpace(value))
		value = strings.ReplaceAll(value, " ", "_")
		value = strings.ReplaceAll(value, "-", "_")
		if value == "" {
			continue
		}
		exists := false
		for _, existing := range methods {
			if existing == value {
				exists = true
				break
			}
		}
		if !exists {
			methods = append(methods, value)
		}
	}
	if len(methods) == 0 {
		return []string{"card"}
	}
	return methods
}

func exhibitorROIAnalytics(assignments []domain.ExpoExhibitor, payments []domain.Payment, leads []domain.LeadRecord, preOrders []map[string]any, meetings []domain.MeetingRecord) map[string]any {
	var assignment domain.ExpoExhibitor
	if len(assignments) > 0 {
		assignment = assignments[0]
	}
	currency := firstNonEmptyString(assignment.ROICurrencyCode, assignment.CurrencyCode, currencyFromPayments(payments, "KES"))
	estimatedSpend := majorFromMinor(assignment.EstimatedSpendMinor)
	tandazaSpend := int64(0)
	for _, payment := range payments {
		if payment.Status == domain.PaymentPaid {
			tandazaSpend += majorFromMinor(payment.AmountMinor)
		}
	}
	totalInvestment := estimatedSpend + tandazaSpend
	preOrderValue := int64(0)
	preOrderQuantity := int64(0)
	for _, item := range preOrders {
		switch amount := item["amount"].(type) {
		case int:
			preOrderValue += int64(amount)
		case int64:
			preOrderValue += amount
		case float64:
			preOrderValue += int64(amount)
		}
		preOrderQuantity += anyInt64(item["quantity"])
	}
	hotLeads := 0
	warmLeads := 0
	coldLeads := 0
	wonLeads := 0
	lostLeads := 0
	contactedLeads := 0
	meetingBookedLeads := 0
	proposalSentLeads := 0
	pipelineByTemperature := map[string]int64{"hot": 0, "warm": 0, "cold": 0}
	pipelineByStatus := map[string]int64{"new": 0, "contacted": 0, "meeting_booked": 0, "proposal_sent": 0, "won": 0, "lost": 0}
	baseLeadValue := projectedLeadBaseValue(preOrderValue, len(preOrders), totalInvestment, len(leads))
	for _, lead := range leads {
		temperatureWeight := int64(12)
		switch lead.Temperature {
		case "hot":
			hotLeads++
			temperatureWeight = 35
		case "warm":
			warmLeads++
			temperatureWeight = 20
		case "cold":
			coldLeads++
			temperatureWeight = 8
		}
		statusWeight := int64(5)
		switch lead.Status {
		case "contacted":
			contactedLeads++
			statusWeight = 20
		case "meeting_booked":
			meetingBookedLeads++
			statusWeight = 45
		case "proposal_sent":
			proposalSentLeads++
			statusWeight = 65
		case "won":
			wonLeads++
			statusWeight = 100
		case "lost":
			lostLeads++
			statusWeight = 0
		}
		if lead.Source == "pre_order" && lead.Status != "lost" {
			statusWeight = largerInt64(statusWeight, 85)
		}
		if lead.LastActivity == "meeting" && lead.Status != "won" && lead.Status != "lost" {
			statusWeight = largerInt64(statusWeight, 45)
		}
		projectionWeight := largerInt64(temperatureWeight, statusWeight)
		if lead.NextFollowUpAt != "" && lead.Status != "won" && lead.Status != "lost" {
			projectionWeight += 5
		}
		if projectionWeight > 100 {
			projectionWeight = 100
		}
		leadPipeline := (baseLeadValue * projectionWeight) / 100
		if _, ok := pipelineByTemperature[lead.Temperature]; ok {
			pipelineByTemperature[lead.Temperature] += leadPipeline
		}
		if _, ok := pipelineByStatus[lead.Status]; ok {
			pipelineByStatus[lead.Status] += leadPipeline
		}
	}
	projectedPipelineValue := sumInt64Map(pipelineByTemperature)
	realizedReturn := preOrderValue
	projectedReturn := realizedReturn + projectedPipelineValue
	realizedNetReturn := realizedReturn - totalInvestment
	projectedNetReturn := projectedReturn - totalInvestment
	realizedROI := int64(0)
	if totalInvestment > 0 {
		realizedROI = (realizedNetReturn * 100) / totalInvestment
	}
	projectedROI := int64(0)
	if totalInvestment > 0 {
		projectedROI = (projectedNetReturn * 100) / totalInvestment
	}
	realizedRecoveredPercent := int64(0)
	if totalInvestment > 0 {
		realizedRecoveredPercent = (realizedReturn * 100) / totalInvestment
	}
	projectedRecoveredPercent := int64(0)
	if totalInvestment > 0 {
		projectedRecoveredPercent = (projectedReturn * 100) / totalInvestment
	}
	realizedRevenueMultiple := float64(0)
	if totalInvestment > 0 {
		realizedRevenueMultiple = roundFloat(float64(realizedReturn)/float64(totalInvestment), 2)
	}
	projectedRevenueMultiple := float64(0)
	if totalInvestment > 0 {
		projectedRevenueMultiple = roundFloat(float64(projectedReturn)/float64(totalInvestment), 2)
	}
	costPerLead := int64(0)
	if len(leads) > 0 {
		costPerLead = totalInvestment / int64(len(leads))
	}
	costPerMeeting := int64(0)
	if len(meetings) > 0 {
		costPerMeeting = totalInvestment / int64(len(meetings))
	}
	costPerPreOrder := int64(0)
	if len(preOrders) > 0 {
		costPerPreOrder = totalInvestment / int64(len(preOrders))
	}
	averagePreOrderValue := int64(0)
	if len(preOrders) > 0 {
		averagePreOrderValue = preOrderValue / int64(len(preOrders))
	}
	averageLeadValue := int64(0)
	if len(leads) > 0 {
		averageLeadValue = projectedReturn / int64(len(leads))
	}
	breakEvenLeadsNeeded := int64(0)
	if averageLeadValue > 0 && totalInvestment > projectedReturn {
		breakEvenLeadsNeeded = ceilDiv(totalInvestment-projectedReturn, averageLeadValue)
	}
	breakEvenPreOrdersNeeded := int64(0)
	if averagePreOrderValue > 0 && totalInvestment > preOrderValue {
		breakEvenPreOrdersNeeded = ceilDiv(totalInvestment-preOrderValue, averagePreOrderValue)
	}
	projectedStatus := "No ROI estimate yet"
	if totalInvestment > 0 && projectedROI >= 50 {
		projectedStatus = "Strong projected ROI"
	} else if totalInvestment > 0 && projectedROI >= 0 {
		projectedStatus = "Positive projected ROI"
	} else if totalInvestment > 0 {
		projectedStatus = "Projected ROI at risk"
	}
	return map[string]any{
		"currency":                  currency,
		"baseLeadValue":             baseLeadValue,
		"calculationMethod":         "projected pipeline uses expo investment, tracked pre-order value, lead temperature, follow-up stage, meetings, and pre-order intent for this exhibitor workspace",
		"estimatedSpend":            estimatedSpend,
		"tandazaSpend":              tandazaSpend,
		"totalInvestment":           totalInvestment,
		"preOrderValue":             preOrderValue,
		"preOrderQuantity":          preOrderQuantity,
		"realizedReturn":            realizedReturn,
		"projectedPipelineValue":    projectedPipelineValue,
		"projectedReturn":           projectedReturn,
		"realizedNetReturn":         realizedNetReturn,
		"projectedNetReturn":        projectedNetReturn,
		"realizedROI":               realizedROI,
		"projectedROI":              projectedROI,
		"realizedRecoveredPercent":  realizedRecoveredPercent,
		"projectedRecoveredPercent": projectedRecoveredPercent,
		"realizedRevenueMultiple":   realizedRevenueMultiple,
		"projectedRevenueMultiple":  projectedRevenueMultiple,
		"costPerLead":               costPerLead,
		"costPerMeeting":            costPerMeeting,
		"costPerPreOrder":           costPerPreOrder,
		"averagePreOrderValue":      averagePreOrderValue,
		"averageLeadValue":          averageLeadValue,
		"breakEvenLeadsNeeded":      breakEvenLeadsNeeded,
		"breakEvenPreOrdersNeeded":  breakEvenPreOrdersNeeded,
		"hotLeads":                  hotLeads,
		"warmLeads":                 warmLeads,
		"coldLeads":                 coldLeads,
		"wonLeads":                  wonLeads,
		"lostLeads":                 lostLeads,
		"contactedLeads":            contactedLeads,
		"meetingBookedLeads":        meetingBookedLeads,
		"proposalSentLeads":         proposalSentLeads,
		"pipelineByTemperature":     pipelineByTemperature,
		"pipelineByStatus":          pipelineByStatus,
		"projectedStatus":           projectedStatus,
		"breakdown":                 majorBreakdown(assignment.ROISpendBreakdown),
		"notes":                     assignment.ROINotes,
		"recommendations":           roiRecommendations(totalInvestment, len(leads), hotLeads, len(meetings), preOrderValue, projectedNetReturn, breakEvenLeadsNeeded, breakEvenPreOrdersNeeded),
	}
}

func projectedLeadBaseValue(preOrderValue int64, preOrders int, totalInvestment int64, leads int) int64 {
	if preOrders > 0 && preOrderValue > 0 {
		base := preOrderValue / int64(preOrders)
		if leads > 0 && totalInvestment > 0 {
			investmentPerLead := totalInvestment / int64(leads)
			if investmentPerLead > 0 {
				return (base + investmentPerLead) / 2
			}
		}
		return base
	}
	if leads > 0 && totalInvestment > 0 {
		investmentPerLead := totalInvestment / int64(leads)
		if investmentPerLead > 0 {
			return investmentPerLead
		}
	}
	if totalInvestment > 0 {
		estimated := totalInvestment / 5
		if estimated > 1000 {
			return estimated
		}
		return 1000
	}
	return 5000
}

func sumInt64Map(values map[string]int64) int64 {
	total := int64(0)
	for _, value := range values {
		total += value
	}
	return total
}

func ceilDiv(value int64, divisor int64) int64 {
	if value <= 0 || divisor <= 0 {
		return 0
	}
	return (value + divisor - 1) / divisor
}

func largerInt64(a int64, b int64) int64 {
	if a > b {
		return a
	}
	return b
}

func roundFloat(value float64, places int) float64 {
	factor := math.Pow(10, float64(places))
	return math.Round(value*factor) / factor
}

func majorBreakdown(values map[string]int64) map[string]int64 {
	result := map[string]int64{}
	for key, value := range values {
		result[key] = majorFromMinor(value)
	}
	return result
}

func roiRecommendations(totalInvestment int64, leads int, hotLeads int, meetings int, preOrderValue int64, netReturn int64, breakEvenLeads int64, breakEvenPreOrders int64) []string {
	items := []string{}
	if totalInvestment == 0 {
		items = append(items, "Add your estimated expo spend to unlock cost-per-lead and ROI tracking.")
	}
	if totalInvestment > 0 && netReturn < 0 {
		items = append(items, "ROI is still below investment. Focus the next follow-up wave on hot leads, meeting requests, and pre-order conversion.")
	}
	if breakEvenLeads > 0 {
		items = append(items, fmt.Sprintf("Based on current lead value, about %d more qualified lead(s) are needed to close the ROI gap.", breakEvenLeads))
	}
	if breakEvenPreOrders > 0 {
		items = append(items, fmt.Sprintf("Based on current average pre-order value, about %d more pre-order(s) would recover the investment gap.", breakEvenPreOrders))
	}
	if hotLeads > 0 {
		items = append(items, "Prioritize hot leads while the expo context is still fresh.")
	}
	if meetings == 0 && leads > 0 {
		items = append(items, "Convert qualified leads into scheduled meetings to improve measurable return.")
	}
	if preOrderValue == 0 && leads > 0 {
		items = append(items, "Showcase products with clear pricing to increase pre-order intent.")
	}
	if len(items) == 0 {
		items = append(items, "Keep tracking visitor actions so post-expo performance becomes easier to measure.")
	}
	return items
}

func organizerReportsFrom(expos []domain.Expo, payments []domain.Payment, leads []domain.LeadRecord, exhibitors []domain.ExpoExhibitor) domain.OrganizerReportsResponse {
	paidVolume := paidPaymentVolume(payments)
	currency := currencyFromPayments(payments, currencyFromExpos(expos, "KES"))
	activeExhibitors := 0
	uniqueExhibitors := map[string]bool{}
	for _, exhibitor := range exhibitors {
		if exhibitor.ExhibitorID != "" {
			uniqueExhibitors[exhibitor.ExhibitorID] = true
		}
		if exhibitor.ActivationStatus == "active" {
			activeExhibitors++
		}
	}
	commissionAmount := organizerCommissionMajor(expos, payments)
	settlementPending := commissionAmount
	leadConversion := 0
	if len(leads) > 0 {
		converted := 0
		for _, lead := range leads {
			switch strings.ToLower(strings.TrimSpace(lead.Status)) {
			case "meeting_booked", "proposal_sent", "won":
				converted++
			}
		}
		leadConversion = int(math.Round((float64(converted) / float64(len(leads))) * 100))
	}
	return domain.OrganizerReportsResponse{
		ExpoPerformance: []domain.ReportMetric{
			{Label: "Owned Expos", Value: strconv.Itoa(len(expos)), Delta: "all lifecycle states"},
			{Label: "Activation Revenue", Value: strconv.FormatInt(paidVolume, 10), Delta: "confirmed value"},
			{Label: "Organizer Commission", Value: strconv.FormatInt(commissionAmount, 10), Delta: "settlement earnings"},
			{Label: "Assigned Exhibitors", Value: strconv.Itoa(len(uniqueExhibitors)), Delta: strconv.Itoa(activeExhibitors) + " active workspaces"},
			{Label: "Leads Captured", Value: strconv.Itoa(len(leads)), Delta: "visitor interest"},
			{Label: "Lead Conversion", Value: strconv.Itoa(leadConversion) + "%", Delta: "meeting/proposal/won leads"},
			{Label: "Paid Exhibitors", Value: strconv.Itoa(paidPaymentCount(payments)), Delta: "activated workspaces"},
		},
		RevenueSeries:       seriesFromPayments(payments),
		EngagementSeries:    engagementSeriesFromLeads(leads),
		VisitorDemographics: reportSeriesFromLeadEmails(leads),
		ExhibitorSeries:     exhibitorStatusSeries(exhibitors),
		LeadStatusSeries:    leadFieldSeries(leads, "status"),
		LeadTemperature:     leadFieldSeries(leads, "temperature"),
		PaymentStatusSeries: paymentStatusSeries(payments),
		SettlementSeries: []domain.ReportSeriesItem{
			{Label: "Gross Revenue", Value: paidVolume},
			{Label: "Organizer Commission", Value: commissionAmount},
			{Label: "Platform Retained", Value: largerInt64(0, paidVolume-commissionAmount)},
			{Label: "Pending Settlement", Value: settlementPending},
		},
		ExpoLifecycleSeries: expoLifecycleSeries(expos),
		ExpoDailySeries:     expoDailyPerformanceSeries(expos, payments, leads),
		ExpoRankings:        expoRankingReports(expos, payments, leads, exhibitors),
		TopInsights:         organizerInsightText(expos, payments, leads, currency),
	}
}

func adminInsightText(expos []domain.Expo, payments []domain.Payment, leads []domain.LeadRecord, notifications []domain.Notification, currency string) []string {
	return []string{
		strconv.Itoa(len(expos)) + " expos are tracked across all lifecycle states.",
		strconv.Itoa(paidPaymentCount(payments)) + " payments are confirmed with " + formatMoneyMajor(paidPaymentVolume(payments), currency) + " collected.",
		strconv.Itoa(len(leads)) + " leads and " + strconv.Itoa(len(notifications)) + " notifications are available for post-expo follow-up.",
	}
}

func organizerInsightText(expos []domain.Expo, payments []domain.Payment, leads []domain.LeadRecord, currency string) []string {
	return []string{
		strconv.Itoa(len(expos)) + " owned expos are available for organizer reporting.",
		strconv.Itoa(len(leads)) + " leads are tied to activated exhibitor workspaces.",
		strconv.Itoa(paidPaymentCount(payments)) + " confirmed exhibitor activation payments contributed " + formatMoneyMajor(paidPaymentVolume(payments), currency) + ".",
	}
}

func organizerCommissionMajor(expos []domain.Expo, payments []domain.Payment) int64 {
	expoMap := map[string]domain.Expo{}
	for _, expo := range expos {
		expoMap[expo.ID] = expo
	}
	totalMinor := int64(0)
	for _, payment := range payments {
		if payment.Status != domain.PaymentPaid {
			continue
		}
		expo, ok := expoMap[payment.ExpoID]
		if !ok {
			continue
		}
		split, err := platform.CalculateCommission(paymentCommissionBaseMinor(payment), expo.OrganizerCommissionBps, payment.CurrencyCode)
		if err != nil {
			continue
		}
		totalMinor += split.CommissionMinor
	}
	return majorFromMinor(totalMinor)
}

func exhibitorStatusSeries(exhibitors []domain.ExpoExhibitor) []domain.ReportSeriesItem {
	grouped := map[string]int64{}
	for _, exhibitor := range exhibitors {
		status := strings.TrimSpace(exhibitor.ActivationStatus)
		if status == "" {
			status = "unknown"
		}
		grouped[strings.ReplaceAll(status, "_", " ")]++
	}
	return sortedReportSeries(grouped)
}

func leadFieldSeries(leads []domain.LeadRecord, field string) []domain.ReportSeriesItem {
	grouped := map[string]int64{}
	for _, lead := range leads {
		value := ""
		if field == "temperature" {
			value = lead.Temperature
		} else {
			value = lead.Status
		}
		value = strings.TrimSpace(value)
		if value == "" {
			value = "unknown"
		}
		grouped[strings.ReplaceAll(value, "_", " ")]++
	}
	return sortedReportSeries(grouped)
}

func paymentStatusSeries(payments []domain.Payment) []domain.ReportSeriesItem {
	grouped := map[string]int64{}
	for _, payment := range payments {
		status := strings.TrimSpace(string(payment.Status))
		if status == "" {
			status = "unknown"
		}
		grouped[status]++
	}
	return sortedReportSeries(grouped)
}

func expoLifecycleSeries(expos []domain.Expo) []domain.ReportSeriesItem {
	grouped := map[string]int64{}
	for _, expo := range expos {
		status := strings.TrimSpace(string(expo.Status))
		if status == "" {
			status = "unknown"
		}
		grouped[strings.ReplaceAll(status, "_", " ")]++
	}
	return sortedReportSeries(grouped)
}

func engagementSeriesFromLeads(leads []domain.LeadRecord) []domain.ReportSeriesItem {
	grouped := map[string]int64{}
	for _, lead := range leads {
		when, err := time.Parse(time.RFC3339, lead.CapturedAt)
		if err != nil {
			continue
		}
		grouped[when.Format("02 Jan")]++
	}
	return chronologicalReportSeries(grouped, "02 Jan")
}

func expoDailyPerformanceSeries(expos []domain.Expo, payments []domain.Payment, leads []domain.LeadRecord) []domain.ReportSeriesItem {
	expoIDs := map[string]bool{}
	for _, expo := range expos {
		expoIDs[expo.ID] = true
	}
	grouped := map[string]int64{}
	for _, lead := range leads {
		if !expoIDs[lead.ExpoID] {
			continue
		}
		when, err := time.Parse(time.RFC3339, lead.CapturedAt)
		if err != nil {
			continue
		}
		grouped[when.Format("02 Jan")] += 1
	}
	for _, payment := range payments {
		if payment.Status != domain.PaymentPaid || !expoIDs[payment.ExpoID] {
			continue
		}
		when := payment.CreatedAt
		if payment.PaidAt != nil {
			when = *payment.PaidAt
		}
		grouped[when.Format("02 Jan")] += 3
	}
	return chronologicalReportSeries(grouped, "02 Jan")
}

func expoRankingReports(expos []domain.Expo, payments []domain.Payment, leads []domain.LeadRecord, exhibitors []domain.ExpoExhibitor) []domain.ExpoRankingReport {
	type aggregate struct {
		expo       domain.Expo
		revenue    int64
		commission int64
		leads      int64
		visitors   map[string]bool
		exhibitors map[string]bool
		active     int64
	}
	grouped := map[string]*aggregate{}
	for _, expo := range expos {
		grouped[expo.ID] = &aggregate{expo: expo, visitors: map[string]bool{}, exhibitors: map[string]bool{}}
	}
	for _, payment := range payments {
		group, ok := grouped[payment.ExpoID]
		if !ok || payment.Status != domain.PaymentPaid {
			continue
		}
		amount := majorFromMinor(payment.AmountMinor)
		group.revenue += amount
		split, err := platform.CalculateCommission(paymentCommissionBaseMinor(payment), group.expo.OrganizerCommissionBps, payment.CurrencyCode)
		if err == nil {
			group.commission += majorFromMinor(split.CommissionMinor)
		}
	}
	for _, lead := range leads {
		group, ok := grouped[lead.ExpoID]
		if !ok {
			continue
		}
		group.leads++
		visitorKey := strings.ToLower(strings.TrimSpace(lead.VisitorEmail))
		if visitorKey == "" {
			visitorKey = strings.ToLower(strings.TrimSpace(lead.VisitorName))
		}
		if visitorKey == "" {
			visitorKey = lead.ID
		}
		group.visitors[visitorKey] = true
	}
	for _, exhibitor := range exhibitors {
		group, ok := grouped[exhibitor.ExpoID]
		if !ok {
			continue
		}
		if exhibitor.ExhibitorID != "" {
			group.exhibitors[exhibitor.ExhibitorID] = true
		}
		if exhibitor.ActivationStatus == "active" {
			group.active++
		}
	}
	items := []domain.ExpoRankingReport{}
	for _, group := range grouped {
		interactions := group.leads
		score := group.revenue + group.commission + group.leads*10 + int64(len(group.visitors))*8 + group.active*12
		items = append(items, domain.ExpoRankingReport{
			ExpoID: group.expo.ID, ExpoName: group.expo.Name, Revenue: group.revenue, Commission: group.commission,
			Leads: group.leads, Visitors: int64(len(group.visitors)), Exhibitors: int64(len(group.exhibitors)),
			Active: group.active, Interactions: interactions, Score: score,
		})
	}
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].Score == items[j].Score {
			return items[i].ExpoName < items[j].ExpoName
		}
		return items[i].Score > items[j].Score
	})
	return items
}

func sortedReportSeries(grouped map[string]int64) []domain.ReportSeriesItem {
	items := make([]domain.ReportSeriesItem, 0, len(grouped))
	for label, value := range grouped {
		items = append(items, domain.ReportSeriesItem{Label: strings.Title(label), Value: value})
	}
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].Value == items[j].Value {
			return items[i].Label < items[j].Label
		}
		return items[i].Value > items[j].Value
	})
	return items
}

func chronologicalReportSeries(grouped map[string]int64, layout string) []domain.ReportSeriesItem {
	items := make([]domain.ReportSeriesItem, 0, len(grouped))
	for label, value := range grouped {
		items = append(items, domain.ReportSeriesItem{Label: label, Value: value})
	}
	sort.SliceStable(items, func(i, j int) bool {
		left, leftErr := time.Parse(layout, items[i].Label)
		right, rightErr := time.Parse(layout, items[j].Label)
		if leftErr != nil || rightErr != nil {
			return items[i].Label < items[j].Label
		}
		return left.Before(right)
	})
	return items
}

func paidPaymentVolume(payments []domain.Payment) int64 {
	var total int64
	for _, payment := range payments {
		if payment.Status == domain.PaymentPaid {
			total += majorFromMinor(payment.AmountMinor)
		}
	}
	return total
}

func paidPaymentCount(payments []domain.Payment) int {
	count := 0
	for _, payment := range payments {
		if payment.Status == domain.PaymentPaid {
			count++
		}
	}
	return count
}

func seriesFromPayments(payments []domain.Payment) []domain.ReportSeriesItem {
	grouped := map[string]int64{}
	for _, payment := range payments {
		if payment.Status != domain.PaymentPaid {
			continue
		}
		when := payment.CreatedAt
		if payment.PaidAt != nil {
			when = *payment.PaidAt
		}
		grouped[when.Format("Jan")] += majorFromMinor(payment.AmountMinor)
	}
	series := []domain.ReportSeriesItem{}
	for label, value := range grouped {
		series = append(series, domain.ReportSeriesItem{Label: label, Value: value})
	}
	if len(series) == 0 {
		return []domain.ReportSeriesItem{{Label: time.Now().UTC().Format("Jan"), Value: 0}}
	}
	return series
}

func reportSeriesFromLeadEmails(leads []domain.LeadRecord) []domain.ReportSeriesItem {
	grouped := map[string]int64{}
	for _, lead := range leads {
		label := "unknown"
		if at := strings.LastIndex(lead.VisitorEmail, "@"); at >= 0 && at < len(lead.VisitorEmail)-1 {
			label = lead.VisitorEmail[at+1:]
		}
		grouped[label]++
	}
	series := []domain.ReportSeriesItem{}
	for label, value := range grouped {
		series = append(series, domain.ReportSeriesItem{Label: label, Value: value})
	}
	if len(series) == 0 {
		return []domain.ReportSeriesItem{}
	}
	return series
}

func nonEmpty(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
