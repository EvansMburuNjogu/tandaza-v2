package domain

import "time"

type Role string

const (
	RoleVisitor       Role = "visitor"
	RoleExhibitor     Role = "exhibitor"
	RoleOrganizer     Role = "organizer"
	RoleSponsor       Role = "sponsorship"
	RoleAdministrator Role = "administrator"
	RoleSuperAdmin    Role = "super_administrator"
)

type User struct {
	ID                 string `json:"id"`
	Name               string `json:"name"`
	Email              string `json:"email"`
	Role               Role   `json:"role"`
	AvatarURL          string `json:"avatarUrl"`
	CompanyName        string `json:"companyName"`
	CountryCode        string `json:"countryCode"`
	Status             string `json:"status"`
	MustChangePassword bool   `json:"mustChangePassword"`
}

type RegisterInput struct {
	Name        string `json:"name"`
	Role        Role   `json:"role"`
	CompanyName string `json:"companyName"`
	CountryCode string `json:"countryCode"`
}

type AdminUserInput struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	Role        Role   `json:"role"`
	CompanyName string `json:"companyName"`
	CountryCode string `json:"countryCode"`
	Status      string `json:"status"`
}

type VisitorSettingsInput struct {
	Name        string `json:"name"`
	Phone       string `json:"phone"`
	Company     string `json:"company"`
	Email       bool   `json:"emailNotifications"`
	Push        bool   `json:"pushNotifications"`
	ExpoUpdates bool   `json:"expoUpdates"`
	Reminders   bool   `json:"reminders"`
}

type VisitorSettings struct {
	Name          string `json:"name"`
	Email         string `json:"email"`
	Phone         string `json:"phone"`
	Company       string `json:"company"`
	Notifications struct {
		Email       bool `json:"email"`
		Push        bool `json:"push"`
		ExpoUpdates bool `json:"expoUpdates"`
		Reminders   bool `json:"reminders"`
	} `json:"notifications"`
}

