package httpapi

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"tandaza/backend/internal/auth"
	"tandaza/backend/internal/config"
	"tandaza/backend/internal/domain"
	"tandaza/backend/internal/store"
)

func testServer() http.Handler {
	cfg := config.Config{FrontendURL: "http://localhost:3000"}
	tokenService := auth.NewTokenService("test-secret", time.Hour)
	mem := store.NewMemoryStore(tokenService)
	server := NewServer(cfg, slog.Default(), mem, tokenService)
	return server.Routes()
}

func TestHealth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	testServer().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
}

func TestLoginAndMe(t *testing.T) {
	body := bytes.NewBufferString(`{"email":"admin@tandaza.demo","password":"admin123"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", body)
	rec := httptest.NewRecorder()
	testServer().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("login status = %d, body=%s", rec.Code, rec.Body.String())
	}
	var login struct {
		Token string `json:"token"`
		User  struct {
			Role string `json:"role"`
		} `json:"user"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &login); err != nil {
		t.Fatalf("decode login: %v", err)
	}
	if login.Token == "" || login.User.Role != "super_administrator" {
		t.Fatalf("unexpected login payload: %+v", login)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+login.Token)
	rec = httptest.NewRecorder()
	testServer().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("me status = %d, body=%s", rec.Code, rec.Body.String())
	}
}

func TestLoginAcceptsBasicAuth(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
	req.SetBasicAuth("admin@tandaza.demo", "admin123")
	rec := httptest.NewRecorder()
	testServer().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("login status = %d, body=%s", rec.Code, rec.Body.String())
	}
	if !bytes.Contains(rec.Body.Bytes(), []byte("super_administrator")) {
		t.Fatalf("expected super administrator login payload, body=%s", rec.Body.String())
	}
}

func TestRegisterAcceptsBasicAuth(t *testing.T) {
	cfg := config.Config{FrontendURL: "http://localhost:3000"}
	tokenService := auth.NewTokenService("test-secret", time.Hour)
	mem := store.NewMemoryStore(tokenService)
	server := NewServer(cfg, slog.Default(), mem, tokenService)
	handler := server.Routes()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBufferString(`{"name":"Remote Visitor","role":"visitor","countryCode":"KE"}`))
	req.SetBasicAuth("remote.visitor@tandaza.demo", "visitor456")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("register status = %d, body=%s", rec.Code, rec.Body.String())
	}
	if !bytes.Contains(rec.Body.Bytes(), []byte("remote.visitor@tandaza.demo")) {
		t.Fatalf("expected registered user payload, body=%s", rec.Body.String())
	}
	if bytes.Contains(rec.Body.Bytes(), []byte(`"token"`)) {
		t.Fatalf("registration should not return a login token before email verification, body=%s", rec.Body.String())
	}
	var registered struct {
		VerificationLink string `json:"verificationLink"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &registered); err != nil {
		t.Fatalf("decode register: %v", err)
	}
	if registered.VerificationLink == "" {
		t.Fatalf("expected verification link, body=%s", rec.Body.String())
	}
	notifications, err := mem.ListNotifications(t.Context(), store.NotificationFilter{})
	if err != nil {
		t.Fatalf("list notifications after register: %v", err)
	}
	if countTemplate(notifications, "email_verification") != 1 || countTemplate(notifications, "account_welcome") != 0 || countTemplate(notifications, "founder_welcome") != 0 {
		t.Fatalf("expected only verification email before verification, notifications=%+v", notifications)
	}
	verificationURL, err := url.Parse(registered.VerificationLink)
	if err != nil {
		t.Fatalf("parse verification link: %v", err)
	}
	verifyReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/verify-email", nil)
	verifyReq.SetBasicAuth(verificationURL.Query().Get("token"), "verify-email")
	verifyRec := httptest.NewRecorder()
	handler.ServeHTTP(verifyRec, verifyReq)
	if verifyRec.Code != http.StatusOK {
		t.Fatalf("verify status = %d, body=%s", verifyRec.Code, verifyRec.Body.String())
	}
	if !bytes.Contains(verifyRec.Body.Bytes(), []byte(`"token"`)) {
		t.Fatalf("expected login token after verification, body=%s", verifyRec.Body.String())
	}
	notifications, err = mem.ListNotifications(t.Context(), store.NotificationFilter{})
	if err != nil {
		t.Fatalf("list notifications after verify: %v", err)
	}
	if countTemplate(notifications, "email_verification") != 1 || countTemplate(notifications, "account_welcome") != 1 || countTemplate(notifications, "founder_welcome") != 1 {
		t.Fatalf("expected verification plus two welcome emails after verification, notifications=%+v", notifications)
	}
}

func countTemplate(items []domain.Notification, templateKey string) int {
	count := 0
	for _, item := range items {
		if item.TemplateKey == templateKey {
			count++
		}
	}
	return count
}

func TestPublicRegisterRejectsOperationalRoles(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBufferString(`{"name":"Public Organizer","role":"organizer","countryCode":"KE"}`))
	req.SetBasicAuth("public.organizer@tandaza.demo", "organizer456")
	rec := httptest.NewRecorder()
	testServer().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("register status = %d, want %d, body=%s", rec.Code, http.StatusBadRequest, rec.Body.String())
	}
}

func TestForgotAndResetPasswordAcceptBasicAuth(t *testing.T) {
	cfg := config.Config{FrontendURL: "http://localhost:3000"}
	tokenService := auth.NewTokenService("test-secret", time.Hour)
	mem := store.NewMemoryStore(tokenService)
	server := NewServer(cfg, slog.Default(), mem, tokenService)
	handler := server.Routes()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/forgot-password", nil)
	req.SetBasicAuth("visitor@tandaza.demo", "ignored")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("forgot password status = %d, body=%s", rec.Code, rec.Body.String())
	}
	var forgot struct {
		Message string `json:"message"`
		Token   string `json:"token"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &forgot); err != nil {
		t.Fatalf("decode forgot: %v", err)
	}
	if forgot.Token != "" || forgot.Message == "" {
		t.Fatalf("expected generic reset response without token, body=%s", rec.Body.String())
	}
	reset, err := mem.ForgotPassword(t.Context(), "visitor@tandaza.demo")
	if err != nil {
		t.Fatalf("create reset token directly: %v", err)
	}
	if reset.Token == "" {
		t.Fatalf("expected reset token from store")
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/reset-password", nil)
	req.SetBasicAuth(reset.Token, "visitor456")
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("reset password status = %d, body=%s", rec.Code, rec.Body.String())
	}

	token := loginForTest(t, handler, "visitor@tandaza.demo", "visitor456")
	if token == "" {
		t.Fatal("expected login token after password reset")
	}
}

