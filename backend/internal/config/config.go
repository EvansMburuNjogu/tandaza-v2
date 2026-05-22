package config

import (
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Environment            string
	Port                   string
	FrontendURL            string
	DatabaseMode           string
	DatabaseURL            string
	RedisURL               string
	JWTSecret              string
	TokenTTL               time.Duration
	LogLevel               slog.Level
	SMTPHost               string
	SMTPPort               string
	SMTPUsername           string
	SMTPPassword           string
	SMTPFromEmail          string
	SMTPFromName           string
	SMTPEncryption         string
	TiaraAPIKey            string
	TiaraSenderID          string
	TiaraBaseURL           string
	PushWebhookURL         string
	RealtimeWebhookURL     string
	PaymentMode            string
	PaystackBaseURL        string
	PaystackPublicKey      string
	PaystackSecretKey      string
	PaystackWebhookSecret  string
	PaystackCallbackURL    string
	WhatsappProvider       string
	WhatsappAccountSID     string
	WhatsappAuthToken      string
	WhatsappFromNumber     string
	WhatsappBaseURL        string
	StorageDriver          string
	LocalStorageDir        string
	S3Endpoint             string
	S3AccessKey            string
	S3SecretKey            string
	S3Bucket               string
	S3Region               string
	S3PublicURL            string
	S3ForcePathStyle       bool
	GoogleClientID         string
	GoogleTokenInfoURL     string
	PIIEncryptionKey       string
	EnforceHTTPS           bool
	RateLimitPerMinute     int
	NotificationWorker     bool
	NotificationInterval   time.Duration
	ExpoLifecycleWorker    bool
	ExpoLifecycleInterval  time.Duration
	ErrorWebhookURL        string
	ErrorAlertMinStatus    int
	BootstrapAdminEmail    string
	BootstrapAdminPassword string
	BootstrapAdminName     string
	BootstrapAdminCompany  string
}

