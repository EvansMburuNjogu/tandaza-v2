package store

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"tandaza/backend/internal/auth"
	"tandaza/backend/internal/domain"
	"tandaza/backend/internal/platform"
	"tandaza/backend/internal/security"
)

var ErrInvalidCredentials = errors.New("invalid credentials")
var ErrNotFound = errors.New("not found")

type DemoUser struct {
	User     domain.User
	Password string
}

type MemoryStore struct {
	tokenService             auth.TokenService
	mu                       sync.Mutex
	users                    []DemoUser
	countries                []domain.Country
	currencies               []domain.Currency
	categories               []domain.Category
	expos                    []domain.Expo
	payments                 []domain.Payment
	commissions              map[string]domain.CommissionSplit
	exhibitors               []domain.ExpoExhibitor
	products                 []domain.ProductRecord
	qrCodes                  []domain.QRCodeRecord
	leads                    []domain.LeadRecord
	leadActivities           []domain.LeadActivityRecord
	chatThreads              []domain.ExhibitorConversationThread
	chatMessages             []domain.ChatMessageRecord
	exhibitorLiveStreams     []domain.ExhibitorLiveStreamRecord
	exhibitorFeedback        []domain.ExhibitorFeedbackRecord
	organizerFeedback        []domain.OrganizerFeedbackRecord
	exhibitorCampaignDrafts  []domain.ExhibitorCampaignDraftRecord
	meetings                 []domain.MeetingRecord
	activities               []domain.VisitorActivityItem
	favorites                []memoryFavorite
	bookings                 []domain.VisitorBookingRecord
	visitorProfiles          map[string]domain.VisitorSettingsInput
	notifications            []domain.Notification
	notificationAttempts     []domain.NotificationAttempt
	sponsorPlans             []domain.SponsorPlanRecord
	sponsorCampaigns         []domain.SponsorCampaignRecord
	sponsorAds               []domain.SponsorAdRecord
	sponsorPayments          []domain.SponsorPaymentRecord
	settlementStatuses       map[string]string
	resetTokens              map[string]string
	emailVerifyTokens        map[string]string
	auditLogs                []domain.AuditLog
	appLogs                  []domain.AppLog
	organizerProfiles        map[string]domain.OrganizerProfile
	exhibitorProfiles        map[string]domain.ExhibitorProfile
	exhibitorDocuments       []domain.CompanyDocumentRecord
	expoDocuments            []domain.ExpoDocumentRecord
	organizerTeam            []domain.OrganizerTeamMember
	exhibitorTeam            []domain.OrganizerTeamMember
	organizerSponsors        []domain.OrganizerSponsor
	emailSettings            domain.EmailSettings
	smsSettings              domain.SMSSettings
	paystackSettings         domain.PaystackSettings
	googleSettings           domain.GoogleSettings
	meetingSettings          domain.MeetingSettings
	exhibitorMeetingSettings map[string]domain.MeetingSettings
	openAISettings           domain.OpenAISettings
	aiSummaries              []domain.AIAnalyticsSummary
	whatsappSettings         domain.WhatsappSettings
}

type memoryFavorite struct {
	VisitorID string
	Record    domain.VisitorFavoriteRecord
}

func NewMemoryStore(tokenService auth.TokenService) *MemoryStore {
	start := time.Date(2026, 6, 12, 9, 0, 0, 0, time.UTC)
	return &MemoryStore{
		tokenService: tokenService,
		users: []DemoUser{
			{User: domain.User{ID: "usr_visitor_001", Name: "Demo Visitor", Email: "visitor@tandaza.demo", Role: domain.RoleVisitor, AvatarURL: "/avatars/visitor.svg", CompanyName: "", CountryCode: "KE", Status: "active"}, Password: "demo:visitor123"},
			{User: domain.User{ID: "usr_exhibitor_001", Name: "Demo Exhibitor", Email: "exhibitor@tandaza.demo", Role: domain.RoleExhibitor, AvatarURL: "/avatars/exhibitor.svg", CompanyName: "TechCorp Africa", CountryCode: "KE", Status: "active"}, Password: "demo:exhibitor123"},
			{User: domain.User{ID: "usr_organizer_001", Name: "Demo Organizer", Email: "organizer@tandaza.demo", Role: domain.RoleOrganizer, AvatarURL: "/avatars/organizer.svg", CompanyName: "Expo Group Africa", CountryCode: "KE", Status: "active"}, Password: "demo:organizer123"},
			{User: domain.User{ID: "usr_sponsorship_001", Name: "Demo Sponsor", Email: "sponsorship@tandaza.demo", Role: domain.RoleSponsor, AvatarURL: "/avatars/sponsor.svg", CompanyName: "BrandLift Media", CountryCode: "KE", Status: "active"}, Password: "demo:sponsorship123"},
			{User: domain.User{ID: "usr_admin_001", Name: "Platform Administrator", Email: "admin@tandaza.demo", Role: domain.RoleSuperAdmin, AvatarURL: "/avatars/admin.svg", CompanyName: "Tandaza", CountryCode: "KE", Status: "active"}, Password: "demo:admin123"},
		},
		countries: []domain.Country{
			{Code: "KE", Name: "Kenya", DefaultCurrency: "KES", DefaultTimezone: "Africa/Nairobi", PaymentMethods: []string{"paystack", "mpesa", "manual"}, Active: true},
			{Code: "NG", Name: "Nigeria", DefaultCurrency: "NGN", DefaultTimezone: "Africa/Lagos", PaymentMethods: []string{"paystack", "bank_transfer", "manual"}, Active: true},
			{Code: "GH", Name: "Ghana", DefaultCurrency: "GHS", DefaultTimezone: "Africa/Accra", PaymentMethods: []string{"paystack", "mobile_money", "manual"}, Active: true},
			{Code: "ZA", Name: "South Africa", DefaultCurrency: "ZAR", DefaultTimezone: "Africa/Johannesburg", PaymentMethods: []string{"card", "bank_transfer", "manual"}, Active: true},
		},
		currencies: []domain.Currency{
			{Code: "KES", Symbol: "KES", DecimalPlaces: 2},
			{Code: "NGN", Symbol: "NGN", DecimalPlaces: 2},
			{Code: "GHS", Symbol: "GHS", DecimalPlaces: 2},
			{Code: "ZAR", Symbol: "R", DecimalPlaces: 2},
			{Code: "USD", Symbol: "$", DecimalPlaces: 2},
		},
		categories: defaultCategories(),
		expos: []domain.Expo{
			{
				ID: "expo_001", Name: "Nairobi Tech Expo", Description: "East Africa's premier technology exhibition.", OrganizerID: "usr_organizer_001", OrganizerName: "Expo Group Africa",
				CountryCode: "KE", City: "Nairobi", Venue: "KICC", CurrencyCode: "KES", Timezone: "Africa/Nairobi",
				ExhibitorActivationFeeMinor: 500000, AdsAddonFeeMinor: 100000, OrganizerCommissionBps: 3000,
				Status: domain.ExpoPublished, StartDate: start, EndDate: start.Add(48 * time.Hour),
				Categories:     []domain.Category{{ID: "cat_technology", Name: "Technology", Slug: "technology", Icon: "laptop", Active: true}},
				ExhibitorCount: 0, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
			},
		},
		payments: []domain.Payment{
			{
				ID: "pay_001", ExpoID: "expo_001", ExpoName: "Nairobi Tech Expo",
				PayerID: "usr_exhibitor_001", PayerName: "TechCorp Africa", PayerEmail: "exhibitor@tandaza.demo", PayerRole: domain.RoleExhibitor,
				Purpose: domain.PaymentExhibitorActivation, CountryCode: "KE", CurrencyCode: "KES", AmountMinor: 600000,
				Provider: "paystack", ProviderRef: "PSK-DEMO-001", Status: domain.PaymentPaid, IdempotencyKey: "seed_activation_001",
				CreatedAt: time.Now().UTC().Add(-48 * time.Hour), PaidAt: timePtr(time.Now().UTC().Add(-47 * time.Hour)),
			},
		},
		commissions: map[string]domain.CommissionSplit{
			"pay_001": {GrossMinor: 600000, CommissionMinor: 180000, PlatformMinor: 420000, RateBps: 3000, CurrencyCode: "KES"},
		},
		exhibitors: []domain.ExpoExhibitor{
			{
				ID: "exe_001", ExpoID: "expo_001", ExpoName: "Nairobi Tech Expo", ExpoDescription: "East Africa's premier technology exhibition.",
				ExhibitorID: "usr_exhibitor_001", ExhibitorName: "TechCorp Africa", ExhibitorEmail: "exhibitor@tandaza.demo",
				BoothNumber: "A12", BoothSize: "Digital Workspace", ActivationStatus: "active", CurrencyCode: "KES", AmountMinor: 600000,
				Location: "KICC, Nairobi", StartDate: start, EndDate: start.Add(48 * time.Hour), ActivatedAt: timePtr(time.Now().UTC().Add(-47 * time.Hour)), CreatedAt: time.Now().UTC().Add(-48 * time.Hour),
			},
		},
		products: []domain.ProductRecord{
			{
				ID: "prd_001", ExhibitorID: "usr_exhibitor_001", ExpoID: "expo_001", Name: "Cloud Analytics Pro",
				Description: "Cloud-based analytics dashboard for expo visitor engagement and sales teams.", Price: 125000, DiscountedPrice: 99000,
				Currency: "KES", Images: []string{"/products/cloud-analytics.jpg"}, MediaType: "image", MediaURL: "/products/cloud-analytics.jpg",
				Specifications: "Realtime dashboards, lead scoring, CSV exports", Category: "Technology", Status: "available", Featured: true,
				CreatedAt: time.Now().UTC().Add(-46 * time.Hour).Format(time.RFC3339),
			},
		},
		qrCodes: []domain.QRCodeRecord{
			{ID: "qr_001", ExpoID: "expo_001", ExpoExhibitorID: "exe_001", Code: "TANDAZA-EXE-001", TargetPath: "/visitor/expos/expo_001/exhibitors/exe_001", Type: "exhibitor_booth", Active: true, CreatedAt: time.Now().UTC().Format(time.RFC3339)},
		},
		leads: []domain.LeadRecord{
			{ID: "lead_001", ExpoID: "expo_001", ExpoName: "Nairobi Tech Expo", ExhibitorID: "usr_exhibitor_001", VisitorName: "Demo Visitor", VisitorEmail: "visitor@tandaza.demo", VisitorPhone: "+254700000001", Notes: "Interested in remote demo after expo.", Source: "booth_qr", Temperature: "hot", Status: "new", NextFollowUpAt: time.Now().UTC().Add(24 * time.Hour).Format(time.RFC3339), FollowUpNotes: "Send demo link after the expo.", InterestedProductIds: []string{"prd_001"}, CapturedAt: time.Now().UTC().Add(-24 * time.Hour).Format(time.RFC3339)},
		},
		leadActivities: []domain.LeadActivityRecord{
			{ID: "lact_001", LeadID: "lead_001", Type: "note", Notes: "Visitor requested a remote demo.", CreatedAt: time.Now().UTC().Add(-23 * time.Hour).Format(time.RFC3339)},
		},
		activities: []domain.VisitorActivityItem{
			{ID: "act_visitor_001", Type: "visited", Title: "Viewed TechCorp Africa", Description: "Opened exhibitor workspace through QR/remote access.", Timestamp: time.Now().UTC().Add(-24 * time.Hour).Format(time.RFC3339), ExpoID: "expo_001", ExhibitorID: "usr_exhibitor_001"},
		},
		bookings: []domain.VisitorBookingRecord{
			{ID: "vb_001", ExpoID: "expo_001", ExpoName: "Nairobi Tech Expo", ExpoDate: start.Format("2006-01-02"), Venue: "KICC", TicketType: "Remote Access", TicketPrice: 0, Status: "upcoming", BookedAt: time.Now().UTC().Add(-72 * time.Hour).Format(time.RFC3339), QRCode: "VISITOR-expo_001-usr_visitor_001"},
		},
		visitorProfiles: map[string]domain.VisitorSettingsInput{
			"usr_visitor_001": {Phone: "+254700000001", Email: true, Push: true, ExpoUpdates: true, Reminders: true},
		},
		notifications: []domain.Notification{
			{ID: "ntf_001", UserID: "usr_visitor_001", Recipient: "Demo Visitor", RecipientEmail: "visitor@tandaza.demo", ExpoID: "expo_001", Role: domain.RoleVisitor, Channel: "email", TemplateKey: "expo_remote_access_booked", Payload: map[string]any{"subject": "Remote access booked"}, Status: "delivered", ScheduledAt: time.Now().UTC().Add(-70 * time.Hour), SentAt: timePtr(time.Now().UTC().Add(-69 * time.Hour))},
			{ID: "ntf_002", UserID: "usr_exhibitor_001", Recipient: "TechCorp Africa", RecipientEmail: "exhibitor@tandaza.demo", ExpoID: "expo_001", Role: domain.RoleExhibitor, Channel: "in_app", TemplateKey: "new_lead_captured", Payload: map[string]any{"subject": "New lead captured"}, Status: "sent", ScheduledAt: time.Now().UTC().Add(-24 * time.Hour), SentAt: timePtr(time.Now().UTC().Add(-24 * time.Hour))},
		},
		sponsorPlans: []domain.SponsorPlanRecord{
			{ID: "spn_gold", Name: "Gold Sponsor", Description: "High visibility sponsor package.", CountryCode: "KE", Tier: "gold", Price: 650000, Currency: "KES", BillingCycle: "annual", Features: map[string]any{"logoPlacement": true, "bannerAds": true, "socialMedia": true, "boothSize": "premium", "speakingSlot": true, "dedicatedPage": true, "emailBlast": true, "videoAd": true}, OrganizerCommissionPercent: 20, Status: "active", CreatedAt: time.Now().UTC().Add(-120 * time.Hour).Format(time.RFC3339)},
		},
		sponsorCampaigns: []domain.SponsorCampaignRecord{
			{ID: "sc_001", SponsorID: "usr_sponsorship_001", Name: "Nairobi Tech Visibility", Objective: "Drive visitors to sponsored exhibitors.", Budget: 650000, Status: "active", StartDate: "2026-06-01", EndDate: "2026-06-14", AdsCount: 1, TotalImpressions: 18500, TotalClicks: 555, TotalSpend: 15000, CreatedAt: time.Now().UTC().Add(-96 * time.Hour).Format(time.RFC3339)},
		},
		sponsorAds: []domain.SponsorAdRecord{
			{ID: "sa_001", SponsorID: "usr_sponsorship_001", SponsorName: "BrandLift Media", CountryCode: "KE", CampaignID: "sc_001", CampaignName: "Nairobi Tech Visibility", Name: "Homepage Banner", Placement: "banner", Dimensions: "728x90", MediaURL: "/ads/banner1.jpg", MediaType: "image", Budget: 15000, DailySpend: 15000, Impressions: 18500, Clicks: 555, CTR: 3, Status: "active", PaymentStatus: "paid", CreatedAt: time.Now().UTC().Add(-90 * time.Hour).Format(time.RFC3339)},
		},
		sponsorPayments: []domain.SponsorPaymentRecord{
			{ID: "spay_001", Reference: "SP-PAY-001", AdID: "sa_001", AdName: "Homepage Banner", Amount: 15000, Currency: "KES", PaymentMethod: "paystack", Status: "paid", PaidAt: time.Now().UTC().Add(-89 * time.Hour).Format(time.RFC3339)},
		},
		organizerProfiles: map[string]domain.OrganizerProfile{
			"usr_organizer_001": {ID: "usr_organizer_001", Name: "Demo Organizer", Email: "organizer@tandaza.demo", CompanyName: "Expo Group Africa", CountryCode: "KE", Phone: "+254700000100", Address: "Nairobi, Kenya", PayoutMethod: "bank", PayoutAccountName: "Expo Group Africa", PayoutBankName: "Demo Bank", PayoutAccountNumber: "0000000000", PayoutBankBranch: "Nairobi", EmailNotifications: true, SMSNotifications: false, PushNotifications: true},
		},
		exhibitorProfiles: map[string]domain.ExhibitorProfile{
			"usr_exhibitor_001": {ID: "usr_exhibitor_001", CompanyName: "TechCorp Africa", Logo: "/avatars/exhibitor.svg", LogoURL: "/avatars/exhibitor.svg", Description: "Cloud analytics and visitor engagement tools for expo teams.", Website: "https://techcorp.example", Phone: "+254700000300", Email: "exhibitor@tandaza.demo", Address: "Nairobi, Kenya", Categories: []string{"Technology"}, SocialLinks: map[string]string{"linkedin": "", "twitter": "", "instagram": ""}, TeamMembers: []map[string]string{{"id": "usr_exhibitor_001", "name": "Demo Exhibitor", "email": "exhibitor@tandaza.demo", "role": "owner"}}},
		},
		exhibitorDocuments: []domain.CompanyDocumentRecord{},
		organizerTeam: []domain.OrganizerTeamMember{
			{ID: "otm_001", OrganizerID: "usr_organizer_001", Name: "Expo Operations Lead", Email: "ops@expogroup.demo", Role: "manager", Status: "active", Permissions: []string{"expos:manage", "exhibitors:view", "reports:view"}, CreatedAt: time.Now().UTC().Add(-72 * time.Hour).Format(time.RFC3339)},
		},
		exhibitorTeam: []domain.OrganizerTeamMember{
			{ID: "etm_001", OrganizerID: "usr_exhibitor_001", Name: "Sales Follow-up Lead", Email: "sales@techcorp.demo", Role: "staff", Status: "active", Permissions: []string{"leads:view", "products:manage"}, CreatedAt: time.Now().UTC().Add(-48 * time.Hour).Format(time.RFC3339)},
		},
		organizerSponsors: []domain.OrganizerSponsor{
			{ID: "orgsp_001", OrganizerID: "usr_organizer_001", Company: "BrandLift Media", ContactName: "Demo Sponsor", Email: "sponsorship@tandaza.demo", Phone: "+254700000200", PlanName: "Gold Sponsor", PlanTier: "gold", Status: "active", CommissionedBy: "Expo Group Africa", CommissionEarned: 3000, TotalPaid: 15000, JoinedAt: time.Now().UTC().Add(-90 * time.Hour).Format(time.RFC3339)},
		},
		auditLogs: []domain.AuditLog{
			{
				ID: "aud_001", ActorID: "usr_admin_001", Actor: "Platform Administrator", ActorRole: domain.RoleSuperAdmin,
				Action: "go_backend_initialized", EntityType: "system", EntityID: "backend",
				IPAddress: "127.0.0.1", Metadata: map[string]any{"phase": "go_foundation"},
				CreatedAt: time.Now().UTC(),
			},
		},
		resetTokens:        map[string]string{},
		emailVerifyTokens:  map[string]string{},
		settlementStatuses: map[string]string{},
		emailSettings: domain.EmailSettings{
			SenderName: "Tandaza", SenderEmail: "notifications@tandaza.africa", SMTPPort: 587, Encryption: "starttls",
		},
		smsSettings:              domain.SMSSettings{Provider: "tiaraconnect", SenderID: "CONNECT", BaseURL: "https://api2.tiaraconnect.io"},
		paystackSettings:         domain.PaystackSettings{CallbackURL: "http://127.0.0.1:3000/payments/callback", ProcessingFeeBps: 10},
		googleSettings:           domain.GoogleSettings{},
		meetingSettings:          defaultMeetingSettings(),
		exhibitorMeetingSettings: map[string]domain.MeetingSettings{},
		openAISettings:           domain.OpenAISettings{Enabled: false, Model: "gpt-4.1-mini"},
		whatsappSettings:         domain.WhatsappSettings{},
	}
}

func (s *MemoryStore) Login(ctx context.Context, email string, password string) (domain.User, string, error) {
	for _, demo := range s.users {
		if strings.EqualFold(demo.User.Email, strings.TrimSpace(email)) && demo.User.Status == "active" && security.VerifyPassword(password, demo.Password) {
			token, err := s.tokenService.Sign(demo.User)
			return demo.User, token, err
		}
	}
	return domain.User{}, "", ErrInvalidCredentials
}

func (s *MemoryStore) ChangePassword(ctx context.Context, userID string, currentPassword string, newPassword string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, demo := range s.users {
		if demo.User.ID == strings.TrimSpace(userID) && demo.User.Status == "active" && security.VerifyPassword(currentPassword, demo.Password) {
			hash, err := security.HashPassword(newPassword)
			if err != nil {
				return err
			}
			s.users[i].Password = hash
			s.users[i].User.MustChangePassword = false
			return nil
		}
	}
	return ErrInvalidCredentials
}