func TestGoogleVisitorAuthSignsInExistingVisitor(t *testing.T) {
	handler := testServer()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/google", bytes.NewBufferString(`{"email":"visitor@tandaza.demo","name":"Demo Visitor","picture":"https://example.com/avatar.png"}`))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("google auth status = %d, body=%s", rec.Code, rec.Body.String())
	}
	if !bytes.Contains(rec.Body.Bytes(), []byte(`"role":"visitor"`)) || !bytes.Contains(rec.Body.Bytes(), []byte(`"redirectTo":"/visitor"`)) {
		t.Fatalf("expected visitor google auth payload, body=%s", rec.Body.String())
	}
}

func TestAdminCanConfigureNotificationProviders(t *testing.T) {
	handler := testServer()
	adminToken := loginForTest(t, handler, "admin@tandaza.demo", "admin123")

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/settings/sms", bytes.NewBufferString(`{"provider":"tiaraconnect","senderId":"CONNECT","apiKey":"test-key"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("tiaraconnect")) {
		t.Fatalf("update sms settings failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/settings/email", bytes.NewBufferString(`{"senderName":"Tandaza","senderEmail":"hello@tandaza.africa","smtpHost":"smtp.example.com","smtpPort":587,"username":"smtp-user","password":"smtp-pass","encryption":"starttls"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("smtp.example.com")) {
		t.Fatalf("update email settings failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestAdminCanCreateAdminUser(t *testing.T) {
	handler := testServer()
	adminToken := loginForTest(t, handler, "admin@tandaza.demo", "admin123")
	payload := `{"name":"Security Admin","email":"security.admin@tandaza.demo","password":"admin456","role":"administrator","companyName":"Tandaza","countryCode":"KE","status":"active"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/users", bytes.NewBufferString(payload))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create admin user status = %d, body=%s", rec.Code, rec.Body.String())
	}
	if !bytes.Contains(rec.Body.Bytes(), []byte(`"role":"administrator"`)) {
		t.Fatalf("expected created admin payload, body=%s", rec.Body.String())
	}

	newAdminToken := loginForTest(t, handler, "security.admin@tandaza.demo", "admin456")
	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/users?page=1&pageSize=10", nil)
	req.Header.Set("Authorization", "Bearer "+newAdminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("administrator should not access global system users: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/users/usr_admin_001", bytes.NewBufferString(`{"status":"suspended"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte(`"status":"suspended"`)) {
		t.Fatalf("suspend admin user failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(`{"email":"admin@tandaza.demo","password":"admin123"}`))
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("suspended admin should not login: status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestAdminRoleAccountEndpointsCreateAndUpdateUsers(t *testing.T) {
	handler := testServer()
	adminToken := loginForTest(t, handler, "admin@tandaza.demo", "admin123")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/organizers", bytes.NewBufferString(`{"name":"Dynamic Organizer","email":"dynamic.organizer@tandaza.demo","password":"organizer456","companyName":"Dynamic Expo Co","countryCode":"KE","status":"active"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create organizer status=%d body=%s", rec.Code, rec.Body.String())
	}
	var created struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil || created.ID == "" {
		t.Fatalf("decode created organizer: id=%q err=%v body=%s", created.ID, err, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/organizers/"+created.ID, bytes.NewBufferString(`{"name":"Dynamic Organizer Updated","status":"inactive"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte(`"status":"inactive"`)) {
		t.Fatalf("update organizer status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestAdminSponsorCreateQueuesOnboardingEmails(t *testing.T) {
	cfg := config.Config{FrontendURL: "http://localhost:3000"}
	tokenService := auth.NewTokenService("test-secret", time.Hour)
	mem := store.NewMemoryStore(tokenService)
	server := NewServer(cfg, slog.Default(), mem, tokenService)
	handler := server.Routes()
	adminToken := loginForTest(t, handler, "admin@tandaza.demo", "admin123")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/sponsors", bytes.NewBufferString(`{"name":"Sponsor Lead","email":"sponsor.lead@brand.demo","password":"SponsorPass123","companyName":"Brand Demo","countryCode":"KE","status":"active"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("sponsor.lead@brand.demo")) {
		t.Fatalf("create sponsor status=%d body=%s", rec.Code, rec.Body.String())
	}
	notifications, err := mem.ListNotifications(t.Context(), store.NotificationFilter{})
	if err != nil {
		t.Fatalf("list notifications: %v", err)
	}
	if countTemplate(notifications, "sponsor_account_credentials") != 1 || countTemplate(notifications, "account_welcome") != 1 || countTemplate(notifications, "founder_welcome") != 1 {
		t.Fatalf("expected sponsor credentials, welcome, and founder emails, notifications=%+v", notifications)
	}
}

func TestAdminOrganizerCreateQueuesOnboardingEmails(t *testing.T) {
	cfg := config.Config{FrontendURL: "http://localhost:3000"}
	tokenService := auth.NewTokenService("test-secret", time.Hour)
	mem := store.NewMemoryStore(tokenService)
	server := NewServer(cfg, slog.Default(), mem, tokenService)
	handler := server.Routes()
	adminToken := loginForTest(t, handler, "admin@tandaza.demo", "admin123")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/organizers", bytes.NewBufferString(`{"name":"Organizer Lead","email":"organizer.lead@expo.demo","password":"OrganizerPass123","companyName":"Expo Demo","countryCode":"KE","status":"active"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("organizer.lead@expo.demo")) {
		t.Fatalf("create organizer status=%d body=%s", rec.Code, rec.Body.String())
	}
	notifications, err := mem.ListNotifications(t.Context(), store.NotificationFilter{})
	if err != nil {
		t.Fatalf("list notifications: %v", err)
	}
	if countTemplate(notifications, "organizer_account_credentials") != 1 || countTemplate(notifications, "account_welcome") != 1 || countTemplate(notifications, "founder_welcome") != 1 {
		t.Fatalf("expected organizer credentials, welcome, and founder emails, notifications=%+v", notifications)
	}
}

func TestAdminExhibitorCreateQueuesOnboardingEmails(t *testing.T) {
	cfg := config.Config{FrontendURL: "http://localhost:3000"}
	tokenService := auth.NewTokenService("test-secret", time.Hour)
	mem := store.NewMemoryStore(tokenService)
	server := NewServer(cfg, slog.Default(), mem, tokenService)
	handler := server.Routes()
	adminToken := loginForTest(t, handler, "admin@tandaza.demo", "admin123")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/exhibitors", bytes.NewBufferString(`{"name":"Exhibitor Lead","email":"exhibitor.lead@workspace.demo","password":"ExhibitorPass123","companyName":"Workspace Demo","countryCode":"KE","status":"active"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("exhibitor.lead@workspace.demo")) {
		t.Fatalf("create exhibitor status=%d body=%s", rec.Code, rec.Body.String())
	}
	notifications, err := mem.ListNotifications(t.Context(), store.NotificationFilter{})
	if err != nil {
		t.Fatalf("list notifications: %v", err)
	}
	if countTemplate(notifications, "exhibitor_account_credentials") != 1 || countTemplate(notifications, "account_welcome") != 1 || countTemplate(notifications, "founder_welcome") != 1 {
		t.Fatalf("expected exhibitor credentials, welcome, and founder emails, notifications=%+v", notifications)
	}
}

func TestAdminDynamicRevenueAndMessagingActions(t *testing.T) {
	handler := testServer()
	adminToken := loginForTest(t, handler, "admin@tandaza.demo", "admin123")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/sponsor-plans", bytes.NewBufferString(`{"name":"Silver Sponsor","description":"Mid tier","countryCode":"GH","tier":"silver","price":250000,"currency":"KES","billingCycle":"annual","features":{"bannerAds":true,"boothSize":"medium"},"organizerCommissionPercent":10,"status":"active"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create sponsor plan status=%d body=%s", rec.Code, rec.Body.String())
	}
	var plan struct {
		ID                         string `json:"id"`
		Currency                   string `json:"currency"`
		Price                      int64  `json:"price"`
		OrganizerCommissionPercent int    `json:"organizerCommissionPercent"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &plan)
	if plan.Currency != "GHS" {
		t.Fatalf("expected sponsor plan currency to use selected country default, body=%s", rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/sponsor-plans/"+plan.ID+"/status", bytes.NewBufferString(`{"status":"archived","note":"retired"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte(`"status":"archived"`)) {
		t.Fatalf("archive sponsor plan status=%d body=%s", rec.Code, rec.Body.String())
	}
	var archivedPlan struct {
		Price                      int64 `json:"price"`
		OrganizerCommissionPercent int   `json:"organizerCommissionPercent"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &archivedPlan)
	if archivedPlan.Price != plan.Price || archivedPlan.OrganizerCommissionPercent != plan.OrganizerCommissionPercent {
		t.Fatalf("status update should preserve sponsor plan price and commission, body=%s", rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/ads/sa_001/status", bytes.NewBufferString(`{"status":"paused","note":"review"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte(`"status":"paused"`)) {
		t.Fatalf("pause ad status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/settlements/set_expo_001/status", bytes.NewBufferString(`{"status":"approved"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte(`"status":"approved"`)) {
		t.Fatalf("approve settlement status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/admin/notifications/ntf_001/retry", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("retry notification status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestAdminCanPersistPaystackAndWhatsappSettings(t *testing.T) {
	handler := testServer()
	adminToken := loginForTest(t, handler, "admin@tandaza.demo", "admin123")

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/settings/paystack", bytes.NewBufferString(`{"publicKey":"pk_test","secretKey":"sk_test","callbackUrl":"https://tandaza.test/payments/callback"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("update paystack status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/settings/whatsapp", bytes.NewBufferString(`{"provider":"twilio","accountSid":"sid","authToken":"token","fromNumber":"+254700000000","webhookUrl":"https://tandaza.test/whatsapp"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("update whatsapp status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestHTTPSCanBeRequired(t *testing.T) {
	cfg := config.Config{FrontendURL: "http://localhost:3000", EnforceHTTPS: true}
	tokenService := auth.NewTokenService("test-secret", time.Hour)
	mem := store.NewMemoryStore(tokenService)
	server := NewServer(cfg, slog.Default(), mem, tokenService)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	server.Routes().ServeHTTP(rec, req)
	if rec.Code != http.StatusUpgradeRequired {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusUpgradeRequired)
	}

	req = httptest.NewRequest(http.MethodGet, "/health", nil)
	req.Header.Set("X-Forwarded-Proto", "https")
	rec = httptest.NewRecorder()
	server.Routes().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("https forwarded status = %d, body=%s", rec.Code, rec.Body.String())
	}
}

func TestSensitiveEndpointsAreRateLimited(t *testing.T) {
	cfg := config.Config{FrontendURL: "http://localhost:3000", RateLimitPerMinute: 2}
	tokenService := auth.NewTokenService("test-secret", time.Hour)
	mem := store.NewMemoryStore(tokenService)
	handler := NewServer(cfg, slog.Default(), mem, tokenService).Routes()

	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(`{"email":"wrong@example.com","password":"bad-password"}`))
		req.RemoteAddr = "203.0.113.10:1234"
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code == http.StatusTooManyRequests {
			t.Fatalf("request %d was rate-limited too early", i+1)
		}
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBufferString(`{"email":"wrong@example.com","password":"bad-password"}`))
	req.RemoteAddr = "203.0.113.10:1234"
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("rate limit status=%d, want %d, body=%s", rec.Code, http.StatusTooManyRequests, rec.Body.String())
	}
}

func TestAdminOverviewRequiresAuth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/overview", nil)
	rec := httptest.NewRecorder()
	testServer().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

func TestAuditLogsCaptureLogin(t *testing.T) {
	handler := testServer()
	body := bytes.NewBufferString(`{"email":"admin@tandaza.demo","password":"admin123"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", body)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("login status = %d, body=%s", rec.Code, rec.Body.String())
	}
	var login struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &login); err != nil {
		t.Fatalf("decode login: %v", err)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs", nil)
	req.Header.Set("Authorization", "Bearer "+login.Token)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("audit logs status = %d, body=%s", rec.Code, rec.Body.String())
	}
	if !bytes.Contains(rec.Body.Bytes(), []byte("login_success")) {
		t.Fatalf("expected login_success audit entry, body=%s", rec.Body.String())
	}
}

func TestCollectionsIncludePaginationMetadata(t *testing.T) {
	handler := testServer()
	adminToken := loginForTest(t, handler, "admin@tandaza.demo", "admin123")
	visitorToken := loginForTest(t, handler, "visitor@tandaza.demo", "visitor123")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/expos?page=1&pageSize=1", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("admin expos status = %d, body=%s", rec.Code, rec.Body.String())
	}
	var adminPayload struct {
		Items      []domain.ExpoRecord `json:"items"`
		Page       int                 `json:"page"`
		PageSize   int                 `json:"pageSize"`
		Total      int                 `json:"total"`
		TotalPages int                 `json:"totalPages"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &adminPayload); err != nil {
		t.Fatalf("decode admin expos pagination: %v", err)
	}
	if adminPayload.Page != 1 || adminPayload.PageSize != 1 || adminPayload.Total < 1 || adminPayload.TotalPages < 1 || len(adminPayload.Items) != 1 {
		t.Fatalf("unexpected admin pagination payload: %+v", adminPayload)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/visitor/expos?page=1&pageSize=1", nil)
	req.Header.Set("Authorization", "Bearer "+visitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("visitor expos status = %d, body=%s", rec.Code, rec.Body.String())
	}
	var visitorPayload struct {
		Items    []domain.VisitorExpoRecord `json:"items"`
		PageSize int                        `json:"pageSize"`
		Total    int                        `json:"total"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &visitorPayload); err != nil {
		t.Fatalf("decode visitor expos pagination: %v", err)
	}
	if visitorPayload.PageSize != 1 || visitorPayload.Total < 1 || len(visitorPayload.Items) != 1 {
		t.Fatalf("unexpected visitor pagination payload: %+v", visitorPayload)
	}
}

func TestOrganizerCreatesAndSubmitsExpoThenAdminPublishes(t *testing.T) {
	handler := testServer()
	organizerToken := loginForTest(t, handler, "organizer@tandaza.demo", "organizer123")
	adminToken := loginForTest(t, handler, "admin@tandaza.demo", "admin123")

	payload := `{"name":"Mombasa Trade Expo","description":"Coastal trade showcase.","countryCode":"KE","city":"Mombasa","venue":"Mama Ngina Waterfront","currencyCode":"KES","timezone":"Africa/Nairobi","startDate":"2026-08-10","endDate":"2026-08-12","categoryIds":["cat_technology"]}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/organizer/expos", bytes.NewBufferString(payload))
	req.Header.Set("Authorization", "Bearer "+organizerToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create status = %d, body=%s", rec.Code, rec.Body.String())
	}
	var created struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode created: %v", err)
	}
	if created.Status != "draft" {
		t.Fatalf("created status = %s, want draft", created.Status)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/organizer/expos/"+created.ID+"/submit", nil)
	req.Header.Set("Authorization", "Bearer "+organizerToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("submitted_for_review")) {
		t.Fatalf("submit failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/expos/"+created.ID+"/status", bytes.NewBufferString(`{"status":"published"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("published")) {
		t.Fatalf("publish failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestVisitorCannotCreateOrganizerExpo(t *testing.T) {
	handler := testServer()
	visitorToken := loginForTest(t, handler, "visitor@tandaza.demo", "visitor123")
	req := httptest.NewRequest(http.MethodPost, "/api/v1/organizer/expos", bytes.NewBufferString(`{}`))
	req.Header.Set("Authorization", "Bearer "+visitorToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusForbidden)
	}
}

func TestOrganizerAccountMutationsAreDynamic(t *testing.T) {
	handler := testServer()
	organizerToken := loginForTest(t, handler, "organizer@tandaza.demo", "organizer123")

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/organizer/profile", bytes.NewBufferString(`{"name":"Demo Organizer Updated","companyName":"Expo Group Africa","phone":"+254711000000","address":"Westlands, Nairobi","emailNotifications":true,"smsNotifications":true,"pushNotifications":false}`))
	req.Header.Set("Authorization", "Bearer "+organizerToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Westlands")) {
		t.Fatalf("profile update failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/organizer/team", bytes.NewBufferString(`{"name":"Marketing Lead","email":"marketing.lead@expogroup.demo","role":"assistant","status":"active","temporaryPassword":"TempPass123!"}`))
	req.Header.Set("Authorization", "Bearer "+organizerToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("Marketing Lead")) {
		t.Fatalf("team create failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
	teamToken := loginForTest(t, handler, "marketing.lead@expogroup.demo", "TempPass123!")
	req = httptest.NewRequest(http.MethodGet, "/api/v1/organizer/expos", nil)
	req.Header.Set("Authorization", "Bearer "+teamToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Nairobi Tech Expo")) {
		t.Fatalf("team member organizer workspace access failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/organizer/sponsors", bytes.NewBufferString(`{"company":"New Sponsor Ltd","contactName":"Sponsor Contact","email":"sponsor.contact@example.com","phone":"+254722000000","planTier":"silver","status":"pending"}`))
	req.Header.Set("Authorization", "Bearer "+organizerToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden || !bytes.Contains(rec.Body.Bytes(), []byte("sponsor_invite_disabled")) {
		t.Fatalf("sponsor invite disable failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/organizer/visitors", nil)
	req.Header.Set("Authorization", "Bearer "+organizerToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Demo Visitor")) {
		t.Fatalf("organizer visitors failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/organizer/overview", nil)
	req.Header.Set("Authorization", "Bearer "+organizerToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Visitor Leads")) {
		t.Fatalf("organizer overview failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/organizer/feedback", nil)
	req.Header.Set("Authorization", "Bearer "+organizerToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("organizer feedback failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs", nil)
	req.Header.Set("Authorization", "Bearer "+loginForTest(t, handler, "admin@tandaza.demo", "admin123"))
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("organizer_team_member_created")) {
		t.Fatalf("audit logs missing organizer mutation: status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestExhibitorProductsAndEngagementAreDynamic(t *testing.T) {
	handler := testServer()
	exhibitorToken := loginForTest(t, handler, "exhibitor@tandaza.demo", "exhibitor123")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/exhibitor/products", nil)
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Cloud Analytics Pro")) {
		t.Fatalf("product list failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/products", bytes.NewBufferString(`{"name":"Expo Lead Kit","description":"Lead capture toolkit","price":45000,"discountedPrice":40000,"category":"Technology","mediaType":"image","mediaUrl":"/products/lead-kit.jpg","specifications":"CRM export, reminders","status":"available","featured":true}`))
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("Expo Lead Kit")) {
		t.Fatalf("product create failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
	var created domain.ProductRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode created product: %v", err)
	}

	req = httptest.NewRequest(http.MethodPatch, "/api/v1/exhibitor/products/"+created.ID, bytes.NewBufferString(`{"name":"Expo Lead Kit Plus","description":"Lead capture toolkit","price":47000,"category":"Technology","mediaType":"image","status":"out_of_stock","featured":false}`))
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("out_of_stock")) {
		t.Fatalf("product update failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/exhibitor/expos/expo_001/visitors", nil)
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Demo Visitor")) {
		t.Fatalf("expo visitors failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/exhibitor/expos/expo_001/analytics", nil)
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("visitor lead")) {
		t.Fatalf("expo analytics failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs", nil)
	req.Header.Set("Authorization", "Bearer "+loginForTest(t, handler, "admin@tandaza.demo", "admin123"))
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("exhibitor_product_created")) {
		t.Fatalf("audit logs missing product mutation: status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestExhibitorFeedbackAndCampaignDrafts(t *testing.T) {
	handler := testServer()
	visitorToken := loginForTest(t, handler, "visitor@tandaza.demo", "visitor123")
	exhibitorToken := loginForTest(t, handler, "exhibitor@tandaza.demo", "exhibitor123")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/visitor/feedback", bytes.NewBufferString(`{"expoId":"expo_001","exhibitorId":"usr_exhibitor_001","rating":5,"comment":"Helpful product walkthrough."}`))
	req.Header.Set("Authorization", "Bearer "+visitorToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("feedback submit failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/exhibitor/expos/expo_001/feedback", nil)
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Helpful product walkthrough.")) {
		t.Fatalf("feedback list failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/expos/expo_001/campaigns", bytes.NewBufferString(`{"channel":"email","audience":"hot_leads","name":"Hot lead follow-up","subject":"Thanks for visiting us","message":"Here is the product information we discussed."}`))
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte(`"status":"draft"`)) {
		t.Fatalf("campaign draft create failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/exhibitor/expos/expo_001/campaigns", nil)
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Hot lead follow-up")) {
		t.Fatalf("campaign draft list failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/expos/expo_001/campaigns", bytes.NewBufferString(`{"channel":"push","audience":"hot_leads","name":"Bad","subject":"Bad","message":"Bad"}`))
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("invalid campaign draft should fail: status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestExhibitorActivationPaymentCreatesCommission(t *testing.T) {
	handler := testServer()
	exhibitorToken := loginForTest(t, handler, "exhibitor@tandaza.demo", "exhibitor123")
	organizerToken := loginForTest(t, handler, "organizer@tandaza.demo", "organizer123")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/expos/expo_001/activation-payments", bytes.NewBufferString(`{"idempotencyKey":"test_activation_001"}`))
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create payment status = %d, body=%s", rec.Code, rec.Body.String())
	}
	var created struct {
		Payment struct {
			ID     string `json:"id"`
			Status string `json:"status"`
		} `json:"payment"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode payment: %v", err)
	}
	if created.Payment.ID == "" || created.Payment.Status != "pending" {
		t.Fatalf("unexpected payment payload: %+v", created)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/payments/"+created.Payment.ID+"/confirm", nil)
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("commissionSplit")) {
		t.Fatalf("confirm payment failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/organizer/payments", nil)
	req.Header.Set("Authorization", "Bearer "+organizerToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte(created.Payment.ID)) {
		t.Fatalf("organizer payments missing payment: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/organizer/settlements", nil)
	req.Header.Set("Authorization", "Bearer "+organizerToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("pending review")) {
		t.Fatalf("organizer settlements missing accrual: status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestVisitorCannotCreateActivationPayment(t *testing.T) {
	handler := testServer()
	visitorToken := loginForTest(t, handler, "visitor@tandaza.demo", "visitor123")
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/expos/expo_001/activation-payments", nil)
	req.Header.Set("Authorization", "Bearer "+visitorToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusForbidden)
	}
}

func TestPaystackWebhookConfirmsPayment(t *testing.T) {
	handler := testServer()
	exhibitorToken := loginForTest(t, handler, "exhibitor@tandaza.demo", "exhibitor123")
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/expos/expo_001/activation-payments", bytes.NewBufferString(`{"idempotencyKey":"webhook_activation_001"}`))
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create payment status = %d, body=%s", rec.Code, rec.Body.String())
	}
	var created struct {
		Payment struct {
			ID string `json:"id"`
		} `json:"payment"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode payment: %v", err)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/payments/paystack/webhook", bytes.NewBufferString(`{"event":"charge.success","paymentId":"`+created.Payment.ID+`"}`))
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("paid")) {
		t.Fatalf("webhook confirm failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/expos/expo_001/activation-payments", bytes.NewBufferString(`{"idempotencyKey":"webhook_failed_001"}`))
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create failed-payment candidate status = %d, body=%s", rec.Code, rec.Body.String())
	}
	var failedCandidate struct {
		Payment struct {
			ID string `json:"id"`
		} `json:"payment"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &failedCandidate); err != nil {
		t.Fatalf("decode failed candidate: %v", err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/payments/paystack/webhook", bytes.NewBufferString(`{"event":"charge.failed","data":{"reference":"`+failedCandidate.Payment.ID+`","status":"failed"}}`))
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte(`"status":"failed"`)) {
		t.Fatalf("webhook failure update failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestAdminCanRecordPaymentRefund(t *testing.T) {
	handler := testServer()
	adminToken := loginForTest(t, handler, "admin@tandaza.demo", "admin123")
	exhibitorToken := loginForTest(t, handler, "exhibitor@tandaza.demo", "exhibitor123")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/expos/expo_001/activation-payments", bytes.NewBufferString(`{"idempotencyKey":"admin_refund_001"}`))
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create payment status = %d, body=%s", rec.Code, rec.Body.String())
	}
	var created struct {
		Payment struct {
			ID string `json:"id"`
		} `json:"payment"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode payment: %v", err)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/payments/"+created.Payment.ID+"/confirm", nil)
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("confirm payment status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/payments/"+created.Payment.ID+"/status", bytes.NewBufferString(`{"status":"refunded","reason":"Provider refund verified"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte(`"status":"refunded"`)) {
		t.Fatalf("refund payment failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("payment_status_updated")) {
		t.Fatalf("audit log missing refund: status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestProviderModeInitializesPaystackAndRequiresSignedWebhook(t *testing.T) {
	cfg := config.Config{
		FrontendURL:           "http://localhost:3000",
		PaymentMode:           "provider",
		PaystackBaseURL:       "mock://paystack-success",
		PaystackSecretKey:     "sk_test_provider",
		PaystackWebhookSecret: "whsec_test_provider",
	}
	tokenService := auth.NewTokenService("test-secret", time.Hour)
	mem := store.NewMemoryStore(tokenService)
	handler := NewServer(cfg, slog.Default(), mem, tokenService).Routes()

	exhibitorToken := loginForTest(t, handler, "exhibitor@tandaza.demo", "exhibitor123")
	req := httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/expos/expo_001/activation-payments", bytes.NewBufferString(`{"idempotencyKey":"provider_activation_001"}`))
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("checkout.paystack.test")) {
		t.Fatalf("provider payment init failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
	var created struct {
		Payment struct {
			ID string `json:"id"`
		} `json:"payment"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode provider payment: %v", err)
	}
	if created.Payment.ID == "" {
		t.Fatal("expected payment id")
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/payments/"+created.Payment.ID+"/confirm", nil)
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("manual confirm status=%d, want %d, body=%s", rec.Code, http.StatusConflict, rec.Body.String())
	}

	webhookBody := []byte(`{"event":"charge.success","data":{"reference":"` + created.Payment.ID + `","status":"success"}}`)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/payments/paystack/webhook", bytes.NewReader(webhookBody))
	req.Header.Set("X-Paystack-Signature", testPaystackSignature(webhookBody, "wrong_secret"))
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("bad signature status=%d, want %d, body=%s", rec.Code, http.StatusUnauthorized, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/payments/paystack/webhook", bytes.NewReader(webhookBody))
	req.Header.Set("X-Paystack-Signature", testPaystackSignature(webhookBody, "whsec_test_provider"))
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte(`"status":"paid"`)) {
		t.Fatalf("signed webhook confirm failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestVisitorRemoteExpoAccessBookingQRCodeAndLead(t *testing.T) {
	handler := testServer()
	visitorToken := loginForTest(t, handler, "visitor@tandaza.demo", "visitor123")
	exhibitorToken := loginForTest(t, handler, "exhibitor@tandaza.demo", "exhibitor123")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/visitor/expos", nil)
	req.Header.Set("Authorization", "Bearer "+visitorToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Nairobi Tech Expo")) {
		t.Fatalf("visitor expos failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/visitor/expos/expo_001", nil)
	req.Header.Set("Authorization", "Bearer "+visitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("TechCorp Africa")) || !bytes.Contains(rec.Body.Bytes(), []byte("Cloud Analytics Pro")) {
		t.Fatalf("visitor expo workspace missing exhibitors/products: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/visitor/expos/expo_001/book", bytes.NewBufferString(`{"ticketType":"Remote Access"}`))
	req.Header.Set("Authorization", "Bearer "+visitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("Remote Access")) {
		t.Fatalf("visitor booking failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/exhibitor/expos/expo_001/qrcode", nil)
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("TANDAZA")) {
		t.Fatalf("qrcode failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/expos/expo_001/leads", bytes.NewBufferString(`{"notes":"Please follow up after the expo."}`))
	req.Header.Set("Authorization", "Bearer "+visitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("Demo Visitor")) {
		t.Fatalf("lead capture failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
	var capturedLead domain.LeadRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &capturedLead); err != nil {
		t.Fatalf("decode captured lead: %v", err)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/visitor/expos/expo_001/actions?exhibitor=exe_001", bytes.NewBufferString(`{"action":"meeting","phone":"+254700000001","notes":"Can we meet online tomorrow?","scheduledAt":"2026-09-15T09:00:00Z"}`))
	req.Header.Set("Authorization", "Bearer "+visitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("Can we meet online tomorrow?")) {
		t.Fatalf("visitor meeting action failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPatch, "/api/v1/exhibitor/leads/"+capturedLead.ID, bytes.NewBufferString(`{"status":"contacted","temperature":"hot","followUpNotes":"Called and booked product demo.","nextFollowUpAt":"2026-09-15T09:00:00Z"}`))
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("contacted")) || !bytes.Contains(rec.Body.Bytes(), []byte("hot")) {
		t.Fatalf("lead update failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/leads/"+capturedLead.ID+"/activities", bytes.NewBufferString(`{"type":"call","notes":"Introductory call completed."}`))
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("call")) {
		t.Fatalf("lead activity failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/exhibitor/expos/expo_001/leads", nil)
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Called and booked product demo.")) {
		t.Fatalf("exhibitor leads missing captured lead: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/visitor/timeline", nil)
	req.Header.Set("Authorization", "Bearer "+visitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("contact")) {
		t.Fatalf("visitor timeline missing lead activity: status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestExhibitorGrowthMediaAndLeadActions(t *testing.T) {
	handler := testServer()
	exhibitorToken := loginForTest(t, handler, "exhibitor@tandaza.demo", "exhibitor123")

	var uploadBody bytes.Buffer
	writer := multipart.NewWriter(&uploadBody)
	part, err := writer.CreateFormFile("file", "logo.png")
	if err != nil {
		t.Fatalf("create upload part: %v", err)
	}
	if _, err := part.Write([]byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0}); err != nil {
		t.Fatalf("write upload: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close upload writer: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/media", &uploadBody)
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("/api/backend/uploads/")) {
		t.Fatalf("media upload failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/exhibitor/expos/expo_001/qrcode.svg", nil)
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("TANDAZA-EXE-001")) {
		t.Fatalf("qr svg failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/exhibitor/expos/expo_001/leads/export", nil)
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("visitor@tandaza.demo")) {
		t.Fatalf("lead export failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/leads/lead_001/messages", bytes.NewBufferString(`{"channel":"email","message":"Thanks for engaging with us. Let us schedule a demo."}`))
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("exhibitor_follow_up")) {
		t.Fatalf("lead message failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/expos/expo_001/ads", bytes.NewBufferString(`{"name":"Demo Workspace Boost","placement":"banner","dimensions":"728x90","mediaUrl":"/api/backend/uploads/demo.png","mediaType":"image","budget":25000}`))
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("Demo Workspace Boost")) {
		t.Fatalf("workspace boost failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestNotificationsAndReports(t *testing.T) {
	handler := testServer()
	adminToken := loginForTest(t, handler, "admin@tandaza.demo", "admin123")
	organizerToken := loginForTest(t, handler, "organizer@tandaza.demo", "organizer123")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/notifications", bytes.NewBufferString(`{"userId":"usr_visitor_001","expoId":"expo_001","role":"visitor","channel":"email","templateKey":"expo_reminder","payload":{"subject":"Expo reminder"}}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("Expo reminder")) {
		t.Fatalf("queue notification failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
	var queued struct {
		Notification struct {
			ID string `json:"id"`
		} `json:"notification"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &queued); err != nil {
		t.Fatalf("decode queued notification: %v", err)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/admin/notifications/dispatch-due", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("dispatched")) {
		t.Fatalf("dispatch notifications failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/notifications/"+queued.Notification.ID+"/attempts", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte(`"provider":"smtp"`)) || !bytes.Contains(rec.Body.Bytes(), []byte("smtp is not configured")) {
		t.Fatalf("notification attempts not persisted: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/notifications", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Expo reminder")) {
		t.Fatalf("notifications list failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/reports", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Captured Leads")) {
		t.Fatalf("admin reports failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/organizer/reports", nil)
	req.Header.Set("Authorization", "Bearer "+organizerToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Leads Captured")) {
		t.Fatalf("organizer reports failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestSponsorshipCampaignsAdsAndReports(t *testing.T) {
	handler := testServer()
	sponsorToken := loginForTest(t, handler, "sponsorship@tandaza.demo", "sponsorship123")
	adminToken := loginForTest(t, handler, "admin@tandaza.demo", "admin123")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/sponsor-plans", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Gold Sponsor")) {
		t.Fatalf("sponsor plans failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/sponsor/campaigns", bytes.NewBufferString(`{"name":"Remote Expo Boost","objective":"Increase online exhibitor traffic","budget":120000,"status":"draft","startDate":"2026-06-01","endDate":"2026-06-14"}`))
	req.Header.Set("Authorization", "Bearer "+sponsorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("Remote Expo Boost")) {
		t.Fatalf("create sponsor campaign failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
	var campaign domain.SponsorCampaignRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &campaign); err != nil {
		t.Fatalf("decode campaign: %v", err)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/sponsor/ads", bytes.NewBufferString(`{"campaignId":"`+campaign.ID+`","name":"Visitor Rail Banner","placement":"banner","dimensions":"728x90","mediaType":"image","budget":30000,"status":"pending_payment"}`))
	req.Header.Set("Authorization", "Bearer "+sponsorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("Visitor Rail Banner")) {
		t.Fatalf("create sponsor ad failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
	var ad domain.SponsorAdRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &ad); err != nil {
		t.Fatalf("decode ad: %v", err)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/sponsor/ads/"+ad.ID+"/payments", nil)
	req.Header.Set("Authorization", "Bearer "+sponsorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("payment")) {
		t.Fatalf("initialize sponsor ad payment failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
	var paymentPayload struct {
		Payment domain.SponsorPaymentRecord `json:"payment"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &paymentPayload); err != nil {
		t.Fatalf("decode sponsor payment: %v", err)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/sponsor/payments/"+paymentPayload.Payment.ID+"/confirm", nil)
	req.Header.Set("Authorization", "Bearer "+sponsorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte(`"paymentStatus":"paid"`)) || !bytes.Contains(rec.Body.Bytes(), []byte(`"status":"draft"`)) {
		t.Fatalf("confirm sponsor ad payment failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/sponsor/dashboard", nil)
	req.Header.Set("Authorization", "Bearer "+sponsorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("totalCampaigns")) {
		t.Fatalf("sponsor dashboard failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/ads", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Remote Expo Boost")) {
		t.Fatalf("admin ads failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/ads/"+ad.ID+"/status", bytes.NewBufferString(`{"status":"active"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte(`"status":"active"`)) {
		t.Fatalf("admin ad approval failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/ads/"+ad.ID+"/track", bytes.NewBufferString(`{"event":"impression"}`))
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte(`"impressions":1`)) {
		t.Fatalf("track sponsor ad impression failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestFullBackendExpoJourney(t *testing.T) {
	handler := testServer()
	adminToken := loginForTest(t, handler, "admin@tandaza.demo", "admin123")
	organizerToken := loginForTest(t, handler, "organizer@tandaza.demo", "organizer123")
	exhibitorToken := loginForTest(t, handler, "exhibitor@tandaza.demo", "exhibitor123")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/google", bytes.NewBufferString(`{"email":"remote.google@tandaza.demo","name":"Remote Google Visitor"}`))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("google auth failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
	var googleLogin struct {
		Token string `json:"token"`
		User  struct {
			Name string `json:"name"`
			Role string `json:"role"`
		} `json:"user"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &googleLogin); err != nil {
		t.Fatalf("decode google login: %v", err)
	}
	if googleLogin.Token == "" || googleLogin.User.Role != "visitor" {
		t.Fatalf("unexpected google login payload: %+v", googleLogin)
	}

	expoPayload := `{"name":"Africa Remote Expo","description":"Remote access expo.","countryCode":"KE","city":"Nairobi","venue":"KICC","currencyCode":"KES","timezone":"Africa/Nairobi","startDate":"2026-09-10","endDate":"2026-09-12","categoryIds":["cat_technology"]}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/organizer/expos", bytes.NewBufferString(expoPayload))
	req.Header.Set("Authorization", "Bearer "+organizerToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create expo failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
	var expo domain.ExpoRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &expo); err != nil {
		t.Fatalf("decode expo: %v", err)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/organizer/expos/"+expo.ID+"/submit", nil)
	req.Header.Set("Authorization", "Bearer "+organizerToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("submit expo failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/expos/"+expo.ID, bytes.NewBufferString(`{"name":"Africa Remote Expo","description":"Remote access expo.","organizerId":"usr_organizer_001","countryCode":"KE","city":"Nairobi","venue":"KICC","currencyCode":"KES","timezone":"Africa/Nairobi","exhibitorActivationFeeMinor":500000,"organizerCommissionBps":3000,"startDate":"2026-09-10","endDate":"2026-09-12","categoryIds":["cat_technology"]}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("admin price expo failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/expos/"+expo.ID+"/status", bytes.NewBufferString(`{"status":"published"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("publish expo failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/visitor/expos?page=1&pageSize=10", nil)
	req.Header.Set("Authorization", "Bearer "+googleLogin.Token)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Africa Remote Expo")) {
		t.Fatalf("visitor cannot see published expo: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/admin/exhibitor-assignments", bytes.NewBufferString(`{"expoId":"`+expo.ID+`","exhibitorId":"usr_exhibitor_001","boothNumber":"B12","boothLabel":"Digital Workspace","status":"invited"}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("assign exhibitor failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/expos/"+expo.ID+"/activation-payments", bytes.NewBufferString(`{"idempotencyKey":"full_journey_activation"}`))
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("activation payment failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
	var paymentCreated struct {
		Payment struct {
			ID string `json:"id"`
		} `json:"payment"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &paymentCreated)

	req = httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/payments/"+paymentCreated.Payment.ID+"/confirm", nil)
	req.Header.Set("Authorization", "Bearer "+exhibitorToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("confirm activation failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/visitor/expos/"+expo.ID+"/book", bytes.NewBufferString(`{"ticketType":"Remote Access"}`))
	req.Header.Set("Authorization", "Bearer "+googleLogin.Token)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("visitor booking failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/exhibitor/expos/"+expo.ID+"/leads", bytes.NewBufferString(`{"notes":"Need a demo after the expo."}`))
	req.Header.Set("Authorization", "Bearer "+googleLogin.Token)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("lead capture failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/admin/notifications", bytes.NewBufferString(`{"userId":"usr_visitor_001","expoId":"`+expo.ID+`","role":"visitor","channel":"in_app","templateKey":"expo_reminder","payload":{"subject":"Expo reminder","message":"Your remote expo is ready."}}`))
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated || !bytes.Contains(rec.Body.Bytes(), []byte("preview")) {
		t.Fatalf("queue notification failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
	var queuedNotification struct {
		Notification struct {
			ID string `json:"id"`
		} `json:"notification"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &queuedNotification); err != nil {
		t.Fatalf("decode queued journey notification: %v", err)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/admin/notifications/dispatch-due", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte(`"dispatched"`)) {
		t.Fatalf("dispatch notifications failed: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/notifications/"+queuedNotification.Notification.ID+"/attempts", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte(`"provider":"tandaza_realtime"`)) || !bytes.Contains(rec.Body.Bytes(), []byte(`"saved":true`)) {
		t.Fatalf("journey notification attempt missing: status=%d body=%s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/reports", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte("Captured Leads")) {
		t.Fatalf("reports failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func loginForTest(t *testing.T, handler http.Handler, email string, password string) string {
	t.Helper()
	body := bytes.NewBufferString(`{"email":"` + email + `","password":"` + password + `"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", body)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("login failed for %s: status=%d body=%s", email, rec.Code, rec.Body.String())
	}
	var login struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &login); err != nil {
		t.Fatalf("decode login: %v", err)
	}
	return login.Token
}

func testPaystackSignature(body []byte, secret string) string {
	mac := hmac.New(sha512.New, []byte(secret))
	_, _ = mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}
