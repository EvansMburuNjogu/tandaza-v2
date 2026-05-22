package httpapi

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"tandaza/backend/internal/config"
	"tandaza/backend/internal/domain"
)

type paymentCheckout struct {
	AuthorizationURL string
	Reference        string
	AccessCode       string
	ProviderResponse map[string]any
}

type paystackVerification struct {
	Reference        string
	Status           string
	AmountMinor      int64
	CurrencyCode     string
	ProviderResponse map[string]any
}

func (s *Server) paymentGatewayRequiresWebhook(ctx context.Context) bool {
	cfg := s.configWithAdminPaystackSettings(ctx)
	mode := strings.ToLower(strings.TrimSpace(cfg.PaymentMode))
	if mode == "simulated" || mode == "local" {
		return false
	}
	if mode == "provider" || mode == "paystack" {
		return true
	}
	return cfg.Environment == "production" || strings.TrimSpace(cfg.PaystackSecretKey) != ""
}

func (s *Server) initializePaystackCheckout(ctx context.Context, payment domain.Payment, email string, metadata map[string]any) (paymentCheckout, error) {
	cfg := s.configWithAdminPaystackSettings(ctx)
	if !s.paymentGatewayRequiresWebhook(ctx) {
		return paymentCheckout{AuthorizationURL: fmt.Sprintf("https://checkout.paystack.com/%s", payment.ID), Reference: payment.ID}, nil
	}
	if strings.TrimSpace(cfg.PaystackSecretKey) == "" {
		return paymentCheckout{}, fmt.Errorf("paystack secret key is not configured")
	}
	if strings.TrimSpace(email) == "" {
		return paymentCheckout{}, fmt.Errorf("payer email is required for paystack initialization")
	}
	if strings.HasPrefix(strings.TrimSpace(cfg.PaystackBaseURL), "mock://") {
		return paymentCheckout{
			AuthorizationURL: "https://checkout.paystack.test/" + payment.ID,
			Reference:        payment.ID,
			AccessCode:       "access_" + payment.ID,
			ProviderResponse: map[string]any{"mock": true, "reference": payment.ID},
		}, nil
	}
	callbackURL := paystackCallbackURL(cfg)
	channels := paystackChannelsFromMetadata(metadata)
	body := map[string]any{
		"email":     email,
		"amount":    payment.AmountMinor,
		"currency":  payment.CurrencyCode,
		"reference": payment.ID,
		"channels":  channels,
		"metadata":  metadata,
	}
	if callbackURL != "" {
		body["callback_url"] = callbackURL
	}
	payload, _ := json.Marshal(body)
	endpoint := strings.TrimRight(firstNonEmptyString(cfg.PaystackBaseURL, "https://api.paystack.co"), "/") + "/transaction/initialize"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return paymentCheckout{}, err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.PaystackSecretKey)
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return paymentCheckout{}, err
	}
	defer resp.Body.Close()
	responseBody, _ := io.ReadAll(io.LimitReader(resp.Body, 8192))
	var response struct {
		Status  bool   `json:"status"`
		Message string `json:"message"`
		Data    struct {
			AuthorizationURL string `json:"authorization_url"`
			AccessCode       string `json:"access_code"`
			Reference        string `json:"reference"`
		} `json:"data"`
	}
	_ = json.Unmarshal(responseBody, &response)
	providerResponse := map[string]any{"statusCode": resp.StatusCode, "body": string(responseBody)}
	if response.Status {
		providerResponse["message"] = response.Message
		providerResponse["reference"] = response.Data.Reference
		providerResponse["accessCode"] = response.Data.AccessCode
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 || !response.Status || response.Data.AuthorizationURL == "" {
		return paymentCheckout{}, fmt.Errorf("paystack initialization failed: %s", firstNonEmptyString(response.Message, strconv.Itoa(resp.StatusCode)))
	}
	return paymentCheckout{
		AuthorizationURL: response.Data.AuthorizationURL,
		Reference:        firstNonEmptyString(response.Data.Reference, payment.ID),
		AccessCode:       response.Data.AccessCode,
		ProviderResponse: providerResponse,
	}, nil
}

func paystackChannelsFromMetadata(metadata map[string]any) []string {
	allowed := map[string]bool{"card": true, "bank": true, "ussd": true, "qr": true, "mobile_money": true, "bank_transfer": true, "eft": true}
	channels := []string{}
	add := func(value string) {
		value = strings.ToLower(strings.TrimSpace(value))
		if value == "mobile money" {
			value = "mobile_money"
		}
		if value == "bank transfer" {
			value = "bank_transfer"
		}
		if !allowed[value] {
			return
		}
		for _, existing := range channels {
			if existing == value {
				return
			}
		}
		channels = append(channels, value)
	}
	if raw, ok := metadata["paymentChannels"]; ok {
		switch values := raw.(type) {
		case []string:
			for _, value := range values {
				add(value)
			}
		case []any:
			for _, value := range values {
				if text, ok := value.(string); ok {
					add(text)
				}
			}
		}
	}
	if len(channels) == 0 {
		channels = append(channels, "card")
	}
	return channels
}