func (s *MemoryStore) Register(ctx context.Context, email string, password string, input domain.RegisterInput) (domain.User, string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if strings.TrimSpace(email) == "" || strings.TrimSpace(password) == "" || strings.TrimSpace(input.Name) == "" {
		return domain.User{}, "", ErrInvalidCredentials
	}
	if input.Role == domain.RoleAdministrator || input.Role == domain.RoleSuperAdmin {
		return domain.User{}, "", ErrInvalidCredentials
	}
	if input.Role == "" {
		input.Role = domain.RoleVisitor
	}
	if input.Role != domain.RoleVisitor {
		return domain.User{}, "", ErrInvalidCredentials
	}
	for _, demo := range s.users {
		if strings.EqualFold(demo.User.Email, email) {
			return domain.User{}, "", ErrInvalidCredentials
		}
	}
	user := domain.User{
		ID:          fmt.Sprintf("usr_%d", time.Now().UnixNano()),
		Name:        strings.TrimSpace(input.Name),
		Email:       strings.TrimSpace(strings.ToLower(email)),
		Role:        input.Role,
		AvatarURL:   "/avatars/visitor.svg",
		CompanyName: strings.TrimSpace(input.CompanyName),
		CountryCode: defaultString(strings.ToUpper(strings.TrimSpace(input.CountryCode)), "KE"),
		Status:      "active",
	}
	hash, err := security.HashPassword(password)
	if err != nil {
		return domain.User{}, "", err
	}
	s.users = append(s.users, DemoUser{User: user, Password: hash})
	token, err := s.tokenService.Sign(user)
	return user, token, err
}

func (s *MemoryStore) AuthWithGoogle(ctx context.Context, input domain.GoogleAuthInput) (domain.User, string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	email := strings.TrimSpace(strings.ToLower(input.Email))
	name := strings.TrimSpace(input.Name)
	if email == "" || name == "" {
		return domain.User{}, "", ErrInvalidCredentials
	}
	for _, demo := range s.users {
		if strings.EqualFold(demo.User.Email, email) {
			token, err := s.tokenService.Sign(demo.User)
			return demo.User, token, err
		}
	}
	hash, err := security.HashPassword(fmt.Sprintf("google:%s:%d", email, time.Now().UnixNano()))
	if err != nil {
		return domain.User{}, "", err
	}
	user := domain.User{
		ID:          fmt.Sprintf("usr_%d", time.Now().UnixNano()),
		Name:        name,
		Email:       email,
		Role:        domain.RoleVisitor,
		AvatarURL:   "/avatars/visitor.svg",
		CountryCode: "KE",
		Status:      "active",
	}
	s.users = append(s.users, DemoUser{User: user, Password: hash})
	token, err := s.tokenService.Sign(user)
	return user, token, err
}

func (s *MemoryStore) CreateEmailVerification(ctx context.Context, userID string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.userByIDLocked(strings.TrimSpace(userID)); !ok {
		return "", ErrNotFound
	}
	token := fmt.Sprintf("ver_%d", time.Now().UnixNano())
	s.emailVerifyTokens[token] = strings.TrimSpace(userID)
	return token, nil
}

func (s *MemoryStore) VerifyEmail(ctx context.Context, token string) (domain.User, string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	userID, ok := s.emailVerifyTokens[strings.TrimSpace(token)]
	if !ok {
		return domain.User{}, "", ErrInvalidCredentials
	}
	user, ok := s.userByIDLocked(userID)
	if !ok {
		return domain.User{}, "", ErrNotFound
	}
	delete(s.emailVerifyTokens, strings.TrimSpace(token))
	signedToken, err := s.tokenService.Sign(user)
	return user, signedToken, err
}

func (s *MemoryStore) ForgotPassword(ctx context.Context, email string) (domain.ForgotPasswordResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	token := fmt.Sprintf("rst_%d", time.Now().UnixNano())
	for _, demo := range s.users {
		if strings.EqualFold(demo.User.Email, strings.TrimSpace(email)) {
			s.resetTokens[token] = demo.User.ID
			return domain.ForgotPasswordResult{Message: "Password reset token generated.", Token: token}, nil
		}
	}
	return domain.ForgotPasswordResult{Message: "If the account exists, a password reset token has been generated."}, nil
}

func (s *MemoryStore) ResetPassword(ctx context.Context, token string, newPassword string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	userID, ok := s.resetTokens[strings.TrimSpace(token)]
	if !ok || strings.TrimSpace(newPassword) == "" {
		return ErrInvalidCredentials
	}
	for i, demo := range s.users {
		if demo.User.ID == userID {
			hash, err := security.HashPassword(newPassword)
			if err != nil {
				return err
			}
			s.users[i].Password = hash
			delete(s.resetTokens, token)
			return nil
		}
	}
	return ErrNotFound
}

func (s *MemoryStore) UserByID(ctx context.Context, id string) (domain.User, error) {
	for _, demo := range s.users {
		if demo.User.ID == id {
			return demo.User, nil
		}
	}
	return domain.User{}, ErrNotFound
}

func (s *MemoryStore) Users(ctx context.Context) ([]domain.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	users := make([]domain.User, 0, len(s.users))
	for _, demo := range s.users {
		users = append(users, demo.User)
	}
	return users, nil
}

func (s *MemoryStore) VisitorSettings(ctx context.Context, visitorID string) (domain.VisitorSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	user, ok := s.userByIDLocked(strings.TrimSpace(visitorID))
	if !ok || user.Role != domain.RoleVisitor {
		return domain.VisitorSettings{}, ErrNotFound
	}
	input := s.visitorProfiles[user.ID]
	return visitorSettingsFrom(user, input), nil
}

func (s *MemoryStore) UpdateVisitorSettings(ctx context.Context, visitorID string, input domain.VisitorSettingsInput) (domain.VisitorSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	id := strings.TrimSpace(visitorID)
	for i, demo := range s.users {
		if demo.User.ID != id || demo.User.Role != domain.RoleVisitor {
			continue
		}
		name := strings.TrimSpace(input.Name)
		if name == "" {
			return domain.VisitorSettings{}, ErrInvalidCredentials
		}
		s.users[i].User.Name = name
		s.users[i].User.CompanyName = strings.TrimSpace(input.Company)
		input.Name = name
		input.Company = strings.TrimSpace(input.Company)
		input.Industry = strings.TrimSpace(input.Industry)
		input.Phone = strings.TrimSpace(input.Phone)
		s.visitorProfiles[id] = input
		return visitorSettingsFrom(s.users[i].User, input), nil
	}
	return domain.VisitorSettings{}, ErrNotFound
}

func (s *MemoryStore) BootstrapAdmin(ctx context.Context, input domain.AdminUserInput) (domain.User, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if strings.TrimSpace(input.Email) == "" || strings.TrimSpace(input.Password) == "" {
		return domain.User{}, false, nil
	}
	for _, demo := range s.users {
		if strings.EqualFold(demo.User.Email, input.Email) {
			if !isAdminRole(demo.User.Role) {
				return domain.User{}, false, ErrInvalidCredentials
			}
			return demo.User, false, nil
		}
	}
	name := strings.TrimSpace(input.Name)
	if name == "" {
		name = "Platform Administrator"
	}
	hash, err := security.HashPassword(input.Password)
	if err != nil {
		return domain.User{}, false, err
	}
	user := domain.User{
		ID:          fmt.Sprintf("usr_bootstrap_%d", time.Now().UnixNano()),
		Name:        name,
		Email:       strings.TrimSpace(strings.ToLower(input.Email)),
		Role:        defaultAdminRole(input.Role),
		AvatarURL:   "/avatars/admin.svg",
		CompanyName: strings.TrimSpace(input.CompanyName),
		CountryCode: defaultString(strings.ToUpper(strings.TrimSpace(input.CountryCode)), "KE"),
		Status:      "active",
	}
	s.users = append([]DemoUser{{User: user, Password: hash}}, s.users...)
	return user, true, nil
}

func (s *MemoryStore) CreateAdminManagedUser(ctx context.Context, input domain.AdminUserInput, actor domain.User) (domain.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if (!isAdminRole(actor.Role) && actor.Role != domain.RoleOrganizer) || strings.TrimSpace(input.Email) == "" || strings.TrimSpace(input.Name) == "" || strings.TrimSpace(input.Password) == "" {
		return domain.User{}, ErrInvalidCredentials
	}
	if strings.EqualFold(strings.TrimSpace(input.Email), strings.TrimSpace(input.Password)) {
		return domain.User{}, ErrInvalidCredentials
	}
	if input.Role == "" {
		input.Role = domain.RoleVisitor
	}
	if !validRole(input.Role) {
		return domain.User{}, ErrInvalidCredentials
	}
	if actor.Role == domain.RoleOrganizer && input.Role != domain.RoleExhibitor && input.Role != domain.RoleSponsor && input.Role != domain.RoleOrganizer {
		return domain.User{}, ErrInvalidCredentials
	}
	status := strings.TrimSpace(input.Status)
	if status == "" {
		status = "active"
	}
	if !validAccountStatus(status) {
		return domain.User{}, ErrInvalidCredentials
	}
	for _, demo := range s.users {
		if strings.EqualFold(demo.User.Email, input.Email) {
			return domain.User{}, ErrInvalidCredentials
		}
	}
	hash, err := security.HashPassword(input.Password)
	if err != nil {
		return domain.User{}, err
	}
	user := domain.User{
		ID:                 fmt.Sprintf("usr_%d", time.Now().UnixNano()),
		Name:               strings.TrimSpace(input.Name),
		Email:              strings.TrimSpace(strings.ToLower(input.Email)),
		Role:               input.Role,
		AvatarURL:          "/avatars/visitor.svg",
		CompanyName:        strings.TrimSpace(input.CompanyName),
		CountryCode:        defaultString(strings.ToUpper(strings.TrimSpace(input.CountryCode)), "KE"),
		Status:             status,
		MustChangePassword: true,
	}
	s.users = append([]DemoUser{{User: user, Password: hash}}, s.users...)
	return user, nil
}

func (s *MemoryStore) UpdateAdminManagedUser(ctx context.Context, id string, input domain.AdminUserInput, actor domain.User) (domain.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !isAdminRole(actor.Role) || strings.TrimSpace(id) == "" {
		return domain.User{}, ErrInvalidCredentials
	}
	if input.Role != "" && !validRole(input.Role) {
		return domain.User{}, ErrInvalidCredentials
	}
	for i, demo := range s.users {
		if demo.User.ID != id {
			continue
		}
		if strings.TrimSpace(input.Name) != "" {
			s.users[i].User.Name = strings.TrimSpace(input.Name)
		}
		if strings.TrimSpace(input.Email) != "" && !strings.EqualFold(input.Email, demo.User.Email) {
			for _, existing := range s.users {
				if existing.User.ID != id && strings.EqualFold(existing.User.Email, input.Email) {
					return domain.User{}, ErrInvalidCredentials
				}
			}
			s.users[i].User.Email = strings.TrimSpace(strings.ToLower(input.Email))
		}
		if input.Role != "" {
			s.users[i].User.Role = input.Role
		}
		if strings.TrimSpace(input.CompanyName) != "" {
			s.users[i].User.CompanyName = strings.TrimSpace(input.CompanyName)
		}
		if strings.TrimSpace(input.CountryCode) != "" {
			s.users[i].User.CountryCode = strings.ToUpper(strings.TrimSpace(input.CountryCode))
		}
		if strings.TrimSpace(input.Status) != "" {
			if !validAccountStatus(strings.TrimSpace(input.Status)) {
				return domain.User{}, ErrInvalidCredentials
			}
			s.users[i].User.Status = strings.TrimSpace(input.Status)
		}
		if strings.TrimSpace(input.Password) != "" {
			hash, err := security.HashPassword(input.Password)
			if err != nil {
				return domain.User{}, err
			}
			s.users[i].Password = hash
			s.users[i].User.MustChangePassword = isAdminRole(s.users[i].User.Role)
		}
		return s.users[i].User, nil
	}
	return domain.User{}, ErrNotFound
}

func (s *MemoryStore) DeleteAdminManagedUser(ctx context.Context, id string, actor domain.User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !isAdminRole(actor.Role) || strings.TrimSpace(id) == "" || id == actor.ID {
		return ErrInvalidCredentials
	}
	superAdmins := 0
	for _, demo := range s.users {
		if demo.User.Role == domain.RoleSuperAdmin {
			superAdmins++
		}
	}
	for index, demo := range s.users {
		if demo.User.ID != id {
			continue
		}
		if !isAdminRole(demo.User.Role) {
			return ErrInvalidCredentials
		}
		if demo.User.Role == domain.RoleSuperAdmin && superAdmins <= 1 {
			return ErrInvalidCredentials
		}
		s.users = append(s.users[:index], s.users[index+1:]...)
		return nil
	}
	return ErrNotFound
}

func (s *MemoryStore) Countries(ctx context.Context) ([]domain.Country, error) {
	return append([]domain.Country(nil), s.countries...), nil
}

func (s *MemoryStore) CreateCountry(ctx context.Context, input domain.CountryInput, actor domain.User) (domain.Country, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !isAdminRole(actor.Role) {
		return domain.Country{}, ErrInvalidCredentials
	}
	item := countryFromInput(input)
	if !validCountryRecord(item) {
		return domain.Country{}, ErrInvalidCredentials
	}
	for _, country := range s.countries {
		if strings.EqualFold(country.Code, item.Code) {
			return domain.Country{}, ErrInvalidCredentials
		}
	}
	s.countries = append(s.countries, item)
	return item, nil
}

func (s *MemoryStore) UpdateCountryStatus(ctx context.Context, code string, active bool, actor domain.User) (domain.Country, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !isAdminRole(actor.Role) {
		return domain.Country{}, ErrInvalidCredentials
	}
	code = strings.ToUpper(strings.TrimSpace(code))
	for index, country := range s.countries {
		if strings.EqualFold(country.Code, code) {
			s.countries[index].Active = active
			return s.countries[index], nil
		}
	}
	return domain.Country{}, ErrNotFound
}

func (s *MemoryStore) Currencies(ctx context.Context) ([]domain.Currency, error) {
	return append([]domain.Currency(nil), s.currencies...), nil
}

func (s *MemoryStore) Categories(ctx context.Context) ([]domain.Category, error) {
	return append([]domain.Category(nil), s.categories...), nil
}

func (s *MemoryStore) CreateCategory(ctx context.Context, input domain.CategoryInput, actor domain.User) (domain.Category, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !isAdminRole(actor.Role) {
		return domain.Category{}, ErrInvalidCredentials
	}
	item := categoryFromInput(input)
	if !validCategoryRecord(item) {
		return domain.Category{}, ErrInvalidCredentials
	}
	for _, category := range s.categories {
		if strings.EqualFold(category.Slug, item.Slug) || strings.EqualFold(category.ID, item.ID) {
			return domain.Category{}, ErrInvalidCredentials
		}
	}
	s.categories = append(s.categories, item)
	return item, nil
}

func (s *MemoryStore) UpdateCategoryStatus(ctx context.Context, id string, active bool, actor domain.User) (domain.Category, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !isAdminRole(actor.Role) {
		return domain.Category{}, ErrInvalidCredentials
	}
	for index, category := range s.categories {
		if strings.EqualFold(category.ID, strings.TrimSpace(id)) {
			s.categories[index].Active = active
			return s.categories[index], nil
		}
	}
	return domain.Category{}, ErrNotFound
}

func (s *MemoryStore) ListExpos(ctx context.Context, filter ExpoFilter) ([]domain.Expo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	expos := make([]domain.Expo, 0, len(s.expos))
	for _, expo := range s.expos {
		if filter.OrganizerID != "" && expo.OrganizerID != filter.OrganizerID {
			continue
		}
		if filter.CountryCode != "" && !strings.EqualFold(expo.CountryCode, filter.CountryCode) {
			continue
		}
		expos = append(expos, expo)
	}
	return expos, nil
}

func (s *MemoryStore) ExpoByID(ctx context.Context, id string) (domain.Expo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, expo := range s.expos {
		if expo.ID == id {
			return expo, nil
		}
	}
	return domain.Expo{}, ErrNotFound
}