type GoogleAuthInput struct {
	IDToken string `json:"idToken"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
	Subject string `json:"subject"`
}

type GoogleSettings struct {
	ClientID              string `json:"clientId"`
	CalendarIntegrationOn bool   `json:"calendarIntegrationEnabled"`
	CalendarID            string `json:"calendarId"`
	ServiceAccountEmail   string `json:"serviceAccountEmail"`
	ServiceAccountKey     string `json:"serviceAccountKey"`
}

type MeetingSettings struct {
	CategoryTypes []string `json:"categoryTypes"`
}

type OpenAISettings struct {
	Enabled bool   `json:"enabled"`
	APIKey  string `json:"apiKey"`
	Model   string `json:"model"`
}

type EmailSettings struct {
	SenderName  string `json:"senderName"`
	SenderEmail string `json:"senderEmail"`
	SMTPHost    string `json:"smtpHost"`
	SMTPPort    int    `json:"smtpPort"`
	Username    string `json:"username"`
	Password    string `json:"password"`
	Encryption  string `json:"encryption"`
}

type SMSSettings struct {
	Provider string `json:"provider"`
	SenderID string `json:"senderId"`
	APIKey   string `json:"apiKey"`
	BaseURL  string `json:"baseUrl"`
}

type PaystackSettings struct {
	PublicKey        string `json:"publicKey"`
	SecretKey        string `json:"secretKey"`
	CallbackURL      string `json:"callbackUrl"`
	ProcessingFeeBps int    `json:"processingFeeBps"`
}

type WhatsappSettings struct {
	Provider   string `json:"provider"`
	AccountSID string `json:"accountSid"`
	AuthToken  string `json:"authToken"`
	FromNumber string `json:"fromNumber"`
	WebhookURL string `json:"webhookUrl"`
}

type AIAnalyticsSummary struct {
	ID              string         `json:"id"`
	Scope           string         `json:"scope"`
	ScopeID         string         `json:"scopeId"`
	CountryCode     string         `json:"countryCode"`
	Summary         string         `json:"summary"`
	Risks           []string       `json:"risks"`
	Opportunities   []string       `json:"opportunities"`
	Recommendations []string       `json:"recommendations"`
	NextActions     []string       `json:"nextActions"`
	ConfidenceNotes string         `json:"confidenceNotes"`
	SourceMetrics   map[string]any `json:"sourceMetrics"`
	GeneratedBy     string         `json:"generatedBy"`
	GeneratedAt     string         `json:"generatedAt"`
	Provider        string         `json:"provider"`
	Model           string         `json:"model"`
	Status          string         `json:"status"`
	ErrorMessage    string         `json:"errorMessage,omitempty"`
}

type OrganizerProfile struct {
	ID                   string `json:"id"`
	Name                 string `json:"name"`
	Email                string `json:"email"`
	CompanyName          string `json:"companyName"`
	CountryCode          string `json:"countryCode"`
	LogoURL              string `json:"logoUrl"`
	Phone                string `json:"phone"`
	Address              string `json:"address"`
	PayoutMethod         string `json:"payoutMethod"`
	PayoutAccountName    string `json:"payoutAccountName"`
	PayoutBankName       string `json:"payoutBankName"`
	PayoutAccountNumber  string `json:"payoutAccountNumber"`
	PayoutBankBranch     string `json:"payoutBankBranch"`
	PayoutSwiftCode      string `json:"payoutSwiftCode"`
	PayoutMobileProvider string `json:"payoutMobileProvider"`
	PayoutMobileNumber   string `json:"payoutMobileNumber"`
	PayoutNotes          string `json:"payoutNotes"`
	EmailNotifications   bool   `json:"emailNotifications"`
	SMSNotifications     bool   `json:"smsNotifications"`
	PushNotifications    bool   `json:"pushNotifications"`
}

type OrganizerProfileInput struct {
	Name                 string `json:"name"`
	CompanyName          string `json:"companyName"`
	LogoURL              string `json:"logoUrl"`
	Phone                string `json:"phone"`
	Address              string `json:"address"`
	PayoutMethod         string `json:"payoutMethod"`
	PayoutAccountName    string `json:"payoutAccountName"`
	PayoutBankName       string `json:"payoutBankName"`
	PayoutAccountNumber  string `json:"payoutAccountNumber"`
	PayoutBankBranch     string `json:"payoutBankBranch"`
	PayoutSwiftCode      string `json:"payoutSwiftCode"`
	PayoutMobileProvider string `json:"payoutMobileProvider"`
	PayoutMobileNumber   string `json:"payoutMobileNumber"`
	PayoutNotes          string `json:"payoutNotes"`
	EmailNotifications   bool   `json:"emailNotifications"`
	SMSNotifications     bool   `json:"smsNotifications"`
	PushNotifications    bool   `json:"pushNotifications"`
}

type OrganizerTeamMember struct {
	ID          string   `json:"id"`
	OrganizerID string   `json:"organizerId"`
	Name        string   `json:"name"`
	Email       string   `json:"email"`
	Role        string   `json:"role"`
	Status      string   `json:"status"`
	Permissions []string `json:"permissions"`
	CreatedAt   string   `json:"createdAt"`
}

type OrganizerTeamMemberInput struct {
	Name              string   `json:"name"`
	Email             string   `json:"email"`
	Role              string   `json:"role"`
	Status            string   `json:"status"`
	Permissions       []string `json:"permissions"`
	TemporaryPassword string   `json:"temporaryPassword"`
}

type OrganizerSponsor struct {
	ID               string `json:"id"`
	OrganizerID      string `json:"organizerId"`
	Company          string `json:"company"`
	ContactName      string `json:"contactName"`
	Email            string `json:"email"`
	Phone            string `json:"phone"`
	PlanName         string `json:"planName"`
	PlanTier         string `json:"planTier"`
	Status           string `json:"status"`
	CommissionedBy   string `json:"commissionedBy"`
	CommissionRate   int    `json:"commissionRate"`
	CommissionEarned int64  `json:"commissionEarned"`
	TotalPaid        int64  `json:"totalPaid"`
	JoinedAt         string `json:"joinedAt"`
}

type OrganizerSponsorInput struct {
	Company           string `json:"company"`
	ContactName       string `json:"contactName"`
	Email             string `json:"email"`
	Phone             string `json:"phone"`
	PlanTier          string `json:"planTier"`
	CommissionRate    int    `json:"commissionRate"`
	TemporaryPassword string `json:"temporaryPassword"`
	Status            string `json:"status"`
}

type ExhibitorProfile struct {
	ID          string              `json:"id"`
	CompanyName string              `json:"companyName"`
	Logo        string              `json:"logo"`
	LogoURL     string              `json:"logoUrl"`
	Description string              `json:"description"`
	Website     string              `json:"website"`
	Phone       string              `json:"phone"`
	Email       string              `json:"email"`
	Address     string              `json:"address"`
	Categories  []string            `json:"categories"`
	SocialLinks map[string]string   `json:"socialLinks"`
	TeamMembers []map[string]string `json:"teamMembers"`
}

type ForgotPasswordResult struct {
	Message   string `json:"message"`
	Token     string `json:"token,omitempty"`
	ResetLink string `json:"resetLink,omitempty"`
}

type EmailVerificationResult struct {
	Message          string `json:"message"`
	VerificationLink string `json:"verificationLink,omitempty"`
}

type Country struct {
	Code            string   `json:"code"`
	Name            string   `json:"name"`
	DefaultCurrency string   `json:"defaultCurrency"`
	DefaultTimezone string   `json:"defaultTimezone"`
	PaymentMethods  []string `json:"paymentMethods"`
	Active          bool     `json:"active"`
}

type CountryInput struct {
	Code            string   `json:"code"`
	Name            string   `json:"name"`
	DefaultCurrency string   `json:"defaultCurrency"`
	DefaultTimezone string   `json:"defaultTimezone"`
	PaymentMethods  []string `json:"paymentMethods"`
}

type Currency struct {
	Code          string `json:"code"`
	Symbol        string `json:"symbol"`
	DecimalPlaces int    `json:"decimalPlaces"`
}

type Category struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Slug   string `json:"slug"`
	Icon   string `json:"icon"`
	Active bool   `json:"active"`
}

type CategoryInput struct {
	Name   string `json:"name"`
	Slug   string `json:"slug"`
	Icon   string `json:"icon"`
	Active bool   `json:"active"`
}

type ExpoStatus string

const (
	ExpoDraft              ExpoStatus = "draft"
	ExpoSubmittedForReview ExpoStatus = "submitted_for_review"
	ExpoNeedsChanges       ExpoStatus = "needs_changes"
	ExpoApproved           ExpoStatus = "approved"
	ExpoPublished          ExpoStatus = "published"
	ExpoLive               ExpoStatus = "live"
	ExpoCompleted          ExpoStatus = "completed"
	ExpoSettlementPending  ExpoStatus = "settlement_pending"
	ExpoSettled            ExpoStatus = "settled"
	ExpoArchived           ExpoStatus = "archived"
)

type Expo struct {
	ID                          string     `json:"id"`
	Name                        string     `json:"name"`
	Description                 string     `json:"description"`
	OrganizerID                 string     `json:"organizerId"`
	OrganizerName               string     `json:"organizerName"`
	CountryCode                 string     `json:"countryCode"`
	City                        string     `json:"city"`
	Venue                       string     `json:"venue"`
	CurrencyCode                string     `json:"currencyCode"`
	Timezone                    string     `json:"timezone"`
	CoverImageURL               string     `json:"coverImageUrl"`
	ExhibitorActivationFeeMinor int64      `json:"exhibitorActivationFeeMinor"`
	AdsAddonFeeMinor            int64      `json:"adsAddonFeeMinor"`
	OrganizerCommissionBps      int        `json:"organizerCommissionBps"`
	Status                      ExpoStatus `json:"status"`
	StartDate                   time.Time  `json:"startDate"`
	EndDate                     time.Time  `json:"endDate"`
	Categories                  []Category `json:"categories"`
	ExhibitorCount              int        `json:"exhibitorCount"`
	CreatedAt                   time.Time  `json:"createdAt"`
	UpdatedAt                   time.Time  `json:"updatedAt"`
}

type ExpoRecord struct {
	ID                          string     `json:"id"`
	Name                        string     `json:"name"`
	Description                 string     `json:"description"`
	Location                    string     `json:"location"`
	City                        string     `json:"city"`
	Venue                       string     `json:"venue"`
	CountryCode                 string     `json:"countryCode"`
	Dates                       string     `json:"dates"`
	OrganizerID                 string     `json:"organizerId"`
	Organizer                   string     `json:"organizer"`
	StartDate                   string     `json:"startDate"`
	EndDate                     string     `json:"endDate"`
	Currency                    string     `json:"currency"`
	Timezone                    string     `json:"timezone"`
	CoverImageURL               string     `json:"coverImageUrl"`
	CoverImage                  string     `json:"coverImage"`
	ExhibitorFee                int64      `json:"exhibitorFee"`
	ExhibitorActivationFeeMinor int64      `json:"exhibitorActivationFeeMinor"`
	AdsAddonFee                 int64      `json:"adsAddonFee"`
	AdsAddonFeeMinor            int64      `json:"adsAddonFeeMinor"`
	OrganizerCommissionBps      int        `json:"organizerCommissionBps"`
	OrganizerCommissionRate     float64    `json:"organizerCommissionRate"`
	Exhibitors                  int        `json:"exhibitors"`
	Status                      ExpoStatus `json:"status"`
	Categories                  []Category `json:"categories"`
}

type ExpoInput struct {
	Name                        string   `json:"name"`
	Description                 string   `json:"description"`
	OrganizerID                 string   `json:"organizerId"`
	CountryCode                 string   `json:"countryCode"`
	City                        string   `json:"city"`
	Venue                       string   `json:"venue"`
	CurrencyCode                string   `json:"currencyCode"`
	Timezone                    string   `json:"timezone"`
	CoverImageURL               string   `json:"coverImageUrl"`
	ExhibitorActivationFeeMinor int64    `json:"exhibitorActivationFeeMinor"`
	AdsAddonFeeMinor            int64    `json:"adsAddonFeeMinor"`
	OrganizerCommissionBps      int      `json:"organizerCommissionBps"`
	Status                      string   `json:"status"`
	StartDate                   string   `json:"startDate"`
	EndDate                     string   `json:"endDate"`
	CategoryIDs                 []string `json:"categoryIds"`
}

type ExpoStatusInput struct {
	Status string `json:"status"`
	Note   string `json:"note"`
}

type PaymentStatus string

const (
	PaymentPending   PaymentStatus = "pending"
	PaymentPaid      PaymentStatus = "paid"
	PaymentFailed    PaymentStatus = "failed"
	PaymentRefunded  PaymentStatus = "refunded"
	PaymentCancelled PaymentStatus = "cancelled"
)

type PaymentPurpose string

const (
	PaymentExhibitorActivation PaymentPurpose = "exhibitor_activation"
	PaymentSponsorPlacement    PaymentPurpose = "sponsor_placement"
	PaymentExhibitorBoost      PaymentPurpose = "exhibitor_boost"
)

type Payment struct {
	ID                 string         `json:"id"`
	ExpoID             string         `json:"expoId"`
	ExpoName           string         `json:"expoName,omitempty"`
	PayerID            string         `json:"payerId"`
	PayerName          string         `json:"payerName,omitempty"`
	PayerEmail         string         `json:"payerEmail,omitempty"`
	PayerRole          Role           `json:"payerRole"`
	Purpose            PaymentPurpose `json:"purpose"`
	CountryCode        string         `json:"countryCode"`
	CurrencyCode       string         `json:"currencyCode"`
	AmountMinor        int64          `json:"amountMinor"`
	ProcessingFeeMinor int64          `json:"processingFeeMinor"`
	Provider           string         `json:"provider"`
	ProviderRef        string         `json:"providerReference"`
	Status             PaymentStatus  `json:"status"`
	IdempotencyKey     string         `json:"idempotencyKey"`
	CreatedAt          time.Time      `json:"createdAt"`
	PaidAt             *time.Time     `json:"paidAt,omitempty"`
}

type PaymentInput struct {
	ExpoID          string           `json:"expoId"`
	Purpose         PaymentPurpose   `json:"purpose"`
	IdempotencyKey  string           `json:"idempotencyKey"`
	IncludeAdsAddon bool             `json:"includeAdsAddon"`
	PaymentChannels []string         `json:"paymentChannels,omitempty"`
	PaymentMethods  []string         `json:"paymentMethods,omitempty"`
	ROIEstimate     ROIEstimateInput `json:"roiEstimate,omitempty"`
}

type ROIEstimateInput struct {
	EstimatedSpend int64            `json:"estimatedSpend"`
	Currency       string           `json:"currency"`
	Breakdown      map[string]int64 `json:"breakdown"`
	Notes          string           `json:"notes"`
}

type PaymentStatusInput struct {
	Status string `json:"status"`
	Reason string `json:"reason"`
}

type PaymentRecord struct {
	ID            string `json:"id"`
	Reference     string `json:"reference"`
	PayerName     string `json:"payerName"`
	PayerRole     Role   `json:"payerRole"`
	ExpoName      string `json:"expoName"`
	Currency      string `json:"currency"`
	Amount        int64  `json:"amount"`
	ProcessingFee int64  `json:"processingFee"`
	Method        string `json:"method"`
	Status        string `json:"status"`
	PaidAt        string `json:"paidAt"`
}

type ExhibitorPaymentRecord struct {
	ID            string `json:"id"`
	Reference     string `json:"reference"`
	ExpoName      string `json:"expoName"`
	Currency      string `json:"currency"`
	Amount        int64  `json:"amount"`
	ProcessingFee int64  `json:"processingFee"`
	Description   string `json:"description"`
	Status        string `json:"status"`
	PaidAt        string `json:"paidAt"`
	PaymentMethod string `json:"paymentMethod,omitempty"`
}

type PaymentReceipt struct {
	ID             string `json:"id"`
	Reference      string `json:"reference"`
	Type           string `json:"type"`
	EntityID       string `json:"entityId"`
	ExpoName       string `json:"expoName"`
	PayerName      string `json:"payerName"`
	PayerEmail     string `json:"payerEmail"`
	PayeeName      string `json:"payeeName"`
	Description    string `json:"description"`
	Amount         int64  `json:"amount"`
	Currency       string `json:"currency"`
	Tax            int64  `json:"tax"`
	Total          int64  `json:"total"`
	AdsAddonPaid   bool   `json:"adsAddonPaid"`
	AdsAddonFee    int64  `json:"adsAddonFee"`
	ProcessingFee  int64  `json:"processingFee"`
	PlatformFee    int64  `json:"platformFee"`
	PaymentMethod  string `json:"paymentMethod"`
	Status         string `json:"status"`
	PaidAt         string `json:"paidAt"`
	IssuedAt       string `json:"issuedAt"`
	OrganizerShare int64  `json:"organizerShare"`
	PlatformShare  int64  `json:"platformShare"`
	CommissionRate int    `json:"commissionRate"`
}

type SettlementRecord struct {
	ID         string `json:"id"`
	Reference  string `json:"reference"`
	Expo       string `json:"expo"`
	Organizer  string `json:"organizer,omitempty"`
	Period     string `json:"period,omitempty"`
	Currency   string `json:"currency"`
	Amount     int64  `json:"amount"`
	Commission int64  `json:"commission"`
	NetAmount  int64  `json:"netAmount,omitempty"`
	Status     string `json:"status"`
	CreatedAt  string `json:"createdAt"`

	CommissionRate int    `json:"commissionRate,omitempty"`
	PayoutMethod   string `json:"payoutMethod,omitempty"`
	BankName       string `json:"bankName,omitempty"`
	AccountName    string `json:"accountName,omitempty"`
	AccountNumber  string `json:"accountNumber,omitempty"`
	BankBranch     string `json:"bankBranch,omitempty"`
	SwiftCode      string `json:"swiftCode,omitempty"`
	MobileProvider string `json:"mobileProvider,omitempty"`
	MobileNumber   string `json:"mobileNumber,omitempty"`
	PayoutNotes    string `json:"payoutNotes,omitempty"`
}

type ExpoExhibitor struct {
	ID                  string           `json:"id"`
	ExpoID              string           `json:"expoId"`
	ExpoName            string           `json:"expoName,omitempty"`
	ExpoDescription     string           `json:"expoDescription,omitempty"`
	ExhibitorID         string           `json:"exhibitorId"`
	ExhibitorName       string           `json:"exhibitorName,omitempty"`
	ExhibitorEmail      string           `json:"exhibitorEmail,omitempty"`
	BoothNumber         string           `json:"boothNumber"`
	BoothSize           string           `json:"boothSize"`
	BoothLabel          string           `json:"boothLabel,omitempty"`
	ActivationStatus    string           `json:"activationStatus"`
	CurrencyCode        string           `json:"currencyCode,omitempty"`
	AmountMinor         int64            `json:"amountMinor,omitempty"`
	EstimatedSpendMinor int64            `json:"estimatedSpend,omitempty"`
	ROICurrencyCode     string           `json:"roiCurrency,omitempty"`
	ROISpendBreakdown   map[string]int64 `json:"roiBreakdown,omitempty"`
	ROINotes            string           `json:"roiNotes,omitempty"`
	Location            string           `json:"location,omitempty"`
	StartDate           time.Time        `json:"startDate,omitempty"`
	EndDate             time.Time        `json:"endDate,omitempty"`
	ActivatedAt         *time.Time       `json:"activatedAt,omitempty"`
	CreatedAt           time.Time        `json:"createdAt"`
}

type ExpoExhibitorInput struct {
	ExpoID      string `json:"expoId"`
	ExhibitorID string `json:"exhibitorId"`
	BoothNumber string `json:"boothNumber"`
	BoothLabel  string `json:"boothLabel"`
	Status      string `json:"status"`
}

type QRCodeRecord struct {
	ID              string `json:"id"`
	ExpoID          string `json:"expoId"`
	ExpoExhibitorID string `json:"expoExhibitorId,omitempty"`
	Code            string `json:"code"`
	TargetPath      string `json:"targetPath"`
	Type            string `json:"type"`
	Active          bool   `json:"active"`
	CreatedAt       string `json:"createdAt"`
}

type LeadInput struct {
	Name            string   `json:"name"`
	Email           string   `json:"email"`
	Phone           string   `json:"phone"`
	Notes           string   `json:"notes"`
	Source          string   `json:"source"`
	Temperature     string   `json:"temperature"`
	Status          string   `json:"status"`
	Action          string   `json:"action"`
	ProductID       string   `json:"productId"`
	ProductName     string   `json:"productName"`
	ProductPrice    int64    `json:"productPrice"`
	ProductCurrency string   `json:"productCurrency"`
	Quantity        int      `json:"quantity"`
	ScheduledAt     string   `json:"scheduledAt"`
	Location        string   `json:"location"`
	Title           string   `json:"title"`
	CCEmails        []string `json:"ccEmails"`
}

type LeadRecord struct {
	ID                   string               `json:"id"`
	ExpoID               string               `json:"expoId"`
	ExpoName             string               `json:"expoName"`
	ExhibitorID          string               `json:"exhibitorId"`
	VisitorName          string               `json:"visitorName"`
	VisitorEmail         string               `json:"visitorEmail"`
	VisitorPhone         string               `json:"visitorPhone"`
	Notes                string               `json:"notes"`
	Source               string               `json:"source"`
	Temperature          string               `json:"temperature"`
	Status               string               `json:"status"`
	NextFollowUpAt       string               `json:"nextFollowUpAt,omitempty"`
	LastContactedAt      string               `json:"lastContactedAt,omitempty"`
	FollowUpNotes        string               `json:"followUpNotes,omitempty"`
	InterestedProductIds []string             `json:"interestedProductIds,omitempty"`
	ProductName          string               `json:"productName,omitempty"`
	ProductPrice         int64                `json:"productPrice,omitempty"`
	ProductCurrency      string               `json:"productCurrency,omitempty"`
	Quantity             int                  `json:"quantity,omitempty"`
	LastActivity         string               `json:"lastActivity,omitempty"`
	Activities           []LeadActivityRecord `json:"activities,omitempty"`
	CapturedAt           string               `json:"capturedAt"`
}

type LeadUpdateInput struct {
	Status               string   `json:"status"`
	Temperature          string   `json:"temperature"`
	FollowUpNotes        string   `json:"followUpNotes"`
	NextFollowUpAt       string   `json:"nextFollowUpAt"`
	InterestedProductIds []string `json:"interestedProductIds"`
}

type LeadActivityInput struct {
	Type        string `json:"type"`
	Notes       string `json:"notes"`
	ScheduledAt string `json:"scheduledAt"`
}

type ExhibitorFeedbackRecord struct {
	ID           string `json:"id"`
	ExpoID       string `json:"expoId"`
	ExhibitorID  string `json:"exhibitorId"`
	VisitorID    string `json:"visitorId,omitempty"`
	VisitorName  string `json:"visitorName"`
	VisitorEmail string `json:"visitorEmail,omitempty"`
	Rating       int    `json:"rating"`
	Comment      string `json:"comment"`
	SubmittedAt  string `json:"submittedAt"`
}

type ExhibitorFeedbackInput struct {
	ExpoID      string `json:"expoId"`
	ExhibitorID string `json:"exhibitorId"`
	Rating      int    `json:"rating"`
	Comment     string `json:"comment"`
}

type OrganizerFeedbackRecord struct {
	ID            string `json:"id"`
	ExpoID        string `json:"expoId"`
	ExpoName      string `json:"expoName"`
	OrganizerID   string `json:"organizerId,omitempty"`
	ExhibitorID   string `json:"exhibitorId"`
	ExhibitorName string `json:"exhibitorName"`
	Rating        int    `json:"rating"`
	Category      string `json:"category"`
	Comment       string `json:"comment"`
	Improvements  string `json:"improvements"`
	Dislikes      string `json:"dislikes"`
	SubmittedAt   string `json:"submittedAt"`
}

type OrganizerFeedbackInput struct {
	Rating       int    `json:"rating"`
	Category     string `json:"category"`
	Comment      string `json:"comment"`
	Improvements string `json:"improvements"`
	Dislikes     string `json:"dislikes"`
}

type ExhibitorCampaignDraftRecord struct {
	ID          string `json:"id"`
	ExpoID      string `json:"expoId"`
	ExhibitorID string `json:"exhibitorId"`
	Channel     string `json:"channel"`
	Name        string `json:"name"`
	Audience    string `json:"audience"`
	Subject     string `json:"subject"`
	Message     string `json:"message"`
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type ExhibitorCampaignDraftInput struct {
	Channel  string `json:"channel"`
	Name     string `json:"name"`
	Audience string `json:"audience"`
	Subject  string `json:"subject"`
	Message  string `json:"message"`
}

type MeetingInput struct {
	LeadID       string   `json:"leadId"`
	VisitorName  string   `json:"visitorName"`
	VisitorEmail string   `json:"visitorEmail"`
	VisitorPhone string   `json:"visitorPhone"`
	Title        string   `json:"title"`
	MeetingType  string   `json:"meetingType"`
	ScheduledAt  string   `json:"scheduledAt"`
	Location     string   `json:"location"`
	Notes        string   `json:"notes"`
	CCEmails     []string `json:"ccEmails"`
}

type MeetingRecord struct {
	ID             string   `json:"id"`
	LeadID         string   `json:"leadId"`
	ExpoID         string   `json:"expoId"`
	ExhibitorID    string   `json:"exhibitorId"`
	VisitorID      string   `json:"visitorId,omitempty"`
	VisitorName    string   `json:"visitorName"`
	VisitorEmail   string   `json:"visitorEmail"`
	VisitorPhone   string   `json:"visitorPhone"`
	Title          string   `json:"title"`
	MeetingType    string   `json:"meetingType"`
	ScheduledAt    string   `json:"scheduledAt"`
	LocationOrLink string   `json:"locationOrLink"`
	CCEmails       []string `json:"ccEmails,omitempty"`
	Status         string   `json:"status"`
	CreatedAt      string   `json:"createdAt"`
}

type LeadMessageInput struct {
	Channel string `json:"channel"`
	Message string `json:"message"`
}

type ChatMessageInput struct {
	ThreadID string `json:"threadId"`
	Message  string `json:"message"`
}

type ChatMessageRecord struct {
	ID              string `json:"id"`
	ThreadID        string `json:"threadId"`
	ExpoID          string `json:"expoId"`
	ExhibitorID     string `json:"exhibitorId"`
	VisitorID       string `json:"visitorId"`
	SenderID        string `json:"senderId"`
	SenderRole      Role   `json:"senderRole"`
	SenderName      string `json:"senderName"`
	Message         string `json:"message"`
	CreatedAt       string `json:"createdAt"`
	ReadByVisitor   bool   `json:"readByVisitor"`
	ReadByExhibitor bool   `json:"readByExhibitor"`
}

type ExhibitorConversationThread struct {
	ID            string              `json:"id"`
	ExpoID        string              `json:"expoId"`
	ExhibitorID   string              `json:"exhibitorId"`
	ExhibitorName string              `json:"exhibitorName"`
	VisitorID     string              `json:"visitorId"`
	VisitorName   string              `json:"visitorName"`
	VisitorEmail  string              `json:"visitorEmail"`
	LastMessage   string              `json:"lastMessage"`
	LastMessageAt string              `json:"lastMessageAt"`
	UnreadCount   int                 `json:"unreadCount"`
	Messages      []ChatMessageRecord `json:"messages"`
	CreatedAt     string              `json:"createdAt"`
}

type ExhibitorLiveStreamInput struct {
	Title      string `json:"title"`
	YoutubeURL string `json:"youtubeUrl"`
	Enabled    bool   `json:"enabled"`
}

type ExhibitorLiveStreamRecord struct {
	ExpoID      string `json:"expoId"`
	ExhibitorID string `json:"exhibitorId"`
	Title       string `json:"title"`
	YoutubeURL  string `json:"youtubeUrl"`
	EmbedURL    string `json:"embedUrl"`
	Enabled     bool   `json:"enabled"`
	UpdatedAt   string `json:"updatedAt"`
}

type LeadActivityRecord struct {
	ID          string `json:"id"`
	LeadID      string `json:"leadId"`
	Type        string `json:"type"`
	Notes       string `json:"notes"`
	ScheduledAt string `json:"scheduledAt,omitempty"`
	CreatedAt   string `json:"createdAt"`
}

type ExhibitorProfileInput struct {
	CompanyName string            `json:"companyName"`
	Description string            `json:"description"`
	Website     string            `json:"website"`
	Phone       string            `json:"phone"`
	Address     string            `json:"address"`
	LogoURL     string            `json:"logoUrl"`
	Categories  []string          `json:"categories"`
	SocialLinks map[string]string `json:"socialLinks"`
}

type CompanyDocumentInput struct {
	Name     string `json:"name"`
	URL      string `json:"url"`
	MimeType string `json:"mimeType"`
	Size     int    `json:"size"`
}

type CompanyDocumentRecord struct {
	ID          string `json:"id"`
	ExhibitorID string `json:"exhibitorId"`
	Name        string `json:"name"`
	URL         string `json:"url"`
	MimeType    string `json:"mimeType"`
	Size        int    `json:"size"`
	UploadedAt  string `json:"uploadedAt"`
}

type ExpoDocumentRecord struct {
	ID          string `json:"id"`
	ExpoID      string `json:"expoId"`
	ExhibitorID string `json:"exhibitorId"`
	Name        string `json:"name"`
	URL         string `json:"url"`
	Type        string `json:"type"`
	MimeType    string `json:"mimeType"`
	Size        int    `json:"size"`
	UploadedAt  string `json:"uploadedAt"`
}

type ProductRecord struct {
	ID              string   `json:"id"`
	ExhibitorID     string   `json:"exhibitorId"`
	ExpoID          string   `json:"expoId,omitempty"`
	Name            string   `json:"name"`
	Description     string   `json:"description"`
	Price           int64    `json:"price"`
	DiscountedPrice int64    `json:"discountedPrice,omitempty"`
	Currency        string   `json:"currency"`
	Images          []string `json:"images"`
	MediaType       string   `json:"mediaType,omitempty"`
	MediaURL        string   `json:"mediaUrl,omitempty"`
	DemoVideoURL    string   `json:"demoVideoUrl,omitempty"`
	PresentationURL string   `json:"presentationUrl,omitempty"`
	Specifications  string   `json:"specifications,omitempty"`
	Category        string   `json:"category"`
	Status          string   `json:"status"`
	Featured        bool     `json:"featured"`
	CreatedAt       string   `json:"createdAt"`
}

type VisitorBoothRecord struct {
	ID               string                  `json:"id"`
	ExpoID           string                  `json:"expoId"`
	ExhibitorID      string                  `json:"exhibitorId"`
	ExhibitorName    string                  `json:"exhibitorName"`
	ExhibitorLogo    string                  `json:"exhibitorLogo,omitempty"`
	Description      string                  `json:"description,omitempty"`
	Email            string                  `json:"email,omitempty"`
	Phone            string                  `json:"phone,omitempty"`
	Address          string                  `json:"address,omitempty"`
	Categories       []string                `json:"categories,omitempty"`
	BoothNumber      string                  `json:"boothNumber"`
	BoothLabel       string                  `json:"boothLabel"`
	Products         []ProductRecord         `json:"products"`
	CompanyDocuments []CompanyDocumentRecord `json:"companyDocuments,omitempty"`
	ExpoDocuments    []ExpoDocumentRecord    `json:"expoDocuments,omitempty"`
}

type ProductInput struct {
	ExpoID          string   `json:"expoId"`
	Name            string   `json:"name"`
	Description     string   `json:"description"`
	Price           int64    `json:"price"`
	DiscountedPrice int64    `json:"discountedPrice"`
	Currency        string   `json:"currency"`
	MediaType       string   `json:"mediaType"`
	MediaURL        string   `json:"mediaUrl"`
	DemoVideoURL    string   `json:"demoVideoUrl"`
	PresentationURL string   `json:"presentationUrl"`
	ImageURLs       []string `json:"imageUrls"`
	Specifications  string   `json:"specifications"`
	Category        string   `json:"category"`
	Status          string   `json:"status"`
	Featured        bool     `json:"featured"`
}

type VisitorExpoRecord struct {
	ID            string               `json:"id"`
	Name          string               `json:"name"`
	Description   string               `json:"description"`
	StartDate     string               `json:"startDate"`
	EndDate       string               `json:"endDate"`
	Venue         string               `json:"venue"`
	VenueAddress  string               `json:"venueAddress"`
	BannerImage   string               `json:"bannerImage"`
	Category      string               `json:"category"`
	OrganizerName string               `json:"organizerName"`
	TicketPrice   int64                `json:"ticketPrice"`
	IsBookmarked  bool                 `json:"isBookmarked"`
	Booths        []VisitorBoothRecord `json:"booths,omitempty"`
	Ads           []SponsorAdRecord    `json:"ads,omitempty"`
}

type VisitorBookingRecord struct {
	ID          string `json:"id"`
	ExpoID      string `json:"expoId"`
	ExpoName    string `json:"expoName"`
	ExpoDate    string `json:"expoDate"`
	Venue       string `json:"venue"`
	TicketType  string `json:"ticketType"`
	TicketPrice int64  `json:"ticketPrice"`
	Status      string `json:"status"`
	BookedAt    string `json:"bookedAt"`
	QRCode      string `json:"qrCode"`
}

type VisitorActivityItem struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Timestamp   string `json:"timestamp"`
	ExpoID      string `json:"expoId,omitempty"`
	ExhibitorID string `json:"exhibitorId,omitempty"`
}

type VisitorTimelineDay struct {
	Date       string                `json:"date"`
	Activities []VisitorActivityItem `json:"activities"`
}

type VisitorDashboardStats struct {
	TotalBookings    int                    `json:"totalBookings"`
	UpcomingEvents   int                    `json:"upcomingEvents"`
	TotalVisits      int                    `json:"totalVisits"`
	FavoritesCount   int                    `json:"favoritesCount"`
	RecentActivity   []VisitorActivityItem  `json:"recentActivity"`
	UpcomingBookings []VisitorBookingRecord `json:"upcomingBookings"`
}

type VisitorFavoriteRecord struct {
	ID      string `json:"id"`
	Type    string `json:"type"`
	ItemID  string `json:"itemId"`
	Name    string `json:"name"`
	Image   string `json:"image"`
	AddedAt string `json:"addedAt"`
}

type VisitorFavoriteInput struct {
	Type   string `json:"type"`
	ItemID string `json:"itemId"`
}

type Notification struct {
	ID             string         `json:"id"`
	UserID         string         `json:"userId,omitempty"`
	Recipient      string         `json:"recipient,omitempty"`
	RecipientEmail string         `json:"recipientEmail,omitempty"`
	RecipientPhone string         `json:"recipientPhone,omitempty"`
	ExpoID         string         `json:"expoId,omitempty"`
	Role           Role           `json:"role"`
	Channel        string         `json:"channel"`
	TemplateKey    string         `json:"templateKey"`
	Payload        map[string]any `json:"payload"`
	Status         string         `json:"status"`
	ScheduledAt    time.Time      `json:"scheduledAt"`
	SentAt         *time.Time     `json:"sentAt,omitempty"`
	ReadAt         *time.Time     `json:"readAt,omitempty"`
	DismissedAt    *time.Time     `json:"dismissedAt,omitempty"`
	FailureReason  string         `json:"failureReason,omitempty"`
}

type NotificationAttempt struct {
	ID              string         `json:"id"`
	NotificationID  string         `json:"notificationId"`
	Channel         string         `json:"channel"`
	Provider        string         `json:"provider"`
	Status          string         `json:"status"`
	RequestPayload  map[string]any `json:"requestPayload"`
	ResponsePayload map[string]any `json:"responsePayload"`
	FailureReason   string         `json:"failureReason,omitempty"`
	CreatedAt       time.Time      `json:"createdAt"`
}

type NotificationInput struct {
	UserID      string         `json:"userId"`
	ExpoID      string         `json:"expoId"`
	Role        Role           `json:"role"`
	Channel     string         `json:"channel"`
	TemplateKey string         `json:"templateKey"`
	Payload     map[string]any `json:"payload"`
	ScheduledAt string         `json:"scheduledAt"`
}

type NotificationRecord struct {
	ID        string `json:"id"`
	Recipient string `json:"recipient"`
	Role      Role   `json:"role"`
	Channel   string `json:"channel"`
	Subject   string `json:"subject"`
	Message   string `json:"message"`
	Status    string `json:"status"`
	SentAt    string `json:"sentAt"`
	ActionURL string `json:"actionUrl,omitempty"`
	Unread    bool   `json:"unread"`
}

type ReportMetric struct {
	Label string `json:"label"`
	Value string `json:"value"`
	Delta string `json:"delta"`
}

type ReportSeriesItem struct {
	Label string `json:"label"`
	Value int64  `json:"value"`
}

type ExpoRankingReport struct {
	ExpoID       string `json:"expoId"`
	ExpoName     string `json:"expoName"`
	Revenue      int64  `json:"revenue"`
	Commission   int64  `json:"commission"`
	Leads        int64  `json:"leads"`
	Visitors     int64  `json:"visitors"`
	Exhibitors   int64  `json:"exhibitors"`
	Active       int64  `json:"activeExhibitors"`
	Interactions int64  `json:"interactions"`
	Score        int64  `json:"score"`
}

type AdministratorReportsResponse struct {
	Performance      []ReportMetric     `json:"performance"`
	RevenueSeries    []ReportSeriesItem `json:"revenueSeries"`
	EngagementSeries []ReportSeriesItem `json:"engagementSeries"`
	TopInsights      []string           `json:"topInsights"`
}

type OrganizerReportsResponse struct {
	ExpoPerformance     []ReportMetric      `json:"expoPerformance"`
	RevenueSeries       []ReportSeriesItem  `json:"revenueSeries"`
	EngagementSeries    []ReportSeriesItem  `json:"engagementSeries"`
	VisitorDemographics []ReportSeriesItem  `json:"visitorDemographics"`
	ExhibitorSeries     []ReportSeriesItem  `json:"exhibitorSeries"`
	LeadStatusSeries    []ReportSeriesItem  `json:"leadStatusSeries"`
	LeadTemperature     []ReportSeriesItem  `json:"leadTemperatureSeries"`
	PaymentStatusSeries []ReportSeriesItem  `json:"paymentStatusSeries"`
	SettlementSeries    []ReportSeriesItem  `json:"settlementSeries"`
	ExpoLifecycleSeries []ReportSeriesItem  `json:"expoLifecycleSeries"`
	ExpoDailySeries     []ReportSeriesItem  `json:"expoDailySeries"`
	ExpoRankings        []ExpoRankingReport `json:"expoRankings"`
	TopInsights         []string            `json:"topInsights"`
}

type SponsorPlanRecord struct {
	ID                         string         `json:"id"`
	Name                       string         `json:"name"`
	Description                string         `json:"description"`
	CountryCode                string         `json:"countryCode"`
	Tier                       string         `json:"tier"`
	Price                      int64          `json:"price"`
	Currency                   string         `json:"currency"`
	BillingCycle               string         `json:"billingCycle"`
	Features                   map[string]any `json:"features"`
	OrganizerCommissionPercent int            `json:"organizerCommissionPercent"`
	Status                     string         `json:"status"`
	CreatedAt                  string         `json:"createdAt"`
}

type SponsorPlanInput struct {
	Name                       string         `json:"name"`
	Description                string         `json:"description"`
	CountryCode                string         `json:"countryCode"`
	Tier                       string         `json:"tier"`
	Price                      int64          `json:"price"`
	Currency                   string         `json:"currency"`
	BillingCycle               string         `json:"billingCycle"`
	Features                   map[string]any `json:"features"`
	OrganizerCommissionPercent int            `json:"organizerCommissionPercent"`
	Status                     string         `json:"status"`
}

type StatusInput struct {
	Status string `json:"status"`
	Note   string `json:"note"`
}

type SponsorCampaignRecord struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Objective        string `json:"objective"`
	Budget           int64  `json:"budget"`
	Status           string `json:"status"`
	StartDate        string `json:"startDate"`
	EndDate          string `json:"endDate"`
	AdsCount         int    `json:"adsCount"`
	TotalImpressions int64  `json:"totalImpressions"`
	TotalClicks      int64  `json:"totalClicks"`
	TotalSpend       int64  `json:"totalSpend"`
	CreatedAt        string `json:"createdAt"`
	SponsorID        string `json:"sponsorId,omitempty"`
}

type SponsorCampaignInput struct {
	Name      string `json:"name"`
	Objective string `json:"objective"`
	Budget    int64  `json:"budget"`
	Status    string `json:"status"`
	StartDate string `json:"startDate"`
	EndDate   string `json:"endDate"`
}

type SponsorAdRecord struct {
	ID            string  `json:"id"`
	ExpoID        string  `json:"expoId,omitempty"`
	SponsorName   string  `json:"sponsorName,omitempty"`
	CountryCode   string  `json:"countryCode"`
	CampaignID    string  `json:"campaignId"`
	CampaignName  string  `json:"campaignName"`
	Name          string  `json:"name"`
	Placement     string  `json:"placement"`
	Dimensions    string  `json:"dimensions"`
	MediaURL      string  `json:"mediaUrl"`
	MediaType     string  `json:"mediaType"`
	Budget        int64   `json:"budget"`
	DailySpend    int64   `json:"dailySpend"`
	Impressions   int64   `json:"impressions"`
	Clicks        int64   `json:"clicks"`
	CTR           float64 `json:"ctr"`
	Status        string  `json:"status"`
	PaymentStatus string  `json:"paymentStatus"`
	CreatedAt     string  `json:"createdAt"`
	SponsorID     string  `json:"sponsorId,omitempty"`
}

type SponsorAdInput struct {
	ExpoID     string `json:"expoId"`
	CampaignID string `json:"campaignId"`
	Name       string `json:"name"`
	Placement  string `json:"placement"`
	Dimensions string `json:"dimensions"`
	MediaURL   string `json:"mediaUrl"`
	MediaType  string `json:"mediaType"`
	Budget     int64  `json:"budget"`
	Status     string `json:"status"`
}

type SponsorPaymentRecord struct {
	ID            string `json:"id"`
	Reference     string `json:"reference"`
	AdID          string `json:"adId"`
	AdName        string `json:"adName"`
	Amount        int64  `json:"amount"`
	Currency      string `json:"currency"`
	PaymentMethod string `json:"paymentMethod"`
	Status        string `json:"status"`
	PaidAt        string `json:"paidAt"`
}

type SponsorDashboardStats struct {
	TotalCampaigns   int               `json:"totalCampaigns"`
	ActiveCampaigns  int               `json:"activeCampaigns"`
	TotalAds         int               `json:"totalAds"`
	ActiveAds        int               `json:"activeAds"`
	TotalImpressions int64             `json:"totalImpressions"`
	TotalClicks      int64             `json:"totalClicks"`
	AverageCtr       float64           `json:"averageCtr"`
	TotalSpend       int64             `json:"totalSpend"`
	RecentAds        []SponsorAdRecord `json:"recentAds"`
}

type CommissionSplit struct {
	GrossMinor      int64  `json:"grossMinor"`
	CommissionMinor int64  `json:"commissionMinor"`
	PlatformMinor   int64  `json:"platformMinor"`
	RateBps         int    `json:"rateBps"`
	CurrencyCode    string `json:"currencyCode"`
}

type DashboardStat struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Value string `json:"value"`
	Delta string `json:"delta"`
	Trend string `json:"trend"`
}

type AuditLog struct {
	ID         string         `json:"id"`
	ActorID    string         `json:"actorId"`
	Actor      string         `json:"actor"`
	ActorRole  Role           `json:"actorRole"`
	ExpoID     string         `json:"expoId,omitempty"`
	Action     string         `json:"action"`
	EntityType string         `json:"entityType"`
	EntityID   string         `json:"entityId"`
	IPAddress  string         `json:"ipAddress"`
	Metadata   map[string]any `json:"metadata"`
	CreatedAt  time.Time      `json:"createdAt"`
}

type AppLog struct {
	ID        string         `json:"id"`
	Level     string         `json:"level"`
	Message   string         `json:"message"`
	RequestID string         `json:"requestId,omitempty"`
	Method    string         `json:"method,omitempty"`
	Path      string         `json:"path,omitempty"`
	Status    int            `json:"status,omitempty"`
	LatencyMs int64          `json:"latencyMs,omitempty"`
	UserID    string         `json:"userId,omitempty"`
	Metadata  map[string]any `json:"metadata"`
	CreatedAt time.Time      `json:"createdAt"`
}
