package httpapi

import (
	"bytes"
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"tandaza/backend/internal/domain"
)

type googleServiceAccountKey struct {
	ClientEmail string `json:"client_email"`
	PrivateKey  string `json:"private_key"`
	TokenURI    string `json:"token_uri"`
}

func (s *Server) googleMeetLinkForMeeting(ctx context.Context, expo domain.Expo, input domain.MeetingInput, visitorEmail string, exhibitorEmail string) string {
	settings, err := s.store.GoogleSettings(ctx)
	if err != nil || !settings.CalendarIntegrationOn || strings.TrimSpace(settings.ServiceAccountKey) == "" {
		return ""
	}
	start, err := time.Parse(time.RFC3339, input.ScheduledAt)
	if err != nil {
		return ""
	}
	key, err := parseGoogleServiceAccount(settings)
	if err != nil {
		s.logger.Warn("google calendar settings invalid", "error", err)
		return ""
	}
	token, err := googleServiceAccountToken(ctx, key)
	if err != nil {
		s.logger.Warn("google calendar token failed", "error", err)
		return ""
	}
	calendarID := strings.TrimSpace(settings.CalendarID)
	if calendarID == "" {
		calendarID = "primary"
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		title = "Tandaza expo meeting"
	}
	end := start.Add(30 * time.Minute)
	attendees := []map[string]string{}
	for _, email := range append([]string{visitorEmail, exhibitorEmail}, input.CCEmails...) {
		if strings.TrimSpace(email) != "" {
			attendees = append(attendees, map[string]string{"email": strings.TrimSpace(email)})
		}
	}
	body := map[string]any{
		"summary":     title,
		"description": strings.TrimSpace(input.Notes + "\n\nExpo: " + expo.Name),
		"start":       map[string]string{"dateTime": start.Format(time.RFC3339)},
		"end":         map[string]string{"dateTime": end.Format(time.RFC3339)},
		"attendees":   attendees,
		"conferenceData": map[string]any{"createRequest": map[string]any{
			"requestId": fmt.Sprintf("tandaza-%d", time.Now().UnixNano()),
			"conferenceSolutionKey": map[string]string{
				"type": "hangoutsMeet",
			},
		}},
	}
	payload, _ := json.Marshal(body)
	endpoint := "https://www.googleapis.com/calendar/v3/calendars/" + url.PathEscape(calendarID) + "/events?conferenceDataVersion=1&sendUpdates=all"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return ""
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		s.logger.Warn("google calendar event failed", "error", err)
		return ""
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		s.logger.Warn("google calendar event rejected", "status", resp.StatusCode, "body", string(raw))
		return ""
	}
	var event struct {
		HangoutLink    string `json:"hangoutLink"`
		ConferenceData struct {
			EntryPoints []struct {
				EntryPointType string `json:"entryPointType"`
				URI            string `json:"uri"`
			} `json:"entryPoints"`
		} `json:"conferenceData"`
	}
	_ = json.Unmarshal(raw, &event)
	if event.HangoutLink != "" {
		return event.HangoutLink
	}
	for _, entry := range event.ConferenceData.EntryPoints {
		if entry.EntryPointType == "video" && entry.URI != "" {
			return entry.URI
		}
	}
	return ""
}

func parseGoogleServiceAccount(settings domain.GoogleSettings) (googleServiceAccountKey, error) {
	var key googleServiceAccountKey
	if err := json.Unmarshal([]byte(settings.ServiceAccountKey), &key); err != nil {
		return key, err
	}
	if key.ClientEmail == "" {
		key.ClientEmail = settings.ServiceAccountEmail
	}
	if key.TokenURI == "" {
		key.TokenURI = "https://oauth2.googleapis.com/token"
	}
	if key.ClientEmail == "" || key.PrivateKey == "" {
		return key, errors.New("missing service account email or private key")
	}
	return key, nil
}

func googleServiceAccountToken(ctx context.Context, key googleServiceAccountKey) (string, error) {
	now := time.Now()
	claims := map[string]any{
		"iss":   key.ClientEmail,
		"scope": "https://www.googleapis.com/auth/calendar.events",
		"aud":   key.TokenURI,
		"iat":   now.Unix(),
		"exp":   now.Add(time.Hour).Unix(),
	}
	header := map[string]string{"alg": "RS256", "typ": "JWT"}
	headerJSON, _ := json.Marshal(header)
	claimsJSON, _ := json.Marshal(claims)
	signingInput := base64.RawURLEncoding.EncodeToString(headerJSON) + "." + base64.RawURLEncoding.EncodeToString(claimsJSON)
	privateKey, err := parseRSAPrivateKey(key.PrivateKey)
	if err != nil {
		return "", err
	}
	digest := sha256.Sum256([]byte(signingInput))
	signature, err := rsa.SignPKCS1v15(rand.Reader, privateKey, crypto.SHA256, digest[:])
	if err != nil {
		return "", err
	}
	assertion := signingInput + "." + base64.RawURLEncoding.EncodeToString(signature)
	form := url.Values{}
	form.Set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer")
	form.Set("assertion", assertion)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, key.TokenURI, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("token status %d: %s", resp.StatusCode, string(raw))
	}
	var token struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(raw, &token); err != nil {
		return "", err
	}
	if token.AccessToken == "" {
		return "", errors.New("missing access token")
	}
	return token.AccessToken, nil
}

func parseRSAPrivateKey(value string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(value))
	if block == nil {
		return nil, errors.New("invalid private key pem")
	}
	if key, err := x509.ParsePKCS8PrivateKey(block.Bytes); err == nil {
		if rsaKey, ok := key.(*rsa.PrivateKey); ok {
			return rsaKey, nil
		}
	}
	return x509.ParsePKCS1PrivateKey(block.Bytes)
}
