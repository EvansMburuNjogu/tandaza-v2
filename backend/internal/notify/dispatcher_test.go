package notify

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	"tandaza/backend/internal/config"
	"tandaza/backend/internal/domain"
)

func TestRenderEmailTemplate(t *testing.T) {
	rendered := Render(domain.Notification{
		TemplateKey: "expo_remote_access_booked",
		Payload: map[string]any{
			"subject":  "Remote access booked",
			"message":  "Your Nairobi expo stream is ready.",
			"expoName": "Nairobi Tech Expo",
		},
	})
	if rendered.Subject != "Remote access booked" {
		t.Fatalf("subject = %q", rendered.Subject)
	}
	if rendered.Text != "Your Nairobi expo stream is ready." {
		t.Fatalf("text = %q", rendered.Text)
	}
	if rendered.HTML == "" || !strings.Contains(rendered.HTML, "Nairobi Tech Expo") || !strings.Contains(rendered.HTML, "Tandaza") {
		t.Fatalf("expected branded HTML with expo name, html=%s", rendered.HTML)
	}
	if !strings.Contains(rendered.HTML, `alt="Tandaza"`) || !strings.Contains(rendered.HTML, defaultEmailLogoURL) {
		t.Fatalf("expected Tandaza logo in email html, html=%s", rendered.HTML)
	}
}

func TestRenderSystemUserWelcomeShowsTemporaryPassword(t *testing.T) {
	rendered := Render(domain.Notification{
		TemplateKey: "system_user_welcome",
		Payload: map[string]any{
			"subject":           "Your Tandaza admin account is ready",
			"message":           "Your Tandaza admin account is ready.",
			"temporaryPassword": "AdminTemp123!",
		},
	})
	if !strings.Contains(rendered.HTML, "Temporary password") || !strings.Contains(rendered.HTML, "AdminTemp123!") {
		t.Fatalf("expected temporary password block in email html, html=%s", rendered.HTML)
	}
}

func TestRenderFounderWelcomeUsesMissionCopyAndNoExpoFooter(t *testing.T) {
	rendered := Render(domain.Notification{
		TemplateKey: "founder_welcome",
		Payload: map[string]any{
			"subject":    "A welcome note from Evans Mburu, Founder of Tandaza",
			"title":      "A note from Evans Mburu",
			"message":    "We started Tandaza because expos across Africa create real opportunity.",
			"footerText": "A founder welcome sent after verifying your Tandaza account.",
		},
	})
	if rendered.Subject != "A welcome note from Evans Mburu, Founder of Tandaza" || !strings.Contains(rendered.HTML, "A note from Evans Mburu") {
		t.Fatalf("expected founder welcome rendering, rendered=%+v", rendered)
	}
	if strings.Contains(rendered.HTML, "Expo:") || !strings.Contains(rendered.HTML, "founder welcome") {
		t.Fatalf("expected non-expo founder footer, html=%s", rendered.HTML)
	}
}

func TestEmailRecipientPrefersPayloadTarget(t *testing.T) {
	recipient := emailRecipient(domain.Notification{
		RecipientEmail: "owner@example.com",
		Payload:        map[string]any{"email": "visitor@example.com", "to": "fallback@example.com"},
	})
	if recipient != "visitor@example.com" {
		t.Fatalf("recipient = %q", recipient)
	}
}

func TestSMTPEncryptionMode(t *testing.T) {
	cases := map[string]string{
		"":         "starttls",
		"starttls": "starttls",
		"ssl":      "tls",
		"smtps":    "tls",
		"none":     "none",
	}
	for input, expected := range cases {
		if got := smtpEncryptionMode(input); got != expected {
			t.Fatalf("smtpEncryptionMode(%q) = %q, expected %q", input, got, expected)
		}
	}
}

