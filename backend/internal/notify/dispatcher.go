package notify

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"net"
	"net/http"
	"net/smtp"
	"net/url"
	"strings"
	"time"

	"tandaza/backend/internal/config"
	"tandaza/backend/internal/domain"
)

type Dispatcher struct {
	cfg    config.Config
	client *http.Client
}

type RenderedMessage struct {
	Subject string
	Text    string
	HTML    string
}

func NewDispatcher(cfg config.Config) Dispatcher {
	return Dispatcher{
		cfg:    cfg,
		client: providerHTTPClient(),
	}
}

func providerHTTPClient() *http.Client {
	dialer := &net.Dialer{Timeout: 10 * time.Second, KeepAlive: 30 * time.Second}
	return &http.Client{
		Timeout: 15 * time.Second,
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, network string, address string) (net.Conn, error) {
				return dialer.DialContext(ctx, "tcp4", address)
			},
		},
	}
}

func (d Dispatcher) Dispatch(ctx context.Context, item domain.Notification) (domain.NotificationAttempt, string, string) {
	rendered := Render(item)
	attempt := domain.NotificationAttempt{
		ID:             fmt.Sprintf("nta_%d", time.Now().UTC().UnixNano()),
		NotificationID: item.ID,
		Channel:        item.Channel,
		Provider:       providerForChannel(item.Channel),
		Status:         "failed",
		RequestPayload: map[string]any{"templateKey": item.TemplateKey, "subject": rendered.Subject},
		CreatedAt:      time.Now().UTC(),
	}

	var err error
	switch item.Channel {
	case "email":
		err = d.sendEmail(item, rendered, &attempt)
	case "sms":
		err = d.sendTiaraSMS(ctx, item, rendered, &attempt)
	case "whatsapp":
		err = d.sendWhatsApp(ctx, item, rendered, &attempt)
	case "push":
		err = d.postWebhook(ctx, d.cfg.PushWebhookURL, item, rendered, &attempt)
	case "in_app":
		err = d.postRealtime(ctx, item, rendered, &attempt)
	default:
		err = fmt.Errorf("unsupported notification channel %q", item.Channel)
	}

	if err != nil {
		attempt.FailureReason = err.Error()
		return attempt, "failed", err.Error()
	}
	attempt.Status = "sent"
	return attempt, "sent", ""
}

func (d Dispatcher) sendWhatsApp(ctx context.Context, item domain.Notification, rendered RenderedMessage, attempt *domain.NotificationAttempt) error {
	to := firstNonEmpty(item.RecipientPhone, payloadString(item.Payload, "phone", ""), payloadString(item.Payload, "to", ""))
	if to == "" {
		return fmt.Errorf("whatsapp recipient phone is missing")
	}
	if d.cfg.WhatsappAccountSID == "" || d.cfg.WhatsappAuthToken == "" || d.cfg.WhatsappFromNumber == "" {
		return fmt.Errorf("whatsapp is not configured")
	}
	endpoint := strings.TrimRight(firstNonEmpty(d.cfg.WhatsappBaseURL, "https://api.twilio.com"), "/") + "/2010-04-01/Accounts/" + url.PathEscape(d.cfg.WhatsappAccountSID) + "/Messages.json"
	values := url.Values{}
	values.Set("From", ensureWhatsappAddress(d.cfg.WhatsappFromNumber))
	values.Set("To", ensureWhatsappAddress(to))
	values.Set("Body", rendered.Text)
	attempt.RequestPayload = map[string]any{"url": endpoint, "body": map[string]string{"from": values.Get("From"), "to": values.Get("To"), "body": rendered.Text}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(values.Encode()))
	if err != nil {
		return err
	}
	req.SetBasicAuth(d.cfg.WhatsappAccountSID, d.cfg.WhatsappAuthToken)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	response, err := d.client.Do(req)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	responseBody, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
	responsePayload := map[string]any{"statusCode": response.StatusCode, "body": string(responseBody)}
	var providerPayload map[string]any
	if err := json.Unmarshal(responseBody, &providerPayload); err == nil {
		for key, value := range providerPayload {
			responsePayload[key] = value
		}
	}
	attempt.ResponsePayload = responsePayload
	if providerFailure := providerFailureReason(providerPayload); providerFailure != "" {
		return fmt.Errorf("%s", providerFailure)
	}
	if response.StatusCode < 200 || response.StatusCode > 299 {
		return fmt.Errorf("provider returned HTTP %d", response.StatusCode)
	}
	return nil
}

