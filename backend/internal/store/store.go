package store

import (
	"context"
	"time"

	"tandaza/backend/internal/domain"
)

type Store interface {
	Login(ctx context.Context, email string, password string) (domain.User, string, error)
	Register(ctx context.Context, email string, password string, input domain.RegisterInput) (domain.User, string, error)
	AuthWithGoogle(ctx context.Context, input domain.GoogleAuthInput) (domain.User, string, error)
	CreateEmailVerification(ctx context.Context, userID string) (string, error)
	VerifyEmail(ctx context.Context, token string) (domain.User, string, error)
	ForgotPassword(ctx context.Context, email string) (domain.ForgotPasswordResult, error)
	ResetPassword(ctx context.Context, token string, newPassword string) error
	ChangePassword(ctx context.Context, userID string, currentPassword string, newPassword string) error
	UserByID(ctx context.Context, id string) (domain.User, error)
	Users(ctx context.Context) ([]domain.User, error)
	VisitorSettings(ctx context.Context, visitorID string) (domain.VisitorSettings, error)
	UpdateVisitorSettings(ctx context.Context, visitorID string, input domain.VisitorSettingsInput) (domain.VisitorSettings, error)
	BootstrapAdmin(ctx context.Context, input domain.AdminUserInput) (domain.User, bool, error)
	CreateAdminManagedUser(ctx context.Context, input domain.AdminUserInput, actor domain.User) (domain.User, error)
	UpdateAdminManagedUser(ctx context.Context, id string, input domain.AdminUserInput, actor domain.User) (domain.User, error)
	DeleteAdminManagedUser(ctx context.Context, id string, actor domain.User) error
	Countries(ctx context.Context) ([]domain.Country, error)
	CreateCountry(ctx context.Context, input domain.CountryInput, actor domain.User) (domain.Country, error)
	UpdateCountryStatus(ctx context.Context, code string, active bool, actor domain.User) (domain.Country, error)
	Currencies(ctx context.Context) ([]domain.Currency, error)
	Categories(ctx context.Context) ([]domain.Category, error)
	CreateCategory(ctx context.Context, input domain.CategoryInput, actor domain.User) (domain.Category, error)
	UpdateCategoryStatus(ctx context.Context, id string, active bool, actor domain.User) (domain.Category, error)
	ListExpos(ctx context.Context, filter ExpoFilter) ([]domain.Expo, error)
	ExpoByID(ctx context.Context, id string) (domain.Expo, error)
	CreateExpo(ctx context.Context, input domain.ExpoInput, actor domain.User) (domain.Expo, error)
	UpdateExpo(ctx context.Context, id string, input domain.ExpoInput, actor domain.User) (domain.Expo, error)
	ChangeExpoStatus(ctx context.Context, id string, status domain.ExpoStatus, actor domain.User) (domain.Expo, error)
	CompleteEndedExpos(ctx context.Context, now time.Time) ([]domain.Expo, error)
	ListPayments(ctx context.Context, filter PaymentFilter) ([]domain.Payment, error)
	PaymentByID(ctx context.Context, id string) (domain.Payment, error)
	CreatePayment(ctx context.Context, input domain.PaymentInput, actor domain.User) (domain.Payment, error)
	ConfirmPayment(ctx context.Context, id string, actor domain.User) (domain.Payment, domain.CommissionSplit, error)
	UpdatePaymentProviderReference(ctx context.Context, id string, providerReference string) (domain.Payment, error)
	UpdatePaymentStatus(ctx context.Context, id string, status domain.PaymentStatus, reason string, actor domain.User) (domain.Payment, error)
	ListExpoExhibitors(ctx context.Context, filter ExpoExhibitorFilter) ([]domain.ExpoExhibitor, error)
	AssignExpoExhibitor(ctx context.Context, input domain.ExpoExhibitorInput, actor domain.User) (domain.ExpoExhibitor, error)
	UpdateExhibitorROI(ctx context.Context, expoID string, exhibitorID string, input domain.ROIEstimateInput) (domain.ExpoExhibitor, error)
	EnsureExhibitorQRCode(ctx context.Context, expoID string, exhibitorID string) (domain.QRCodeRecord, error)
	ResolveQRCode(ctx context.Context, code string) (domain.QRCodeRecord, error)
	ListProducts(ctx context.Context, filter ProductFilter) ([]domain.ProductRecord, error)
	ProductByID(ctx context.Context, id string, exhibitorID string) (domain.ProductRecord, error)
	CreateProduct(ctx context.Context, input domain.ProductInput, actor domain.User) (domain.ProductRecord, error)
	UpdateProduct(ctx context.Context, id string, input domain.ProductInput, actor domain.User) (domain.ProductRecord, error)
	DeleteProduct(ctx context.Context, id string, actor domain.User) error
	ListLeads(ctx context.Context, filter LeadFilter) ([]domain.LeadRecord, error)
	CreateLead(ctx context.Context, expoExhibitorID string, input domain.LeadInput, actor domain.User) (domain.LeadRecord, error)
	UpdateLead(ctx context.Context, id string, input domain.LeadUpdateInput, actor domain.User) (domain.LeadRecord, error)
	RecordLeadActivity(ctx context.Context, id string, input domain.LeadActivityInput, actor domain.User) (domain.LeadActivityRecord, error)
	ListChatThreads(ctx context.Context, filter ChatThreadFilter, actor domain.User) ([]domain.ExhibitorConversationThread, error)
	CreateChatMessage(ctx context.Context, expoID string, exhibitorID string, input domain.ChatMessageInput, actor domain.User) (domain.ExhibitorConversationThread, domain.ChatMessageRecord, error)
	ExhibitorLiveStream(ctx context.Context, expoID string, exhibitorID string) (domain.ExhibitorLiveStreamRecord, error)
	UpdateExhibitorLiveStream(ctx context.Context, expoID string, exhibitorID string, input domain.ExhibitorLiveStreamInput, actor domain.User) (domain.ExhibitorLiveStreamRecord, error)
	ListExhibitorFeedback(ctx context.Context, filter ExhibitorFeedbackFilter) ([]domain.ExhibitorFeedbackRecord, error)
	CreateExhibitorFeedback(ctx context.Context, input domain.ExhibitorFeedbackInput, actor domain.User) (domain.ExhibitorFeedbackRecord, error)
	ListOrganizerFeedback(ctx context.Context, organizerID string) ([]domain.OrganizerFeedbackRecord, error)
	CreateOrganizerFeedback(ctx context.Context, expoID string, exhibitorID string, input domain.OrganizerFeedbackInput, actor domain.User) (domain.OrganizerFeedbackRecord, error)
	ListExhibitorCampaignDrafts(ctx context.Context, filter ExhibitorCampaignDraftFilter) ([]domain.ExhibitorCampaignDraftRecord, error)
	CreateExhibitorCampaignDraft(ctx context.Context, expoID string, exhibitorID string, input domain.ExhibitorCampaignDraftInput, actor domain.User) (domain.ExhibitorCampaignDraftRecord, error)
	ListMeetings(ctx context.Context, filter MeetingFilter) ([]domain.MeetingRecord, error)
	CreateMeeting(ctx context.Context, expoID string, exhibitorID string, input domain.MeetingInput, actor domain.User) (domain.MeetingRecord, error)
	DeleteMeeting(ctx context.Context, id string, expoID string, exhibitorID string) error
	CancelMeetingNotifications(ctx context.Context, meetingID string) (int, error)
	CancelLeadFollowUpNotifications(ctx context.Context, leadID string) (int, error)
	RecordVisitorActivity(ctx context.Context, actor domain.User, expoID string, expoExhibitorID string, activityType string, description string) error
	VisitorTimeline(ctx context.Context, visitorID string) ([]domain.VisitorTimelineDay, error)
	VisitorFavorites(ctx context.Context, visitorID string) ([]domain.VisitorFavoriteRecord, error)
	AddVisitorFavorite(ctx context.Context, visitorID string, input domain.VisitorFavoriteInput) (domain.VisitorFavoriteRecord, error)
	DeleteVisitorFavorite(ctx context.Context, visitorID string, id string) error
	CreateVisitorBooking(ctx context.Context, expoID string, ticketType string, actor domain.User) (domain.VisitorBookingRecord, error)
	VisitorBookings(ctx context.Context, visitorID string) ([]domain.VisitorBookingRecord, error)
	CreateNotification(ctx context.Context, input domain.NotificationInput, actor domain.User) (domain.Notification, error)
	ListNotifications(ctx context.Context, filter NotificationFilter) ([]domain.Notification, error)
	DueNotifications(ctx context.Context, now string) ([]domain.Notification, error)
	UpdateNotificationDelivery(ctx context.Context, id string, status string, sentAt string, failureReason string) error
	MarkNotificationRead(ctx context.Context, id string, userID string) error
	MarkNotificationsRead(ctx context.Context, userID string) (int, error)
	DismissNotification(ctx context.Context, id string, userID string) error
	RecordNotificationAttempt(ctx context.Context, attempt domain.NotificationAttempt) (domain.NotificationAttempt, error)
	ListNotificationAttempts(ctx context.Context, notificationID string) ([]domain.NotificationAttempt, error)
	MarkDueNotificationsSent(ctx context.Context) (int, error)
	SponsorPlans(ctx context.Context, countryCode string) ([]domain.SponsorPlanRecord, error)
	SponsorPlanByID(ctx context.Context, id string) (domain.SponsorPlanRecord, error)
	CreateSponsorPlan(ctx context.Context, input domain.SponsorPlanInput, actor domain.User) (domain.SponsorPlanRecord, error)
	UpdateSponsorPlan(ctx context.Context, id string, input domain.SponsorPlanInput, actor domain.User) (domain.SponsorPlanRecord, error)
	UpdateSponsorPlanStatus(ctx context.Context, id string, status string, actor domain.User) (domain.SponsorPlanRecord, error)
	ListSponsorCampaigns(ctx context.Context, sponsorID string) ([]domain.SponsorCampaignRecord, error)
	SponsorCampaignByID(ctx context.Context, id string, sponsorID string) (domain.SponsorCampaignRecord, error)
	CreateSponsorCampaign(ctx context.Context, input domain.SponsorCampaignInput, actor domain.User) (domain.SponsorCampaignRecord, error)
	ListSponsorAds(ctx context.Context, filter SponsorAdFilter) ([]domain.SponsorAdRecord, error)
	SponsorAdByID(ctx context.Context, id string, sponsorID string) (domain.SponsorAdRecord, error)
	CreateSponsorAd(ctx context.Context, input domain.SponsorAdInput, actor domain.User) (domain.SponsorAdRecord, error)
	UpdateSponsorAd(ctx context.Context, id string, input domain.SponsorAdInput, actor domain.User) (domain.SponsorAdRecord, error)
	UpdateSponsorAdStatus(ctx context.Context, id string, status string, actor domain.User) (domain.SponsorAdRecord, error)
	CreateSponsorAdPayment(ctx context.Context, adID string, actor domain.User) (domain.SponsorPaymentRecord, error)
	ConfirmSponsorAdPayment(ctx context.Context, paymentID string, actor domain.User) (domain.SponsorPaymentRecord, domain.SponsorAdRecord, error)
	TrackSponsorAdEvent(ctx context.Context, adID string, event string) (domain.SponsorAdRecord, error)
	SettlementStatus(ctx context.Context, id string) (string, error)
	UpdateSettlementStatus(ctx context.Context, id string, status string, actor domain.User) (string, error)
	ListSponsorPayments(ctx context.Context, sponsorID string) ([]domain.SponsorPaymentRecord, error)
	RecordAudit(ctx context.Context, log domain.AuditLog) (domain.AuditLog, error)
	AuditLogs(ctx context.Context) ([]domain.AuditLog, error)
	RecordAppLog(ctx context.Context, log domain.AppLog) (domain.AppLog, error)
	AppLogs(ctx context.Context) ([]domain.AppLog, error)
	OrganizerProfile(ctx context.Context, organizerID string) (domain.OrganizerProfile, error)
	UpdateOrganizerProfile(ctx context.Context, organizerID string, input domain.OrganizerProfileInput) (domain.OrganizerProfile, error)
	ListOrganizerTeam(ctx context.Context, organizerID string) ([]domain.OrganizerTeamMember, error)
	OrganizerTeamMemberByID(ctx context.Context, organizerID string, id string) (domain.OrganizerTeamMember, error)
	CreateOrganizerTeamMember(ctx context.Context, organizerID string, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error)
	CreateOrganizerTeamMemberAccount(ctx context.Context, organizer domain.User, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error)
	UpdateOrganizerTeamMember(ctx context.Context, organizerID string, id string, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error)
	DeleteOrganizerTeamMember(ctx context.Context, organizerID string, id string) error
	EffectiveOrganizerID(ctx context.Context, userID string) (string, error)
	ListOrganizerSponsors(ctx context.Context, organizerID string) ([]domain.OrganizerSponsor, error)
	OrganizerSponsorByID(ctx context.Context, organizerID string, id string) (domain.OrganizerSponsor, error)
	CreateOrganizerSponsor(ctx context.Context, organizerID string, input domain.OrganizerSponsorInput) (domain.OrganizerSponsor, error)
	UpdateOrganizerSponsor(ctx context.Context, organizerID string, id string, input domain.OrganizerSponsorInput) (domain.OrganizerSponsor, error)
	ExhibitorProfile(ctx context.Context, exhibitorID string) (domain.ExhibitorProfile, error)
	UpdateExhibitorProfile(ctx context.Context, exhibitorID string, input domain.ExhibitorProfileInput) (domain.ExhibitorProfile, error)
	ListExhibitorDocuments(ctx context.Context, exhibitorID string) ([]domain.CompanyDocumentRecord, error)
	CreateExhibitorDocument(ctx context.Context, exhibitorID string, input domain.CompanyDocumentInput) (domain.CompanyDocumentRecord, error)
	DeleteExhibitorDocument(ctx context.Context, exhibitorID string, id string) error
	ListExpoDocuments(ctx context.Context, expoID string, exhibitorID string) ([]domain.ExpoDocumentRecord, error)
	CreateExpoDocument(ctx context.Context, expoID string, exhibitorID string, input domain.CompanyDocumentInput) (domain.ExpoDocumentRecord, error)
	DeleteExpoDocument(ctx context.Context, expoID string, exhibitorID string, id string) error
	ListExhibitorTeam(ctx context.Context, exhibitorID string) ([]domain.OrganizerTeamMember, error)
	EffectiveExhibitorID(ctx context.Context, userID string) (string, error)
	CreateExhibitorTeamMember(ctx context.Context, exhibitorID string, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error)
	CreateExhibitorTeamMemberAccount(ctx context.Context, exhibitor domain.User, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error)
	UpdateExhibitorTeamMember(ctx context.Context, exhibitorID string, id string, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error)
	DeleteExhibitorTeamMember(ctx context.Context, exhibitorID string, id string) error
	EmailSettings(ctx context.Context) (domain.EmailSettings, error)
	UpdateEmailSettings(ctx context.Context, settings domain.EmailSettings) (domain.EmailSettings, error)
	SMSSettings(ctx context.Context) (domain.SMSSettings, error)
	UpdateSMSSettings(ctx context.Context, settings domain.SMSSettings) (domain.SMSSettings, error)
	PaystackSettings(ctx context.Context) (domain.PaystackSettings, error)
	UpdatePaystackSettings(ctx context.Context, settings domain.PaystackSettings) (domain.PaystackSettings, error)
	GoogleSettings(ctx context.Context) (domain.GoogleSettings, error)
	UpdateGoogleSettings(ctx context.Context, settings domain.GoogleSettings) (domain.GoogleSettings, error)
	MeetingSettings(ctx context.Context) (domain.MeetingSettings, error)
	UpdateMeetingSettings(ctx context.Context, settings domain.MeetingSettings) (domain.MeetingSettings, error)
	ExhibitorMeetingSettings(ctx context.Context, exhibitorID string) (domain.MeetingSettings, error)
	UpdateExhibitorMeetingSettings(ctx context.Context, exhibitorID string, settings domain.MeetingSettings) (domain.MeetingSettings, error)
	OpenAISettings(ctx context.Context) (domain.OpenAISettings, error)
	UpdateOpenAISettings(ctx context.Context, settings domain.OpenAISettings) (domain.OpenAISettings, error)
	LatestAIAnalyticsSummary(ctx context.Context, scope string, scopeID string, countryCode string) (domain.AIAnalyticsSummary, error)
	SaveAIAnalyticsSummary(ctx context.Context, summary domain.AIAnalyticsSummary) (domain.AIAnalyticsSummary, error)
	WhatsappSettings(ctx context.Context) (domain.WhatsappSettings, error)
	UpdateWhatsappSettings(ctx context.Context, settings domain.WhatsappSettings) (domain.WhatsappSettings, error)
}