func (s *Server) verifyPaystackTransaction(ctx context.Context, reference string) (paystackVerification, error) {
	cfg := s.configWithAdminPaystackSettings(ctx)
	reference = strings.TrimSpace(reference)
	if reference == "" {
		return paystackVerification{}, fmt.Errorf("transaction reference is required")
	}
	if strings.HasPrefix(strings.TrimSpace(cfg.PaystackBaseURL), "mock://") {
		return paystackVerification{
			Reference: reference,
			Status:    "success",
			ProviderResponse: map[string]any{
				"mock":      true,
				"reference": reference,
				"status":    "success",
			},
		}, nil
	}
	if strings.TrimSpace(cfg.PaystackSecretKey) == "" {
		return paystackVerification{}, fmt.Errorf("paystack secret key is not configured")
	}
	endpoint := strings.TrimRight(firstNonEmptyString(cfg.PaystackBaseURL, "https://api.paystack.co"), "/") + "/transaction/verify/" + url.PathEscape(reference)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return paystackVerification{}, err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.PaystackSecretKey)
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return paystackVerification{}, err
	}
	defer resp.Body.Close()
	responseBody, _ := io.ReadAll(io.LimitReader(resp.Body, 8192))
	var response struct {
		Status  bool   `json:"status"`
		Message string `json:"message"`
		Data    struct {
			Reference string `json:"reference"`
			Status    string `json:"status"`
			Amount    int64  `json:"amount"`
			Currency  string `json:"currency"`
			Gateway   string `json:"gateway_response"`
		} `json:"data"`
	}
	_ = json.Unmarshal(responseBody, &response)
	providerResponse := map[string]any{"statusCode": resp.StatusCode, "body": string(responseBody)}
	if response.Status {
		providerResponse["message"] = response.Message
		providerResponse["reference"] = response.Data.Reference
		providerResponse["status"] = response.Data.Status
		providerResponse["gatewayResponse"] = response.Data.Gateway
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 || !response.Status {
		return paystackVerification{}, fmt.Errorf("paystack verification failed: %s", firstNonEmptyString(response.Message, strconv.Itoa(resp.StatusCode)))
	}
	return paystackVerification{
		Reference:        firstNonEmptyString(response.Data.Reference, reference),
		Status:           strings.ToLower(strings.TrimSpace(response.Data.Status)),
		AmountMinor:      response.Data.Amount,
		CurrencyCode:     strings.ToUpper(strings.TrimSpace(response.Data.Currency)),
		ProviderResponse: providerResponse,
	}, nil
}

func paystackCallbackURL(cfg config.Config) string {
	if strings.TrimSpace(cfg.PaystackCallbackURL) != "" {
		return strings.TrimSpace(cfg.PaystackCallbackURL)
	}
	if strings.TrimSpace(cfg.FrontendURL) == "" {
		return ""
	}
	return strings.TrimRight(strings.TrimSpace(cfg.FrontendURL), "/") + "/payments/callback"
}

func (s *Server) configWithAdminPaystackSettings(ctx context.Context) config.Config {
	cfg := s.cfg
	if settings, err := s.store.PaystackSettings(ctx); err == nil {
		if strings.TrimSpace(settings.PublicKey) != "" {
			cfg.PaystackPublicKey = settings.PublicKey
		}
		if strings.TrimSpace(settings.SecretKey) != "" {
			cfg.PaystackSecretKey = settings.SecretKey
		}
		if strings.TrimSpace(settings.CallbackURL) != "" {
			cfg.PaystackCallbackURL = settings.CallbackURL
		}
	}
	return cfg
}

func (s *Server) verifyPaystackSignature(ctx context.Context, body []byte, signature string) bool {
	cfg := s.configWithAdminPaystackSettings(ctx)
	secret := strings.TrimSpace(firstNonEmptyString(cfg.PaystackWebhookSecret, cfg.PaystackSecretKey))
	if secret == "" && !s.paymentGatewayRequiresWebhook(ctx) {
		return true
	}
	if secret == "" || strings.TrimSpace(signature) == "" {
		return false
	}
	mac := hmac.New(sha512.New, []byte(secret))
	_, _ = mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(strings.ToLower(strings.TrimSpace(signature))), []byte(expected))
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