func providerFailureReason(payload map[string]any) string {
	if len(payload) == 0 {
		return ""
	}
	status := strings.ToUpper(strings.TrimSpace(fmt.Sprint(payload["status"])))
	if status == "FAILED" || status == "FAILURE" || status == "ERROR" {
		if desc := strings.TrimSpace(fmt.Sprint(payload["desc"])); desc != "" && desc != "<nil>" {
			return desc
		}
		if message := strings.TrimSpace(fmt.Sprint(payload["message"])); message != "" && message != "<nil>" {
			return message
		}
		return "provider returned failed status"
	}
	statusCode := strings.TrimSpace(fmt.Sprint(payload["statusCode"]))
	if statusCode != "" && statusCode != "<nil>" && statusCode != "0" {
		if desc := strings.TrimSpace(fmt.Sprint(payload["desc"])); desc != "" && desc != "<nil>" {
			return desc
		}
		return "provider returned status code " + statusCode
	}
	return ""
}

func Render(item domain.Notification) RenderedMessage {
	subject := payloadString(item.Payload, "subject", subjectForTemplate(item.TemplateKey))
	title := payloadString(item.Payload, "title", subject)
	message := payloadString(item.Payload, "message", bodyForTemplate(item.TemplateKey))
	ctaLabel := payloadString(item.Payload, "ctaLabel", "Open Tandaza")
	ctaURL := payloadString(item.Payload, "ctaUrl", "https://tandaza.africa")
	logoURL := payloadString(item.Payload, "logoUrl", defaultEmailLogoURL)
	expoName := payloadString(item.Payload, "expoName", "")
	exhibitorName := payloadString(item.Payload, "exhibitorName", "")
	temporaryPassword := payloadString(item.Payload, "temporaryPassword", "")
	footerText := payloadString(item.Payload, "footerText", "You are receiving this because your Tandaza account is connected to this expo.")
	messageHTML := template.HTML(strings.ReplaceAll(template.HTMLEscapeString(message), "\n", "<br>"))
	preOrder := strings.EqualFold(payloadString(item.Payload, "preOrder", ""), "true")
	meeting := strings.EqualFold(payloadString(item.Payload, "meeting", ""), "true")

	var html bytes.Buffer
	_ = emailTemplate.Execute(&html, map[string]any{
		"Subject": subject, "Title": title, "Message": message, "MessageHTML": messageHTML, "CTALabel": ctaLabel,
		"CTAURL": ctaURL, "LogoURL": logoURL, "ExpoName": expoName, "ExhibitorName": exhibitorName, "TemporaryPassword": temporaryPassword, "FooterText": footerText, "Year": time.Now().UTC().Format("2006"),
		"Meeting": meeting, "MeetingStatus": payloadString(item.Payload, "meetingStatus", ""), "MeetingTitle": payloadString(item.Payload, "meetingTitle", ""),
		"MeetingType": payloadString(item.Payload, "meetingType", ""), "MeetingTime": payloadString(item.Payload, "meetingTime", ""), "MeetingLink": payloadString(item.Payload, "meetingLink", ""),
		"VisitorName": payloadString(item.Payload, "visitorName", ""), "VisitorEmail": payloadString(item.Payload, "visitorEmail", ""), "ReminderMinutes": payloadString(item.Payload, "reminderMinutes", ""),
		"PreOrder": preOrder, "OrderRef": payloadString(item.Payload, "orderRef", ""), "ProductName": payloadString(item.Payload, "productName", ""), "Quantity": payloadString(item.Payload, "quantity", ""),
		"UnitPrice": payloadString(item.Payload, "unitPrice", ""), "Total": payloadString(item.Payload, "total", ""), "CustomerName": payloadString(item.Payload, "customerName", ""),
		"CustomerEmail": payloadString(item.Payload, "customerEmail", ""), "CustomerPhone": payloadString(item.Payload, "customerPhone", ""), "NextStep": payloadString(item.Payload, "nextStep", ""),
	})
	return RenderedMessage{Subject: subject, Text: message, HTML: html.String()}
}