func TestTiaraSMSDispatchUsesExpectedPayload(t *testing.T) {
	var captured struct {
		From    string `json:"from"`
		To      string `json:"to"`
		Message string `json:"message"`
		RefID   string `json:"refId"`
	}
	dispatcher := NewDispatcher(config.Config{TiaraAPIKey: "test-key", TiaraSenderID: "CONNECT", TiaraBaseURL: "https://api2.tiaraconnect.io"})
	dispatcher.client = &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if r.URL.Path != "/api/messaging/sendsms" {
			t.Fatalf("path = %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer test-key" {
			t.Fatalf("authorization = %q", r.Header.Get("Authorization"))
		}
		if err := json.NewDecoder(r.Body).Decode(&captured); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewBufferString(`{"cost":"KES 0.6","mnc":"02","balance":"KES 3137.5598","msgId":"0bc5be98-5322-4cf3-ac02-303165997da5","to":"254700000001","mcc":"639","desc":"Success","status":"SUCCESS","statusCode":"0"}`)),
			Header:     make(http.Header),
		}, nil
	})}

	attempt, status, failure := dispatcher.Dispatch(context.Background(), domain.Notification{
		ID: "ntf_test", Channel: "sms", TemplateKey: "expo_reminder", Payload: map[string]any{"phone": "254700000001", "message": "Test SMS"},
	})
	if status != "sent" || failure != "" || attempt.Status != "sent" {
		t.Fatalf("unexpected dispatch result: status=%s failure=%s attempt=%+v", status, failure, attempt)
	}
	if captured.From != "CONNECT" || captured.To != "254700000001" || captured.Message != "Test SMS" || captured.RefID != "ntf_test" {
		t.Fatalf("unexpected tiara payload: %+v", captured)
	}
	if attempt.ResponsePayload["msgId"] == "" || attempt.ResponsePayload["cost"] != "KES 0.6" || attempt.ResponsePayload["status"] != "SUCCESS" {
		t.Fatalf("expected tiara response fields to be captured, response=%+v", attempt.ResponsePayload)
	}
}

func TestTiaraSMSDispatchNormalizesPlusPrefix(t *testing.T) {
	var captured struct {
		To string `json:"to"`
	}
	dispatcher := NewDispatcher(config.Config{TiaraAPIKey: "test-key", TiaraSenderID: "CONNECT", TiaraBaseURL: "https://api2.tiaraconnect.io"})
	dispatcher.client = &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if err := json.NewDecoder(r.Body).Decode(&captured); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewBufferString(`{"msgId":"ok","status":"SUCCESS","statusCode":"0"}`)),
			Header:     make(http.Header),
		}, nil
	})}

	_, status, failure := dispatcher.Dispatch(context.Background(), domain.Notification{
		ID: "ntf_test", Channel: "sms", TemplateKey: "expo_reminder", Payload: map[string]any{"phone": "+254700000001", "message": "Test SMS"},
	})
	if status != "sent" || failure != "" {
		t.Fatalf("unexpected dispatch result: status=%s failure=%s", status, failure)
	}
	if captured.To != "254700000001" {
		t.Fatalf("expected Tiara phone without plus prefix, got %q", captured.To)
	}
}

func TestTiaraSMSDispatchTreatsProviderFailedBodyAsFailure(t *testing.T) {
	dispatcher := NewDispatcher(config.Config{TiaraAPIKey: "bad-key", TiaraSenderID: "CONNECT", TiaraBaseURL: "https://api2.tiaraconnect.io"})
	dispatcher.client = &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewBufferString(`{"msgId":null,"status":"FAILED","desc":"Unrecognised token","statusCode":"403"}`)),
			Header:     make(http.Header),
		}, nil
	})}

	attempt, status, failure := dispatcher.Dispatch(context.Background(), domain.Notification{
		ID: "ntf_bad_token", Channel: "sms", TemplateKey: "expo_reminder", Payload: map[string]any{"phone": "254700000001", "message": "Test SMS"},
	})
	if status != "failed" || attempt.Status != "failed" {
		t.Fatalf("expected failed dispatch, status=%s attempt=%+v", status, attempt)
	}
	if !strings.Contains(failure, "Unrecognised token") || !strings.Contains(attempt.FailureReason, "Unrecognised token") {
		t.Fatalf("expected provider failure reason, failure=%q attempt=%+v", failure, attempt)
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return fn(r)
}
