package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"tandaza/backend/internal/auth"
	"tandaza/backend/internal/config"
	"tandaza/backend/internal/domain"
	"tandaza/backend/internal/httpapi"
	"tandaza/backend/internal/store"
)

func main() {
	ctx, stopApp := context.WithCancel(context.Background())
	defer stopApp()
	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.LogLevel,
	}))

	tokenService := auth.NewTokenService(cfg.JWTSecret, cfg.TokenTTL)
	var appStore store.Store
	if cfg.DatabaseMode == "postgres" {
		postgresStore, err := store.NewPostgresStore(ctx, cfg.DatabaseURL, tokenService)
		if err != nil {
			logger.Error("postgres connection failed", "error", err)
			os.Exit(1)
		}
		defer postgresStore.Close()
		if err := postgresStore.Migrate(ctx); err != nil {
			logger.Error("postgres migrations failed", "error", err)
			os.Exit(1)
		}
		appStore = postgresStore
		logger.Info("using postgres store")
	} else {
		appStore = store.NewMemoryStore(tokenService)
		logger.Info("using memory store")
	}
	bootstrapAdmin(ctx, logger, appStore, cfg)
	server := httpapi.NewServer(cfg, logger, appStore, tokenService)
	server.StartNotificationWorker(ctx)
	server.StartExpoLifecycleWorker(ctx)

	httpServer := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           server.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		logger.Info("tandaza go api listening", "port", cfg.Port)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("api server failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	stopApp()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		logger.Error("api server shutdown failed", "error", err)
		os.Exit(1)
	}
	logger.Info("tandaza go api stopped")
}

func bootstrapAdmin(ctx context.Context, logger *slog.Logger, appStore store.Store, cfg config.Config) {
	user, created, err := appStore.BootstrapAdmin(ctx, domain.AdminUserInput{
		Name:        cfg.BootstrapAdminName,
		Email:       cfg.BootstrapAdminEmail,
		Password:    cfg.BootstrapAdminPassword,
		Role:        domain.RoleSuperAdmin,
		CompanyName: cfg.BootstrapAdminCompany,
		CountryCode: "KE",
		Status:      "active",
	})
	if err != nil {
		logger.Error("bootstrap admin failed", "error", err)
		os.Exit(1)
	}
	if user.ID == "" {
		return
	}
	if created {
		if _, err := appStore.RecordAudit(ctx, domain.AuditLog{
			ActorID:    "system_bootstrap",
			Actor:      "System Bootstrap",
			ActorRole:  domain.RoleAdministrator,
			Action:     "bootstrap_admin_created",
			EntityType: "user",
			EntityID:   user.ID,
			Metadata:   map[string]any{"email": user.Email},
		}); err != nil {
			logger.Warn("bootstrap admin audit failed", "error", err)
		}
		logger.Info("bootstrap admin created", "userId", user.ID, "email", user.Email)
		return
	}
	logger.Info("bootstrap admin already exists", "userId", user.ID, "email", user.Email)
}