func Load() Config {
	return Config{
		Environment:            env("APP_ENV", "development"),
		Port:                   env("PORT", "8080"),
		FrontendURL:            env("FRONTEND_URL", "http://localhost:3000"),
		DatabaseMode:           env("DATABASE_MODE", "memory"),
		DatabaseURL:            env("DATABASE_URL", "postgres://postgres:password@localhost:5432/tandaza?sslmode=disable"),
		RedisURL:               env("REDIS_URL", "redis://localhost:6379/0"),
		JWTSecret:              env("JWT_SECRET", "change-me-in-production"),
		TokenTTL:               durationEnv("TOKEN_TTL_HOURS", 24*7*time.Hour),
		LogLevel:               logLevel(env("LOG_LEVEL", "info")),
		SMTPHost:               env("SMTP_HOST", ""),
		SMTPPort:               env("SMTP_PORT", "587"),
		SMTPUsername:           env("SMTP_USERNAME", ""),
		SMTPPassword:           env("SMTP_PASSWORD", ""),
		SMTPFromEmail:          env("SMTP_FROM_EMAIL", "notifications@tandaza.africa"),
		SMTPFromName:           env("SMTP_FROM_NAME", "Tandaza"),
		SMTPEncryption:         env("SMTP_ENCRYPTION", "starttls"),
		TiaraAPIKey:            env("TIARA_API_KEY", ""),
		TiaraSenderID:          env("TIARA_SENDER_ID", "CONNECT"),
		TiaraBaseURL:           env("TIARA_BASE_URL", "https://api2.tiaraconnect.io"),
		PushWebhookURL:         env("PUSH_WEBHOOK_URL", ""),
		RealtimeWebhookURL:     env("REALTIME_WEBHOOK_URL", ""),
		PaymentMode:            env("PAYMENT_MODE", "auto"),
		PaystackBaseURL:        env("PAYSTACK_BASE_URL", "https://api.paystack.co"),
		PaystackPublicKey:      env("PAYSTACK_PUBLIC_KEY", ""),
		PaystackSecretKey:      env("PAYSTACK_SECRET_KEY", ""),
		PaystackWebhookSecret:  env("PAYSTACK_WEBHOOK_SECRET", ""),
		PaystackCallbackURL:    env("PAYSTACK_CALLBACK_URL", ""),
		WhatsappProvider:       env("WHATSAPP_PROVIDER", "twilio"),
		WhatsappAccountSID:     env("WHATSAPP_ACCOUNT_SID", ""),
		WhatsappAuthToken:      env("WHATSAPP_AUTH_TOKEN", ""),
		WhatsappFromNumber:     env("WHATSAPP_FROM_NUMBER", ""),
		WhatsappBaseURL:        env("WHATSAPP_BASE_URL", "https://api.twilio.com"),
		StorageDriver:          env("STORAGE_DRIVER", "local"),
		LocalStorageDir:        env("LOCAL_STORAGE_DIR", "../.dev/uploads"),
		S3Endpoint:             env("S3_ENDPOINT", "http://127.0.0.1:9000"),
		S3AccessKey:            env("S3_ACCESS_KEY", ""),
		S3SecretKey:            env("S3_SECRET_KEY", ""),
		S3Bucket:               env("S3_BUCKET", "tandaza-media"),
		S3Region:               env("S3_REGION", "us-east-1"),
		S3PublicURL:            env("S3_PUBLIC_URL", ""),
		S3ForcePathStyle:       boolEnv("S3_FORCE_PATH_STYLE", true),
		GoogleClientID:         env("GOOGLE_CLIENT_ID", ""),
		GoogleTokenInfoURL:     env("GOOGLE_TOKENINFO_URL", "https://oauth2.googleapis.com/tokeninfo"),
		PIIEncryptionKey:       env("PII_ENCRYPTION_KEY", ""),
		EnforceHTTPS:           boolEnv("ENFORCE_HTTPS", false),
		RateLimitPerMinute:     intEnv("RATE_LIMIT_PER_MINUTE", 120),
		NotificationWorker:     boolEnv("NOTIFICATION_WORKER_ENABLED", false),
		NotificationInterval:   durationSecondsEnv("NOTIFICATION_DISPATCH_INTERVAL_SECONDS", 60*time.Second),
		ExpoLifecycleWorker:    boolEnv("EXPO_LIFECYCLE_WORKER_ENABLED", true),
		ExpoLifecycleInterval:  durationSecondsEnv("EXPO_LIFECYCLE_INTERVAL_SECONDS", time.Hour),
		ErrorWebhookURL:        env("ERROR_WEBHOOK_URL", ""),
		ErrorAlertMinStatus:    intEnv("ERROR_ALERT_MIN_STATUS", 500),
		BootstrapAdminEmail:    env("BOOTSTRAP_ADMIN_EMAIL", ""),
		BootstrapAdminPassword: env("BOOTSTRAP_ADMIN_PASSWORD", ""),
		BootstrapAdminName:     env("BOOTSTRAP_ADMIN_NAME", "Platform Administrator"),
		BootstrapAdminCompany:  env("BOOTSTRAP_ADMIN_COMPANY", "Tandaza"),
	}
}

func env(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func durationEnv(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	hours, err := strconv.Atoi(value)
	if err != nil || hours <= 0 {
		return fallback
	}
	return time.Duration(hours) * time.Hour
}

func durationSecondsEnv(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	seconds, err := strconv.Atoi(value)
	if err != nil || seconds <= 0 {
		return fallback
	}
	return time.Duration(seconds) * time.Second
}

func boolEnv(key string, fallback bool) bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
	if value == "" {
		return fallback
	}
	return value == "1" || value == "true" || value == "yes"
}

func intEnv(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	number, err := strconv.Atoi(value)
	if err != nil || number <= 0 {
		return fallback
	}
	return number
}

func logLevel(value string) slog.Level {
	switch strings.ToLower(value) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