const defaultEmailLogoURL = "https://tandaza.africa/tandaza-logo-white-v2.png"

func (d Dispatcher) sendEmail(item domain.Notification, rendered RenderedMessage, attempt *domain.NotificationAttempt) error {
	to := emailRecipient(item)
	attempt.RequestPayload["to"] = to
	if strings.TrimSpace(to) == "" {
		return fmt.Errorf("email recipient is missing")
	}
	if d.cfg.SMTPHost == "" || d.cfg.SMTPUsername == "" || d.cfg.SMTPPassword == "" {
		return fmt.Errorf("smtp is not configured")
	}
	fromName := payloadString(item.Payload, "fromName", d.cfg.SMTPFromName)
	from := fmt.Sprintf("%s <%s>", safeMailHeader(fromName), safeMailHeader(d.cfg.SMTPFromEmail))
	boundary := mailBoundary()
	message := strings.Join([]string{
		"From: " + from,
		"To: " + safeMailHeader(to),
		"Reply-To: " + safeMailHeader(d.cfg.SMTPFromEmail),
		"Subject: " + safeMailHeader(rendered.Subject),
		"Date: " + time.Now().UTC().Format(time.RFC1123Z),
		"Message-ID: <" + safeMessageID(item.ID) + "@tandaza.africa>",
		"MIME-Version: 1.0",
		`Content-Type: multipart/alternative; boundary="` + boundary + `"`,
		"",
		"--" + boundary,
		`Content-Type: text/plain; charset="UTF-8"`,
		"Content-Transfer-Encoding: 8bit",
		"",
		rendered.Text,
		"",
		"--" + boundary,
		`Content-Type: text/html; charset="UTF-8"`,
		"Content-Transfer-Encoding: 8bit",
		"",
		rendered.HTML,
		"",
		"--" + boundary + "--",
	}, "\r\n")
	addr := d.cfg.SMTPHost + ":" + d.cfg.SMTPPort
	auth := smtp.PlainAuth("", d.cfg.SMTPUsername, d.cfg.SMTPPassword, d.cfg.SMTPHost)
	recipients := []string{to}
	switch smtpEncryptionMode(d.cfg.SMTPEncryption) {
	case "tls":
		return sendMailTLS(addr, d.cfg.SMTPHost, auth, d.cfg.SMTPFromEmail, recipients, []byte(message))
	case "none":
		return sendMailPlain(addr, auth, d.cfg.SMTPFromEmail, recipients, []byte(message))
	default:
		return sendMailStartTLS(addr, d.cfg.SMTPHost, auth, d.cfg.SMTPFromEmail, recipients, []byte(message))
	}
}

func emailRecipient(item domain.Notification) string {
	return firstNonEmpty(payloadString(item.Payload, "email", ""), payloadString(item.Payload, "to", ""), item.RecipientEmail)
}

func smtpEncryptionMode(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "none", "plain", "off":
		return "none"
	case "ssl", "smtps", "tls":
		return "tls"
	default:
		return "starttls"
	}
}

func sendMailPlain(addr string, auth smtp.Auth, from string, to []string, message []byte) error {
	return smtp.SendMail(addr, auth, from, to, message)
}

func sendMailStartTLS(addr string, host string, auth smtp.Auth, from string, to []string, message []byte) error {
	client, err := smtp.Dial(addr)
	if err != nil {
		return err
	}
	defer client.Close()
	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{ServerName: host, MinVersion: tls.VersionTLS12}); err != nil {
			return err
		}
	} else {
		return fmt.Errorf("smtp server does not support STARTTLS")
	}
	return sendSMTPMessage(client, auth, from, to, message)
}