func (s *MemoryStore) CreateExpo(ctx context.Context, input domain.ExpoInput, actor domain.User) (domain.Expo, error) {
	if err := platform.ValidateExpoInput(input, actor.Role); err != nil {
		return domain.Expo{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	organizerID := input.OrganizerID
	if actor.Role == domain.RoleOrganizer {
		organizerID = actor.ID
	}
	organizerName := s.organizerName(organizerID)
	start, _ := time.Parse("2006-01-02", input.StartDate)
	end, _ := time.Parse("2006-01-02", input.EndDate)
	status := domain.ExpoDraft
	if isAdminRole(actor.Role) && input.Status != "" {
		if parsed, ok := domain.ParseExpoStatus(input.Status); ok {
			status = parsed
		}
	}
	expo := domain.Expo{
		ID: fmt.Sprintf("expo_%06d", len(s.expos)+1), Name: strings.TrimSpace(input.Name), Description: strings.TrimSpace(input.Description),
		OrganizerID: organizerID, OrganizerName: organizerName, CountryCode: strings.ToUpper(input.CountryCode), City: strings.TrimSpace(input.City),
		Venue: strings.TrimSpace(input.Venue), CurrencyCode: strings.ToUpper(input.CurrencyCode), Timezone: strings.TrimSpace(input.Timezone), CoverImageURL: strings.TrimSpace(input.CoverImageURL),
		ExhibitorActivationFeeMinor: input.ExhibitorActivationFeeMinor, AdsAddonFeeMinor: input.AdsAddonFeeMinor, OrganizerCommissionBps: input.OrganizerCommissionBps, Status: status,
		StartDate: start, EndDate: end, Categories: s.categoriesByID(input.CategoryIDs), CreatedAt: now, UpdatedAt: now,
	}
	s.expos = append(s.expos, expo)
	return expo, nil
}

func (s *MemoryStore) UpdateExpo(ctx context.Context, id string, input domain.ExpoInput, actor domain.User) (domain.Expo, error) {
	if err := platform.ValidateExpoInput(input, actor.Role); err != nil {
		return domain.Expo{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, expo := range s.expos {
		if expo.ID != id {
			continue
		}
		if actor.Role == domain.RoleOrganizer {
			if expo.OrganizerID != actor.ID {
				return domain.Expo{}, platform.ErrForbiddenExpoMutation
			}
			if !platform.OrganizerCanEdit(expo.Status) {
				return domain.Expo{}, platform.ErrForbiddenExpoMutation
			}
			input.ExhibitorActivationFeeMinor = expo.ExhibitorActivationFeeMinor
			input.AdsAddonFeeMinor = expo.AdsAddonFeeMinor
			input.OrganizerCommissionBps = expo.OrganizerCommissionBps
			input.CoverImageURL = expo.CoverImageURL
		}
		start, _ := time.Parse("2006-01-02", input.StartDate)
		end, _ := time.Parse("2006-01-02", input.EndDate)
		expo.Name = strings.TrimSpace(input.Name)
		expo.Description = strings.TrimSpace(input.Description)
		expo.CountryCode = strings.ToUpper(input.CountryCode)
		expo.City = strings.TrimSpace(input.City)
		expo.Venue = strings.TrimSpace(input.Venue)
		expo.CurrencyCode = strings.ToUpper(input.CurrencyCode)
		expo.Timezone = strings.TrimSpace(input.Timezone)
		expo.CoverImageURL = strings.TrimSpace(input.CoverImageURL)
		expo.StartDate = start
		expo.EndDate = end
		expo.Categories = s.categoriesByID(input.CategoryIDs)
		if isAdminRole(actor.Role) {
			expo.OrganizerID = input.OrganizerID
			expo.OrganizerName = s.organizerName(input.OrganizerID)
			expo.ExhibitorActivationFeeMinor = input.ExhibitorActivationFeeMinor
			expo.AdsAddonFeeMinor = input.AdsAddonFeeMinor
			expo.OrganizerCommissionBps = input.OrganizerCommissionBps
			if input.Status != "" {
				if parsed, ok := domain.ParseExpoStatus(input.Status); ok {
					expo.Status = parsed
				}
			}
		}
		expo.UpdatedAt = time.Now().UTC()
		s.expos[i] = expo
		return expo, nil
	}
	return domain.Expo{}, ErrNotFound
}

func (s *MemoryStore) ChangeExpoStatus(ctx context.Context, id string, status domain.ExpoStatus, actor domain.User) (domain.Expo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, expo := range s.expos {
		if expo.ID != id {
			continue
		}
		if actor.Role == domain.RoleOrganizer && expo.OrganizerID != actor.ID {
			return domain.Expo{}, platform.ErrForbiddenExpoMutation
		}
		if err := platform.ValidateStatusTransition(actor.Role, expo.Status, status); err != nil {
			return domain.Expo{}, err
		}
		expo.Status = status
		expo.UpdatedAt = time.Now().UTC()
		s.expos[i] = expo
		return expo, nil
	}
	return domain.Expo{}, ErrNotFound
}

func (s *MemoryStore) CompleteEndedExpos(ctx context.Context, now time.Time) ([]domain.Expo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	today := dateOnly(now.UTC())
	completed := []domain.Expo{}
	for index, expo := range s.expos {
		if expo.Status != domain.ExpoPublished && expo.Status != domain.ExpoLive {
			continue
		}
		if !dateOnly(expo.EndDate.UTC()).Before(today) {
			continue
		}
		expo.Status = domain.ExpoCompleted
		expo.UpdatedAt = now.UTC()
		s.expos[index] = expo
		completed = append(completed, expo)
	}
	return completed, nil
}

func (s *MemoryStore) ListPayments(ctx context.Context, filter PaymentFilter) ([]domain.Payment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := []domain.Payment{}
	for _, payment := range s.payments {
		if filter.ExpoID != "" && payment.ExpoID != filter.ExpoID {
			continue
		}
		if filter.PayerID != "" && payment.PayerID != filter.PayerID {
			continue
		}
		if filter.CountryCode != "" && !strings.EqualFold(payment.CountryCode, filter.CountryCode) {
			continue
		}
		if filter.OrganizerID != "" {
			expo, ok := s.expoByIDLocked(payment.ExpoID)
			if !ok || expo.OrganizerID != filter.OrganizerID {
				continue
			}
		}
		items = append(items, payment)
	}
	return items, nil
}

func (s *MemoryStore) PaymentByID(ctx context.Context, id string) (domain.Payment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, payment := range s.payments {
		if payment.ID == id {
			return payment, nil
		}
	}
	return domain.Payment{}, ErrNotFound
}

func (s *MemoryStore) CreatePayment(ctx context.Context, input domain.PaymentInput, actor domain.User) (domain.Payment, error) {
	if actor.Role != domain.RoleExhibitor || input.Purpose != domain.PaymentExhibitorActivation {
		return domain.Payment{}, ErrInvalidCredentials
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, existing := range s.payments {
		if existing.IdempotencyKey != "" && existing.IdempotencyKey == input.IdempotencyKey {
			return existing, nil
		}
	}
	expo, ok := s.expoByIDLocked(input.ExpoID)
	if !ok {
		return domain.Payment{}, ErrNotFound
	}
	if expo.Status != domain.ExpoPublished && expo.Status != domain.ExpoLive {
		return domain.Payment{}, platform.ErrForbiddenExpoMutation
	}
	for _, item := range s.exhibitors {
		if item.ExpoID == expo.ID && item.ExhibitorID == actor.ID {
			if item.ActivationStatus == "active" || item.ActivationStatus == "disabled" {
				return domain.Payment{}, ErrInvalidCredentials
			}
			break
		}
	}
	now := time.Now().UTC()
	amountMinor := expo.ExhibitorActivationFeeMinor
	if input.IncludeAdsAddon {
		amountMinor += expo.AdsAddonFeeMinor
	}
	processingFeeMinor := paymentProcessingFeeMinor(amountMinor, s.paystackSettings)
	payment := domain.Payment{
		ID: fmt.Sprintf("pay_%06d", len(s.payments)+1), ExpoID: expo.ID, ExpoName: expo.Name,
		PayerID: actor.ID, PayerName: actor.CompanyName, PayerEmail: actor.Email, PayerRole: actor.Role,
		Purpose: input.Purpose, CountryCode: expo.CountryCode, CurrencyCode: expo.CurrencyCode,
		AmountMinor: amountMinor + processingFeeMinor, ProcessingFeeMinor: processingFeeMinor,
		Provider: "paystack", ProviderRef: fmt.Sprintf("pay_%06d", len(s.payments)+1),
		Status: domain.PaymentPending, IdempotencyKey: normalizedIdempotency(input, actor), CreatedAt: now,
	}
	if payment.PayerName == "" {
		payment.PayerName = actor.Name
	}
	s.payments = append([]domain.Payment{payment}, s.payments...)
	s.upsertExpoExhibitorLocked(expo, actor, "pending_activation", nil, payment.AmountMinor)
	if input.ROIEstimate.EstimatedSpend > 0 || strings.TrimSpace(input.ROIEstimate.Notes) != "" || len(input.ROIEstimate.Breakdown) > 0 {
		for i, item := range s.exhibitors {
			if item.ExpoID == expo.ID && item.ExhibitorID == actor.ID {
				item.EstimatedSpendMinor = maxInt64(input.ROIEstimate.EstimatedSpend, 0)
				item.ROICurrencyCode = defaultString(strings.ToUpper(strings.TrimSpace(input.ROIEstimate.Currency)), expo.CurrencyCode)
				item.ROISpendBreakdown = input.ROIEstimate.Breakdown
				item.ROINotes = strings.TrimSpace(input.ROIEstimate.Notes)
				s.exhibitors[i] = item
				break
			}
		}
	}
	return payment, nil
}

func (s *MemoryStore) ConfirmPayment(ctx context.Context, id string, actor domain.User) (domain.Payment, domain.CommissionSplit, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, payment := range s.payments {
		if payment.ID != id {
			continue
		}
		if !isAdminRole(actor.Role) && payment.PayerID != actor.ID {
			return domain.Payment{}, domain.CommissionSplit{}, ErrInvalidCredentials
		}
		if payment.Status == domain.PaymentPaid {
			return payment, s.commissions[payment.ID], nil
		}
		expo, ok := s.expoByIDLocked(payment.ExpoID)
		if !ok {
			return domain.Payment{}, domain.CommissionSplit{}, ErrNotFound
		}
		now := time.Now().UTC()
		payment.Status = domain.PaymentPaid
		payment.PaidAt = &now
		split, err := platform.CalculateCommission(paymentCommissionBaseMinor(payment), expo.OrganizerCommissionBps, payment.CurrencyCode)
		if err != nil {
			return domain.Payment{}, domain.CommissionSplit{}, err
		}
		s.payments[i] = payment
		s.commissions[payment.ID] = split
		s.upsertExpoExhibitorLocked(expo, actor, "active", &now, payment.AmountMinor)
		return payment, split, nil
	}
	return domain.Payment{}, domain.CommissionSplit{}, ErrNotFound
}

func (s *MemoryStore) UpdatePaymentProviderReference(ctx context.Context, id string, providerReference string) (domain.Payment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if strings.TrimSpace(id) == "" || strings.TrimSpace(providerReference) == "" {
		return domain.Payment{}, ErrInvalidCredentials
	}
	for i, payment := range s.payments {
		if payment.ID != id {
			continue
		}
		payment.ProviderRef = strings.TrimSpace(providerReference)
		s.payments[i] = payment
		return payment, nil
	}
	return domain.Payment{}, ErrNotFound
}

func (s *MemoryStore) UpdatePaymentStatus(ctx context.Context, id string, status domain.PaymentStatus, reason string, actor domain.User) (domain.Payment, error) {
	if !isAdminRole(actor.Role) || !validPaymentStatus(status) {
		return domain.Payment{}, ErrInvalidCredentials
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, payment := range s.payments {
		if payment.ID != id {
			continue
		}
		if !allowedPaymentStatusChange(payment.Status, status) {
			return domain.Payment{}, ErrInvalidCredentials
		}
		payment.Status = status
		if status == domain.PaymentPaid && payment.PaidAt == nil {
			now := time.Now().UTC()
			payment.PaidAt = &now
		}
		if status == domain.PaymentFailed || status == domain.PaymentCancelled {
			payment.PaidAt = nil
		}
		if status == domain.PaymentRefunded {
			if split, ok := s.commissions[payment.ID]; ok {
				split.PlatformMinor = paymentCommissionBaseMinor(payment)
				s.commissions[payment.ID] = split
			}
		}
		s.payments[i] = payment
		return payment, nil
	}
	return domain.Payment{}, ErrNotFound
}

func (s *MemoryStore) ListExpoExhibitors(ctx context.Context, filter ExpoExhibitorFilter) ([]domain.ExpoExhibitor, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := []domain.ExpoExhibitor{}
	for _, item := range s.exhibitors {
		if filter.ExpoID != "" && item.ExpoID != filter.ExpoID {
			continue
		}
		if filter.ExhibitorID != "" && item.ExhibitorID != filter.ExhibitorID {
			continue
		}
		if filter.OrganizerID != "" {
			expo, ok := s.expoByIDLocked(item.ExpoID)
			if !ok || expo.OrganizerID != filter.OrganizerID {
				continue
			}
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *MemoryStore) AssignExpoExhibitor(ctx context.Context, input domain.ExpoExhibitorInput, actor domain.User) (domain.ExpoExhibitor, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	expo, ok := s.expoByIDLocked(strings.TrimSpace(input.ExpoID))
	if !ok {
		return domain.ExpoExhibitor{}, ErrNotFound
	}
	if actor.Role == domain.RoleOrganizer && expo.OrganizerID != actor.ID {
		return domain.ExpoExhibitor{}, ErrInvalidCredentials
	}
	if !isAdminRole(actor.Role) && actor.Role != domain.RoleOrganizer {
		return domain.ExpoExhibitor{}, ErrInvalidCredentials
	}
	exhibitor, ok := s.userByIDLocked(strings.TrimSpace(input.ExhibitorID))
	if !ok || exhibitor.Role != domain.RoleExhibitor {
		return domain.ExpoExhibitor{}, ErrNotFound
	}
	status := validExpoExhibitorStatus(input.Status)
	for i, existing := range s.exhibitors {
		if existing.ExpoID == expo.ID && existing.ExhibitorID == exhibitor.ID {
			existing.BoothNumber = defaultString(strings.TrimSpace(input.BoothNumber), existing.BoothNumber)
			existing.BoothLabel = strings.TrimSpace(input.BoothLabel)
			existing.BoothSize = defaultString(strings.TrimSpace(input.BoothLabel), existing.BoothSize)
			existing.ActivationStatus = status
			s.exhibitors[i] = existing
			return existing, nil
		}
	}
	record := domain.ExpoExhibitor{
		ID: fmt.Sprintf("exe_%06d", len(s.exhibitors)+1), ExpoID: expo.ID, ExpoName: expo.Name, ExpoDescription: expo.Description,
		ExhibitorID: exhibitor.ID, ExhibitorName: displayName(exhibitor), ExhibitorEmail: exhibitor.Email,
		BoothNumber: defaultString(strings.TrimSpace(input.BoothNumber), "Assigned"), BoothLabel: strings.TrimSpace(input.BoothLabel),
		BoothSize: defaultString(strings.TrimSpace(input.BoothLabel), "Digital Workspace"), ActivationStatus: status,
		CurrencyCode: expo.CurrencyCode, AmountMinor: expo.ExhibitorActivationFeeMinor, Location: expo.Venue + ", " + expo.City,
		StartDate: expo.StartDate, EndDate: expo.EndDate, CreatedAt: time.Now().UTC(),
	}
	s.exhibitors = append([]domain.ExpoExhibitor{record}, s.exhibitors...)
	return record, nil
}

func (s *MemoryStore) UpdateExhibitorROI(ctx context.Context, expoID string, exhibitorID string, input domain.ROIEstimateInput) (domain.ExpoExhibitor, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	expo, ok := s.expoByIDLocked(strings.TrimSpace(expoID))
	if !ok {
		return domain.ExpoExhibitor{}, ErrNotFound
	}
	for i, item := range s.exhibitors {
		if item.ExpoID != expo.ID || item.ExhibitorID != strings.TrimSpace(exhibitorID) {
			continue
		}
		item.EstimatedSpendMinor = maxInt64(input.EstimatedSpend, 0)
		item.ROICurrencyCode = defaultString(strings.ToUpper(strings.TrimSpace(input.Currency)), expo.CurrencyCode)
		item.ROISpendBreakdown = input.Breakdown
		item.ROINotes = strings.TrimSpace(input.Notes)
		s.exhibitors[i] = item
		return item, nil
	}
	return domain.ExpoExhibitor{}, ErrNotFound
}

func (s *MemoryStore) EnsureExhibitorQRCode(ctx context.Context, expoID string, exhibitorID string) (domain.QRCodeRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, exhibitor := range s.exhibitors {
		if exhibitor.ExpoID == expoID && exhibitor.ExhibitorID == exhibitorID && exhibitor.ActivationStatus == "active" {
			targetPath := exhibitorQRTargetPath(expoID, exhibitor.ID)
			for index, code := range s.qrCodes {
				if code.ExpoExhibitorID == exhibitor.ID {
					if code.TargetPath != targetPath {
						code.TargetPath = targetPath
						s.qrCodes[index] = code
					}
					return code, nil
				}
			}
			shortCode := uniqueMemoryQRCode(s.qrCodes)
			code := domain.QRCodeRecord{
				ID: fmt.Sprintf("qr_%06d", len(s.qrCodes)+1), ExpoID: expoID, ExpoExhibitorID: exhibitor.ID,
				Code: shortCode, TargetPath: targetPath,
				Type: "exhibitor_booth", Active: true, CreatedAt: time.Now().UTC().Format(time.RFC3339),
			}
			s.qrCodes = append(s.qrCodes, code)
			return code, nil
		}
	}
	return domain.QRCodeRecord{}, ErrNotFound
}

func uniqueMemoryQRCode(items []domain.QRCodeRecord) string {
	for i := 0; i < 8; i++ {
		code := randomShortCode(6)
		if code == "" {
			break
		}
		exists := false
		for _, item := range items {
			if strings.EqualFold(item.Code, code) || strings.EqualFold(strings.TrimPrefix(item.ID, "qr_"), code) {
				exists = true
				break
			}
		}
		if !exists {
			return code
		}
	}
	return fmt.Sprintf("%06d", len(items)+1)
}

func (s *MemoryStore) ResolveQRCode(ctx context.Context, code string) (domain.QRCodeRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	lookup := strings.TrimSpace(code)
	for _, item := range s.qrCodes {
		if (strings.EqualFold(item.Code, lookup) || strings.EqualFold(item.ID, lookup) || strings.EqualFold(strings.TrimPrefix(item.ID, "qr_"), lookup)) && item.Active {
			return item, nil
		}
	}
	return domain.QRCodeRecord{}, ErrNotFound
}

func (s *MemoryStore) ListProducts(ctx context.Context, filter ProductFilter) ([]domain.ProductRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := []domain.ProductRecord{}
	for _, product := range s.products {
		if filter.ExhibitorID != "" && product.ExhibitorID != filter.ExhibitorID {
			continue
		}
		if filter.ExpoID != "" && product.ExpoID != filter.ExpoID {
			continue
		}
		items = append(items, product)
	}
	return items, nil
}

func (s *MemoryStore) ProductByID(ctx context.Context, id string, exhibitorID string) (domain.ProductRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, product := range s.products {
		if product.ID == id && (exhibitorID == "" || product.ExhibitorID == exhibitorID) {
			return product, nil
		}
	}
	return domain.ProductRecord{}, ErrNotFound
}

func (s *MemoryStore) CreateProduct(ctx context.Context, input domain.ProductInput, actor domain.User) (domain.ProductRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	product, err := s.productFromInputLocked("", input, actor)
	if err != nil {
		return domain.ProductRecord{}, err
	}
	product.ID = fmt.Sprintf("prd_%06d", len(s.products)+1)
	product.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	s.products = append([]domain.ProductRecord{product}, s.products...)
	return product, nil
}

func (s *MemoryStore) UpdateProduct(ctx context.Context, id string, input domain.ProductInput, actor domain.User) (domain.ProductRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, existing := range s.products {
		if existing.ID != id || existing.ExhibitorID != actor.ID {
			continue
		}
		product, err := s.productFromInputLocked(existing.CreatedAt, input, actor)
		if err != nil {
			return domain.ProductRecord{}, err
		}
		product.ID = existing.ID
		if product.CreatedAt == "" {
			product.CreatedAt = existing.CreatedAt
		}
		s.products[i] = product
		return product, nil
	}
	return domain.ProductRecord{}, ErrNotFound
}

func (s *MemoryStore) DeleteProduct(ctx context.Context, id string, actor domain.User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if actor.Role != domain.RoleExhibitor {
		return ErrInvalidCredentials
	}
	for i, product := range s.products {
		if product.ID != id || product.ExhibitorID != actor.ID {
			continue
		}
		s.products = append(s.products[:i], s.products[i+1:]...)
		return nil
	}
	return ErrNotFound
}

func (s *MemoryStore) ListLeads(ctx context.Context, filter LeadFilter) ([]domain.LeadRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := []domain.LeadRecord{}
	for _, lead := range s.leads {
		if filter.ExpoID != "" && lead.ExpoID != filter.ExpoID {
			continue
		}
		if filter.ExhibitorID != "" && lead.ExhibitorID != filter.ExhibitorID {
			continue
		}
		if filter.OrganizerID != "" {
			expo, ok := s.expoByIDLocked(lead.ExpoID)
			if !ok || expo.OrganizerID != filter.OrganizerID {
				continue
			}
		}
		if filter.CountryCode != "" {
			expo, ok := s.expoByIDLocked(lead.ExpoID)
			if !ok || !strings.EqualFold(expo.CountryCode, filter.CountryCode) {
				continue
			}
		}
		items = append(items, lead)
	}
	return items, nil
}

func (s *MemoryStore) CreateLead(ctx context.Context, expoExhibitorID string, input domain.LeadInput, actor domain.User) (domain.LeadRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var booth domain.ExpoExhibitor
	found := false
	for _, item := range s.exhibitors {
		if item.ID == expoExhibitorID {
			booth = item
			found = true
			break
		}
	}
	if !found {
		return domain.LeadRecord{}, ErrNotFound
	}
	name := strings.TrimSpace(input.Name)
	email := strings.TrimSpace(input.Email)
	if actor.ID != "" {
		if name == "" {
			name = actor.Name
		}
		if email == "" {
			email = actor.Email
		}
	}
	if name == "" {
		return domain.LeadRecord{}, ErrInvalidCredentials
	}
	lead := domain.LeadRecord{
		ID: fmt.Sprintf("lead_%06d", len(s.leads)+1), ExpoID: booth.ExpoID, ExpoName: booth.ExpoName, ExhibitorID: booth.ExhibitorID,
		VisitorName: name, VisitorEmail: email, VisitorPhone: strings.TrimSpace(input.Phone), Notes: strings.TrimSpace(input.Notes),
		Source: validLeadSource(input.Source, input.Action), Temperature: validLeadTemperature(input.Temperature), Status: "new",
		InterestedProductIds: compactStrings([]string{input.ProductID}),
		ProductName:          strings.TrimSpace(input.ProductName),
		ProductPrice:         input.ProductPrice,
		ProductCurrency:      strings.ToUpper(strings.TrimSpace(input.ProductCurrency)),
		Quantity:             input.Quantity,
		CapturedAt:           time.Now().UTC().Format(time.RFC3339),
	}
	s.leads = append([]domain.LeadRecord{lead}, s.leads...)
	s.activities = append([]domain.VisitorActivityItem{{
		ID: fmt.Sprintf("act_visitor_%06d", len(s.activities)+1), Type: "contact", Title: "Shared contact with " + booth.ExhibitorName,
		Description: "Lead captured for " + booth.ExpoName, Timestamp: lead.CapturedAt, ExpoID: booth.ExpoID, ExhibitorID: booth.ExhibitorID,
	}}, s.activities...)
	return lead, nil
}

func (s *MemoryStore) UpdateLead(ctx context.Context, id string, input domain.LeadUpdateInput, actor domain.User) (domain.LeadRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, lead := range s.leads {
		if lead.ID != id {
			continue
		}
		if actor.Role == domain.RoleExhibitor && lead.ExhibitorID != actor.ID {
			return domain.LeadRecord{}, ErrInvalidCredentials
		}
		if !isAdminRole(actor.Role) && actor.Role != domain.RoleExhibitor && actor.Role != domain.RoleOrganizer {
			return domain.LeadRecord{}, ErrInvalidCredentials
		}
		if strings.TrimSpace(input.Status) != "" {
			nextStatus := validLeadStatus(input.Status)
			if nextStatus != lead.Status {
				lead.Activities = append(lead.Activities, domain.LeadActivityRecord{ID: fmt.Sprintf("lact_%06d", len(s.leadActivities)+1), LeadID: id, Type: "status", Notes: "Status changed from " + fallbackString(lead.Status, "new") + " to " + nextStatus, CreatedAt: time.Now().UTC().Format(time.RFC3339)})
			}
			lead.Status = nextStatus
		}
		if strings.TrimSpace(input.Temperature) != "" {
			nextTemperature := validLeadTemperature(input.Temperature)
			if nextTemperature != lead.Temperature {
				lead.Activities = append(lead.Activities, domain.LeadActivityRecord{ID: fmt.Sprintf("lact_%06d", len(s.leadActivities)+2), LeadID: id, Type: "temperature", Notes: "Temperature changed from " + fallbackString(lead.Temperature, "warm") + " to " + nextTemperature, CreatedAt: time.Now().UTC().Format(time.RFC3339)})
			}
			lead.Temperature = nextTemperature
		}
		if strings.TrimSpace(input.FollowUpNotes) != "" {
			lead.FollowUpNotes = strings.TrimSpace(input.FollowUpNotes)
		}
		if strings.TrimSpace(input.NextFollowUpAt) != "" {
			lead.NextFollowUpAt = strings.TrimSpace(input.NextFollowUpAt)
		}
		if input.InterestedProductIds != nil {
			lead.InterestedProductIds = input.InterestedProductIds
		}
		s.leads[i] = lead
		return lead, nil
	}
	return domain.LeadRecord{}, ErrNotFound
}

func (s *MemoryStore) RecordLeadActivity(ctx context.Context, id string, input domain.LeadActivityInput, actor domain.User) (domain.LeadActivityRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, lead := range s.leads {
		if lead.ID != id {
			continue
		}
		if actor.Role == domain.RoleExhibitor && lead.ExhibitorID != actor.ID {
			return domain.LeadActivityRecord{}, ErrInvalidCredentials
		}
		activityType := validLeadActivityType(input.Type)
		now := time.Now().UTC()
		record := domain.LeadActivityRecord{ID: fmt.Sprintf("lact_%06d", len(s.leadActivities)+1), LeadID: id, Type: activityType, Notes: strings.TrimSpace(input.Notes), ScheduledAt: strings.TrimSpace(input.ScheduledAt), CreatedAt: now.Format(time.RFC3339)}
		s.leadActivities = append([]domain.LeadActivityRecord{record}, s.leadActivities...)
		lead.Activities = append(lead.Activities, record)
		lead.LastActivity = activityType
		if activityType == "call" || activityType == "email" || activityType == "whatsapp" || activityType == "meeting" {
			lead.LastContactedAt = now.Format(time.RFC3339)
			if lead.Status == "" || lead.Status == "new" {
				lead.Status = "contacted"
			}
		}
		if strings.TrimSpace(input.ScheduledAt) != "" {
			lead.NextFollowUpAt = strings.TrimSpace(input.ScheduledAt)
		}
		if strings.TrimSpace(input.Notes) != "" {
			lead.FollowUpNotes = strings.TrimSpace(input.Notes)
		}
		s.leads[i] = lead
		return record, nil
	}
	return domain.LeadActivityRecord{}, ErrNotFound
}

func (s *MemoryStore) ListChatThreads(ctx context.Context, filter ChatThreadFilter, actor domain.User) ([]domain.ExhibitorConversationThread, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := []domain.ExhibitorConversationThread{}
	for _, thread := range s.chatThreads {
		if filter.ThreadID != "" && thread.ID != filter.ThreadID {
			continue
		}
		if filter.ExpoID != "" && thread.ExpoID != filter.ExpoID {
			continue
		}
		if filter.ExhibitorID != "" && thread.ExhibitorID != filter.ExhibitorID {
			continue
		}
		if filter.VisitorID != "" && thread.VisitorID != filter.VisitorID {
			continue
		}
		if actor.Role == domain.RoleVisitor && thread.VisitorID != actor.ID {
			continue
		}
		if actor.Role == domain.RoleExhibitor && thread.ExhibitorID != actor.ID {
			continue
		}
		thread.Messages = s.chatMessagesForThreadLocked(thread.ID)
		thread.UnreadCount = chatUnreadCount(thread.Messages, actor.Role)
		items = append(items, thread)
	}
	sort.Slice(items, func(i, j int) bool { return items[i].LastMessageAt > items[j].LastMessageAt })
	return items, nil
}

func (s *MemoryStore) CreateChatMessage(ctx context.Context, expoID string, exhibitorID string, input domain.ChatMessageInput, actor domain.User) (domain.ExhibitorConversationThread, domain.ChatMessageRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	message := strings.TrimSpace(input.Message)
	if message == "" || len(message) > 2000 || (actor.Role != domain.RoleVisitor && actor.Role != domain.RoleExhibitor) {
		return domain.ExhibitorConversationThread{}, domain.ChatMessageRecord{}, ErrInvalidCredentials
	}
	expoID = strings.TrimSpace(expoID)
	exhibitorID = strings.TrimSpace(exhibitorID)
	if !s.expoExhibitorExistsLocked(expoID, exhibitorID) {
		return domain.ExhibitorConversationThread{}, domain.ChatMessageRecord{}, ErrNotFound
	}
	if actor.Role == domain.RoleExhibitor && actor.ID != exhibitorID {
		return domain.ExhibitorConversationThread{}, domain.ChatMessageRecord{}, ErrInvalidCredentials
	}
	var exhibitor domain.User
	for _, demo := range s.users {
		if demo.User.ID == exhibitorID {
			exhibitor = demo.User
			break
		}
	}
	if exhibitor.ID == "" {
		return domain.ExhibitorConversationThread{}, domain.ChatMessageRecord{}, ErrNotFound
	}
	visitorID := actor.ID
	threadIndex := -1
	if actor.Role == domain.RoleExhibitor {
		for i, thread := range s.chatThreads {
			if thread.ExpoID == expoID && thread.ExhibitorID == exhibitorID && thread.ID == strings.TrimSpace(input.ThreadID) {
				threadIndex = i
				visitorID = thread.VisitorID
				break
			}
		}
	} else {
		for i, thread := range s.chatThreads {
			if thread.ExpoID == expoID && thread.ExhibitorID == exhibitorID && thread.VisitorID == visitorID {
				threadIndex = i
				break
			}
		}
	}
	now := time.Now().UTC().Format(time.RFC3339)
	if threadIndex == -1 {
		if actor.Role != domain.RoleVisitor {
			return domain.ExhibitorConversationThread{}, domain.ChatMessageRecord{}, ErrNotFound
		}
		thread := domain.ExhibitorConversationThread{
			ID: "chat_" + expoID + "_" + exhibitorID + "_" + actor.ID, ExpoID: expoID, ExhibitorID: exhibitorID,
			ExhibitorName: nonEmptyString(exhibitor.CompanyName, exhibitor.Name), VisitorID: actor.ID, VisitorName: actor.Name,
			VisitorEmail: actor.Email, CreatedAt: now,
		}
		s.chatThreads = append([]domain.ExhibitorConversationThread{thread}, s.chatThreads...)
		threadIndex = 0
	}
	thread := s.chatThreads[threadIndex]
	record := domain.ChatMessageRecord{
		ID: fmt.Sprintf("chatmsg_%06d", len(s.chatMessages)+1), ThreadID: thread.ID, ExpoID: expoID, ExhibitorID: exhibitorID, VisitorID: thread.VisitorID,
		SenderID: actor.ID, SenderRole: actor.Role, SenderName: nonEmptyString(actor.CompanyName, actor.Name), Message: message,
		CreatedAt: now, ReadByVisitor: actor.Role == domain.RoleVisitor, ReadByExhibitor: actor.Role == domain.RoleExhibitor,
	}
	s.chatMessages = append(s.chatMessages, record)
	thread.LastMessage = message
	thread.LastMessageAt = now
	thread.Messages = s.chatMessagesForThreadLocked(thread.ID)
	thread.UnreadCount = chatUnreadCount(thread.Messages, actor.Role)
	s.chatThreads[threadIndex] = thread
	return thread, record, nil
}

func (s *MemoryStore) MarkChatThreadRead(ctx context.Context, expoID string, exhibitorID string, actor domain.User) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if actor.Role != domain.RoleVisitor && actor.Role != domain.RoleExhibitor {
		return 0, ErrInvalidCredentials
	}
	expoID = strings.TrimSpace(expoID)
	exhibitorID = strings.TrimSpace(exhibitorID)
	threadID := ""
	for _, thread := range s.chatThreads {
		if thread.ExpoID != expoID || thread.ExhibitorID != exhibitorID {
			continue
		}
		if actor.Role == domain.RoleVisitor && thread.VisitorID != actor.ID {
			continue
		}
		if actor.Role == domain.RoleExhibitor && thread.ExhibitorID != actor.ID {
			continue
		}
		threadID = thread.ID
		break
	}
	if threadID == "" {
		return 0, ErrNotFound
	}
	updated := 0
	for i, message := range s.chatMessages {
		if message.ThreadID != threadID {
			continue
		}
		if actor.Role == domain.RoleVisitor && !message.ReadByVisitor {
			s.chatMessages[i].ReadByVisitor = true
			updated++
		}
		if actor.Role == domain.RoleExhibitor && !message.ReadByExhibitor {
			s.chatMessages[i].ReadByExhibitor = true
			updated++
		}
	}
	return updated, nil
}

func (s *MemoryStore) ExhibitorLiveStream(ctx context.Context, expoID string, exhibitorID string) (domain.ExhibitorLiveStreamRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.expoExhibitorExistsLocked(expoID, exhibitorID) {
		return domain.ExhibitorLiveStreamRecord{}, ErrNotFound
	}
	for _, item := range s.exhibitorLiveStreams {
		if item.ExpoID == expoID && item.ExhibitorID == exhibitorID {
			return item, nil
		}
	}
	return domain.ExhibitorLiveStreamRecord{ExpoID: expoID, ExhibitorID: exhibitorID, Title: "Expo live stream", Enabled: false}, nil
}

func (s *MemoryStore) UpdateExhibitorLiveStream(ctx context.Context, expoID string, exhibitorID string, input domain.ExhibitorLiveStreamInput, actor domain.User) (domain.ExhibitorLiveStreamRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if actor.Role != domain.RoleExhibitor || actor.ID != exhibitorID {
		return domain.ExhibitorLiveStreamRecord{}, ErrInvalidCredentials
	}
	if !s.expoExhibitorExistsLocked(expoID, exhibitorID) {
		return domain.ExhibitorLiveStreamRecord{}, ErrNotFound
	}
	url := strings.TrimSpace(input.YoutubeURL)
	if input.Enabled && !isYouTubeURL(url) {
		return domain.ExhibitorLiveStreamRecord{}, ErrInvalidCredentials
	}
	now := time.Now().UTC().Format(time.RFC3339)
	item := domain.ExhibitorLiveStreamRecord{
		ExpoID: expoID, ExhibitorID: exhibitorID, Title: defaultString(strings.TrimSpace(input.Title), "Expo live stream"),
		YoutubeURL: url, EmbedURL: youtubeEmbedURL(url), Enabled: input.Enabled && url != "", LiveChatEnabled: input.LiveChatEnabled && input.Enabled && url != "", UpdatedAt: now,
	}
	for i, existing := range s.exhibitorLiveStreams {
		if existing.ExpoID == expoID && existing.ExhibitorID == exhibitorID {
			s.exhibitorLiveStreams[i] = item
			return item, nil
		}
	}
	s.exhibitorLiveStreams = append([]domain.ExhibitorLiveStreamRecord{item}, s.exhibitorLiveStreams...)
	return item, nil
}

func (s *MemoryStore) ListExhibitorFeedback(ctx context.Context, filter ExhibitorFeedbackFilter) ([]domain.ExhibitorFeedbackRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := []domain.ExhibitorFeedbackRecord{}
	for _, item := range s.exhibitorFeedback {
		if filter.ExpoID != "" && item.ExpoID != filter.ExpoID {
			continue
		}
		if filter.ExhibitorID != "" && item.ExhibitorID != filter.ExhibitorID {
			continue
		}
		if filter.VisitorID != "" && item.VisitorID != filter.VisitorID {
			continue
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *MemoryStore) CreateExhibitorFeedback(ctx context.Context, input domain.ExhibitorFeedbackInput, actor domain.User) (domain.ExhibitorFeedbackRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	expoID := strings.TrimSpace(input.ExpoID)
	exhibitorID := strings.TrimSpace(input.ExhibitorID)
	if actor.Role != domain.RoleVisitor || expoID == "" || exhibitorID == "" || input.Rating < 1 || input.Rating > 5 || strings.TrimSpace(input.Comment) == "" {
		return domain.ExhibitorFeedbackRecord{}, ErrInvalidCredentials
	}
	assigned := false
	for _, item := range s.exhibitors {
		if item.ExpoID == expoID && item.ExhibitorID == exhibitorID {
			assigned = true
			break
		}
	}
	if !assigned {
		return domain.ExhibitorFeedbackRecord{}, ErrNotFound
	}
	now := time.Now().UTC().Format(time.RFC3339)
	item := domain.ExhibitorFeedbackRecord{
		ID: fmt.Sprintf("xfb_%06d", len(s.exhibitorFeedback)+1), ExpoID: expoID, ExhibitorID: exhibitorID, VisitorID: actor.ID,
		VisitorName: actor.Name, VisitorEmail: actor.Email, Rating: input.Rating, Comment: strings.TrimSpace(input.Comment), SubmittedAt: now,
	}
	s.exhibitorFeedback = append([]domain.ExhibitorFeedbackRecord{item}, s.exhibitorFeedback...)
	return item, nil
}

func (s *MemoryStore) ListOrganizerFeedback(ctx context.Context, organizerID string) ([]domain.OrganizerFeedbackRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := []domain.OrganizerFeedbackRecord{}
	for _, item := range s.organizerFeedback {
		if organizerID != "" && item.OrganizerID != organizerID {
			continue
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *MemoryStore) CreateOrganizerFeedback(ctx context.Context, expoID string, exhibitorID string, input domain.OrganizerFeedbackInput, actor domain.User) (domain.OrganizerFeedbackRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	expoID = strings.TrimSpace(expoID)
	exhibitorID = strings.TrimSpace(exhibitorID)
	comment := strings.TrimSpace(input.Comment)
	improvements := strings.TrimSpace(input.Improvements)
	dislikes := strings.TrimSpace(input.Dislikes)
	category := organizerFeedbackCategory(input.Category)
	if actor.Role != domain.RoleExhibitor || expoID == "" || exhibitorID == "" || input.Rating < 1 || input.Rating > 5 || comment == "" {
		return domain.OrganizerFeedbackRecord{}, ErrInvalidCredentials
	}
	var expo domain.Expo
	foundExpo := false
	for _, item := range s.expos {
		if item.ID == expoID {
			expo = item
			foundExpo = true
			break
		}
	}
	if !foundExpo || expo.OrganizerID == "" {
		return domain.OrganizerFeedbackRecord{}, ErrNotFound
	}
	assigned := false
	for _, item := range s.exhibitors {
		if item.ExpoID == expoID && item.ExhibitorID == exhibitorID {
			assigned = true
			break
		}
	}
	if !assigned {
		return domain.OrganizerFeedbackRecord{}, ErrNotFound
	}
	now := time.Now().UTC().Format(time.RFC3339)
	item := domain.OrganizerFeedbackRecord{
		ID: fmt.Sprintf("ofb_%06d", len(s.organizerFeedback)+1), ExpoID: expo.ID, ExpoName: expo.Name, OrganizerID: expo.OrganizerID,
		ExhibitorID: exhibitorID, ExhibitorName: nonEmptyString(actor.CompanyName, actor.Name), Rating: input.Rating, Category: category,
		Comment: comment, Improvements: improvements, Dislikes: dislikes, SubmittedAt: now,
	}
	s.organizerFeedback = append([]domain.OrganizerFeedbackRecord{item}, s.organizerFeedback...)
	return item, nil
}

func (s *MemoryStore) ListExhibitorCampaignDrafts(ctx context.Context, filter ExhibitorCampaignDraftFilter) ([]domain.ExhibitorCampaignDraftRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := []domain.ExhibitorCampaignDraftRecord{}
	for _, item := range s.exhibitorCampaignDrafts {
		if filter.ExpoID != "" && item.ExpoID != filter.ExpoID {
			continue
		}
		if filter.ExhibitorID != "" && item.ExhibitorID != filter.ExhibitorID {
			continue
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *MemoryStore) CreateExhibitorCampaignDraft(ctx context.Context, expoID string, exhibitorID string, input domain.ExhibitorCampaignDraftInput, actor domain.User) (domain.ExhibitorCampaignDraftRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if actor.Role != domain.RoleExhibitor {
		return domain.ExhibitorCampaignDraftRecord{}, ErrInvalidCredentials
	}
	expoID = strings.TrimSpace(expoID)
	exhibitorID = strings.TrimSpace(exhibitorID)
	assigned := false
	for _, item := range s.exhibitors {
		if item.ExpoID == expoID && item.ExhibitorID == exhibitorID {
			assigned = true
			break
		}
	}
	if !assigned {
		return domain.ExhibitorCampaignDraftRecord{}, ErrNotFound
	}
	channel := validCampaignChannel(input.Channel)
	name := strings.TrimSpace(input.Name)
	audience := validCampaignAudience(input.Audience)
	subject := strings.TrimSpace(input.Subject)
	message := strings.TrimSpace(input.Message)
	if channel == "" || name == "" || audience == "" || subject == "" || message == "" {
		return domain.ExhibitorCampaignDraftRecord{}, ErrInvalidCredentials
	}
	now := time.Now().UTC().Format(time.RFC3339)
	item := domain.ExhibitorCampaignDraftRecord{
		ID: fmt.Sprintf("xcd_%06d", len(s.exhibitorCampaignDrafts)+1), ExpoID: expoID, ExhibitorID: exhibitorID,
		Channel: channel, Name: name, Audience: audience, Subject: subject, Message: message, Status: "draft", CreatedAt: now, UpdatedAt: now,
	}
	s.exhibitorCampaignDrafts = append([]domain.ExhibitorCampaignDraftRecord{item}, s.exhibitorCampaignDrafts...)
	return item, nil
}

func (s *MemoryStore) ListMeetings(ctx context.Context, filter MeetingFilter) ([]domain.MeetingRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := []domain.MeetingRecord{}
	for _, item := range s.meetings {
		if filter.ExpoID != "" && item.ExpoID != filter.ExpoID {
			continue
		}
		if filter.ExhibitorID != "" && item.ExhibitorID != filter.ExhibitorID {
			continue
		}
		if filter.VisitorID != "" || strings.TrimSpace(filter.VisitorEmail) != "" {
			matchesVisitor := filter.VisitorID != "" && item.VisitorID == filter.VisitorID
			if !matchesVisitor && strings.TrimSpace(filter.VisitorEmail) != "" {
				matchesVisitor = strings.EqualFold(strings.TrimSpace(item.VisitorEmail), strings.TrimSpace(filter.VisitorEmail))
				for _, email := range item.CCEmails {
					if strings.EqualFold(strings.TrimSpace(email), strings.TrimSpace(filter.VisitorEmail)) {
						matchesVisitor = true
						break
					}
				}
			}
			if !matchesVisitor {
				continue
			}
		}
		items = append(items, item)
	}
	sort.Slice(items, func(i, j int) bool { return items[i].ScheduledAt < items[j].ScheduledAt })
	return items, nil
}

func (s *MemoryStore) CreateMeeting(ctx context.Context, expoID string, exhibitorID string, input domain.MeetingInput, actor domain.User) (domain.MeetingRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	scheduledAt := strings.TrimSpace(input.ScheduledAt)
	if _, err := time.Parse(time.RFC3339, scheduledAt); err != nil {
		return domain.MeetingRecord{}, ErrInvalidCredentials
	}
	var lead domain.LeadRecord
	if strings.TrimSpace(input.LeadID) != "" {
		for i, item := range s.leads {
			if item.ID == input.LeadID && item.ExpoID == expoID && item.ExhibitorID == exhibitorID {
				lead = item
				s.leads[i].Status = "meeting_booked"
				s.leads[i].NextFollowUpAt = scheduledAt
				break
			}
		}
	}
	if lead.ID == "" {
		name := strings.TrimSpace(input.VisitorName)
		email := strings.TrimSpace(input.VisitorEmail)
		if actor.Role == domain.RoleVisitor {
			if name == "" {
				name = actor.Name
			}
			if email == "" {
				email = actor.Email
			}
		}
		if name == "" {
			return domain.MeetingRecord{}, ErrInvalidCredentials
		}
		lead = domain.LeadRecord{
			ID: fmt.Sprintf("lead_%06d", len(s.leads)+1), ExpoID: expoID, ExhibitorID: exhibitorID,
			VisitorName: name, VisitorEmail: email, VisitorPhone: strings.TrimSpace(input.VisitorPhone),
			Notes: strings.TrimSpace(input.Notes), Source: "inquiry", Temperature: "warm", Status: "meeting_booked",
			NextFollowUpAt: scheduledAt, LastActivity: "meeting", CapturedAt: time.Now().UTC().Format(time.RFC3339),
		}
		s.leads = append([]domain.LeadRecord{lead}, s.leads...)
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		title = "Meeting with " + fallbackString(lead.VisitorName, "visitor")
	}
	location := strings.TrimSpace(input.Location)
	if location == "" {
		return domain.MeetingRecord{}, ErrInvalidCredentials
	}
	now := time.Now().UTC()
	meeting := domain.MeetingRecord{
		ID: fmt.Sprintf("meet_%06d", len(s.meetings)+1), LeadID: lead.ID, ExpoID: expoID, ExhibitorID: exhibitorID,
		VisitorID: "", VisitorName: lead.VisitorName, VisitorEmail: lead.VisitorEmail, VisitorPhone: lead.VisitorPhone,
		Title: title, MeetingType: validMeetingType(input.MeetingType), ScheduledAt: scheduledAt,
		LocationOrLink: location, CCEmails: compactStrings(input.CCEmails), Status: "scheduled", CreatedAt: now.Format(time.RFC3339),
	}
	s.meetings = append([]domain.MeetingRecord{meeting}, s.meetings...)
	return meeting, nil
}

func (s *MemoryStore) DeleteMeeting(ctx context.Context, id string, expoID string, exhibitorID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for index, item := range s.meetings {
		if item.ID == id && item.ExpoID == expoID && item.ExhibitorID == exhibitorID {
			s.meetings = append(s.meetings[:index], s.meetings[index+1:]...)
			return nil
		}
	}
	return ErrNotFound
}

func (s *MemoryStore) CancelMeetingNotifications(ctx context.Context, meetingID string) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	count := 0
	for index, item := range s.notifications {
		if item.Status != "queued" || notificationPayloadString(item.Payload, "meetingId") != meetingID {
			continue
		}
		item.Status = "cancelled"
		s.notifications[index] = item
		count++
	}
	return count, nil
}

func (s *MemoryStore) CancelLeadFollowUpNotifications(ctx context.Context, leadID string) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	count := 0
	for index, item := range s.notifications {
		if item.Status != "queued" || item.TemplateKey != "lead_follow_up_reminder" || notificationPayloadString(item.Payload, "leadId") != leadID {
			continue
		}
		item.Status = "cancelled"
		s.notifications[index] = item
		count++
	}
	return count, nil
}

func (s *MemoryStore) RecordVisitorActivity(ctx context.Context, actor domain.User, expoID string, expoExhibitorID string, activityType string, description string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.activities = append([]domain.VisitorActivityItem{{
		ID: fmt.Sprintf("act_visitor_%06d", len(s.activities)+1), Type: activityType, Title: description,
		Description: description, Timestamp: time.Now().UTC().Format(time.RFC3339), ExpoID: expoID, ExhibitorID: expoExhibitorID,
	}}, s.activities...)
	return nil
}

func (s *MemoryStore) VisitorTimeline(ctx context.Context, visitorID string) ([]domain.VisitorTimelineDay, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	grouped := map[string][]domain.VisitorActivityItem{}
	for _, activity := range s.activities {
		day := activity.Timestamp
		if len(day) >= 10 {
			day = day[:10]
		}
		grouped[day] = append(grouped[day], activity)
	}
	days := []domain.VisitorTimelineDay{}
	for day, activities := range grouped {
		days = append(days, domain.VisitorTimelineDay{Date: day, Activities: activities})
	}
	return days, nil
}

func (s *MemoryStore) VisitorFavorites(ctx context.Context, visitorID string) ([]domain.VisitorFavoriteRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := []domain.VisitorFavoriteRecord{}
	for _, favorite := range s.favorites {
		if favorite.VisitorID == visitorID {
			items = append(items, favorite.Record)
		}
	}
	sort.Slice(items, func(i, j int) bool { return items[i].AddedAt > items[j].AddedAt })
	return items, nil
}

func (s *MemoryStore) AddVisitorFavorite(ctx context.Context, visitorID string, input domain.VisitorFavoriteInput) (domain.VisitorFavoriteRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	favoriteType := strings.ToLower(strings.TrimSpace(input.Type))
	itemID := strings.TrimSpace(input.ItemID)
	if visitorID == "" || itemID == "" || (favoriteType != "expo" && favoriteType != "exhibitor") {
		return domain.VisitorFavoriteRecord{}, ErrInvalidCredentials
	}
	for _, favorite := range s.favorites {
		if favorite.VisitorID == visitorID && favorite.Record.Type == favoriteType && favorite.Record.ItemID == itemID {
			return favorite.Record, nil
		}
	}
	name := ""
	image := ""
	if favoriteType == "expo" {
		for _, expo := range s.expos {
			if expo.ID == itemID {
				name = expo.Name
				image = expo.CoverImageURL
				break
			}
		}
	} else {
		for _, assignment := range s.exhibitors {
			if assignment.ID == itemID || assignment.ExhibitorID == itemID {
				name = assignment.ExhibitorName
				if profile, ok := s.exhibitorProfiles[assignment.ExhibitorID]; ok {
					image = profile.LogoURL
				}
				break
			}
		}
	}
	if strings.TrimSpace(name) == "" {
		return domain.VisitorFavoriteRecord{}, ErrNotFound
	}
	record := domain.VisitorFavoriteRecord{
		ID: fmt.Sprintf("vf_%06d", len(s.favorites)+1), Type: favoriteType, ItemID: itemID, Name: name, Image: image, AddedAt: time.Now().UTC().Format(time.RFC3339),
	}
	if favoriteType == "expo" {
		record.ExpoID = itemID
	} else {
		for _, assignment := range s.exhibitors {
			if assignment.ID == itemID || assignment.ExhibitorID == itemID {
				record.ExpoID = assignment.ExpoID
				break
			}
		}
	}
	s.favorites = append([]memoryFavorite{{VisitorID: visitorID, Record: record}}, s.favorites...)
	return record, nil
}

func (s *MemoryStore) DeleteVisitorFavorite(ctx context.Context, visitorID string, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	next := s.favorites[:0]
	removed := false
	for _, favorite := range s.favorites {
		if favorite.VisitorID == visitorID && favorite.Record.ID == id {
			removed = true
			continue
		}
		next = append(next, favorite)
	}
	s.favorites = next
	if !removed {
		return ErrNotFound
	}
	return nil
}

func (s *MemoryStore) CreateVisitorBooking(ctx context.Context, expoID string, ticketType string, actor domain.User) (domain.VisitorBookingRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	expo, ok := s.expoByIDLocked(expoID)
	if !ok {
		return domain.VisitorBookingRecord{}, ErrNotFound
	}
	booking := visitorBookingFromExpo(expo, actor, ticketType, len(s.bookings)+1)
	s.bookings = append([]domain.VisitorBookingRecord{booking}, s.bookings...)
	return booking, nil
}

func (s *MemoryStore) VisitorBookings(ctx context.Context, visitorID string) ([]domain.VisitorBookingRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]domain.VisitorBookingRecord(nil), s.bookings...), nil
}

func (s *MemoryStore) CreateNotification(ctx context.Context, input domain.NotificationInput, actor domain.User) (domain.Notification, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	scheduledAt := time.Now().UTC()
	if strings.TrimSpace(input.ScheduledAt) != "" {
		if parsed, err := time.Parse(time.RFC3339, input.ScheduledAt); err == nil {
			scheduledAt = parsed
		}
	}
	recipient := s.userDisplayName(input.UserID)
	recipientEmail := ""
	recipientPhone := notificationPayloadString(input.Payload, "phone")
	if user, ok := s.userByIDLocked(input.UserID); ok {
		recipientEmail = user.Email
	}
	notification := domain.Notification{
		ID: fmt.Sprintf("ntf_%06d", len(s.notifications)+1), UserID: strings.TrimSpace(input.UserID), Recipient: recipient, RecipientEmail: recipientEmail, RecipientPhone: recipientPhone,
		ExpoID: strings.TrimSpace(input.ExpoID), Role: input.Role, Channel: defaultString(input.Channel, "in_app"),
		TemplateKey: defaultString(input.TemplateKey, "general_notice"), Payload: input.Payload, Status: "queued", ScheduledAt: scheduledAt,
	}
	if notification.Payload == nil {
		notification.Payload = map[string]any{}
	}
	if notification.Role == "" && notification.UserID != "" {
		if user, ok := s.userByIDLocked(notification.UserID); ok {
			notification.Role = user.Role
		}
	}
	s.notifications = append([]domain.Notification{notification}, s.notifications...)
	return notification, nil
}

func (s *MemoryStore) ListNotifications(ctx context.Context, filter NotificationFilter) ([]domain.Notification, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := []domain.Notification{}
	for _, item := range s.notifications {
		if filter.UserID != "" && item.UserID != filter.UserID {
			continue
		}
		if filter.UserID != "" && item.Status == "queued" && item.ScheduledAt.After(time.Now().UTC()) {
			continue
		}
		if filter.Role != "" && item.Role != filter.Role {
			continue
		}
		if filter.ExpoID != "" && item.ExpoID != filter.ExpoID {
			continue
		}
		if filter.UserID != "" && item.DismissedAt != nil {
			continue
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *MemoryStore) DueNotifications(ctx context.Context, nowValue string) ([]domain.Notification, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	if parsed, err := time.Parse(time.RFC3339, nowValue); err == nil {
		now = parsed
	}
	items := []domain.Notification{}
	for _, item := range s.notifications {
		if item.Status == "queued" && !item.ScheduledAt.After(now) {
			items = append(items, item)
		}
	}
	return items, nil
}

func (s *MemoryStore) UpdateNotificationDelivery(ctx context.Context, id string, status string, sentAt string, failureReason string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	var parsedSentAt *time.Time
	if strings.TrimSpace(sentAt) != "" {
		if parsed, err := time.Parse(time.RFC3339, sentAt); err == nil {
			parsedSentAt = &parsed
		}
	}
	for i, item := range s.notifications {
		if item.ID == id {
			item.Status = status
			item.SentAt = parsedSentAt
			item.FailureReason = failureReason
			s.notifications[i] = item
			return nil
		}
	}
	return ErrNotFound
}

func (s *MemoryStore) MarkNotificationRead(ctx context.Context, id string, userID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	for i, item := range s.notifications {
		if item.ID == id && item.UserID == userID && item.DismissedAt == nil {
			item.ReadAt = &now
			s.notifications[i] = item
			return nil
		}
	}
	return ErrNotFound
}

func (s *MemoryStore) MarkNotificationsRead(ctx context.Context, userID string) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	count := 0
	for i, item := range s.notifications {
		if item.UserID == userID && item.DismissedAt == nil && item.ReadAt == nil {
			item.ReadAt = &now
			s.notifications[i] = item
			count++
		}
	}
	return count, nil
}

func (s *MemoryStore) DismissNotification(ctx context.Context, id string, userID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	for i, item := range s.notifications {
		if item.ID == id && item.UserID == userID {
			item.DismissedAt = &now
			item.ReadAt = &now
			s.notifications[i] = item
			return nil
		}
	}
	return ErrNotFound
}

func (s *MemoryStore) RecordNotificationAttempt(ctx context.Context, attempt domain.NotificationAttempt) (domain.NotificationAttempt, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if attempt.ID == "" {
		attempt.ID = fmt.Sprintf("nta_%06d", len(s.notificationAttempts)+1)
	}
	if attempt.CreatedAt.IsZero() {
		attempt.CreatedAt = time.Now().UTC()
	}
	if attempt.RequestPayload == nil {
		attempt.RequestPayload = map[string]any{}
	}
	if attempt.ResponsePayload == nil {
		attempt.ResponsePayload = map[string]any{}
	}
	s.notificationAttempts = append([]domain.NotificationAttempt{attempt}, s.notificationAttempts...)
	return attempt, nil
}

func (s *MemoryStore) ListNotificationAttempts(ctx context.Context, notificationID string) ([]domain.NotificationAttempt, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := []domain.NotificationAttempt{}
	for _, item := range s.notificationAttempts {
		if notificationID != "" && item.NotificationID != notificationID {
			continue
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *MemoryStore) MarkDueNotificationsSent(ctx context.Context) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	count := 0
	for i, item := range s.notifications {
		if item.Status == "queued" && !item.ScheduledAt.After(now) {
			item.Status = "sent"
			item.SentAt = &now
			s.notifications[i] = item
			count++
		}
	}
	return count, nil
}

func (s *MemoryStore) SponsorPlans(ctx context.Context, countryCode string) ([]domain.SponsorPlanRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := []domain.SponsorPlanRecord{}
	for _, item := range s.sponsorPlans {
		if countryCode != "" && !strings.EqualFold(item.CountryCode, countryCode) {
			continue
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *MemoryStore) SponsorPlanByID(ctx context.Context, id string) (domain.SponsorPlanRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, item := range s.sponsorPlans {
		if item.ID == id {
			return item, nil
		}
	}
	return domain.SponsorPlanRecord{}, ErrNotFound
}

func (s *MemoryStore) CreateSponsorPlan(ctx context.Context, input domain.SponsorPlanInput, actor domain.User) (domain.SponsorPlanRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	input = s.sponsorPlanInputWithCountryCurrencyLocked(input)
	if !isAdminRole(actor.Role) || !validSponsorPlanInput(input) {
		return domain.SponsorPlanRecord{}, ErrInvalidCredentials
	}
	item := sponsorPlanFromInput(fmt.Sprintf("spn_%d", time.Now().UnixNano()), input)
	item.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	s.sponsorPlans = append([]domain.SponsorPlanRecord{item}, s.sponsorPlans...)
	return item, nil
}

func (s *MemoryStore) UpdateSponsorPlan(ctx context.Context, id string, input domain.SponsorPlanInput, actor domain.User) (domain.SponsorPlanRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !isAdminRole(actor.Role) || strings.TrimSpace(id) == "" {
		return domain.SponsorPlanRecord{}, ErrInvalidCredentials
	}
	for i, item := range s.sponsorPlans {
		if item.ID != id {
			continue
		}
		merged := item
		if strings.TrimSpace(input.Name) != "" {
			merged.Name = strings.TrimSpace(input.Name)
		}
		if strings.TrimSpace(input.Description) != "" {
			merged.Description = strings.TrimSpace(input.Description)
		}
		if strings.TrimSpace(input.Tier) != "" {
			merged.Tier = strings.TrimSpace(input.Tier)
		}
		if input.Price >= 0 {
			merged.Price = input.Price
		}
		if strings.TrimSpace(input.Currency) != "" {
			merged.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
		}
		if strings.TrimSpace(input.BillingCycle) != "" {
			merged.BillingCycle = strings.TrimSpace(input.BillingCycle)
		}
		if input.Features != nil {
			merged.Features = input.Features
		}
		if strings.TrimSpace(input.CountryCode) != "" {
			merged.CountryCode = strings.ToUpper(strings.TrimSpace(input.CountryCode))
		}
		merged.Currency = s.defaultCurrencyForCountryLocked(merged.CountryCode, merged.Currency)
		if input.OrganizerCommissionPercent >= 0 {
			merged.OrganizerCommissionPercent = input.OrganizerCommissionPercent
		}
		if strings.TrimSpace(input.Status) != "" {
			merged.Status = strings.TrimSpace(input.Status)
		}
		if !validSponsorPlanRecord(merged) {
			return domain.SponsorPlanRecord{}, ErrInvalidCredentials
		}
		s.sponsorPlans[i] = merged
		return merged, nil
	}
	return domain.SponsorPlanRecord{}, ErrNotFound
}

func (s *MemoryStore) UpdateSponsorPlanStatus(ctx context.Context, id string, status string, actor domain.User) (domain.SponsorPlanRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	status = strings.TrimSpace(status)
	if !isAdminRole(actor.Role) || strings.TrimSpace(id) == "" {
		return domain.SponsorPlanRecord{}, ErrInvalidCredentials
	}
	switch status {
	case "active", "inactive", "archived":
	default:
		return domain.SponsorPlanRecord{}, ErrInvalidCredentials
	}
	for i, item := range s.sponsorPlans {
		if item.ID == id {
			s.sponsorPlans[i].Status = status
			return s.sponsorPlans[i], nil
		}
	}
	return domain.SponsorPlanRecord{}, ErrNotFound
}

func (s *MemoryStore) sponsorPlanInputWithCountryCurrencyLocked(input domain.SponsorPlanInput) domain.SponsorPlanInput {
	input.CountryCode = defaultString(strings.ToUpper(strings.TrimSpace(input.CountryCode)), "KE")
	input.Currency = s.defaultCurrencyForCountryLocked(input.CountryCode, input.Currency)
	return input
}

func (s *MemoryStore) defaultCurrencyForCountryLocked(countryCode string, fallback string) string {
	countryCode = strings.ToUpper(strings.TrimSpace(countryCode))
	for _, country := range s.countries {
		if country.Active && strings.EqualFold(country.Code, countryCode) && strings.TrimSpace(country.DefaultCurrency) != "" {
			return strings.ToUpper(strings.TrimSpace(country.DefaultCurrency))
		}
	}
	return defaultString(strings.ToUpper(strings.TrimSpace(fallback)), "KES")
}

func (s *MemoryStore) ListSponsorCampaigns(ctx context.Context, sponsorID string) ([]domain.SponsorCampaignRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := []domain.SponsorCampaignRecord{}
	for _, item := range s.sponsorCampaigns {
		if sponsorID != "" && item.SponsorID != sponsorID {
			continue
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *MemoryStore) SponsorCampaignByID(ctx context.Context, id string, sponsorID string) (domain.SponsorCampaignRecord, error) {
	items, _ := s.ListSponsorCampaigns(ctx, sponsorID)
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return domain.SponsorCampaignRecord{}, ErrNotFound
}

func (s *MemoryStore) CreateSponsorCampaign(ctx context.Context, input domain.SponsorCampaignInput, actor domain.User) (domain.SponsorCampaignRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if actor.Role != domain.RoleSponsor || strings.TrimSpace(input.Name) == "" {
		return domain.SponsorCampaignRecord{}, ErrInvalidCredentials
	}
	now := time.Now().UTC()
	item := domain.SponsorCampaignRecord{
		ID: fmt.Sprintf("sc_%06d", len(s.sponsorCampaigns)+1), SponsorID: actor.ID, Name: strings.TrimSpace(input.Name), Objective: strings.TrimSpace(input.Objective),
		Budget: input.Budget, Status: defaultString(input.Status, "draft"), StartDate: input.StartDate, EndDate: input.EndDate, CreatedAt: now.Format(time.RFC3339),
	}
	s.sponsorCampaigns = append([]domain.SponsorCampaignRecord{item}, s.sponsorCampaigns...)
	return item, nil
}

func (s *MemoryStore) ListSponsorAds(ctx context.Context, filter SponsorAdFilter) ([]domain.SponsorAdRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.expireEndedSponsorAdsLocked(time.Now().UTC())
	items := []domain.SponsorAdRecord{}
	for _, item := range s.sponsorAds {
		if filter.SponsorID != "" && item.SponsorID != filter.SponsorID {
			continue
		}
		if filter.Status != "" && item.Status != filter.Status {
			continue
		}
		if filter.CountryCode != "" && !strings.EqualFold(item.CountryCode, filter.CountryCode) {
			continue
		}
		if filter.ExpoID != "" && item.ExpoID != filter.ExpoID {
			continue
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *MemoryStore) SponsorAdByID(ctx context.Context, id string, sponsorID string) (domain.SponsorAdRecord, error) {
	items, _ := s.ListSponsorAds(ctx, SponsorAdFilter{SponsorID: sponsorID})
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return domain.SponsorAdRecord{}, ErrNotFound
}

func (s *MemoryStore) CreateSponsorAd(ctx context.Context, input domain.SponsorAdInput, actor domain.User) (domain.SponsorAdRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if (actor.Role != domain.RoleSponsor && actor.Role != domain.RoleExhibitor) || strings.TrimSpace(input.Name) == "" {
		return domain.SponsorAdRecord{}, ErrInvalidCredentials
	}
	if strings.TrimSpace(input.ExpoID) != "" && s.sponsorAdExpoEndedLocked(input.ExpoID, time.Now().UTC()) {
		return domain.SponsorAdRecord{}, ErrInvalidCredentials
	}
	campaignName := "Unassigned"
	for _, campaign := range s.sponsorCampaigns {
		if campaign.ID == input.CampaignID && campaign.SponsorID == actor.ID {
			campaignName = campaign.Name
			break
		}
	}
	if actor.Role == domain.RoleExhibitor {
		campaignName = "Workspace boost"
		if strings.TrimSpace(input.ExpoID) == "" {
			return domain.SponsorAdRecord{}, ErrInvalidCredentials
		}
		for _, ad := range s.sponsorAds {
			if ad.ExpoID == input.ExpoID && ad.SponsorID == actor.ID {
				return domain.SponsorAdRecord{}, ErrInvalidCredentials
			}
		}
		assigned := false
		for _, assignment := range s.exhibitors {
			if assignment.ExpoID == input.ExpoID && assignment.ExhibitorID == actor.ID && assignment.ActivationStatus == "active" {
				assigned = true
				break
			}
		}
		if !assigned {
			return domain.SponsorAdRecord{}, ErrInvalidCredentials
		}
	}
	item := domain.SponsorAdRecord{
		ID: fmt.Sprintf("sa_%06d", len(s.sponsorAds)+1), ExpoID: strings.TrimSpace(input.ExpoID), SponsorID: actor.ID, SponsorName: displayName(actor), CountryCode: defaultString(actor.CountryCode, "KE"), CampaignID: input.CampaignID, CampaignName: campaignName,
		Name: strings.TrimSpace(input.Name), Placement: defaultString(input.Placement, "banner"), Dimensions: defaultString(input.Dimensions, "728x90"),
		MediaURL: strings.TrimSpace(input.MediaURL), MediaType: defaultString(input.MediaType, "image"), Budget: input.Budget, Status: defaultString(input.Status, "draft"),
		PaymentStatus: "unpaid", CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	if actor.Role == domain.RoleExhibitor {
		item.Status = "active"
		item.PaymentStatus = "paid"
	}
	s.sponsorAds = append([]domain.SponsorAdRecord{item}, s.sponsorAds...)
	return item, nil
}

func (s *MemoryStore) UpdateSponsorAd(ctx context.Context, id string, input domain.SponsorAdInput, actor domain.User) (domain.SponsorAdRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if (actor.Role != domain.RoleSponsor && actor.Role != domain.RoleExhibitor) || strings.TrimSpace(input.Name) == "" {
		return domain.SponsorAdRecord{}, ErrInvalidCredentials
	}
	if actor.Role == domain.RoleExhibitor && strings.TrimSpace(input.ExpoID) != "" && s.sponsorAdExpoEndedLocked(input.ExpoID, time.Now().UTC()) {
		return domain.SponsorAdRecord{}, ErrInvalidCredentials
	}
	for index, ad := range s.sponsorAds {
		if ad.ID != id || ad.SponsorID != actor.ID {
			continue
		}
		if actor.Role == domain.RoleExhibitor {
			if strings.TrimSpace(input.ExpoID) == "" || ad.ExpoID != strings.TrimSpace(input.ExpoID) {
				return domain.SponsorAdRecord{}, ErrInvalidCredentials
			}
			assigned := false
			for _, assignment := range s.exhibitors {
				if assignment.ExpoID == input.ExpoID && assignment.ExhibitorID == actor.ID && assignment.ActivationStatus == "active" {
					assigned = true
					break
				}
			}
			if !assigned {
				return domain.SponsorAdRecord{}, ErrInvalidCredentials
			}
			ad.Status = "pending_payment"
		}
		ad.Name = strings.TrimSpace(input.Name)
		ad.Placement = defaultString(input.Placement, "banner")
		ad.Dimensions = defaultString(input.Dimensions, "728x90")
		ad.MediaURL = strings.TrimSpace(input.MediaURL)
		ad.MediaType = defaultString(input.MediaType, "image")
		ad.Budget = input.Budget
		s.sponsorAds[index] = ad
		return ad, nil
	}
	return domain.SponsorAdRecord{}, ErrNotFound
}

func (s *MemoryStore) UpdateSponsorAdStatus(ctx context.Context, id string, status string, actor domain.User) (domain.SponsorAdRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !isAdminRole(actor.Role) || !validAdStatus(status) {
		return domain.SponsorAdRecord{}, ErrInvalidCredentials
	}
	status = strings.TrimSpace(status)
	s.expireEndedSponsorAdsLocked(time.Now().UTC())
	for i, item := range s.sponsorAds {
		if item.ID == id {
			if status == "active" && s.sponsorAdExpoEndedLocked(item.ExpoID, time.Now().UTC()) {
				return domain.SponsorAdRecord{}, ErrInvalidCredentials
			}
			item.Status = status
			s.sponsorAds[i] = item
			return item, nil
		}
	}
	return domain.SponsorAdRecord{}, ErrNotFound
}

func (s *MemoryStore) CreateSponsorAdPayment(ctx context.Context, adID string, actor domain.User) (domain.SponsorPaymentRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if actor.Role != domain.RoleSponsor {
		return domain.SponsorPaymentRecord{}, ErrInvalidCredentials
	}
	var ad domain.SponsorAdRecord
	for _, item := range s.sponsorAds {
		if item.ID == adID && item.SponsorID == actor.ID {
			ad = item
			break
		}
	}
	if ad.ID == "" {
		return domain.SponsorPaymentRecord{}, ErrNotFound
	}
	for _, payment := range s.sponsorPayments {
		if payment.AdID == ad.ID && payment.Status == "pending" {
			return payment, nil
		}
	}
	payment := domain.SponsorPaymentRecord{
		ID: fmt.Sprintf("spay_%06d", len(s.sponsorPayments)+1), Reference: fmt.Sprintf("SP-PAY-%06d", len(s.sponsorPayments)+1),
		AdID: ad.ID, AdName: ad.Name, Amount: ad.Budget, Currency: "KES",
		PaymentMethod: "paystack", Status: "pending", PaidAt: "",
	}
	if payment.Amount <= 0 {
		payment.Amount = 1
	}
	s.sponsorPayments = append([]domain.SponsorPaymentRecord{payment}, s.sponsorPayments...)
	return payment, nil
}

func (s *MemoryStore) ConfirmSponsorAdPayment(ctx context.Context, paymentID string, actor domain.User) (domain.SponsorPaymentRecord, domain.SponsorAdRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if actor.Role != domain.RoleSponsor && !isAdminRole(actor.Role) {
		return domain.SponsorPaymentRecord{}, domain.SponsorAdRecord{}, ErrInvalidCredentials
	}
	for i, payment := range s.sponsorPayments {
		if payment.ID != paymentID {
			continue
		}
		for j, ad := range s.sponsorAds {
			if ad.ID != payment.AdID {
				continue
			}
			if actor.Role == domain.RoleSponsor && ad.SponsorID != actor.ID {
				return domain.SponsorPaymentRecord{}, domain.SponsorAdRecord{}, ErrInvalidCredentials
			}
			if payment.Status != "paid" {
				payment.Status = "paid"
				payment.PaidAt = time.Now().UTC().Format(time.RFC3339)
			}
			ad.PaymentStatus = "paid"
			if ad.Status == "pending_payment" {
				ad.Status = "draft"
			}
			s.sponsorPayments[i] = payment
			s.sponsorAds[j] = ad
			return payment, ad, nil
		}
		return domain.SponsorPaymentRecord{}, domain.SponsorAdRecord{}, ErrNotFound
	}
	return domain.SponsorPaymentRecord{}, domain.SponsorAdRecord{}, ErrNotFound
}

func (s *MemoryStore) TrackSponsorAdEvent(ctx context.Context, adID string, event string) (domain.SponsorAdRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	s.expireEndedSponsorAdsLocked(now)
	event = strings.TrimSpace(strings.ToLower(event))
	if event != "impression" && event != "click" {
		return domain.SponsorAdRecord{}, ErrInvalidCredentials
	}
	for i, ad := range s.sponsorAds {
		if ad.ID != adID {
			continue
		}
		if ad.Status != "active" {
			return domain.SponsorAdRecord{}, ErrInvalidCredentials
		}
		if s.sponsorAdExpoEndedLocked(ad.ExpoID, now) {
			ad.Status = "paused"
			s.sponsorAds[i] = ad
			return domain.SponsorAdRecord{}, ErrInvalidCredentials
		}
		if event == "click" {
			ad.Clicks++
		} else {
			ad.Impressions++
		}
		if ad.Impressions > 0 {
			ad.CTR = float64(ad.Clicks) / float64(ad.Impressions) * 100
		}
		s.sponsorAds[i] = ad
		return ad, nil
	}
	return domain.SponsorAdRecord{}, ErrNotFound
}

func (s *MemoryStore) expireEndedSponsorAdsLocked(now time.Time) {
	for index, ad := range s.sponsorAds {
		if ad.Status != "active" || strings.TrimSpace(ad.ExpoID) == "" {
			continue
		}
		if s.sponsorAdExpoEndedLocked(ad.ExpoID, now) {
			ad.Status = "paused"
			s.sponsorAds[index] = ad
		}
	}
}

func (s *MemoryStore) sponsorAdExpoEndedLocked(expoID string, now time.Time) bool {
	if strings.TrimSpace(expoID) == "" {
		return false
	}
	today := dateOnly(now.UTC())
	for _, expo := range s.expos {
		if expo.ID == expoID {
			return dateOnly(expo.EndDate.UTC()).Before(today)
		}
	}
	return false
}

func (s *MemoryStore) SettlementStatus(ctx context.Context, id string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	status, ok := s.settlementStatuses[id]
	if !ok {
		return "pending_review", nil
	}
	return status, nil
}

func (s *MemoryStore) UpdateSettlementStatus(ctx context.Context, id string, status string, actor domain.User) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !isAdminRole(actor.Role) || !validSettlementStatus(status) || strings.TrimSpace(id) == "" {
		return "", ErrInvalidCredentials
	}
	s.settlementStatuses[id] = strings.TrimSpace(status)
	return s.settlementStatuses[id], nil
}

func (s *MemoryStore) ListSponsorPayments(ctx context.Context, sponsorID string) ([]domain.SponsorPaymentRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if sponsorID == "" || sponsorID == "usr_sponsorship_001" {
		return append([]domain.SponsorPaymentRecord(nil), s.sponsorPayments...), nil
	}
	return []domain.SponsorPaymentRecord{}, nil
}

func (s *MemoryStore) RecordAudit(ctx context.Context, log domain.AuditLog) (domain.AuditLog, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if log.ID == "" {
		log.ID = fmt.Sprintf("aud_%06d", len(s.auditLogs)+1)
	}
	if log.CreatedAt.IsZero() {
		log.CreatedAt = time.Now().UTC()
	}
	if log.Metadata == nil {
		log.Metadata = map[string]any{}
	}
	s.auditLogs = append([]domain.AuditLog{log}, s.auditLogs...)
	return log, nil
}

func (s *MemoryStore) AuditLogs(ctx context.Context) ([]domain.AuditLog, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]domain.AuditLog(nil), s.auditLogs...), nil
}

func (s *MemoryStore) RecordAppLog(ctx context.Context, log domain.AppLog) (domain.AppLog, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if log.ID == "" {
		log.ID = fmt.Sprintf("app_%06d", len(s.appLogs)+1)
	}
	if log.CreatedAt.IsZero() {
		log.CreatedAt = time.Now().UTC()
	}
	if log.Metadata == nil {
		log.Metadata = map[string]any{}
	}
	s.appLogs = append([]domain.AppLog{log}, s.appLogs...)
	return log, nil
}

func (s *MemoryStore) AppLogs(ctx context.Context) ([]domain.AppLog, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]domain.AppLog(nil), s.appLogs...), nil
}

func (s *MemoryStore) OrganizerProfile(ctx context.Context, organizerID string) (domain.OrganizerProfile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if profile, ok := s.organizerProfiles[organizerID]; ok {
		return profile, nil
	}
	for _, demo := range s.users {
		if demo.User.ID == organizerID && demo.User.Role == domain.RoleOrganizer {
			return organizerProfileFromUser(demo.User), nil
		}
	}
	return domain.OrganizerProfile{}, ErrNotFound
}

func (s *MemoryStore) UpdateOrganizerProfile(ctx context.Context, organizerID string, input domain.OrganizerProfileInput) (domain.OrganizerProfile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	name := strings.TrimSpace(input.Name)
	company := strings.TrimSpace(input.CompanyName)
	if name == "" || company == "" {
		return domain.OrganizerProfile{}, ErrInvalidCredentials
	}
	var user domain.User
	found := false
	for i, demo := range s.users {
		if demo.User.ID == organizerID && demo.User.Role == domain.RoleOrganizer {
			s.users[i].User.Name = name
			s.users[i].User.CompanyName = company
			user = s.users[i].User
			found = true
			break
		}
	}
	if !found {
		return domain.OrganizerProfile{}, ErrNotFound
	}
	profile := organizerProfileFromUser(user)
	if existing, ok := s.organizerProfiles[organizerID]; ok {
		profile = existing
		profile.Name = name
		profile.CompanyName = company
	}
	profile.Phone = strings.TrimSpace(input.Phone)
	profile.Address = strings.TrimSpace(input.Address)
	profile.LogoURL = strings.TrimSpace(input.LogoURL)
	profile.PayoutMethod = strings.TrimSpace(input.PayoutMethod)
	profile.PayoutAccountName = strings.TrimSpace(input.PayoutAccountName)
	profile.PayoutBankName = strings.TrimSpace(input.PayoutBankName)
	profile.PayoutAccountNumber = strings.TrimSpace(input.PayoutAccountNumber)
	profile.PayoutBankBranch = strings.TrimSpace(input.PayoutBankBranch)
	profile.PayoutSwiftCode = strings.TrimSpace(input.PayoutSwiftCode)
	profile.PayoutMobileProvider = strings.TrimSpace(input.PayoutMobileProvider)
	profile.PayoutMobileNumber = strings.TrimSpace(input.PayoutMobileNumber)
	profile.PayoutNotes = strings.TrimSpace(input.PayoutNotes)
	profile.EmailNotifications = input.EmailNotifications
	profile.SMSNotifications = input.SMSNotifications
	profile.PushNotifications = input.PushNotifications
	s.organizerProfiles[organizerID] = profile
	return profile, nil
}

func (s *MemoryStore) ExhibitorProfile(ctx context.Context, exhibitorID string) (domain.ExhibitorProfile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if profile, ok := s.exhibitorProfiles[exhibitorID]; ok {
		return profile, nil
	}
	for _, demo := range s.users {
		if demo.User.ID == exhibitorID && demo.User.Role == domain.RoleExhibitor {
			return exhibitorProfileFromUser(demo.User), nil
		}
	}
	return domain.ExhibitorProfile{}, ErrNotFound
}

func (s *MemoryStore) UpdateExhibitorProfile(ctx context.Context, exhibitorID string, input domain.ExhibitorProfileInput) (domain.ExhibitorProfile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	company := strings.TrimSpace(input.CompanyName)
	if company == "" {
		return domain.ExhibitorProfile{}, ErrInvalidCredentials
	}
	var user domain.User
	found := false
	for i, demo := range s.users {
		if demo.User.ID == exhibitorID && demo.User.Role == domain.RoleExhibitor {
			s.users[i].User.CompanyName = company
			if strings.TrimSpace(input.LogoURL) != "" {
				s.users[i].User.AvatarURL = strings.TrimSpace(input.LogoURL)
			}
			user = s.users[i].User
			found = true
			break
		}
	}
	if !found {
		return domain.ExhibitorProfile{}, ErrNotFound
	}
	profile := exhibitorProfileFromUser(user)
	if existing, ok := s.exhibitorProfiles[exhibitorID]; ok {
		profile = existing
		profile.CompanyName = company
	}
	profile.Description = strings.TrimSpace(input.Description)
	profile.Website = strings.TrimSpace(input.Website)
	profile.Phone = strings.TrimSpace(input.Phone)
	profile.Address = strings.TrimSpace(input.Address)
	profile.LogoURL = strings.TrimSpace(input.LogoURL)
	profile.Logo = strings.TrimSpace(input.LogoURL)
	profile.Categories = compactStrings(input.Categories)
	if profile.Logo == "" {
		profile.Logo = user.AvatarURL
		profile.LogoURL = user.AvatarURL
	}
	if input.SocialLinks != nil {
		profile.SocialLinks = input.SocialLinks
	}
	s.exhibitorProfiles[exhibitorID] = profile
	return profile, nil
}

func (s *MemoryStore) ListExhibitorDocuments(ctx context.Context, exhibitorID string) ([]domain.CompanyDocumentRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.userByIDLocked(exhibitorID); !ok {
		return nil, ErrNotFound
	}
	items := []domain.CompanyDocumentRecord{}
	for _, item := range s.exhibitorDocuments {
		if item.ExhibitorID == exhibitorID {
			items = append(items, item)
		}
	}
	return items, nil
}

func (s *MemoryStore) CreateExhibitorDocument(ctx context.Context, exhibitorID string, input domain.CompanyDocumentInput) (domain.CompanyDocumentRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	user, ok := s.userByIDLocked(exhibitorID)
	if !ok || user.Role != domain.RoleExhibitor {
		return domain.CompanyDocumentRecord{}, ErrNotFound
	}
	name := strings.TrimSpace(input.Name)
	url := strings.TrimSpace(input.URL)
	mimeType := strings.TrimSpace(input.MimeType)
	if name == "" || url == "" || mimeType != "application/pdf" {
		return domain.CompanyDocumentRecord{}, ErrInvalidCredentials
	}
	item := domain.CompanyDocumentRecord{
		ID: fmt.Sprintf("doc_%d", time.Now().UnixNano()), ExhibitorID: exhibitorID, Name: name, URL: url,
		MimeType: mimeType, Size: input.Size, UploadedAt: time.Now().UTC().Format(time.RFC3339),
	}
	s.exhibitorDocuments = append([]domain.CompanyDocumentRecord{item}, s.exhibitorDocuments...)
	return item, nil
}

func (s *MemoryStore) DeleteExhibitorDocument(ctx context.Context, exhibitorID string, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	user, ok := s.userByIDLocked(exhibitorID)
	if !ok || user.Role != domain.RoleExhibitor {
		return ErrNotFound
	}
	for index, item := range s.exhibitorDocuments {
		if item.ExhibitorID == exhibitorID && item.ID == id {
			s.exhibitorDocuments = append(s.exhibitorDocuments[:index], s.exhibitorDocuments[index+1:]...)
			return nil
		}
	}
	return ErrNotFound
}

func (s *MemoryStore) ListExpoDocuments(ctx context.Context, expoID string, exhibitorID string) ([]domain.ExpoDocumentRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.expoByIDLocked(expoID); !ok {
		return nil, ErrNotFound
	}
	if _, ok := s.userByIDLocked(exhibitorID); !ok {
		return nil, ErrNotFound
	}
	items := []domain.ExpoDocumentRecord{}
	for _, item := range s.expoDocuments {
		if item.ExpoID == expoID && item.ExhibitorID == exhibitorID {
			items = append(items, item)
		}
	}
	return items, nil
}

func (s *MemoryStore) CreateExpoDocument(ctx context.Context, expoID string, exhibitorID string, input domain.CompanyDocumentInput) (domain.ExpoDocumentRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.expoByIDLocked(expoID); !ok {
		return domain.ExpoDocumentRecord{}, ErrNotFound
	}
	user, ok := s.userByIDLocked(exhibitorID)
	if !ok || user.Role != domain.RoleExhibitor {
		return domain.ExpoDocumentRecord{}, ErrNotFound
	}
	name := strings.TrimSpace(input.Name)
	url := strings.TrimSpace(input.URL)
	mimeType := strings.TrimSpace(input.MimeType)
	if name == "" || url == "" || mimeType != "application/pdf" {
		return domain.ExpoDocumentRecord{}, ErrInvalidCredentials
	}
	item := domain.ExpoDocumentRecord{
		ID: fmt.Sprintf("edoc_%d", time.Now().UnixNano()), ExpoID: expoID, ExhibitorID: exhibitorID,
		Name: name, URL: url, Type: "document", MimeType: mimeType, Size: input.Size,
		UploadedAt: time.Now().UTC().Format(time.RFC3339),
	}
	s.expoDocuments = append([]domain.ExpoDocumentRecord{item}, s.expoDocuments...)
	return item, nil
}

func (s *MemoryStore) DeleteExpoDocument(ctx context.Context, expoID string, exhibitorID string, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for index, item := range s.expoDocuments {
		if item.ID == id && item.ExpoID == expoID && item.ExhibitorID == exhibitorID {
			s.expoDocuments = append(s.expoDocuments[:index], s.expoDocuments[index+1:]...)
			return nil
		}
	}
	return ErrNotFound
}

func (s *MemoryStore) ListExhibitorTeam(ctx context.Context, exhibitorID string) ([]domain.OrganizerTeamMember, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows := []domain.OrganizerTeamMember{}
	for _, demo := range s.users {
		if demo.User.ID == exhibitorID && demo.User.Role == domain.RoleExhibitor {
			rows = append(rows, domain.OrganizerTeamMember{ID: demo.User.ID, OrganizerID: exhibitorID, Name: demo.User.Name, Email: demo.User.Email, Role: "owner", Status: "active", Permissions: []string{"profile:manage", "products:manage", "leads:manage", "payments:view"}, CreatedAt: ""})
			break
		}
	}
	for _, member := range s.exhibitorTeam {
		if member.OrganizerID == exhibitorID {
			rows = append(rows, member)
		}
	}
	if len(rows) == 0 {
		return nil, ErrNotFound
	}
	return rows, nil
}

func (s *MemoryStore) EffectiveExhibitorID(ctx context.Context, userID string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, member := range s.exhibitorTeam {
		if member.ID == userID && member.Status == "active" {
			return member.OrganizerID, nil
		}
	}
	return userID, nil
}

func (s *MemoryStore) CreateExhibitorTeamMember(ctx context.Context, exhibitorID string, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	member, err := organizerTeamMemberFromInput(fmt.Sprintf("etm_%d", time.Now().UnixNano()), exhibitorID, input)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	for _, existing := range s.exhibitorTeam {
		if existing.OrganizerID == exhibitorID && strings.EqualFold(existing.Email, member.Email) {
			return domain.OrganizerTeamMember{}, ErrInvalidCredentials
		}
	}
	s.exhibitorTeam = append([]domain.OrganizerTeamMember{member}, s.exhibitorTeam...)
	return member, nil
}

func (s *MemoryStore) CreateExhibitorTeamMemberAccount(ctx context.Context, exhibitor domain.User, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	temporaryPassword := strings.TrimSpace(input.TemporaryPassword)
	if exhibitor.Role != domain.RoleExhibitor || temporaryPassword == "" {
		return domain.OrganizerTeamMember{}, ErrInvalidCredentials
	}
	id := fmt.Sprintf("usr_%d", time.Now().UnixNano())
	member, err := organizerTeamMemberFromInput(id, exhibitor.ID, input)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	for _, existing := range s.exhibitorTeam {
		if existing.OrganizerID == exhibitor.ID && (existing.ID == member.ID || strings.EqualFold(existing.Email, member.Email)) {
			return domain.OrganizerTeamMember{}, ErrInvalidCredentials
		}
	}
	hash, err := security.HashPassword(temporaryPassword)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	reusedUser := false
	for index, existing := range s.users {
		if !strings.EqualFold(existing.User.Email, member.Email) {
			continue
		}
		if existing.User.Role != domain.RoleExhibitor || existing.User.Status == "active" {
			return domain.OrganizerTeamMember{}, ErrInvalidCredentials
		}
		id = existing.User.ID
		member.ID = id
		s.users[index].User.Name = member.Name
		s.users[index].User.CompanyName = exhibitor.CompanyName
		s.users[index].User.CountryCode = defaultString(exhibitor.CountryCode, "KE")
		s.users[index].User.Status = "active"
		s.users[index].User.MustChangePassword = true
		s.users[index].Password = hash
		reusedUser = true
		break
	}
	user := domain.User{
		ID:                 id,
		Name:               member.Name,
		Email:              member.Email,
		Role:               domain.RoleExhibitor,
		AvatarURL:          "/avatars/exhibitor.svg",
		CompanyName:        exhibitor.CompanyName,
		CountryCode:        defaultString(exhibitor.CountryCode, "KE"),
		Status:             "active",
		MustChangePassword: true,
	}
	if !reusedUser {
		s.users = append([]DemoUser{{User: user, Password: hash}}, s.users...)
	}
	s.exhibitorTeam = append([]domain.OrganizerTeamMember{member}, s.exhibitorTeam...)
	return member, nil
}

func (s *MemoryStore) UpdateExhibitorTeamMember(ctx context.Context, exhibitorID string, id string, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if id == exhibitorID {
		return domain.OrganizerTeamMember{}, ErrInvalidCredentials
	}
	updated, err := organizerTeamMemberFromInput(id, exhibitorID, input)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	for index, existing := range s.exhibitorTeam {
		if existing.OrganizerID == exhibitorID && strings.EqualFold(existing.Email, updated.Email) && existing.ID != id {
			return domain.OrganizerTeamMember{}, ErrInvalidCredentials
		}
		if existing.ID == id && existing.OrganizerID == exhibitorID {
			updated.CreatedAt = existing.CreatedAt
			s.exhibitorTeam[index] = updated
			for userIndex, demo := range s.users {
				if demo.User.ID == id {
					s.users[userIndex].User.Name = updated.Name
					s.users[userIndex].User.Email = updated.Email
					s.users[userIndex].User.Status = updated.Status
					break
				}
			}
			return updated, nil
		}
	}
	return domain.OrganizerTeamMember{}, ErrNotFound
}

func (s *MemoryStore) DeleteExhibitorTeamMember(ctx context.Context, exhibitorID string, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if id == exhibitorID {
		return ErrInvalidCredentials
	}
	for index, existing := range s.exhibitorTeam {
		if existing.ID == id && existing.OrganizerID == exhibitorID {
			s.exhibitorTeam = append(s.exhibitorTeam[:index], s.exhibitorTeam[index+1:]...)
			for userIndex, demo := range s.users {
				if demo.User.ID == id {
					s.users[userIndex].User.Status = "inactive"
					break
				}
			}
			return nil
		}
	}
	return nil
}

func (s *MemoryStore) ListOrganizerTeam(ctx context.Context, organizerID string) ([]domain.OrganizerTeamMember, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows := []domain.OrganizerTeamMember{}
	for _, demo := range s.users {
		if demo.User.ID == organizerID && demo.User.Role == domain.RoleOrganizer {
			rows = append(rows, domain.OrganizerTeamMember{ID: demo.User.ID, OrganizerID: organizerID, Name: demo.User.Name, Email: demo.User.Email, Role: "owner", Status: "active", Permissions: []string{"expos:manage", "team:manage", "reports:view", "payments:view"}, CreatedAt: ""})
			break
		}
	}
	for _, member := range s.organizerTeam {
		if member.OrganizerID == organizerID {
			rows = append(rows, member)
		}
	}
	return rows, nil
}

func (s *MemoryStore) OrganizerTeamMemberByID(ctx context.Context, organizerID string, id string) (domain.OrganizerTeamMember, error) {
	rows, _ := s.ListOrganizerTeam(ctx, organizerID)
	for _, row := range rows {
		if row.ID == id {
			return row, nil
		}
	}
	return domain.OrganizerTeamMember{}, ErrNotFound
}

func (s *MemoryStore) EffectiveOrganizerID(ctx context.Context, userID string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, member := range s.organizerTeam {
		if member.ID == userID && member.Status == "active" {
			return member.OrganizerID, nil
		}
	}
	return userID, nil
}

func (s *MemoryStore) CreateOrganizerTeamMember(ctx context.Context, organizerID string, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	member, err := organizerTeamMemberFromInput(fmt.Sprintf("otm_%d", time.Now().UnixNano()), organizerID, input)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	for _, existing := range s.organizerTeam {
		if existing.OrganizerID == organizerID && strings.EqualFold(existing.Email, member.Email) {
			return domain.OrganizerTeamMember{}, ErrInvalidCredentials
		}
	}
	s.organizerTeam = append([]domain.OrganizerTeamMember{member}, s.organizerTeam...)
	return member, nil
}

func (s *MemoryStore) CreateOrganizerTeamMemberAccount(ctx context.Context, organizer domain.User, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	temporaryPassword := strings.TrimSpace(input.TemporaryPassword)
	if organizer.Role != domain.RoleOrganizer || temporaryPassword == "" {
		return domain.OrganizerTeamMember{}, ErrInvalidCredentials
	}
	id := fmt.Sprintf("usr_%d", time.Now().UnixNano())
	member, err := organizerTeamMemberFromInput(id, organizer.ID, input)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	for _, existing := range s.organizerTeam {
		if existing.OrganizerID == organizer.ID && strings.EqualFold(existing.Email, member.Email) {
			return domain.OrganizerTeamMember{}, ErrInvalidCredentials
		}
	}
	hash, err := security.HashPassword(temporaryPassword)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	reusedUser := false
	for index, existing := range s.users {
		if !strings.EqualFold(existing.User.Email, member.Email) {
			continue
		}
		if existing.User.Role != domain.RoleOrganizer || existing.User.Status == "active" {
			return domain.OrganizerTeamMember{}, ErrInvalidCredentials
		}
		id = existing.User.ID
		member.ID = id
		s.users[index].User.Name = member.Name
		s.users[index].User.CompanyName = organizer.CompanyName
		s.users[index].User.CountryCode = defaultString(organizer.CountryCode, "KE")
		s.users[index].User.Status = "active"
		s.users[index].User.MustChangePassword = true
		s.users[index].Password = hash
		reusedUser = true
		break
	}
	if !reusedUser {
		s.users = append([]DemoUser{{User: domain.User{
			ID:                 id,
			Name:               member.Name,
			Email:              member.Email,
			Role:               domain.RoleOrganizer,
			AvatarURL:          "/avatars/organizer.svg",
			CompanyName:        organizer.CompanyName,
			CountryCode:        defaultString(organizer.CountryCode, "KE"),
			Status:             "active",
			MustChangePassword: true,
		}, Password: hash}}, s.users...)
	}
	s.organizerTeam = append([]domain.OrganizerTeamMember{member}, s.organizerTeam...)
	return member, nil
}

func (s *MemoryStore) UpdateOrganizerTeamMember(ctx context.Context, organizerID string, id string, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if id == organizerID {
		return domain.OrganizerTeamMember{}, ErrInvalidCredentials
	}
	updated, err := organizerTeamMemberFromInput(id, organizerID, input)
	if err != nil {
		return domain.OrganizerTeamMember{}, err
	}
	for i, existing := range s.organizerTeam {
		if existing.OrganizerID == organizerID && existing.ID == id {
			updated.CreatedAt = existing.CreatedAt
			s.organizerTeam[i] = updated
			return updated, nil
		}
	}
	return domain.OrganizerTeamMember{}, ErrNotFound
}

func (s *MemoryStore) DeleteOrganizerTeamMember(ctx context.Context, organizerID string, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if id == organizerID {
		return ErrInvalidCredentials
	}
	for index, existing := range s.organizerTeam {
		if existing.ID == id && existing.OrganizerID == organizerID {
			s.organizerTeam = append(s.organizerTeam[:index], s.organizerTeam[index+1:]...)
			for userIndex, demo := range s.users {
				if demo.User.ID == id {
					s.users[userIndex].User.Status = "inactive"
					break
				}
			}
			return nil
		}
	}
	return nil
}

func (s *MemoryStore) ListOrganizerSponsors(ctx context.Context, organizerID string) ([]domain.OrganizerSponsor, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows := []domain.OrganizerSponsor{}
	for _, sponsor := range s.organizerSponsors {
		if sponsor.OrganizerID == organizerID {
			rows = append(rows, sponsor)
		}
	}
	return rows, nil
}

func (s *MemoryStore) OrganizerSponsorByID(ctx context.Context, organizerID string, id string) (domain.OrganizerSponsor, error) {
	rows, _ := s.ListOrganizerSponsors(ctx, organizerID)
	for _, row := range rows {
		if row.ID == id {
			return row, nil
		}
	}
	return domain.OrganizerSponsor{}, ErrNotFound
}

func (s *MemoryStore) CreateOrganizerSponsor(ctx context.Context, organizerID string, input domain.OrganizerSponsorInput) (domain.OrganizerSponsor, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sponsor, err := organizerSponsorFromInput(fmt.Sprintf("orgsp_%d", time.Now().UnixNano()), organizerID, organizerNameByID(s.users, organizerID), input)
	if err != nil {
		return domain.OrganizerSponsor{}, err
	}
	s.organizerSponsors = append([]domain.OrganizerSponsor{sponsor}, s.organizerSponsors...)
	return sponsor, nil
}

func (s *MemoryStore) UpdateOrganizerSponsor(ctx context.Context, organizerID string, id string, input domain.OrganizerSponsorInput) (domain.OrganizerSponsor, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	updated, err := organizerSponsorFromInput(id, organizerID, organizerNameByID(s.users, organizerID), input)
	if err != nil {
		return domain.OrganizerSponsor{}, err
	}
	for i, existing := range s.organizerSponsors {
		if existing.OrganizerID == organizerID && existing.ID == id {
			updated.CommissionEarned = existing.CommissionEarned
			updated.TotalPaid = existing.TotalPaid
			updated.JoinedAt = existing.JoinedAt
			s.organizerSponsors[i] = updated
			return updated, nil
		}
	}
	return domain.OrganizerSponsor{}, ErrNotFound
}

func (s *MemoryStore) EmailSettings(ctx context.Context) (domain.EmailSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.emailSettings, nil
}

func (s *MemoryStore) UpdateEmailSettings(ctx context.Context, settings domain.EmailSettings) (domain.EmailSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if settings.SMTPPort == 0 {
		settings.SMTPPort = 587
	}
	if strings.TrimSpace(settings.Encryption) == "" {
		settings.Encryption = "starttls"
	}
	s.emailSettings = settings
	return s.emailSettings, nil
}

func (s *MemoryStore) SMSSettings(ctx context.Context) (domain.SMSSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.smsSettings, nil
}

func (s *MemoryStore) UpdateSMSSettings(ctx context.Context, settings domain.SMSSettings) (domain.SMSSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	settings.Provider = strings.ToLower(strings.TrimSpace(settings.Provider))
	if settings.Provider == "" {
		settings.Provider = "tiaraconnect"
	}
	if settings.Provider != "tiaraconnect" {
		return domain.SMSSettings{}, ErrInvalidCredentials
	}
	if strings.TrimSpace(settings.SenderID) == "" {
		settings.SenderID = "CONNECT"
	}
	settings.SenderID = strings.TrimSpace(settings.SenderID)
	settings.APIKey = strings.TrimSpace(settings.APIKey)
	settings.BaseURL = strings.TrimRight(strings.TrimSpace(settings.BaseURL), "/")
	if settings.BaseURL == "" {
		settings.BaseURL = "https://api2.tiaraconnect.io"
	}
	s.smsSettings = settings
	return s.smsSettings, nil
}

func (s *MemoryStore) PaystackSettings(ctx context.Context) (domain.PaystackSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.paystackSettings, nil
}

func (s *MemoryStore) UpdatePaystackSettings(ctx context.Context, settings domain.PaystackSettings) (domain.PaystackSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.paystackSettings = settings
	return s.paystackSettings, nil
}

func (s *MemoryStore) GoogleSettings(ctx context.Context) (domain.GoogleSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.googleSettings, nil
}

func (s *MemoryStore) UpdateGoogleSettings(ctx context.Context, settings domain.GoogleSettings) (domain.GoogleSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.googleSettings = settings
	return s.googleSettings, nil
}

func (s *MemoryStore) MeetingSettings(ctx context.Context) (domain.MeetingSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.meetingSettings.CategoryTypes) == 0 {
		s.meetingSettings = defaultMeetingSettings()
	}
	return s.meetingSettings, nil
}

func (s *MemoryStore) UpdateMeetingSettings(ctx context.Context, settings domain.MeetingSettings) (domain.MeetingSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	cleaned := cleanMeetingCategories(settings.CategoryTypes)
	if len(cleaned) == 0 {
		cleaned = defaultMeetingSettings().CategoryTypes
	}
	s.meetingSettings = domain.MeetingSettings{CategoryTypes: cleaned}
	return s.meetingSettings, nil
}

func (s *MemoryStore) ExhibitorMeetingSettings(ctx context.Context, exhibitorID string) (domain.MeetingSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if settings, ok := s.exhibitorMeetingSettings[exhibitorID]; ok && len(settings.CategoryTypes) > 0 {
		return settings, nil
	}
	if len(s.meetingSettings.CategoryTypes) == 0 {
		s.meetingSettings = defaultMeetingSettings()
	}
	return s.meetingSettings, nil
}

func (s *MemoryStore) UpdateExhibitorMeetingSettings(ctx context.Context, exhibitorID string, settings domain.MeetingSettings) (domain.MeetingSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	cleaned := cleanMeetingCategories(settings.CategoryTypes)
	if len(cleaned) == 0 {
		cleaned = defaultMeetingSettings().CategoryTypes
	}
	updated := domain.MeetingSettings{CategoryTypes: cleaned}
	s.exhibitorMeetingSettings[exhibitorID] = updated
	return updated, nil
}

func (s *MemoryStore) OpenAISettings(ctx context.Context) (domain.OpenAISettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if strings.TrimSpace(s.openAISettings.Model) == "" {
		s.openAISettings.Model = "gpt-4.1-mini"
	}
	return s.openAISettings, nil
}

func (s *MemoryStore) UpdateOpenAISettings(ctx context.Context, settings domain.OpenAISettings) (domain.OpenAISettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if strings.TrimSpace(settings.Model) == "" {
		settings.Model = "gpt-4.1-mini"
	}
	s.openAISettings = settings
	return s.openAISettings, nil
}

func (s *MemoryStore) LatestAIAnalyticsSummary(ctx context.Context, scope string, scopeID string, countryCode string) (domain.AIAnalyticsSummary, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := len(s.aiSummaries) - 1; i >= 0; i-- {
		item := s.aiSummaries[i]
		if item.Scope == scope && item.ScopeID == scopeID && item.CountryCode == countryCode {
			return item, nil
		}
	}
	return domain.AIAnalyticsSummary{}, ErrNotFound
}

func (s *MemoryStore) SaveAIAnalyticsSummary(ctx context.Context, summary domain.AIAnalyticsSummary) (domain.AIAnalyticsSummary, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if strings.TrimSpace(summary.ID) == "" {
		summary.ID = fmt.Sprintf("ais_%d", time.Now().UTC().UnixNano())
	}
	if strings.TrimSpace(summary.GeneratedAt) == "" {
		summary.GeneratedAt = time.Now().UTC().Format(time.RFC3339)
	}
	s.aiSummaries = append(s.aiSummaries, summary)
	return summary, nil
}

func (s *MemoryStore) WhatsappSettings(ctx context.Context) (domain.WhatsappSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.whatsappSettings, nil
}

func (s *MemoryStore) UpdateWhatsappSettings(ctx context.Context, settings domain.WhatsappSettings) (domain.WhatsappSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.whatsappSettings = settings
	return s.whatsappSettings, nil
}

func (s *MemoryStore) organizerName(id string) string {
	for _, demo := range s.users {
		if demo.User.ID == id {
			if demo.User.CompanyName != "" {
				return demo.User.CompanyName
			}
			return demo.User.Name
		}
	}
	return "Unknown Organizer"
}

func (s *MemoryStore) userDisplayName(id string) string {
	if user, ok := s.userByIDLocked(id); ok {
		if user.CompanyName != "" {
			return user.CompanyName
		}
		return user.Name
	}
	return "Unknown Recipient"
}

func (s *MemoryStore) userByIDLocked(id string) (domain.User, bool) {
	for _, demo := range s.users {
		if demo.User.ID == id {
			return demo.User, true
		}
	}
	return domain.User{}, false
}

func (s *MemoryStore) expoByIDLocked(id string) (domain.Expo, bool) {
	for _, expo := range s.expos {
		if expo.ID == id {
			return expo, true
		}
	}
	return domain.Expo{}, false
}

func (s *MemoryStore) expoExhibitorExistsLocked(expoID string, exhibitorID string) bool {
	for _, item := range s.exhibitors {
		if item.ExpoID == strings.TrimSpace(expoID) && item.ExhibitorID == strings.TrimSpace(exhibitorID) {
			return true
		}
	}
	return false
}

func (s *MemoryStore) chatMessagesForThreadLocked(threadID string) []domain.ChatMessageRecord {
	items := []domain.ChatMessageRecord{}
	for _, item := range s.chatMessages {
		if item.ThreadID == threadID {
			items = append(items, item)
		}
	}
	sort.Slice(items, func(i, j int) bool { return items[i].CreatedAt < items[j].CreatedAt })
	return items
}

func chatUnreadCount(messages []domain.ChatMessageRecord, role domain.Role) int {
	total := 0
	for _, message := range messages {
		if role == domain.RoleVisitor && !message.ReadByVisitor {
			total++
		}
		if role == domain.RoleExhibitor && !message.ReadByExhibitor {
			total++
		}
	}
	return total
}

func nonEmptyString(value string, fallback string) string {
	if strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	return strings.TrimSpace(fallback)
}

func normalizedIdempotency(input domain.PaymentInput, actor domain.User) string {
	key := strings.TrimSpace(input.IdempotencyKey)
	if key != "" {
		return key
	}
	return fmt.Sprintf("%s_%s_%s", actor.ID, input.ExpoID, input.Purpose)
}

func timePtr(value time.Time) *time.Time {
	return &value
}

func visitorBookingFromExpo(expo domain.Expo, actor domain.User, ticketType string, sequence int) domain.VisitorBookingRecord {
	if strings.TrimSpace(ticketType) == "" {
		ticketType = "Remote Access"
	}
	now := time.Now().UTC()
	return domain.VisitorBookingRecord{
		ID: fmt.Sprintf("vb_%06d", sequence), ExpoID: expo.ID, ExpoName: expo.Name, ExpoDate: expo.StartDate.Format("2006-01-02"),
		Venue: expo.Venue, TicketType: ticketType, TicketPrice: 0, Status: "upcoming", BookedAt: now.Format(time.RFC3339),
		QRCode: fmt.Sprintf("VISITOR-%s-%s", expo.ID, actor.ID),
	}
}

func (s *MemoryStore) upsertExpoExhibitorLocked(expo domain.Expo, actor domain.User, status string, activatedAt *time.Time, amountMinor int64) {
	if amountMinor <= 0 {
		amountMinor = expo.ExhibitorActivationFeeMinor
	}
	for i, item := range s.exhibitors {
		if item.ExpoID == expo.ID && item.ExhibitorID == actor.ID {
			item.ActivationStatus = status
			item.ActivatedAt = activatedAt
			item.AmountMinor = amountMinor
			item.CurrencyCode = expo.CurrencyCode
			s.exhibitors[i] = item
			return
		}
	}
	name := actor.CompanyName
	if name == "" {
		name = actor.Name
	}
	s.exhibitors = append([]domain.ExpoExhibitor{{
		ID:               fmt.Sprintf("exe_%06d", len(s.exhibitors)+1),
		ExpoID:           expo.ID,
		ExpoName:         expo.Name,
		ExpoDescription:  expo.Description,
		ExhibitorID:      actor.ID,
		ExhibitorName:    name,
		ExhibitorEmail:   actor.Email,
		BoothNumber:      "Digital",
		BoothSize:        "Digital Workspace",
		ActivationStatus: status,
		CurrencyCode:     expo.CurrencyCode,
		AmountMinor:      amountMinor,
		Location:         expo.Venue + ", " + expo.City,
		StartDate:        expo.StartDate,
		EndDate:          expo.EndDate,
		ActivatedAt:      activatedAt,
		CreatedAt:        time.Now().UTC(),
	}}, s.exhibitors...)
}

func displayName(user domain.User) string {
	if strings.TrimSpace(user.CompanyName) != "" {
		return strings.TrimSpace(user.CompanyName)
	}
	return strings.TrimSpace(user.Name)
}

func notificationPayloadString(payload map[string]any, key string) string {
	if value, ok := payload[key].(string); ok {
		return strings.TrimSpace(value)
	}
	return ""
}

func sponsorPlanFromInput(id string, input domain.SponsorPlanInput) domain.SponsorPlanRecord {
	features := input.Features
	if features == nil {
		features = map[string]any{}
	}
	return domain.SponsorPlanRecord{
		ID: id, Name: strings.TrimSpace(input.Name), Description: strings.TrimSpace(input.Description), Tier: strings.TrimSpace(input.Tier),
		CountryCode: defaultString(strings.ToUpper(strings.TrimSpace(input.CountryCode)), "KE"),
		Price:       input.Price, Currency: strings.ToUpper(strings.TrimSpace(input.Currency)), BillingCycle: strings.TrimSpace(input.BillingCycle),
		Features: features, OrganizerCommissionPercent: input.OrganizerCommissionPercent, Status: defaultString(input.Status, "active"),
	}
}

func validSponsorPlanInput(input domain.SponsorPlanInput) bool {
	return validSponsorPlanRecord(sponsorPlanFromInput("candidate", input))
}

func validSponsorPlanRecord(plan domain.SponsorPlanRecord) bool {
	if strings.TrimSpace(plan.Name) == "" || strings.TrimSpace(plan.CountryCode) == "" || strings.TrimSpace(plan.Currency) == "" || plan.Price < 0 || plan.OrganizerCommissionPercent < 0 || plan.OrganizerCommissionPercent > 100 {
		return false
	}
	switch strings.TrimSpace(plan.Tier) {
	case "bronze", "silver", "gold", "platinum":
	default:
		return false
	}
	switch strings.TrimSpace(plan.BillingCycle) {
	case "monthly", "annual":
	default:
		return false
	}
	switch strings.TrimSpace(plan.Status) {
	case "active", "inactive", "archived":
		return true
	default:
		return false
	}
}

func countryFromInput(input domain.CountryInput) domain.Country {
	methods := input.PaymentMethods
	if len(methods) == 0 {
		methods = []string{"paystack", "manual"}
	}
	return domain.Country{
		Code:            strings.ToUpper(strings.TrimSpace(input.Code)),
		Name:            strings.TrimSpace(input.Name),
		DefaultCurrency: strings.ToUpper(strings.TrimSpace(input.DefaultCurrency)),
		DefaultTimezone: strings.TrimSpace(input.DefaultTimezone),
		PaymentMethods:  methods,
		Active:          true,
	}
}

func defaultCategories() []domain.Category {
	items := []struct {
		name string
		slug string
		icon string
	}{
		{"Technology", "technology", "laptop"},
		{"Agriculture", "agriculture", "leaf"},
		{"Manufacturing", "manufacturing", "factory"},
		{"Energy", "energy", "bolt"},
		{"Healthcare", "healthcare", "heart"},
		{"Education", "education", "book"},
		{"Finance", "finance", "wallet"},
		{"Real Estate", "real-estate", "home"},
		{"Construction", "construction", "hardhat"},
		{"Transport & Logistics", "transport-logistics", "truck"},
		{"Tourism & Hospitality", "tourism-hospitality", "hotel"},
		{"Food & Beverage", "food-beverage", "utensils"},
		{"Retail & E-commerce", "retail-ecommerce", "shopping-cart"},
		{"Fashion & Beauty", "fashion-beauty", "sparkle"},
		{"Automotive", "automotive", "car"},
		{"Mining", "mining", "pickaxe"},
		{"Oil & Gas", "oil-gas", "droplet"},
		{"Telecommunications", "telecommunications", "radio"},
		{"Media & Entertainment", "media-entertainment", "film"},
		{"Sports & Fitness", "sports-fitness", "activity"},
		{"Government & Public Sector", "government-public-sector", "landmark"},
		{"NGOs & Development", "ngos-development", "hand-heart"},
		{"Environment & Climate", "environment-climate", "globe"},
		{"Water & Sanitation", "water-sanitation", "droplet"},
		{"Security & Safety", "security-safety", "shield"},
		{"Legal & Professional Services", "legal-professional-services", "scale"},
		{"Business Services", "business-services", "briefcase"},
		{"Human Resources", "human-resources", "users"},
		{"Marketing & Advertising", "marketing-advertising", "megaphone"},
		{"Art & Culture", "art-culture", "palette"},
		{"Furniture & Interiors", "furniture-interiors", "sofa"},
		{"Home & Living", "home-living", "home"},
		{"Electronics", "electronics", "monitor"},
		{"Software & SaaS", "software-saas", "code"},
		{"Hardware & Devices", "hardware-devices", "cpu"},
		{"AI & Data", "ai-data", "bot"},
		{"Cybersecurity", "cybersecurity", "shield"},
		{"Robotics & Automation", "robotics-automation", "bot"},
		{"Packaging & Printing", "packaging-printing", "package"},
		{"Textiles", "textiles", "scissors"},
		{"Pharmaceuticals", "pharmaceuticals", "pill"},
		{"Medical Devices", "medical-devices", "stethoscope"},
		{"Banking & Insurance", "banking-insurance", "banknote"},
		{"Renewable Energy", "renewable-energy", "sun"},
		{"Agritech", "agritech", "leaf"},
		{"Fintech", "fintech", "wallet"},
		{"Proptech", "proptech", "home"},
		{"Edtech", "edtech", "book"},
		{"Healthtech", "healthtech", "heart"},
		{"Creative Economy", "creative-economy", "palette"},
	}

	categories := make([]domain.Category, 0, len(items))
	for _, item := range items {
		categories = append(categories, domain.Category{ID: "cat_" + strings.ReplaceAll(item.slug, "-", "_"), Name: item.name, Slug: item.slug, Icon: item.icon, Active: true})
	}
	return categories
}

func validCountryRecord(country domain.Country) bool {
	return len(country.Code) == 2 && strings.TrimSpace(country.Name) != "" && len(country.DefaultCurrency) == 3 && strings.TrimSpace(country.DefaultTimezone) != ""
}

func organizerProfileFromUser(user domain.User) domain.OrganizerProfile {
	return domain.OrganizerProfile{
		ID: user.ID, Name: user.Name, Email: user.Email, CompanyName: user.CompanyName, CountryCode: user.CountryCode, LogoURL: user.AvatarURL,
		EmailNotifications: true, PushNotifications: true,
	}
}

func exhibitorProfileFromUser(user domain.User) domain.ExhibitorProfile {
	logo := user.AvatarURL
	if logo == "" {
		logo = "/avatars/exhibitor.svg"
	}
	return domain.ExhibitorProfile{
		ID: user.ID, CompanyName: displayName(user), Logo: logo, LogoURL: logo, Description: "", Website: "",
		Phone: "", Email: user.Email, Address: "", Categories: []string{}, SocialLinks: map[string]string{"linkedin": "", "twitter": "", "instagram": ""},
		TeamMembers: []map[string]string{{"id": user.ID, "name": user.Name, "email": user.Email, "role": "owner"}},
	}
}

func organizerTeamMemberFromInput(id string, organizerID string, input domain.OrganizerTeamMemberInput) (domain.OrganizerTeamMember, error) {
	role := defaultString(strings.TrimSpace(input.Role), "staff")
	status := defaultString(strings.TrimSpace(input.Status), "active")
	if strings.TrimSpace(input.Name) == "" || !strings.Contains(strings.TrimSpace(input.Email), "@") {
		return domain.OrganizerTeamMember{}, ErrInvalidCredentials
	}
	switch role {
	case "staff", "assistant", "manager":
	default:
		return domain.OrganizerTeamMember{}, ErrInvalidCredentials
	}
	switch status {
	case "active", "inactive":
	default:
		return domain.OrganizerTeamMember{}, ErrInvalidCredentials
	}
	permissions := input.Permissions
	if len(permissions) == 0 {
		permissions = permissionsForOrganizerRole(role)
	}
	return domain.OrganizerTeamMember{
		ID: id, OrganizerID: organizerID, Name: strings.TrimSpace(input.Name), Email: strings.ToLower(strings.TrimSpace(input.Email)),
		Role: role, Status: status, Permissions: permissions, CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func permissionsForOrganizerRole(role string) []string {
	switch role {
	case "manager":
		return []string{"expos:manage", "team:manage", "reports:view", "payments:view"}
	case "assistant":
		return []string{"expos:edit", "exhibitors:view", "visitors:view"}
	default:
		return []string{"expos:view", "reports:view"}
	}
}

func organizerSponsorFromInput(id string, organizerID string, commissionedBy string, input domain.OrganizerSponsorInput) (domain.OrganizerSponsor, error) {
	tier := defaultString(strings.TrimSpace(input.PlanTier), "bronze")
	status := defaultString(strings.TrimSpace(input.Status), "pending")
	if strings.TrimSpace(input.Company) == "" || strings.TrimSpace(input.ContactName) == "" || !strings.Contains(strings.TrimSpace(input.Email), "@") {
		return domain.OrganizerSponsor{}, ErrInvalidCredentials
	}
	switch tier {
	case "bronze", "silver", "gold", "platinum":
	default:
		return domain.OrganizerSponsor{}, ErrInvalidCredentials
	}
	switch status {
	case "active", "pending", "expired", "cancelled":
	default:
		return domain.OrganizerSponsor{}, ErrInvalidCredentials
	}
	if input.CommissionRate < 0 || input.CommissionRate > 100 {
		return domain.OrganizerSponsor{}, ErrInvalidCredentials
	}
	return domain.OrganizerSponsor{
		ID: id, OrganizerID: organizerID, Company: strings.TrimSpace(input.Company), ContactName: strings.TrimSpace(input.ContactName),
		Email: strings.ToLower(strings.TrimSpace(input.Email)), Phone: strings.TrimSpace(input.Phone),
		PlanName: strings.Title(tier) + " Sponsor", PlanTier: tier, Status: status,
		CommissionedBy: defaultString(strings.TrimSpace(commissionedBy), "Organizer"), CommissionRate: input.CommissionRate, JoinedAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func organizerNameByID(users []DemoUser, organizerID string) string {
	for _, demo := range users {
		if demo.User.ID == organizerID {
			return displayName(demo.User)
		}
	}
	return "Organizer"
}

func categoryFromInput(input domain.CategoryInput) domain.Category {
	name := strings.TrimSpace(input.Name)
	slug := slugify(input.Slug)
	if slug == "" {
		slug = slugify(name)
	}
	active := input.Active
	if !active {
		active = true
	}
	return domain.Category{
		ID:     "cat_" + strings.ReplaceAll(slug, "-", "_"),
		Name:   name,
		Slug:   slug,
		Icon:   defaultString(strings.TrimSpace(input.Icon), "tag"),
		Active: active,
	}
}

func validCategoryRecord(category domain.Category) bool {
	return strings.TrimSpace(category.ID) != "" && strings.TrimSpace(category.Name) != "" && strings.TrimSpace(category.Slug) != ""
}

func slugify(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var builder strings.Builder
	lastDash := false
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			builder.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash && builder.Len() > 0 {
			builder.WriteByte('-')
			lastDash = true
		}
	}
	return strings.Trim(builder.String(), "-")
}

func validAdStatus(status string) bool {
	switch strings.TrimSpace(status) {
	case "draft", "pending_payment", "active", "paused", "rejected":
		return true
	default:
		return false
	}
}

func validSettlementStatus(status string) bool {
	switch strings.TrimSpace(status) {
	case "pending_review", "approved", "rejected", "disbursed":
		return true
	default:
		return false
	}
}

func (s *MemoryStore) productFromInputLocked(createdAt string, input domain.ProductInput, actor domain.User) (domain.ProductRecord, error) {
	if actor.Role != domain.RoleExhibitor || strings.TrimSpace(actor.ID) == "" {
		return domain.ProductRecord{}, ErrInvalidCredentials
	}
	name := strings.TrimSpace(input.Name)
	if name == "" || input.Price < 0 || input.DiscountedPrice < 0 {
		return domain.ProductRecord{}, ErrInvalidCredentials
	}
	if len(compactStrings(input.ImageURLs)) > 5 {
		return domain.ProductRecord{}, ErrInvalidCredentials
	}
	status := strings.TrimSpace(input.Status)
	if status == "" {
		status = "available"
	}
	if !validProductStatus(status) {
		return domain.ProductRecord{}, ErrInvalidCredentials
	}
	mediaType := strings.TrimSpace(input.MediaType)
	if mediaType == "" {
		mediaType = "image"
	}
	if mediaType != "image" && mediaType != "video" {
		return domain.ProductRecord{}, ErrInvalidCredentials
	}
	booth := domain.ExpoExhibitor{}
	for _, item := range s.exhibitors {
		if item.ExhibitorID != actor.ID {
			continue
		}
		if input.ExpoID != "" && item.ExpoID != input.ExpoID {
			continue
		}
		if item.ActivationStatus != "active" {
			continue
		}
		booth = item
		break
	}
	if booth.ID == "" {
		return domain.ProductRecord{}, ErrNotFound
	}
	currency := strings.ToUpper(strings.TrimSpace(input.Currency))
	if currency == "" {
		currency = booth.CurrencyCode
	}
	if currency == "" {
		currency = "KES"
	}
	category := strings.TrimSpace(input.Category)
	if category == "" {
		category = "Uncategorized"
	}
	images := []string{}
	mediaURL := strings.TrimSpace(input.MediaURL)
	if mediaURL != "" && mediaType == "image" {
		images = append(images, mediaURL)
	}
	for _, imageURL := range compactStrings(input.ImageURLs) {
		if len(images) >= 5 {
			break
		}
		exists := false
		for _, current := range images {
			if current == imageURL {
				exists = true
				break
			}
		}
		if !exists {
			images = append(images, imageURL)
		}
	}
	return domain.ProductRecord{
		ExhibitorID: actor.ID, ExpoID: booth.ExpoID, Name: name, Description: strings.TrimSpace(input.Description),
		Price: input.Price, DiscountedPrice: input.DiscountedPrice, Currency: currency, Images: images,
		MediaType: mediaType, MediaURL: mediaURL, DemoVideoURL: strings.TrimSpace(input.DemoVideoURL), PresentationURL: strings.TrimSpace(input.PresentationURL), Specifications: strings.TrimSpace(input.Specifications),
		Category: category, Status: status, Featured: input.Featured, CreatedAt: createdAt,
	}, nil
}

func validProductStatus(status string) bool {
	switch strings.TrimSpace(status) {
	case "available", "out_of_stock", "discontinued":
		return true
	default:
		return false
	}
}

func validExpoExhibitorStatus(status string) string {
	switch strings.TrimSpace(status) {
	case "invited", "pending_activation", "pending_payment", "active", "disabled":
		if status == "pending_payment" {
			return "pending_activation"
		}
		return strings.TrimSpace(status)
	default:
		return "invited"
	}
}

func validLeadTemperature(value string) string {
	switch strings.TrimSpace(value) {
	case "hot", "warm", "cold":
		return strings.TrimSpace(value)
	default:
		return "warm"
	}
}

func validLeadStatus(value string) string {
	switch strings.TrimSpace(value) {
	case "new", "contacted", "meeting_booked", "proposal_sent", "won", "lost":
		return strings.TrimSpace(value)
	case "qualified":
		return "contacted"
	case "quote_sent":
		return "proposal_sent"
	default:
		return "new"
	}
}

func validLeadActivityType(value string) string {
	switch strings.TrimSpace(value) {
	case "call", "email", "whatsapp", "meeting", "note", "follow_up", "status", "temperature":
		return strings.TrimSpace(value)
	default:
		return "note"
	}
}

func validCampaignChannel(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "email", "sms", "whatsapp":
		return strings.TrimSpace(strings.ToLower(value))
	default:
		return ""
	}
}

func validCampaignAudience(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "all_leads", "hot_leads", "warm_leads", "cold_leads", "visitors", "pre_orders":
		return strings.TrimSpace(strings.ToLower(value))
	default:
		return ""
	}
}

func validPaymentStatus(status domain.PaymentStatus) bool {
	switch status {
	case domain.PaymentPending, domain.PaymentPaid, domain.PaymentFailed, domain.PaymentRefunded, domain.PaymentCancelled:
		return true
	default:
		return false
	}
}

func allowedPaymentStatusChange(current domain.PaymentStatus, next domain.PaymentStatus) bool {
	if current == next {
		return true
	}
	switch current {
	case domain.PaymentPending:
		return next == domain.PaymentFailed || next == domain.PaymentCancelled || next == domain.PaymentPaid
	case domain.PaymentPaid:
		return next == domain.PaymentRefunded
	case domain.PaymentFailed:
		return next == domain.PaymentPending || next == domain.PaymentCancelled
	default:
		return false
	}
}

func validLeadSource(source string, action string) string {
	source = strings.TrimSpace(source)
	switch strings.TrimSpace(action) {
	case "pre_order":
		return "pre_order"
	case "meeting", "interest", "call":
		if source == "" || source == "manual" {
			return "inquiry"
		}
	case "visit":
		return "remote_visit"
	}
	switch source {
	case "remote", "remote_visit", "booth_qr", "onsite", "inquiry", "pre_order", "manual":
		return source
	}
	switch strings.TrimSpace(action) {
	case "pre_order":
		return "pre_order"
	case "meeting", "interest", "call":
		return "inquiry"
	case "visit":
		return "remote_visit"
	default:
		return "remote"
	}
}

func compactStrings(values []string) []string {
	items := []string{}
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			items = append(items, strings.TrimSpace(value))
		}
	}
	return items
}

func validMeetingType(value string) string {
	cleaned := strings.TrimSpace(value)
	if cleaned == "" {
		return "Online demo"
	}
	if len(cleaned) > 80 {
		return cleaned[:80]
	}
	return cleaned
}

func defaultMeetingSettings() domain.MeetingSettings {
	return domain.MeetingSettings{CategoryTypes: []string{"Online demo", "Sales consultation", "Product walkthrough", "Partnership discussion", "Post-expo follow-up"}}
}

func visitorSettingsFrom(user domain.User, input domain.VisitorSettingsInput) domain.VisitorSettings {
	settings := domain.VisitorSettings{Name: user.Name, Email: user.Email, Phone: strings.TrimSpace(input.Phone), Company: user.CompanyName, Industry: strings.TrimSpace(input.Industry)}
	settings.Notifications.Email = input.Email
	settings.Notifications.Push = input.Push
	settings.Notifications.ExpoUpdates = input.ExpoUpdates
	settings.Notifications.Reminders = input.Reminders
	return settings
}

func cleanMeetingCategories(values []string) []string {
	items := []string{}
	seen := map[string]bool{}
	for _, value := range values {
		cleaned := strings.TrimSpace(value)
		if cleaned == "" {
			continue
		}
		key := strings.ToLower(cleaned)
		if seen[key] {
			continue
		}
		seen[key] = true
		items = append(items, cleaned)
	}
	return items
}

func fallbackString(value string, fallback string) string {
	if strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	return fallback
}

func dateOnly(value time.Time) time.Time {
	year, month, day := value.Date()
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}

func (s *MemoryStore) categoriesByID(ids []string) []domain.Category {
	if len(ids) == 0 {
		return nil
	}
	seen := map[string]bool{}
	for _, id := range ids {
		seen[id] = true
	}
	categories := []domain.Category{}
	for _, category := range s.categories {
		if seen[category.ID] {
			categories = append(categories, category)
		}
	}
	return categories
}