type ExpoFilter struct {
	OrganizerID string
	CountryCode string
}

type PaymentFilter struct {
	ExpoID      string
	OrganizerID string
	PayerID     string
	CountryCode string
}

type ExpoExhibitorFilter struct {
	ExpoID      string
	ExhibitorID string
	OrganizerID string
	CountryCode string
}

type ProductFilter struct {
	ExpoID      string
	ExhibitorID string
}

type LeadFilter struct {
	ExpoID      string
	ExhibitorID string
	OrganizerID string
	CountryCode string
}

type ChatThreadFilter struct {
	ExpoID      string
	ExhibitorID string
	VisitorID   string
	ThreadID    string
}

type ExhibitorFeedbackFilter struct {
	ExpoID      string
	ExhibitorID string
	VisitorID   string
}

type ExhibitorCampaignDraftFilter struct {
	ExpoID      string
	ExhibitorID string
}

type MeetingFilter struct {
	ExpoID       string
	ExhibitorID  string
	VisitorID    string
	VisitorEmail string
}

func organizerFeedbackCategory(value string) string {
	switch value {
	case "venue", "logistics", "communication", "support", "payments", "overall":
		return value
	default:
		return "overall"
	}
}

type NotificationFilter struct {
	UserID string
	Role   domain.Role
	ExpoID string
}

type SponsorAdFilter struct {
	SponsorID   string
	Status      string
	CountryCode string
	ExpoID      string
}