func sendMailTLS(addr string, host string, auth smtp.Auth, from string, to []string, message []byte) error {
	conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: host, MinVersion: tls.VersionTLS12})
	if err != nil {
		return err
	}
	client, err := smtp.NewClient(conn, host)
	if err != nil {
		_ = conn.Close()
		return err
	}
	defer client.Close()
	return sendSMTPMessage(client, auth, from, to, message)
}

func sendSMTPMessage(client *smtp.Client, auth smtp.Auth, from string, to []string, message []byte) error {
	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return err
		}
	}
	if err := client.Mail(from); err != nil {
		return err
	}
	for _, recipient := range to {
		if err := client.Rcpt(recipient); err != nil {
			return err
		}
	}
	writer, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := writer.Write(message); err != nil {
		_ = writer.Close()
		return err
	}
	if err := writer.Close(); err != nil {
		return err
	}
	return client.Quit()
}

func mailBoundary() string {
	buf := make([]byte, 12)
	if _, err := rand.Read(buf); err == nil {
		return "tandaza_" + hex.EncodeToString(buf)
	}
	return fmt.Sprintf("tandaza_%d", time.Now().UnixNano())
}

func safeMailHeader(value string) string {
	return strings.NewReplacer("\r", " ", "\n", " ").Replace(strings.TrimSpace(value))
}

func safeMessageID(value string) string {
	cleaned := strings.ToLower(strings.TrimSpace(value))
	cleaned = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '-'
	}, cleaned)
	if cleaned == "" {
		return fmt.Sprintf("ntf-%d", time.Now().UnixNano())
	}
	return cleaned
}

func (d Dispatcher) sendTiaraSMS(ctx context.Context, item domain.Notification, rendered RenderedMessage, attempt *domain.NotificationAttempt) error {
	to := firstNonEmpty(item.RecipientPhone, payloadString(item.Payload, "phone", ""), payloadString(item.Payload, "to", ""))
	if to == "" {
		return fmt.Errorf("sms recipient phone is missing")
	}
	if d.cfg.TiaraAPIKey == "" {
		return fmt.Errorf("tiaraconnect api key is not configured")
	}
	to = tiaraPhoneNumber(to)
	body := map[string]string{
		"from":    d.cfg.TiaraSenderID,
		"to":      to,
		"message": rendered.Text,
		"refId":   item.ID,
	}
	attempt.RequestPayload = map[string]any{"url": strings.TrimRight(d.cfg.TiaraBaseURL, "/") + "/api/messaging/sendsms", "body": body}
	return d.postJSON(ctx, attempt.RequestPayload["url"].(string), body, map[string]string{"Authorization": "Bearer " + d.cfg.TiaraAPIKey}, attempt)
}

func tiaraPhoneNumber(value string) string {
	return strings.TrimPrefix(strings.TrimSpace(value), "+")
}

func (d Dispatcher) postRealtime(ctx context.Context, item domain.Notification, rendered RenderedMessage, attempt *domain.NotificationAttempt) error {
	if d.cfg.RealtimeWebhookURL == "" {
		attempt.ResponsePayload = map[string]any{"saved": true, "realtimeWebhook": "not_configured"}
		return nil
	}
	return d.postWebhook(ctx, d.cfg.RealtimeWebhookURL, item, rendered, attempt)
}

func (d Dispatcher) postWebhook(ctx context.Context, url string, item domain.Notification, rendered RenderedMessage, attempt *domain.NotificationAttempt) error {
	if strings.TrimSpace(url) == "" {
		return fmt.Errorf("%s webhook is not configured", item.Channel)
	}
	body := map[string]any{
		"notificationId": item.ID,
		"userId":         item.UserID,
		"expoId":         item.ExpoID,
		"role":           item.Role,
		"title":          rendered.Subject,
		"message":        rendered.Text,
		"html":           rendered.HTML,
	}
	attempt.RequestPayload = map[string]any{"url": url, "body": body}
	return d.postJSON(ctx, url, body, nil, attempt)
}

func (d Dispatcher) postJSON(ctx context.Context, url string, body any, headers map[string]string, attempt *domain.NotificationAttempt) error {
	payload, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	response, err := d.client.Do(req)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	responseBody, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
	responsePayload := map[string]any{"statusCode": response.StatusCode, "body": string(responseBody)}
	var providerPayload map[string]any
	if err := json.Unmarshal(responseBody, &providerPayload); err == nil {
		for key, value := range providerPayload {
			responsePayload[key] = value
		}
	}
	attempt.ResponsePayload = responsePayload
	if providerFailure := providerFailureReason(providerPayload); providerFailure != "" {
		return fmt.Errorf("%s", providerFailure)
	}
	if response.StatusCode < 200 || response.StatusCode > 299 {
		return fmt.Errorf("provider returned HTTP %d", response.StatusCode)
	}
	return nil
}

func providerForChannel(channel string) string {
	switch channel {
	case "email":
		return "smtp"
	case "sms":
		return "tiaraconnect"
	case "whatsapp":
		return "twilio"
	case "push":
		return "push_webhook"
	case "in_app":
		return "tandaza_realtime"
	default:
		return "unknown"
	}
}

func ensureWhatsappAddress(value string) string {
	value = strings.TrimSpace(value)
	if strings.HasPrefix(value, "whatsapp:") {
		return value
	}
	return "whatsapp:" + value
}

func subjectForTemplate(key string) string {
	switch key {
	case "expo_remote_access_booked":
		return "Your remote expo access is booked"
	case "new_lead_captured":
		return "New lead captured"
	case "expo_daily_digest":
		return "Your expo daily digest"
	case "expo_reminder":
		return "Expo reminder"
	case "lead_follow_up_reminder":
		return "Lead follow-up reminder"
	case "conversation_message":
		return "New Tandaza conversation message"
	case "email_verification":
		return "Verify your Tandaza email"
	case "account_welcome":
		return "Welcome to Tandaza"
	case "founder_welcome":
		return "A welcome note from Evans Mburu, Founder of Tandaza"
	case "sponsor_account_credentials":
		return "Your Tandaza sponsor account is ready"
	case "organizer_account_credentials":
		return "Your Tandaza organizer account is ready"
	case "exhibitor_account_credentials":
		return "Your Tandaza exhibitor account is ready"
	default:
		return "Tandaza notification"
	}
}

func bodyForTemplate(key string) string {
	switch key {
	case "expo_remote_access_booked":
		return "Your remote access is ready. You can view exhibitors, save products, and book meetings from your Tandaza dashboard."
	case "new_lead_captured":
		return "A visitor has shared interest in your expo workspace. Open Tandaza to review their notes and plan your follow-up."
	case "expo_daily_digest":
		return "Your expo activity summary is ready, including leads, visitor engagement, and pending actions."
	case "expo_reminder":
		return "Your expo is coming up. Open Tandaza to review your schedule and remote access details."
	case "lead_follow_up_reminder":
		return "A lead follow-up is coming up. Open Tandaza to review the lead notes and take action."
	case "conversation_message":
		return "A new conversation message is waiting in Tandaza."
	case "email_verification":
		return "Confirm your email address to activate your Tandaza workspace."
	case "account_welcome":
		return "Your email is verified. Welcome to Tandaza."
	case "founder_welcome":
		return "A note from Evans Mburu about why Tandaza exists."
	case "sponsor_account_credentials":
		return "Your Tandaza sponsor account has been created. Use the temporary password to sign in."
	case "organizer_account_credentials":
		return "Your Tandaza organizer account has been created. Use the temporary password to sign in."
	case "exhibitor_account_credentials":
		return "Your Tandaza exhibitor account has been created. Use the temporary password to sign in."
	default:
		return "You have a new Tandaza update."
	}
}

func payloadString(payload map[string]any, key string, fallback string) string {
	if value, ok := payload[key].(string); ok && strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	return fallback
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

var emailTemplate = template.Must(template.New("email").Parse(`<!doctype html>
<html>
<body style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e9f2;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#2d1b69;padding:28px 32px;color:#ffffff;">
              <img src="{{.LogoURL}}" width="156" alt="Tandaza" style="display:block;width:156px;max-width:70%;height:auto;margin:0 0 18px;border:0;outline:none;text-decoration:none;">
              <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#ddd6fe;">Tandaza</div>
              <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;font-weight:700;">{{.Title}}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#334155;">{{.MessageHTML}}</p>
              {{if .Meeting}}
              <div style="margin:0 0 22px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
                <div style="padding:16px 18px;background:#f8f5ff;border-bottom:1px solid #e5e7eb;">
                  <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5b37b9;font-weight:700;">Meeting details</div>
                  <div style="margin-top:6px;font-size:18px;line-height:1.35;color:#172033;font-weight:800;">{{.MeetingTitle}}</div>
                  {{if .MeetingStatus}}<div style="margin-top:8px;display:inline-block;padding:6px 10px;background:#ffffff;border:1px solid #ddd6fe;border-radius:999px;color:#5b37b9;font-size:12px;font-weight:800;">{{.MeetingStatus}}</div>{{end}}
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  {{if .ExpoName}}
                  <tr>
                    <td style="width:34%;padding:13px 18px;border-bottom:1px solid #eef2f7;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;">Expo</td>
                    <td style="padding:13px 18px;border-bottom:1px solid #eef2f7;color:#172033;font-size:14px;font-weight:700;">{{.ExpoName}}</td>
                  </tr>
                  {{end}}
                  {{if .ExhibitorName}}
                  <tr>
                    <td style="width:34%;padding:13px 18px;border-bottom:1px solid #eef2f7;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;">Exhibitor</td>
                    <td style="padding:13px 18px;border-bottom:1px solid #eef2f7;color:#172033;font-size:14px;font-weight:700;">{{.ExhibitorName}}</td>
                  </tr>
                  {{end}}
                  {{if .MeetingType}}
                  <tr>
                    <td style="width:34%;padding:13px 18px;border-bottom:1px solid #eef2f7;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;">Category</td>
                    <td style="padding:13px 18px;border-bottom:1px solid #eef2f7;color:#172033;font-size:14px;">{{.MeetingType}}</td>
                  </tr>
                  {{end}}
                  {{if .MeetingTime}}
                  <tr>
                    <td style="width:34%;padding:13px 18px;border-bottom:1px solid #eef2f7;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;">Time</td>
                    <td style="padding:13px 18px;border-bottom:1px solid #eef2f7;color:#172033;font-size:14px;">{{.MeetingTime}}</td>
                  </tr>
                  {{end}}
                  {{if .VisitorName}}
                  <tr>
                    <td style="width:34%;padding:13px 18px;border-bottom:1px solid #eef2f7;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;">Visitor</td>
                    <td style="padding:13px 18px;border-bottom:1px solid #eef2f7;color:#172033;font-size:14px;">{{.VisitorName}}{{if .VisitorEmail}} · {{.VisitorEmail}}{{end}}</td>
                  </tr>
                  {{end}}
                  {{if .MeetingLink}}
                  <tr>
                    <td style="width:34%;padding:13px 18px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;">Meeting link</td>
                    <td style="padding:13px 18px;color:#172033;font-size:14px;word-break:break-all;"><a href="{{.MeetingLink}}" style="color:#5b37b9;text-decoration:none;font-weight:700;">{{.MeetingLink}}</a></td>
                  </tr>
                  {{end}}
                </table>
              </div>
              {{if .NextStep}}
              <div style="margin:0 0 22px;padding:14px 16px;border-left:4px solid #5b37b9;background:#f8f5ff;border-radius:10px;color:#334155;font-size:14px;line-height:1.6;">
                <strong style="color:#172033;">Next step:</strong> {{.NextStep}}
              </div>
              {{end}}
              {{end}}
              {{if .PreOrder}}
              <div style="margin:0 0 22px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
                <div style="padding:16px 18px;background:#f8f5ff;border-bottom:1px solid #e5e7eb;">
                  <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5b37b9;font-weight:700;">Pre-order summary</div>
                  <div style="margin-top:6px;font-size:14px;line-height:1.5;color:#475569;">
                    {{if .OrderRef}}Reference: <strong style="color:#172033;">{{.OrderRef}}</strong>{{end}}
                    {{if .ExpoName}}<br>Expo: <strong style="color:#172033;">{{.ExpoName}}</strong>{{end}}
                    {{if .ExhibitorName}}<br>Exhibitor: <strong style="color:#172033;">{{.ExhibitorName}}</strong>{{end}}
                  </div>
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:13px 18px;border-bottom:1px solid #eef2f7;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;">Item</td>
                    <td align="right" style="padding:13px 18px;border-bottom:1px solid #eef2f7;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;">Qty</td>
                    <td align="right" style="padding:13px 18px;border-bottom:1px solid #eef2f7;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;">Unit price</td>
                  </tr>
                  <tr>
                    <td style="padding:15px 18px;border-bottom:1px solid #eef2f7;color:#172033;font-size:15px;font-weight:700;">{{.ProductName}}</td>
                    <td align="right" style="padding:15px 18px;border-bottom:1px solid #eef2f7;color:#172033;font-size:15px;">{{.Quantity}}</td>
                    <td align="right" style="padding:15px 18px;border-bottom:1px solid #eef2f7;color:#172033;font-size:15px;">{{.UnitPrice}}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding:16px 18px;color:#475569;font-size:15px;font-weight:700;">Estimated total</td>
                    <td align="right" style="padding:16px 18px;color:#5b37b9;font-size:18px;font-weight:800;">{{.Total}}</td>
                  </tr>
                </table>
              </div>
              <div style="margin:0 0 22px;padding:16px 18px;border:1px solid #e5e7eb;background:#fbfdff;border-radius:14px;">
                <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:700;">Customer details</div>
                <div style="margin-top:8px;font-size:14px;line-height:1.7;color:#334155;">
                  Name: <strong style="color:#172033;">{{.CustomerName}}</strong><br>
                  Email: <strong style="color:#172033;">{{.CustomerEmail}}</strong><br>
                  Phone: <strong style="color:#172033;">{{.CustomerPhone}}</strong>
                </div>
              </div>
              {{if .NextStep}}
              <div style="margin:0 0 22px;padding:14px 16px;border-left:4px solid #5b37b9;background:#f8f5ff;border-radius:10px;color:#334155;font-size:14px;line-height:1.6;">
                <strong style="color:#172033;">Next step:</strong> {{.NextStep}}
              </div>
              {{end}}
              {{end}}
              {{if .TemporaryPassword}}
              <div style="margin:0 0 22px;padding:18px;border:1px solid #bae6fd;background:#f0f9ff;border-radius:12px;">
                <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#0369a1;font-weight:700;">Temporary password</div>
                <div style="margin-top:8px;font-family:Consolas,Monaco,monospace;font-size:20px;line-height:1.3;color:#0f172a;font-weight:700;word-break:break-all;">{{.TemporaryPassword}}</div>
              </div>
              {{end}}
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius:8px;background:#5b37b9;">
                    <a href="{{.CTAURL}}" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">{{.CTALabel}}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px;background:#f8fafc;color:#64748b;font-size:13px;line-height:1.5;">
              {{if .ExpoName}}Expo: {{.ExpoName}}<br>{{end}}
              {{.FooterText}}
            </td>
          </tr>
        </table>
        <div style="max-width:640px;padding:16px 8px;color:#94a3b8;font-size:12px;line-height:1.5;">© {{.Year}} Tandaza. Built for expo teams, exhibitors, sponsors, and visitors across Africa.</div>
      </td>
    </tr>
  </table>
</body>
</html>`))
